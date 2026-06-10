const API_ENDPOINT = location.pathname.includes("/app/fn-advancedsettings")
  ? "/app/fn-advancedsettings/api"
  : "./api";

const sections = [
  ["boot", "bootSettings"],
  ["power", "powerSettings"],
  ["ssh", "sshSettings"],
  ["cpu", "cpuSettings"],
  ["dns", "dnsSettings"],
  ["network", "networkSettings"],
  ["proxy", "proxySettings"],
  ["identity", "identitySettings"],
];

const icons = {
  boot: '<svg viewBox="0 0 24 24"><path d="M5 17h14M7 17l1.2-8h7.6L17 17"/><path d="M9 9V6h6v3M10 13h4"/></svg>',
  power: '<svg viewBox="0 0 24 24"><path d="M12 3v8"/><path d="M8 5.5a8 8 0 1 0 8 0"/></svg>',
  ssh: '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 10l2 2-2 2M12 14h4"/></svg>',
  cpu: '<svg viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M4 9h3M4 15h3M17 9h3M17 15h3M9 4v3M15 4v3M9 17v3M15 17v3"/></svg>',
  dns: '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/><circle cx="7" cy="7" r="1"/><circle cx="7" cy="12" r="1"/><circle cx="7" cy="17" r="1"/></svg>',
  network: '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="5" rx="1"/><rect x="4" y="16" width="6" height="5" rx="1"/><rect x="14" y="16" width="6" height="5" rx="1"/><path d="M12 8v4M7 16v-4h10v4"/></svg>',
  proxy: '<svg viewBox="0 0 24 24"><path d="M5 12a7 7 0 0 1 12.7-4"/><path d="M19 12a7 7 0 0 1-12.7 4"/><path d="M17 4v4h-4M7 20v-4h4"/></svg>',
  identity: '<svg viewBox="0 0 24 24"><path d="M12 3l7 3v5c0 4.5-2.8 8-7 10-4.2-2-7-5.5-7-10V6l7-3z"/><path d="M9 12l2 2 4-5"/></svg>',
};

const powerFields = [
  "HandlePowerKey", "HandlePowerKeyLongPress", "HandleRebootKey", "HandleRebootKeyLongPress",
  "HandleSuspendKey", "HandleSuspendKeyLongPress", "HandleHibernateKey", "HandleHibernateKeyLongPress",
  "HandleLidSwitch", "HandleLidSwitchExternalPower", "HandleLidSwitchDocked",
];

const sshFields = ["PermitRootLogin", "PasswordAuthentication", "PubkeyAuthentication", "PermitEmptyPasswords", "GatewayPorts", "X11Forwarding"];
const sshOptions = {
  PermitRootLogin: ["yes", "no", "prohibit-password"],
  PasswordAuthentication: ["yes", "no"],
  PubkeyAuthentication: ["yes", "no"],
  PermitEmptyPasswords: ["yes", "no"],
  GatewayPorts: ["yes", "no", "clientspecified"],
  X11Forwarding: ["yes", "no"],
};
const bootFields = ["GRUB_TIMEOUT", "GRUB_CMDLINE_LINUX_DEFAULT", "GRUB_CMDLINE_LINUX", "GRUB_DEFAULT", "GRUB_DISABLE_OS_PROBER"];
const proxyFields = ["http_proxy", "https_proxy", "ftp_proxy", "socks_proxy", "no_proxy"];

