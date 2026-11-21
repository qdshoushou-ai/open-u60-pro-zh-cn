> 本文件说明如何在 macOS 上编译本仓库中文化后的 OpenU60 iOS App，以及在没有 Mac 时的可行方案。

# 编译 OpenU60 iOS App

## 0. 先说明一个硬限制

Apple 的 iOS App **必须用 macOS + Xcode 编译**（`xcodebuild`、iOS SDK、代码签名工具链只在 macOS 上提供），Windows 无法直接交叉编译 SwiftUI + WidgetKit/ActivityKit 的 iOS 工程。因此：

- 本机（Windows）只能完成源码审阅、中文化与静态结构校验，**无法产出 .app/.ipa**；
- 要得到可安装的 App，需要一台 macOS（本机、远程、或 GitHub Actions 的 macOS runner）。

## 1. 环境要求

| 项目 | 要求 |
|---|---|
| macOS | 14 或更高（推荐 macOS 15） |
| Xcode | 16 或更高（含 iOS 17+ SDK；`project.yml` 的部署目标为 iOS 17.0） |
| XcodeGen | `brew install xcodegen`（工程由 `project.yml` 生成，仓库不带 `.xcodeproj`） |
| 真机安装 | Apple ID（免费即可，7 天有效）/ 付费开发者账号（一年） |
| 可选 | 已连接的 iPhone（真机安装）；或仅用 iOS Simulator |

## 2. 在 Mac 上编译（推荐先做这一步验证）

```bash
cd mobile/ios/OpenU60
brew install xcodegen        # 只需一次
xcodegen generate            # 生成 OpenU60.xcodeproj

# 方式 A：用 Xcode 打开并运行
open OpenU60.xcodeproj       # 选择你的 Team / 模拟器 → Run

# 方式 B：命令行编译模拟器版本（无需签名）
xcodebuild -project OpenU60.xcodeproj -scheme OpenU60 \
  -configuration Debug -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath build-sim \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY="" build

# 方式 C：编译真机版本并打包未签名 IPA
./scripts/build_unsigned_ipa.sh          # 现已提供，见下节
```

仓库内新增的脚本 `mobile/ios/scripts/build_unsigned_ipa.sh` 会一次产出：

- `mobile/ios/OpenU60/OpenU60-unsigned.ipa`（真机用，未签名）
- `mobile/ios/OpenU60/OpenU60-simulator.zip`（模拟器用 .app）

## 3. 没有 Mac：用 GitHub Actions 的 macOS runner

仓库已新增工作流 `.github/workflows/ios-build.yml`，在 GitHub 托管仓库中即可编译并下载未签名 IPA，不需要 Apple 账号：

1. 把本仓库（含 `.github/workflows/ios-build.yml` 与 `mobile/ios/`）推送到你的 GitHub 仓库；
2. Actions → **iOS Build (unsigned)** → **Run workflow**；
3. 完成后在该次运行页下载 artifacts：
   - `OpenU60-unsigned-ipa`（`OpenU60-unsigned.ipa`）
   - `OpenU60-simulator-app`（`OpenU60-simulator.zip`，需在 mac 的 Simulator 中运行）

工作流使用 `macos-15` runner、`xcodegen` 生成工程、`CODE_SIGNING_ALLOWED=NO` 编译，产物不含任何签名。

## 4. 在 Windows 上把未签名 IPA 装到 iPhone

拿到 `OpenU60-unsigned.ipa` 后，可用 **Sideloadly** 或 **AltStore** 用你自己的 Apple ID 签名安装：

1. 安装 iTunes（Windows 版，提供设备驱动）与 [Sideloadly](https://sideloadly.io/)；
2. iPhone 用数据线连接电脑，信任该电脑；
3. 把 `OpenU60-unsigned.ipa` 拖入 Sideloadly，填入 Apple ID，开始签名安装；
4. iOS 需信任开发者证书：设置 → 通用 → VPN 与设备管理 → 信任你的 Apple ID 证书；
5. 免费 Apple ID 的签名 **7 天后失效**，到期需重新签名；付费开发者账号为 1 年。

注意：
- 免费签名无法启用需要付费能力的 entitlements，**iOS Live Activity（锁屏信号/GitLab 灵动岛）需要付费开发者账号并配置 APNs**，否则该功能不可用（见 `zte-agent/docs/live-activity.zh-CN.md`）；
- App 与路由器通信使用局域网明文 HTTP（`http://192.168.0.1:9090`），iOS 端已在 Info.plist 中配置相应例外；若你启用了路由器 HTTPS，请在 App 的登录页填写 `https://…:9443`。

## 5. 本次中文化对 iOS 源码的影响

- 修改 107 个 Swift 文件、约 1,400 处用户可见字符串；`zh-Hans.lproj/Localizable.strings` 由 44 条扩充到 118 条，`en.lproj` 同步。
- 自检结果：所有字符串字面量按「内容占位后与 git HEAD 比对」的方式校验，代码骨架、插值表达式、标识符、JSON/UserDefaults/Keychain 键均未改变；唯一有意的非字面量改动是 9 处插值内的显示分支（如 `enabled ? "启用" : "停用"`）与 2 处复数后缀删除。
- 未在 macOS 上实际编译过（本机为 Windows），首次编译时若出现少量本地化引起的语法/格式问题（例如过长的中文插值），按 Xcode 报错修一行即可；欢迎把 Xcode 报错贴回来，我可以直接修。

## 6. 常用参数

| 参数 | 说明 |
|---|---|
| `TEAM_ID` | 真机 Xcode 运行需要（自动签名）；未签名构建不需要 |
| `BUNDLE_ID` | 默认 `com.jesthersilvestre.openu60`，免费 Apple ID 重签名时 Sideloadly 会自动改 |
| 最低系统 | iOS 17.0 |
| 工程来源 | `mobile/ios/OpenU60/project.yml`（XcodeGen） |
