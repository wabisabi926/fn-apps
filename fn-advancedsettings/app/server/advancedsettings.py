#!/usr/bin/env python3
import argparse
import json
import mimetypes
import os
import re
import signal
import socketserver
import subprocess
import sys
import tempfile
import threading
import urllib.parse
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import unquote, urlsplit

APP_NAME = "fn-advancedsettings"
BASE_STATE_DIR = Path("/var/lib/fn-advancedsettings")
STATE_FILE = BASE_STATE_DIR / "settings.json"
NETWORK_APPLY = Path("/usr/local/sbin/fn-advancedsettings-network-apply")
NETWORK_SERVICE = Path("/etc/systemd/system/fn-advancedsettings-network.service")
CPU_APPLY = Path("/usr/local/sbin/fn-advancedsettings-cpu-apply")
CPU_SERVICE = Path("/etc/systemd/system/fn-advancedsettings-cpu.service")
PROXY_PROFILE = Path("/etc/profile.d/fn-advancedsettings-proxy.sh")
PROXY_APT = Path("/etc/apt/apt.conf.d/99fn-advancedsettings-proxy")
PROXY_KEYS = ["http_proxy", "https_proxy", "ftp_proxy", "socks_proxy", "no_proxy"]

PATHS = {
    "grub": Path("/etc/default/grub"),
    "logind": Path("/etc/systemd/logind.conf"),
    "sshd": Path("/etc/ssh/sshd_config"),
    "resolv": Path("/etc/resolv.conf"),
    "hosts": Path("/etc/hosts"),
    "environment": Path("/etc/environment"),
    "device_id": Path("/etc/device_id"),
}

REQUEST_CONTEXT = threading.local()


class ThreadingUnixHTTPServer(socketserver.ThreadingMixIn, socketserver.UnixStreamServer):
    daemon_threads = True
    allow_reuse_address = True

    def __init__(self, socket_path, handler_cls, *, base_path, www_root):
        self.server_name = APP_NAME
        self.server_port = 0
        self.base_path = normalize_base_path(base_path)
        self.www_root = Path(www_root)
        super().__init__(socket_path, handler_cls)


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def do_GET(self):
        self.route()

    def do_HEAD(self):
        self.route()

    def do_POST(self):
        self.route()

    def log_message(self, fmt, *args):
        sys.stdout.write("%s - - [%s] %s\n" % (self.client_address, self.log_date_time_string(), fmt % args))
        sys.stdout.flush()

    def route(self):
        parsed = urlsplit(self.path)
        if parsed.path == self.server.base_path:
            self.send_response(HTTPStatus.MOVED_PERMANENTLY)
            self.send_header("Location", self.server.base_path + "/" + (("?" + parsed.query) if parsed.query else ""))
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        path = strip_base_path(parsed.path, self.server.base_path)
        if path.startswith("/api"):
            self.serve_api(parsed.query)
            return
        self.serve_static(path)

    def serve_static(self, path):
        rel_path = unquote(path or "/")
        if rel_path in ("", "/"):
            rel_path = "/index.html"
        target = (self.server.www_root / rel_path.lstrip("/")).resolve()
        root = self.server.www_root.resolve()
        if root != target and root not in target.parents:
            self.send_error(HTTPStatus.BAD_REQUEST, "Bad request")
            return
        if not target.is_file():
            self.send_error(HTTPStatus.NOT_FOUND, "Not found")
            return
        content_type = mimetypes.guess_type(str(target))[0] or "application/octet-stream"
        if content_type.startswith("text/") or content_type in {"application/javascript", "application/json"}:
            content_type = f"{content_type}; charset=utf-8"
        data = target.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store" if target.name == "index.html" else "public, max-age=60")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(data)

    def serve_api(self, query):
        length = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(length) if length else b""
        previous = getattr(REQUEST_CONTEXT, "value", None)
        REQUEST_CONTEXT.value = {"method": self.command, "query": query or "", "body": body, "handler": self}
        try:
            dispatch()
        except Exception as exc:
            json_response({"ok": False, "message": str(exc)}, 500)
        finally:
            if previous is None:
                del REQUEST_CONTEXT.value
            else:
                REQUEST_CONTEXT.value = previous


