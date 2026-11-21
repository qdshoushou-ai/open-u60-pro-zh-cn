export interface APICategory {
  name: string;
  count: number;
  capabilities: string;
  endpoints?: APIEndpoint[];
}

export interface APIEndpoint {
  method: string;
  path: string;
  description: string;
}

export const apiCategories: APICategory[] = [
  {
    name: "认证",
    count: 1,
    capabilities: "基于令牌的认证",
    endpoints: [
      { method: "POST", path: "/api/auth/login", description: "认证并获取会话令牌" },
    ],
  },
  {
    name: "设备",
    count: 16,
    capabilities:
      "系统信息、电池、CPU、内存、温度、充电器、充电控制、重启、恢复出厂设置、节能模式、快速启动",
    endpoints: [
      { method: "GET", path: "/api/device", description: "系统信息（sysfs）" },
      { method: "GET", path: "/api/battery", description: "电池状态与电量百分比" },
      { method: "GET", path: "/api/cpu", description: "CPU 使用率与频率" },
      { method: "GET", path: "/api/memory", description: "内存使用统计" },
      { method: "GET", path: "/api/device/battery-info", description: "电池详情（ubus）" },
      { method: "GET", path: "/api/device/thermal", description: "温度传感器" },
      { method: "GET", path: "/api/device/charger", description: "充电器状态" },
      { method: "GET", path: "/api/device/system", description: "系统详情（ubus）" },
      { method: "POST", path: "/api/device/reboot", description: "重启设备" },
      { method: "POST", path: "/api/device/factory-reset", description: "恢复出厂设置" },
      { method: "GET", path: "/api/device/charge-control", description: "充电上限状态" },
      { method: "PUT", path: "/api/device/charge-control", description: "设置充电上限" },
      { method: "POST", path: "/api/device/power-save", description: "节能模式状态" },
      { method: "PUT", path: "/api/device/power-save", description: "切换节能模式" },
      { method: "GET", path: "/api/device/fast-boot", description: "快速启动状态" },
      { method: "PUT", path: "/api/device/fast-boot", description: "切换快速启动" },
    ],
  },
  {
    name: "网络",
    count: 9,
    capabilities:
      "信号强度（RSRP/SINR/RSRQ）、速率、流量统计、WAN/LAN 状态、rmnet、已连接客户端",
    endpoints: [
      { method: "GET", path: "/api/network/signal", description: "信号强度指标" },
      { method: "GET", path: "/api/network/traffic", description: "流量统计" },
      { method: "GET", path: "/api/network/speed", description: "当前速率" },
      { method: "GET", path: "/api/network/wan", description: "WAN IPv4 状态" },
      { method: "GET", path: "/api/network/wan6", description: "WAN IPv6 状态" },
      { method: "GET", path: "/api/network/lan-status", description: "LAN 状态" },
      { method: "GET", path: "/api/network/clients", description: "已连接客户端" },
      { method: "GET", path: "/api/network/speeds", description: "速率历史" },
      { method: "GET", path: "/api/network/rmnet", description: "rmnet 接口信息" },
    ],
  },
  {
    name: "调制解调器",
    count: 12,
    capabilities:
      "飞行模式、移动数据开关、网络模式（2G–5G）、运营商扫描、手动注册",
    endpoints: [
      { method: "GET", path: "/api/data-usage", description: "流量使用统计" },
      { method: "GET", path: "/api/modem/status", description: "调制解调器状态" },
      { method: "POST", path: "/api/modem/online", description: "上线/下线" },
      { method: "GET", path: "/api/modem/data", description: "移动数据状态" },
      { method: "PUT", path: "/api/modem/data", description: "切换移动数据" },
      { method: "POST", path: "/api/modem/airplane", description: "切换飞行模式" },
      { method: "PUT", path: "/api/modem/network-mode", description: "设置网络模式（2G–5G）" },
      { method: "POST", path: "/api/modem/scan", description: "开始运营商扫描" },
      { method: "GET", path: "/api/modem/scan/status", description: "运营商扫描状态" },
      { method: "GET", path: "/api/modem/scan/results", description: "运营商扫描结果" },
      { method: "POST", path: "/api/modem/register", description: "手动网络注册" },
      { method: "GET", path: "/api/modem/register/result", description: "注册结果" },
    ],
  },
  {
    name: "短信",
    count: 14,
    capabilities:
      "列表、发送、删除、标记已读、存储容量，以及短信转发的配置/规则/开关/测试/日志",
    endpoints: [
      { method: "POST", path: "/api/sms/list", description: "列出短信" },
      { method: "GET", path: "/api/sms/capacity", description: "短信存储容量" },
      { method: "POST", path: "/api/sms/send", description: "发送短信" },
      { method: "POST", path: "/api/sms/delete", description: "删除短信" },
      { method: "POST", path: "/api/sms/read", description: "标记短信为已读" },
      { method: "GET", path: "/api/sms/forward/config", description: "转发配置" },
      { method: "PUT", path: "/api/sms/forward/config", description: "更新转发配置" },
      { method: "POST", path: "/api/sms/forward/rules", description: "创建转发规则" },
      { method: "PUT", path: "/api/sms/forward/rules", description: "更新转发规则" },
      { method: "DELETE", path: "/api/sms/forward/rules", description: "删除转发规则" },
      { method: "PUT", path: "/api/sms/forward/rules/toggle", description: "切换转发规则" },
      { method: "POST", path: "/api/sms/forward/test", description: "测试转发" },
      { method: "GET", path: "/api/sms/forward/log", description: "转发日志" },
      { method: "POST", path: "/api/sms/forward/log/clear", description: "清空转发日志" },
    ],
  },
  {
    name: "SIM",
    count: 7,
    capabilities: "SIM 信息、IMEI、PIN 管理、PUK 解锁",
    endpoints: [
      { method: "GET", path: "/api/sim/info", description: "SIM 卡信息" },
      { method: "GET", path: "/api/sim/imei", description: "设备 IMEI" },
      { method: "POST", path: "/api/sim/pin/verify", description: "验证 SIM PIN" },
      { method: "POST", path: "/api/sim/pin/change", description: "修改 SIM PIN" },
      { method: "POST", path: "/api/sim/pin/mode", description: "切换 PIN 锁定模式" },
      { method: "POST", path: "/api/sim/unlock", description: "PUK 解锁" },
      { method: "GET", path: "/api/sim/lock-trials", description: "剩余 PIN/PUK 尝试次数" },
    ],
  },
  {
    name: "小区/频段",
    count: 19,
    capabilities:
      "NR/LTE 频段锁定、锁小区、邻区扫描、STC、信号质量检测",
    endpoints: [
      { method: "POST", path: "/api/cell/lock/nr", description: "锁定 NR 小区" },
      { method: "POST", path: "/api/cell/lock/lte", description: "锁定 LTE 小区" },
      { method: "POST", path: "/api/cell/lock/reset", description: "重置锁小区" },
      { method: "POST", path: "/api/cell/neighbors/scan", description: "扫描邻区" },
      { method: "GET", path: "/api/cell/neighbors/nr", description: "NR 邻区" },
      { method: "GET", path: "/api/cell/neighbors/lte", description: "LTE 邻区" },
      { method: "POST", path: "/api/cell/band/nr", description: "锁定 NR 频段" },
      { method: "POST", path: "/api/cell/band/lte", description: "锁定 LTE 频段" },
      { method: "POST", path: "/api/cell/band/reset", description: "重置锁频段" },
      { method: "GET", path: "/api/cell/stc/params", description: "STC 参数" },
      { method: "PUT", path: "/api/cell/stc/params", description: "设置 STC 参数" },
      { method: "GET", path: "/api/cell/stc/status", description: "STC 状态" },
      { method: "POST", path: "/api/cell/stc/enable", description: "启用 STC" },
      { method: "POST", path: "/api/cell/stc/disable", description: "停用 STC" },
      { method: "POST", path: "/api/cell/stc/reset", description: "重置 STC" },
      { method: "POST", path: "/api/cell/signal-detect/start", description: "开始信号检测" },
      { method: "POST", path: "/api/cell/signal-detect/stop", description: "停止信号检测" },
      { method: "GET", path: "/api/cell/signal-detect/results", description: "信号检测结果" },
      { method: "GET", path: "/api/cell/signal-detect/progress", description: "信号检测进度" },
    ],
  },
  {
    name: "路由器",
    count: 29,
    capabilities:
      "DNS、LAN/DHCP、防火墙、NAT、DMZ、UPnP、端口转发、QoS、域名过滤、APN 配置、VPN/ALG",
    endpoints: [
      { method: "GET", path: "/api/router/dns", description: "DNS 设置" },
      { method: "PUT", path: "/api/router/dns", description: "更新 DNS 设置" },
      { method: "GET", path: "/api/router/lan", description: "LAN/DHCP 设置" },
      { method: "PUT", path: "/api/router/lan", description: "更新 LAN 设置" },
      { method: "GET", path: "/api/router/firewall", description: "防火墙状态" },
      { method: "PUT", path: "/api/router/firewall/switch", description: "切换防火墙" },
      { method: "PUT", path: "/api/router/firewall/level", description: "设置防火墙等级" },
      { method: "PUT", path: "/api/router/firewall/nat", description: "配置 NAT" },
      { method: "PUT", path: "/api/router/firewall/dmz", description: "配置 DMZ" },
      { method: "GET", path: "/api/router/firewall/upnp", description: "UPnP 状态" },
      { method: "PUT", path: "/api/router/firewall/upnp", description: "配置 UPnP" },
      { method: "GET", path: "/api/router/firewall/port-forward", description: "端口转发规则" },
      { method: "POST", path: "/api/router/firewall/port-forward", description: "添加端口转发规则" },
      { method: "PUT", path: "/api/router/firewall/port-forward/switch", description: "切换端口转发" },
      { method: "GET", path: "/api/router/firewall/filter-rules", description: "防火墙过滤规则" },
      { method: "GET", path: "/api/router/vpn", description: "VPN 透传设置" },
      { method: "PUT", path: "/api/router/vpn", description: "更新 VPN 透传" },
      { method: "GET", path: "/api/router/qos", description: "QoS 设置" },
      { method: "PUT", path: "/api/router/qos", description: "更新 QoS 设置" },
      { method: "GET", path: "/api/router/domain-filter", description: "域名过滤设置" },
      { method: "PUT", path: "/api/router/domain-filter", description: "更新域名过滤" },
      { method: "GET", path: "/api/router/apn/mode", description: "APN 模式" },
      { method: "PUT", path: "/api/router/apn/mode", description: "设置 APN 模式" },
      { method: "GET", path: "/api/router/apn/profiles", description: "APN 配置" },
      { method: "POST", path: "/api/router/apn/profiles", description: "添加 APN 配置" },
      { method: "PUT", path: "/api/router/apn/profiles", description: "修改 APN 配置" },
      { method: "GET", path: "/api/router/apn/auto-profiles", description: "自动检测的 APN 配置" },
      { method: "POST", path: "/api/router/apn/profiles/delete", description: "删除 APN 配置" },
      { method: "POST", path: "/api/router/apn/profiles/activate", description: "启用 APN 配置" },
    ],
  },
  {
    name: "Wi-Fi",
    count: 4,
    capabilities: "状态、SSID/密码/信道/发射功率、访客 Wi-Fi",
    endpoints: [
      { method: "GET", path: "/api/wifi/status", description: "Wi-Fi 状态与信息" },
      { method: "PUT", path: "/api/wifi/settings", description: "更新 Wi-Fi 设置" },
      { method: "GET", path: "/api/wifi/guest", description: "访客 Wi-Fi 状态" },
      { method: "PUT", path: "/api/wifi/guest", description: "更新访客 Wi-Fi" },
    ],
  },
  {
    name: "USB",
    count: 3,
    capabilities: "USB 模式切换、充电宝控制",
    endpoints: [
      { method: "GET", path: "/api/usb/status", description: "USB 端口状态" },
      { method: "PUT", path: "/api/usb/mode", description: "设置 USB 模式" },
      { method: "PUT", path: "/api/usb/powerbank", description: "切换充电宝模式" },
    ],
  },
  {
    name: "电话",
    count: 11,
    capabilities:
      "语音通话（拨号/挂断/接听/DTMF/静音）、USSD 代码、SIM 工具箱菜单",
    endpoints: [
      { method: "POST", path: "/api/call/dial", description: "拨打电话" },
      { method: "POST", path: "/api/call/hangup", description: "挂断通话" },
      { method: "POST", path: "/api/call/answer", description: "接听来电" },
      { method: "GET", path: "/api/call/status", description: "通话状态" },
      { method: "POST", path: "/api/call/dtmf", description: "发送 DTMF 音" },
      { method: "POST", path: "/api/call/mute", description: "切换静音" },
      { method: "POST", path: "/api/ussd/send", description: "发送 USSD 代码" },
      { method: "POST", path: "/api/ussd/respond", description: "响应 USSD 提示" },
      { method: "POST", path: "/api/ussd/cancel", description: "取消 USSD 会话" },
      { method: "GET", path: "/api/stk/menu", description: "SIM 工具箱菜单" },
      { method: "POST", path: "/api/stk/select", description: "选择 STK 项（item_id、command_id）" },
      { method: "GET", path: "/api/stk/session", description: "当前 SIM 工具箱会话" },
      { method: "POST", path: "/api/stk/respond", description: "响应 SIM 提示（command_id、text 或 yes）" },
      { method: "POST", path: "/api/stk/back", description: "从 SIM 命令返回（command_id）" },
      { method: "POST", path: "/api/stk/cancel", description: "结束待处理的 SIM 命令（command_id）" },
    ],
  },
  {
    name: "网速测试",
    count: 4,
    capabilities: "服务器列表、执行测试、进度跟踪",
    endpoints: [
      { method: "GET", path: "/api/speedtest/servers", description: "可用的测速服务器" },
      { method: "POST", path: "/api/speedtest/start", description: "开始测速" },
      { method: "GET", path: "/api/speedtest/progress", description: "测速进度" },
      { method: "POST", path: "/api/speedtest/stop", description: "停止测速" },
    ],
  },
  {
    name: "DoH 代理",
    count: 6,
    capabilities: "DNS-over-HTTPS 代理、缓存管理",
    endpoints: [
      { method: "GET", path: "/api/doh/status", description: "DoH 代理状态" },
      { method: "PUT", path: "/api/doh/config", description: "更新 DoH 配置" },
      { method: "POST", path: "/api/doh/enable", description: "启用 DoH 代理" },
      { method: "POST", path: "/api/doh/disable", description: "停用 DoH 代理" },
      { method: "GET", path: "/api/doh/cache", description: "DNS 缓存条目" },
      { method: "POST", path: "/api/doh/cache/clear", description: "清空 DNS 缓存" },
    ],
  },
  {
    name: "局域网测试",
    count: 3,
    capabilities: "Wi-Fi ping、下载/上传吞吐量测量",
    endpoints: [
      { method: "GET", path: "/api/lan/ping", description: "局域网 ping 测试" },
      { method: "GET", path: "/api/lan/download", description: "下载吞吐量测试" },
      { method: "POST", path: "/api/lan/upload", description: "上传吞吐量测试" },
    ],
  },
  {
    name: "定时任务",
    count: 5,
    capabilities: "为任意 API 操作创建定时或周期性任务",
    endpoints: [
      { method: "GET", path: "/api/scheduler/jobs", description: "列出定时任务" },
      { method: "POST", path: "/api/scheduler/jobs", description: "创建定时任务" },
      { method: "PUT", path: "/api/scheduler/jobs", description: "更新定时任务" },
      { method: "DELETE", path: "/api/scheduler/jobs", description: "删除定时任务" },
      { method: "PUT", path: "/api/scheduler/jobs/toggle", description: "切换任务启用状态" },
    ],
  },
];

export const totalEndpoints = apiCategories.reduce(
  (sum, cat) => sum + cat.count,
  0
);
export const totalCategories = apiCategories.length;
