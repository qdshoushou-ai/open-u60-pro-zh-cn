import {
  Gauge,
  Wifi,
  MessageSquare,
  MessageSquareShare,
  Signal,
  Radio,
  ShieldCheck,
  Clock,
  BatteryCharging,
  Terminal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface FeatureDetail {
  icon: LucideIcon;
  title: string;
  category: string;
  description: string;
  howItWorks: string;
}

export const featureDetails: FeatureDetail[] = [
  {
    icon: Gauge,
    title: "网速测试",
    category: "网络",
    description:
      "直接从路由器测量互联网吞吐量。",
    howItWorks:
      "Agent 从 U60 本机连接 speedtest.net 服务器，测量延迟、下载与上传速度 —— 绕过 Wi-Fi 开销，得到真实的 WAN 速率。结果会实时推送到 App。",
  },
  {
    icon: Wifi,
    title: "局域网测速",
    category: "网络",
    description:
      "测试手机与路由器之间的 Wi-Fi 链路质量。",
    howItWorks:
      "手机通过 Wi-Fi 向 Agent 的 /lan-test/* 端点发送 HTTP 请求。分别测量 ping（空 200 响应）、下载（Agent 持续发送零字节数据）与上传（手机发送数据，Agent 统计字节数）。测试的是 Wi-Fi 链路，而非 WAN。",
  },
  {
    icon: MessageSquare,
    title: "短信管理",
    category: "电话",
    description:
      "直接在配套 App 中读取、发送与删除短信。",
    howItWorks:
      "短信通过设备上的 ubus 命令读取与发送，会话按联系人号码分组。你可以向任意号码发送短信、删除单条消息，或清空整个会话。",
  },
  {
    icon: MessageSquareShare,
    title: "短信转发",
    category: "电话",
    description:
      "将收到的短信自动转发到 Telegram、webhook 等。",
    howItWorks:
      "Agent 监听 ubus 的新短信事件 —— 没有轮询延迟。收到的消息会与规则匹配（发送方、关键词或两者组合）。命中的消息会转发到 Telegram、webhook、ntfy、Discord、Slack 或其他手机号码，失败时自动重试。",
  },
  {
    icon: Signal,
    title: "信号监控",
    category: "调制解调器",
    description:
      "实时读取 RSRP、SINR 与 RSRQ，并显示小区信息。",
    howItWorks:
      "实时读取调制解调器的信号指标。显示服务小区信息（NR 或 LTE）、EARFCN/ARFCN、PCI 与频段号。还可扫描邻区，帮你找到所在区域中更好的基站。",
  },
  {
    icon: Radio,
    title: "频段锁定",
    category: "调制解调器",
    description:
      "将调制解调器锁定到指定的 NR 或 LTE 频段与小区。",
    howItWorks:
      "强制调制解调器使用指定的 NR 或 LTE 频段。可按 PCI + 频率锁定小区。Smart Tower Connect（STC）可自动选择最佳基站。适合避开拥塞频段或强制切换到更好的基站。",
  },
  {
    icon: ShieldCheck,
    title: "DNS-over-HTTPS",
    category: "隐私",
    description:
      "为所有局域网客户端提供内置加密 DNS 代理。",
    howItWorks:
      "Agent 运行 DoH 代理 —— 局域网客户端可将 192.168.0.1:9090 作为 DNS 解析器。查询会通过 HTTPS 转发到 Cloudflare 或 Google。响应缓存可加速重复查询并降低延迟。",
  },
  {
    icon: Clock,
    title: "定时任务",
    category: "自动化",
    description:
      "将任意 API 操作设为一次性或周期性任务。",
    howItWorks:
      "创建 cron 风格的任务，调用任意 Agent API 端点。例如：每天凌晨 3 点重启、按计划切换飞行模式、每小时执行一次测速。任务会持久化到磁盘，重启后依然有效。",
  },
  {
    icon: BatteryCharging,
    title: "充电策略",
    category: "设备",
    description:
      "类似 iPhone 的充电上限，保护电池健康。",
    howItWorks:
      "设置 80% 的充电上限 —— Agent 监听 ubus 充电器事件，即时响应状态变化。达到上限后暂停充电，降到 75% 时恢复（5% 回差）。让电池长期保持在最健康的电量区间。",
  },
  {
    icon: Terminal,
    title: "AT 命令",
    category: "调制解调器",
    description:
      "面向高级调制解调器诊断的直接 AT 命令接口。",
    howItWorks:
      "直接向 /dev/at_mdm0 发送 AT 命令。可查询 IMEI、调制解调器固件版本、详细信号信息，或发送自定义 AT 字符串。这是用于深度调制解调器诊断与配置的高级工具。",
  },
];
