#!/usr/bin/env python3
import argparse
import base64
import json
import mimetypes
import os
import signal
import socketserver
import sys
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import unquote, urlsplit

APP_NAME = "fn-audioplayer"

SUPPORTED_FORMATS = {"mp3", "wav", "ogg", "flac", "m4a", "aac", "wma", "ape"}

MIME_TYPES = {
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".flac": "audio/flac",
    ".m4a": "audio/mp4",
    ".aac": "audio/aac",
    ".wma": "audio/x-ms-wma",
    ".ape": "audio/x-ape",
}


class ThreadingUnixHTTPServer(
    socketserver.ThreadingMixIn, socketserver.UnixStreamServer
):
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

    def do_PUT(self):
        self.route()

    def do_DELETE(self):
        self.route()

    def log_message(self, fmt, *args):
        pass

    def route(self):
        parsed = urlsplit(self.path)
        if parsed.path == self.server.base_path:
            location = self.server.base_path + "/"
            if parsed.query:
                location += "?" + parsed.query
            self.send_response(HTTPStatus.MOVED_PERMANENTLY)
            self.send_header("Location", location)
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        path = strip_base_path(parsed.path, self.server.base_path)
        if path.startswith("/api"):
            self.serve_api(path, parsed.query)
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
            target = self.server.www_root / "index.html"
        if not target.is_file():
            self.send_error(HTTPStatus.NOT_FOUND, "Not found")
            return
        content_type = (
            mimetypes.guess_type(str(target))[0] or "application/octet-stream"
        )
        if content_type.startswith("text/") or content_type in {
            "application/javascript",
            "application/json",
        }:
            content_type = f"{content_type}; charset=utf-8"
        size = target.stat().st_size
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(size))
        self.send_header(
            "Cache-Control",
            "no-store" if target.name == "index.html" else "public, max-age=3600",
        )
        self.end_headers()
        if self.command != "HEAD":
            with target.open("rb") as handle:
                while True:
                    chunk = handle.read(1024 * 256)
                    if not chunk:
                        break
                    self.wfile.write(chunk)

    def serve_api(self, path, query):
        from urllib.parse import parse_qs

        params = parse_qs(query, keep_blank_values=True)

        if path == "/api/health":
            self.json_response({"status": "ok", "service": APP_NAME})
        elif path == "/api/audio/info":
            self.handle_audio_info(params)
        elif path == "/api/audio/stream":
            self.handle_audio_stream(params)
        elif path == "/api/audio/metadata":
            self.handle_audio_metadata(params)
        elif path == "/api/audio/cover":
            self.handle_audio_cover(params)
        elif path == "/api/playlist/list":
            self.handle_playlist_list(params)
        elif path == "/api/lyrics":
            self.handle_lyrics(params)
        elif path == "/api/browse":
            self.handle_browse(params)
        else:
            self.json_response({"error": "Not found"}, 404)

    def json_response(self, payload, status=200):
        body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode(
            "utf-8"
        )
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def handle_audio_info(self, params):
        file_param = self._get_param(params, "file")
        if not file_param:
            self.json_response({"error": "Missing file parameter"}, 400)
            return
        file_path = file_param
        if not os.path.exists(file_path):
            self.json_response({"error": "File not found"}, 404)
            return
        try:
            stats = os.stat(file_path)
            ext = os.path.splitext(file_path)[1].lower().lstrip(".")
            self.json_response(
                {
                    "file": file_path,
                    "size": stats.st_size,
                    "format": ext,
                    "isSupported": ext in SUPPORTED_FORMATS,
                    "modifiedTime": stats.st_mtime,
                    "createdTime": stats.st_ctime,
                }
            )
        except Exception as e:
            self.json_response({"error": str(e)}, 500)

    def handle_audio_stream(self, params):
        file_param = self._get_param(params, "file")
        if not file_param:
            self.json_response({"error": "Missing file parameter"}, 400)
            return
        file_path = file_param
        if not os.path.exists(file_path):
            self.json_response({"error": "File not found"}, 404)
            return
        try:
            file_size = os.path.getsize(file_path)
            ext = os.path.splitext(file_path)[1].lower()
            mime_type = MIME_TYPES.get(ext, "audio/mpeg")

            range_header = self.headers.get("Range", "")

            if range_header:
                range_value = range_header.replace("bytes=", "")
                parts = range_value.split("-")
                start = int(parts[0]) if parts[0] else 0
                end = int(parts[1]) if parts[1] else file_size - 1

                if start >= file_size or end >= file_size:
                    self.send_response(416)
                    self.send_header("Content-Range", f"bytes */{file_size}")
                    self.end_headers()
                    return

                content_length = end - start + 1
                self.send_response(206)
                self.send_header("Content-Type", mime_type)
                self.send_header("Content-Length", str(content_length))
                self.send_header("Content-Range", f"bytes {start}-{end}/{file_size}")
                self.send_header("Accept-Ranges", "bytes")
                self.send_header("Cache-Control", "public, max-age=3600")
                self.end_headers()
                if self.command != "HEAD":
                    with open(file_path, "rb") as f:
                        f.seek(start)
                        remaining = content_length
                        while remaining > 0:
                            chunk = f.read(min(remaining, 65536))
                            if not chunk:
                                break
                            self.wfile.write(chunk)
                            remaining -= len(chunk)
            else:
                self.send_response(200)
                self.send_header("Content-Type", mime_type)
                self.send_header("Content-Length", str(file_size))
                self.send_header("Accept-Ranges", "bytes")
                self.send_header("Cache-Control", "public, max-age=3600")
                self.end_headers()
                if self.command != "HEAD":
                    with open(file_path, "rb") as f:
                        while True:
                            chunk = f.read(65536)
                            if not chunk:
                                break
                            self.wfile.write(chunk)
        except Exception as e:
            self.json_response({"error": str(e)}, 500)

    def handle_audio_metadata(self, params):
        file_param = self._get_param(params, "file")
        if not file_param:
            self.json_response({"error": "Missing file parameter"}, 400)
            return
        file_path = file_param
        if not os.path.exists(file_path):
            self.json_response({"error": "File not found"}, 404)
            return
        try:
            basename = os.path.basename(file_path)
            ext = os.path.splitext(file_path)[1].lower().lstrip(".")
            stats = os.stat(file_path)
            title = os.path.splitext(basename)[0]
            artist = ""
            album = ""
            try:
                import mutagen

                mf = mutagen.File(file_path)
                if mf is not None:
                    tags = mf.tags
                    if tags is not None:
                        title = _get_tag(tags, ["title"], title)
                        artist = _get_tag(tags, ["artist"], "")
                        album = _get_tag(tags, ["album"], "")
            except Exception:
                pass
            self.json_response(
                {
                    "filename": basename,
                    "path": file_path,
                    "format": ext,
                    "size": stats.st_size,
                    "sizeReadable": format_file_size(stats.st_size),
                    "modifiedTime": stats.st_mtime,
                    "title": title,
                    "artist": artist,
                    "album": album,
                }
            )
        except Exception as e:
            self.json_response({"error": str(e)}, 500)

    def handle_audio_cover(self, params):
        file_param = self._get_param(params, "file")
        if not file_param:
            self.json_response({"error": "Missing file parameter"}, 400)
            return
        file_path = file_param
        if not os.path.exists(file_path):
            self.json_response({"error": "File not found"}, 404)
            return
        try:
            cover_data = None
            cover_mime = "image/jpeg"
            try:
                import mutagen

                mf = mutagen.File(file_path)
                if mf is not None:
                    cover_data, cover_mime = _extract_cover(mf)
            except Exception:
                pass
            if cover_data is None:
                dir_path = os.path.dirname(file_path)
                for name in (
                    "cover.jpg",
                    "cover.jpeg",
                    "cover.png",
                    "folder.jpg",
                    "folder.jpeg",
                    "folder.png",
                    "Cover.jpg",
                    "Cover.jpeg",
                    "Cover.png",
                    "Folder.jpg",
                    "Folder.jpeg",
                    "Folder.png",
                ):
                    candidate = os.path.join(dir_path, name)
                    if os.path.isfile(candidate):
                        with open(candidate, "rb") as f:
                            cover_data = f.read()
                        ext = os.path.splitext(name)[1].lower()
                        cover_mime = "image/png" if ext == ".png" else "image/jpeg"
                        break
            if cover_data is not None:
                self.send_response(200)
                self.send_header("Content-Type", cover_mime)
                self.send_header("Content-Length", str(len(cover_data)))
                self.send_header("Cache-Control", "public, max-age=3600")
                self.end_headers()
                if self.command != "HEAD":
                    self.wfile.write(cover_data)
            else:
                self.send_response(404)
                self.send_header("Content-Length", "0")
                self.end_headers()
        except Exception as e:
            self.json_response({"error": str(e)}, 500)

    def handle_playlist_list(self, params):
        dir_param = self._get_param(params, "dir")
        dir_path = dir_param if dir_param else "/"
        if not os.path.exists(dir_path):
            self.json_response({"error": "Directory not found"}, 404)
            return
        try:
            files = []
            for name in sorted(os.listdir(dir_path)):
                ext = os.path.splitext(name)[1].lower().lstrip(".")
                if ext not in SUPPORTED_FORMATS:
                    continue
                full_path = os.path.join(dir_path, name)
                if not os.path.isfile(full_path):
                    continue
                stats = os.stat(full_path)
                files.append(
                    {
                        "name": name,
                        "path": full_path,
                        "size": stats.st_size,
                        "sizeReadable": format_file_size(stats.st_size),
                        "modifiedTime": stats.st_mtime,
                    }
                )
            self.json_response(
                {
                    "directory": dir_path,
                    "count": len(files),
                    "files": files,
                }
            )
        except Exception as e:
            self.json_response({"error": str(e)}, 500)

    def handle_lyrics(self, params):
        file_param = self._get_param(params, "file")
        if not file_param:
            self.json_response({"error": "Missing file parameter"}, 400)
            return
        file_path = file_param
        if not os.path.exists(file_path):
            self.json_response({"error": "File not found"}, 404)
            return
        try:
            base_name = os.path.splitext(file_path)[0]
            dir_path = os.path.dirname(file_path)
            lrc_content = None
            lrc_file = None
            for candidate in [base_name + ".lrc", base_name + ".LRC"]:
                if os.path.isfile(candidate):
                    lrc_file = candidate
                    break
            if lrc_file is None:
                for entry in os.listdir(dir_path):
                    entry_lower = entry.lower()
                    base_lower = os.path.basename(base_name).lower()
                    if entry_lower == base_lower + ".lrc":
                        lrc_file = os.path.join(dir_path, entry)
                        break
            if lrc_file and os.path.isfile(lrc_file):
                for enc in ("utf-8-sig", "utf-8", "gbk", "gb18030", "big5", "latin-1"):
                    try:
                        with open(lrc_file, "r", encoding=enc) as f:
                            lrc_content = f.read()
                        break
                    except (UnicodeDecodeError, LookupError):
                        continue
                if lrc_content is None:
                    with open(lrc_file, "rb") as f:
                        lrc_content = f.read().decode("utf-8", errors="replace")
            self.json_response(
                {
                    "found": lrc_content is not None,
                    "lyrics": lrc_content,
                    "lrcFile": os.path.basename(lrc_file) if lrc_file else None,
                }
            )
        except Exception as e:
            self.json_response({"error": str(e)}, 500)

    def handle_browse(self, params):
        dir_param = self._get_param(params, "dir")
        dir_path = dir_param if dir_param else "/"
        if not os.path.isdir(dir_path):
            self.json_response({"error": "Directory not found"}, 404)
            return
        try:
            entries = []
            try:
                items = sorted(os.listdir(dir_path))
            except PermissionError:
                self.json_response({"error": "Permission denied"}, 403)
                return
            for name in items:
                if name.startswith("."):
                    continue
                full_path = os.path.join(dir_path, name)
                try:
                    is_dir = os.path.isdir(full_path)
                    is_audio = (
                        os.path.isfile(full_path)
                        and os.path.splitext(name)[1].lower().lstrip(".")
                        in SUPPORTED_FORMATS
                    )
                    if not is_dir and not is_audio:
                        continue
                    entries.append(
                        {
                            "name": name,
                            "path": full_path,
                            "isDir": is_dir,
                            "isAudio": is_audio,
                        }
                    )
                except (PermissionError, OSError):
                    continue
            parent = os.path.dirname(dir_path) if dir_path != "/" else None
            self.json_response(
                {
                    "currentDir": dir_path,
                    "parentDir": parent,
                    "entries": entries,
                }
            )
        except Exception as e:
            self.json_response({"error": str(e)}, 500)

    @staticmethod
    def _get_param(params, name):
        values = params.get(name)
        return values[0] if values else None


