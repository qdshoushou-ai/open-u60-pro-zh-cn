'use strict';
(() => {
  const UI = OpenU60UI, API = OpenU60Console, A = OpenU60Advanced;
  const {el,button,say,json,request,confirm,mutate} = UI;
  const samples = new Map(); let history = [], processQuery = '', processSort = 'cpu', latestSweep, stopRequested = false;
  let latestSpeed, startingSpeed = 0, loadingServers = false, serversLoaded = false, terminalDirty = false;
  const sweepJob = new A.Job('sweep',180000);
  const num = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? Number(value) : null;
  const number = (value,unit = '',digits = 1) => num(value) === null ? '—' : `${Number(value).toFixed(digits)}${unit}`;
  const numeric = (node,value) => OpenU60Numbers.set(node,value);
  const bool = value => value === true || value === 'true' || value === 1 || value === '1';
  function table(headers,label) {
    const wrap = el('div','table-scroll diagnostic-table'), node = el('table'), head = el('thead'), row = el('tr'), body = el('tbody'); node.setAttribute('aria-label',label);
    for (const text of headers) { const cell = el('th','',text); cell.scope = 'col'; row.append(cell); }
    head.append(row); node.append(head,body); wrap.append(node); return {wrap,body};
  }
  function rows(body,data,columns,empty,options = {}) {
    if (!data.length) { const row = el('tr'), cell = el('td','empty',empty); cell.colSpan = columns.length; row.append(cell); body.replaceChildren(row); return; }
    const existing = new Map([...body.children].filter(row=>row.dataset.rowKey).map(row=>[row.dataset.rowKey,row])), ordered = [];
    for (const [index,item] of data.entries()) {
      const key = String(options.key ? options.key(item) : index);
      let row = existing.get(key);
      if (!row) { row = el('tr'); row.dataset.rowKey = key; for (const column of columns) row.append(el('td')); }
      columns.forEach((column,index)=>{
        const value = column(item), text = value === undefined || value === null || value === '' ? '—' : String(value);
        if (options.animate?.includes(index)) numeric(row.children[index],text); else row.children[index].textContent = text;
      });
      ordered.push(row);
    }
    const wanted = new Set(ordered);
    for (const row of [...body.children]) if (!wanted.has(row)) row.remove();
    ordered.forEach((row,index)=>{ if (body.children[index] !== row) body.insertBefore(row,body.children[index] || null); });
  }
  function stats(section,definitions) {
    const list = el('dl','diagnostic-stats'), nodes = {};
    for (const [key,label] of definitions) { const pair = el('div'); nodes[key] = el('dd','mono','—'); pair.append(el('dt','',label),nodes[key]); list.append(pair); }
    section.append(list); return nodes;
  }
  function caption(section) { const node = el('p','reading-caption','等待实时读数。'); section.append(node); return node; }
  function stamp(node,name,unavailable = false) {
    const sample = samples.get(name);
    unavailable = unavailable || !!sample?.unavailable;
    const fresh = sample && Date.now()-sample.receivedAt < 12000;
    node.textContent = sample ? `${API.connected && fresh && !unavailable ? '实时' : '最近接收'} · ${new Date(sample.receivedAt).toLocaleTimeString()}${unavailable ? ' · 部分读数不可用' : ''}` : '等待实时读数。';
    node.dataset.stale = String(!API.connected || !fresh || unavailable);
  }
  const health = UI.panel('tools/diagnostics','diagnostic-health','系统健康','来自 Agent 的资源占用和传感器读数。缺失的测量值保持未上报状态。');
  const healthStats = stats(health,[['cpu','CPU 占用'],['memory','已用内存'],['available','可用内存'],['processes','进程数']]);
  const cores = el('p','field-help'), sensors = el('div','sensor-list'); health.append(cores,sensors); const healthCaption = caption(health);
  const processes = UI.panel('tools/diagnostics','diagnostic-processes','运行中的进程','查看资源占用，不会更改或停止任何进程。');
  const processActions = el('div','diagnostic-actions'), search = el('input'), sort = el('select'); search.type = 'search'; search.placeholder = '查找进程或 PID'; search.id = 'process-search'; search.setAttribute('aria-label','查找进程或 PID'); sort.id = 'process-sort'; sort.setAttribute('aria-label','进程排序');
  for (const [key,label] of [['cpu','CPU 占用最高'],['memory','内存占用最大'],['name','进程名称']]) sort.add(new Option(label,key));
  processActions.append(search,sort); processes.append(processActions);
  const processTable = table(['进程','PID','CPU','内存','状态'],'运行中的进程'); processes.append(processTable.wrap);
  search.addEventListener('input',()=>{ processQuery = search.value.toLowerCase().trim(); drawProcesses(); }); sort.addEventListener('change',()=>{ processSort = sort.value; drawProcesses(); });
  const stateText = value => ({ sleeping: '休眠', running: '运行', other: '其他', idle: '空闲', zombie: '僵尸', stopped: '已停止', 'disk-sleep': '磁盘休眠', wait: '等待', uninterruptible: '不可中断' }[String(value || '').toLowerCase()] || value);
  function drawProcesses() {
    const data = samples.get('resources')?.data.processes;
    const found = (data?.data?.processes || []).filter(item=>`${item.name} ${item.pid}`.toLowerCase().includes(processQuery)).slice();
    found.sort((a,b)=>processSort === 'name' ? String(a.name).localeCompare(String(b.name)) : processSort === 'memory' ? Number(b.rss_kb)-Number(a.rss_kb) : Number(b.cpu_pct)-Number(a.cpu_pct));
    rows(processTable.body,found,[item=>item.name,item=>item.pid,item=>number(item.cpu_pct,' %'),item=>number(num(item.rss_kb) === null ? null : item.rss_kb/1024,' MiB'),item=>stateText(item.state)],processQuery ? '没有匹配的进程。' : '没有可用的进程读数。',{key:item=>JSON.stringify([item.pid,item.name]),animate:[2,3]});
  }
  const interfaces = UI.panel('tools/diagnostics','diagnostic-interfaces','网络接口与报告','查看上报的 LAN 与 IPv6 WAN 详情，或保存本地诊断报告。报告包含网络信息，分享前请检查。');
  const details = el('details','diagnostic-details'), summary = el('summary','','上报的接口详情'), interfaceOutput = el('pre','','正在等待接口读数。'); details.append(summary,interfaceOutput); interfaces.append(details);
  const reportActions = el('div','form-actions diagnostic-actions'), includeLabel = el('label','message-select'), includeHistory = el('input'); includeHistory.type = 'checkbox'; includeHistory.id = 'report-terminal-history'; includeLabel.append(includeHistory,el('span','','包含 AT 终端历史'));
  const exportReport = button('保存诊断报告',downloadReport); reportActions.append(exportReport,includeLabel); interfaces.append(reportActions); const reportFeedback = UI.status(interfaces);
  function downloadReport() {
    const report = {created_at:new Date().toISOString(),agent:location.origin,readings:Object.fromEntries(samples),...(includeHistory.checked ? {terminal_history:history} : {})};
    const blob = new Blob([JSON.stringify(report,null,2)],{type:'application/json'}), url = URL.createObjectURL(blob), link = el('a');
    link.href = url; link.download = `openu60-diagnostics-${new Date().toISOString().replace(/[:.]/g,'-')}.json`; document.body.append(link); link.click(); link.remove(); setTimeout(()=>URL.revokeObjectURL(url),5000);
    say(reportFeedback,'诊断报告已保存到此设备。未上传任何报告。');
  }
  function renderResources(data) {
    const cpu = data.cpu?.ok ? data.cpu.data : null, memory = data.memory?.ok ? data.memory.data : null;
    if (cpu) {
      numeric(healthStats.cpu,number(cpu.overall,' %'));
      if (!Array.isArray(cpu.cores)) cores.textContent = '单核占用不可用。';
      else {
        for (const node of [...cores.childNodes]) if (node.nodeType === Node.TEXT_NODE) node.remove();
        while (cores.children.length > cpu.cores.length) cores.lastElementChild.remove();
        cpu.cores.forEach((value,index)=>{
          let item = cores.children[index];
          if (!item) { item = el('span','core-reading'); item.append(document.createTextNode(`核心 ${index+1}：`),el('span')); cores.append(item); }
          numeric(item.querySelector('span'),number(value,' %'));
        });
      }
    }
    if (memory) { numeric(healthStats.memory,number(memory.usage_pct,' %')); numeric(healthStats.available,number(num(memory.available_kb) === null ? null : memory.available_kb/1024,' MiB')); }
    if (data.processes?.ok) numeric(healthStats.processes,String(data.processes.data?.total_count ?? '—'));
    if (data.thermal?.ok) {
      const reported = data.thermal.data?.sensors || [], existing = new Map([...sensors.querySelectorAll('.sensor-card')].map(card=>[card.dataset.sensorKey,card])), cards = [];
      for (const [index,sensor] of reported.entries()) {
        const key = JSON.stringify([sensor.id || sensor.name,index]); let card = existing.get(key);
        if (!card) { card = el('div','sensor-card'); card.dataset.sensorKey = key; card.append(el('span'),el('strong','mono')); }
        card.querySelector('span').textContent = sensor.name || sensor.id || '传感器'; numeric(card.querySelector('strong'),number(sensor.temperature_c,' °C')); cards.push(card);
      }
      if (!cards.length) sensors.replaceChildren(el('p','carrier-empty','未上报温度传感器。'));
      else {
        const wanted = new Set(cards); for (const child of [...sensors.children]) if (!wanted.has(child)) child.remove();
        cards.forEach((card,index)=>{ if (sensors.children[index] !== card) sensors.insertBefore(card,sensors.children[index] || null); });
      }
    }
    interfaceOutput.textContent = JSON.stringify({lan:data.lan,ipv6_wan:data.wan6},null,2);
    drawProcesses(); stamp(healthCaption,'resources',[data.cpu,data.memory,data.thermal,data.processes].some(reading=>!reading?.ok));
  }

  const neighborPanel = UI.panel('tools/radio','diagnostic-neighbors','邻区','上报的邻区是服务连接周围的候选小区，并非额外的聚合载波或不同的物理站点。');
  const neighborActions = el('div','form-actions diagnostic-actions'), scanNeighbors = button('扫描邻区',async()=>{
    if (!await confirm('扫描邻区？','请求调制解调器扫描周围 LTE 和 NR 小区。扫描可能短暂影响移动数据。',{label:'扫描邻区'})) return;
    await mutate(neighborFeedback,async current=>{ await request('/api/cell/neighbors/scan',json('POST',{})); if (current()) say(neighborFeedback,'已请求邻区扫描。调制解调器上报结果后，实时列表将更新；调制解调器可能保留缓存条目。'); });
  },'primary'); neighborActions.append(scanNeighbors); neighborPanel.append(neighborActions);
  const neighborTable = table(['射频','频段','PCI','信道','RSRP'],'LTE 和 NR 邻区'); neighborPanel.append(neighborTable.wrap); const neighborCaption = caption(neighborPanel), neighborFeedback = UI.status(neighborPanel);
  function renderNeighbors(data) {
    const found = [];
    for (const [rat,label] of [['lte','LTE'],['nr','NR']]) if (data[rat]?.data) for (const row of data[rat].data?.cell_list || []) found.push({...row,rat:label});
    rows(neighborTable.body,found,[item=>item.rat,item=>item.band,item=>item.pci,item=>item.earfcn,item=>num(item.rsrp) === null ? null : `${item.rsrp} dBm`],'未上报邻区。',{key:item=>JSON.stringify([item.rat,item.band,item.earfcn,item.pci]),animate:[4]});
    stamp(neighborCaption,'neighbors',!data.lte?.ok || !data.nr?.ok);
  }
  const sweepPanel = UI.panel('tools/radio','diagnostic-sweep','信号质量扫描','运行调制解调器的质量扫描，并查看各射频和信道的上报结果。');
  const sweepActions = el('div','form-actions diagnostic-actions'), startSweep = button('开始信号扫描',async()=>{
    if (!await confirm('开始信号质量扫描？','调制解调器将扫描射频质量。移动数据可能中断。离开此页面后扫描仍会继续。',{label:'开始扫描'})) return;
    await mutate(sweepFeedback,async current=>{ await request('/api/cell/signal-detect/start',json('POST',{})); if (!current()) return; sweepJob.start(); stopRequested = false; renderSweep(latestSweep,true); });
  },'primary'), stopSweep = button('停止扫描',async()=>{
    if (!await confirm('停止信号扫描？','请求调制解调器停止当前质量扫描。已有结果仍可查看。',{label:'停止扫描'})) return;
    const wasRunning = bool(latestSweep?.progress?.data?.running);
    await mutate(sweepFeedback,async current=>{ await request('/api/cell/signal-detect/stop',json('POST',{})); if (current()) { stopRequested = true; say(sweepFeedback,'已请求停止。正在等待调制解调器上报停止状态。'); if (wasRunning) renderSweep(latestSweep,false); } });
  });
  sweepActions.append(startSweep,stopSweep); sweepPanel.append(sweepActions);
  const sweepProgress = el('progress','task-progress'); sweepProgress.max = 100; sweepProgress.setAttribute('aria-label','信号质量扫描进度'); sweepPanel.append(sweepProgress);
  const sweepTable = table(['射频','频段','信道','PCI','RSRP','RSRQ','SINR'],'信号扫描结果'); sweepPanel.append(sweepTable.wrap); const sweepCaption = caption(sweepPanel), sweepFeedback = UI.status(sweepPanel);
  function renderSweep(data,fresh = true) {
    const progress = data?.progress?.ok ? data.progress.data : null, value = num(progress?.progress);
    const phase = fresh ? sweepJob.observe(value) : sweepJob.tick();
    const running = bool(progress?.running) || sweepJob.pending;
    startSweep.disabled = !API.connected || running; stopSweep.disabled = !API.connected || !running;
    if (value === null || phase === 'waiting') sweepProgress.removeAttribute('value'); else sweepProgress.value = Math.min(100,Math.max(0,value));
    if (sweepJob.started !== null) {
      if (phase === 'complete') say(sweepFeedback,'调制解调器报告扫描已完成。下方结果是记录器的最新输出。');
      else if (phase === 'timeout') say(sweepFeedback,'扫描在三分钟内未完成。请检查调制解调器状态；它可能仍在扫描。',true);
      else if (!stopRequested) say(sweepFeedback,`信号扫描进行中${value !== null && phase !== 'waiting' ? ` · ${value}%` : '…'}`);
    }
    if (stopRequested && progress && !bool(progress.running)) { stopRequested = false; sweepJob.clear(); say(sweepFeedback,'调制解调器报告扫描已停止。'); }
    if (data?.results?.ok) rows(sweepTable.body,data.results.data?.record_list || [],[item=>item.type,item=>item.band,item=>item.earfcn,item=>item.pci,item=>item.rsrp,item=>item.rsrq,item=>item.sinr],'未上报质量记录。',{key:item=>JSON.stringify([item.type,item.band,item.earfcn,item.pci]),animate:[4,5,6]});
    stamp(sweepCaption,'sweep',!data?.progress?.ok || !data?.results?.ok);
  }

  const speedPanel = UI.panel('tools/speedtest','diagnostic-speedtest','路由器网速','测量路由器到互联网的链路速度。此操作会消耗移动数据，并可能影响其他已连接设备。');
  const serverLabel = el('label','','测试服务器'), serverSelect = el('select'); serverSelect.id = 'speedtest-server'; serverLabel.htmlFor = serverSelect.id; serverSelect.disabled = true; serverSelect.add(new Option('加载可用测试服务器',''));
  speedPanel.append(serverLabel,serverSelect);
  const speedActions = el('div','form-actions diagnostic-actions'), loadServers = button('加载测试服务器',async()=>{
    if (loadingServers || API.locked) return; loadingServers = true; const epoch = UI.epoch; loadServers.disabled = true;
    try { const servers = await request('/api/speedtest/servers',{timeoutMs:20000}); if (!UI.current(epoch)) return; if (!Array.isArray(servers)) throw new Error('路由器未返回服务器列表。'); serverSelect.replaceChildren(); for (const server of servers) if (Number.isSafeInteger(Number(server.id)) && Number(server.id)>0) serverSelect.add(new Option(`${server.sponsor} · ${server.name}, ${server.country}`,String(server.id))); serversLoaded = !!serverSelect.options.length; if (!serversLoaded) serverSelect.add(new Option('无可用服务器','')); serverSelect.disabled = !serversLoaded; say(speedFeedback,serversLoaded ? '测试服务器已加载。开始前请选择服务器。' : '无可用测试服务器。',!serversLoaded); renderSpeed(latestSpeed,false); }
    catch (error) { if (UI.current(epoch)) say(speedFeedback,`无法加载测试服务器。${error.message}`,true); }
    finally { loadingServers = false; if (UI.current(epoch)) loadServers.disabled = false; }
  }), startSpeed = button('开始测速',async()=>{
    const id = Number(serverSelect.value); if (!Number.isSafeInteger(id) || id<=0) return;
    if (!await confirm('开始网速测试？',`使用 ${serverSelect.selectedOptions[0]?.textContent} 进行测试。这可能消耗大量移动数据，并降低其他用户的速度。`,{label:'开始测试'})) return;
    await mutate(speedFeedback,async current=>{ await request('/api/speedtest/start',{...json('POST',{server_id:id}),timeoutMs:20000}); if (!current()) return; startingSpeed = Date.now(); say(speedFeedback,'已请求测速。实时进度会自动显示。'); renderSpeed(latestSpeed,true); });
  },'primary'), stopSpeed = button('停止测速',async()=>{
    await mutate(speedFeedback,async current=>{ await request('/api/speedtest/stop',json('POST',{})); if (current()) { if (['cancelled','complete','error'].includes(latestSpeed?.phase)) renderSpeed(latestSpeed,true); else say(speedFeedback,'已请求停止。正在等待测试进程完成当前请求。'); } });
  });
  speedActions.append(loadServers,startSpeed,stopSpeed); speedPanel.append(speedActions);
  const speedProgress = el('progress','task-progress'); speedProgress.max = 100; speedProgress.value = 0; speedProgress.setAttribute('aria-label','网速测试进度'); speedPanel.append(speedProgress);
  const speedStats = stats(speedPanel,[['phase','测试阶段'],['live','当前速度'],['download','下载'],['upload','上传'],['ping','延迟'],['jitter','抖动'],['received','测试下载数据'],['sent','测试上传数据']]); const speedCaption = caption(speedPanel), speedFeedback = UI.status(speedPanel);
  function renderSpeed(data,fresh = true) {
    const active = ['latency','download','upload'].includes(data?.phase) || data?.running === true;
    if (fresh && active) startingSpeed = 0;
    if (fresh && startingSpeed && Date.now()-startingSpeed >= 6000 && ['complete','cancelled','error'].includes(data?.phase)) startingSpeed = 0;
    const waiting = !!startingSpeed;
    const running = active || !!startingSpeed;
    startSpeed.disabled = !API.connected || !serversLoaded || running; stopSpeed.disabled = !API.connected || !running; serverSelect.disabled = !serversLoaded || running;
    if (waiting) { speedProgress.removeAttribute('value'); speedStats.phase.textContent = '正在启动'; return; }
    speedProgress.value = Math.min(100,Math.max(0,Number(data?.progress)||0)); speedStats.phase.textContent = data?.phase || '未上报';
    numeric(speedStats.live,number(data?.live_speed_mbps,' Mbps',2)); numeric(speedStats.download,number(data?.download_mbps,' Mbps',2)); numeric(speedStats.upload,number(data?.upload_mbps,' Mbps',2)); numeric(speedStats.ping,number(data?.ping_ms,' ms',2)); numeric(speedStats.jitter,number(data?.jitter_ms,' ms',2));
    numeric(speedStats.received,number(num(data?.download_bytes) === null ? null : data.download_bytes/1048576,' MiB',2)); numeric(speedStats.sent,number(num(data?.upload_bytes) === null ? null : data.upload_bytes/1048576,' MiB',2));
    if (data?.phase === 'error') say(speedFeedback,data.error || '测速失败。',true);
    else if (data?.phase === 'complete') say(speedFeedback,'网速测试完成。这些结果反映路由器到互联网的链路。');
    else if (data?.phase === 'cancelled') say(speedFeedback,'测速已停止。部分测量结果已保留。');
    stamp(speedCaption,'speedtest');
  }

  const terminal = UI.panel('tools/terminal','diagnostic-terminal','AT 终端','命令会直接发送到调制解调器。部分命令会更改射频设置、重启调制解调器或清除配置。发送前请仔细检查每条命令。');
  const port = el('p','reading-caption','正在等待调制解调器端口信息。'), terminalForm = el('form','settings-form'), terminalGrid = el('div','form-grid');
  const commandField = el('div','form-field'), commandLabel = el('label','','调制解调器命令'), command = el('input'); command.id = 'at-command'; commandLabel.htmlFor = command.id; command.placeholder = 'AT+CSQ'; command.maxLength = 512; command.autocomplete = 'off'; command.spellcheck = false; command.setAttribute('autocapitalize','off'); command.required = true; commandField.append(commandLabel,command);
  const timeoutField = el('div','form-field'), timeoutLabel = el('label','','超时（秒）'), timeout = el('input'); timeout.id = 'at-timeout'; timeoutLabel.htmlFor = timeout.id; timeout.type = 'number'; timeout.min = '1'; timeout.max = '30'; timeout.value = '3'; timeout.required = true; timeoutField.append(timeoutLabel,timeout);
  terminalGrid.append(commandField,timeoutField); terminalForm.append(terminalGrid);
  const terminalActions = el('div','form-actions diagnostic-actions'), send = button('发送命令',null,'primary'); send.type = 'submit'; const clearHistory = button('清除终端历史',()=>{ history = []; drawHistory(); say(terminalFeedback,'本标签页的终端历史已清除。'); }); terminalActions.append(send,clearHistory); terminalForm.append(terminalActions); terminal.append(port,terminalForm);
  const presets = el('div','form-actions diagnostic-actions'); for (const [label,value] of [['信号查询','AT+CSQ'],['注册查询','AT+CEREG?'],['设备标识','ATI']]) presets.append(button(label,()=>{ command.value = value; command.focus(); terminalDirty = true; })); terminal.append(presets);
  const terminalFeedback = UI.status(terminal), terminalHistory = el('div','terminal-history'); terminal.append(terminalHistory);
  terminalForm.addEventListener('input',()=>{ terminalDirty = !!command.value; });
  terminalForm.addEventListener('submit',async event=>{
    event.preventDefault();
    try {
      const body = A.atCommand(command.value,timeout.value);
      if (!await confirm('发送此调制解调器命令？',`${body.command}\n\n该命令会直接在调制解调器上运行。写入设置的命令可能中断服务或更改持久配置。`,{label:'发送命令'})) return;
      await mutate(terminalFeedback,async current=>{
        const data = await request('/api/at/send',{...json('POST',body),timeoutMs:(body.timeout+5)*1000}); if (!current()) return;
        history.unshift({command:body.command,response:String(data.response || '').slice(0,32768),truncated:String(data.response || '').length>32768,port:data.port,elapsed_ms:data.elapsed_ms,received_at:new Date().toISOString()}); history = history.slice(0,100); command.value = ''; terminalDirty = false; drawHistory(); say(terminalFeedback,'已收到调制解调器响应。请检查响应中的 OK、ERROR 或命令特定结果。');
      });
    } catch (error) { say(terminalFeedback,error.message,true); }
  });
  function drawHistory() {
    terminalHistory.replaceChildren(); if (!history.length) terminalHistory.append(el('p','carrier-empty','本标签页尚未发送命令。控制台锁定时历史会清除。'));
    for (const entry of history) { const card = el('article','terminal-entry'), heading = el('div','message-card-heading'); heading.append(el('strong','mono',entry.command),el('small','',`${entry.port || '调制解调器'} · ${entry.elapsed_ms ?? '—'} ms`)); card.append(heading,el('pre','terminal-output',entry.response || '（空响应）')); if (entry.truncated) card.append(el('p','field-help','响应已截断为 32,768 个字符。')); terminalHistory.append(card); }
  }
  function renderPort(data) { const available = data?.available === true; send.disabled = !API.connected || !available; port.textContent = available ? `调制解调器端口 · ${data.port || '可用'}` : '当前没有可用的调制解调器 AT 端口。'; }

  const handlers = {resources:renderResources,neighbors:renderNeighbors,sweep:data=>{ latestSweep = data; renderSweep(data); },speedtest:data=>{ latestSpeed = data; renderSpeed(data); },at_port:renderPort};
  window.addEventListener('dashboard:readings',event=>{
    for (const [name,render] of Object.entries(handlers)) {
      const reading = event.detail.readings[name]; if (!reading) continue;
      if (reading.ok) {
        const data = structuredClone(reading.data), previous = samples.get(name)?.data;
        if (previous && ['resources','neighbors','sweep'].includes(name)) for (const [key,value] of Object.entries(data)) if (value?.ok === false && previous[key]?.data !== undefined) data[key] = {...value,data:previous[key].data,retained:true};
        if (name !== 'at_port') samples.set(name,{data,receivedAt:Date.now(),unavailable:['resources','neighbors','sweep'].includes(name) && Object.values(data).some(value=>value?.ok === false)}); render(data);
      }
      else { const target = {resources:healthCaption,neighbors:neighborCaption,sweep:sweepCaption,speedtest:speedCaption,at_port:port}[name]; target.textContent = '读数不可用。在可用的情况下会保留最近接收的值。'; target.dataset.stale = 'true'; if (name === 'at_port') send.disabled = true; }
    }
  });
  window.addEventListener('dashboard:connection',()=>{
    for (const [node,name] of [[healthCaption,'resources'],[neighborCaption,'neighbors'],[sweepCaption,'sweep'],[speedCaption,'speedtest']]) stamp(node,name);
    if (!API.connected) { send.disabled = startSpeed.disabled = stopSpeed.disabled = startSweep.disabled = stopSweep.disabled = scanNeighbors.disabled = true; }
    else { scanNeighbors.disabled = false; renderPort(API.data('at_port')); }
  });
  const timer = setInterval(()=>{ if (!document.hidden && OpenU60Navigation.current.key === 'tools/radio' && sweepJob.pending) renderSweep(latestSweep,false); },1000);
  window.addEventListener('pagehide',event=>{ if (!event.persisted) clearInterval(timer); });
  function clear() {
    samples.clear(); history = []; latestSweep = latestSpeed = null; sweepJob.clear(); stopRequested = false; startingSpeed = 0; serversLoaded = false; terminalDirty = false; command.value = ''; timeout.value = '3';
    serverSelect.replaceChildren(new Option('加载可用测试服务器','')); serverSelect.disabled = true;
    for (const node of Object.values(healthStats)) numeric(node,'—'); cores.textContent = ''; sensors.replaceChildren(); interfaceOutput.textContent = '解锁控制台后即可读取接口信息。';
    for (const [key,node] of Object.entries(speedStats)) { if (key === 'phase') node.textContent = '—'; else numeric(node,'—'); } speedProgress.value = 0; sweepProgress.removeAttribute('value'); includeHistory.checked = false;
    processQuery = ''; search.value = ''; drawProcesses(); rows(neighborTable.body,[],[()=>'',()=>'',()=>'',()=>'',()=>''],'解锁控制台后即可读取邻区信息。'); rows(sweepTable.body,[],[()=>'',()=>'',()=>'',()=>'',()=>'',()=>'',()=>''],'解锁控制台后即可读取扫描结果。');
    for (const node of [reportFeedback,neighborFeedback,sweepFeedback,speedFeedback,terminalFeedback]) node.textContent = '';
    drawHistory(); renderPort(null); startSpeed.disabled = stopSpeed.disabled = startSweep.disabled = stopSweep.disabled = scanNeighbors.disabled = true;
  }
  UI.track({route:'tools/terminal',loaded:true,load:()=>{},get dirty(){return terminalDirty;},clear});
  drawHistory(); drawProcesses(); renderPort(API.data('at_port')); startSpeed.disabled = stopSpeed.disabled = stopSweep.disabled = true;
})();
