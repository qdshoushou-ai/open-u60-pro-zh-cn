import { hashPassword } from "./crypto";

const ANON = "00000000000000000000000000000000";
let rpcId = 0;

function ubusUrl(gateway: string): string {
  return `http://${gateway}/ubus/?t=${Date.now()}`;
}

export async function rpc(
  gateway: string,
  session: string,
  obj: string,
  method: string,
  params: Record<string, unknown>
): Promise<unknown[]> {
  const url = ubusUrl(gateway);
  const payload = [
    {
      jsonrpc: "2.0",
      id: ++rpcId,
      method: "call",
      params: [session, obj, method, params],
    },
  ];

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

  let data = await res.json();
  if (!Array.isArray(data)) data = [data];
  if (data.length === 0) throw new Error("路由器返回空响应");

  const entry = data[0];
  if (entry.error) {
    throw new Error(`ubus 错误：${JSON.stringify(entry.error)}`);
  }
  return entry.result;
}

export async function enableADB(
  gateway: string,
  password: string
): Promise<void> {
  const saltResult = await rpc(
    gateway,
    ANON,
    "zwrt_web",
    "web_login_info",
    {}
  );
  if (!Array.isArray(saltResult) || saltResult.length < 2) {
    throw new Error("salt 响应异常，网关 IP 是否正确？");
  }
  const info = saltResult[1] as Record<string, string>;
  const salt = info.zte_web_sault || info.salt;
  if (!salt) {
    throw new Error("未返回 salt，可能无法连接路由器。");
  }

  const hashed = await hashPassword(password, salt);

  const loginResult = await rpc(gateway, ANON, "zwrt_web", "web_login", {
    password: hashed,
  });
  if (!Array.isArray(loginResult) || loginResult.length < 2) {
    throw new Error("登录失败，请检查密码后重试。");
  }
  const session = (loginResult[1] as Record<string, string>)
    .ubus_rpc_session;
  if (!session || session === ANON) {
    throw new Error("登录被拒绝，密码错误或会话已过期。");
  }

  const usbResult = await rpc(gateway, session, "zwrt_bsp.usb", "set", {
    mode: "debug",
  });
  if (Array.isArray(usbResult) && usbResult[0] !== 0) {
    throw new Error(
      `USB 模式切换失败（代码\u00a0${usbResult[0]}），请重试。`
    );
  }
}