const I18N = {
  "zh-CN": {
    appTitle: "高级设置",
    refresh: "刷新",
    save: "保存",
    saving: "保存中...",
    loading: "正在加载...",
    saved: "已保存",
    about: "关于",
    close: "关闭",
    aboutDeclaration: "本项目由社区维护，免费开源，仅用于学习与交流，请遵守所在地法律法规与平台服务条款。",
    communitySupport: "社区支持",
    sponsorSupport: "赞助支持",
    join: "点击加入",
    bootSettings: "启动设置",
    powerSettings: "电源设置",
    sshSettings: "SSH 设置",
    cpuSettings: "CPU 设置",
    dnsSettings: "DNS 设置",
    networkSettings: "网络设置",
    proxySettings: "代理设置",
    identitySettings: "设备标识",
    applyGrub: "更新 grub 配置",
    restartLogind: "重启 logind 服务",
    restartSsh: "重启 SSH 服务",
    restartIdentity: "重启系统信息服务",
    rootPasswordBlock: "root 密码",
    rootPassword: "root 新密码",
    rootPasswordConfirm: "确认 root 密码",
    passwordMismatch: "两次输入的 root 密码不一致",
    minFreq: "最小频率",
    maxFreq: "最大频率",
    governor: "CPU 策略",
    current: "当前",
    available: "可用",
    enabled: "启用",
    disguise: "伪装",
    disabled: "禁用",
    deviceId: "设备 ID",
    original: "原始",
    mac: "MAC 地址",
    wol: "Wake-on-LAN",
    wolStatus: "WOL 状态",
    mode: "模式",
    notAvailable: "不可用",
    speed: "速率",
    duplex: "双工",
    autoneg: "自动协商",
    mtu: "MTU",
    keep: "保持不变",
    GRUB_TIMEOUT: "启动菜单等待时间",
    GRUB_CMDLINE_LINUX_DEFAULT: "默认内核参数",
    GRUB_CMDLINE_LINUX: "额外内核参数",
    GRUB_DEFAULT: "默认启动项",
    GRUB_DISABLE_OS_PROBER: "检测其他系统",
    HandlePowerKey: "按下电源键",
    HandlePowerKeyLongPress: "长按电源键",
    HandleRebootKey: "按下重启键",
    HandleRebootKeyLongPress: "长按重启键",
    HandleSuspendKey: "按下睡眠键",
    HandleSuspendKeyLongPress: "长按睡眠键",
    HandleHibernateKey: "按下休眠键",
    HandleHibernateKeyLongPress: "长按休眠键",
    HandleLidSwitch: "合上盖子",
    HandleLidSwitchExternalPower: "接通电源时合盖",
    HandleLidSwitchDocked: "外接显示器/扩展坞时合盖",
    PermitRootLogin: "允许 root 登录",
    PasswordAuthentication: "允许密码登录",
    PubkeyAuthentication: "允许密钥登录",
    PermitEmptyPasswords: "允许空密码",
    GatewayPorts: "允许远程网关端口",
    X11Forwarding: "允许 X11 转发",
    http_proxy: "HTTP 代理",
    https_proxy: "HTTPS 代理",
    ftp_proxy: "FTP 代理",
    socks_proxy: "SOCKS 代理",
    no_proxy: "不走代理的地址",
    min_freq: "最小频率",
    max_freq: "最大频率",
    device_id: "设备 ID",
    poweroff: "关机",
    reboot: "重启",
    suspend: "睡眠",
    hibernate: "休眠",
    ignore: "忽略",
    lock: "锁定",
    yes: "是",
    no: "否",
    "prohibit-password": "禁止密码",
    "without-password": "仅密钥",
    clientspecified: "客户端指定",
    full: "全双工",
    half: "半双工",
    on: "开启",
    off: "关闭",
    d: "d 禁用",
    g: "g 魔术包",
    p: "p PHY活动",
    u: "u 单播包",
    b: "b 广播包",
    m: "m 组播包",
  },
  "en-US": {
    appTitle: "Advanced Settings",
    refresh: "Refresh",
    save: "Save",
    saving: "Saving...",
    loading: "Loading...",
    saved: "Saved",
    about: "About",
    close: "Close",
    aboutDeclaration: "This community-maintained open source project is free and open source, intended only for learning and communication. Please follow local laws and platform terms.",
    communitySupport: "Community Support",
    sponsorSupport: "Sponsor Support",
    join: "Join",
    bootSettings: "Boot Settings",
    powerSettings: "Power Settings",
    sshSettings: "SSH Settings",
    cpuSettings: "CPU Settings",
    dnsSettings: "DNS Settings",
    networkSettings: "Network Settings",
    proxySettings: "Proxy Settings",
    identitySettings: "Device Identity",
    applyGrub: "Update grub config",
    restartLogind: "Restart logind service",
    restartSsh: "Restart SSH service",
    restartIdentity: "Restart system info services",
    rootPasswordBlock: "Root password",
    rootPassword: "New root password",
    rootPasswordConfirm: "Confirm root password",
    passwordMismatch: "The root passwords do not match",
    minFreq: "Min frequency",
    maxFreq: "Max frequency",
    governor: "CPU governor",
    current: "Current",
    available: "Available",
    enabled: "Enabled",
    disguise: "Disguise",
    disabled: "Disabled",
    deviceId: "Device ID",
    original: "Original",
    mac: "MAC address",
    wol: "Wake-on-LAN",
    wolStatus: "WOL status",
    mode: "Mode",
    notAvailable: "Not available",
    speed: "Speed",
    duplex: "Duplex",
    autoneg: "Autoneg",
    mtu: "MTU",
    keep: "Keep",
    GRUB_TIMEOUT: "Boot menu timeout",
    GRUB_CMDLINE_LINUX_DEFAULT: "Default kernel parameters",
    GRUB_CMDLINE_LINUX: "Extra kernel parameters",
    GRUB_DEFAULT: "Default boot entry",
    GRUB_DISABLE_OS_PROBER: "Detect other systems",
    HandlePowerKey: "Press power key",
    HandlePowerKeyLongPress: "Long-press power key",
    HandleRebootKey: "Press reboot key",
    HandleRebootKeyLongPress: "Long-press reboot key",
    HandleSuspendKey: "Press suspend key",
    HandleSuspendKeyLongPress: "Long-press suspend key",
    HandleHibernateKey: "Press hibernate key",
    HandleHibernateKeyLongPress: "Long-press hibernate key",
    HandleLidSwitch: "Close lid",
    HandleLidSwitchExternalPower: "Close lid on external power",
    HandleLidSwitchDocked: "Close lid while docked",
    PermitRootLogin: "Allow root login",
    PasswordAuthentication: "Allow password login",
    PubkeyAuthentication: "Allow key login",
    PermitEmptyPasswords: "Allow empty passwords",
    GatewayPorts: "Allow remote gateway ports",
    X11Forwarding: "Allow X11 forwarding",
    http_proxy: "HTTP proxy",
    https_proxy: "HTTPS proxy",
    ftp_proxy: "FTP proxy",
    socks_proxy: "SOCKS proxy",
    no_proxy: "Proxy bypass list",
    min_freq: "Min frequency",
    max_freq: "Max frequency",
    device_id: "Device ID",
    poweroff: "Power off",
    reboot: "Reboot",
    suspend: "Suspend",
    hibernate: "Hibernate",
    ignore: "Ignore",
    lock: "Lock",
    yes: "Yes",
    no: "No",
    "prohibit-password": "Forbid passwords",
    "without-password": "Keys only",
    clientspecified: "Client specified",
    full: "Full",
    half: "Half",
    on: "On",
    off: "Off",
    d: "d Disabled",
    g: "g Magic packet",
    p: "p PHY activity",
    u: "u Unicast",
    b: "b Broadcast",
    m: "m Multicast",
  },
};

