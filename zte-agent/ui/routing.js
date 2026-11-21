'use strict';
(() => {
  const UI = OpenU60UI, API = OpenU60Console, R = OpenU60Routing;
  const {el,button,field,onoff,choices,say,request,json,confirm,mutate} = UI;
  const lanKeys = ['lan_ipaddr','lan_netmask','dhcp_enable','dhcp_start','dhcp_end','dhcp_lease_time'];
  const samples = new Map();
  const enabled = value => ['1','true','on'].includes(String(value).toLowerCase());
  const state = value => value === undefined || value === null || value === '' ? '未上报' : enabled(value) ? '已启用' : ['0','false','off'].includes(String(value).toLowerCase()) ? '已停用' : String(value);
  const readLAN = async()=>R.normalizeLAN(await request('/api/router/lan'));
  function setting(endpoint,keys) {
    return async()=>{
      const data = await request(endpoint);
      if (!data || !keys.every(key=>Object.hasOwn(data,key))) throw new Error('路由器返回的设置不完整');
      return R.normalizeSwitches(data);
    };
  }
  function summary(route,id,title,description,definitions) {
    const section = UI.panel(route,id,title,description), list = el('dl','routing-stats'), nodes = {};
    for (const [key,label,numeric] of definitions) {
      const pair = el('div'), value = el('dd',numeric ? 'mono' : '', '—');
      pair.append(el('dt','',label),value); list.append(pair); nodes[key] = {value,numeric};
    }
    const caption = el('p','reading-caption','等待实时路由器设置…'); section.append(list,caption);
    return {section,nodes,caption};
  }
  function values(summary,data) { for (const [key,{value,numeric}] of Object.entries(summary.nodes)) {
    const text = data[key] ?? '—'; if (numeric) OpenU60Numbers.set(value,text); else value.textContent=text;
  } }
  function stamp(summary,names) {
    const available = names.map(name=>samples.get(name));
    const received = available.filter(Boolean).map(sample=>sample.at);
    const unavailable = available.some(sample=>!sample || sample.unavailable);
    summary.caption.textContent = received.length ? `${API.connected && !unavailable ? '实时设置' : '最近接收的设置'} · ${new Date(Math.min(...received)).toLocaleTimeString()}${unavailable ? ' · 部分读数不可用' : ''}` : '等待实时路由器设置…';
    summary.caption.dataset.stale = String(!API.connected || unavailable);
  }
  const lanSummary = summary('network/lan','lan-overview','你的局域网','本地地址与移动网络连接相互独立。',[['address','路由器地址'],['dhcp','DHCP 服务器'],['pool','地址池地址数',true],['leases','已上报租约',true]]);
  const lanForm = UI.makeForm({route:'network/lan',id:'lan-config',title:'局域网地址与 DHCP',description:'选择本地网关与地址池。地址池内的地址必须属于同一子网，并排除路由器自身地址。',endpoint:'/api/router/lan',read:readLAN,source:'lan_config',liveData:data=>{try{return R.normalizeLAN(data);}catch{return null;}},guardKeys:lanKeys,
    fields:[field('lan_ipaddr','路由器 IPv4 地址',{required:true,placeholder:'192.168.0.1'}),field('lan_netmask','子网掩码',{required:true,placeholder:'255.255.255.0'}),onoff('dhcp_enable','DHCP 服务器'),field('dhcp_start','地址池起始地址',{help:'完整的 IPv4 地址，例如 192.168.0.100。'}),field('dhcp_end','地址池结束地址'),field('dhcp_lease_time','租约时长',{help:'可填秒数或时长（如 12h 或 1d）。现有单位会保留。'})],
    validate:(_,all)=>R.lanBody(all),body:(_,all)=>R.lanBody(all),
    warning:(_,all,baseline)=>`更改局域网或 DHCP 设置可能导致设备断开连接。${all.lan_ipaddr!==baseline.lan_ipaddr ? `控制台的新本地地址将为 ${new URL(R.reconnectURL(location.origin,all.lan_ipaddr)).host}。` : ''}${all.dhcp_enable==='0' ? '关闭 DHCP 后，设备需要手动分配地址或使用其他 DHCP 服务器。' : ''}保存后请重新连接局域网。`,
    onWriting:body=>{ reconnect.href=R.reconnectURL(location.origin,body.lan_ipaddr); reconnect.textContent=`在 ${new URL(reconnect.href).host} 打开控制台`; reconnectNote.hidden=false; },
    verify:(data,body)=>lanKeys.every(key=>key==='dhcp_lease_time' ? R.lease(data[key])===R.lease(body[key]) : String(data[key])===String(body[key]))
  });
  const reconnectNote = el('div','routing-reconnect'); reconnectNote.hidden=true;
  const reconnect = el('a','button'); reconnectNote.append(el('p','','如果控制台断开连接，请重新连接路由器的网络并打开此地址。未收到响应并不代表更改已生效。'),reconnect); lanForm.section.append(reconnectNote);
  const leases = UI.panel('network/lan','lan-leases','DHCP 租约','已上报的租约可能包含最近断开的设备。请为 DMZ 和端口转发目标使用稳定的设备地址。');
  const leaseWrap = el('div','table-scroll diagnostic-table'), leaseTable = el('table'), leaseHead = el('thead'), leaseHeader = el('tr'), leaseBody = el('tbody'); leaseTable.setAttribute('aria-label','DHCP 租约');
  for (const text of ['设备','地址','MAC 地址']) { const th=el('th','',text); th.scope='col'; leaseHeader.append(th); }
  leaseHead.append(leaseHeader); leaseTable.append(leaseHead,leaseBody); leaseWrap.append(leaseTable); leases.append(leaseWrap);
  function drawLeases() {
    const data = samples.get('clients')?.data;
    const entries = Array.isArray(data?.dhcp_leases) ? data.dhcp_leases : null;
    if (!entries?.length) { const row=el('tr'), cell=el('td','empty',entries ? '未上报 DHCP 租约。' : '租约读数不可用。'); cell.colSpan=3; row.append(cell); leaseBody.replaceChildren(row); return; }
    const existing = new Map([...leaseBody.children].map(row=>[row.dataset.key,row])), ordered=[];
    for (const [index,entry] of entries.entries()) {
      const key=JSON.stringify([entry.macaddr,entry.ipaddr,index]); let row=existing.get(key);
      if (!row) {row=el('tr');row.dataset.key=key;for(const label of ['设备','地址','MAC 地址']){const cell=el('td',label==='设备' ? '' : 'mono');cell.dataset.label=label;row.append(cell);}}
      [entry.hostname,entry.ipaddr,entry.macaddr].forEach((text,index)=>{row.children[index].textContent=text || '—';}); ordered.push(row);
    }
    const wanted=new Set(ordered); for(const row of [...leaseBody.children])if(!wanted.has(row))row.remove();
    ordered.forEach((row,index)=>{if(leaseBody.children[index]!==row)leaseBody.insertBefore(row,leaseBody.children[index] || null);});
  }
  const firewallSummary = summary('network/firewall','firewall-overview','入站访问','查看哪些服务可以接受来自局域网外部的连接。',[['firewall','防火墙'],['nat','NAT'],['upnp','UPnP'],['dmz','DMZ 主机']]);
  function simple({id,title,description,key,endpoint='/api/router/firewall',writeEndpoint,source='firewall_config',warning,values}) {
    return UI.makeForm({route:'network/firewall',id,title,description,endpoint,writeEndpoint,source,read:setting(endpoint,[key]),liveData:R.normalizeSwitches,guardKeys:[key],fields:[values ? choices(key,title,values) : onoff(key,title)],validate:(_,all)=>values ? undefined : R.switchValue(all[key],title),warning});
  }
  simple({id:'firewall-switch',title:'防火墙防护',description:'启用或停用路由器的入站防火墙。',key:'firewall_switch',writeEndpoint:'/api/router/firewall/switch',warning:'更改防火墙防护可能影响入站连接。停用后将移除路由器的入站过滤。要应用此更改吗？'});
  simple({id:'firewall-level',title:'防护级别',description:'使用路由器固件提供的过滤级别。',key:'firewall_level',writeEndpoint:'/api/router/firewall/level',values:[['low','低'],['medium','中'],['high','高']],warning:'不同的防火墙级别可能中断现有连接或阻断服务。要应用此级别吗？'});
  simple({id:'nat-config',title:'网络地址转换',description:'NAT 允许本地设备共享路由器的互联网地址。',key:'nat_switch',writeEndpoint:'/api/router/firewall/nat',warning:'更改 NAT 可能中断本地设备的互联网访问。请保持与路由器的本地连接。'});
  simple({id:'upnp-config',title:'UPnP',description:'允许本地设备上的应用自动请求入站端口映射。',key:'upnp_switch',endpoint:'/api/router/firewall/upnp',source:'upnp_config',warning:'UPnP 允许应用自动请求入站访问。要对本地网络中的设备应用此更改吗？'});
  UI.makeForm({route:'network/firewall',id:'dmz-config',title:'DMZ 主机',description:'将其他未匹配的入站连接转发到一台本地设备。请使用自带防火墙且地址稳定的设备。',endpoint:'/api/router/firewall',writeEndpoint:'/api/router/firewall/dmz',read:setting('/api/router/firewall',['dmz_enabled','dmz_ip']),liveData:R.normalizeSwitches,source:'firewall_config',guardKeys:['dmz_enabled','dmz_ip'],fields:[onoff('dmz_enabled','DMZ'),field('dmz_ip','目标 IPv4 地址',{placeholder:'192.168.0.10'})],
    validate:async(_,all)=>{R.switchValue(all.dmz_enabled,'DMZ');if(all.dmz_ip.trim())R.ipv4(all.dmz_ip,'DMZ 地址');if(all.dmz_enabled==='1')R.host(all.dmz_ip,await readLAN(),'DMZ 地址');},
    body:(_,all)=>({dmz_enabled:all.dmz_enabled,dmz_ip:all.dmz_ip.trim()}),preflight:async body=>{if(body.dmz_enabled==='1')R.host(body.dmz_ip,await readLAN(),'DMZ 地址');},
    warning:(_,all)=>all.dmz_enabled==='1' ? `DMZ 会将 ${all.dmz_ip} 暴露给其他未匹配的入站流量。启用 DMZ 前请确认此设备自带防火墙。` : '停用 DMZ 主机？发往它的入站连接可能中断。'
  });
  const portsSummary = summary('network/ports','ports-overview','显式入站连接','每条规则将一个外部端口映射到一台本地设备。移动运营商可能阻止入站流量或使用运营商级 NAT。',[['state','端口转发'],['rules','已上报规则',true],['enabled','已启用规则',true],['upnp','UPnP']]);
  UI.makeForm({route:'network/ports',id:'ports-switch',title:'端口转发服务',description:'全局开关控制已配置的端口转发规则是否生效。',endpoint:'/api/router/firewall',writeEndpoint:'/api/router/firewall/port-forward/switch',read:setting('/api/router/firewall',['port_forward_switch']),liveData:R.normalizeSwitches,source:'firewall_config',guardKeys:['port_forward_switch'],fields:[onoff('port_forward_switch','端口转发')],validate:(_,all)=>R.switchValue(all.port_forward_switch,'端口转发'),warning:'更改全局开关会影响所有已配置的端口转发规则。要应用此更改吗？'});
  const ports = UI.panel('network/ports','port-rules','转发规则','添加映射或删除已上报的规则。外部端口与内部端口必须在 1 到 65535 之间。'), toolbar = el('div','form-actions rule-toolbar');
  const reload = button('读取当前规则',()=>loadRules()); toolbar.append(reload); ports.append(toolbar);
  const ruleList = el('div','rule-list'), portCaption = el('p','reading-caption','等待实时规则读数…'); ports.append(ruleList,portCaption);
  const form = el('form','settings-form forward-editor'); form.autocomplete='off';
  const fields = el('fieldset','form-grid'); fields.disabled=true; fields.append(el('legend','form-group-heading','新建端口转发规则'));
  const inputs = {};
  for (const [key,label,options] of [['name','规则名称'],['protocol','协议',[['tcp','TCP'],['udp','UDP'],['tcp+udp','TCP + UDP']]],['wan_port','外部端口'],['lan_ip','本地设备地址'],['lan_port','内部端口'],['enabled','规则状态',[['1','已启用'],['0','已停用']]]]) {
    const wrapper=el('div','form-field'), labelNode=el('label','',label), input=el(options ? 'select' : 'input');input.id=`port-rule-${key}`;input.name=key;labelNode.htmlFor=input.id;
    if(options)for(const [value,text]of options)input.add(new Option(text,value));else{input.type='text';input.required=true;input.autocomplete='off';if(key.endsWith('_port')){input.inputMode='numeric';input.maxLength=5;}if(key==='name')input.maxLength=64;}
    wrapper.append(labelNode,input);fields.append(wrapper);inputs[key]=input;
  }
  const actions=el('div','form-actions'),add=button('添加规则',null,'primary'),discard=button('放弃草稿',resetDraft);add.type='submit';actions.append(add,discard);form.append(fields,actions);ports.append(form);const feedback=UI.status(ports);
  let rawRules=null, ruleEntries=[], attempted=false, loading=false, dirty=false, healthy=false;
  const draft=()=>Object.fromEntries(Object.entries(inputs).map(([key,input])=>[key,input.value]));
  function resetDraft(){form.reset();dirty=false;ports.dataset.dirty='false';updateActions();}
  function updateActions(){fields.disabled=!rawRules || !healthy || !API.connected;add.disabled=!dirty || !rawRules || !healthy || !API.connected;discard.disabled=!dirty;reload.disabled=loading || !API.connected;for(const card of ruleList.children)if(card.deleteButton)card.deleteButton.disabled=!API.connected || !healthy || !card.rule.removable;}
  form.addEventListener('input',()=>{dirty=!!(inputs.name.value || inputs.wan_port.value || inputs.lan_ip.value || inputs.lan_port.value);ports.dataset.dirty=String(dirty);updateActions();if(dirty)say(feedback,'规则未保存 · 实时更新会保留你的草稿。');});
  form.addEventListener('change',()=>form.dispatchEvent(new Event('input')));
  function applyRules(data){ruleEntries=R.rules(data);rawRules=data.rule_list;healthy=true;drawRules();updateActions();renderSummaries();}
  function drawRules(){
    if(!ruleEntries.length){ruleList.replaceChildren(el('p','empty','未配置端口转发规则。'));return;}
    const existing=new Map([...ruleList.children].filter(node=>node.dataset.ruleId).map(node=>[node.dataset.ruleId,node])),ordered=[];
    for(const [index,rule]of ruleEntries.entries()){
      const key=JSON.stringify([rule.id,index]);let card=existing.get(key);
      if(!card){card=el('article','rule-card');card.dataset.ruleId=key;const copy=el('div'),top=el('div','title-count'),title=el('h3'),tag=el('span','tag'),mapping=el('p','mono'),buttons=el('div','form-actions rule-actions'),remove=button('删除',()=>deleteRule(card.rule),'danger');top.append(title,tag);copy.append(top,mapping);buttons.append(remove);card.append(copy,buttons);Object.assign(card,{heading:title,tag,mapping,deleteButton:remove});}
      card.rule=rule;card.heading.textContent=rule.name || '未命名规则';card.tag.textContent=state(rule.enabled);card.mapping.textContent=`${String(rule.protocol || '未上报').toUpperCase()} · ${rule.wan_port || '—'} → ${rule.lan_ip || '—'}:${rule.lan_port || '—'}`;card.deleteButton.setAttribute('aria-label',`删除 ${rule.name || '未命名规则'}`);ordered.push(card);
    }
    const wanted=new Set(ordered);for(const card of [...ruleList.children])if(!wanted.has(card))card.remove();ordered.forEach((card,index)=>{if(ruleList.children[index]!==card)ruleList.insertBefore(card,ruleList.children[index] || null);});
  }
  async function loadRules(){
    if(loading || API.locked || !API.connected || UI.saving)return;loading=true;attempted=true;updateActions();const epoch=UI.epoch;
    try{const data=await request('/api/router/firewall/port-forward');if(!UI.current(epoch))return;applyRules(data);say(feedback,'当前规则已加载。');}
    catch(error){if(UI.current(epoch)){healthy=false;updateActions();say(feedback,`规则不可用。${error.message}。请读取当前规则后重试。`,true);}}
    finally{loading=false;updateActions();}
  }
  async function verifiedRules(check,current){
    for(const wait of [0,700,1400]){
      if(wait)await new Promise(resolve=>setTimeout(resolve,wait));if(!current())return false;
      const data=await request('/api/router/firewall/port-forward');if(!current())return false;applyRules(data);if(check(ruleEntries))return true;
    }
    return false;
  }
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(!dirty || !healthy || !form.reportValidity() || UI.saving)return;const epoch=UI.epoch;
    try{
      const all=draft(),body=R.portBody(all,await readLAN(),ruleEntries);if(!UI.current(epoch))return;
      if(!await confirm('添加端口转发规则',`将入站 ${body.protocol.toUpperCase()} 端口 ${body.wan_port} 转发到 ${body.lan_ip}:${body.lan_port}？该规则将处于${body.enabled==='1' ? '启用' : '停用'}状态。`,{label:'添加规则'}))return;
      await mutate(feedback,async current=>{
        const [latest,lan]=await Promise.all([request('/api/router/firewall/port-forward'),readLAN()]);if(!current())return;
        R.portBody(all,lan,R.rules(latest));say(feedback,'正在添加规则…');healthy=false;updateActions();
        await request('/api/router/firewall/port-forward',json('POST',body));if(!current())return;
        const matched=await verifiedRules(entries=>entries.some(rule=>['name','protocol','wan_port','lan_ip','lan_port','enabled'].every(key=>String(rule[key])===String(body[key]))),current);if(!current())return;
        if(matched){resetDraft();say(feedback,'规则已添加，并已由路由器确认。');}else{healthy=false;say(feedback,'请求已接受，但规则尚未确认。你的草稿已保留。重试前请先读取当前规则。',true);}
      });
    }catch(error){if(UI.current(epoch))say(feedback,error.message,true);}finally{updateActions();}
  });
  async function deleteRule(rule){
    if(!rawRules || !healthy || !rule.removable || UI.saving)return;
    const expected=JSON.parse(JSON.stringify(rawRules));
    if(!await confirm('删除端口转发规则',`删除${rule.name || '此规则'}（协议 ${rule.protocol || '未上报'}，端口 ${rule.wan_port || '未上报'}）？使用它的入站连接将中断。`,{label:'删除规则',destructive:true}))return;
    await mutate(feedback,async current=>{
      const latest=await request('/api/router/firewall/port-forward');if(!current())return;R.rules(latest);
      if(R.canonical(latest.rule_list)!==R.canonical(expected)){applyRules(latest);say(feedback,'规则列表已变化。删除前请查看当前规则。',true);return;}
      healthy=false;updateActions();say(feedback,'正在删除规则…');
      await request('/api/router/firewall/port-forward',json('POST',{action:'delete',id:rule.id,expected_rules:expected}));if(!current())return;
      const matched=await verifiedRules(entries=>entries.length===expected.length-1 && R.canonical(entries.map(entry=>{const {id,...raw}=entry.raw;return raw;}))===R.canonical(expected.filter((_,index)=>ruleEntriesId(expected[index],index)!==rule.id).map(entry=>{const {id,...raw}=entry;return raw;})),current);if(!current())return;
      if(matched)say(feedback,'规则已删除，并已由路由器确认。');else{healthy=false;say(feedback,'删除尚未确认。进行其他更改前请先读取当前规则。',true);}
    });updateActions();
  }
  const ruleEntriesId=(rule,index)=>String(rule.id ?? index);
  UI.track({route:'network/ports',get loaded(){return attempted;},get dirty(){return dirty;},load:loadRules,clear(){rawRules=null;ruleEntries=[];attempted=false;loading=false;healthy=false;resetDraft();ruleList.replaceChildren();say(feedback,'解锁控制台后可加载规则。');updateActions();}});
  UI.makeForm({route:'network/qos',id:'qos-config',title:'流量优先级',description:'使用路由器内置的流量策略。此控制台不提供单设备优先级和自定义带宽限制。',endpoint:'/api/router/qos',read:setting('/api/router/qos',['qos_switch']),liveData:R.normalizeSwitches,source:'qos_config',guardKeys:['qos_switch'],fields:[onoff('qos_switch','服务质量（QoS）')],validate:(_,all)=>R.switchValue(all.qos_switch,'服务质量（QoS）'),warning:'更改流量优先级可能影响正在进行的传输。要应用路由器的 QoS 设置吗？'});
  UI.makeForm({route:'network/ttl',id:'ttl-config',title:'出站数据包生存时间',description:'在蜂窝软件路径上改写出站数据包。Qualcomm 硬件加速可能在某些接口或已建立的流上绕过这些规则。',endpoint:'/api/router/ttl',
    fields:[choices('enabled','TTL 改写',[['true','开'],['false','关']],{boolean:true}),field('ipv4_ttl','IPv4 TTL',{type:'number',min:1,max:255,help:'离开蜂窝接口的 IPv4 数据包所使用的值。'}),field('ipv6_hop_limit','IPv6 跳数限制',{type:'number',min:1,max:255,help:'离开蜂窝接口的 IPv6 数据包所使用的值。'})],
    validate:(_,all)=>{for(const [key,label] of [['ipv4_ttl','IPv4 TTL'],['ipv6_hop_limit','IPv6 跳数限制']]){const value=Number(all[key]);if(!Number.isInteger(value)||value<1||value>255)throw new Error(`${label}必须为 1 到 255 之间的整数。`);}},
    warning:(_,all)=>all.enabled==='true' ? `启用出站数据包改写（IPv4 TTL 为 ${all.ipv4_ttl}，IPv6 跳数限制为 ${all.ipv6_hop_limit}）？此更改会立即生效；不会重连移动数据、重启防火墙或停用硬件加速。` : '停用 Agent 的数据包 TTL 与跳数限制规则？'
  });
  const qosSummary=summary('network/qos','qos-overview','路由器流量策略','固件内置策略的实时状态。',[['state','服务质量（QoS）']]);
  function renderSummaries(){
    let lan=samples.get('lan_config')?.data;try{lan=R.normalizeLAN(lan);}catch{lan=null;}
    const clientData=samples.get('clients')?.data,firewall=samples.get('firewall_config')?.data,upnp=samples.get('upnp_config')?.data,qos=samples.get('qos_config')?.data;
    let pool='—';if(lan?.dhcp_enable==='0')pool=0;else if(lan)try{const start=R.host(lan.dhcp_start,lan),end=R.host(lan.dhcp_end,lan);if(end>=start)pool=end-start+1;}catch{/* Invalid ranges stay unreported. */}
    values(lanSummary,{address:lan?.lan_ipaddr,dhcp:state(lan?.dhcp_enable),pool,leases:Array.isArray(clientData?.dhcp_leases) ? clientData.dhcp_leases.length : '—'});stamp(lanSummary,['lan_config','clients']);
    values(firewallSummary,{firewall:state(firewall?.firewall_switch),nat:state(firewall?.nat_switch),upnp:state(upnp?.upnp_switch),dmz:firewall?.dmz_enabled===undefined ? '未上报' : enabled(firewall.dmz_enabled) ? firewall.dmz_ip || '未上报地址' : '已停用'});stamp(firewallSummary,['firewall_config','upnp_config']);
    values(portsSummary,{state:state(firewall?.port_forward_switch),rules:rawRules ? ruleEntries.length : '—',enabled:rawRules ? ruleEntries.filter(rule=>enabled(rule.enabled)).length : '—',upnp:state(upnp?.upnp_switch)});stamp(portsSummary,['firewall_config','port_rules','upnp_config']);portCaption.textContent=portsSummary.caption.textContent;portCaption.dataset.stale=portsSummary.caption.dataset.stale;
    values(qosSummary,{state:state(qos?.qos_switch)});stamp(qosSummary,['qos_config']);
  }
  window.addEventListener('dashboard:readings',event=>{
    if(event.detail.snapshot)for(const name of ['lan_config','firewall_config','upnp_config','port_rules','qos_config'])if(samples.has(name))samples.get(name).unavailable=true;
    for(const name of ['lan_config','firewall_config','upnp_config','port_rules','qos_config','clients']){
      const reading=event.detail.readings[name];if(!reading)continue;
      const previous=samples.get(name);let usable=!!reading.ok && !!reading.data;
      if(usable)try{if(name==='lan_config')R.normalizeLAN(reading.data);if(name==='port_rules')R.rules(reading.data);if(name==='clients' && !Array.isArray(reading.data.dhcp_leases))usable=false;}catch{usable=false;}
      if(usable)samples.set(name,{data:reading.data,at:Date.now(),unavailable:false});else if(previous)previous.unavailable=true;
      if(name==='port_rules'){
        if(usable)try{if(!UI.saving)applyRules(reading.data);}catch{healthy=false;if(previous)previous.unavailable=true;}
        else healthy=false;
      }
    }
    renderSummaries();drawLeases();updateActions();
  });
  window.addEventListener('dashboard:mutation-complete',updateActions);
  window.addEventListener('dashboard:connection',()=>{renderSummaries();updateActions();});
  window.addEventListener('dashboard:locked',()=>{samples.clear();reconnectNote.hidden=true;reconnect.removeAttribute('href');reconnect.textContent='';drawLeases();renderSummaries();});
  renderSummaries();drawLeases();
})();
