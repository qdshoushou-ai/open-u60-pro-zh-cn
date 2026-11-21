import SwiftUI

struct DeviceControlView: View {
    @Bindable var viewModel: DeviceControlViewModel

    private var controlsDisabled: Bool { viewModel.isLoading }

    var body: some View {
        List {
            if let msg = viewModel.message {
                Section {
                    Text(msg)
                        .font(.subheadline)
                        .foregroundStyle(viewModel.messageIsError ? .red : .green)
                        .textSelection(.enabled)
                }
            }

            Section {
                Toggle("充电上限", isOn: Binding(
                    get: { viewModel.chargeLimitEnabled },
                    set: { val in
                        viewModel.chargeLimitEnabled = val
                        Task { await viewModel.setChargeLimit(enabled: val, limit: viewModel.chargeLimit) }
                    }
                ))
                    .disabled(controlsDisabled)

                if viewModel.chargeLimitEnabled {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack(spacing: 0) {
                            Text("停止于 ")
                                .font(.subheadline)
                            AnimatedNumber(value: viewModel.chargeLimit, font: .subheadline.monospacedDigit(), textColor: .primary, suffix: "%")
                        }
                        Slider(
                            value: Binding(
                                get: { Double(viewModel.chargeLimit) },
                                set: { viewModel.chargeLimit = Int($0) }
                            ),
                            in: 50...100,
                            step: 5
                        ) {
                            Text("充电上限")
                        } onEditingChanged: { editing in
                            if !editing {
                                Task { await viewModel.setChargeLimit(enabled: true, limit: viewModel.chargeLimit) }
                            }
                        }
                        .disabled(controlsDisabled)
                    }

                    Stepper(value: Binding(
                        get: { viewModel.hysteresis },
                        set: { newVal in
                            viewModel.hysteresis = newVal
                            Task { await viewModel.setChargeLimit(enabled: true, limit: viewModel.chargeLimit, hysteresis: newVal) }
                        }
                    ), in: 1...20) {
                        HStack(spacing: 0) {
                            Text("恢复间隔：")
                                .font(.body)
                            AnimatedNumber(value: viewModel.hysteresis, font: .body.monospacedDigit(), textColor: .primary, suffix: "%")
                        }
                    }
                    .disabled(controlsDisabled)
                }
            } footer: {
                if viewModel.chargeLimitEnabled {
                    Text("充电在电量达到 \(viewModel.chargeLimit)% 时停止，并在降至 \(viewModel.chargeLimit - viewModel.hysteresis)% 时恢复。\n\n恢复间隔可防止充电器频繁开关。间隔较小（例如 2%）时电池更接近目标电量，但充电器切换更频繁；间隔较大（例如 10%）时充电循环更少，但电量波动更大。\n\n默认值：5%——对大多数用户来说较为均衡。")
                } else {
                    Text("电量达到设定值时停止充电，可延长电池寿命。")
                }
            }

            Section {
                Toggle("节能模式", isOn: Binding(
                    get: { viewModel.powerSaveEnabled },
                    set: { val in
                        viewModel.powerSaveEnabled = val
                        Task { await viewModel.setPowerSave(enabled: val) }
                    }
                ))
                    .disabled(controlsDisabled)
            } footer: {
                Text("限制数据通信速度，以降低功耗并延长电池续航。")
            }

            Section {
                Toggle("快速启动", isOn: Binding(
                    get: { viewModel.fastBootEnabled },
                    set: { val in
                        viewModel.fastBootEnabled = val
                        Task { await viewModel.setFastBoot(enabled: val) }
                    }
                ))
                    .disabled(controlsDisabled)
            } footer: {
                Text("启用后，关机时会将系统挂起到内存，几乎可立即开机；停用后则完全关机（关机时更省电）。")
            }

            Section {
                Toggle("自动休眠", isOn: Binding(
                    get: { viewModel.autoSleepEnabled },
                    set: { val in
                        viewModel.autoSleepEnabled = val
                        Task { await viewModel.setAutoSleep(enabled: val, timeout: val ? viewModel.autoSleepTimeout : nil) }
                    }
                ))
                    .disabled(controlsDisabled)

                if viewModel.autoSleepEnabled {
                    Picker("空闲超时", selection: Binding(
                        get: { viewModel.autoSleepTimeout },
                        set: { newVal in
                            viewModel.autoSleepTimeout = newVal
                            Task { await viewModel.setAutoSleep(enabled: true, timeout: newVal) }
                        }
                    )) {
                        Text("5 分钟").tag("5")
                        Text("10 分钟").tag("10")
                        Text("20 分钟").tag("20")
                        Text("30 分钟").tag("30")
                        Text("1 小时").tag("60")
                        Text("2 小时").tag("120")
                    }
                    .disabled(controlsDisabled)
                }
            } footer: {
                Text("当没有 WiFi 客户端连接且空闲超时后，自动进入低功耗休眠。按电源键唤醒。")
            }

            Section {
                Button("重启路由器") {
                    viewModel.showRebootConfirm = true
                }
                .disabled(controlsDisabled)
            } footer: {
                Text("路由器将重启，大约需要 60 秒。")
            }

            Section {
                Button("恢复出厂设置", role: .destructive) {
                    viewModel.showFactoryResetConfirm = true
                }
                .disabled(controlsDisabled)
            } footer: {
                Text("这将清除所有设置并恢复出厂默认值，且无法撤销。")
            }
        }
        .task { await viewModel.refresh() }
        .navigationTitle("设备控制")
        .overlay {
            if viewModel.isLoading {
                ProgressView()
                    .padding()
                    .background(Color(.systemBackground).opacity(0.85), in: RoundedRectangle(cornerRadius: 8))
            }
        }
        .sheet(isPresented: $viewModel.showRebootConfirm) {
            PasswordConfirmView(
                title: "重启路由器",
                message: "输入路由器密码以确认重启。",
                confirmLabel: "重启"
            ) {
                await viewModel.reboot()
            }
        }
        .sheet(isPresented: $viewModel.showFactoryResetConfirm) {
            PasswordConfirmView(
                title: "恢复出厂设置",
                message: "这将清除所有设置。输入路由器密码以确认。",
                confirmLabel: "恢复出厂设置"
            ) {
                await viewModel.factoryReset()
            }
        }
    }
}
