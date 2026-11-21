'use strict';
(() => {
  const UI = OpenU60UI, API = OpenU60Console, {el} = UI, route = 'tools/battery';
  let sample = null, received = null, unavailable = false;
  const overview = UI.panel(route,'battery-overview','电池与电源','实时电池功率流向、充电进度和 USB 输入，直接来自路由器。');
  const state = el('p','battery-state','正在等待电池读数'), metrics = el('dl','battery-metrics');
  const nodes = {};
  function metric(parent,key,label,description) {
    const box = el('div'), term = el('dt','',label), value = el('dd','mono','—');value.id=`power-${key}`;
    box.append(term,value);if(description)box.append(el('small','field-help',description));parent.append(box);nodes[key]=value;return value;
  }
  metric(metrics,'capacity','电池电量');metric(metrics,'temperature','电池温度');
  metric(metrics,'power','电池功率','由电池电压 × 电流计算得出。');metric(metrics,'usb-power','USB 输入功率','包含路由器运行和电池充电的功耗。');
  const meter = el('progress','battery-progress');meter.max=100;meter.setAttribute('aria-label','电池电量');meter.removeAttribute('value');
  const powerNote = el('p','panel-note','功率分别在电池和 USB 输入端测量；两者属于供电链路中的不同环节。');
  const caption = el('p','reading-caption','正在等待电池读数。');overview.append(state,metrics,meter,powerNote,caption);
  const timePanel = UI.panel(route,'battery-estimates','时间估算','估算值来自电量计或固件，会随负载和充电条件变化。');
  const times = el('dl','battery-metrics battery-times');metric(times,'until-full','距充满剩余时间');metric(times,'until-empty','剩余运行时间');
  const fullSource=el('small','field-help'),emptySource=el('small','field-help');nodes['until-full'].parentElement.append(fullSource);nodes['until-empty'].parentElement.append(emptySource);timePanel.append(times);
  const batteryPanel = UI.panel(route,'battery-electrical','电池详情','电气测量值、电量计容量和电池状况。');
  const batteryFacts = el('dl','settings-facts battery-facts');
  for(const [key,label] of [['status','电池状态'],['present','电池在位'],['health','健康状态'],['technology','化学类型'],['voltage','电池电压'],['current','电池电流'],['charge-type','充电阶段'],['cycles','充电循环次数'],['charge-full','上报的满电容量'],['charge-design','设计容量'],['charge-now','上报的剩余电量'],['charge-counter','库仑计'],['full-design','满电/设计容量比'],['energy-now','上报的当前储能'],['energy-full','上报的满电储能']])metric(batteryFacts,key,label);
  batteryPanel.append(batteryFacts,el('p','panel-note','库仑计给出的是相对读数，不能代表可用的剩余容量。校准后满电/设计容量比可能超过 100%。电流以幅值显示；电池状态指示其方向。'));
  const chargerPanel=UI.panel(route,'battery-charger','USB 与充电策略','上报的输入限制、电源模式和当前生效的充电策略。');
  const chargerFacts=el('dl','settings-facts battery-facts');
  for(const [key,label] of [['usb-online','外部供电'],['usb-type','USB 供电类型'],['usb-voltage','USB 电压'],['usb-current','USB 电流'],['usb-temperature','USB 传感器温度'],['usb-max-voltage','上报的 USB 电压上限'],['usb-max-current','上报的 USB 电流上限'],['usb-input-limit','输入电流上限'],['bypass','直接供电'],['powerbank','USB 移动电源'],['stopped','充电已停止'],['manual','手动干预'],['limit-enabled','充电上限'],['limit','已配置充电上限'],['resume','已配置恢复电量']])metric(chargerFacts,key,label);
  const settings=el('a','button','打开充电控制 →');settings.href='#settings/device';chargerPanel.append(chargerFacts,el('p','panel-note','充电上限停用时，已配置的充电上限和恢复电量不生效。'),settings);
  const raw=el('details','diagnostic-details battery-raw'),summary=el('summary','','所有上报的电池与电源字段'),rawOutput=el('pre','','未收到读数。');raw.append(summary,el('p','panel-note','原始传感器和固件数值保留原有单位。内核电压/电流使用 µV/µA，温度以十分之一 °C 为单位，时间以秒为单位；固件时间估算使用分钟。驱动上报的功率仅供诊断参考；主功率按电压 × 电流计算。'),rawOutput);chargerPanel.append(raw);
  const value=(key,n,suffix='',digits=1)=>OpenU60Numbers.set(nodes[key],n===null||n===undefined?'未上报':`${Number(n).toFixed(digits)}${suffix}`);
  const literal=(key,text)=>OpenU60Numbers.set(nodes[key],text);
  const yes=value=>value===null?'未上报':value?'是':'否';
  function stamp(){caption.textContent=received?`${API.connected&&!unavailable?'实时电池读数':'最近接收的电池读数'} · ${new Date(received).toLocaleTimeString()}${sample?.partial?' · 部分来源不可用':''}`:'正在等待电池读数。';caption.dataset.stale=String(!API.connected||unavailable||!!sample?.partial);}
  function render(packet){
    sample=OpenU60Battery.parse(packet);const b=sample;
    state.textContent=b.state+(b.stopped?' · 充电已按策略停止':'');state.dataset.flow=b.status;
    value('capacity',b.capacity,' %',0);value('temperature',b.temperature,' °C');value('power',b.power,' W',2);if(b.powerbank)OpenU60Numbers.set(nodes['usb-power'],'不适用');else value('usb-power',b.usbOnline===false?null:b.usbPower,' W',2);
    if(b.capacity===null)meter.removeAttribute('value');else meter.value=b.capacity;
    powerNote.textContent=b.powerMismatch?'电池功率由实测电压 × 电流计算。驱动单独上报的功率读数不一致；该读数保留在下方上报字段中。':'电池功率使用实测电压 × 电流。USB 输入还为路由器供电，因此与电池功率和适配器额定输出不同。';
    for(const [key,estimate]of[['until-full',b.full],['until-empty',b.empty]])OpenU60Numbers.set(nodes[key],estimate.applicable?OpenU60Battery.duration(estimate.seconds):'不适用');fullSource.textContent=b.full.source;emptySource.textContent=b.empty.source;
    literal('status',b.state);literal('present',yes(b.present));literal('health',b.health);literal('technology',b.technology);literal('charge-type',b.chargeType);
    for(const [key,n,unit,digits]of[['voltage',b.voltage,' V',3],['current',b.current===null?null:Math.abs(b.current),' mA',0],['cycles',b.cycles,'',0],['charge-full',b.chargeFull,' mAh',0],['charge-design',b.chargeDesign,' mAh',0],['charge-now',b.chargeNow,' mAh',0],['charge-counter',b.chargeCounter,' mAh',0],['full-design',b.fullDesignRatio,' %',1],['energy-now',b.energyNow,' Wh',2],['energy-full',b.energyFull,' Wh',2],['usb-voltage',b.usbVoltage,' V',3],['usb-current',b.usbCurrent===null?null:Math.abs(b.usbCurrent),' mA',0],['usb-temperature',b.usbTemperature,' °C',1],['usb-max-voltage',b.usbMaxVoltage,' V',2],['usb-max-current',b.usbMaxCurrent,' mA',0],['usb-input-limit',b.inputLimit,' mA',0]])value(key,n,unit,digits);
    literal('usb-online',b.usbOnline===null?'未上报':b.usbOnline?'已连接':'已断开');literal('usb-type',b.usbType);
    for(const[key,n]of[['bypass',b.bypass],['powerbank',b.powerbank],['stopped',b.stopped],['manual',b.manual]])literal(key,yes(n));
    literal('limit-enabled',b.limitEnabled===null?'未上报':b.limitEnabled?'已启用':'已停用');value('limit',b.limit,' %',0);value('resume',b.limit!==null&&b.hysteresis!==null?Math.max(0,b.limit-b.hysteresis):null,' %',0);
    rawOutput.textContent=JSON.stringify(packet,null,2);stamp();
  }
  function clear(){sample=null;received=null;unavailable=false;for(const node of Object.values(nodes))OpenU60Numbers.set(node,'—');meter.removeAttribute('value');state.textContent='正在等待电池读数';rawOutput.textContent='未收到读数。';fullSource.textContent=emptySource.textContent='';stamp();}
  window.addEventListener('dashboard:readings',event=>{const reading=event.detail.readings.battery_details;if(!reading||OpenU60Navigation.current.key!==route)return;if(reading.ok){received=Date.now();unavailable=false;render(reading.data);}else{unavailable=true;stamp();}});
  window.addEventListener('dashboard:connection',stamp);
  window.addEventListener('dashboard:locked',clear);
  window.addEventListener('dashboard:navigate',()=>{if(OpenU60Navigation.current.key!==route)clear();});
})();
