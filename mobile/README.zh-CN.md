> 本文档为 [原文](README.md) 的中文翻译，如与英文原文有出入以英文原文为准。

# OpenU60 — 面向 ZTE U60 Pro（MU5250）的手机 App

ZTE U60 Pro 5G 移动路由器的原生伴侣 App。经 Wi-Fi 连接路由器上运行的 `zte-agent` REST API，无需 ADB。

## 功能

| 功能 | 状态 | 说明 |
|---|---|---|
| 信号监控 | 完整 | 实时 NR 5G / LTE / WCDMA 指标，阈值带颜色区分 |
| RSRP 历史图表 | 完整 | 可滚动图表，按时间跟踪信号强度 |
| 电池与温度 | 完整 | 电量百分比、温度、CPU 温度、充电策略 |
| 流量统计 | 完整 | 实时下行/上行速率（Mbps）、累计传输字节数 |
| 已连接设备 | 完整 | 通过主机提示 + DHCP 补充得到 MAC、主机名、IPv4/IPv6 |
| 设备信息 | 完整 | SIM（ICCID、IMSI、MSISDN）、IMEI、WAN/LAN IP |
| 频段锁定/解锁 | 完整 | 锁定 NR5G NSA/SA 和 LTE 频段，或全部解锁 |
| 小区锁定 | 完整 | 按 PCI/EARFCN 锁定到特定 NR/LTE 小区 |
| STC 小区锁定 | 完整 | 智能流量控制的小区锁定 |
| 信号检测 | 完整 | 带进度跟踪的信号质量测量 |
| WiFi 设置 | 完整 | SSID、密码、信道、带宽、发射功率、WiFi 6 |
| 访客 WiFi | 完整 | 访客网络启用/停用、SSID、定时器 |
| 短信 | 完整 | 读取、发送、删除短信；标记为已读 |
| SIM 管理 | 完整 | PIN 校验/修改/启用/停用，PUK 解锁，SIM 解锁 |
| eSIM 配置文件 | 列出、切换、新增、重命名、删除 | 路由器中 eSIM 卡（如 9eSIM B1）上的配置文件：扫描/导入/粘贴激活码，预览并确认安装，按路由器校验的进度切换（SIM 重载 → 网络 → 已连接，或说明为何中断），重命名，删除非活动配置文件，运营商回执支持“立即发送”，卡片标识符与容量做掩码显示。由 Agent 自行管理卡片；见 [zte-agent/docs/esim.md](../zte-agent/docs/esim.md) |
| 移动网络 | 完整 | 数据开关、飞行模式、网络扫描、手动注册 |
| 网络模式 | 完整 | 自动/手动网络选择 |
| APN 设置 | 完整 | 自动/手动 APN 模式，新增/编辑/删除/激活配置文件 |
| DNS 设置 | 完整 | 自定义 DNS 配置 |
| LAN 设置 | 完整 | LAN IP/DHCP 配置 |
| 防火墙 | 完整 | 开关、级别、NAT、DMZ、UPnP、端口转发、过滤规则 |
| VPN 透传 | 完整 | VPN 透传开关 |
| QoS | 完整 | 服务质量开关 |
| 遥测拦截 | 完整 | 用于拦截遥测的域名过滤规则 |
| 定时重启 | 完整 | 自动重启计划 |
| 设备控制 | 完整 | 重启、恢复出厂设置、供电模式、节能模式、快速启动 |
| USB 模式 | 完整 | USB 模式切换、移动电源模式 |
| 语音通话 | 完整 | 通过 AT 命令拨号、接听、挂断、DTMF、静音 |
| USSD | 完整 | 发送/回复/取消 USSD 会话 |
| STK 菜单 | 完整 | 浏览 SIM 工具箱菜单 |
| 启用 ADB | 完整 | 通过 Wi-Fi 一键开启 USB 调试模式 |
| 配置解密/加密 | 完整 | 导入 .bin、自动检测密钥、浏览 XML、重新加密、导出 |

## 架构

- **模式**：MVVM
- **传输**：HTTP 调用 `zte-agent` REST API（`http://<router>:9090/api/...`）
- **认证**：基于令牌（密码 → 持有者令牌）

iOS App 与 `zte-agent` 通信，后者是部署在路由器上的轻量 Rust HTTP 服务器。Agent 暴露专用的类型化 REST 端点，这些端点在内部调用路由器的 ubus 子系统并返回 JSON 响应。