const state = {
  active: "boot",
  data: {},
  language: "zh-CN",
  theme: "light",
  saving: false,
};

function safeDecode(value) {
  try { return decodeURIComponent(value || ""); } catch (_error) { return value || ""; }
}

function cookieValue(name) {
  const prefix = `${name}=`;
  return document.cookie.split(";").map((item) => item.trim()).find((item) => item.startsWith(prefix))?.slice(prefix.length) || "";
}

function queryValue(name) {
  return new URLSearchParams(location.search).get(name) || "";
}

function storedValue(name) {
  try { return localStorage.getItem(name) || sessionStorage.getItem(name) || ""; } catch (_error) { return ""; }
}

function parentStoredValue(name) {
  try {
    if (!window.parent || window.parent === window) return "";
    return window.parent.localStorage?.getItem(name) || window.parent.sessionStorage?.getItem(name) || "";
  } catch (_error) {
    return "";
  }
}

function documentThemeValue(doc) {
  if (!doc) return "";
  const root = doc.documentElement;
  const body = doc.body;
  return [
    body?.getAttribute("theme-mode"),
    body?.dataset?.theme,
    root?.dataset?.theme,
    root?.classList?.contains("dark") ? "dark" : "",
    root?.classList?.contains("light") ? "light" : "",
  ].find(Boolean) || "";
}

function parentDocumentThemeValue() {
  try {
    if (!window.parent || window.parent === window) return "";
    return documentThemeValue(window.parent.document);
  } catch (_error) {
    return "";
  }
}

function normalizeLanguage(value) {
  return safeDecode(value).replace("_", "-").toLowerCase().startsWith("zh") ? "zh-CN" : "en-US";
}

