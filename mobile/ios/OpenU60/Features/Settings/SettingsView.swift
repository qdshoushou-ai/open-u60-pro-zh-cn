import SwiftUI

struct SettingsView: View {
    @State private var viewModel: SettingsViewModel
    @FocusState private var gatewayFieldFocused: Bool

    init(client: AgentClient) {
        _viewModel = State(initialValue: SettingsViewModel(client: client))
    }

    var body: some View {
        @Bindable var vm = viewModel
        NavigationStack {
            Form {
                Section {
                    HStack {
                        TextField("网关 IP", text: $vm.gatewayIP)
                            .keyboardType(.decimalPad)
                            .autocorrectionDisabled()
                            .focused($gatewayFieldFocused)
                            .onSubmit { viewModel.commitGatewayIP() }
                            .onChange(of: gatewayFieldFocused) { _, isFocused in
                                if !isFocused { viewModel.commitGatewayIP() }
                            }
                            // Detection walks the client's base URL across candidates; an edit
                            // committed mid-probe would fight it for the same property.
                            .disabled(viewModel.isDetectingGateway)
                        Button("检测") {
                            gatewayFieldFocused = false
                            Task { await viewModel.autoDetectGateway() }
                        }
                        .buttonStyle(.bordered)
                        .font(.caption)
                        .disabled(viewModel.isDetectingGateway)
                        if viewModel.isDetectingGateway {
                            ProgressView()
                        }
                    }
                } header: {
                    Text("网关")
                } footer: {
                    if viewModel.detectionFailed {
                        Text("常用网关地址上均无 Agent 响应，仍在使用之前的地址。")
                    }
                }

                Section("认证") {
                    if viewModel.hasStoredPassword {
                        HStack {
                            Text("密码已存入钥匙串")
                                .foregroundStyle(.secondary)
                            Spacer()
                            Button("清除", role: .destructive) {
                                viewModel.clearPassword()
                            }
                            .font(.caption)
                        }
                    }
                    SecureField("新密码", text: $vm.passwordInput)
                    Button("保存到钥匙串") {
                        withAnimation { viewModel.savePassword() }
                    }
                    .disabled(viewModel.passwordInput.isEmpty)
                }

                Section {
                    VStack(alignment: .leading) {
                        Text("刷新间隔：\(viewModel.pollInterval, specifier: "%.1f")s")
                        Slider(value: $vm.pollInterval, in: 1...10, step: 0.5)
                            .accessibilityLabel("刷新间隔")
                            .accessibilityValue(String(format: "%.1f 秒", viewModel.pollInterval))
                    }
                } header: {
                    Text("轮询")
                } footer: {
                    Text("实时上传和下载使用独立的 1 秒刷新，与调制解调器的更新频率一致。")
                }

                Section("外观") {
                    Picker("主题", selection: $vm.darkModeOverride) {
                        Text("跟随系统").tag(0)
                        Text("浅色").tag(1)
                        Text("深色").tag(2)
                    }
                    .pickerStyle(.segmented)
                }

                Section("关于") {
                    LabeledContent("App", value: "OpenU60")
                    LabeledContent("设备", value: "ZTE U60 Pro (MU5250)")
                    LabeledContent("API", value: "zte-agent REST")
                }

                Section("法律信息") {
                    Text("本 App 与中兴通讯（ZTE）无隶属关系，也未获得其认可或赞助。ZTE 和 U60 Pro 是中兴通讯（ZTE）的商标。")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Link("隐私政策", destination: URL(string: "https://open-u60-pro.vercel.app/privacy")!)
                }
            }
            .navigationTitle("设置")
            .overlay {
                if viewModel.showSavedConfirmation {
                    savedToast
                }
            }
            .task { await viewModel.refreshStoredPasswordState() }
        }
    }

    private var savedToast: some View {
        Text("密码已保存")
            .font(.subheadline.weight(.medium))
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(Color(.systemBackground).opacity(0.85), in: RoundedRectangle(cornerRadius: 10))
            .transition(.move(edge: .top).combined(with: .opacity))
            .task {
                try? await Task.sleep(for: .seconds(1.5))
                withAnimation { viewModel.showSavedConfirmation = false }
            }
    }
}
