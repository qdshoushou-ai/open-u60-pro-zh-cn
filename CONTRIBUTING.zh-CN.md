> 本文档为 [原文](CONTRIBUTING.md) 的中文翻译，如与英文原文有出入以英文原文为准。

# 为 open-u60-pro 贡献

感谢你有兴趣参与贡献！本指南将帮你快速上手。

## 前置条件

- **Rust 工具链**（stable，最新版）——通过 [rustup](https://rustup.rs/) 安装
- **交叉编译目标**：`aarch64-unknown-linux-musl`
- **ADB**（Android Debug Bridge，Android 调试桥），用于向设备部署
- **一台 ZTE U60 Pro**（MU5250），且已启用 ADB 访问

## 架构

| 组件 | 路径 | 说明 |
|---|---|---|
| zte-agent | `zte-agent/` | 运行在设备上的 Rust HTTP Agent（Axum）：提供 REST API、实时更新（`/api/events`），并在 9090 端口提供浏览器 UI |
| iOS App | `mobile/ios/` | SwiftUI 伴侣 App |
| Android App | `mobile/android/` | Jetpack Compose 伴侣 App |

## 开发环境准备

```bash
# Clone the repo
git clone https://github.com/jesther-ai/open-u60-pro.git
cd open-u60-pro

# Build the agent
cd zte-agent
cargo build --release --target aarch64-unknown-linux-musl

# Deploy to device via ADB
adb push target/aarch64-unknown-linux-musl/release/zte-agent /data/local/tmp/
adb shell chmod +x /data/local/tmp/zte-agent
```

## 代码风格

- 提交前运行 `cargo fmt`
- 运行 `cargo clippy` 并修复所有警告
- 遵循 Rust 标准命名约定

## 提交 Issue

- 使用提供的 Issue 模板（缺陷报告或功能请求）
- 报告缺陷时附上设备固件版本和 zte-agent 版本
- 附上 Agent 或伴侣 App 的相关日志

## 提交 Pull Request

1. Fork 本仓库，并从 `main` 创建功能分支
2. 以清晰、聚焦的提交完成改动
3. 确保 `cargo fmt` 和 `cargo clippy` 通过
4. 尽可能在真机上测试
5. 使用 Pull Request 模板提交 PR
6. 说明改动内容以及你是如何测试的

## 行为准则

本项目遵循[贡献者公约行为准则](CODE_OF_CONDUCT.md)。参与前请先阅读。