def normalize_base_path(path):
    if not path:
        return "/"
    normalized = path.strip()
    if not normalized.startswith("/"):
        normalized = "/" + normalized
    return normalized.rstrip("/") or "/"


def strip_base_path(path, base_path):
    if base_path != "/" and path.startswith(base_path):
        return path[len(base_path):] or "/"
    return path or "/"


def current_request():
    return getattr(REQUEST_CONTEXT, "value", None)


def json_response(payload, status=200):
    body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    handler = current_request().get("handler")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    if handler.command != "HEAD":
        handler.wfile.write(body)


def request_body():
    req = current_request() or {}
    body = req.get("body") or b""
    if not body:
        parsed = urllib.parse.parse_qs(req.get("query", ""), keep_blank_values=True)
        return {key: values[-1] for key, values in parsed.items()}
    return json.loads(body.decode("utf-8", "replace") or "{}")


def read_text(path, default=""):
    try:
        return Path(path).read_text(encoding="utf-8", errors="replace")
    except Exception:
        return default


def write_text(path, content, mode=0o644):
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists() and not (target.with_suffix(target.suffix + ".bak")).exists():
        try:
            target.with_suffix(target.suffix + ".bak").write_bytes(target.read_bytes())
        except Exception:
            pass
    target.write_text(content, encoding="utf-8")
    os.chmod(target, mode)


def run(cmd, timeout=30):
    proc = subprocess.run(cmd, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=timeout, check=False)
    return {"cmd": " ".join(cmd), "rc": proc.returncode, "stdout": proc.stdout.strip(), "stderr": proc.stderr.strip()}


def try_run_many(commands):
    results = []
    for cmd in commands:
        if not cmd[0] or not shutil_which(cmd[0]):
            continue
        result = run(cmd)
        results.append(result)
        if result["rc"] == 0:
            break
    return results


def shutil_which(binary):
    for item in os.environ.get("PATH", "/usr/sbin:/usr/bin:/sbin:/bin").split(":"):
        candidate = Path(item) / binary
        if candidate.exists() and os.access(candidate, os.X_OK):
            return str(candidate)
    return ""


