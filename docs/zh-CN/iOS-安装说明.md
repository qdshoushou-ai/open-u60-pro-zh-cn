# OpenU60 iOS App 安装说明（未签名 IPA）

## 产物

| 文件 | 大小 | 说明 |
|---|---|---|
| `OpenU60-unsigned.ipa` | 2.67 MB | iPhone 用；未签名，需用自己的 Apple ID 签名后安装 |
| `OpenU60-simulator.zip` | 8.77 MB | iOS 模拟器用（`.app`，只能在 macOS 的 Simulator 运行） |

- 编译来源：GitHub Actions `iOS Build (unsigned)`，run [44918201914](https://github.com/qdshoushou-ai/open-u60-pro-zh-cn/actions/runs/44918201914)（结论：success，耗时 3m8s）
- 源码仓库（私有）：<https://github.com/qdshoushou-ai/open-u60-pro-zh-cn>
- App：`com.jesthersilvestre.openu60`，版本 1.0，最低 iOS 17.0，含 Live Activity 扩展，内含 `zh-Hans` 中文本地化资源（118 条）

## 用 Sideloadly 安装到 iPhone（Windows，免费 Apple ID 即可）

1. 电脑安装 **iTunes（Windows 版）** 与 [Sideloadly](https://sideloadly.io/)；iPhone 用数据线连接电脑，手机上点“信任此电脑”。
2. 打开 Sideloadly：
   - **IPA**：拖入或选择 `C:\Users\Administrator\Downloads\OpenU60-unsigned.ipa`
   - **Apple ID**：填你的 Apple ID（免费账号即可；需要能收验证码）
   - 其他保持默认，点 **Start**，输入 Apple ID 密码/验证码
3. iPhone 上：设置 → 通用 → VPN 与设备管理 → 开发者 App → 信任你的 Apple ID 证书。
4. 打开桌面上的 **OpenU60**，首次进入后填写：
   - Agent 地址：`http://192.168.0.1:9090`（手机需连接 U60 Pro 的 Wi-Fi）
   - Agent 密码：`<你部署 Agent 时设置的密码>`
5. 免费 Apple ID 的签名 **7 天后失效**，到期用 Sideloadly 重新签名即可（无需重新编译）。

> 也可以改用 AltStore / Xcode（Mac）签名安装，效果相同。

## 注意事项

- **Live Activity（锁屏信号/灵动岛）** 需要付费 Apple Developer 账号启用推送能力并配置 APNs（`zte-agent/docs/live-activity.zh-CN.md`）；免费签名下该功能不可用，其余页面正常。
- 若路由器开启了 HTTPS（控制台设置 → HTTPS 与安装），App 登录页的地址请改成 `https://192.168.0.1:9443`，并在 iPhone 上先信任路由器的证书颁发机构。
- 未签名 IPA 的扩展（`SignalLiveActivityExtension`）在免费账号下可能被 Sideloadly 剥离，不影响主 App 使用。
- 源码中文化后未改动任何业务逻辑（自检：字符串替换后代码骨架与上游一致）。

## 如何重新编译

- **GitHub Actions（本次方式）**：把代码推到上述私有仓库，或在该仓库 Actions → “iOS Build (unsigned)” → Run workflow；完成后下载 artifacts。
- **macOS 本机**：`cd mobile/ios/OpenU60 && brew install xcodegen && xcodegen generate`，然后运行 `./scripts/build_unsigned_ipa.sh`。
- 详细说明见仓库内 `mobile/ios/BUILD.zh-CN.md`。
