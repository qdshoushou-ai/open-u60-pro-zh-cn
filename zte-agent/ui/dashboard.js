'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const animated = new Set(['download','upload','battery','temperature','device-temperature','rsrp','sinr','rsrq','lte-count','nr-count','device-count','outage-count','received','sent','sms-count']);
  const text = (id,value) => { if (animated.has(id)) OpenU60Numbers.set($(id),value); else $(id).textContent = value ?? '—'; };
  const number = value => value !== null && value !== undefined && String(value).trim() !== '' && Number.isFinite(Number(value)) ? Number(value) : null;
  const sessionKey = 'openu60.session';
  let token = '', authEpoch = 0, locked = false, clients = [], history = [];
  try { const saved = sessionStorage.getItem(sessionKey); if (saved && saved.length <= 2048 && !/[\s\x00-\x1f]/.test(saved)) token = saved; } catch { /* The in-memory session still works when storage is blocked. */ }
  let controller, reconnectTimer, watchdog, epoch = 0, retryDelay = 1000, streamIncludesSms = false, streamKey = '';
  let messages = [];
  const readings = new Map(), lastGood = new Map();
  let transportLive = false, lastReceived = null, lastServing = null, outageStarted = null, outageCount = 0;
  let lastOutageDuration = 0, lastOutageReason = '';
  const dialog = $('login-dialog');
  text('address', location.host);
  text('settings-address', location.origin);
  $('signout').hidden = !token;

  async function api(path, options = {}) {
    const requestAuthEpoch = authEpoch;
    const {timeoutMs = 8000, contentType = 'application/json', ...fetchOptions} = options;
    const response = await fetch(path, {
      ...fetchOptions, cache: 'no-store',
      signal: AbortSignal.timeout(Math.min(Math.max(timeoutMs,1000),600000)),
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.body ? { 'Content-Type': contentType } : {}) }
    });
    if (response.status === 401) {
      const error = new Error('请输入 Agent 密码以继续。');
      error.auth = true;
      error.authEpoch = requestAuthEpoch;
      throw error;
    }
    const result = await response.json();
    if (!response.ok || !result.ok) { const error = new Error(result.error || '读数不可用'); error.status = response.status; error.details=result; throw error; }
    return result.data ?? result;
  }
  function lock() {
    authEpoch++;
    try { sessionStorage.removeItem(sessionKey); } catch { /* Storage can be unavailable. */ }
    stopStream();
    token = ''; locked = true; clients = []; history = [];
    transportLive = false; readings.clear(); lastGood.clear(); lastReceived = null; lastServing = null;
    outageStarted = null; outageCount = 0; lastOutageDuration = 0; lastOutageReason = '';
    $('availability').hidden = true; $('cellular').dataset.stale = 'false';
    text('last-seen', '—'); text('outage-count', '0'); text('outage-duration', '—');
    setStreamState('locked', '已锁定');
    renderDevice(null); renderWan(null); renderSignal(null); renderModem(null); renderSpeed(null); renderBattery(null); renderWifi(null); renderClients(null);
    $('sms-search').value = ''; renderSMS(null); renderSMSCapacity(null);
    text('connection-title', '控制台已锁定');
    text('updated', '控制台已锁定'); text('notice', '解锁控制台以查看你的网络。');
    $('signout').hidden = true;
    window.dispatchEvent(new Event('dashboard:locked'));
    OpenU60Motion.showDialog(dialog);
  }
  const bytes = value => {
    const n = number(value);
    if (n === null || n < 0) return '—';
    const unit = n >= 1e9 ? 'GB' : n >= 1e6 ? 'MB' : n >= 1e3 ? 'KB' : 'B';
    return `${(n / ({ GB: 1e9, MB: 1e6, KB: 1e3, B: 1 }[unit])).toFixed(unit === 'B' ? 0 : 2)} ${unit}`;
  };
  function renderDevice(data) {
    text('hostname', data?.hostname ?? 'ZTE U60 Pro'); text('kernel', data?.kernel);
    text('load', Array.isArray(data?.load_avg) ? data.load_avg.join(' / ') : data?.load_avg);
    const seconds = number(data?.uptime_secs);
    text('uptime', seconds === null ? null : `${Math.floor(seconds / 86400)}d ${Math.floor(seconds % 86400 / 3600)}h ${Math.floor(seconds % 3600 / 60)}m`);
  }
  function renderWan(data) {
    const wan=lastGood.get('wan')?.data,wan6=lastGood.get('wan6')?.data;
    const addresses=OpenU60Addresses.collect(wan,wan6);
    text('wan-ip',addresses.ipv4.join('\n') || (wan || wan6 ? '未上报' : '—'));
    text('wan-ipv6',addresses.ipv6.join('\n') || (wan || wan6 ? '未上报' : '—'));
    text('wan-ipv6-status',addresses.ipv6.length && (readings.get('wan6')?.ok===false || wan6?.up===false) ? '上次上报的 IPv6 地址' : '');
  }
  function renderModem(data) {
    const mode = data?.operate_mode;
    text('modem-state', mode ? ({ online: '在线', lpm: '低功耗', offline: '离线', reset: '重置中', resetting: '重置中' }[String(mode).toLowerCase()] || mode) : mode);
  }
  function element(tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined) node.textContent = value;
    return node;
  }
  function carrierGroup(rat, group, model, historical = false) {
    const list = $(`${rat}-carriers`), existing = new Map([...list.querySelectorAll('.carrier-card')].map(card=>[card.dataset.carrierKey,card]));
    const count = group.carriers.length;
    let state = !count ? '未上报' : `已上报 ${count} 个 · ${count > 1 ? '载波聚合' : '单载波'}`;
    if (group.caInactive && count > 1) state = `已上报 ${count} 个 · 载波聚合未激活`;
    if (rat === 'lte' && model.sa && count) state = `已上报 ${count} 个 · SA 下未使用`;
    else if (count && !group.measured) state = `已上报 ${count} 个 · 无实测信号`;
    if (historical && count) state = `上次已知 · ${count} 个载波`;
    text(`${rat}-status`, state);
    if (!count) { list.replaceChildren(element('p','carrier-empty',`调制解调器未上报 ${rat === 'nr' ? 'NR' : 'LTE'} 载波。`)); return; }
    const cards = [];
    for (const carrier of group.carriers) {
      const key = JSON.stringify([rat,carrier.pci,carrier.channel,carrier.band,carrier.cellId]);
      let card = existing.get(key);
      if (!card) {
        card = element('article','carrier-card'); card.dataset.carrierKey = key;
        const heading = element('div','carrier-card-heading'), identity = element('div','carrier-identity');
        identity.append(element('strong',''),element('span','carrier-role')); heading.append(identity,element('span','carrier-measurement-state'));
        const facts = element('dl','carrier-facts'), metrics = element('dl','carrier-metrics');
        for (const label of ['PCI',rat === 'nr' ? 'NR-ARFCN' : 'EARFCN','带宽','小区 ID']) { const fact = element('div'); fact.append(element('dt','',label),element('dd')); facts.append(fact); }
        for (const label of ['RSRP','RSRQ','SINR','RSSI']) { const metric = element('div'); metric.append(element('dt','',label),element('dd')); metrics.append(metric); }
        card.append(heading,facts,metrics);
      }
      card.dataset.role = carrier.role;
      card.querySelector('.carrier-identity strong').textContent = carrier.band || '频段未上报';
      card.querySelector('.carrier-role').textContent = carrier.role;
      card.querySelector('.carrier-measurement-state').textContent = carrier.rsrp === null ? '测量不可用' : '已上报信号';
      const facts = [carrier.pci,carrier.channel,carrier.bandwidth ? `${carrier.bandwidth} MHz` : '',carrier.cellId];
      [...card.querySelectorAll('.carrier-facts dd')].forEach((node,index)=>{ node.textContent = facts[index] || '—'; });
      [...card.querySelectorAll('.carrier-metrics dd')].forEach((node,index)=>{
        const [key,unit] = [['rsrp','dBm'],['rsrq','dB'],['sinr','dB'],['rssi','dBm']][index];
        OpenU60Numbers.set(node,carrier[key] === null ? '—' : `${carrier[key]} ${unit}`);
      });
      cards.push(card);
    }
    const wanted = new Set(cards);
    for (const child of [...list.children]) if (!wanted.has(child)) child.remove();
    cards.forEach((card,index)=>{ if (list.children[index] !== card) list.insertBefore(card,list.children[index] || null); });
  }
  const signalQuality = rsrp => rsrp == null ? '不可用' : rsrp >= -80 ? '极佳' : rsrp >= -95 ? '良好' : rsrp >= -110 ? '一般' : '弱';
  function renderSignal(data) {
    const model = OpenU60Cellular.parse(data || {});
    text('operator', data?.network_provider ?? '运营商不可用'); text('network-type', data ? model.mode : '—');
    const reportedBars = number(data?.signalbar), bars = reportedBars === null ? null : Math.max(0,Math.min(5,Math.trunc(reportedBars)));
    const meter = $('operator-signal');
    meter.dataset.available = String(bars !== null);
    meter.setAttribute('aria-label',bars === null ? '蜂窝信号不可用' : `蜂窝信号 ${bars} 格（共 5 格）`);
    [...meter.children].forEach((bar,index)=>{ bar.dataset.active = String(bars !== null && index < bars); });
    text('access-mode', data ? model.mode : '—'); text('mode-explanation', model.explanation || '调制解调器未上报服务信号。');
    text('lte-count', data ? model.lte.carriers.length : '—'); text('nr-count', data ? model.nr.carriers.length : '—');
    const primary = model.primary;
    text('primary-signal-label', primary ? `实测载波 · ${primary.band || '频段未上报'} ${primary.role}` : '服务信号');
    text('rsrp', primary?.rsrp); text('sinr', primary?.sinr); text('rsrq', primary?.rsrq);
    text('band', primary?.band); text('pci', primary?.pci);
    const rsrp = primary?.rsrp;
    text('signal-quality', signalQuality(rsrp));
    const historical = !model.hasSignal && lastServing;
    const inventory = historical ? OpenU60Cellular.parse(lastServing.data) : model;
    $('cellular').dataset.nrActive = String(inventory.nr.inUse);
    carrierGroup('lte', inventory.lte, inventory, Boolean(historical)); carrierGroup('nr', inventory.nr, inventory, Boolean(historical));
    text('cellular-freshness', data ? '调制解调器实时读数 · 下方列出每个已上报的载波。' : '无调制解调器读数。');
  }
  const clock = value => new Date(value).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'});
  function refreshOutageClock() {
    const seconds = Math.max(0, Math.floor((outageStarted === null ? lastOutageDuration : Date.now() - outageStarted) / 1000));
    text('outage-duration', `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2,'0')}s`);
  }
  function updateConnection() {
    if (locked) return;
    const wan = readings.get('wan'), modem = readings.get('modem'), signal = readings.get('signal');
    const radioMode = String(modem?.ok ? modem.data?.operate_mode ?? '' : '').trim().toUpperCase();
    let reason = '';
    if (!transportLive) reason = lastReceived ? '路由器不可达' : '等待路由器';
    else if (radioMode && radioMode !== 'ONLINE') reason = `射频离线 · ${radioMode}`;
    else if (wan?.ok && wan.data?.up === false) reason = '移动数据离线';
    else if (signal?.ok && OpenU60Cellular.parse(signal.data || {}).mode === '无服务') reason = '蜂窝服务不可用';
    else if (!wan?.ok) reason = '移动数据状态不可用';
    const interrupted = reason && (transportLive || lastReceived !== null);
    if (interrupted && outageStarted === null) { outageStarted = Date.now(); outageCount++; }
    if (!interrupted && outageStarted !== null) { lastOutageDuration = Date.now() - outageStarted; outageStarted = null; }
    if (interrupted) lastOutageReason = reason;
    text('connection-title', reason || '蜂窝连接正常');
    document.querySelector('.connection-panel').dataset.state = interrupted ? 'offline' : 'online';
    $('availability').hidden = !outageCount;
    $('history-empty').hidden = Boolean(outageCount);
    text('availability-title', interrupted ? reason : '连接已恢复');
    text('offline-cause', !transportLive ? '正在显示本标签页上次已知的读数。实时速率不可用。' : interrupted ? '路由器可达，本地设备统计仍在更新。' : `已从以下状态恢复：${lastOutageReason}。历史记录仅限本标签页。`);
    text('last-seen', lastReceived ? clock(lastReceived) : '—');
    text('outage-count', outageCount); text('outage-duration-label', interrupted ? '本次中断' : '上次中断');
    refreshOutageClock();
    document.querySelectorAll('[data-rate-label]').forEach(label => { label.textContent = interrupted ? '离线' : '实时'; });
    if (interrupted) { text('download', '—'); text('upload', '—'); }
    const oldSignal = lastGood.get('signal');
    const noCurrentSignal = Boolean(signal?.ok && !OpenU60Cellular.parse(signal.data || {}).hasSignal && lastServing);
    const stale = Boolean(oldSignal && (!transportLive || !signal?.ok || noCurrentSignal || (radioMode && radioMode !== 'ONLINE')));
    $('cellular').dataset.stale = String(stale);
    if (stale) {
      text('cellular-freshness', `${noCurrentSignal ? '当前无服务信号，上次已知载波' : '上次已知的调制解调器读数'} · 最近接收 ${clock(noCurrentSignal ? lastServing.at : oldSignal.at)}。这些不是实时测量值。`);
      text('signal-quality', '上次已知');
    } else if (signal?.ok) {
      text('cellular-freshness', `最近接收调制解调器读数 ${clock(oldSignal.at)} · 已显示全部上报的载波。`);
      text('signal-quality', signalQuality(OpenU60Cellular.parse(signal.data || {}).primary?.rsrp));
    }
  }
  const speedValue = (data, modem, fallback) => data?.[modem] ?? data?.[fallback];
  function renderSpeed(data) {
    const rx = number(speedValue(data,'real_rx_speed','rx_speed')), tx = number(speedValue(data,'real_tx_speed','tx_speed'));
    text('download', rx === null ? null : (rx * 8 / 1e6).toFixed(2));
    text('upload', tx === null ? null : (tx * 8 / 1e6).toFixed(2));
    text('received', bytes(speedValue(data,'real_rx_bytes','rx_bytes'))); text('sent', bytes(speedValue(data,'real_tx_bytes','tx_bytes')));
    history.push(rx === null || tx === null ? null : [rx, tx]);
    history = history.slice(-30);
    const ceiling = Math.max(1, ...history.filter(Boolean).flat());
    for (const [index, id] of ['download-line', 'upload-line'].entries()) {
      let drawing = '', penDown = false;
      history.forEach((sample, i) => {
        if (!sample) { penDown = false; return; }
        drawing += `${penDown ? 'L' : 'M'}${(i / 29 * 320).toFixed(1)},${(36 - sample[index] / ceiling * 32).toFixed(1)} `;
        penDown = true;
      });
      $(id).setAttribute('d', drawing);
    }
  }
  function renderBattery(data) {
    const raw = number(data?.capacity), capacity = raw !== null && raw >= 0 && raw <= 100 ? raw : null;
    const status = data?.status;
    const statusText = status ? ({ charging: '充电中', discharging: '放电中', full: '已充满', 'not charging': '未充电', unknown: '未知', idle: '空闲' }[String(status).toLowerCase()] || status) : '电池数据不可用';
    text('battery', capacity); text('battery-status', statusText);
    $('battery-bar').style.width = `${capacity ?? 0}%`;
    const temperature = number(data?.temperature);
    text('temperature', temperature === null ? null : `${(temperature / 10).toFixed(1)} °C`);
  }
  function renderThermal(data) {
    const temperature = number(data?.device_temp);
    text('device-temperature',temperature === null ? null : `${temperature.toFixed(1)} °C`);
  }
  function renderWifi(data) {
    for (const band of ['2g', '5g']) {
      text(`ssid-${band}`, data?.[`ssid_${band}`] || `${band === '2g' ? '2.4' : '5'} GHz 网络`);
      text(`channel-${band}`, data?.[`channel_${band}`]);
      const disabled = data?.[`radio${band === '2g' ? '2' : '5'}_disabled`];
      text(`radio-${band}`, !data || disabled === undefined ? '—' : String(data.wifi_onoff) === '0' || String(disabled) === '1' ? '已关闭' : '已启用');
    }
  }
  function renderClients(data) {
    if (data && !data.hosts && !Array.isArray(data.dhcp_leases)) data = null;
    clients = [];
    if (data) {
      const hosts = data.hosts;
      if (hosts && typeof hosts === 'object') {
        for (const [mac, host] of Object.entries(hosts)) {
          if (!host || typeof host !== 'object') continue;
          clients.push({ name: host.name || '未命名设备', ip: host.ipaddrs?.join(', ') || host.ipv4?.join(', ') || '—', mac, source: '主机提示' });
        }
      }
      for (const lease of data.dhcp_leases ?? []) {
        if (!clients.some(client => client.mac.toLowerCase() === String(lease.macaddr).toLowerCase())) {
          clients.push({ name: lease.hostname || '未命名设备', ip: lease.ipaddr || '—', mac: lease.macaddr || '—', source: 'DHCP 租约' });
        }
      }
    }
    if (OpenU60Navigation.current.key !== 'network/clients') text('device-count', data ? clients.length : '—');
    drawClients(data ? undefined : '设备数据不可用。');
  }
  function drawClients(message) {
    const query = $('device-search').value.trim().toLowerCase();
    const filtered = clients.filter(client => Object.values(client).some(value => String(value).toLowerCase().includes(query)));
    const body = $('client-list'); body.replaceChildren();
    if (!filtered.length) {
      const row = body.insertRow(), cell = row.insertCell();
      row.setAttribute('role', 'row'); cell.setAttribute('role', 'cell');
      cell.colSpan = 4; cell.className = 'empty';
      cell.textContent = message || (query ? '没有设备符合你的搜索条件。' : '路由器未上报任何设备。');
    }
    for (const client of filtered) {
      const row = body.insertRow();
      row.setAttribute('role', 'row');
      for (const [key, label] of [['name', '设备'], ['ip', 'IP 地址'], ['mac', 'MAC 地址'], ['source', '来源']]) {
        const cell = row.insertCell();
        cell.textContent = client[key];
        cell.dataset.label = label;
        cell.setAttribute('role', 'cell');
      }
    }
  }
  function decodeMessage(raw) {
    const value = String(raw ?? '');
    if (!value || value.length % 4 || !/^[0-9a-f]+$/i.test(value)) return value;
    let decoded = '';
    for (let i = 0; i < value.length; i += 4) decoded += String.fromCharCode(parseInt(value.slice(i,i+4),16));
    return decoded;
  }
  function messageDate(value) {
    const raw = String(value ?? '');
    const parts = raw.split(',').map(Number);
    if (parts.length < 6 || parts.slice(0,6).some(value => !Number.isFinite(value))) return raw || '日期未上报';
    const [year,month,day,hour,minute,second] = parts;
    const quarters = Number.isFinite(parts[6]) ? parts[6] : 0;
    if (month < 1 || month > 12 || day < 1 || day > 31 || Math.abs(quarters) > 56) return raw;
    const date = new Date(Date.UTC(year < 100 ? year+2000 : year,month-1,day,hour,minute,second) - quarters*15*60*1000);
    return Number.isNaN(date.getTime()) ? raw : date.toLocaleString();
  }
  function renderSMS(data) {
    messages = Array.isArray(data?.messages) ? data.messages.map(message => ({...message,body:decodeMessage(message.content)})) : [];
    text('sms-count', data ? messages.length : '—');
    text('sms-status', data ? '实时消息 · 路由器与 SIM 卡存储' : '消息不可用。请在连接路由器时打开短信页面。');
    drawMessages();
  }
  function drawMessages() {
    const list = $('message-list'); list.replaceChildren();
    const query = $('sms-search').value.trim().toLowerCase();
    const found = messages.filter(message => `${message.number} ${message.body}`.toLowerCase().includes(query));
    if (!found.length) list.append(element('p','carrier-empty',query ? '没有消息符合你的搜索条件。' : '没有可显示的消息。'));
    const tags = {0:'已读',1:'未读',2:'已发送',3:'发送失败',4:'草稿'};
    for (const message of found) {
      const card = element('article','message-card');
      const heading = element('div','message-card-heading');
      heading.append(element('strong','',message.number || '未知发件人'),element('span','',messageDate(message.date)));
      card.append(heading,element('p','',message.body),element('small','',`${tags[message.tag] || '消息'} · ${message.mem_store === 'sim' ? 'SIM' : '内部存储'}`));
      if (globalThis.OpenU60Controls) OpenU60Controls.decorateMessage(card,message);
      list.append(card);
    }
  }
  function renderSMSCapacity(data) {
    const capacity = (used,total) => data ? `${data[used] ?? '—'} / ${data[total] ?? '—'} 条消息` : '—';
    text('sms-internal',capacity('sms_nvused_total','sms_nv_total'));
    text('sms-sim',capacity('sms_simused_total','sms_sim_total'));
    text('sms-unread',data?.sms_dev_unread_num);
  }
  const renderers = {
    device: renderDevice, wan: renderWan, wan6: renderWan, signal: renderSignal,
    client_details: () => {}, battery_details: () => {}, https_status: () => {}, dns_cache: () => {}, ota_status: () => {},
    esim_status: () => {},
    lan_config: () => {}, firewall_config: () => {}, upnp_config: () => {}, port_rules: () => {}, qos_config: () => {},
    operators: () => {}, forwarding: () => {}, resources: () => {}, neighbors: () => {}, sweep: () => {}, speedtest: () => {}, at_port: () => {}, guest: () => {}, mobile: () => {}, charging: () => {}, thermal: renderThermal, speed: renderSpeed, battery: renderBattery, wifi: renderWifi, clients: renderClients, modem: renderModem, sms: renderSMS, sms_capacity: renderSMSCapacity
  };
  function setStreamState(state, label) {
    $('stream-state').dataset.state = state;
    text('stream-state', label);
    text('settings-stream', label);
    window.dispatchEvent(new CustomEvent('dashboard:connection',{detail:{state,label}}));
  }
  function stopStream() {
    epoch++;
    clearTimeout(reconnectTimer); clearTimeout(watchdog);
    controller?.abort(); controller = undefined;
  }
  function markOffline() {
    transportLive = false;
    // Current rates must never masquerade as live while the connection is down.
    renderSpeed(null);
    const speed = lastGood.get('speed')?.data;
    text('received', bytes(speedValue(speed,'real_rx_bytes','rx_bytes'))); text('sent', bytes(speedValue(speed,'real_tx_bytes','tx_bytes')));
    if (streamIncludesSms) text('sms-status','连接中断 · 正在显示最近接收的消息。');
    updateConnection();
  }
  function applyReadings(message, snapshot) {
    if (snapshot) readings.clear();
    transportLive = true;
    for (const [name, reading] of Object.entries(message.readings || {})) {
      if (!Object.hasOwn(renderers, name) || ((name === 'sms' || name === 'sms_capacity') && !streamIncludesSms)) continue;
      readings.set(name, reading);
      if (reading?.ok) {
        lastReceived = Date.now();
        lastGood.set(name, {data:reading.data, at:lastReceived});
        renderers[name](reading.data);
      } else if (name === 'speed') {
        renderSpeed(null);
        text('received', bytes(lastGood.get('speed')?.data?.rx_bytes)); text('sent', bytes(lastGood.get('speed')?.data?.tx_bytes));
      } else {
        renderers[name](lastGood.get(name)?.data ?? null);
      }
    }
    const currentSignal = readings.get('signal');
    const radioMode = String(readings.get('modem')?.data?.operate_mode ?? 'ONLINE').toUpperCase();
    if (currentSignal?.ok && radioMode === 'ONLINE' && OpenU60Cellular.parse(currentSignal.data || {}).hasSignal) {
      lastServing = lastGood.get('signal');
    }
    if (streamIncludesSms && readings.has('sms') && !readings.get('sms')?.ok) text('sms-status','消息不可用 · 在可用时保留最近接收的消息。');
    const failures = [...readings.values()].filter(reading => !reading?.ok).length;
    setStreamState('live', '实时');
    text('notice', failures ? `${failures} 项读数不可用。在可用时保留上次已知的值。` : '数据实时来自路由器 · 变更会自动送达');
    $('notice').classList.toggle('error', failures > 0);
    text('updated', lastReceived ? `最近接收 ${clock(lastReceived)}` : '等待读数');
    updateConnection();
    window.dispatchEvent(new CustomEvent('dashboard:readings',{detail:{readings:message.readings || {},snapshot}}));
  }
  function handleFrame(frame) {
    let event = 'message'; const data = [];
    for (const line of frame.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''));
    }
    if (event === 'auth') { lock(); return; }
    if ((event === 'snapshot' || event === 'patch') && data.length) {
      applyReadings(JSON.parse(data.join('\n')), event === 'snapshot');
      retryDelay = 1000;
    }
  }
  function streamOptions() {
    const {group,key} = OpenU60Navigation.current;
    const topic = {'dashboard/overview':'esim','settings/https':'https','settings/update':'ota','network/esim':'esim','network/clients':'clients','network/dns-cache':'dns','network/lan':'routing','network/firewall':'routing','network/ports':'routing','network/qos':'routing','network/operators':'operators','sms/forwarding':'forwarding','tools/battery':'power','tools/diagnostics':'health','tools/radio':'radio','tools/speedtest':'speedtest','tools/terminal':'terminal'}[key];
    const query = [...(group === 'sms' ? ['sms=1'] : []),...(topic ? [`topics=${topic}`] : [])].join('&');
    return {includeSms:group === 'sms',key:query ? `?${query}` : '',topic};
  }
  async function connect() {
    if (locked || document.hidden) return;
    stopStream();
    transportLive = false;
    const session = epoch;
    const options = streamOptions(); streamIncludesSms = options.includeSms; streamKey = options.key;
    controller = new AbortController();
    const connection = controller;
    const resetWatchdog = () => {
      clearTimeout(watchdog);
      watchdog = setTimeout(() => connection.abort(), 30000);
    };
    setStreamState('connecting', '正在连接');
    try {
      resetWatchdog();
      // Fetch keeps bearer tokens out of URLs while supporting an SSE response body.
      const response = await fetch(`/api/dashboard/events${streamKey}`, {
        cache: 'no-store', signal: connection.signal,
        headers: { Accept: 'text/event-stream', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (session !== epoch) return;
      if (response.status === 401) { lock(); return; }
      if (!response.ok || !response.headers.get('content-type')?.includes('text/event-stream') || !response.body) {
        throw new Error('实时数据流不可用');
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder(); let buffer = '';
      try {
        while (session === epoch) {
          const { done, value } = await reader.read();
          if (done) break;
          if (session !== epoch) return;
          resetWatchdog();
          buffer += decoder.decode(value, { stream: true });
          // A CRLF pair may itself be split between network chunks.
          let boundary;
          while ((boundary = /\r?\n\r?\n/.exec(buffer))) {
            const frame = buffer.slice(0, boundary.index).replace(/\r\n/g, '\n');
            buffer = buffer.slice(boundary.index + boundary[0].length);
            handleFrame(frame);
            if (session !== epoch) return;
          }
          if (buffer.length > 1024 * 1024) throw new Error('事件帧过大');
        }
      } finally {
        await reader.cancel().catch(() => {});
        reader.releaseLock();
      }
      if (session === epoch) throw new Error('数据流已断开');
    } catch (error) {
      if (session !== epoch || locked || document.hidden) return;
      markOffline();
      setStreamState('retrying', '正在重新连接');
      text('notice', '实时连接中断，正在自动重新连接…');
      $('notice').classList.add('error'); text('updated', lastReceived ? `最近接收 ${clock(lastReceived)} · 离线` : '等待实时读数');
      reconnectTimer = setTimeout(connect, retryDelay);
      retryDelay = Math.min(retryDelay * 2, 15000);
    } finally {
      if (session === epoch) clearTimeout(watchdog);
    }
  }
  $('login-form').addEventListener('submit', async event => {
    event.preventDefault(); const button = event.submitter; button.disabled = true; text('login-error', '');
    try {
      const data = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ password: $('password').value }) });
      if (typeof data.token !== 'string' || !data.token || data.token.length > 2048 || /[\s\x00-\x1f]/.test(data.token)) throw new Error('会话响应无效');
      token = data.token; authEpoch++;
      try { sessionStorage.setItem(sessionKey,token); } catch { /* Keep the session in memory. */ }
      locked = false; $('password').value = ''; await OpenU60Motion.closeDialog(dialog); $('signout').hidden = false; connect();
    } catch (error) { text('login-error', error.auth ? '密码不正确，请重试。' : '无法解锁路由器，请检查连接。'); }
    finally { button.disabled = false; }
  });
  dialog.addEventListener('cancel', event => event.preventDefault());
  $('signout').addEventListener('click', lock);
  $('device-search').addEventListener('input', () => drawClients());
  $('sms-search').addEventListener('input', drawMessages);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopStream();
      if (!locked) {
        setStreamState('paused', '已暂停');
        text('notice', '本标签页在后台时，更新已暂停。');
      }
    } else connect();
  });
  window.addEventListener('dashboard:navigate',event => {
    if (event.detail.key !== 'network/clients') text('device-count', lastGood.get('clients') ? clients.length : '—');
    const options = streamOptions(), includeSms = options.includeSms;
    const topics = {https_status:'https',ota_status:'ota',battery_details:'power',esim_status:'esim',client_details:'clients',dns_cache:'dns',operators:'operators',forwarding:'forwarding',resources:'health',neighbors:'radio',sweep:'radio',speedtest:'speedtest',at_port:'terminal'};
    for (const [name,topic] of Object.entries(topics)) if (topic !== options.topic) { readings.delete(name); lastGood.delete(name); }
    if (!includeSms) {
      readings.delete('sms'); readings.delete('sms_capacity');
      lastGood.delete('sms'); lastGood.delete('sms_capacity');
      renderSMS(null); renderSMSCapacity(null);
    }
    if (options.key !== streamKey) {
      if (includeSms) text('sms-status','正在连接消息存储…');
      connect();
    }
  });
  globalThis.OpenU60Console = {
    request: async (path,options = {}) => {
      try { return await api(path,options); }
      catch (error) { if (error.auth && error.authEpoch === authEpoch) lock(); throw error; }
    },
    data: name => lastGood.get(name)?.data,
    messages: () => messages,
    redrawMessages: drawMessages,
    updateMessages: data => { if (!locked && streamIncludesSms) { lastGood.set('sms',{data,at:Date.now()}); readings.set('sms',{ok:true,data}); renderSMS(data); } },
    refresh: connect,
    get locked() { return locked; },
    get connected() { return transportLive && !locked; }
  };
  // Local elapsed-time display only; this timer never requests router data.
  setInterval(() => { if (outageStarted !== null && !document.hidden) refreshOutageClock(); }, 1000);
  connect();
})();