function normalizeTheme(value) {
  const theme = safeDecode(value).toLowerCase();
  if (theme.includes("dark") || theme === "night") return "dark";
  if (theme.includes("light") || theme === "day") return "light";
  if (theme === "10") return "light";
  if (theme === "20") return "dark";
  if (theme === "system" || theme === "auto" || theme === "os") {
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "";
}

function currentTheme() {
  const fromSystem = [
    queryValue("theme"),
    cookieValue("fnos-theme-mode"),
    cookieValue("os-theme-mode"),
    storedValue("fnos-theme-mode"),
    storedValue("os-theme-mode"),
    parentStoredValue("fnos-theme-mode"),
    parentStoredValue("os-theme-mode"),
    documentThemeValue(document),
    parentDocumentThemeValue(),
    queryValue("fnos-theme-mode"),
  ].map(normalizeTheme).find(Boolean);
  if (fromSystem) return fromSystem;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function t(key) {
  return (I18N[state.language] || I18N["zh-CN"])[key] || I18N["zh-CN"][key] || key;
}

function applyPreferences({ rerender = false } = {}) {
  state.language = normalizeLanguage(cookieValue("language") || queryValue("language") || navigator.language || "zh-CN");
  state.theme = currentTheme();
  document.documentElement.lang = state.language;
  document.documentElement.dataset.theme = state.theme;
  document.body.dataset.theme = state.theme;
  document.querySelectorAll("[data-i18n]").forEach((node) => { node.textContent = t(node.dataset.i18n); });
  document.querySelectorAll("[data-i18n-title]").forEach((node) => { node.title = t(node.dataset.i18nTitle); });
  document.title = t("appTitle");
  if (rerender) render();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

async function api(action, data = {}) {
  const response = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    credentials: "include",
    body: JSON.stringify({ action, ...data }),
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.message || `HTTP ${response.status}`);
  return result;
}

function showToast(message, isError = false) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.toggle("error", isError);
  toast.classList.remove("hidden");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.add("hidden"), 2600);
}

function setSaving(saving) {
  state.saving = saving;
  const btn = document.getElementById("saveBtn");
  btn.disabled = saving;
  btn.textContent = saving ? t("saving") : t("save");
}

function fieldLabel(name) {
  return t(name);
}

function optionLabel(name, value) {
  if (name === "wol" && value) return wolStatusText(value);
  if (name === "mode" && value) return modeLabel(value);
  return value ? t(value) : `(${t("keep")})`;
}

function wolStatusText(value) {
  const text = String(value || "").trim();
  if (!text) return t("notAvailable");
  if (text === "d") return t("d");
  return text.split("").map((item) => t(item)).join(", ");
}

function inputField(name, value = "", options = null, extra = "") {
  const label = fieldLabel(name);
  if (options) {
    return `<label class="field"><span title="${escapeHtml(name)}">${escapeHtml(label)}</span><select data-name="${escapeHtml(name)}" ${extra}>${options.map((item) => `<option value="${escapeHtml(item)}" ${String(value) === String(item) ? "selected" : ""}>${escapeHtml(optionLabel(name, item))}</option>`).join("")}</select></label>`;
  }
  return `<label class="field"><span title="${escapeHtml(name)}">${escapeHtml(label)}</span><input data-name="${escapeHtml(name)}" value="${escapeHtml(value)}" spellcheck="false" ${extra}></label>`;
}

function wolField(value, options) {
  const selected = new Set(String(value || "").split("").filter(Boolean));
  if (!selected.size) selected.add("d");
  if (selected.size > 1) selected.delete("d");
  return `
    <label class="field wide">
      <span title="wol">${escapeHtml(t("wol"))}</span>
      <input type="hidden" data-name="wol" value="${escapeHtml([...selected].join(""))}">
      <span class="choice-group" data-wol-group>
        ${options.map((item) => `
          <label class="choice"><input type="checkbox" data-wol-option value="${escapeHtml(item)}" ${selected.has(item) ? "checked" : ""}><span>${escapeHtml(wolStatusText(item))}</span></label>
        `).join("")}
      </span>
    </label>
  `;
}

function collect(container) {
  const out = {};
  container.querySelectorAll("[data-name]").forEach((node) => { out[node.dataset.name] = node.type === "checkbox" ? (node.checked ? "on" : "") : node.value; });
  return out;
}

