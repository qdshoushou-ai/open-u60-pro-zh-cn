> 本文档为 [原文](events.md) 的中文翻译，如与英文原文有出入以英文原文为准。

# 实时更新：`GET /api/events`

面向 App 及其他集成的 JSON Server-Sent Events（SSE）流，使它们不再需要轮询。连接时先发送所请求每个主题的当前值，之后只发送变化。Agent 内部只有一个采样器，为所有已打开的流统一读取没有固件事件的值（信号、流量、电池……），并且仅在有至少一条流需要时才读取。没有打开的流时不采样：没有定时器，也没有命令。

Web UI 的实时页面通过 `/ui/` 下自己的 Cookie 认证流使用同一个事件中心（见 [web-ui.md](web-ui.md)）；页面也可以像 `signal_ms` 那样请求自己的信号节奏（eSIM 配置文件：10 s；其他情况使用“设置 › 轮询”中的浏览器刷新间隔，1–10 s，默认 2 s；最快的流仍然生效）。本页介绍的是 `/api/events`。

## 请求

```
GET /api/events?topics=signal,traffic&signal_ms=2000
Authorization: Bearer <token from POST /api/auth/login>
```

- **认证。** 与所有 `/api` 路由一样使用持有者令牌，且绝不出现在查询字符串中。流需要 Agent 密码（`ZTE_AGENT_PASSWORD`）：没有密码时返回 403，这是在每条路由无密码时都要通过的 Host 检查之后（因此缺失或异域的 `Host` 会先得到 400 `missing host` 或 403 `host not allowed`）。设置密码后，只对浏览器请求（带 `Origin` 或 `Sec-Fetch-Site` 的请求；原生客户端两者都不发送）检查 Host，与所有 `/api` 路由相同：这样 DNS 重绑定页面既无法携带令牌，也无法在登录路由上猜密码。
- **`topics`**（必填）：以逗号分隔的主题名（见下文）。名称周围的空格会被忽略，重复项会合并，`%2C` 等同于逗号。只使用第一个 `topics` 参数。
- **`signal_ms`**（可选）：此客户端期望的信号节奏，1000-10000 ms。有多条流时最快的生效。默认 2000。
- 其他参数会被忽略。

| 状态 | 正文 | 条件 |
|---|---|---|
| 200 | 该流 | |
| 400 | `{"ok":false,"error":"topics required"}` | `topics` 缺失或为空 |
| 400 | `{"ok":false,"error":"unknown topic: <name>"}` | 不是主题的名称（最多显示 32 个字符） |
| 400 | `{"ok":false,"error":"signal_ms must be 1000-10000"}` | |
| 401 | `{"ok":false,"error":"unauthorized"}` | 令牌缺失或无效 |
| 403 | `{"ok":false,"error":"agent password required"}` | Agent 未设置密码 |
| 503 + `Retry-After: 10` | `{"ok":false,"error":"too many event streams"}` | 已经打开了 8 条流（包括打开的 Web UI 实时页面），且没有一条属于该令牌、可被替换 |

## 线格式

`200`、`Content-Type: text/event-stream`、`Cache-Control: no-cache`、分块传输。每个帧要么是标准 SSE 事件（`event:` 加一行 JSON 的 `data:`，然后空行），要么是以 `:` 开头的注释行。

快照紧随 `hello` 之后，按主题顺序（即 `hello.topics` 的顺序）发送。在本例中，流打开时 `signal` 和 `traffic` 尚未读取过，因此快照只包含 `sms`；它们的首个值随后作为变化发送。

```
retry: 3000
event: hello
data: {"v":1,"agent_instance":1729500000000,"topics":["signal","traffic","sms"],"cadence_ms":{"signal":2000,"traffic":1000},"keepalive_ms":15000}

event: sms
data: {"seq":1,"age_ms":5323,"error":null,"data":{"received":0}}

event: signal
data: {"seq":1834,"age_ms":120,"error":null,"data":{…exactly the data of GET /api/network/signal…}}

event: traffic
data: {"seq":1835,"age_ms":40,"error":null,"data":{…exactly the data of GET /api/network/speeds…}}

: keep-alive

event: sms
data: {"seq":1902,"age_ms":0,"error":null,"data":{"received":1}}

event: bye
data: {"reason":"token_expired"}
```

### 帧

