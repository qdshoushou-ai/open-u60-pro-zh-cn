package com.openu60.core.network

sealed class AgentError(override val message: String, override val cause: Throwable? = null) : Exception(message, cause) {
    class Unauthorized : AgentError("未认证，请登录。")
    class ServerError(msg: String) : AgentError("服务器错误：$msg")
    class NetworkError(msg: String, cause: Throwable? = null) : AgentError("网络错误：$msg", cause)
    class DecodingError(msg: String) : AgentError("响应解析失败：$msg")
    class ServerUnreachable : AgentError("无法连接 Agent")
    class Timeout : AgentError("请求超时")
}
