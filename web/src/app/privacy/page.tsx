import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "隐私政策 — OpenU60",
  description: "OpenU60 配套 App 的隐私政策。",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="mb-2 font-display text-2xl font-bold">隐私政策</h1>
      <p className="mb-8 text-sm text-text-dim">最后更新：2026 年 3 月 10 日</p>

      <div className="space-y-6 text-sm leading-relaxed text-text-dim">
        <section>
          <h2 className="mb-2 text-base font-semibold text-text">概述</h2>
          <p>
            OpenU60 是面向 ZTE U60 Pro（MU5250）5G 移动路由器的开源配套
            App。它仅通过你的局域网（LAN）与运行在路由器上的 zte-agent REST
            API 通信。
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-text">
            访问的数据
          </h2>
          <p className="mb-2">
            App 会通过局域网从路由器访问以下数据：
          </p>
          <ul className="list-inside list-disc space-y-1 pl-2">
            <li>信号信息（RSRP、SINR、RSRQ、频段、小区 ID）</li>
            <li>保存在路由器 SIM 卡上的短信</li>
            <li>网络配置（Wi-Fi、APN、DNS、防火墙设置）</li>
            <li>电池状态与温度信息</li>
            <li>流量统计与已连接设备列表</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-text">
            不会收集的数据
          </h2>
          <ul className="list-inside list-disc space-y-1 pl-2">
            <li>不收集任何个人数据</li>
            <li>无需用户账户或注册</li>
            <li>无分析或遥测</li>
            <li>无崩溃上报</li>
            <li>无云存储或远程服务器</li>
            <li>无广告或跟踪</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-text">
            数据存储
          </h2>
          <p>
            所有数据都保留在你的局域网内。App 通过 HTTP 与运行在路由器 LAN IP 地址（通常为 192.168.0.1:9090）上的 zte-agent 服务器通信，不会向任何外部服务器、云服务或第三方传输数据。
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-text">
            第三方共享
          </h2>
          <p>
            不会与任何第三方共享数据。App 不包含第三方 SDK、分析服务或广告网络。
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-text">
            权限
          </h2>
          <p className="mb-2">App 会申请以下权限：</p>
          <ul className="list-inside list-disc space-y-1 pl-2">
            <li>
              <strong>iOS：</strong>本地网络访问 —— 用于通过 Wi-Fi
              与路由器通信
            </li>
            <li>
              <strong>Android：</strong>INTERNET、ACCESS_WIFI_STATE、ACCESS_NETWORK_STATE —— 用于通过 Wi-Fi 与路由器通信
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-text">
            开源
          </h2>
          <p>
            OpenU60 完全开源。你可以在{" "}
            <a
              href="https://github.com/jesther-ai/open-u60-pro"
              className="text-accent hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            上查看完整源代码。
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-text">联系方式</h2>
          <p>
            如有隐私相关问题，请在{" "}
            <a
              href="https://github.com/jesther-ai/open-u60-pro/issues"
              className="text-accent hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub 仓库
            </a>
            提交 issue。
          </p>
        </section>

        <section className="border-t border-border pt-6">
          <p className="text-xs">
            OpenU60 与中兴通讯（ZTE）无隶属、认可或赞助关系。ZTE 与 U60 Pro
            是中兴通讯（ZTE）的商标。
          </p>
        </section>
      </div>
    </div>
  );
}