def _get_tag(tags, keys, default=""):
    for key in keys:
        val = tags.get(key)
        if val is not None:
            if isinstance(val, list) and len(val) > 0:
                return str(val[0])
            return str(val)
    return default


def _extract_cover(mf):
    cover_data = None
    cover_mime = "image/jpeg"
    try:
        if hasattr(mf, "tags") and mf.tags is not None:
            tag_type = type(mf.tags).__name__
            if tag_type == "ID3":
                for frame in mf.tags.values():
                    if frame.FrameID == "APIC":
                        cover_data = frame.data
                        cover_mime = frame.mime or "image/jpeg"
                        break
            elif tag_type in ("VorbisComment",):
                pictures = mf.tags.get("metadata_block_picture", [])
                if pictures:
                    import base64 as b64

                    raw = b64.b64decode(str(pictures[0]))
                    from mutagen.flac import Picture

                    pic = Picture(raw)
                    cover_data = pic.data
                    cover_mime = pic.mime or "image/jpeg"
            elif tag_type == "_MP4Tags":
                covr = mf.tags.get("covr")
                if covr:
                    cover_data = bytes(covr[0])
                    img_format = covr[0].imageformat
                    if img_format == mutagen.mp4.MP4Cover.FORMAT_PNG:
                        cover_mime = "image/png"
                    else:
                        cover_mime = "image/jpeg"
            elif hasattr(mf, "pictures"):
                pics = mf.pictures
                if pics:
                    cover_data = pics[0].data
                    cover_mime = pics[0].mime or "image/jpeg"
    except Exception:
        pass
    return cover_data, cover_mime


def normalize_base_path(path):
    if not path:
        return "/"
    normalized = path.strip()
    if not normalized.startswith("/"):
        normalized = "/" + normalized
    return normalized.rstrip("/") or "/"


def strip_base_path(path, base_path):
    normalized = path or "/"
    if base_path != "/" and normalized.startswith(base_path):
        normalized = normalized[len(base_path) :] or "/"
    return normalized


def format_file_size(size_bytes):
    if size_bytes == 0:
        return "0 B"
    units = ["B", "KB", "MB", "GB"]
    i = 0
    size = float(size_bytes)
    while size >= 1024 and i < len(units) - 1:
        size /= 1024
        i += 1
    return f"{round(size * 100) / 100} {units[i]}"


def main():
    parser = argparse.ArgumentParser(description="fn-audioplayer Unix socket server")
    parser.add_argument("--unix-socket", required=True)
    parser.add_argument("--base-path", default="/app/fn-audioplayer")
    parser.add_argument("--www-root", required=True)
    args = parser.parse_args()

    if os.path.exists(args.unix_socket):
        os.unlink(args.unix_socket)

    server = ThreadingUnixHTTPServer(
        args.unix_socket,
        Handler,
        base_path=args.base_path,
        www_root=args.www_root,
    )

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
