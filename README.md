# fn-apps

飞牛OS应用 仓库。

![Release](https://img.shields.io/github/v/release/RROrg/fn-apps?logo=github&style=flat-square)
![Downloads](https://img.shields.io/github/downloads/RROrg/fn-apps/total)

## 模块速览

| 应用名称 | 版本 | 平台 | 描述 |
|----------|------|------|------|
| fn-VirtualHereServer | v4.8.6 | all | VirtualHere USB 服务器支持通过网络远程访问 USB 设备。 |
| fn-chromium | v1.0.2 | all | Chromium 是一个开源的网页浏览器项目，旨在为用户提供更安全、更快速和更稳定的浏览体验。 |
| fn-chromium-desktop | v1.0.0 | all | Chromium-desktop 是一个基于 KMS/DRM 的网页浏览器及音频支持，旨在本地显示器提供浏览器功能。 |
| fn-codeserver | v1.0.6 | all | code-server 是 VS Code 的在线版本，允许您通过浏览器进行代码编辑和开发。 |
| fn-fail2ban | v1.0.1 | all | fail2ban 是一个开源的入侵防御工具，用于保护 Linux 服务器免受暴力破解攻击。 它通过监控日志文件，检测可疑的登录尝试，并自动封禁恶意 IP 地址，从而增强系统的安全性。 |
| fn-fnOS-aarch64 | v1.0.0 | x86 | 基于 aarch64 架构 的 fnOS 系统。 |
| fn-grafana-alloy | v1.13.2 | all | 可观测性数据收集器，收集系统日志、应用日志发送到 Loki |
| fn-kodi | v1.0.6 | all | Kodi 是一个免费且开源的媒体播放器软件，用于播放视频、音频和图像。 |
| fn-linux-station | v1.0.1 | all | Linux 工作站是一个基于 Linux 的桌面环境，旨在为用户提供一个高效、稳定和易用的工作环境。 |
| fn-monitor | v1.0.3 | all | 显示器/电源设置应用，用于配置系统的显示器和电源选选项。 |
| fn-open-vm-tools | v1.0.8 | all | Open-VM-Tools 是 VMware Tools 的开源替代品，旨在为运行在 VMware 环境中的虚拟机提供更好的性能和用户体验。 |
| fn-qemu-ga | v1.0.8 | all | QEMU Guest Agent 是一个运行在虚拟机内部的守护进程，旨在通过与虚拟化主机的交互，执行一系列操作以增强虚拟机的管理能力。 |
| fn-scheduler | v1.2.4 | all | 轻量级的任务计划应用，支持设置定时任务以自动执行脚本或命令，同时也支持基于条件的任务触发，例如在特定时间、特定事件或特定文件变化时执行任务。 |
| fn-scrutiny-collector | v1.49.2 | all | 硬盘 S.M.A.R.T 健康监控采集器，定时采集硬盘健康数据发送到 Scrutiny Web 服务 |
| fn-sshd-config | v1.0.5 | all | 设置 root 用户密码，修改 SSHD 配置. |
| fn-terminal | v1.0.9 | all | terminal (ttyd + tmux) 是一个基于 Web 的终端应用程序，允许用户通过浏览器访问和管理服务器终端会话，提供便捷的远程终端操作体验。 |
| fn-vgmng | v1.0.0 | all | 存储池管理, 支持非飞牛存储池(其他NAS系统存储池)的管理。 |
| fn-wifi-hotspot | v1.1.2 | all | 无线热点创建工具，允许用户轻松地将计算机变成一个 Wi-Fi 热点，分享网络连接给其他设备。 |
| fn-zerotier | v1.0.2 | all | ZeroTier 是一个无中心的虚拟网络，无需配置即可连接设备。 |


## fnOS
fnOS 下载地址：https://raw.githubusercontent.com/RROrg/fn-apps/refs/heads/main/fnOS.json  
获取最新版本的 fnOS 镜像下载地址：
```shell
# E.g. 获取 fnOS-x86_64 最新版本的下载地址
curl -skL "https://raw.githubusercontent.com/RROrg/fn-apps/refs/heads/main/fnOS.json" \
| jq -r '[.[] | select(.name=="fnOS-x86_64")] | sort_by((.version | split(".") | map(tonumber)), .version) | last | .url'
```

## Proxmox VE One Click Install:
  ```
  curl -fsSL https://github.com/RROrg/fn-apps/raw/refs/heads/main/pve.sh | bash -s -- --arch x86_64

  # Optional Parameters:
  --onboot <0|1>             Enable VM on boot, default 1 (enable)"
  --arch <x86_64|aarch64>    Architecture, support x86_64 and aarch64, default x86_64"
  --efi <0|1>                Enable UEFI boot, default 1 (enable)"
  --iso <path>               Local ISO path, use local ISO if set"
  --storage <name>           Storage name for images, as local-lvm, default auto get"
  --v9ppath <path>           Set to /path/to/9p to mount virtio 9p share"
  --vfsdirid <dirid>         Set to <dirid> to mount virtio fs share"
  ```

## 社区支持

- QQ 群：130359605 · [点击加入](https://qm.qq.com/q/xMUyJacSIw)
- Issue：在 GitHub 提交问题/建议，描述部署环境、日志与复现步骤。
- PR：欢迎补充新模块、修复脚本或完善文档，遵循现有目录结构即可。

## 7: Sponsoring

- <img src="https://raw.githubusercontent.com/wjz304/wjz304/master/my/buymeacoffee.png" width="700">

## 8: License

- [GPL-V3](https://github.com/RROrg/rr/blob/main/LICENSE)
