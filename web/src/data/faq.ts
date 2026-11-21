export interface FAQItem {
  question: string;
  answer: string;
}

export const faqData: FAQItem[] = [
  {
    question: "这对我的路由器安全吗？",
    answer:
      "Agent 是用户态进程 —— 不会修改固件或内核。它使用的 ubus/AT 接口与中兴官方 App 相同。破坏性操作（恢复出厂设置、重启）需要显式确认。Agent 可随时停止或卸载。",
  },
  {
    question: "哪些浏览器支持 Web 安装向导？",
    answer:
      "基于 WebUSB 的安装向导需要桌面版 Chrome 或 Edge。Safari、Firefox 与移动端浏览器不支持 WebUSB。非 Chrome 用户可改用命令行安装脚本。",
  },
  {
    question: "这能用于其他中兴路由器吗？",
    answer:
      "目前仅支持 ZTE U60 Pro（MU5250）。其他中兴型号的 ubus API 结构可能不同。欢迎为其他设备贡献代码。",
  },
  {
    question: "如何更新 Agent？",
    answer:
      "重新运行部署脚本（deploy.sh），或使用 Web 安装向导。新二进制会替换旧版本，Agent 将自动重启。",
  },
  {
    question: "可以用 SSH 代替 WebUSB 吗？",
    answer:
      "可以。安装脚本可选择在设备上安装 Dropbear SSH。首次通过 USB 完成安装后，后续部署可通过 Wi-Fi 使用 SSH（端口 2222）。",
  },
  {
    question: "Agent 崩溃了，或者我想卸载它，怎么办？",
    answer:
      "Agent 会通过 rc.local 在开机时自动重启。卸载方法：通过 ADB 或 SSH 连接，删除 /data/zte-agent 与 /data/local/tmp/start_zte_agent.sh，然后移除 rc.local 中的启动项。恢复出厂设置也会清理全部内容。",
  },
  {
    question: "Agent 需要联网吗？",
    answer:
      "不需要。Agent 完全在局域网内运行（端口 9090），从不发起对外连接。移动 App 通过 Wi-Fi 直连 Agent。",
  },
  {
    question: "移动 App 的情况如何？",
    answer:
      "项目包含适用于 iOS（SwiftUI）与 Android（Jetpack Compose）的原生配套 App。它们通过 Wi-Fi 直连 Agent —— 无需云服务。App Store/Play Store 版本即将推出。",
  },
];