## iOS App

**路径**：`ios/OpenU60/`

### 环境要求

- iOS 17.0+
- 推荐 Xcode 26.6（包含 Swift 6.3 和 iOS 26.5 SDK）
- XcodeGen 2.46.0（`brew install xcodegen`）
- Swift 5 语言模式；编译器版本由 Xcode 提供
- 无外部依赖（仅使用 Apple 框架）

### 技术栈

| 组件 | 实现 |
|---|---|
| UI | SwiftUI |
| HTTP | URLSession |
| 图表 | Swift Charts |
| 安全存储 | Keychain Services |
| 配置加解密 | CommonCrypto（AES-128-ECB、AES-256-CBC） |
| 压缩 | Compression framework（zlib） |
| 密钥派生 | CryptoKit（Insecure.MD5） |

### 项目结构

```
ios/OpenU60/
├── OpenU60App.swift                  App entry point
├── Core/
│   ├── Networking/
│   │   ├── AgentClient.swift              REST client (getJSON/postJSON/putJSON)
│   │   ├── AgentError.swift               Error types
│   │   └── AuthManager.swift              Token auth, Keychain helper
│   ├── Components/
│   │   └── WiFiQRGenerator.swift          WiFi QR code generation
│   ├── Crypto/
│   │   ├── ZTEConfigCrypto.swift          AES-ECB/CBC, header parsing, key derivation
│   │   └── ZTECompression.swift           ZLIB plain/chunked/raw decompress + compress
│   ├── Models/
│   │   ├── SignalModels.swift             NRSignal, LTESignal, WCDMASignal, OperatorInfo
│   │   ├── DeviceModels.swift             Battery, Thermal, Traffic, ConnectedDevice
│   │   ├── RouterSettingsModels.swift     Firewall, DNS, LAN, APN, etc.
│   │   ├── BandModels.swift               BandConfig
│   │   └── ConfigModels.swift             ConfigHeader, PayloadType, known keys table
│   └── Extensions/
│       └── ColorExtensions.swift          RSRP/SINR color thresholds
├── Features/
│   ├── Dashboard/                         Summary cards (signal, battery, speed, WiFi, devices)
│   ├── Signal/                            Live NR/LTE/WCDMA panels + RSRP chart
│   ├── BandLock/                          NR/LTE band selection grid, lock/unlock
│   ├── SMS/                               Conversations, send/delete, mark read
│   ├── Call/                              Voice calls, DTMF, mute
│   ├── DeviceInfo/                        SIM, IMEI, WAN/LAN IPs
│   ├── Clients/                           Connected devices list
│   ├── Config/                            Import, decrypt, XML browser, re-encrypt, export
│   ├── USBMode/                           USB mode switching, powerbank
│   ├── RouterSettings/                    All router configuration screens
│   │   ├── APN/                           APN profiles management
│   │   ├── CellLock/                      Cell lock by PCI/EARFCN
│   │   ├── DNS/                           DNS settings
│   │   ├── Device/                        Reboot, reset, power modes
│   │   ├── Firewall/                      Firewall, NAT, DMZ, port forward
│   │   ├── LAN/                           LAN settings
│   │   ├── MobileNetwork/                 Data, airplane, network scan
│   │   ├── NetworkMode/                   Network selection mode
│   │   ├── QoS/                           Quality of service
│   │   ├── SIM/                           SIM/PIN management, STK
│   │   ├── STC/                           Smart traffic control
│   │   ├── Schedule/                      Scheduled reboot
│   │   ├── SignalDetect/                  Signal quality detection
│   │   ├── Telemetry/                     Telemetry domain filter
│   │   ├── VPN/                           VPN passthrough
│   │   └── WiFi/                          WiFi + guest WiFi settings
│   ├── Tools/                             Tools list, Enable ADB
│   └── Settings/                          Agent URL, password, poll interval, theme
└── Navigation/
    └── TabBarView.swift                   Dashboard | Signal | SMS | Tools | Settings
```

### 搭建步骤

1. 构建 `zte-agent`：`cargo build --release --target aarch64-unknown-linux-musl -p zte-agent`
2. 通过 ADB 或 SCP 部署到路由器（详见根目录 README）
3. 在仓库根目录运行 `cd mobile/ios/OpenU60 && xcodegen generate`
4. 在 Xcode 中打开 `OpenU60.xcodeproj`。仓库中已提交的 `Resources/Info.plist` 已启用对路由器的本地 HTTP 访问。
5. 在真机或模拟器上构建并运行
6. 连接到路由器的 Wi-Fi 并设置 Agent 地址（默认：`http://192.168.0.1:9090`）

