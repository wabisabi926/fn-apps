#!/bin/bash

# ============================================================================
# File Name       : index.cgi
# Version         : 1.0.0
# Author          : FNOSP/xieguanru
# Collaborators   : FNOSP/MR_XIAOBO, RROrg/Ing
# Created         : 2025-11-18
# Last Modified   : 2026-01-14
# Description     : CGI script for serving static files.
# Usage           : Rename this file to index.cgi, place it under the application's /ui directory,
#                   and run `chmod +x index.cgi` to grant execute permission.
# License         : MIT
# ============================================================================

# 【注意】修改你自己的静态文件根目录，以本应用为例：
BASE_PATH="/var/apps/fn-vgmng/target/www"

URI_NO_QUERY="${REQUEST_URI%%\?*}"
REL_PATH="/"

case "$URI_NO_QUERY" in
  *index.cgi*)
    REL_PATH="${URI_NO_QUERY#*index.cgi}"
    ;;
esac

if [ -z "$REL_PATH" ] || [ "$REL_PATH" = "/" ]; then
  REL_PATH="/index.html"
fi

TARGET_FILE="${BASE_PATH}${REL_PATH}"

if echo "$TARGET_FILE" | grep -q '\.\.'; then
  echo "Status: 400 Bad Request"
  echo "Content-Type: text/plain; charset=utf-8"
  echo ""
  echo "Bad Request: Path traversal detected"
  exit 0
fi

if [ ! -f "$TARGET_FILE" ]; then
  echo "Status: 404 Not Found"
  echo "Content-Type: text/plain; charset=utf-8"
  echo ""
  echo "404 Not Found: ${REL_PATH}"
  exit 0
fi

ext="${TARGET_FILE##*.}"
ext_lc="$(printf '%s' "$ext" | tr '[:upper:]' '[:lower:]')"

case "$ext_lc" in
  html | htm) mime="text/html; charset=utf-8" ;;
  css) mime="text/css; charset=utf-8" ;;
  js) mime="application/javascript; charset=utf-8" ;;
  cgi) mime="application/x-httpd-cgi" ;;
  jpg | jpeg) mime="image/jpeg" ;;
  png) mime="image/png" ;;
  gif) mime="image/gif" ;;
  svg) mime="image/svg+xml" ;;
  txt | log) mime="text/plain; charset=utf-8" ;;
  json) mime="application/json; charset=utf-8" ;;
  xml) mime="application/xml; charset=utf-8" ;;
  *) mime="application/octet-stream" ;;
esac

mtime=$(stat -c %Y "$TARGET_FILE" 2>/dev/null || echo 0)
size=$(stat -c %s "$TARGET_FILE" 2>/dev/null || echo 0)
last_mod="$(date -u -d "@$mtime" +"%a, %d %b %Y %H:%M:%S GMT" 2>/dev/null || echo "")"

if [ -n "${HTTP_IF_MODIFIED_SINCE:-}" ]; then
  ims_epoch=$(date -d "$HTTP_IF_MODIFIED_SINCE" +%s 2>/dev/null || echo 0)
  if [ "$ims_epoch" -ge "$mtime" ] && [ "$mtime" -gt 0 ]; then
    echo "Status: 304 Not Modified"
    echo ""
    exit 0
  fi
fi

printf 'Content-Type: %s\r\n' "$mime"
printf 'Content-Length: %s\r\n' "$size"
printf 'Last-Modified: %s\r\n' "$last_mod"
printf '\r\n'

if [ "${REQUEST_METHOD:-GET}" = "HEAD" ]; then
  exit 0
fi

cat "$TARGET_FILE"