| 帧 | 内容 |
|---|---|
| `hello` | 总是第一个。`v`（格式版本，1）、`agent_instance`（标识本次 Agent 运行，仅用于相等比较）、`topics`（已接受的主题，顺序固定）、`cadence_ms`（各采样主题当前的采样周期）、`keepalive_ms`（15000）。携带 `retry: 3000` |
| `<topic>` | `seq`：每次变化递增（所有主题共用一个计数器；只在同一主题内比较）。`age_ms`：此帧对应的读取之后经过的时间，基于路由器的启动时钟（不受墙钟跳变影响）。`error`：`null`，或上次读取失败的原因（此时 `data` 保留上一次成功值；若从未成功则为 `null`；`age_ms` 表示失败读取的时长，而不是 `data` 的年龄）。`data`：值 |
| `: keep-alive` | 每 15 s 一条注释；忽略即可。它也让双方能发现连接已死 |
| `bye` | 最后一帧；随后服务器结束响应。`reason` 见下文 |

没有 `id:` 行，且忽略 `Last-Event-ID`：该流承载的是状态而非日志，因此重连只需以新的快照开始。

### `bye` 原因

| 原因 | 含义 | 应采取的措施 |
|---|---|---|
| `token_expired` | 令牌过期（1 h 未使用，或登录后 24 h） | 重新登录，然后重连 |
| `logged_out` | 令牌被吊销（例如被更新的登录挤出 32 个令牌表） | 重新登录，然后重连 |
| `evicted` | 同一令牌的较新流替换了此流：若请求的主题相同（即重连）则立即替换，否则在成为该令牌的第四条流时替换 | 不要重连：那样会结束该令牌的另一条流，其客户端又会重连（形成循环） |
| `standby` | 路由器进入待机或正在关机（`mode_power_off*`） | 等用户下次打开该屏幕时重连 |
| `lifetime` | 流已打开 30 分钟 | 若屏幕仍可见，立即重连 |

## 主题

`data` 就是所列 GET 路由在相同令牌下返回的 `data`，因此 App 现有的解析器可直接使用。这也包括这些路由本就返回的内容，例如 `GET /api/sim/info` 的完整 ICCID 和 IMSI，以及 `GET /api/esim/switch` 中的 ICCID。没有 Wi-Fi 主题：Wi-Fi 状态读取要执行多条命令，并且会带出 Wi-Fi 密钥。

