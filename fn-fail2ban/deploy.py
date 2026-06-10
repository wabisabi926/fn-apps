import paramiko
import os
import sys

NAS_HOST = "192.168.11.21"
NAS_USER = "root"
NAS_PASS = "fn"
NAS_WWW = "/var/apps/fn-fail2ban/target/www"
LOCAL_WWW = os.path.join(os.path.dirname(os.path.abspath(__file__)), "app", "www")

FILES = ["api.cgi", "app.js", "index.html", "style.css"]

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Connecting to {NAS_USER}@{NAS_HOST}...")
    ssh.connect(NAS_HOST, username=NAS_USER, password=NAS_PASS)
    sftp = ssh.open_sftp()

    for f in FILES:
        local = os.path.join(LOCAL_WWW, f)
        remote = f"{NAS_WWW}/{f}"
        print(f"  Uploading {f}...")
        sftp.put(local, remote)

    print("Setting permissions...")
    ssh.exec_command(f"chmod +x {NAS_WWW}/api.cgi")
    import time
    time.sleep(0.5)

    print("Checking current config...")
    stdin, stdout, stderr = ssh.exec_command("cat /etc/fail2ban/jail.d/fnOS.conf 2>/dev/null")
    conf = stdout.read().decode()
    print("--- fnOS.conf ---")
    print(conf)
    print("--- end ---")

    stdin, stdout, stderr = ssh.exec_command("systemctl is-active fail2ban 2>/dev/null")
    status = stdout.read().decode().strip()
    print(f"fail2ban status: {status}")

    stdin, stdout, stderr = ssh.exec_command("fail2ban-client status 2>&1")
    fb_status = stdout.read().decode().strip()
    print(f"fail2ban-client status:\n{fb_status}")

    sftp.close()
    ssh.close()
    print("Deploy complete!")

if __name__ == "__main__":
    main()