function fallbackLinkModes(currentSpeed) {
  const current = Number(currentSpeed) || 1000;
  const speeds = [10, 100, 1000, 2500, 5000, 10000].filter((speed) => speed <= current);
  if (!speeds.includes(current)) speeds.push(current);
  return speeds.sort((a, b) => a - b).flatMap((speed) => (
    speed <= 100 ? [{ speed: String(speed), duplex: "half" }, { speed: String(speed), duplex: "full" }] : [{ speed: String(speed), duplex: "full" }]
  ));
}

function modeValue(speed, duplex) {
  return `${speed || ""}|${duplex || "full"}`;
}

function modeLabel(value) {
  const [speed, duplex] = String(value || "").split("|");
  return `${speed || "-"} / ${optionLabel("duplex", duplex || "full")}`;
}

function syncNetworkAutonegFields(container = document.getElementById("networkList")) {
  container.querySelectorAll("[data-iface]").forEach((item) => {
    const autoneg = item.querySelector('[data-name="autoneg"]');
    const mode = item.querySelector('[data-name="mode"]');
    const enabled = autoneg?.value === "on";
    if (mode) mode.disabled = enabled;
  });
}

function renderNav() {
  document.getElementById("navList").innerHTML = sections.map(([id, label]) => `
    <button class="nav-item ${state.active === id ? "active" : ""}" type="button" data-section="${id}"><span class="nav-icon" aria-hidden="true">${icons[id] || ""}</span><span>${escapeHtml(t(label))}</span></button>
  `).join("");
  document.getElementById("pageTitle").textContent = t(sections.find(([id]) => id === state.active)?.[1] || "appTitle");
}

function renderBoot() {
  const parsed = state.data.boot?.parsed || {};
  document.getElementById("bootFields").innerHTML = bootFields.map((key) => inputField(key, parsed[key] || "")).join("");
}

function renderPower() {
  const parsed = state.data.power?.parsed || {};
  const options = ["", "poweroff", "reboot", "suspend", "hibernate", "ignore", "lock"];
  document.getElementById("powerFields").innerHTML = powerFields.map((key) => inputField(key, parsed[key] || "", options)).join("");
}

function renderSsh() {
  const parsed = state.data.ssh?.parsed || {};
  document.getElementById("sshFields").innerHTML = sshFields.map((key) => {
    return inputField(key, parsed[key] || "", sshOptions[key]);
  }).join("");
  document.getElementById("rootPassword").value = "";
  document.getElementById("rootPasswordConfirm").value = "";
}

function renderCpu() {
  const policies = state.data.cpu?.policies || [];
  const cpus = state.data.cpu?.cpus || [];
  const governors = [...new Set(policies.flatMap((item) => item.available_governors || []).concat(cpus.flatMap((item) => item.available_governors || [])))];
  const current = policies[0] || cpus[0] || {};
  document.getElementById("cpuFields").innerHTML =
    inputField("min_freq", current.min_freq || "") +
    inputField("max_freq", current.max_freq || "") + 
    inputField("governor", current.governor || "", governors.length ? governors : null);
  document.getElementById("cpuList").innerHTML = (policies.length ? policies : cpus).map((item) => `
    <div class="data-item">
      <div class="data-title cpu-title"><span>${escapeHtml(item.name)}</span><div class="data-meta">${t("current")}: ${escapeHtml(item.cur_freq || "-")} / ${escapeHtml(item.min_freq || "-")} - ${escapeHtml(item.max_freq || "-")}</div><span>${escapeHtml(item.governor || "")}</span></div>
    </div>
  `).join("");
}

function renderDns() {
  document.getElementById("resolvContent").value = state.data.dns?.resolv || "";
  document.getElementById("hostsContent").value = state.data.dns?.hosts || "";
}

