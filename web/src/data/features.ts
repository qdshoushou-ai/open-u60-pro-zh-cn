import {
  Server,
  Smartphone,
  Globe,
  Signal,
  Radio,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const features: Feature[] = [
  {
    icon: Server,
    title: "设备端 Agent",
    description:
      "轻量级 Rust HTTP 服务器（RSS 约 0.8 MB），取代中兴原有的 225 MB 守护进程栈。覆盖 16 个分类、共 143 个 REST 端点。",
  },
  {
    icon: Smartphone,
    title: "移动端配套 App",
    description:
      "原生 iOS（SwiftUI）与 Android（Compose）App。仪表盘、信号监控、短信、锁频段、设备管理 —— 全部通过 Wi-Fi 完成。",
  },
  {
    icon: Globe,
    title: "Web 引导部署",
    description:
      "在浏览器中完成 Agent 的全部部署。基于 WebUSB，无需命令行。支持 Chrome 与 Edge。",
  },
  {
    icon: Signal,
    title: "信号监控",
    description:
      "实时读取 RSRP、SINR、RSRQ。提供 NR/LTE 小区信息、邻区扫描与信号质量检测。",
  },
  {
    icon: Radio,
    title: "频段锁定",
    description:
      "锁定指定的 NR 与 LTE 频段。支持锁小区、STC（Smart Tower Connect）与载波聚合控制。",
  },
  {
    icon: ShieldCheck,
    title: "隐私优先",
    description:
      "零遥测。不会向中兴服务器回传任何数据。开源 Agent 仅运行在你的局域网内，设备完全由你掌控。",
  },
];
