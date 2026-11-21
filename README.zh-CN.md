> 本文档为 [原文](README.md) 的中文翻译，如与英文原文有出入以英文原文为准。

> **原作者与来源：** [Jesther Silvestre（@jesther-ai）](https://github.com/jesther-ai) · 上游项目：[jesther-ai/open-u60-pro](https://github.com/jesther-ai/open-u60-pro) · 本仓库是其**简体中文社区分支**（MIT 许可），仅做中文化与构建辅助，详见 [FORK-NOTICE.zh-CN.md](FORK-NOTICE.zh-CN.md)。
>
> **本仓库已完成整套简体中文本地化，并已部署到 ZTE U60 Pro（MU5250）**：设备端控制台（`http://192.168.0.1:9090/`）、Agent 错误提示、iOS/Android App 源码、官网落地页与文档均已中文化。部署方式、密码、验证结果与回滚步骤见 [本地化与安装说明](docs/zh-CN/本地化说明.md)，统一用词见 [术语表](docs/zh-CN/术语表.md)。

<div align="center">

<p><strong>iOS 伴侣 App</strong></p>
<p>
<img src="mobile/ios/screenshots/dashboard.png" alt="仪表盘" width="250">&nbsp;&nbsp;<img src="mobile/ios/screenshots/connection-signal.png" alt="连接与信号" width="250">&nbsp;&nbsp;<img src="mobile/ios/screenshots/esim-profiles.png" alt="eSIM 配置文件" width="250">
</p>

# ZTE U60 Pro 工具集

**释放你的 ZTE U60 Pro（MU5250）5G 移动路由器的全部潜能。**

设备端 Agent 提供 REST API、实时更新和内置 Web UI，并配有原生手机伴侣 App，可用于信号监控、锁频段、配置备份/解密、网络定制等。

[![Rust](https://img.shields.io/badge/rust-stable-orange.svg)](https://www.rust-lang.org/)
[![平台](https://img.shields.io/badge/device-ZTE%20U60%20Pro%20(MU5250)-orange.svg)]()
[![芯片](https://img.shields.io/badge/chipset-Snapdragon%20X75-red.svg)]()
[![固件](https://img.shields.io/badge/firmware-ZWRT%20(OpenWrt%2023.05)-green.svg)]()
[![网站](https://img.shields.io/badge/website-open--u60--pro.vercel.app-blue.svg)](https://open-u60-pro.vercel.app)
[![发布](https://img.shields.io/github/v/release/jesther-ai/open-u60-pro)](https://github.com/jesther-ai/open-u60-pro/releases/latest)

**下载：** [最新版本](https://github.com/jesther-ai/open-u60-pro/releases/latest) · **更新内容：** [CHANGELOG.md](CHANGELOG.md) · **截图：** [按功能查看](#截图) · **Web UI：** [响应式控制台](#响应式-web-控制台)

</div>

---

## 设备

| | |
|---|---|
| **型号** | ZTE U60 Pro（MU5250） |
| **硬件** | `MU5250_HW1.0` |
| **固件** | `CN_ZTE_MU5250V1.0.0B27`（2025 年 10 月 31 日） |
| **芯片** | Qualcomm Snapdragon X75（SDX75 / SDXPINN） |
| **CPU** | 4x Cortex-A55（ARMv8.2-A）@ 2.2 GHz |
| **运行内存** | 1.6 GB |
| **存储** | 8 GB eMMC（Longsys JS08AC），69 个分区，A/B 槽位 |
| **调制解调器** | 5G-A Sub-6 + 毫米波，Cat 22 LTE |
| **NR 频段** | n1/2/3/5/7/8/18/20/26/28/29/38/40/41/48/66/71/75/77/78/79 |
| **LTE 频段** | 1/2/3/4/5/7/8/18/19/20/26/28/29/32/34/38/39/40/41/42/43/48/66/71 |
| **WiFi** | WiFi 7（802.11be），2x2 MIMO，EHT160 |
| **WiFi 芯片** | Qualcomm WCN7851（`qcacld32`） |
| **WiFi 射频** | 2.4 GHz（ch 1-13，EHT40，19 dBm）· 5 GHz（ch 36-165，EHT160，18 dBm） |
| **电池** | 10,000 mAh 锂离子电池，最高 4.5V，PM7550B 电量计 |
| **充电** | USB-PD，15W（5V/3A），快充 |
| **USB** | USB-C（PD 受电，OTG/移动电源） |
| **显示屏** | 3.5 英寸 IPS LCD（Sitronix ST77926），320x480，RGB565，DRM/KMS |
| **UI 工具包** | LVGL，含 FreeType + LodePNG，资源位于 `/usr/ui/` |
| **背光** | AWINIC AW9523B（I2C `1-005b`），sysfs `/sys/class/leds/led:lcd/brightness`（0-255） |
| **触控** | Sitronix（I2C `1-0055`）-> `/dev/input/event3` |
| **操作系统** | ZWRT（OpenWrt 23.05.4 r24012-d8dd03c46f） |
| **内核** | Linux 5.15.170-perf，SMP PREEMPT，aarch64 |
| **PMIC** | PMX75 + PM7550BA + PMG1110 |
| **SIM** | 单 nano-SIM（无内置 eSIM；9eSIM B1 等 eSIM 卡可在卡槽中使用） |
| **NFC** | 快速设备配对 |
| **蓝牙** | Qualcomm WCN7850（BT 5.3+），UART 传输 —— 已禁用（服务已停止，模块已卸载） |
| **客户端数量** | 最多 64 个（每个射频 32 个） |

## 包含内容

### 设备端 Agent（`zte-agent`）

轻量 Rust HTTP 服务器，直接运行在路由器上（端口 9090，可经路由器所在网络访问；启用后也可经你的 tailnet 访问）。它把 ubus 调用、AT 命令和 sysfs 读取转换为供手机 App 使用的类型化 REST API，推送实时更新（`GET /api/events`，见 [events.md](zte-agent/docs/events.md)），并在 `http://192.168.0.1:9090/` 提供浏览器界面（见 [Web UI](#web-ui)）。

```bash
# Cross-compile for the device
cargo build --release --target aarch64-unknown-linux-musl -p zte-agent
```

**23 个类别共 189 个端点：**

| 类别 | 数量 | 能力 |
|---|---|---|
| 认证 | 1 | 使用 Agent 密码登录（持有者令牌；有限流） |
| 设备 | 18 | 系统信息、电池、CPU、内存、温度、充电器、充电控制、重启、恢复出厂设置、节能、快速启动、自动休眠 |
| 网络 | 9 | 信号强度（RSRP/SINR/RSRQ）、速率、流量统计、WAN/LAN 状态、rmnet、已连接设备 |
| 调制解调器 | 16 | 飞行模式、移动数据开关、网络模式（2G-5G）、运营商扫描、手动注册、流量统计、无服务与连接看门狗策略 |
| 短信 | 5 | 列出、发送、删除、标记已读、存储容量 |
| SIM | 7 | SIM 信息、IMEI、PIN 管理、PUK 解锁 |
| 小区/频段 | 19 | NR/LTE 锁频段、锁小区、邻区扫描、STC、信号质量检测 |
| 路由器 | 29 | DNS、LAN/DHCP、防火墙、NAT、DMZ、UPnP、端口转发、QoS、域名过滤、APN 配置文件、VPN/ALG |
| WiFi | 4 | 状态、SSID/密码/信道/发射功率、访客 WiFi |
| USB | 3 | USB 模式切换、移动电源控制 |
| 电话 | 15 | 语音通话（拨号/挂断/接听/DTMF/静音）、USSD 代码、SIM 工具箱菜单 |
| eSIM | 13 | eSIM 配置文件（内置 SGP.22 LPA）：列出、切换（校验卡片 → 调制解调器 → 数据）、重命名、从二维码下载并预览/取消、删除、运营商回执、卡片信息 |
| 测速 | 4 | 服务器列表、运行测试、进度跟踪 |
| DoH 代理 | 6 | DNS-over-HTTPS 代理、缓存管理 |
| 局域网测试 | 3 | WiFi ping、下载/上传吞吐测量 |
| 短信转发 | 10 | 自动转发规则、增删改查、测试、日志管理、重试滞留转发 |
| 系统 | 2 | 进程列表、终止预装软件 |
| 调度器 | 5 | 为任意 API 操作安排定时/周期任务 |
| 实时更新 | 1 | `GET /api/events`：信号、流量、电池、SIM、eSIM 进度的 Server-Sent Events |
| 实时活动 | 3 | 注册/注销 iOS 实时活动、状态 |
| Agent 更新 | 6 | 已签名稳定版/Beta 检查、非活动槽位下载、受控安装与回滚 |
| Tailscale | 8 | 远程管理：设置、登录 URL、启用/停用、配置、登出、更新 |
| AT 终端 | 2 | 发送 AT 命令、端口信息 |

### Web UI（内置于 Agent）

连接路由器的 Wi-Fi，打开 `http://192.168.0.1:9090/`，即可查看仪表盘、连接与信号以及最常用的设置，无需安装任何东西。参见 [Web UI](#web-ui)。

### 响应式 Web 控制台

在路由器所在网络中打开 **`http://192.168.0.1:9090/console/`**。控制台内嵌在 Agent 二进制中，没有独立的前端服务器或云服务。启用局域网 HTTPS 后，请在同一 HTTPS 地址上使用 `/console/`。它沿用当前 Agent 的限流持有者登录、Host/Origin 校验和基于经过时间的会话过期；`/` 会打开该控制台，旧的 `/ui/` 书签会重定向到它。HTTPS 和证书安装控件位于“设置 → HTTPS 与安装”。

五个区域涵盖仪表盘、网络、短信、工具和设置，包括 LTE/NR 载波聚合与 SA/NSA、WAN IPv4/IPv6、离线统计、Wi-Fi/移动网络/APN 设置、已连接设备的流量与观测峰值、eSIM 管理、短信操作/转发、运营商扫描、诊断、LAN/DHCP、防火墙、端口转发、UPnP、DMZ 和 QoS。只有固件上报的字段才会作为测量值或上限呈现。参见[截图](#全新的响应式-web-ui)和[开发者指南](zte-agent/docs/responsive-console.md)。

### 手机伴侣 App

原生 App，直接经 WiFi 连接 —— 无需电脑。

| | iOS | Android |
|---|---|---|
| **框架** | SwiftUI | Jetpack Compose |
| **最低版本** | iOS 16.0 | Android 8.0（API 26） |
| **依赖** | 无（仅 Apple 框架） | OkHttp、Hilt、Vico、kotlinx.serialization |
| **功能** | 频段锁定、通话、设备列表、配置、仪表盘、设备信息、登录、路由器设置、定时任务、信号、SIM/STK/USSD、短信、工具、USB 模式 | 频段锁定、设备列表、配置、仪表盘、设备信息、登录、路由器设置、定时任务、信号、SIM/STK、短信、工具、USB 模式 |
| **标签页** | 仪表盘、短信、工具、路由、设置 | 仪表盘、短信、工具、路由、设置 |
| **路径** | `mobile/ios/OpenU60/`（109 个 Swift 文件） | `mobile/android/OpenU60/`（90 个 Kotlin 文件） |

## 截图

### 全新的响应式 Web UI

Rust Agent 在 **`http://192.168.0.1:9090/`**（也可用 `/console/`）提供一个响应式浏览器控制台。旧的 `/ui/` 书签会打开新控制台。控制台具备手机、平板和桌面布局，浅色/深色/跟随系统主题，SSE 流式更新，动画读数以及平滑的页面/对话框过渡。手机在底部栏中保留全部五个主标签页，包括矮横屏布局和键盘弹出时。

**桌面 · 浅色**

<img src="zte-agent/ui/screenshots/dashboard-desktop-light.png" alt="桌面浅色模式下的响应式 Web UI，显示两个 WAN IP 版本、实时流量、电池和载波聚合" width="1100">

| 手机 · 浅色 | 平板 · 深色 |
|:---:|:---:|
| <img src="zte-agent/ui/screenshots/dashboard-mobile-light.png" alt="手机 Web UI，显示 WAN IPv4 与 IPv6、实时速率和固定的五标签底部导航" width="250"> | <img src="zte-agent/ui/screenshots/signal-tablet-dark.png" alt="深色模式下的平板 Web UI，可展开导航、5G NSA 状态和载波测量值" width="500"> |

<details>
<summary>更多 Web UI 预览：深色仪表盘、已连接设备和 eSIM 管理</summary>

<p><img src="zte-agent/ui/screenshots/dashboard-desktop-dark.png" alt="深色模式下的桌面 Web UI 仪表盘" width="1100"></p>
<p><img src="zte-agent/ui/screenshots/devices-desktop-light.png" alt="已连接设备页面，含示例 MAC/IP 地址、当前流量、观测峰值和单独上报的上限" width="1100"></p>
<p><img src="zte-agent/ui/screenshots/esim-desktop-dark.png" alt="深色模式下的 eSIM 管理，含活动与非活动的示例配置文件和掩码标识符" width="1100"></p>

</details>

这些 Web UI 截图使用**虚构的演示数据**和文档地址段。其中不含真实路由器的抓包、密码、消息或个人设备标识符。当固件不提供按设备的上限时，这些上限显示为“Not reported”。配置与开发者说明见[响应式 Web 控制台](#响应式-web-控制台)。

### iOS 伴侣 App

截图来自 iPhone 上的 iOS App。这些图片中的个人标识符（ICCID 数字、小区 ID）已做掩码。

#### 仪表盘与信号

仪表盘显示运营商、网络类型、实时流量、电池、CPU 温度和已连接设备。点开**连接与信号**可查看 5G NR 与 LTE 读数（RSRP、RSRQ、SINR、RSSI）、频段、信道、带宽、运营商限速以及信号历史图表。

| 仪表盘 | 连接与信号 |
|:---:|:---:|
| <img src="mobile/ios/screenshots/dashboard.png" alt="仪表盘，含运营商、5G NSA、实时流量、电池、CPU 温度和已连接设备" width="220"> | <img src="mobile/ios/screenshots/connection-signal.png" alt="连接与信号页面，含 5G NR 与 LTE 锚点读数、数据会话和信号历史图表" width="220"> |

#### eSIM 配置文件

把 [9eSIM B1](docs/9esim-b1.md) 之类的 eSIM 卡插入 SIM 卡槽后，**路由 → eSIM 配置文件**会列出卡上的运营商配置文件。在配置文件上右滑即可切换；App 会显示每一步，直到移动数据恢复。配置方法：[eSIM 配置文件](#esim-配置文件可选)。

| 卡上的配置文件 | 切换配置文件 |
|:---:|:---:|
| <img src="mobile/ios/screenshots/esim-profiles.png" alt="eSIM 配置文件页面，列出四个运营商配置文件并标出当前活动的一个" width="220"> | <img src="mobile/ios/screenshots/esim-switching.png" alt="配置文件切换进行中：切换配置文件并重新加载 SIM 已完成，正在连接网络" width="220"> |

#### 电池与电源

电池详情、USB-C 模式（用路由器电池给你的手机充电）以及设备控制：充电上限、节能模式、快速启动和自动休眠。

| 电池详情 | USB-C 模式 | 设备控制 |
|:---:|:---:|:---:|
| <img src="mobile/ios/screenshots/battery-details.png" alt="电池详情：容量、充电状态、电压、电流、功率、温度、充满所需时间" width="220"> | <img src="mobile/ios/screenshots/usb-mode.png" alt="USB 模式面板，显示已连接 USB-C 及快充按钮" width="220"> | <img src="mobile/ios/screenshots/device-controls.png" alt="设备控制：充电上限 85%、节能模式、快速启动、自动休眠" width="220"> |

#### 锁定屏幕

在锁定屏幕和灵动岛中显示实时调制解调器信号：见 [iOS 实时活动](#ios-实时活动)。

## 为什么不用中兴官方 App？

原厂 ZTE U60 Pro 为设备管理运行着 **44 个专有守护进程**，占用 **225 MB 运行内存**。其中许多是不必要的（TR-069 远程管理、MQTT 遥测、Samba、NFC、诊断），而且会回连中兴服务器。

`zte-agent` 用单个约 5 MB 的二进制取代了对中兴官方管理 App 的需求：

| | zte-agent | 中兴官方进程组 |
|---|---|---|
| **进程** | 1 | 44 |
| **内存（RSS）** | 约 0.8 MB | 225 MB |
| **二进制大小** | 约 5 MB（gzip 后约 2.5 MB） | 合计约 50+ MB |
| **线程** | 约 10 | 约 130+ |
| **遥测** | 无 | 回连 `iot.zte.com.cn` 等服务器 |
| **App** | 开源原生 iOS/Android | 闭源，仅中文 |

中兴官方进程组中内存占用最高的几项：

| 进程 | 内存 | 用途 |
|---------|-----|---------|
| `zte_topsw_devui` | 22.8 MB | LCD 界面守护进程 |
| `zte_topsw_get_brand` | 14.2 MB | 运营商定制 |
| `zte_topsw_data` | 10.9 MB | 移动数据管理 |
| `zte_topsw_tr069` + 子进程 | 23.2 MB | ISP 远程管理 |
| `zte_topsw_diag` | 7.1 MB | 诊断/日志 |

zte-agent 以 **0.35% 的内存**提供对同一底层 ubus/AT 服务的等效 API 访问 —— 为真正的路由和 WiFi 负载腾出约 224 MB 运行内存。

## 为什么内置 eSIM 管理器而不用 lpac

eSIM 功能最初以独立程序的形式在路由器上运行开源 eSIM 管理器 [lpac](https://github.com/estkme-group/lpac)。为了经调制解调器访问卡片，lpac 需要自带一份 GLib、libqmi、libqrtr、curl、OpenSSL 及其依赖（共 31 个共享库），因此必须交叉编译成 23.5 MB 的包并与 Agent 一起安装。之后 Agent 每执行一次卡片命令都会启动一个新的 lpac 进程，包括 App 请求的每次配置文件列表。

`zte-agent` 现在内置了同样的 eSIM 代码：把 lpac 的卡片库翻译成 Rust（[`euicc/`](euicc/)），再加上一个直接与调制解调器通信的小型驱动。它只给 Agent 增加约 130 KB。

在路由器上实测（U60 Pro，9eSIM B1，2026-10-19）：

| | 内置于 zte-agent | lpac 包 |
|---|---|---|
| **安装** | 无需额外组件 | `/data/lpac` 中独立的 23.5 MB 包（自带 musl 加载器 + 31 个共享库），由 1.4 GB 的交叉编译环境构建 |
| **路由器上的大小** | Agent 二进制内约 130 KB | 23.5 MB |
| **每次卡片命令** | Agent 内一个线程：约 2–3 ms CPU，无额外内存 | 一个新进程：约 20 ms CPU，约 10.7 MB 峰值内存 |
| **`chip info`** | 0.15 s | 0.26 s |
| **`profile list`** | 0.25 s | 0.27 s（节奏由卡片本身决定） |
| **运营商服务器 TLS** | 仅按 GSMA eSIM 根证书校验，校验主机名，不跟随重定向、不使用代理 | 上游 lpac 不校验（`CURLOPT_SSL_VERIFYPEER` 关闭）；需要打补丁 |
| **取消下载** | 取消会告知运营商“推迟”，二维码仍可使用；超时按超时上报 | 每次停止都上报为“被用户拒绝” |
| **卡片忙** | 有名称（`catBusy`、`undefinedError`），Agent 因此知道要重试 | 打补丁前为 "unknown" |
| **中止卡住的命令** | Agent 内按步骤设时间上限 | 先 SIGINT，15 s 后 SIGKILL |
| **许可** | Agent 为 MIT；eSIM 库为 LGPL-2.1 | lpac 的命令行工具为 AGPL-3.0 |

结果与 lpac 一致。在路由器上，`chip info`、`profile list` 和 `notification list` 的输出完全相同。约 100 万个生成用例与 C 库结果一致。一次下载发送的卡片命令和服务器请求逐字节相同。删除、下载、切换和回执已在真实卡片上测试（见 [`zte-agent/docs/esim.md`](zte-agent/docs/esim.md)）。

在其他场景中 lpac 仍是更好的工具。它支持多种读卡器和调制解调器（PC/SC、AT、MBIM、QMI）以及更多命令，例如 SM-DS 发现，并能获得上游修复。Agent 只覆盖本路由器上 App 所需的功能，经调制解调器的 QMI over QRTR 实现，并固定在 lpac 提交 `c7c8d4f`：上游修复只能手工移植。在电脑上配合 USB 读卡器时，请使用 lpac。

## 对设备的影响

> **警告** —— Agent 暴露的某些设备控制端点会修改固件设置。
> 破坏性操作（恢复出厂设置、重启）需要在手机 App 中确认。
> Web UI 在可能断开连接或具有破坏性的变更前会请求确认，
> 重启和恢复出厂设置还需要 Agent 密码。

### 文件系统布局

```
/data/                              (writable /data partition)
├── zte-agent                       <- on-device REST agent
├── zte-agent-tls/                  <- LAN HTTPS certificates (only once turned on; 0700)
└── local/tmp/
    ├── start_zte_agent.sh          <- agent boot script
    ├── dropbear                    <- SSH binary (if installed)
    └── start_dropbear.sh          <- SSH boot script (if installed)

/etc/                               (read-only rootfs)
├── rc.local                        <- boot hooks appended here
└── dropbear/
    ├── authorized_keys             <- SSH public key (if installed)
    └── dropbear_rsa_host_key       <- generated host key (if installed)
```

## 快速开始

### 前置条件

```bash
# 1. Install Rust -- see https://rustup.rs
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 2. Add musl cross-compilation target
rustup target add aarch64-unknown-linux-musl

# 3. Install musl cross-linker
# macOS:
brew install filosottile/musl-cross/musl-cross
# Ubuntu/Debian:
sudo apt install musl-tools gcc-aarch64-linux-gnu

# 4. Install ADB
# macOS:
brew install android-platform-tools
# Ubuntu/Debian:
sudo apt install android-tools-adb

# 5. Build the agent
cargo build --release --target aarch64-unknown-linux-musl -p zte-agent
```

### 首次安装

对于从未安装过 zte-agent 的全新出厂设备：

**方案 A —— 浏览器（无需任何工具）**

访问 [open-u60-pro.vercel.app](https://open-u60-pro.vercel.app)，输入路由器密码和期望的 Agent 密码，连接 USB，然后点击 Deploy。需要 Chrome 或 Edge。

**方案 B —— 命令行**

```bash
./setup.sh <router-password> <agent-password>
```

脚本会启用 ADB、构建并推送 Agent、创建启动脚本，并可选配置 SSH 以便无线部署。

### 部署 Agent（后续更新）

```bash
./deploy.sh yourpassword
```

该脚本会构建，经 SSH（端口 2222）把二进制部署到设备，更新启动密码，并重启 Agent。

完成这次一次性引导后，**设置 → Agent 更新**可以检查已签名的稳定版或 Beta 版本，把它们暂存到非活动的 A/B 槽位，并只重启 Agent。60 秒健康试用失败会自动回到上一槽位。在恢复路径于物理 U60 Pro 硬件上验证通过之前，自动安装保持禁用。参见 [OTA 更新](docs/ota-updates.md)。

### eSIM 配置文件（可选）

把 eSIM 卡插入 SIM 卡槽（已用 [9eSIM B1](docs/9esim-b1.md) 测试），Agent 会以内置的 GSMA SGP.22 eSIM 管理器身份自行管理其运营商配置文件（其卡片代码是 [lpac](https://github.com/estkme-group/lpac) 库的 Rust 翻译）；无需安装其他东西（[为何不用 lpac](#为什么内置-esim-管理器而不用-lpac)）：

- **列出**配置文件和卡片详情（EID、固件、可用空间）。
- **切换**当前启用的配置文件。Agent 会校验每一步（卡片 → 调制解调器身份 → 移动数据），并说明切换未完成的原因；它从不自行切回。互联网连接在约 15–45 s 内恢复；Wi‑Fi 保持连接。
- **添加**配置文件：通过运营商的二维码或激活码，在写入任何内容之前预览运营商和配置文件名称，并可取消。
- **重命名**配置文件（昵称），以及**删除**非活动的配置文件。
- **运营商回执：** 卡片的添加、切换和删除通知会在数据可用后、变更完成后立即逐条发送到运营商服务器，并在路由器有移动数据时重试。
- **安全措施：**
  - 同一时间只执行一个 eSIM 操作；
  - 任何变更之前都会确认仍是同一张卡；
  - 开启飞行模式时不允许切换；
  - 仅在有移动数据时允许下载。
  - 运营商服务器通过 TLS 访问，并按卡片所信任的 GSMA eSIM 根证书校验。

切换、添加、重命名和删除都需要 Agent 密码。在 App 中：路由 → eSIM 配置文件。在路由器上做诊断时，`/data/zte-agent esim-native chip info`（或 `profile list`）会打印一条卡片命令的结果；它不等待任何东西，在 Agent 占用卡片时返回 busy。API 与行为：[`zte-agent/docs/esim.md`](zte-agent/docs/esim.md)。旧版本留在 `/data/lpac` 中的 lpac 包已不再使用，可以删除。

### 连接手机 App

1. 把手机连接到路由器的 WiFi
2. 打开 OpenU60 App
3. 设置 Agent 地址：`http://192.168.0.1:9090`
4. 输入上面设置的 Agent 密码
5. 没有 App？改用浏览器打开 http://192.168.0.1:9090/（见 [Web UI](#web-ui)）。

## Web UI

连接到路由器的 Wi-Fi 或 USB 网络，打开 **http://192.168.0.1:9090/**。用 Agent 密码（其启动脚本中的 `ZTE_AGENT_PASSWORD`）登录。同一个响应式控制台可在手机、平板和台式机上使用。旧的 `/ui/` 书签会重定向到对应的控制台屏幕；旧的页面、表单和实时流路由已退役。

五个区域是仪表盘、网络、短信、工具和设置。它们涵盖实时连接与载波聚合、IPv4/IPv6、已连接设备、Wi-Fi/移动网络/APN 设置、eSIM 管理、短信与转发、网络运营商、电池/电源详情、诊断、LAN/DHCP、防火墙/DMZ/UPnP、端口转发、QoS 和设备控制。数据变更经 SSE 推送。需要 JavaScript；控制台自带脚本、样式和字体，不依赖云服务。

登录令牌保存在本标签页的会话存储中；浏览器存储不可用时回退到内存。导航和重新加载会保留它；锁定、过期或 Agent 重启后需要重新登录。主题偏好与令牌相互独立。

### 安装为 App

打开**设置 → HTTPS 与安装**以启用 HTTPS、续期证书或重置路由器的本地证书颁发机构。该屏幕显示路由器时钟、到期时间、公开证书指纹和 HTTPS 地址。启用或续期需要确认；重置需要输入 `RESET`，并会停止已打开的 HTTPS 连接。之后请重新打开 HTTP 地址。

1. 打开 HTTPS。9090 端口的 HTTP 仍然可用；HTTPS 通常使用 9443 端口。
2. 从该屏幕下载公开证书/描述文件。将其指纹与可信副本比对：可在已信任该路由器的设备上通过 HTTPS 打开此屏幕，或经 SSH 执行 `sha256sum /data/zte-agent-tls/ca.crt`。明文 HTTP 可能被网络中的其他人篡改。
3. 按屏幕上显示的对应平台说明信任该路由器证书颁发机构，然后打开列出的 HTTPS 地址。使用 Safari 的“添加到主屏幕/添加到程序坞”，或浏览器的安装选项。

该证书颁发机构仅限于本路由器的局域网地址和本地名称；私钥永不提供。旧版已安装的快捷方式保留其应用标识，但会启动 `/console/`。使用私有 DNS、浏览器 DNS-over-HTTPS 或 VPN 的设备可能需要使用列出的局域网地址，而不是 `u60.home.arpa`。

### 安全

使用 HTTPS 加密浏览器流量。明文 HTTP 会把凭据和持有者令牌暴露给任何能观察局域网的人。绝不要把 9090 端口转发到互联网；远程访问请使用 Tailscale。

控制台使用已认证的 JSON API、其 Host/Origin 校验、限流登录和基于启动时钟的令牌过期。HTML 和脚本不会被缓存存储。旧 Cookie 无法通过 API 请求认证，已退役的 `/ui/` 表单也无法修改设置。参见 [SECURITY.md](SECURITY.md) 和[控制台开发者指南](zte-agent/docs/responsive-console.md)。

需要手机能力的特性仍由原生 App 提供，例如 iOS 实时活动、定位、通话，以及客户端局域网测速或配置文件工具。

## 项目结构

```
u60-Pro-rs/
├── zte-agent/                 On-device agent: REST API + browser UI (port 9090)
│   ├── build.rs               Console icons and archived fixture asset preparation
│   ├── docs/                  esim.md, events.md, live-activity.md, web-ui.md
│   └── src/
│       ├── main.rs            Entry point: event bus, background services, listener
│       ├── server.rs          /api route table, auth precheck, slow/general lanes
│       ├── handlers.rs, *_ext.rs, sms.rs, sim.rs, ...   Endpoint handlers (ubus, AT, sysfs)
│       ├── httpd/             HTTP listener: axum on hyper http1, one tokio thread, blocking-work gate
│       ├── auth/              Bearer tokens, browser sessions, login rate limit (boot clock)
│       ├── events/            Event hub, demand-driven sampler, GET /api/events (SSE)
│       ├── web/               Retired renderers/shared security helpers and archived regression fixtures
│       │   └── assets/        app.css, vendored Datastar 1.0.4
│       └── esim*.rs, stk/, tailscale/, doh/, ...
├── euicc/                     eSIM card library (Rust translation of lpac's libeuicc, LGPL-2.1)
│
├── web/                       Landing page, docs and browser installer (open-u60-pro.vercel.app)
│   ├── src/
│   │   ├── app/               Next.js app router (page, layout, globals)
│   │   ├── components/        Landing sections, UI primitives
│   │   └── data/              Feature data, API endpoints, device specs
│   └── public/                Static assets (images, icons)
│
└── mobile/                    Native companion apps
    ├── README.md              Mobile apps documentation
    ├── ios/OpenU60/           SwiftUI app
    │   ├── Core/              Networking, crypto, models
    │   ├── Features/
    │   │   ├── BandLock/      Band locking
    │   │   ├── Call/          Voice calls
    │   │   ├── Clients/       Connected devices
    │   │   ├── Config/        Config backup/restore
    │   │   ├── Dashboard/     Signal cards, WiFi card, status
    │   │   ├── DeviceInfo/    Hardware + firmware info
    │   │   ├── Login/         Auth + keychain
    │   │   ├── RouterSettings/
    │   │   │   ├── APN/       APN profile management
    │   │   │   ├── CellLock/  Cell locking
    │   │   │   ├── Device/    Reboot, USB, battery, charge policy
    │   │   │   ├── DNS/       DNS settings
    │   │   │   ├── Firewall/  Firewall rules
    │   │   │   ├── LAN/       DHCP settings
    │   │   │   ├── MobileNetwork/  Network mode, SA/NSA
    │   │   │   ├── NetworkMode/    Network selection
    │   │   │   ├── QoS/       Traffic shaping
    │   │   │   ├── Schedule/  Scheduled reboot/wifi
    │   │   │   ├── SignalDetect/   Signal quality detection
    │   │   │   ├── SIM/       SIM card PIN/PUK management
    │   │   │   │   └── STK/   SIM Toolkit & USSD
    │   │   │   ├── STC/       Smart Tower Connect
    │   │   │   ├── Telemetry/ Telemetry blocking
    │   │   │   ├── VPN/       VPN settings
    │   │   │   └── WiFi/      WiFi configuration
    │   │   ├── Scheduler/     Scheduled/recurring jobs
    │   │   ├── Settings/      App settings
    │   │   ├── Signal/        Signal monitor
    │   │   ├── SMS/           SMS compose/read/conversations
    │   │   ├── Tools/         Band lock, clients, config, etc.
    │   │   └── USBMode/       USB mode detection/switching
    │   └── Navigation/        5-tab bar (Dashboard, SMS, Tools, Router, Settings)
    └── android/OpenU60/       Jetpack Compose app
        ├── core/              Network, crypto, models, DI
        ├── feature/           bandlock, clients, config, dashboard,
        │                      deviceinfo, login, router, scheduler,
        │                      settings, signal, sms, tools, usb
        └── navigation/        NavHost + bottom bar
```

## 信号阈值

| 指标 | 优秀 | 良好 | 一般 | 较差 |
|---|---|---|---|---|
| **RSRP** (dBm) | >= -80 | >= -100 | >= -110 | < -110 |
| **SINR** (dB) | >= 20 | >= 10 | >= 0 | < 0 |
| **RSRQ** (dB) | >= -10 | >= -15 | >= -20 | < -20 |

## iOS 实时活动

在 iPhone 锁定屏幕和灵动岛中显示调制解调器的信号。布局会自适应 LTE、LTE 载波聚合（4G+）和 5G，显示信号格、RSRP、SINR 和采样时间。读数描述的是调制解调器的蜂窝连接。

<p align="center">
  <img src="mobile/ios/screenshots/live-activity-lock-screen.png" alt="OpenU60 锁定屏幕实时活动，显示 4G+ LTE 载波聚合、-72 dBm RSRP、9 dB SINR 和 12 秒的采样时间" width="430">
</p>

### 启用该功能

1. **准备 Apple 签名。** 使用你自己的 Apple Developer 团队、一个启用推送通知的显式 App bundle ID、匹配的描述文件，以及 APNs 认证密钥（`AuthKey_<KEY_ID>.p8`）。在 [project.yml](mobile/ios/OpenU60/project.yml) 中更新 App 与扩展的 bundle ID/签名。ActivityKit 管理器、实时活动扩展和 Live Activities 的 Info.plist 标记均已包含。当前 iOS 工程最低支持 iOS 17。
2. **配置调制解调器。** 把你的 `.p8` 和编辑好的[示例配置](zte-agent/config/live-activity.example.json)复制到 `/data/zte-agent-apns/`。将 `enabled` 设为 `true`，填写你的 Team ID、Key ID、宿主 App 的 bundle ID 和密钥路径。让 `environment` 与安装的构建匹配：开发用 `sandbox`，TestFlight/App Store 用 `production`。保持该目录所有者为 root、权限 `700`，两个文件权限 `600`。
3. **启用 Agent 发送端。** 保留现有密码和启动设置，把以下环境变量加入 Agent 启动脚本，并只重启 `zte-agent` 以加载配置：

   ```sh
   export ZTE_AGENT_LIVE_ACTIVITY_CONFIG=/data/zte-agent-apns/live-activity.private.json
   ```

4. **在 iPhone 上启动。** 安装你签名的 App，连接调制解调器，登录，然后点**仪表盘 → 实时信号 → 开始**。在 iPhone 设置中允许实时活动。锁定手机即可看到卡片，或在支持的 iPhone 上展开灵动岛。在 App 中点击**停止**结束会话。

调制解调器直接向 Apple 推送通知服务（APNs）发送，不需要托管后端。调制解调器和 iPhone 都需要联网才能收到推送更新。请勿把私钥放进 Git 或 App 包；自行部署的开发者使用自己的凭据。文件准备、签名和配置细节见[完整安装与 API 指南](zte-agent/docs/live-activity.md)。

### 新鲜度与恢复

- 默认发送间隔为 **15 秒**，读数超过 **30 秒**即标记为过期。推送由 Apple 控制，因此这不是有保证的刷新率。当新采样的更新到达手机时，采样时间应当重置。
- 会话持续**一小时**。目前 Agent 只保留**一个注册**；在另一台手机上启动活动会替换它。Agent 重启会清除该注册；重新打开 App 即可再次注册，必要时也可以用停止/开始。
- SIM 移除/就绪和 WAN 事件会触发 Agent 恢复。它在恢复投递之前验证互联网访问和 UTC，并保留未过期的注册。
- **Apple accepted an update** 只表示提交成功，不代表手机已收到。在换卡后的实机测试中，Agent 发送已恢复，但 iPhone 一直显示过期数据，直到把 Wi-Fi 关开一次。若遇到这种情况，请重连 iPhone 的 Wi-Fi 并检查采样时间。手机侧的完全自动恢复尚未验证；参见[换卡测试结论](zte-agent/docs/sim-swap-ubus-2026-09-15.md)。

## 许可与免责声明

本项目基于 [MIT 许可证](LICENSE) 发布，但以下部分除外：

- `euicc/`（链接进 zte-agent 的 eSIM 卡片库）是 [lpac](https://github.com/estkme-group/lpac) libeuicc 的 Rust 翻译，仍按 **LGPL-2.1-only** 发布（[`euicc/LICENSE`](euicc/LICENSE)）。

[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) 列出了 zte-agent 二进制包含的所有内容，并随每个版本发布。

**免责声明：** 本软件按“原样”提供，不附带任何形式的担保。使用风险自负。作者不对设备损坏、保修失效或因使用本软件产生的其他后果负责。

- **与中兴通讯（ZTE）无隶属关系。** 这是一个独立的社区项目。
- 仅用于你个人拥有的设备。
- 逆向工程仅出于互操作与教育目的。
- 加密密钥和协议细节来自公开的社区研究。
- 本仓库不包含任何中兴的专有源代码。
