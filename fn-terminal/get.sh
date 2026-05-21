#!/usr/bin/env bash
#
# Copyright (C) 2022 Ing <https://github.com/wjz304>
#
# This is free software, licensed under the MIT License.
# See /LICENSE for more information.
#

WORKDIR="$(
  cd "$(dirname "$0")"
  pwd
)"
#
rm -rf "${WORKDIR}/app/server"
mkdir -p "${WORKDIR}/app/server" >/dev/null 2>&1 || true
for a in aarch64 arm armhf i686 mips mips64 mips64el mips64el s390x x86_64; do
  curl -skL "https://github.com/tsl0922/ttyd/releases/latest/download/ttyd.${a}" -o "${WORKDIR}/app/server/ttyd.${a}"
  [ $? -ne 0 ] && {
    echo "ERROR: Failed to download ttyd.${a}"
    exit 1
  }
done

echo "Done"
