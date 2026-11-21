import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border pt-12 pb-6">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
          <div>
            <div className="mb-2 font-mono text-[0.9375rem] font-bold">
              open-u60-pro
            </div>
            <p className="text-[0.8125rem] leading-relaxed text-text-dim">
              面向 ZTE U60 Pro 5G 移动路由器的开源工具集。设备端 Agent、原生配套 App 与 Web 引导工具。
            </p>
          </div>
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-dim">
              链接
            </h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://github.com/jesther-ai/open-u60-pro"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[0.8125rem] text-text-dim transition-colors hover:text-text"
                >
                  GitHub 仓库
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/jesther-ai/open-u60-pro/releases"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[0.8125rem] text-text-dim transition-colors hover:text-text"
                >
                  版本发布
                </a>
              </li>
              <li>
                <Link
                  href="/docs"
                  className="text-[0.8125rem] text-text-dim transition-colors hover:text-text"
                >
                  文档
                </Link>
              </li>
              <li>
                <Link
                  href="/download"
                  className="text-[0.8125rem] text-text-dim transition-colors hover:text-text"
                >
                  下载
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-dim">
              项目
            </h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://github.com/jesther-ai/open-u60-pro/blob/main/LICENSE"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[0.8125rem] text-text-dim transition-colors hover:text-text"
                >
                  MIT 许可证
                </a>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-[0.8125rem] text-text-dim transition-colors hover:text-text"
                >
                  隐私政策
                </Link>
              </li>
              <li>
                <Link
                  href="/legal"
                  className="text-[0.8125rem] text-text-dim transition-colors hover:text-text"
                >
                  法律声明
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-5 text-xs text-text-dim">
          <span>由 jesther-ai 构建</span>
          <span>与中兴通讯（ZTE）无隶属关系</span>
        </div>
      </div>
    </footer>
  );
}
