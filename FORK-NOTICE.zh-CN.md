# 来源与致谢（原作者）

本项目是 [**jesther-ai/open-u60-pro**](https://github.com/jesther-ai/open-u60-pro) 的**简体中文社区分支**（非官方）。

- **原作者 / 上游维护者：Jesther Silvestre（GitHub：[@jesther-ai](https://github.com/jesther-ai)）**
- 上游仓库：<https://github.com/jesther-ai/open-u60-pro>
- 上游发布：<https://github.com/jesther-ai/open-u60-pro/releases>
- 许可证：**MIT**（见 [`LICENSE`](LICENSE)，版权归原作者所有）；`euicc/` 为 lpac libeuicc 的 Rust 翻译，**LGPL-2.1-only**（见 [`euicc/LICENSE`](euicc/LICENSE)）

## 本分支做了什么

仅做中文本地化与构建辅助，不改变业务逻辑：

- 设备端控制台（`zte-agent/ui/`）与 Agent API 提示中文化，加入中文字体栈、`lang="zh-CN"` 与状态映射；
- iOS / Android 伴侣 App 源码中文化（含 `zh-Hans` / `zh-rCN` 资源）；
- 官网落地页与文档新增简体中文版本；
- 新增 GitHub Actions iOS 未签名构建工作流与 Mac 一键构建脚本。

上游的英文版本、历史提交、标签与 Release 均保留在本仓库中（本分支提交位于其后）。

---

## Upstream attribution (English)

This repository is a community **Simplified-Chinese fork** of
[jesther-ai/open-u60-pro](https://github.com/jesther-ai/open-u60-pro), an independent project by
**Jesther Silvestre ([@jesther-ai](https://github.com/jesther-ai))**. All credit for the original
work belongs to the upstream author. The fork only adds Chinese localization (device console, agent
API messages, iOS/Android apps, landing page, documentation) and iOS build automation; the original
code and behavior are unchanged. Licensed under **MIT** (original copyright preserved); `euicc/`
remains **LGPL-2.1-only**. Not affiliated with or endorsed by ZTE Corporation.
