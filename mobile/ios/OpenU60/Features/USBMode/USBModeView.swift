import SwiftUI

struct USBModeView: View {
    @Bindable var viewModel: USBConnectionViewModel

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

            Section("USB 状态") {
                LabeledContent("数据线") {
                    Text(viewModel.usbStatus.cableAttached ? "已连接" : "已断开")
                        .foregroundStyle(viewModel.usbStatus.cableAttached ? .green : .secondary)
                }
                LabeledContent("USB-C CC") {
                    Text(viewModel.usbStatus.typecCC)
                }
                LabeledContent("模式") {
                    Text(viewModel.usbStatus.mode.isEmpty ? "—" : viewModel.usbStatus.mode)
                }
            }

            Section {
                Toggle("快速充电（移动电源）", isOn: Binding(
                    get: { viewModel.usbStatus.powerbankActive },
                    set: { newValue in
                        Task {
                            if newValue {
                                await viewModel.enablePowerbank()
                            } else {
                                await viewModel.disablePowerbank()
                            }
                        }
                    }
                ))
                .disabled(viewModel.isLoading || !viewModel.usbStatus.cableAttached)
            } footer: {
                Text("启用后，U60 Pro 的电池会为连接的设备充电，这会更快消耗路由器电量。")
            }
        }
        .task { await viewModel.refresh() }
        .navigationTitle("USB 模式")
        .overlay {
            if viewModel.isLoading {
                ProgressView()
                    .padding()
                    .background(Color(.systemBackground).opacity(0.85), in: RoundedRectangle(cornerRadius: 8))
            }
        }
    }
}
