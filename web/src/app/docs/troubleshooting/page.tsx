import type { Metadata } from "next";
import { Callout } from "@/components/ui/Callout";
import { CodeBlock } from "@/components/ui/CodeBlock";

export const metadata: Metadata = {
  title: "故障排查",
  description: "zte-agent 的常见问题与解决方案。",
};

export default function TroubleshootingPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-2 font-display text-2xl font-bold">
          故障排查
        </h1>
        <p className="text-text-dim">
          常见问题及其解决方法。
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">
          登录失败/密码错误
        </h2>
        <p className="mb-3 text-sm text-text-dim">
          “路由器密码”字段需要填写路由器 Web 管理界面的管理员密码（通常通过
          192.168.0.1 访问），而不是 Wi-Fi 密码。
        </p>
        <Callout type="info">
          如果从未修改过，请尝试路由器标签上印的默认密码。
        </Callout>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">
          连接超时
        </h2>
        <p className="mb-3 text-sm text-text-dim">
          请确保已连接到路由器的 Wi-Fi 或以太网。Agent 会通过网关
          IP（默认 192.168.0.1）直接与路由器通信。
        </p>
        <p className="text-sm text-text-dim">
          如果你修改过路由器的 LAN IP，请在配套 App 或 API 调用中相应更新
          IP 地址。
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">
          部署后 Agent 无响应
        </h2>
        <p className="mb-3 text-sm text-text-dim">
          如果无法通过 9090 端口访问 Agent：
        </p>
        <ul className="list-inside list-disc space-y-1 text-sm text-text-dim">
          <li>等待 5–10 秒后重试</li>
          <li>
            通过 SSH 检查 Agent 是否在运行：
          </li>
        </ul>
        <CodeBlock
          code={`ssh -p 2222 root@192.168.0.1 'ps | grep zte-agent'`}
          language="bash"
          className="mt-2"
        />
        <p className="mt-2 text-sm text-text-dim">
          如果进程未运行，请检查启动脚本：
        </p>
        <CodeBlock
          code={`ssh -p 2222 root@192.168.0.1 'cat /data/local/tmp/start_zte_agent.sh'
ssh -p 2222 root@192.168.0.1 'sh /data/local/tmp/start_zte_agent.sh'`}
          language="bash"
          className="mt-2"
        />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">
          CORS 错误
        </h2>
        <p className="text-sm text-text-dim">
          zte-agent 不发送 CORS 响应头，并且会拒绝其他网站发起的、试图修改设置的请求，因此其他站点的页面无法在你的浏览器中调用该
          API。请使用原生 App，或访问 Agent 自带的 Web UI：http://192.168.0.1:9090/。
        </p>
      </section>
    </div>
  );
}
