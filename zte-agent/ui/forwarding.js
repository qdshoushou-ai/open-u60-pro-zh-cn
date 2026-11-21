'use strict';
(() => {
  const UI = OpenU60UI, API = OpenU60Console, A = OpenU60Advanced;
  const {el,button,say,json,confirm,mutate} = UI;
  let storedRules = [], editing = null, dirty = false, attempted = false, loading = false, choosing = false, loadedRevision = null, latest = null;
  const types = [['telegram','Telegram'],['webhook','Webhook'],['sms','短信'],['ntfy','ntfy'],['discord','Discord'],['slack','Slack']];
  const typeLabel = type => types.find(([key])=>key === type)?.[1] || type;
  function privateError(error) {
    let message = String(error.message).replace(/https?:\/\/[^\s)]+/g,'[私有地址]');
    const secrets = [...storedRules,editing].filter(Boolean).flatMap(rule=>{
      const dest = rule.destination || {};
      return [dest.bot_token,dest.token,dest.webhook_url,dest.url,...(dest.headers || []).map(header=>header.value)];
    });
    try { secrets.push(...A.headers(inputs.headers.value).map(header=>header.value)); } catch { /* Incomplete drafts can still be edited. */ }
    for (const input of document.querySelectorAll('#forward-rule input[type=password]')) secrets.push(input.value);
    for (const secret of secrets.filter(value=>value && String(value).length > 3).sort((a,b)=>b.length-a.length)) message = message.split(secret).join('[已隐藏]');
    error.message = message; return error;
  }
  async function request(...args) { try { return await UI.request(...args); } catch (error) { throw privateError(error); } }
  UI.makeForm({route:'sms/forwarding',id:'forward-config',title:'转发服务',description:'使用已启用的规则转发新收到的消息。投递由事件驱动；若通知丢失，将进行兜底检查。',endpoint:'/api/sms/forward/config',source:'forwarding',liveData:data=>data.config,read:async()=>{ const data = await request('/api/sms/forward/config'); return data.config; },fields:[
    UI.choices('enabled','转发服务',[['false','已停用'],['true','已启用']],{boolean:true}),
    UI.field('poll_interval_secs','兜底检查间隔（秒）',{type:'number',min:10,max:86400}),
    UI.choices('mark_read_after_forward','成功转发后',[['false','保留已读状态'],['true','标记消息已读']],{boolean:true}),
    UI.choices('delete_after_forward','已存储消息',[['false','保留消息'],['true','转发后删除']],{boolean:true})
  ],warning:'转发会将符合条件的消息（包括任何隐私内容或验证码）发送到你选择的目标。短信目标可能产生运营商费用。转发后删除将永久移除这些消息。'});

  const section = UI.panel('sms/forwarding','forward-rules','消息路由规则','选择要匹配的内容及其转发目标。新规则初始为已停用，便于你先测试目标再启用。');
  const toolbar = el('div','form-actions rule-toolbar'), newRule = button('新建规则',()=>chooseRule(null),'primary'), reload = button('读取规则',()=>reloadRules());
  toolbar.append(newRule,reload); section.append(toolbar);
  const rulesList = el('div','rule-list'); section.append(rulesList);
  const feedback = UI.status(section);
  const editor = el('form','settings-form forward-editor'), heading = el('h3','form-group-heading','新建规则'), fields = el('fieldset','form-grid'); fields.disabled = true;
  const inputs = {}, wrappers = {};
  const specs = [
    ['name','规则名称'],['enabled','规则状态',[['false','已停用'],['true','已启用']]],
    ['filter','匹配消息',[['all','所有收到的消息'],['sender','发送者'],['content','消息内容'],['sender_and_content','发送者与内容']]],
    ['patterns','发送者匹配模式',null,'textarea','以逗号分隔的号码或发送者名称。单个 * 匹配前缀或后缀，例如 +63917*。匹配不区分大小写。'],
    ['keywords','消息关键词',null,'textarea','以逗号分隔的关键词。任一关键词匹配即可；匹配不区分大小写。'],
    ['destination','目标',types],
    ['bot_token','新 Bot Token',null,'password','编辑时留空将保留已保存的令牌。'],
    ['chat_id','Chat ID 或 @频道'],['silent','Telegram 通知',[['false','普通'],['true','静默']]],
    ['url','新 Webhook 地址',null,'password','留空将保留已保存的地址。地址可能包含私有令牌。'],
    ['method','请求方法',[['POST','POST'],['PUT','PUT']]],
    ['headers','替换请求头',null,'textarea','每行一个“名称: 值”。留空将保留已保存的请求头；使用“移除已保存的请求头”可清除。'],
    ['clear_headers','移除已保存的请求头',null,'checkbox'],
    ['forward_number','转发电话号码'],
    ['ntfy_url','ntfy 服务器地址'],['topic','ntfy 主题'],
    ['token','新访问令牌',null,'password','可选。留空将保留已保存的令牌。'],['clear_token','移除已保存的访问令牌',null,'checkbox'],
    ['webhook_url','新接收 Webhook 地址',null,'password','留空将保留已保存的地址。'],
  ];
  for (const [key,label,values,type,help] of specs) {
    const wrapper = el('div',`form-field ${type === 'checkbox' ? 'checkbox-field' : ''}`), labelNode = el('label','',label), input = el(values ? 'select' : type === 'textarea' ? 'textarea' : 'input');
    input.id = `forward-${key}`; input.name = key; labelNode.htmlFor = input.id;
    if (values) for (const [value,text] of values) input.add(new Option(text,value));
    else if (type !== 'textarea') input.type = type || 'text';
    input.autocomplete = type === 'password' ? 'new-password' : 'off';
    if (type !== 'checkbox' && !values) input.maxLength = key === 'headers' ? 4000 : 1000;
    wrapper.append(labelNode,input); if (help) wrapper.append(el('small','field-help',help));
    inputs[key] = input; wrappers[key] = wrapper; fields.append(wrapper);
  }
  const credentialNote = el('p','field-help','已保存的令牌、Webhook 地址与请求头绝不会填入编辑器。空白替换项将保留该目标已保存的值。');
  const actions = el('div','form-actions'), save = button('保存规则',null,'primary'); save.type = 'submit';
  const test = button('测试目标',testDestination), discard = button('放弃修改',()=>beginEdit(editing?.id ? storedRules.find(rule=>rule.id === editing.id) || null : null));
  actions.append(save,test,discard); editor.append(heading,fields,credentialNote,actions); section.append(editor);
  function values() { return Object.fromEntries(Object.entries(inputs).map(([key,input])=>[key,input.type === 'checkbox' ? input.checked : input.value])); }
  function showFields() {
    const filter = inputs.filter.value, type = inputs.destination.value;
    const visible = new Set(['name','enabled','filter','destination']);
    if (['sender','sender_and_content'].includes(filter)) visible.add('patterns');
    if (['content','sender_and_content'].includes(filter)) visible.add('keywords');
    for (const key of ({telegram:['bot_token','chat_id','silent'],webhook:['url','method','headers','clear_headers'],sms:['forward_number'],ntfy:['ntfy_url','topic','token','clear_token'],discord:['webhook_url'],slack:['webhook_url']}[type] || [])) visible.add(key);
    for (const [key,wrapper] of Object.entries(wrappers)) wrapper.hidden = !visible.has(key);
  }
  function beginEdit(rule) {
    editing = rule ? structuredClone(rule) : null;
    const filter = rule?.filter || {type:'all'}, dest = rule?.destination || {type:'telegram'};
    for (const input of Object.values(inputs)) { if (input.type === 'checkbox') input.checked = false; else input.value = ''; }
    Object.assign(inputs.name,{value:rule?.name || ''}); inputs.enabled.value = String(rule?.enabled || false);
    inputs.filter.value = filter.type; inputs.patterns.value = (filter.patterns || []).join(', '); inputs.keywords.value = (filter.keywords || []).join(', ');
    inputs.destination.value = dest.type; inputs.chat_id.value = dest.chat_id || ''; inputs.silent.value = String(dest.silent || false);
    inputs.method.value = dest.method || 'POST'; inputs.forward_number.value = dest.forward_number || '';
    inputs.ntfy_url.value = dest.type === 'ntfy' ? dest.url : 'https://ntfy.sh'; inputs.topic.value = dest.topic || '';
    heading.textContent = rule ? `编辑规则 · ${rule.name}` : '新建规则';
    dirty = false; section.dataset.dirty = 'false'; save.disabled = true; fields.disabled = false; discard.disabled = true; showFields();
  }
  editor.addEventListener('input',()=>{ dirty = true; section.dataset.dirty = 'true'; save.disabled = discard.disabled = false; showFields(); say(feedback,'规则修改未保存 · 实时更新会保留你的草稿。'); });
  editor.addEventListener('change',()=>editor.dispatchEvent(new Event('input')));
  async function getConfig() {
    const data = await request('/api/sms/forward/config');
    if (!data?.config || !Array.isArray(data.config.rules)) throw new Error('路由器未返回转发规则。');
    return data;
  }
  function drawRules(rules) {
    rulesList.replaceChildren();
    if (!rules.length) { rulesList.append(el('p','carrier-empty','尚无转发规则。请先创建已停用的规则并测试其目标。')); return; }
    for (const rule of rules) {
      const card = el('article','rule-card'), copy = el('div'), name = el('h3','',rule.name), meta = el('p','field-help',`${typeLabel(rule.destination_type || rule.destination?.type)} · ${rule.enabled ? '已启用' : '已停用'}`), controls = el('div','form-actions rule-actions');
      copy.append(name,meta);
      controls.append(button('编辑',()=>chooseRule(rule.id)),button(rule.enabled ? '停用' : '启用',()=>toggleRule(rule)),button('删除',()=>deleteRule(rule),'danger'));
      card.append(copy,controls); rulesList.append(card);
    }
  }
  async function loadRules({silent = false} = {}) {
    if (loading || API.locked) return; loading = true; attempted = true; const epoch = UI.epoch;
    newRule.disabled = reload.disabled = true;
    try {
      const data = await getConfig(); if (!UI.current(epoch) || UI.saving || (loadedRevision !== null && data.revision < loadedRevision)) return;
      storedRules = data.config.rules; loadedRevision = data.revision;
      drawRules(storedRules);
      if (!dirty && !choosing) beginEdit(editing ? storedRules.find(rule=>rule.id === editing.id) || null : null);
      else say(feedback,'路由器上的规则已更新。你的草稿已保留；保存时会检查冲突修改。');
      if (!dirty && !silent) say(feedback,'已加载当前规则。');
    } catch (error) { if (UI.current(epoch)) say(feedback,`规则不可用。${error.message}`,true); }
    finally { loading = false; if (UI.current(epoch)) { newRule.disabled = loadedRevision === null; reload.disabled = false; } }
  }
  async function reloadRules() {
    if (dirty && !await confirm('放弃规则修改？','读取路由器的当前规则并替换此草稿。',{label:'放弃并读取'})) return;
    dirty = false; await loadRules();
  }
  async function chooseRule(id) {
    if (choosing) return;
    if (dirty && !await confirm('替换规则草稿？','此操作将替换你未保存的规则修改。',{label:'替换草稿'})) return;
    const epoch = UI.epoch; choosing = true; fields.disabled = true; newRule.disabled = true;
    try {
      const data = await getConfig(); if (!UI.current(epoch)) return; storedRules = data.config.rules; loadedRevision = data.revision;
      const rule = id === null ? null : storedRules.find(rule=>rule.id === id); if (id !== null && !rule) throw new Error('此规则已不存在。请读取当前规则。');
      beginEdit(rule); heading.scrollIntoView({block:'center',behavior:'smooth'}); inputs.name.focus({preventScroll:true});
    } catch (error) { if (UI.current(epoch)) say(feedback,error.message,true); }
    finally { choosing = false; if (UI.current(epoch)) { fields.disabled = loadedRevision === null; newRule.disabled = loadedRevision === null; } }
  }
  editor.addEventListener('submit',async event=>{
    event.preventDefault(); if (!dirty || fields.disabled) return;
    try {
      const body = A.rule(values(),editing);
      if (!await confirm('保存转发规则？',`保存“${body.name}”，目标为 ${typeLabel(body.destination.type)}。${body.enabled ? '转发服务启用期间，符合条件的消息可被转发。' : '此规则将保持停用。'}`,{label:'保存规则'})) return;
      await mutate(feedback,async current=>{
        const fresh = await getConfig(); if (!current()) return;
        if (editing && A.canonical(fresh.config.rules.find(rule=>rule.id === editing.id)) !== A.canonical(editing)) throw new Error('此规则已在其他位置更改。保存前请读取当前规则并检查你的草稿。');
        if (fresh.config.rules.some(rule=>rule.id !== editing?.id && rule.name.toLowerCase() === body.name.toLowerCase())) throw new Error('已存在同名规则。请编辑该规则或使用其他名称。');
        const result = await request('/api/sms/forward/rules',json(editing ? 'PUT' : 'POST',body)); if (!current()) return;
        const check = await getConfig(); if (!current()) return;
        const saved = check.config.rules.find(rule=>rule.id === (editing?.id ?? result.id));
        storedRules = check.config.rules; loadedRevision = check.revision; drawRules(storedRules);
        if (!saved || A.canonical(saved) !== A.canonical({...body,id:saved.id})) { say(feedback,'保存请求已接受，但路由器尚未确认此规则。你的草稿已保留。',true); return; }
        beginEdit(saved); say(feedback,'规则已保存，路由器已确认。');
      });
    } catch (error) { say(feedback,privateError(error).message,true); }
  });
  function describe(dest) {
    if (dest.type === 'sms') return `短信发送至 ${dest.forward_number}`;
    if (dest.type === 'telegram') return `Telegram 聊天 ${dest.chat_id}`;
    try { return `${typeLabel(dest.type)}，地址 ${new URL(dest.url || dest.webhook_url).host}`; } catch { return typeLabel(dest.type); }
  }
  async function testDestination() {
    try {
      const destination = A.destination(values(),editing?.destination);
      if (!await confirm('发送目标测试？',`向 ${describe(destination)} 发送一条固定测试消息。即使规则或转发服务已停用，也会发送。短信目标可能产生运营商费用。`,{label:'发送测试'})) return;
      await mutate(feedback,async current=>{ await request('/api/sms/forward/test',{...json('POST',{destination}),timeoutMs:25000}); if (current()) say(feedback,'目标已接受测试请求。短信被接受并不代表手机已收到。'); });
    } catch (error) { say(feedback,privateError(error).message,true); }
  }
  async function toggleRule(rule) {
    if (!await confirm(rule.enabled ? '停用此规则？' : '启用此规则？',`${rule.enabled ? '停止通过' : '通过'}“${rule.name}”转发符合条件的消息。转发服务也必须启用。`,{label:rule.enabled ? '停用规则' : '启用规则'})) return;
    await mutate(feedback,async current=>{ await request('/api/sms/forward/rules/toggle',json('PUT',{id:rule.id,enabled:!rule.enabled})); if (!current()) return; const data = await getConfig(); if (!current()) return; storedRules = data.config.rules; loadedRevision = data.revision; drawRules(storedRules); say(feedback,storedRules.some(item=>item.id === rule.id && item.enabled === !rule.enabled) ? '规则状态已确认。' : '路由器尚未确认规则状态。重试前请读取规则。'); });
  }
  async function deleteRule(rule) {
    if (!await confirm('删除转发规则？',`永久移除“${rule.name}”。过往日志条目会保留，但重试将不再有该目标。`,{label:'删除规则',destructive:true})) return;
    await mutate(feedback,async current=>{ await request('/api/sms/forward/rules',json('DELETE',{id:rule.id})); if (!current()) return; const data = await getConfig(); if (!current()) return; storedRules = data.config.rules; loadedRevision = data.revision; drawRules(storedRules); if (!storedRules.some(item=>item.id === rule.id)) { if (editing?.id === rule.id) beginEdit(null); say(feedback,'规则删除已确认。'); } else say(feedback,'删除请求已接受，但规则仍被上报。重试前请读取规则。',true); });
  }

  const logPanel = UI.panel('sms/forwarding','forward-log','投递活动','实时投递结果。被暂存的消息会等待网络连接并自动重试。');
  const logToolbar = el('div','form-actions rule-toolbar'), logFilter = el('select'); logFilter.id = 'forward-log-filter'; logFilter.setAttribute('aria-label','筛选转发活动');
  for (const [value,label] of [['all','全部活动'],['pending','等待网络连接'],['failed','失败'],['success','已接受']]) logFilter.add(new Option(label,value));
  const clear = button('清除已结束活动',clearLog); logToolbar.append(logFilter,clear); logPanel.append(logToolbar);
  const logList = el('div','forward-log-list'); logPanel.append(logList); const logFeedback = UI.status(logPanel);
  function drawLog() {
    logList.replaceChildren(); const entries = latest?.log || [];
    const found = entries.filter(entry=>logFilter.value === 'all' || (logFilter.value === 'pending' ? entry.pending : logFilter.value === 'success' ? entry.success : !entry.success && !entry.pending));
    if (!found.length) logList.append(el('p','carrier-empty','没有匹配的投递活动。'));
    for (const entry of found) {
      const card = el('article','forward-log-entry'), top = el('div','message-card-heading');
      top.append(el('strong','',entry.rule_name || '已删除规则'),el('span','tag',entry.pending ? '等待中' : entry.success ? '已接受' : '失败'));
      card.append(top,el('p','',entry.content_preview || '无消息预览'),el('small','field-help',`${entry.sender || '未知发送者'} · ${typeLabel(entry.destination_type)} · ${new Date(entry.timestamp*1000).toLocaleString()}`));
      if (entry.error) card.append(el('p','action-status',entry.error));
      if (!entry.success && !entry.pending) { const actions = el('div','form-actions rule-actions'); actions.append(button('重试一次',()=>retry(entry))); card.append(actions); }
      logList.append(card);
    }
  }
  logFilter.addEventListener('change',drawLog);
  async function retry(entry) {
    const epoch = UI.epoch;
    try {
      const data = await getConfig(); if (!UI.current(epoch)) return;
      const rule = data.config.rules.find(rule=>rule.id === entry.rule_id);
      if (!rule) { say(logFeedback,'此规则已不存在。无法重试其原目标。',true); return; }
      if (!await confirm('重试此转发一次？',`将来自 ${entry.sender} 的已存储消息转发到当前目标：${describe(rule.destination)}。预览：${entry.content_preview || '不可用'}。如果目标已接受过更早的请求，可能产生重复消息。`,{label:'重试一次'})) return;
      await mutate(logFeedback,async current=>{ await request('/api/sms/forward/retry',{...json('POST',{index:entry.index,expected:{sms_id:entry.sms_id,rule_id:entry.rule_id,timestamp:entry.timestamp},expected_rule_revision:data.revision}),timeoutMs:25000}); if (current()) say(logFeedback,'目标已接受重试请求。实时活动日志将显示结果。'); });
    } catch (error) { if (UI.current(epoch)) say(logFeedback,privateError(error).message,true); }
  }
  async function clearLog() {
    if (!await confirm('清除已结束的转发活动？','尽可能移除已结束的日志条目。等待转发的消息及其相关活动会保留在日志中。',{label:'清除活动',destructive:true})) return;
    await mutate(logFeedback,async current=>{ await request('/api/sms/forward/log/clear',json('POST',{})); if (current()) say(logFeedback,'清除请求已接受。等待中的消息及其相关活动将保留；实时日志会自动更新。'); });
  }
  function refreshChangedRules() {
    if (latest && (loadedRevision === null || latest.revision > loadedRevision) && !loading && !UI.saving && OpenU60Navigation.current.key === 'sms/forwarding') loadRules({silent:true});
  }
  window.addEventListener('dashboard:mutation-complete',refreshChangedRules);
  window.addEventListener('dashboard:readings',event=>{
    if (event.detail.snapshot && OpenU60Navigation.current.key === 'sms/forwarding') loadedRevision = null;
    const reading = event.detail.readings.forwarding;
    if (!reading) return;
    if (!reading.ok) { say(logFeedback,'转发活动不可用。最近接收的条目已保留。',true); return; }
    latest = reading.data; drawLog(); drawRules(latest.rules || []);
    refreshChangedRules();
  });
  UI.track({route:'sms/forwarding',get loaded(){return attempted;},load:loadRules,get dirty(){return dirty;},clear:()=>{
    storedRules = []; editing = latest = null; loadedRevision = null; attempted = dirty = choosing = false; fields.disabled = true;
    for (const input of Object.values(inputs)) { if (input.type === 'checkbox') input.checked = false; else input.value = ''; }
    rulesList.replaceChildren(); logList.replaceChildren(); logFilter.value = 'all'; feedback.textContent = logFeedback.textContent = ''; section.dataset.dirty = 'false'; save.disabled = newRule.disabled = true;
  }});
  newRule.disabled = true; save.disabled = true; showFields();
})();
