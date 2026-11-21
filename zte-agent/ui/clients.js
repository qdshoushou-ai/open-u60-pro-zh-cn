'use strict';
(() => {
  const UI=OpenU60UI,API=OpenU60Console,M=OpenU60Clients,{el}=UI;
  const host=document.querySelector('#devices');
  const detail=el('div','client-detail-view');detail.dataset.views='network/clients';detail.dataset.viewHidden=String(OpenU60Navigation.current.key!=='network/clients');
  const intro=el('p','section-subtitle','来自路由器的逐设备测量数据。Wi-Fi 流量包含本地传输以及互联网使用量。');
  const overview=el('dl','client-overview'),counts={};
  for(const [key,label]of [['connected','已确认连接'],['known','已上报设备']]){const pair=el('div'),value=el('dd','mono','—');pair.append(el('dt','',label),value);counts[key]=value;overview.append(pair);}
  const tools=el('div','client-view-tools'),label=el('label','','显示设备'),filter=el('select');filter.id='client-status-filter';label.htmlFor=filter.id;
  for(const [value,text]of [['all','所有已上报设备'],['connected','已确认连接'],['known','未确认连接']])filter.add(new Option(text,value));tools.append(label,filter);
  const caption=el('p','reading-caption','正在等待详细的设备读数……'),routerCaps=el('p','client-router-limits'),list=el('div','client-card-list');list.id='client-detail-list';list.setAttribute('aria-label','设备连接详情');
  detail.append(overview,tools,caption,list,routerCaps,intro);host.querySelector('.table-scroll').after(detail);
  let base=null,details=null,receivedAt=null,available=false,stream='connecting',expiryTimer;
  const search=document.querySelector('#device-search'),cards=new Map();
  const live=()=>API.connected && stream==='live' && available && receivedAt!==null && Date.now()-receivedAt<10000 && !document.hidden;
  function expire(){clearTimeout(expiryTimer);if(receivedAt!==null && !document.hidden)expiryTimer=setTimeout(render,Math.max(1,10001-(Date.now()-receivedAt)));}
  function metric(group,key,label,nodes){const pair=el('div'),value=el('dd','mono','未上报');value.dataset.metric=key;pair.append(el('dt','',label),value);group.append(pair);nodes[key]=value;}
  function card(key){
    const node=el('article','client-card');node.dataset.mac=key;const top=el('div','client-card-heading'),copy=el('div'),name=el('h3'),kind=el('p','client-connection'),badge=el('span','tag');copy.append(name,kind);top.append(copy,badge);
    const identity=el('dl','client-identity'),identityNodes={};for(const [key,label]of [['mac','MAC 地址'],['ipv4','IPv4 地址'],['ipv6','IPv6 地址'],['address_source','地址分配']]){const pair=el('div'),value=el('dd','mono');pair.append(el('dt','',label),value);identity.append(pair);identityNodes[key]=value;}
    const traffic=el('dl','client-speeds'),numbers={};metric(traffic,'download','当前下载',numbers);metric(traffic,'upload','当前上传',numbers);
    const more=el('dl','client-measurements');for(const [key,label]of [['downloadLimit','配置的下载上限'],['uploadLimit','配置的上传上限'],['downloadPeak','观测到的下载峰值'],['uploadPeak','观测到的上传峰值']])metric(more,key,label,numbers);
    const extra=el('details','client-radio-details'),extraFields=el('dl','client-measurements');extra.append(el('summary','','链路与传输详情'),extraFields);
    for(const [key,label]of [['downloadTotal','本次 Wi-Fi 关联期间下载量'],['uploadTotal','本次 Wi-Fi 关联期间上传量'],['downloadLink','Wi-Fi 下行链路速率'],['uploadLink','Wi-Fi 上行链路速率'],['signal','Wi-Fi 信号'],['duration','连接时长']])metric(extraFields,key,label,numbers);
    const note=el('p','client-sample-note'),limitsNote=el('p','field-help client-limit-note','逐设备配置的上限仅在已上报时显示。“未上报”不代表不限速。');
    node.append(top,traffic,identity,more,extra,note,limitsNote);return {node,name,kind,badge,identityNodes,numbers,note};
  }
  function duration(value){const n=M.number(value);if(n===null)return '未上报';if(n<60)return `${Math.floor(n)} s`;if(n<3600)return `${Math.floor(n/60)} min`;return `${Math.floor(n/3600)} h ${Math.floor(n%3600/60)} min`;}
  function update(view,item){
    const connected=live() && item.connected===true && !item.connection_stale,current=connected && !item.telemetry_stale;
    view.name.textContent=item.name;view.name.title=item.name;view.kind.textContent=`${M.connection(item)}${item.interface ? ` · ${item.interface}` : ''}`;
    view.badge.textContent=item.connected===true ? connected ? '已连接' : '最近上报为已连接' : item.connected===false ? '未连接' : '连接未确认';view.badge.dataset.connected=String(connected);
    for(const [key,node]of Object.entries(view.identityNodes))node.textContent=['ipv4','ipv6'].includes(key) ? item[key].join(', ') || '未上报' : String(item[key] || '未上报');
    const traffic=item.traffic || {},peaks=item.peaks || {},limits=item.limits || {},link=item.link || {};
    const signal=Number(link.signal_dbm),signalText=link.signal_dbm!==null && link.signal_dbm!==undefined && Number.isFinite(signal) && signal<=0 && signal>=-127 ? `${signal.toFixed(0)} dBm` : '未上报';
    const value={download:M.rate(current ? traffic.download_bps : null,'—'),upload:M.rate(current ? traffic.upload_bps : null,'—'),downloadLimit:M.rate(limits.download_bps),uploadLimit:M.rate(limits.upload_bps),downloadPeak:M.rate(peaks.download_bps),uploadPeak:M.rate(peaks.upload_bps),downloadTotal:M.bytes(traffic.download_bytes),uploadTotal:M.bytes(traffic.upload_bytes),downloadLink:link.download_mbps===undefined || M.number(link.download_mbps)===null ? '未上报' : `${Number(link.download_mbps).toFixed(1)} Mbps`,uploadLink:link.upload_mbps===undefined || M.number(link.upload_mbps)===null ? '未上报' : `${Number(link.upload_mbps).toFixed(1)} Mbps`,signal:signalText,duration:duration(item.connected_seconds)};
    for(const [key,text]of Object.entries(value))OpenU60Numbers.set(view.numbers[key],text);
    const since=M.number(peaks.since),period=since!==null ? ` 峰值是自 ${new Date(since).toLocaleTimeString()} 起、本页监控期间采样的最高速率。` : ' 峰值需要至少两次计数器读数。';
    view.note.textContent=`${current ? '' : '当前显示最近上报的详情。 '}${traffic.scope==='wifi_link' ? '流量统计的是此设备的 Wi-Fi 传输量，包括本地流量。' : '路由器未上报此连接的逐设备流量计数器。'}${period} Wi-Fi 链路速率描述的是射频连接。`;
  }
  function render(){
    const items=M.merge(base,details),query=search.value;
    OpenU60Numbers.set(counts.known,base || details ? items.length : '—');
    OpenU60Numbers.set(counts.connected,details && available ? items.filter(item=>item.connected===true && !item.connection_stale).length : '—');
    overview.querySelector('dt').textContent=live() || !details ? '已确认连接' : '最近确认连接';
    caption.textContent=receivedAt ? `${live() ? '实时设备读数' : '最近接收的设备读数'} · ${new Date(receivedAt).toLocaleTimeString()}${available ? details?.inventory_complete ? '' : ' · 部分连接来源不可用' : ' · 详细来源不可用'}` : '正在等待详细的设备读数……名称和地址仍可从主机提示和 DHCP 租约获取。';caption.dataset.stale=String(!live());
    const caps=details?.router_limits;routerCaps.textContent=caps && (M.number(caps.upload_bps)!==null || M.number(caps.download_bps)!==null) ? `路由器级配置上限：下载 ${M.rate(caps.download_bps)} · 上传 ${M.rate(caps.upload_bps)}。这些上限适用于路由器，而非单台设备。` : '未上报路由器级速度限制。配置的设备上限和观测到的峰值会分别显示在下方。';
    const found=items.filter(item=>M.matches(item,query) && (filter.value==='all' || (filter.value==='connected' ? item.connected===true && !item.connection_stale : item.connected!==true || item.connection_stale)));
    const wanted=new Set(found.map(item=>item.mac));for(const [key,view]of cards)if(!wanted.has(key)){view.node.remove();cards.delete(key);}
    const empty=list.querySelector('.empty');if(empty)empty.remove();
    if(!found.length)list.append(el('p','empty',query ? '没有符合搜索条件的设备。' : filter.value==='connected' ? '当前没有已确认连接的设备。' : '没有已上报的设备。'));
    for(const [index,item]of found.entries()){let view=cards.get(item.mac);if(!view){view=card(item.mac);cards.set(item.mac,view);}update(view,item);if(list.children[index]!==view.node)list.insertBefore(view.node,list.children[index] || null);}
    if(OpenU60Navigation.current.key==='network/clients')OpenU60Numbers.set(document.querySelector('#device-count'),base || details ? items.length : '—');
  }
  search.addEventListener('input',render);filter.addEventListener('change',render);
  window.addEventListener('dashboard:readings',event=>{
    if(event.detail.snapshot)available=false;
    const hosts=event.detail.readings.clients;if(hosts?.ok)base=hosts.data;
    const reading=event.detail.readings.client_details;
    if(reading){if(reading.ok && Array.isArray(reading.data?.devices)){
      const next={...reading.data,devices:reading.data.devices.map(device=>({...device}))};
      for(const previous of details?.devices || []){
        const item=next.devices.find(item=>M.mac(item.mac)===M.mac(previous.mac));
        if(!item && !(previous.connection_type==='wifi' ? next.sources?.wireless : next.sources?.wired))next.devices.push({...previous,connection_stale:true,telemetry_stale:true});
        else if(item && next.sources?.stations?.[item.interface]===false)Object.assign(item,{traffic:previous.traffic,peaks:previous.peaks,link:previous.link,telemetry_stale:true});
      }
      details=next;receivedAt=Date.now();available=true;expire();
    }else available=false;}
    render();
  });
  window.addEventListener('dashboard:connection',event=>{stream=event.detail.state;render();});
  window.addEventListener('dashboard:navigate',render);
  document.addEventListener('visibilitychange',()=>{clearTimeout(expiryTimer);render();if(!document.hidden && receivedAt!==null && Date.now()-receivedAt<10000)expire();});
  window.addEventListener('pagehide',()=>clearTimeout(expiryTimer));
  window.addEventListener('dashboard:locked',()=>{clearTimeout(expiryTimer);base=null;details=null;receivedAt=null;available=false;filter.value='all';cards.clear();list.replaceChildren();render();});
  render();
})();
