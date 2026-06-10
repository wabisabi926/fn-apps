#!/bin/bash
NAS_HOST="root@192.168.11.21"
NAS_PASS="fn"
NAS_WWW="/var/apps/fn-fail2ban/target/www"
LOCAL_WWW="$(dirname "$0")/app/www"

SSHPASS="sshpass -p ${NAS_PASS}"

echo "Deploying fn-fail2ban to ${NAS_HOST}:${NAS_WWW} ..."

$SSHPASS scp -o StrictHostKeyChecking=no "${LOCAL_WWW}/api.cgi" "${NAS_HOST}:${NAS_WWW}/api.cgi"
$SSHPASS scp -o StrictHostKeyChecking=no "${LOCAL_WWW}/app.js" "${NAS_HOST}:${NAS_WWW}/app.js"
$SSHPASS scp -o StrictHostKeyChecking=no "${LOCAL_WWW}/index.html" "${NAS_HOST}:${NAS_WWW}/index.html"
$SSHPASS scp -o StrictHostKeyChecking=no "${LOCAL_WWW}/style.css" "${NAS_HOST}:${NAS_WWW}/style.css"

$SSHPASS ssh -o StrictHostKeyChecking=no "${NAS_HOST}" "chmod +x ${NAS_WWW}/api.cgi"

echo "Files deployed. Checking current config..."
$SSHPASS ssh -o StrictHostKeyChecking=no "${NAS_HOST}" "cat /etc/fail2ban/jail.d/fnOS.conf 2>/dev/null; echo '---'; systemctl is-active fail2ban; echo '---'; fail2ban-client status 2>&1 || true"

echo "Deploy complete."
