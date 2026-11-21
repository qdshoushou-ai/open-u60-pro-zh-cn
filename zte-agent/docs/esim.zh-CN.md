> 本文档为 [原文](esim.md) 的中文翻译，如与英文原文有出入以英文原文为准。

# eSIM 配置文件

Agent 管理路由器 SIM 卡槽中 eSIM 卡（例如 9eSIM B1）上的配置文件：列出、切换当前启用的配置文件、通过激活码（运营商的二维码）下载新的配置文件、重命名和删除。它本身就是进程内的 GSMA SGP.22 LPA：卡片命令经调制解调器的 QMI UIM 服务（QMI over QRTR）发送，下载和回执使用路由器自身连接的 HTTPS。除 Agent 外无需安装任何东西。不使用 SIM 工具箱菜单。

| 部分 | 位置 | 许可 |
|---|---|---|
| 卡片命令、通知、卡片信息、配置文件下载（ES10b/c、ES8+ 元数据、ES9+） | [`euicc/`](../../euicc/)，[lpac](https://github.com/estkme-group/lpac) libeuicc 的 Rust 翻译 | LGPL-2.1-only |
| QMI UIM over QRTR（打开/关闭逻辑通道、发送 APDU；不使用 libqmi） | `zte-agent/src/qrtr_uim.rs`，基于 lpac 的 MIT QRTR 驱动 | MIT |
| 卡片命令与回执，采用 lpac 的命令与结果格式 | `zte-agent/src/esim_native.rs` | MIT |
| 配置文件下载流程（SGP.22） | `zte-agent/src/esim_download.rs` | MIT |

| 变量 | 默认值 | 含义 |
|---|---|---|
| `ZTE_AGENT_ESIM_QRTR_NODE` | `3` | 调制解调器 UIM 服务的 QRTR 节点（`qrtr-lookup`，服务 11） |
| `ZTE_AGENT_ESIM_UIM_SLOT` | `1` | SIM 卡槽 |
| `ZTE_AGENT_ESIM_LOCK` | `/tmp/esim.lock` | 与 `zte-agent esim-native` 运行共享的锁文件 |

在 2026-10-19 之前，Agent 自身运行 lpac——`/data/lpac` 中单独构建的包。进程内代码在达到与 lpac 相同的结果（见下文）后取代了它。该包的构建配方 `lpac-qrtr-build/` 保留在 git 历史中。

## 工作原理

- **结果与 lpac 相同。** 命令、数据和错误保持 lpac 的名称与结构，因此 lpac 被替换后界面和 App 无需改动。错误原因使用 SGP.22 的结果名（`catBusy`、`profileNotInDisabledState`……）。在相同的脚本化卡片和服务器上，一次下载发送的卡片命令和 HTTPS 请求与 lpac 逐字节相同。
- **下载取消原因。** lpac 对每次停止都发送 endUserRejection；Agent 使用 SGP.22 的原因：

  | 事件 | 发送的原因 |
  |---|---|
  | 预览被拒绝 | endUserRejection |
  | 预览在 2 分钟内未得到答复 | timeout |
  | 取消 | postponed（运营商保持二维码可用） |
  | 网络或 HTTP 失败 | timeout |
  | 服务器报告的失败 | 只取消卡片会话（服务器端已结束） |
  | 安装被中断 | loadBppExecutionError |

  卡片在安装期间报告的失败不需要取消：其安装结果会作为回执发送给运营商。
- **取消时机。** 取消在下一步生效；已经在运行的 ES9+ 请求会在其超时内结束（30 s，配置文件包为 120 s）。安装一旦开始，取消会被拒绝（409）。
- **TLS。** SM-DP+ 服务器出示的 TLS 证书由 GSMA eSIM 根 CI（“GSM Association - RSP2 Root CI1”）签发，任何 Web CA 列表都不包含它。Agent 内嵌该根证书（`zte-agent/certs/`），不信任其他任何证书；它会校验主机名，不跟随重定向，也不使用代理。测试卡用到的所有服务器都通过校验。（上游 lpac 完全不校验这些证书。）
- **时间上限。** 每条卡片命令在工作线程上运行，并有硬性上限（30 s；单条回执 45 s；下载 300 s）；在它完成之前不会有其他操作触碰卡片（共享锁保持占用）。
- **诊断。** `zte-agent esim-native <command>`（`chip info`、`profile list`、`notification list`……）执行一条命令，并以 lpac 的格式打印一行 JSON 结果。它不等待地尝试获取共享锁，因此在 Agent 占用卡片时返回 busy。
- **已验证：** 约 100 万个生成用例比较 Rust 卡片代码与 C 库的结果；实机 `chip info`、`profile list`、`notification list` 与 lpac 完全相同；带回执的切换；一次昵称写入；拒绝原因命名正确；一次被服务器拒绝的下载（未知 matching ID，4 s，卡片会话已取消），以及一次在连接不可达服务器时的取消（在 15 s 连接上限耗尽时生效）。两种情况都没有配置文件或回执发生变化。用已使用过的二维码重新添加已安装的配置文件：服务器发送了预览，并在 Install 之后发送配置文件包；卡片在 `store_metadata` 处以 `install_failed_due_to_iccid_already_exists_on_euicc` 拒绝（15 s，含预览）。失败回执已送达，已安装的副本未受影响，可用内存也未变化。使用 Agent `native-5`（无 lpac）删除并重新添加同一个（已使用的）Klook 配置文件：删除生效，其回执在 2 s 后送达；同一二维码随后再次下载（开始后 4 s 出现预览，安装 15 s，全程 24 s），安装回执已送达，可用内存回到首次安装后的值（934475 字节）。昵称没有保留，因为它与配置文件一起存储。

## API

所有路由都使用 Agent 的持有者认证和 `{ok,data}` / `{ok:false,error}` 信封。Agent 同一时间只执行一条卡片命令（卡片命令上限 30 s，下载 300 s）；在另一条命令运行期间发出的请求会得到 409。启用、删除、下载、重命名和发送回执需要 Agent 密码（否则 403）。`GET /api/esim/profiles` 还会返回 `pending_receipts`。

| 方法 | 路径 | 结果 |
|---|---|---|
| GET | `/api/esim/profiles` | `profiles`：`iccid`、`isdp_aid`、`state`（`enabled`/`disabled`）、`nickname`、`provider`、`name`、`class`，在可切换的配置文件上还有 `switch_warnings`（见切换前检查）；另有 `enabled_iccid`、`observed_at`、`observed_seq`、`generation`、`agent_instance`、`updating`、`stale`、`error`（见切换期间读取）、`manual_apn` |
| GET | `/api/esim/chip` | `eid`、`firmware`、`sgp22_version`、`profile_version`、`free_nvm_bytes`、`free_ram_bytes`、`card_changed` |
| POST | `/api/esim/enable` | 请求体 `{"iccid": "..."}`。返回 `enabled_iccid`、`previous_iccid`、`reconnecting: true`、`generation`。若卡片命令失败或超时，响应带有 `outcome: "unknown"`：切换可能已经发生，见 `/api/esim/switch`。若卡片因忙而拒绝，响应为 202 并带 `retrying: true`，Agent 会持续重试（状态 `card_busy`） |
| GET | `/api/esim/switch` | 上次切换：`state`、`target_iccid`、`previous_iccid`、`generation`、`started_at`、`card_confirmed_at`、`modem_confirmed_at`、`connected_at`、`finished_at`、`note`、`reason`（对 `no_data`：`roaming_off` 或 `data_off`，否则为 null）；`sim_epoch`、`sim_phase`、`agent_instance`（见 SIM 身份事件） |
| POST | `/api/esim/delete` | 请求体 `{"iccid": "..."}`。仅限已停用的配置文件。返回 `deleted_iccid`、`operator_notified` |
| POST | `/api/esim/nickname` | 请求体 `{"iccid": "...", "nickname": "..."}`（最多 64 字节，不含控制字符；空字符串表示清除）。返回 `iccid`、`nickname`、`generation` |
| GET | `/api/esim/notifications` | 卡片上等待发送的运营商回执：`count`、`pending`（`seq`、`operation`、`address`、`iccid`、`attempts`、`last_error`、`gave_up`）、`listed_at`、`last_attempt_at`、`last_sent_at`、`retrying`、`stale` |
| POST | `/api/esim/notifications/process` | 立即在后台发送等待中的回执（202），并重启重试循环，包括已放弃的回执 |
| POST | `/api/esim/qr` | 原始 JPEG 或 PNG 请求体（最大 8 MiB）。读取一个 eSIM 激活二维码并返回 `activation_code`、`confirmation_code_required`。需要 Agent 密码；图片在有界子进程中解码，随后即被丢弃，不会存储或记录日志 |
| POST | `/api/esim/download` | 请求体 `{"activation_code": "LPA:1$...", "confirmation_code": "...", "preview": true}`。启动后台下载；返回 202 和下面的状态 |
| GET | `/api/esim/download` | 状态：`state`（`idle`、`running`、`confirm`、`cancelling`、`done`、`failed`、`cancelled`）、`step`（最近一个进度步骤，使用 lpac 的名称）、`provider`、`name`、`iccid`、`error`、`started_at`、`finished_at` |
| POST | `/api/esim/download/confirm` | 请求体 `{"accept": true}` 或 `false`，仅在 `state` 为 `confirm` 时可用 |
| POST | `/api/esim/download/cancel` | 取消正在运行的下载 |
| DELETE | `/api/esim/download` | 关闭已完成的结果（状态回到 `idle`）；下载运行期间返回 409 |

### 下载

激活码必须符合 SGP.22 形式 `LPA:1$<server>$<matching ID>[$<OID>[$1]]`；末尾的 `1` 表示运营商同时签发了确认码，此时请求必须一并提供。Agent 在后台线程中执行下载。开启预览（默认）时，运营商服务器发送配置文件元数据后即暂停：状态变为 `confirm`，`provider` 和 `name` 已填好，下载等待 `/download/confirm` 的回答。未答复的预览会在 2 分钟后取消。取消会在下载的下一个步骤生效（见上文“取消时机”）。下载得到的配置文件在启用之前处于停用状态。已完成的结果（`done`、`failed`、`cancelled`）保留 10 分钟，之后状态读为 `idle`；Agent 重启时结果也会丢失。

响应式控制台可以在开始下载前上传运营商的二维码图片。它只接受 JPEG 或 PNG，请求体上限 8 MiB，并且只把图片发送给已认证的 U60。异步监听器接收有界请求体时不占用工作许可；解码在慢速通道中由现有的低优先级子进程执行，并受 CPU、内存和 15 秒限制。图片中必须恰好包含一个有效的 eSIM 激活负载。照片在解码后即被丢弃，照片和解出的激活码都不会写入磁盘或日志。

下载或删除成功后，Agent 会发送运营商回执（见[运营商回执](#运营商回执)）。激活码从不记录日志。

### 安全检查

- **卡片身份。** 在启用、删除、下载和重命名之前，Agent 会读取卡片的 EID。若它与已保存列表所属的卡片不同（卡片已被更换），列表会被丢弃，`generation` 增加，请求得到 409 "a different eSIM card is in the slot"。
- **射频。** 调制解调器处于飞行/低功耗模式时（`zte_nwinfo.sys_info.operate_mode` 不是 `ONLINE`），`enable` 会被拒绝（409），除非是无服务策略将其置于该状态：此时切到其他网络就是出路，固件的 SIM 重载会恢复射频。
- **下载。** 路由器没有移动数据连接时拒绝（409）；启动响应包含 `free_nvm_bytes`。
- **共享锁。** 每条卡片命令都会持有 Agent 自己的标志以及对 `/tmp/esim.lock`（`ZTE_AGENT_ESIM_LOCK`）的非阻塞 `flock`。`zte-agent esim-native` 获取同一把锁，因此两者永不重叠；手动运行持锁期间，Agent 回答 "busy"。

### 运营商回执

安装、启用、停用或删除配置文件后，卡片会保留一条发给运营商服务器的 SGP.22 通知，直到它被送达。Agent 逐条独立发送回执（上限 45 s），因此一次失败不会拖住其他回执。Agent 启动后首次成功读取配置文件时会列出这些回执。下载或删除后，Agent 会发送它们。切换后，它在数据连接确认 5 s 后发送，并在 30 s 后再试一次失败的回执（附着后紧接着的请求可能卡住）；未以数据连接结束的切换只列出回执而不发送。失败或挂起的服务器在该轮剩余时间内会被跳过，因此一个不可达的运营商每轮最多占用卡片 45 s。路由器有移动数据时，未发送的回执每 10 分钟重试一次（最多 24 轮）。失败 10 次的回执会以 `gave_up: true` 上报并留在卡片上；它绝不会在未发送的情况下被删除。`POST /api/esim/notifications/process` 会重置尝试计数并再次尝试。

### 切换期间读取

`enable` 之后的数秒内（多数切换为 3–8 s，某次测试约 25 s），调制解调器正在重新加载 SIM，无法选中 eUICC 的管理应用：打开通道（`euicc_init`）会以 QMI 错误 80（`SimFileNotFound`）失败。App 在 14 次切换中有 3 次把它显示为 "Could not read eSIM profiles"。因此 Agent 会：

- 保留最后一次成功的配置文件列表。切换重新加载 SIM 期间，`GET /api/esim/profiles` 用它作答并带 `updating: true`，且不触碰卡片。另一个 eSIM 操作占用卡片时也如此（而不是返回 409）。读取失败时返回最后成功的列表，并带 `stale: true` 和 `error: {kind, message, at}`。`kind` 为 `sim_reloading`（切换后 5 分钟内）、`management_unavailable`、`read_failed`、`busy`（卡片仍被较早的命令占用）或 `not_configured`（`ZTE_AGENT_ESIM_*` 设置无效）。读取成功后即清除该错误；
- 切换后自行重新读取卡片：从 5 s 开始，一旦 `get_sim_info` 报告 SIM 就绪就每 3 s 读取一次，最多 60 s；
- SIM 重新加载期间拒绝启用、删除和下载（409）；
- 为卡片内容或选择的每次变化（`generation`）以及每次 Agent 运行（`agent_instance`，启动时间，单位 ms）编号，使客户端可以丢弃比已显示内容更旧的应答。

`GET /api/esim/switch` 报告校验后的结果。当卡片因忙而拒绝启用时（见下文），`state` 从 `card_busy` 开始，然后依次变为 `reloading` → `card_confirmed`（新的卡片读取显示目标已启用）→ `modem_confirmed`（`get_sim_info` 的 `sim_iccid` 等于目标），最后结束为：

- `connected`（`get_wwaniface` 的 `connect_status` 为 connected）；
- `no_data`（卡片和调制解调器已切换，但 150 s 内没有数据）。固件能显示原因时 `reason` 给出原因：当 SIM 的国家代码与网络的不同（旅行 eSIM）且数据漫游关闭时为 `roaming_off`；当移动数据关闭时为 `data_off`；
- `modem_unconfirmed`（调制解调器保留了旧身份）；
- `card_unconfirmed`（卡片持续 60 s 不可读）；
- `not_applied`（卡片上仍有另一个配置文件处于启用状态；它一直拒绝时 `reason` 为 `card_busy`）。

**卡片忙。** 卡片可能以 SGP.22 的 `catBusy`（5：其 SIM 工具箱处于主动会话）、`undefinedError`（127）或无名称的代码拒绝启用；错误分别读作 `catBusy`、`undefinedError` 和 `unknown result N`。卡片上没有任何变化。Agent 返回 202，报告 `card_busy`，并每 10 s 重试一次、最多 240 s，然后照常校验切换。这段时间内的第二次切换请求会得到 409。

除此之外，Agent 从不重试配置文件切换，也不会自行切回。它现在会在报告 `connected` 之前检查新 CID 的数据通路；仅有固件的 connected 字符串是不够的。见下文“数据交接恢复”。

### 切换

`enable` 只接受存在、已停用且类别为 `operational` 的配置文件。它发送带 refresh 标志的 EnableProfile，使卡片通知调制解调器重新加载 SIM。随后路由器的移动数据会中断，直到调制解调器以新配置文件完成附着（测试中为 20–45 s）；Wi-Fi 和 Agent API 保持可用。固件从其 ICCID 列表中选择 APN。切换后的五分钟内，无服务策略和连接看门狗会把路由器视为忙碌且不采取动作。

ICCID 和 EID 是超出 64 位整数范围的数字字符串：客户端必须把它们当作字符串处理。

### 切换前检查

`GET /api/esim/profiles` 以只读方式提示切换会遇到的问题（Agent 从不修改这些设置）。切换重新加载 SIM 期间（`updating: true`），响应既不含 `switch_warnings` 也不含 `manual_apn`。

- 路由器处于手动 APN 模式时给出 `manual_apn: {name, apn}`，并且每个已停用的 operational 配置文件的 `switch_warnings` 中也会带 `manual_apn`：新配置文件也会拨该 APN（实机观察到：一个旅行配置文件的 `e-ideas`，随后 `gomo.ph`，被带到下一个配置文件）。
- 数据漫游关闭且该配置文件看起来来自另一个国家时，`switch_warnings` 中会出现 `roaming_off`。这是一个启发式判断：它比较 ICCID 中的国家代码（`89` + E.164 国家码；美国发行方的 `8901…` 记为 1，加拿大 `89302…` 记为 302）与已加载的配置文件，以及该配置文件是否在归属地（其 MCC 等于网络的 MCC）。没有注册网络时不会给出 `roaming_off`。当有一个漫游配置文件相邻时，只有同一国家的配置文件会被标记。

`observed_seq` 统计对卡片的成功读取次数。客户端按它而不是 `observed_at` 对同一 `generation` 的列表排序，因为附着后网络设置时间时，路由器时钟会跳变数小时。

### SIM 身份事件

Agent 按 ICCID 跟踪已加载 SIM 的身份，无论变化来自 Agent 自己的切换、卡片菜单还是物理换卡。同一 SIM 的重新加载（低功耗循环、保留配置文件的 refresh）不算变化。每个阶段都会在 Agent 内发布，并通过 `ubus send zte_agent.sim_identity '<payload>'` 提供给其他进程；没有固件守护进程监听它，Agent 自身也不发送固件事件。

| 阶段 | 时机 |
|---|---|
| `leaving` | 固件的 `switch_slot_begin` 或 `sim hot remove`，或 Agent 自己的切换；携带离开的身份 |
| `changed` | 出现 ICCID 不同的就绪 SIM；`epoch` 加一 |
| `online` | 变化之后，出现默认路由、DNS，若 ICCID 变化则有 WAN-up 事件，没有 WAN 脚本在运行且 8 s 内无 WAN 事件（`settled: true`）；或默认路由持续 30 s（`settled: false`）。同一 SIM 回来时 `identity_changed: false` |
| `stalled` | `leaving` 之后 150 s 仍无 `online`；`reason` 为 `sim_not_ready`、`no_wan`、`roaming_off` 或 `data_off`。之后仍可能出现 `online` |

负载：`phase`、`epoch`、`source`（`agent`、`card`、`hotswap` 或 `unknown`）、`generation`（Agent 切换时为该切换的编号）、`plmn`（`515-02`）、`operator`、`iccid_tail`（后 4 位）、`since_leaving_ms`，以及 `identity_changed`/`settled` 或 `reason`。它从不携带完整 ICCID、IMSI、电话号码、IP 地址或 APN。

每个阶段，Agent 都会丢弃缓存的 SIM 和 WAN 值，然后在 `GET /api/network/signal`、`/api/sim/info` 和 `/api/esim/switch` 中以 `sim_epoch`（自 Agent 启动以来的变化计数）、`sim_phase`（首个阶段之前为 `idle`）和 `agent_instance` 显示该阶段。当这三元组变化时，App 会刷新其 SIM 和网络页面。实时活动在 `leaving` 时暂停，并在 `online` 时重新检查连接。空闲时，跟踪器不使用定时器也不执行命令。

## 已测试

已测试卡片的详情、配置和限制：[docs/9esim-b1.md](../../docs/9esim-b1.md)。下列测试直到 Agent `esim-15` 都运行 lpac；进程内实现的结果见[工作原理](#工作原理)。

U60 Pro（B27），9eSIM B1（eUICC 固件 4.2.0，SGP.22 2.2.2），三个运营商配置文件，2026-10-18：

- `chip info` 和 `profile list` 未影响连接（每次约 0.3 s 和 30 ms CPU；lpac 峰值约 10 MB 内存后退出）。
- Smart → GOMO 切换 25 s 后有互联网，GOMO → DITO 为 43 s，各自触发一次固件射频重启，无需重启设备。
- 加入重载处理之后（2026-10-18 21:40）：Smart → DITO，3.5 s 时的列表读取由已保存列表回答（`updating`），卡片和调制解调器在 6.6 s 确认，31 s 时数据可用。DITO → Smart：卡片约 25 s 不可读（后台重读中出现三次 `euicc_init` 失败），3.5 s 和 12.7 s 的读取仍得到已保存列表且无错误，28 s 确认调制解调器，43 s 时数据可用。
- 删除和下载当时只覆盖了拒绝与失败路径：启用的配置文件会被拒绝，向不可解析服务器下载会在 `es9p_initiate_authentication` 失败，向无响应地址下载会在 16 s 内被取消。（2026-10-19 随后进行了真实下载；见下文。）

Agent `esim-8`，2026-10-19：

- **运营商回执。** 切换测试在卡片上留下了 35 条启用/停用回执，对应三个服务器（`glo.prod.ondemandconnectivity.com`、`sci.prod.ondemandconnectivity.com`、`rsp-0001.linksfield.net`）。首次尝试在 TLS 上失败（当时的包尚未信任 GSMA 根证书）。修复后，`POST /api/esim/notifications/process` 在 76 s 内送达全部 35 条（约每条 2 s）；计数归零，重试循环停止。
- **重命名。** 在 DITO 上设置 "Test"、读回并清除均可；每次 `generation` 都增加；65 字节的名称被拒绝。
- **共享锁。** 手动 `flock -n` 持锁期间（当时为 `/tmp/lpac.lock`），`chip` 回答 busy，`profiles` 返回已保存列表（`updating`、`stale`）；释放后 `chip` 恢复正常。
- **下载预检查。** 启动响应带有 `free_nvm_bytes`（971752）；向不可解析服务器下载会安全失败；`DELETE /api/esim/download` 清除了结果。
- **切换后的回执**（Agent `esim-11`，在 App 中切换）。Smart → GOMO：6 s 确认调制解调器，21 s 数据可用。26 s 时 Smart 的停用回执已发送，GOMO 的启用回执立即失败（`SSL connect error`）；60 s 的第二次尝试成功。更早的 DITO → Smart 切换中，第一个请求也失败：挂起直到 45 s 上限。两种情况中，紧随其后的请求都成功，因此附着后的第一个请求不可靠，需要第二次尝试。
- **对真实 SM-DP+ 的下载**（Agent `esim-11`）。在 Globe 服务器（`glo.prod.ondemandconnectivity.com`）上故意使用未知的 matching ID，执行了 `es9p_initiate_authentication`（TLS 校验通过）、`es10b_authenticate_server`（卡片接受服务器的 GSMA 证书链并签名）和 `es9p_authenticate_client`。服务器回答 "The matchingID is not found"；lpac 取消了会话，下载在开始 6 s 后以 `failed` 结束。没有安装任何东西，也没有生成回执。
- **真实下载**（Agent `esim-12`，从 iOS App 发起）。测试使用一个 Klook 旅行 eSIM 的二维码。开始 4 s 后预览显示提供商 "Travel - PHL"、名称 "Klook_app"；用户 9 s 后确认。`es10b_load_bound_profile_package` 耗时 16 s，整个下载耗时 31 s。配置文件以停用状态安装，占用约 36 KB 卡片存储（可用空间 971752 → 934475 字节）。安装回执随后送达运营商（`operator_notified: true`），其他配置文件和当前连接未受影响。在 App 中重命名三个已有配置文件均成功。
- **旅行 eSIM**（Klook，新加坡签发的配置文件，MCC 525，在 Globe 和 Smart 上漫游）。切换在 5 s 到达 `modem_confirmed`，150 s 时以 `no_data` 结束。路由器当时数据漫游关闭，而漫游被阻止时固件还会关闭移动数据（`enable: 0`）。随后 iOS App 保存数据漫游时又把该关闭值重发了一次，因此即使打开漫游，数据仍处于关闭状态；已在 App 中修复，现在会在打开漫游的同时打开移动数据。漫游和移动数据都打开后，该配置文件使用提供商的 APN（`e-ideas`，在 App 中填写）在 3 s 内连接成功，重试循环送达了两条回执。Agent 现在对该情况报告 `reason: roaming_off`。
- **卡片忙**（2026-10-19，Klook 旅行配置文件启用时）。约两分钟内三次切到 DITO 都以 `not_applied` 结束：lpac 报告 `es10c_enable_profile: unknown`，说明卡片返回的代码不在 1–4 之间。约两分钟后的一次启用被接受（`BF31 03 80 01 00`，结果 0）。DITO 的调制解调器身份在 12 s 确认，28 s 时数据可用。当时没有捕获拒绝码。在随后一次从 Klook 切出（切到 GOMO，Agent `esim-14`）时得到确认：打过补丁的 lpac 报告 `es10c_enable_profile: cat busy`（SGP.22 `catBusy`）。Agent 每 10 s 重试一次，第 13 次尝试在首次尝试后 2 分 3 秒被接受。GOMO 的卡片和调制解调器在 5 s 后确认，数据随后可用。两次忙碌期都从首次尝试起持续约两分钟，因此重试窗口设为 240 s。重新安装 Klook 后使用 Agent `native-5`：Smart → Klook 在 63 s 连接（首次漫游附着时网络显示约 55 s 的受限服务），Klook → GOMO 在 131 s 内被 `catBusy` 拒绝 13 次，第 14 次成功，22 s 后数据可用，两条回执均已送达。
- **SIM 身份事件**（Agent `bridge-1`，2026-10-20，从 iOS App 切换）。GOMO → DITO：`leaving`（来源 `agent`）与固件的 `switch_slot_begin` 和 `switch_slot_end` 一起出现（后者首次在实机观察到），5.0 s 后紧接着第二次 "sim ready" 出现 `changed`，44 s 时出现 `online`（`settled: true`），即 `zte_wan6` 和 `zte_wan` 起来后 9 s（IPv6 先起）。每个阶段一个事件。端点上的 `sim_epoch` 在一秒内变化，短信转发把 `ipv6_connected` 计为 WAN 起来，固件自行清除了旧连接。在运行实时活动的情况下 DITO → GOMO：4.7 s 出现 `changed`，31.7 s 出现 `online`；活动先暂停，随后以新的 APNs 连接恢复，并在锁定屏幕上持续更新。两次切换中，附着后的第一条回执都超时并在第二次尝试时发出，附着时网络改时钟使一个 Agent 登录令牌失效（App 会自行重新登录）。空闲时，跟踪器和短信线程在 30 s 内没有唤醒。
- **未在实机覆盖：** 飞行模式拒绝（调制解调器一直保持 ONLINE）和换卡检查（只有一张卡）。

### 数据交接恢复

卡片/调制解调器确认之后，Agent 等待默认 IPv4 或 IPv6 路由和空闲的 WAN 脚本，然后用一个绑定到所选 CID 源地址的新客户端（不使用代理或连接池）向 `https://example.com/` 发起一次简短的 HTTPS HEAD 请求。有效的 TLS/HTTP 响应必须持续成功至少十二秒，切换才会报告 `connected`。检查只在现有的有界切换校验窗口内运行，空闲时不轮询。`network_check` 描述 checking、settling、recovering、ready、unverified 或 failed；`data_recovery_attempted` 记录是否使用了那一次恢复。

如果新数据通路仍无响应，最多允许执行一次正式的 `zwrt_data.set_wwaniface` 断开/重连。数据设置必须在切换前已以自动模式启用且现在仍然启用；已加载的 SIM 和切换 generation 必须仍然匹配。eSIM 操作锁阻止刷新期间的第二次配置文件操作，更新的 Agent 调制解调器命令会取消待执行的恢复。这段短暂的断开/恢复事务与 Agent 的调制解调器命令串行化，因此恢复期间排队的命令会在之后执行并生效。刷新会保留漫游/模式，绝不修改 APN，不重启 Wi-Fi，也绝不会启用在切换前被有意关闭的连接。若断开结果不确定，会在捕获的用户意图仍然有效时执行恢复。运营商故障仍可能导致 `no_data` / `network_unavailable`；这种情况不会作为“数据可用的一次成功切换”上报。

`ZTE_AGENT_ESIM_RECOVERY=0` 会关闭主动检查和数据会话恢复；此时状态只表明数据已配置/未验证。当固件报告移动数据已关闭时，配置文件现在会包含 `data_off` 切换警告。SIM 身份桥接保留其已文档化的路由/身份语义；eSIM 客户端应使用切换进度判断数据通路是否就绪。

在 U60 Pro 上的验证（2026-10-29）：在此改动之前，Smart → DITO 会间歇性地使路由器及转发的 IPv4 HTTPS 流量停滞，即使新的 SIM/APN、WAN 路由和已启用的数据设置都存在。一次正式的移动数据断开/重连恢复了流量；这不能确定固件/运营商层面的内部原因。使用该测试构建时，DITO → Smart 和 Smart → DITO 在稳定检查后都达到已验证就绪。Smart → DITO 在 172 秒内保持可达，Wi-Fi 手机仍处于关联状态。用户还确认，在手机蜂窝数据关闭的情况下，Wi-Fi 手机在 Smart → DITO 之后无需重连 Wi-Fi 即可打开新网站或 App。再次重复 Smart → DITO 以及 GOMO → DITO，也通过了约三分钟的路由器/USB 检查，并确认手机无需重连 Wi-Fi 即可上网。DITO → GOMO 在手机仍关联的情况下通过路由器/USB 检查；该方向没有单独确认手机应用层连通性。这些成功的最终实机运行都不需要自动恢复；它的一次尝试预算、偏好保留和命令顺序已用确定性测试验证。