def load_state():
    try:
        data = json.loads(STATE_FILE.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def save_state(data):
    BASE_STATE_DIR.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def parse_kv_file(text, sep="="):
    parsed = {}
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or line.startswith(";") or sep not in line:
            continue
        key, value = line.split(sep, 1)
        parsed[key.strip()] = value.strip().strip('"')
    return parsed


def update_kv_lines(text, changes, *, sep="=", section=None, commented=True):
    lines = text.splitlines(True)
    out = []
    applied = set()
    current_section = None
    insert_at = None
    key_re = re.compile(r"^\s*#?\s*([A-Za-z0-9_.-]+)\s*" + re.escape(sep))
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("[") and "]" in stripped:
            current_section = stripped[1:stripped.index("]")]
            out.append(line)
            if current_section == section:
                insert_at = len(out)
            continue
        match = key_re.match(line)
        if match and (section is None or current_section == section):
            key = match.group(1)
            if key in changes:
                value = changes[key]
                applied.add(key)
                if value not in (None, ""):
                    prefix = "" if not commented else ""
                    q = '"' if sep == "=" and " " in str(value) else ""
                    out.append(f"{prefix}{key}{sep}{q}{value}{q}\n")
                continue
        out.append(line)
    missing = [key for key, value in changes.items() if key not in applied and value not in (None, "")]
    if missing:
        insert = [f"{key}{sep}{value}\n" for key, value in changes.items() if key in missing]
        if section and insert_at is None:
            out.extend([f"\n[{section}]\n"] + insert)
        elif section:
            out[insert_at:insert_at] = insert
        else:
            if out and not out[-1].endswith("\n"):
                out.append("\n")
            out.extend(insert)
    return "".join(out)


def read_service_active(name):
    result = run(["systemctl", "is-active", name], timeout=8) if shutil_which("systemctl") else {"stdout": "unknown"}
    return result.get("stdout") or "unknown"


def read_boot():
    text = read_text(PATHS["grub"])
    return {"content": text, "parsed": parse_kv_file(text), "path": str(PATHS["grub"])}


def save_boot(data):
    changes = data.get("changes") or {}
    content = data.get("content")
    source = content if content is not None else read_text(PATHS["grub"])
    write_text(PATHS["grub"], update_kv_lines(source, changes))
    results = []
    if data.get("apply"):
        results = try_run_many([
            ["update-grub"],
            ["grub-mkconfig", "-o", "/boot/grub/grub.cfg"],
            ["grub2-mkconfig", "-o", "/boot/grub2/grub.cfg"],
        ])
    return {"boot": read_boot(), "results": results}


POWER_FIELDS = [
    "HandlePowerKey", "HandlePowerKeyLongPress", "HandleRebootKey", "HandleRebootKeyLongPress",
    "HandleSuspendKey", "HandleSuspendKeyLongPress", "HandleHibernateKey", "HandleHibernateKeyLongPress",
    "HandleLidSwitch", "HandleLidSwitchExternalPower", "HandleLidSwitchDocked",
]


def read_power():
    text = read_text(PATHS["logind"])
    return {"content": text, "parsed": parse_kv_file(text), "service": read_service_active("systemd-logind")}


def save_power(data):
    changes = {key: (data.get("changes") or {}).get(key, "") for key in POWER_FIELDS if key in (data.get("changes") or {})}
    source = data.get("content") if data.get("content") is not None else read_text(PATHS["logind"])
    write_text(PATHS["logind"], update_kv_lines(source, changes, section="Login"))
    results = []
    if data.get("apply") and shutil_which("systemctl"):
        results.append(run(["systemctl", "restart", "systemd-logind"], timeout=20))
    return {"power": read_power(), "results": results}


SSH_FIELDS = ["PermitRootLogin", "PasswordAuthentication", "PubkeyAuthentication", "PermitEmptyPasswords", "GatewayPorts", "X11Forwarding"]
SSH_START_COMMANDS = [["systemctl", "start", "sshd"], ["systemctl", "start", "ssh"], ["/etc/init.d/ssh", "start"]]
SSH_RESTART_COMMANDS = [["systemctl", "restart", "sshd"], ["systemctl", "restart", "ssh"], ["/etc/init.d/ssh", "restart"]]


def parse_sshd(text):
    parsed = {}
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split(None, 1)
        if len(parts) == 2:
            parsed[parts[0]] = parts[1].strip()
    return parsed


def ensure_sshd_config():
    if PATHS["sshd"].exists():
        return []
    results = try_run_many(SSH_START_COMMANDS)
    if PATHS["sshd"].exists():
        return results
    detail = "; ".join(
        f'{item["cmd"]}: {item["stderr"] or item["stdout"] or "failed"}'
        for item in results
        if item.get("rc") != 0
    )
    raise RuntimeError(f"{PATHS['sshd']} does not exist after starting SSH service" + (f": {detail}" if detail else ""))


def validate_sshd_content(content):
    sshd = shutil_which("sshd")
    if not sshd:
        return
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name
    try:
        result = run([sshd, "-t", "-f", tmp_path], timeout=10)
    finally:
        try:
            Path(tmp_path).unlink()
        except Exception:
            pass
    if result["rc"] != 0:
        raise RuntimeError(result["stderr"] or result["stdout"] or "invalid sshd config")


def change_root_password(password):
    if "\n" in password or "\r" in password:
        raise RuntimeError("root password cannot contain line breaks")
    proc = subprocess.run(["chpasswd"], input=f"root:{password}\n", text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
    result = {"cmd": "chpasswd root", "rc": proc.returncode, "stdout": proc.stdout.strip(), "stderr": proc.stderr.strip()}
    if proc.returncode != 0:
        raise RuntimeError(result["stderr"] or result["stdout"] or "failed to change root password")
    return result


def save_sshd(data):
    results = ensure_sshd_config()
    changes = {key: str(value) for key, value in (data.get("changes") or {}).items() if key in SSH_FIELDS}
    text = data.get("content") if data.get("content") is not None else read_text(PATHS["sshd"])
    for key, value in changes.items():
        pattern = re.compile(rf"^[#\s]*{re.escape(key)}\b.*$", re.MULTILINE)
        replacement = f"{key} {value}"
        text = pattern.sub(replacement, text) if pattern.search(text) else text.rstrip() + "\n" + replacement + "\n"
    validate_sshd_content(text)
    if data.get("password"):
        results.append(change_root_password(str(data.get("password"))))
    write_text(PATHS["sshd"], text)
    if data.get("apply"):
        results.extend(try_run_many(SSH_RESTART_COMMANDS))
    return {"ssh": read_ssh(), "results": results}


def read_ssh():
    text = read_text(PATHS["sshd"])
    return {"content": text, "parsed": parse_sshd(text), "service": read_service_active("sshd")}


def read_cpu():
    cpus = []
    policies = []
    for cpu in sorted(Path("/sys/devices/system/cpu").glob("cpu[0-9]*"), key=lambda p: int(p.name[3:])):
        gov_path = cpu / "cpufreq/scaling_governor"
        if gov_path.exists():
            cpus.append({
                "name": cpu.name,
                "min_freq": read_text(cpu / "cpufreq/scaling_min_freq").strip(),
                "max_freq": read_text(cpu / "cpufreq/scaling_max_freq").strip(),
                "cur_freq": read_text(cpu / "cpufreq/scaling_cur_freq").strip(),
                "governor": read_text(gov_path).strip(),
                "available_governors": read_text(cpu / "cpufreq/scaling_available_governors").strip().split(),
            })
    policy_root = Path("/sys/devices/system/cpu/cpufreq")
    for policy in sorted(policy_root.glob("policy*"), key=lambda p: int(p.name[6:])):
        policies.append({
            "name": policy.name,
            "min_freq": read_text(policy / "scaling_min_freq").strip(),
            "max_freq": read_text(policy / "scaling_max_freq").strip(),
            "cur_freq": read_text(policy / "scaling_cur_freq").strip() or read_text(policy / "cpuinfo_cur_freq").strip(),
            "governor": read_text(policy / "scaling_governor").strip(),
            "available_governors": read_text(policy / "scaling_available_governors").strip().split(),
        })
    return {"cpus": cpus, "policies": policies}


def save_cpu(data):
    settings = data.get("settings") or {}
    targets = list(Path("/sys/devices/system/cpu/cpufreq").glob("policy*")) or [p / "cpufreq" for p in Path("/sys/devices/system/cpu").glob("cpu[0-9]*")]
    errors = []
    for target in targets:
        for key, path_name in (("min_freq", "scaling_min_freq"), ("max_freq", "scaling_max_freq")):
            if settings.get(key):
                ok, msg = write_sysfs(target / path_name, settings[key])
                if not ok:
                    errors.append(f"{target}: {msg}")
        if settings.get("governor"):
            ok, msg = write_sysfs(target / "scaling_governor", settings["governor"])
            if not ok:
                errors.append(f"{target}: {msg}")
    state = load_state()
    state["cpu"] = settings
    save_state(state)
    write_cpu_service(settings)
    if errors:
        raise RuntimeError("; ".join(errors))
    return {"cpu": read_cpu()}


def write_cpu_service(settings):
    lines = ["#!/bin/sh", "set -eu", "targets=\"/sys/devices/system/cpu/cpufreq/policy*\"", "found=0"]
    lines.append("for target in $targets; do [ -d \"$target\" ] && found=1 && break; done")
    lines.append("if [ \"$found\" -eq 0 ]; then targets=\"/sys/devices/system/cpu/cpu[0-9]*/cpufreq\"; fi")
    lines.append("for target in $targets; do")
    lines.append("  [ -d \"$target\" ] || continue")
    if settings.get("min_freq"):
        lines.append(f"  [ -w \"$target/scaling_min_freq\" ] && printf '%s' {shell_quote(settings['min_freq'])} > \"$target/scaling_min_freq\" || true")
    if settings.get("max_freq"):
        lines.append(f"  [ -w \"$target/scaling_max_freq\" ] && printf '%s' {shell_quote(settings['max_freq'])} > \"$target/scaling_max_freq\" || true")
    if settings.get("governor"):
        lines.append(f"  [ -w \"$target/scaling_governor\" ] && printf '%s' {shell_quote(settings['governor'])} > \"$target/scaling_governor\" || true")
    lines.append("done")
    CPU_APPLY.write_text("\n".join(lines) + "\n", encoding="utf-8")
    os.chmod(CPU_APPLY, 0o755)
    CPU_SERVICE.write_text("""[Unit]
Description=Apply fn advanced CPU settings
After=sysinit.target

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/fn-advancedsettings-cpu-apply
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
""", encoding="utf-8")
    if shutil_which("systemctl"):
        run(["systemctl", "daemon-reload"], timeout=15)
        run(["systemctl", "enable", "fn-advancedsettings-cpu.service"], timeout=15)


def write_sysfs(path, value):
    try:
        Path(path).write_text(str(value), encoding="utf-8")
        return True, "ok"
    except Exception as exc:
        return False, str(exc)


def read_dns():
    return {"resolv": read_text(PATHS["resolv"]), "hosts": read_text(PATHS["hosts"])}


def save_dns(data):
    if "resolv" in data:
        write_text(PATHS["resolv"], str(data.get("resolv") or ""))
    if "hosts" in data:
        write_text(PATHS["hosts"], str(data.get("hosts") or ""))
    return {"dns": read_dns()}


def ethtool_value(iface, flag):
    if not shutil_which("ethtool"):
        return ""
    result = run(["ethtool", iface], timeout=8)
    if result["rc"] != 0:
        return ""
    match = re.search(rf"^\s*{re.escape(flag)}:\s*(.+)$", result["stdout"], re.MULTILINE)
    return match.group(1).strip() if match else ""


def ethtool_info(iface):
    if not shutil_which("ethtool"):
        return {}
    result = run(["ethtool", iface], timeout=8)
    if result["rc"] != 0:
        return {}
    text = result["stdout"]
    info = {}
    for key in ["Speed", "Duplex", "Auto-negotiation", "Wake-on", "Supports Wake-on"]:
        match = re.search(rf"^\s*{re.escape(key)}:\s*(.+)$", text, re.MULTILINE)
        info[key] = match.group(1).strip() if match else ""
    modes = parse_ethtool_link_modes(text, "Supported link modes") or parse_ethtool_link_modes(text, "Advertised link modes")
    info["supported_link_modes"] = modes
    return info


def parse_ethtool_link_modes(text, title):
    modes = []
    in_modes = False
    for raw in text.splitlines():
        stripped = raw.strip()
        if stripped.startswith(f"{title}:"):
            in_modes = True
            stripped = stripped.split(":", 1)[1].strip()
        elif in_modes and re.match(r"^[A-Za-z][A-Za-z -]+:", stripped):
            break
        if in_modes:
            for speed, duplex in re.findall(r"(\d+)base\S*/(Half|Full)", stripped):
                item = {"speed": speed, "duplex": duplex.lower()}
                if item not in modes:
                    modes.append(item)
    return modes


def list_network():
    items = []
    for iface in sorted(Path("/sys/class/net").iterdir(), key=lambda p: p.name):
        if iface.name == "lo":
            continue
        ethtool = ethtool_info(iface.name)
        speed = (ethtool.get("Speed") or "").replace("Mb/s", "").strip() or read_text(iface / "speed").strip()
        items.append({
            "name": iface.name,
            "mac": read_text(iface / "address").strip(),
            "mtu": read_text(iface / "mtu").strip(),
            "operstate": read_text(iface / "operstate").strip(),
            "speed": speed,
            "duplex": (ethtool.get("Duplex") or "").lower(),
            "autoneg": "on" if (ethtool.get("Auto-negotiation") or "").lower() == "on" else "off",
            "wol": ethtool.get("Wake-on") or "",
            "supported_wol": ethtool.get("Supports Wake-on") or "",
            "supported_link_modes": ethtool.get("supported_link_modes") or [],
        })
    return {"interfaces": items, "saved": load_state().get("network", {})}


def write_network_service(network):
    lines = ["#!/bin/sh", "set -eu"]
    for iface, cfg in sorted(network.items()):
        safe_iface = re.sub(r"[^A-Za-z0-9_.:-]", "", iface)
        if not safe_iface:
            continue
        if cfg.get("mac"):
            lines.append(f"ip link set dev {safe_iface} down || true")
            lines.append(f"ip link set dev {safe_iface} address {shell_quote(cfg['mac'])} || true")
            lines.append(f"ip link set dev {safe_iface} up || true")
        if cfg.get("mtu"):
            lines.append(f"ip link set dev {safe_iface} mtu {shell_quote(cfg['mtu'])} || true")
        if cfg.get("wol") and cfg["wol"] != "keep":
            lines.append(f"command -v ethtool >/dev/null 2>&1 && ethtool -s {safe_iface} wol {shell_quote(cfg['wol'])} || true")
        if cfg.get("autoneg") == "on" and not cfg.get("speed"):
            lines.append(f"command -v ethtool >/dev/null 2>&1 && ethtool -s {safe_iface} autoneg on || true")
        elif cfg.get("speed"):
            autoneg = "on" if cfg.get("autoneg", "off") == "on" else "off"
            lines.append(f"command -v ethtool >/dev/null 2>&1 && ethtool -s {safe_iface} speed {shell_quote(cfg['speed'])} duplex {shell_quote(cfg.get('duplex') or 'full')} autoneg {autoneg} || true")
    NETWORK_APPLY.write_text("\n".join(lines) + "\n", encoding="utf-8")
    os.chmod(NETWORK_APPLY, 0o755)
    NETWORK_SERVICE.write_text("""[Unit]
Description=Apply fn advanced network settings
After=network-pre.target
Before=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/fn-advancedsettings-network-apply
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
""", encoding="utf-8")
    if shutil_which("systemctl"):
        run(["systemctl", "daemon-reload"], timeout=15)
        run(["systemctl", "enable", "fn-advancedsettings-network.service"], timeout=15)


def shell_quote(value):
    return "'" + str(value).replace("'", "'\"'\"'") + "'"


def save_network(data):
    state = load_state()
    network = state.get("network", {})
    for item in data.get("interfaces") or []:
        name = item.get("name")
        if name:
            network[name] = item
    state["network"] = network
    save_state(state)
    write_network_service(network)
    result = run([str(NETWORK_APPLY)], timeout=30)
    return {"network": list_network(), "results": [result]}


def parse_environment_proxy():
    env = parse_kv_file(read_text(PATHS["environment"]))
    return {key: env.get(key, "") for key in PROXY_KEYS + [key.upper() for key in PROXY_KEYS]}


def save_proxy(data):
    proxy = data.get("proxy") or {}
    existing = parse_kv_file(read_text(PATHS["environment"]))
    for key in PROXY_KEYS:
        value = proxy.get(key, "")
        if value:
            existing[key] = value
            existing[key.upper()] = value
        else:
            existing.pop(key, None)
            existing.pop(key.upper(), None)
    content = "\n".join(f'{key}="{value}"' for key, value in sorted(existing.items())) + "\n"
    write_text(PATHS["environment"], content)
    exports = ["# Managed by fn-advancedsettings"]
    for key in PROXY_KEYS:
        if proxy.get(key):
            exports.append(f"export {key}={shell_quote(proxy[key])}")
            exports.append(f"export {key.upper()}={shell_quote(proxy[key])}")
    PROXY_PROFILE.write_text("\n".join(exports) + "\n", encoding="utf-8")
    os.chmod(PROXY_PROFILE, 0o644)
    apt_lines = []
    if proxy.get("http_proxy"):
        apt_lines.append(f'Acquire::http::Proxy "{proxy["http_proxy"]}";')
    if proxy.get("https_proxy"):
        apt_lines.append(f'Acquire::https::Proxy "{proxy["https_proxy"]}";')
    if apt_lines:
        PROXY_APT.write_text("\n".join(apt_lines) + "\n", encoding="utf-8")
    elif PROXY_APT.exists():
        PROXY_APT.unlink()
    return {"proxy": read_proxy()}


def read_proxy():
    return {"values": parse_environment_proxy(), "profile": read_text(PROXY_PROFILE), "apt": read_text(PROXY_APT)}


def chattr(path, flag):
    if shutil_which("chattr"):
        run(["chattr", flag, str(path)], timeout=8)


def is_immutable(path):
    if not shutil_which("lsattr") or not Path(path).exists():
        return False
    parts = (run(["lsattr", str(path)], timeout=8).get("stdout") or "").split()
    return bool(parts) and "i" in parts[0]


def save_identity(data):
    path = PATHS["device_id"]
    enabled = bool(data.get("enabled"))
    value = str(data.get("device_id") or "")[:32]
    immutable = is_immutable(path)
    if immutable:
        chattr(path, "-i")
    if enabled and value:
        if path.exists() and not Path(str(path) + ".bak").exists():
            Path(str(path) + ".bak").write_bytes(path.read_bytes())
        path.write_text(value, encoding="utf-8")
    elif Path(str(path) + ".bak").exists():
        Path(str(path) + ".bak").replace(path)
    if immutable:
        chattr(path, "+i")
    results = []
    if data.get("apply") and shutil_which("systemctl"):
        results.append(run(["systemctl", "restart", "sysinfo_service.service", "trim_main.service"], timeout=30))
    return {"identity": read_identity(), "results": results}


def read_identity():
    path = PATHS["device_id"]
    return {"device_id": read_text(path).strip(), "backup": read_text(str(path) + ".bak").strip(), "backup_exists": Path(str(path) + ".bak").exists()}


def read_all():
    return {
        "ok": True,
        "boot": read_boot(),
        "power": read_power(),
        "ssh": read_ssh(),
        "cpu": read_cpu(),
        "dns": read_dns(),
        "network": list_network(),
        "proxy": read_proxy(),
        "identity": read_identity(),
    }


def dispatch():
    body = request_body()
    action = body.get("action") or "read"
    if action == "read":
        json_response(read_all())
    elif action == "saveBoot":
        json_response({"ok": True, **save_boot(body)})
    elif action == "savePower":
        json_response({"ok": True, **save_power(body)})
    elif action == "saveSsh":
        json_response({"ok": True, **save_sshd(body)})
    elif action == "saveCpu":
        json_response({"ok": True, **save_cpu(body)})
    elif action == "saveDns":
        json_response({"ok": True, **save_dns(body)})
    elif action == "saveNetwork":
        json_response({"ok": True, **save_network(body)})
    elif action == "saveProxy":
        json_response({"ok": True, **save_proxy(body)})
    elif action == "saveIdentity":
        json_response({"ok": True, **save_identity(body)})
    else:
        json_response({"ok": False, "message": "unsupported action"}, 400)


def main():
    parser = argparse.ArgumentParser(description="fn advanced settings server")
    parser.add_argument("--unix-socket", required=True)
    parser.add_argument("--base-path", default="/app/fn-advancedsettings")
    parser.add_argument("--www-root", required=True)
    args = parser.parse_args()
    if os.path.exists(args.unix_socket):
        os.unlink(args.unix_socket)
    server = ThreadingUnixHTTPServer(args.unix_socket, Handler, base_path=args.base_path, www_root=args.www_root)

    def shutdown(_signum, _frame):
        server.server_close()
        if os.path.exists(args.unix_socket):
            os.unlink(args.unix_socket)
        sys.exit(0)

    signal.signal(signal.SIGTERM, shutdown)
    signal.signal(signal.SIGINT, shutdown)
    try:
        server.serve_forever()
    finally:
        server.server_close()
        if os.path.exists(args.unix_socket):
            os.unlink(args.unix_socket)


if __name__ == "__main__":
    main()
