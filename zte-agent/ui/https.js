'use strict';
(() => {
  const UI=OpenU60UI, API=OpenU60Console, {el,button}=UI, route='settings/https';
  let data=null, epoch=0;
  const panel=UI.panel(route,'https-settings','HTTPS 与安装','使用路由器的证书颁发机构实现安全的本地访问。每台设备只需信任一次。');
  const facts=el('dl','settings-facts'), nodes={};
  for(const [key,label] of [['state','HTTPS'],['expires','证书有效期至'],['clock','路由器时钟'],['authority','证书颁发机构'],['scope','可担保范围'],['fingerprint','SHA-256 指纹'],['sha1','Windows 用的 SHA-1 指纹']]){
    const row=el('div'), value=el('dd',key==='fingerprint'||key==='sha1'?'mono https-fingerprint':'','—');value.id=`https-${key}`;row.append(el('dt','',label),value);facts.append(row);nodes[key]=value;
  }
  const addresses=el('div','form-actions'), actions=el('div','form-actions diagnostic-actions'), feedback=el('p','action-status'), caption=el('p','reading-caption','等待 HTTPS 状态…');feedback.setAttribute('role','status');
  async function change(kind){
    const current=epoch, snapshot=data;
    if(!snapshot||API.locked)return;
    const date=Number.isFinite(snapshot.clock_utc)?new Date(snapshot.clock_utc*1000).toLocaleString(): '未上报';
    const details=kind==='reset'?'移除路由器的 HTTPS 证书并关闭其 HTTPS 监听。之后请从你的设备中移除旧的证书颁发机构。如果你当前正在使用 HTTPS，更改后请重新打开路由器的 HTTP 地址。':`${kind==='on'?'启用 HTTPS 需使用':'续订证书需使用'}路由器的证书颁发机构。路由器时钟为 ${date}${snapshot.clock_verified?'（已验证）':'（未独立验证）'}。设备必须先信任路由器的证书颁发机构，才能打开其 HTTPS 地址。`;
    if(!await UI.confirm(kind==='reset'?'重置 HTTPS？':kind==='renew'?'续订证书？':'启用 HTTPS？',details,{label:kind==='reset'?'重置 HTTPS':kind==='renew'?'续订证书':'启用 HTTPS',destructive:kind==='reset',typed:kind==='reset'}))return;
    if(current!==epoch||API.locked||OpenU60Navigation.current.key!==route)return;
    await UI.mutate(feedback,async active=>{const result=await UI.request(`/api/https/${kind}`,UI.json('POST',{confirm:true}));if(active()&&current===epoch){draw(result);UI.say(feedback,kind==='reset'?'HTTPS 已重置。请打开路由器的 HTTP 地址以继续。':kind==='renew'?'证书已续订。':'HTTPS 已启用。请先在此设备上安装证书，再打开 HTTPS 地址。');}});
  }
  const enable=button('启用 HTTPS',()=>change('on'),'primary'), renew=button('续订证书',()=>change('renew')), reset=button('重置 HTTPS',()=>change('reset'),'danger');
  for(const node of [enable,renew,reset])node.disabled=true;
  actions.append(enable,renew,reset);panel.append(facts,addresses,actions,feedback,caption);
  const install=UI.panel(route,'https-install','安装到你的设备','只需安装此路由器的公共证书，然后打开它的任一 HTTPS 地址。私钥始终不会离开路由器。');
  const downloads=el('div','form-actions');
  for(const [label,href]of[['iPhone 与 iPad 描述文件','/ui/https/u60-pro-ca.mobileconfig'],['Android、Mac 与 Windows 证书','/ui/https/u60-pro-ca.crt']]){const link=el('a','button',label);link.href=href;link.setAttribute('download','');downloads.append(link);}downloads.hidden=true;
  const trust=el('p','panel-note','在信任此证书之前，请将上方的 SHA-256 指纹与设备上显示的指纹进行比对。若要进行可信比对，请在已信任此路由器的设备上通过 HTTPS 打开本页面，或通过 SSH 使用 sha256sum /data/zte-agent-tls/ca.crt 进行比对。明文 HTTP 可能被网络上的他人篡改。');
  const steps=el('dl','settings-facts');
  for(const [name,text]of[['iPhone 与 iPad','下载描述文件。打开“设置”→“已下载描述文件”→“安装”。然后打开“设置”→“通用”→“关于本机”→“证书信任设置”：为路由器的证书颁发机构启用完全信任。在 Safari 中，使用“分享”→“添加到主屏幕”。'],['Android','下载证书。在“设置”中搜索“安装 CA 证书”，用屏幕锁定确认并选择该文件。打开上方的 HTTPS 地址，然后使用浏览器的“安装”或“添加到主屏幕”选项。'],['Mac','下载证书并在“钥匙串访问”中打开。打开其“信任”部分并选择“始终信任”。在 Safari 中打开上方的 HTTPS 地址，然后选择“文件”→“添加到程序坞”。'],['Windows','打开证书 →“安装证书”→“当前用户”→“将所有证书放入下列存储”→“受信任的根证书颁发机构”。将 Windows 的 SHA-1 指纹（Thumbprint）与上方数值进行比对。在 Chrome 或 Edge 中打开 HTTPS 地址并选择“安装”。']]){const row=el('div');row.append(el('dt','',name),el('dd','',text));steps.append(row);}
  install.append(downloads,trust,steps,el('p','panel-note','使用私有 DNS、VPN 或浏览器 DNS-over-HTTPS 的设备可能无法解析路由器的本地名称；请使用其上列出的局域网地址。每个来源地址都会保留各自的控制台登录状态。'));
  function draw(value){
    data=value;nodes.state.textContent=value.enabled?(value.listening?'已开启':'已开启 · 未监听'):'已关闭';
    nodes.expires.textContent=value.not_after?new Date(value.not_after*1000).toLocaleDateString()+(value.renew_due?' · 需要续订':''):'未上报';
    nodes.clock.textContent=Number.isFinite(value.clock_utc)?new Date(value.clock_utc*1000).toLocaleString()+(value.clock_verified?' · 已验证':' · 未独立验证'):'未上报';
    nodes.authority.textContent=value.ca_name||value.kept_ca||'未创建';nodes.scope.textContent=(value.ca_covers||[]).join(', ')||'未上报';nodes.fingerprint.textContent=value.ca_sha256||'未上报';nodes.sha1.textContent=value.ca_sha1||'未上报';
    addresses.replaceChildren();for(const url of value.urls||[]){try{const parsed=new URL(url);if(parsed.protocol!=='https:'||parsed.username||parsed.password)continue;const link=el('a','button',url);link.href=parsed.href;link.rel='noreferrer';addresses.append(link);}catch{}}
    enable.hidden=!!value.enabled&&!!value.listening;enable.textContent=value.enabled?'重试 HTTPS':'启用 HTTPS';renew.hidden=!value.enabled;for(const node of [enable,renew,reset])node.disabled=false;downloads.hidden=!value.enabled;
    caption.textContent=(API.connected?'实时 HTTPS 状态':'最近接收的 HTTPS 状态')+(value.error?` · ${value.error}`:'');caption.dataset.stale=String(!API.connected);
  }
  function clear(){epoch++;data=null;for(const value of Object.values(nodes))value.textContent='—';addresses.replaceChildren();downloads.hidden=true;for(const node of[enable,renew,reset])node.disabled=true;feedback.textContent='';caption.textContent='等待 HTTPS 状态…';}
  window.addEventListener('dashboard:readings',event=>{if(OpenU60Navigation.current.key!==route)return;const reading=event.detail.readings.https_status;if(reading?.ok)draw(reading.data);else if(reading){caption.textContent='HTTPS 状态不可用。';caption.dataset.stale='true';}});
  window.addEventListener('dashboard:locked',clear);window.addEventListener('dashboard:navigate',()=>{if(OpenU60Navigation.current.key!==route)clear();});
  window.addEventListener('dashboard:connection',()=>{if(data){caption.dataset.stale=String(!API.connected);if(!API.connected)caption.textContent='最近接收的 HTTPS 状态 · 连接已中断。';}});
})();
