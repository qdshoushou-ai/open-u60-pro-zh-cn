import SwiftUI

struct STKMenuView: View {
    @Bindable var viewModel: STKViewModel

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

            ussdSection

            if viewModel.showUssdResponse {
                ussdResponseSection
            }

            stkSection
        }
        .navigationTitle("SIM 服务")
        .overlay {
            if viewModel.isLoading {
                ProgressView()
                    .padding()
                    .background(Color(.systemBackground).opacity(0.85), in: RoundedRectangle(cornerRadius: 8))
            }
        }
        .task { await viewModel.watchSTK() }
    }

    // MARK: - USSD

    private var ussdSection: some View {
        Section {
            HStack {
                TextField("USSD 代码（例如 *100#）", text: $viewModel.ussdCode)
                    .keyboardType(.phonePad)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)

                Button {
                    Task { await viewModel.sendUSSD() }
                } label: {
                    Image(systemName: "paperplane.fill")
                }
                .disabled(viewModel.ussdCode.isEmpty || viewModel.isLoading)
            }
        } header: {
            Text("USSD")
        } footer: {
            Text("发送运营商服务代码以查询余额、流量套餐等。")
        }
    }

    private var ussdResponseSection: some View {
        Section("响应") {
            Text(viewModel.ussdResponse.response.isEmpty
                 ? viewModel.ussdResponse.rawResponse
                 : viewModel.ussdResponse.response)
                .font(.body)
                .textSelection(.enabled)

            if viewModel.ussdResponse.sessionActive {
                HStack {
                    TextField("回复", text: $viewModel.ussdReply)
                        .keyboardType(.phonePad)

                    Button {
                        Task { await viewModel.respondUSSD() }
                    } label: {
                        Image(systemName: "arrow.up.circle.fill")
                    }
                    .disabled(viewModel.ussdReply.isEmpty || viewModel.isLoading)
                }

                Button(role: .destructive) {
                    Task { await viewModel.cancelUSSD() }
                } label: {
                    Label("结束会话", systemImage: "xmark.circle")
                }
            }
        }
    }

    // MARK: - STK

    private var stkSection: some View {
        Section {
            if !viewModel.stkReason.isEmpty {
                Text(viewModel.stkReason).foregroundStyle(.secondary)
            }
            if !viewModel.stkText.isEmpty {
                Text(viewModel.stkText).textSelection(.enabled)
            }
            ForEach(viewModel.stkMenu.items) { item in
                Button(item.label) {
                    Task { await viewModel.selectSTKItem(item) }
                }
                .disabled(viewModel.isLoading || viewModel.stkBusy)
            }
            if viewModel.stkType == "input" {
                if viewModel.stkYesNo {
                    HStack {
                        Button("是") { Task { await viewModel.respondSTK(yes: true) } }
                        Spacer()
                        Button("否") { Task { await viewModel.respondSTK(yes: false) } }
                    }
                } else {
                    Group {
                        if viewModel.stkHidden {
                            SecureField("SIM 响应", text: $viewModel.stkReply)
                        } else {
                            TextField("SIM 响应", text: $viewModel.stkReply)
                        }
                    }
                    .keyboardType(viewModel.stkDigitsOnly ? .phonePad : .default)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)
                    Text("请输入 \(viewModel.stkMin)–\(viewModel.stkMax) 个字符")
                        .font(.caption).foregroundStyle(.secondary)
                    Button("发送回复") { Task { await viewModel.respondSTK() } }
                }
            } else if viewModel.stkType == "display" {
                Button("继续") { Task { await viewModel.respondSTK() } }
            }
            if !viewModel.stkRootMenu && viewModel.stkType != "status" {
                Button("返回") { Task { await viewModel.goBackSTK() } }
                Button("结束 SIM 会话", role: .destructive) { Task { await viewModel.cancelSTK() } }
            }
            if viewModel.stkMenu.items.isEmpty && viewModel.stkType == "status" {
                Button("重新加载 SIM 菜单") { Task { await viewModel.loadSTKMenu() } }
            }
        } header: {
            Text(viewModel.stkMenu.title.isEmpty ? "SIM 工具箱" : viewModel.stkMenu.title)
        } footer: {
            Text("由 SIM 卡提供的运营商服务")
        }
        .disabled(viewModel.isLoading || viewModel.stkBusy)
    }
}