| 主题 | `data` | 更新时机 |
|---|---|---|
| `signal` | `GET /api/network/signal` | 每 2 s 读取（或按 `signal_ms`），并在服务状态事件后 0.5 s 再读（要等事件之前缓存的读数过期）。每次读取都会发送，即使没有变化（图表数据点） |
| `traffic` | `GET /api/network/speeds`（调制解调器自身的速率） | 每 1 s |
| `battery` | `GET /api/battery` | 每 5 s |
| `health` | `{"cpu": {"cores": [...], "overall": n}, "thermal": GET /api/device/thermal}` | 每 2 s（只读 `/proc` 和 `/sys` 下的文件，不执行命令）。CPU 使用率按距上次读取的时间窗口测量（至少 250 ms：更早的读取，例如流采样期间发生的页面加载，会得到上一次的数值） |
| `clients` | `GET /api/network/clients` | 每 10 s |
| `charger` | `GET /api/device/charger` | 每 10 s，以及在充电器事件和充电上限或 USB 变更之后 |
| `battery_info` | `GET /api/device/battery-info` | 每 30 s，以及在充电器事件之后 |
| `wan` | `{"wan": GET /api/network/wan, "wan6": GET /api/network/wan6}` | 在 WAN 和接口事件以及 SIM 身份阶段之后 |
| `sim` | `GET /api/sim/info` | 在 SIM 卡事件和 SIM 身份阶段之后；通过 API 执行 PIN/PUK 或 SIM 锁定操作以及 eSIM 配置文件切换后，每 2 s 持续 20 s |
| `modem` | `{"status": GET /api/modem/status, "data": GET /api/modem/data}` | 在服务状态事件和 SIM 身份阶段之后；在 WAN 和接口事件以及通过 API 进行的数据或模式变更之后，每 2 s 持续 20 s（数据守护进程会延迟应用变更） |
| `sim_identity` | `zte_agent.sim_identity` 负载加上 `agent_instance`（见 [esim.md 中的 SIM 身份事件](esim.md#sim-identity-event)） | 每个阶段。Agent 启动后的首个阶段之前：`phase` 为 `idle`，`epoch` 取自时间戳，`source`、`plmn`、`operator`、`iccid_tail`、`since_leaving_ms` 均为 `null` |
| `service` | `{"network_type": …}`：`NO_SERVICE`、`LIMITED_SERVICE_LTE`、`LIMITED_SERVICE_SA`、`LTE`、`LTE-NSA`、`ENDC`……若调制解调器未上报则为 `null` | 每个携带 `network_type` 的 `zwrt_servicestatus` 事件。首次订阅时，以及有流订阅且值超过 30 s 未更新时，从调制解调器读取（`nwinfo_get_netinfo`，即 `signal` 背后的那次读取，缓存 0.5 s），以纠正漏掉的事件 |
| `power_state` | `{"action": …, "parameter": … 或 null}`，来自 `zwrt_device_power_state_event`，例如 `mode_power_off` 带 `quicken`（快速启动）或 `normal`、`mode_power_off_quicken`、`mode_power_on` | 每个事件。在 Agent 启动后的首个事件之前不出现 |
| `sms` | `{"received": n}`：Agent 启动以来收到的短信数（启动时为 0） | 每收到一条短信 +1。数值上升时，请获取 `POST /api/sms/list` |
| `esim_switch` | `GET /api/esim/switch` | 切换状态每次变化，以及每个 SIM 身份阶段（时间戳变化） |
| `esim_download` | `GET /api/esim/download` | 每次变化；已完成的结果被遗忘时（10 分钟）再发一次，并在有流订阅且仍保留已完成结果时再次检查 |
| `processes` | `GET /api/system/top` | 每 3 s（只读 `/proc` 下的文件，不执行命令）。每个进程的 CPU 使用率由事件中心自己的跟踪器测量，因此（App 发起的）`GET /api/system/top` 调用不会缩短它的窗口，反之亦然；超过 15 s 未读取后，它会间隔 250 ms 连续采样两次，使第一个数值不是“自上次调用以来”的统计 |
| `usb` | `GET /api/usb/status` | 每 10 s，在充电器和移动电源事件（`BSP_CHARGER_EVENT`、`BSP_POWERBANK_EVENT`）之后，以及通过 API 进行 USB 模式或移动电源变更之后。插入 USB-C 线缆是否会触发充电器事件尚未在设备上验证；无论是否触发，10 s 一次的读取都能覆盖。为仪表盘的 USB-C 卡片提供流；工具 › USB 模式在页面加载时读取一次 |
| `speedtest` | `GET /api/speedtest/progress` | 路由器测速（任何客户端发起的测试）的每次变化：每个阶段、结果和百分比步进（下载期间约每 0.4 s 更新；被观看时最多每 0.5 s 重读一次）。仅存于内存：首次订阅时读取，之后只在变化后读取。Agent 启动后尚未有任何测试时：`phase` 为 `idle` |
| `netscan` | `{"scan": GET /api/modem/scan/status, "register": GET /api/modem/register/result}` | 订阅期间每 2 s（Web UI 的扫描和注册进度页面；App 也每 2 s 轮询相同路由）。读取失败的部分为 `null` |
| `signal_detect` | `{"progress": GET /api/cell/signal-detect/progress, "results": GET /api/cell/signal-detect/results}` | 订阅期间每 2 s（Web UI 的信号检测页面在扫描运行时）。当设备报告扫描进度低于 100 % 时，`results` 为 `null` 且不读取；读取失败的部分为 `null` |
| `stk` | `GET /api/stk/session`（SIM 工具箱工作线程的状态；没有会话时，`error` 是工作线程的最后一个错误，`data` 是上一次成功值） | 该路由回答内容的每次变化：来自 SIM 的命令、一次回复、会话结束或失败（由工作线程告知事件中心；读取本身不改变任何东西）。仅存于内存：首次订阅时读取，之后只在变化后读取；不采样。读取的是工作线程在每次变化时发布的快照（与路由的回答相同，绝不是向工作线程发请求），因此它不会启动工作线程、打开工具包会话（`GET /api/stk/menu` 会）或等待 RIL 套接字，也不会拖住 `hub-fast`。尚未有工作线程时：`error` 为 ""（无会话） |

- 从未读取过的主题不会出现在快照中；一旦读取，其首个值随即发送（通常在 1 秒内）。
- 有流订阅时，若 `wan`、`sim`、`modem` 和 `service` 的值超过 30 s（`charger`、`battery_info` 和 `usb`：10 s），会重新读取。当快照显示了这种旧值（或超过两个周期的采样值）时，即使没有变化也会发送新读取的值，以便 `age_ms` 重新正确。
- 在 `wan`、`modem`、`health`、`netscan` 和 `signal_detect` 中，读取失败的部分为 `null`，`error` 指出第一个失败。
- 事件驱动主题的失败读取会在订阅期间重试，间隔从 5 s 开始翻倍，最长 60 s。包含一个失败部分的读取（例如没有 IPv6 的路由器上的 `wan6`）会重试，直到同一失败重复出现；之后只有下一个事件才会重新读取它。
- 没有变化的值不会重复发送（`signal` 和上述新读取除外）。快速变化会被合并：慢速客户端得到最新值，不会堆积积压。

## 限制

| 限制 | 值 |
|---|---|
| 流数量 | 同时最多 8 条（503 + `Retry-After: 10`），与 Web UI 的实时页面共享：每个打开的实时页面（仪表盘及其详情面板、进程、Wi-Fi 与设备、消息、某个短信会话、工具 › 已连接设备、工具 › 网速测试、扫描运行时的路由 › 信号检测、路由 › SIM 卡、路由 › SIM 服务、路由 › eSIM 配置文件、某个进度页面）各占一条。按令牌：主题与某条已打开流相同的流会立即替换它，第四条会替换最旧的一条（`bye evicted`） |
| 存活期 | 30 分钟，然后 `bye lifetime` |
| 保活 | 每 15 s 一条 `: keep-alive` |
| 令牌 | 打开的流算作使用其令牌（1 h 空闲限制会顺延），但不会超过登录后 24 h |
| 待机 | 每条流都以 `bye standby` 结束；新流仍会被接受（待机期间 Wi-Fi 可能恢复，USB 保持） |
| 死客户端 | 写入失败、数据 60 s 未被确认，或 TCP keepalive 判定失败时结束连接；其采样也随之停止。经 Tailscale 时，Agent 的对端是本地的 `tailscaled`，它会确认所有数据：消失的 tailnet 客户端只有在 `tailscaled` 放弃它、客户端重连（其新流替换旧流）或 30 分钟存活期到达时才会被发现 |
| 连接数 | 总计 64 条，每个局域网地址 16 条。所有 Tailscale 客户端都来自 127.0.0.1：该地址没有按地址的上限，并为它保留最后 8 条连接 |

## 客户端指引

- **为流使用专用的 HTTP 客户端**，不要复用发请求的客户端：不设总（资源）超时，读/空闲超时至少 45 s（keep-alive 的 3 倍）。App 的请求客户端会切断流（iOS 请求 10 s / 资源 15 s 超时，Android `readTimeout` 15 s）。
- **浏览器：** `EventSource` 无法发送 `Authorization` 头，因此无法打开 `/api/events`。请使用带流读取器的 `fetch()`，或原生 SSE 客户端。Agent 不发送 CORS 头，因此其他来源的页面无法读取该流；内置 Web UI 使用自己的 `/ui/live/*` 流。
- **收到 `bye` 后不要自动重连**，`lifetime` 除外：此时若屏幕仍可见，立即重连。遇到 `token_expired` 或 `logged_out` 先登录；遇到 `standby` 等用户下次打开屏幕时再重连；遇到 `evicted` 保持断开。遇到未知原因时按 `logged_out` 处理。
- **遇到网络错误**（连接未以 `bye` 结束就断开）时，用相同主题重连，退避从 3 s 开始（`retry: 3000`），逐次翻倍，最长约一分钟：新流会替换旧流，Agent 可能尚未察觉旧流已消失。遇到 503 时等待 `Retry-After`。遇到 401（例如 Agent 重启后）时先登录再重连。遇到 403 `agent password required` 时不要重试。
- **每个令牌的每组主题只保留一条流。** 主题相同的第二条流会结束第一条（`bye evicted`）；请把同一个屏幕所需的内容合并到一条流中。
- **每次（重）连接时**用快照替换本地状态。若 `hello.agent_instance` 与上次所见不同，说明 Agent 已重启：丢弃从它缓存的一切（包括令牌）。
- 按 `event:` 名称解析帧，忽略不认识的名称和注释；后续可能新增主题和字段。
- 当需要它的屏幕不可见时关闭流：路由器随即停止采样。

示例：

```sh
curl -N -H "Authorization: Bearer $TOKEN" 'http://192.168.0.1:9090/api/events?topics=signal,traffic,sms'
```

## 路由器上的开销

没有打开的流时：零。采样器的两个线程（`hub-fast` 负责 `/proc` 和 `/sys` 下的文件以及内存状态，`hub-ubus` 负责要执行 `ubus` 的读取）无超时地等待。服务状态、电源、短信和 SIM 身份事件在事件总线自己的线程（`event-bus`）上记录，该线程本来就会为 Agent 其他部分接收这些事件：不增加线程，每个电源状态事件（电源键待机或唤醒）最多一次唤醒。流打开期间，每个值对所有流只读取一次；仪表盘（流量、信号、客户端、充电器、电池信息、USB）约每分钟 122 条命令，信号页约 36 条，而 iOS App 轮询约 190 条。执行命令的读取从不会拖慢不执行命令的读取。
