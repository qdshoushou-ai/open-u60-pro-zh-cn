import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "法律声明 — OpenU60",
  description:
    "OpenU60 项目的法律免责声明、保修信息与商标声明。",
};

export default function LegalPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="mb-2 font-display text-2xl font-bold">
        法律声明
      </h1>
      <p className="mb-8 text-sm text-text-dim">最后更新：2026 年 3 月 10 日</p>

      <div className="space-y-6 text-sm leading-relaxed text-text-dim">
        <section>
          <h2 className="mb-2 text-base font-semibold text-text">免责声明</h2>
          <p>
            OpenU60 是一个独立的开源项目，与中兴通讯（ZTE）无隶属、认可或赞助关系。ZTE、U60 Pro 与 MU5250 是中兴通讯（ZTE）的商标。
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-text">许可证</h2>
          <p className="mb-2">
            OpenU60 基于{" "}
            <a
              href="https://github.com/jesther-ai/open-u60-pro/blob/main/LICENSE"
              className="text-accent hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              MIT 许可证
            </a>
            发布。
          </p>
          <p className="rounded border border-border bg-surface-1 px-3 py-2 font-mono text-xs leading-relaxed">
            本软件按“原样”提供，不附带任何明示或暗示的担保，包括但不限于适销性、特定用途适用性及不侵权的担保。在任何情况下，作者或版权持有人均不对因本软件或本软件的使用或其他交易而产生的任何索赔、损害或其他责任承担责任，无论其源于合同、侵权或其他行为。
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-text">
            不提供担保
          </h2>
          <p>
            本软件按“原样”提供，不附带任何形式的明示或暗示担保。项目不保证软件无错误、不中断，或适合任何特定用途。你需自行承担使用风险。
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-text">
            责任限制
          </h2>
          <p>
            本项目的作者与贡献者不对使用本软件造成的任何设备损坏、制造商保修失效、路由器变砖、数据丢失、网络中断或其他后果负责。你对设备所做的任何修改承担全部责任。
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-text">
            预期用途
          </h2>
          <p>
            本软件仅适用于你个人拥有且具备完整管理权限的设备。它不用于未经授权访问你不拥有或控制的设备。你有责任确保自己的使用符合适用的法律法规。
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-text">
            设备改装警告
          </h2>
          <p>
            设备端 Agent 与配套 App 会暴露可修改固件设置、网络配置的控制端点，并可执行恢复出厂设置、重启等可能具有破坏性的操作。这些操作可能导致制造商保修失效。使用本软件即表示你接受对设备所做任何修改的全部责任。
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-text">
            逆向工程
          </h2>
          <p>
            本项目中的所有逆向工程均仅出于互操作与教育目的，依据适用的合理使用与互操作性例外条款（包括但不限于欧盟
            2009/24/EC 指令与美国合理使用原则）进行。本项目不包含中兴通讯（ZTE）的任何专有源代码。
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-text">
            无专有代码
          </h2>
          <p>
            本项目不分发任何中兴专有源代码、二进制文件或受版权保护的资源。加密密钥与协议细节来源于公开的社区研究与标准的互操作性分析。
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-text">
            商标
          </h2>
          <p>
            ZTE、U60 Pro 与 MU5250 是中兴通讯（ZTE）的商标。Qualcomm 与
            Snapdragon 是 Qualcomm Incorporated 的商标。其他所有商标均为其各自所有者的财产。这些名称在本项目中仅用于标识，不代表任何认可关系。
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-text">联系方式</h2>
          <p>
            如有法律相关问题，请在{" "}
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
