#!/usr/bin/env bash
#
# Scrutiny FPK Build Script
# Downloads: collector binary, web binary, frontend files
# InfluxDB is downloaded at install time (too large to bundle)
#
# Usage:
#   ./build.sh          # auto detect latest version
#   ./build.sh 1.33.0   # specify version

set -e

WORKDIR="$(
  cd "$(dirname "$0")"
  pwd
)"

get_latest_version() {
  local tag
  tag=$(curl -fsSL -w "%{url_effective}" -o /dev/null "https://github.com/Starosdev/scrutiny/releases/latest" \
    | awk -F'/' '{print $NF}' | sed 's/^[v|V]//g')
  if [ -z "$tag" ]; then
    echo "ERROR: Failed to get latest version" >&2
    exit 1
  fi
  echo "$tag"
}

SCRUTINY_VERSION="${1:-$(get_latest_version)}"
echo "Building Scrutiny v${SCRUTINY_VERSION} ..."

ARCHS=(x86_64 aarch64)
declare -A COLLECTOR_ASSET
COLLECTOR_ASSET[x86_64]="scrutiny-collector-metrics-linux-amd64"
COLLECTOR_ASSET[aarch64]="scrutiny-collector-metrics-linux-arm64"

declare -A WEB_ASSET
WEB_ASSET[x86_64]="scrutiny-web-linux-amd64"
WEB_ASSET[aarch64]="scrutiny-web-linux-arm64"

FRONTEND_ASSET="scrutiny-web-frontend.tar.gz"

for arch in "${ARCHS[@]}"; do
  # --- Collector ---
  asset="${COLLECTOR_ASSET[$arch]}"
  url="https://github.com/Starosdev/scrutiny/releases/download/v${SCRUTINY_VERSION}/${asset}"
  cachefile="/tmp/${asset}-${SCRUTINY_VERSION}"

  echo "Downloading Collector for ${arch} ..."
  if [ -f "${cachefile}" ]; then
    echo "  Using cached: ${cachefile}"
  else
    curl -fsSL "${url}" -o "${cachefile}"
  fi

  mkdir -p "${WORKDIR}/app/bin/${arch}"
  cp "${cachefile}" "${WORKDIR}/app/bin/${arch}/scrutiny-collector-metrics"
  chmod +x "${WORKDIR}/app/bin/${arch}/scrutiny-collector-metrics"
  echo "  Done: app/bin/${arch}/scrutiny-collector-metrics"

  # --- Web Binary ---
  web_asset="${WEB_ASSET[$arch]}"
  web_url="https://github.com/Starosdev/scrutiny/releases/download/v${SCRUTINY_VERSION}/${web_asset}"
  web_cachefile="/tmp/${web_asset}-${SCRUTINY_VERSION}"

  echo "Downloading Web binary for ${arch} ..."
  if [ -f "${web_cachefile}" ]; then
    echo "  Using cached: ${web_cachefile}"
  else
    curl -fsSL "${web_url}" -o "${web_cachefile}"
  fi

  cp "${web_cachefile}" "${WORKDIR}/app/bin/${arch}/scrutiny-web"
  chmod +x "${WORKDIR}/app/bin/${arch}/scrutiny-web"
  echo "  Done: app/bin/${arch}/scrutiny-web"
done

# --- Frontend ---
frontend_url="https://github.com/Starosdev/scrutiny/releases/download/v${SCRUTINY_VERSION}/${FRONTEND_ASSET}"
frontend_cachefile="/tmp/${FRONTEND_ASSET}-${SCRUTINY_VERSION}"

echo "Downloading Frontend ..."
if [ -f "${frontend_cachefile}" ]; then
  echo "  Using cached: ${frontend_cachefile}"
else
  curl -fsSL "${frontend_url}" -o "${frontend_cachefile}"
fi

rm -rf "${WORKDIR}/app/web"
mkdir -p "${WORKDIR}/app/web"
tar -xzf "${frontend_cachefile}" -C "${WORKDIR}/app/web"
echo "  Done: app/web/"

# --- Note: Chinese translation is applied at runtime via translate.sh ---

# Update manifest version
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' "s/^version[[:space:]]*=.*/version               = ${SCRUTINY_VERSION}/" "${WORKDIR}/manifest"
else
  sed -i "s/^version[[:space:]]*=.*/version               = ${SCRUTINY_VERSION}/" "${WORKDIR}/manifest"
fi

APPNAME=$(grep -w '^appname' "${WORKDIR}/manifest" | awk -F= '{print $2}' | xargs)
VERSION=$(grep -w '^version' "${WORKDIR}/manifest" | awk -F= '{print $2}' | xargs)
PLATFORM=$(grep -w '^platform' "${WORKDIR}/manifest" | awk -F= '{print $2}' | xargs)

rm -f "${WORKDIR}/app.tgz" "$(dirname "${WORKDIR}")/${APPNAME}_${PLATFORM}_v${VERSION}.fpk" 2>/dev/null || true
tar -czf "${WORKDIR}/app.tgz" -C "${WORKDIR}/app" . >/dev/null 2>&1
tar -czf "$(dirname "${WORKDIR}")/${APPNAME}_${PLATFORM}_v${VERSION}.fpk" \
  -C "${WORKDIR}" cmd config i18n wizard app.tgz ICON.PNG ICON_256.PNG manifest >/dev/null 2>&1

rm -f "${WORKDIR}/app.tgz"

# Clean up downloaded binaries
for arch in "${ARCHS[@]}"; do
  rm -rf "${WORKDIR}/app/bin/${arch}/scrutiny-collector-metrics"
  rm -rf "${WORKDIR}/app/bin/${arch}/scrutiny-web"
done
rm -rf "${WORKDIR}/app/web"

echo "Done: $(dirname "${WORKDIR}")/${APPNAME}_${PLATFORM}_v${VERSION}.fpk"

exit 0