function renderNetwork() {
  const saved = state.data.network?.saved || {};
  const list = state.data.network?.interfaces || [];
  document.getElementById("networkList").innerHTML = list.map((item) => {
    const cfg = saved[item.name] || {};
    const wolModes = [...new Set(["d", ...String(item.supported_wol || "").split(""), ...String(item.wol || "").split("")].filter(Boolean))];
    const wolOptions = wolModes.length ? wolModes : ["d", "g", "p", "u", "b", "m"];
    const modes = (item.supported_link_modes || []).length ? item.supported_link_modes : fallbackLinkModes(item.speed);
    const modeOptions = [...new Set(modes.map((mode) => modeValue(mode.speed, mode.duplex)).concat(item.speed ? [modeValue(item.speed, item.duplex || cfg.duplex || "full")] : []).filter(Boolean))].sort((a, b) => Number(a.split("|")[0]) - Number(b.split("|")[0]) || a.localeCompare(b));
    const currentMode = modeValue(item.speed || cfg.speed || modeOptions[0]?.split("|")[0] || "", item.duplex || cfg.duplex || "full");
    return `
      <div class="data-item" data-iface="${escapeHtml(item.name)}" data-link-modes="${escapeHtml(JSON.stringify(modes))}">
        <div class="data-title"><span>${escapeHtml(item.name)}</span><span>${escapeHtml(item.operstate || "")}</span></div>
        <div class="data-meta">MAC ${escapeHtml(item.mac || "-")} / ${t("wolStatus")} ${escapeHtml(wolStatusText(item.wol))} / ${t("mode")} ${escapeHtml(modeLabel(currentMode))}</div>
        <div class="grid">
          ${inputField("mac", item.mac || cfg.mac || "")}
          ${wolField(cfg.wol || item.wol || "d", wolOptions)}
          ${inputField("autoneg", item.autoneg || cfg.autoneg || "off", ["off", "on"])}
          ${inputField("mode", currentMode, modeOptions.length ? modeOptions : [currentMode])}
        </div>
      </div>
    `;
  }).join("");
  syncNetworkAutonegFields();
}

function renderProxy() {
  const values = state.data.proxy?.values || {};
  document.getElementById("proxyFields").innerHTML = proxyFields.map((key) => inputField(key, values[key] || "")).join("");
}

function renderIdentity() {
  const identity = state.data.identity || {};
  document.getElementById("identityFields").innerHTML = `
    <div class="backup-tag"><span>${escapeHtml(t("original"))}</span><strong>${escapeHtml(identity.backup || "-")}</strong></div>
    <div class="identity-row">
      <label class="field identity-id"><span>${escapeHtml(t("device_id"))}</span><input data-name="device_id" value="${escapeHtml(identity.device_id || "")}" spellcheck="false"></label>
      <label class="switch-field"><span>${escapeHtml(t("disguise"))}</span><input data-name="enabled" type="checkbox" ${identity.backup_exists ? "checked" : ""}><i aria-hidden="true"></i></label>
    </div>
  `;
}

function renderPanels() {
  document.querySelectorAll("[data-panel]").forEach((panel) => {
    panel.classList.toggle("hidden", panel.dataset.panel !== state.active);
  });
  document.getElementById("saveBtn").classList.toggle("hidden", state.active === "identity");
}

function render() {
  renderNav();
  renderPanels();
  renderBoot();
  renderPower();
  renderSsh();
  renderCpu();
  renderDns();
  renderNetwork();
  renderProxy();
  renderIdentity();
}

async function loadData() {
  document.getElementById("emptyState").classList.remove("hidden");
  document.getElementById("editor").classList.add("hidden");
  const data = await api("read");
  state.data = data;
  document.getElementById("emptyState").classList.add("hidden");
  document.getElementById("editor").classList.remove("hidden");
  render();
}

async function saveActive() {
  if (state.saving) return;
  setSaving(true);
  try {
    let data;
    if (state.active === "boot") {
      data = await api("saveBoot", { changes: collect(document.getElementById("bootFields")), apply: document.getElementById("bootApply").checked });
    } else if (state.active === "power") {
      data = await api("savePower", { changes: collect(document.getElementById("powerFields")), apply: document.getElementById("powerApply").checked });
    } else if (state.active === "ssh") {
      const password = document.getElementById("rootPassword").value;
      const passwordConfirm = document.getElementById("rootPasswordConfirm").value;
      if (password || passwordConfirm) {
        if (password !== passwordConfirm) throw new Error(t("passwordMismatch"));
      }
      data = await api("saveSsh", { changes: collect(document.getElementById("sshFields")), password, apply: document.getElementById("sshApply").checked });
    } else if (state.active === "cpu") {
      data = await api("saveCpu", { settings: collect(document.getElementById("cpuFields")) });
    } else if (state.active === "dns") {
      data = await api("saveDns", { resolv: document.getElementById("resolvContent").value, hosts: document.getElementById("hostsContent").value });
    } else if (state.active === "network") {
      const interfaces = [...document.querySelectorAll("#networkList [data-iface]")].map((item) => {
        const values = collect(item);
        delete values.mtu;
        if (values.autoneg === "on") {
          delete values.mode;
        } else {
          const [speed, duplex] = String(values.mode || "").split("|");
          values.autoneg = "off";
          values.speed = speed;
          values.duplex = duplex || "full";
          delete values.mode;
        }
        return { name: item.dataset.iface, ...values };
      });
      data = await api("saveNetwork", { interfaces });
    } else if (state.active === "proxy") {
      data = await api("saveProxy", { proxy: collect(document.getElementById("proxyFields")) });
    } else if (state.active === "identity") {
      const values = collect(document.getElementById("identityFields"));
      data = await api("saveIdentity", { enabled: values.enabled === "on", device_id: values.device_id, apply: document.getElementById("identityApply").checked });
    }
    state.data = { ...state.data, ...data };
    render();
    showToast(t("saved"));
  } finally {
    setSaving(false);
  }
}

