import SwiftUI

struct TelemetryBlockerView: View {
    @Bindable var viewModel: TelemetryBlockerViewModel

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

            Section("域名过滤") {
                LabeledContent("状态") {
                    Text(viewModel.filterConfig.enabled ? "已启用" : "已停用")
                        .foregroundStyle(viewModel.filterConfig.enabled ? .green : .secondary)
                }

                Button(viewModel.filterConfig.enabled ? "停用过滤" : "启用过滤") {
                    Task { await viewModel.toggleFilter(enabled: !viewModel.filterConfig.enabled) }
                }
                .disabled(viewModel.isLoading)
            }

            Section("快捷操作") {
                Button("阻止全部 ZTE 遥测") {
                    Task { await viewModel.blockAllTelemetry() }
                }
                .disabled(viewModel.isLoading)

                ForEach(TelemetryParser.knownTelemetryDomains, id: \.self) { domain in
                    let isBlocked = viewModel.filterConfig.rules.contains { $0.domain == domain }
                    HStack {
                        Text(domain)
                            .font(.caption)
                        Spacer()
                        Image(systemName: isBlocked ? "checkmark.circle.fill" : "circle")
                            .foregroundStyle(isBlocked ? .green : .secondary)
                    }
                }
            }

            Section {
                HStack {
                    TextField("要阻止的域名", text: $viewModel.newDomain)
                        .keyboardType(.URL)
                        .textContentType(.URL)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)

                    Button("添加") {
                        Task { await viewModel.addDomain(viewModel.newDomain) }
                    }
                    .disabled(viewModel.newDomain.trimmingCharacters(in: .whitespaces).isEmpty || viewModel.isLoading)
                }
            } header: {
                Text("添加自定义域名")
            }

            if !viewModel.filterConfig.rules.isEmpty {
                Section("已阻止域名") {
                    ForEach(viewModel.filterConfig.rules) { rule in
                        HStack {
                            VStack(alignment: .leading) {
                                Text(rule.domain)
                                    .font(.body)
                                Text(rule.enabled ? "已启用" : "未启用")
                                    .font(.caption)
                                    .foregroundStyle(rule.enabled ? .green : .secondary)
                            }
                            Spacer()
                            Button(role: .destructive) {
                                Task { await viewModel.removeDomain(rule) }
                            } label: {
                                Image(systemName: "trash")
                            }
                            .disabled(viewModel.isLoading)
                        }
                    }
                }
            }
        }
        .navigationTitle("遥测拦截")
        .refreshable { await viewModel.refresh() }
        .overlay {
            if viewModel.isLoading {
                ProgressView()
                    .padding()
                    .background(Color(.systemBackground).opacity(0.85), in: RoundedRectangle(cornerRadius: 8))
            }
        }
        .task { await viewModel.refresh() }
    }
}
