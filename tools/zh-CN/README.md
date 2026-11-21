# 本地化相关的构建 / 部署 / 验证工具

本目录收录本次中文化工作中实际使用的脚本，方便复现。路径均为本机（Windows）绝对路径示例，可按自己的目录调整。

| 文件 | 用途 |
|---|---|
| `deploy-u60pro.ps1` | 交叉编译（Zig + `cargo zigbuild`）中文版 `zte-agent`，通过 USB ADB 推送到 U60 Pro 的 A/B 槽位并重启、校验登录 |
| `qa-console.cjs` | 用 Edge（Playwright `channel: 'msedge'`）登录控制台，遍历全部 36 个页面，截图并输出 `report.json`（页面标题、中文检测、前端错误、失败请求） |
| `scan-english.cjs` | 遍历控制台所有页面，扫描“仍为英文”的可见文本（带协议/单位白名单） |
| `check-swift.py` | 静态校验 iOS Swift 源码：把字符串字面量替换为占位符后与 `git HEAD` 比对，确认中文化只改了字符串、没改代码骨架 |

## 快速使用

```powershell
# 1) 重新编译并部署中文版 Agent（需要 adb、Zig、rustup musl 目标）
powershell -ExecutionPolicy Bypass -File tools\zh-CN\deploy-u60pro.ps1

# 2) 控制台回归 + 截图（需要 Node 与 playwright-core，并使用系统 Edge）
npm install playwright-core
node tools\zh-CN\qa-console.cjs http://192.168.0.1:9090 <Agent密码> C:\tmp\shots

# 3) 英文残留扫描
node tools\zh-CN\scan-english.cjs

# 4) Swift 结构校验（在仓库根目录）
python tools\zh-CN\check-swift.py
```

iOS App 的编译方式见 [mobile/ios/BUILD.zh-CN.md](../../mobile/ios/BUILD.zh-CN.md)；GitHub Actions 工作流见 [.github/workflows/ios-build.yml](../../.github/workflows/ios-build.yml)。