async function saveIdentityFromSwitch() {
  if (state.saving) return;
  setSaving(true);
  try {
    const values = collect(document.getElementById("identityFields"));
    const data = await api("saveIdentity", { enabled: values.enabled === "on", device_id: values.device_id, apply: document.getElementById("identityApply").checked });
    state.data = { ...state.data, ...data };
    render();
    showToast(t("saved"));
  } finally {
    setSaving(false);
  }
}

document.getElementById("navList").addEventListener("click", (event) => {
  const button = event.target.closest("[data-section]");
  if (!button) return;
  state.active = button.dataset.section;
  renderNav();
  renderPanels();
});

document.getElementById("refreshBtn").addEventListener("click", () => loadData().catch((error) => showToast(error.message, true)));
document.getElementById("saveBtn").addEventListener("click", () => saveActive().catch((error) => showToast(error.message, true)));
document.getElementById("identityFields").addEventListener("change", (event) => {
  if (event.target.dataset.name === "enabled") saveIdentityFromSwitch().catch((error) => showToast(error.message, true));
});
document.getElementById("networkList").addEventListener("change", (event) => {
  const item = event.target.closest("[data-iface]");
  if (!item) return;
  if (event.target.dataset.wolOption !== undefined) {
    const checked = [...item.querySelectorAll("[data-wol-option]:checked")];
    if (event.target.value === "d" && event.target.checked) {
      item.querySelectorAll('[data-wol-option]:not([value="d"])').forEach((node) => { node.checked = false; });
    } else if (event.target.value !== "d" && event.target.checked) {
      const disabled = item.querySelector('[data-wol-option][value="d"]');
      if (disabled) disabled.checked = false;
    }
    const selected = [...item.querySelectorAll("[data-wol-option]:checked")].map((node) => node.value).join("");
    const hidden = item.querySelector('[data-name="wol"]');
    if (hidden) hidden.value = selected || "d";
  } else if (event.target.dataset.name === "autoneg") {
    syncNetworkAutonegFields(item.parentElement);
  } else if (event.target.dataset.name === "mode") {
    const autoneg = item.querySelector('[data-name="autoneg"]');
    if (autoneg) autoneg.value = "off";
    syncNetworkAutonegFields(item.parentElement);
  }
});
document.getElementById("networkList").addEventListener("input", (event) => {
  const item = event.target.closest("[data-iface]");
  if (!item || event.target.dataset.name !== "mode") return;
  const autoneg = item.querySelector('[data-name="autoneg"]');
  if (autoneg) autoneg.value = "off";
  syncNetworkAutonegFields(item.parentElement);
});
document.getElementById("aboutBtn").addEventListener("click", () => document.getElementById("aboutModal").classList.remove("hidden"));
document.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => document.getElementById("aboutModal").classList.add("hidden")));
document.getElementById("aboutModal").addEventListener("click", (event) => {
  if (event.target.id === "aboutModal") document.getElementById("aboutModal").classList.add("hidden");
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") document.getElementById("aboutModal").classList.add("hidden");
});

applyPreferences();
window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener?.("change", () => applyPreferences({ rerender: true }));
window.addEventListener("storage", () => applyPreferences({ rerender: true }));
setInterval(() => applyPreferences(), 1500);

loadData().catch((error) => {
  document.getElementById("emptyState").textContent = error.message;
  showToast(error.message, true);
});
