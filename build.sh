#!/bin/bash

# ./fnpack create fn-kodi -t docker --without-ui true
# ./fnpack build --directory fn-kodi

curl -kL https://static2.fnnas.com/fnpack/fnpack-1.0.4-linux-amd64 -o fnpack
sudo chmod +x fnpack

[ -n "$*" ] && APPS="$*" || APPS=$(find "${PWD}" -maxdepth 1 -type d | sort)
for APP in ${APPS}; do
  [ -f "${APP}/norelease" ] && continue
  [ -f "${APP}/manifest" ] || continue
  APPNAME=$(grep -w '^appname' "${APP}/manifest" | awk -F= '{print $2}' | xargs)
  VERSION=$(grep -w '^version' "${APP}/manifest" | awk -F= '{print $2}' | xargs)
  PLATFORM=$(grep -w '^platform' "${APP}/manifest" | awk -F= '{print $2}' | xargs)
  echo "Building ${APP} ..."
  if [ -f "${APP}/build.sh" ]; then
    chmod +x "$(realpath "${APP}")/build.sh"
    "$(realpath "${APP}")/build.sh"
    [ $? -ne 0 ] && echo "Build script failed for ${APP}" && exit 1
  else
    ./fnpack build --directory ${APP}
    mv -f "${APPNAME}.fpk" "${APPNAME}_${PLATFORM}_v${VERSION}.fpk"
  fi
done