## Agent REST API

路由器操作使用 `zte-agent` 上的类型化 REST 端点。主要的路由器端点分组：

| 分组 | 端点 | 说明 |
|---|---|---|
| `/api/network/*` | signal, wan, wan6, lan-status, clients, speeds, rmnet, traffic | 网络状态 |
| `/api/device/*` | thermal, charger, system, battery-info, reboot, factory-reset, power-supply, power-save | 设备信息与控制 |
| `/api/wifi/*` | status, settings, guest | WiFi 配置 |
| `/api/modem/*` | status, online, data, airplane, network-mode, scan/*, register/*, schedule-reboot | 调制解调器控制 |
| `/api/sms/*` | list, capacity, send, delete, read | 短信管理 |
| `/api/sim/*` | info, imei, pin/*, unlock, lock-trials | SIM 管理 |
| `/api/esim/*` | profiles, chip, enable, switch, nickname, delete, download, download/confirm, download/cancel, notifications, notifications/process | 路由器中卡上的 eSIM 配置文件 |
| `/api/cell/*` | lock/*, neighbors/*, band/*, stc/*, signal-detect/* | 小区与频段锁定 |
| `/api/router/*` | dns, lan, firewall/*, vpn, qos, domain-filter, apn/* | 路由器配置 |
| `/api/usb/*` | status, mode, powerbank | USB 管理 |
| `/api/call/*` | dial, hangup, answer, status, dtmf, mute | 语音通话（AT） |
| `/api/ussd/*` | send, respond, cancel | USSD 会话（AT） |
| `/api/stk/*` | menu, select | SIM 工具箱（AT） |
| `/api/battery` | — | 电池（sysfs） |
| `/api/cpu` | — | CPU 使用率 |
| `/api/memory` | — | 内存信息 |

### 认证

1. 启动 Agent 时设置 `ZTE_AGENT_PASSWORD` 环境变量
2. 用 `{"password": "..."}` 调用 `POST /api/auth/login` → 获得持有者令牌
3. 在后续所有请求中带上 `Authorization: Bearer <token>`
4. 令牌为 64 个十六进制字符，1 h 未使用即过期（最长 24 h），并在 32 次更新的登录后可能被挤出。遇到 401 时重新登录一次；遇到 429 时等待 `Retry-After` 秒；遇到 `503 agent busy, retry` 时按 `Retry-After` 重试。实时更新：[events.md](../zte-agent/docs/events.md)。
5. 未设置 Agent 密码时，API 只应答发往 IP 地址、路由器上 `ZTE_AGENT_UI_HOSTS` 列出的名称，或（经 Tailscale 时）路由器 Tailscale 名称的请求；其他主机名会得到 `403 host not allowed`。

## 信号颜色阈值

| 指标 | 绿色 | 黄色 | 橙色 | 红色 |
|---|---|---|---|---|
| RSRP (dBm) | >= -80 | >= -100 | >= -110 | < -110 |
| SINR (dB) | >= 20 | >= 10 | >= 0 | < 0 |

## 配置解密/加密

App 可以解密并重新加密中兴路由器的配置备份文件（`.bin`）：

- **文件头**：128 字节，以 `ZXHN` 魔数开头
  - 负载类型位于偏移 4：ECB（0）、CBC（1）、Plain（2）、CBC New（3）
  - 签名位于偏移 8（最多 64 字节，以 null 结尾）
  - 负载偏移位于偏移 72（4 字节大端）
- **加密**：AES-128-ECB（16 字节密钥）或 AES-256-CBC（32 字节密钥，负载前 16 字节为 IV）
- **压缩**：ZLIB —— 明文的、分块的（每块带 4 字节大端长度前缀）或原始 deflate
- **密钥判定**：依次尝试 14 个已知静态密钥 + MD5(serial)[:16] + MD5(signature)[:16]

## 与 zte-agent 的关系

手机 App 连接部署在路由器上的轻量 Rust HTTP 服务器 `zte-agent`。Agent 直接运行在设备上，通过类型化 REST 端点暴露路由器功能。手机无法直接访问 ubus/AT/sysfs；B1 连接层另外使用原生蓝牙访问卡片。

## 许可证

与父项目相同。
