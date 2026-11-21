'use strict';
(() => {
  const list = value => String(value || '').split(/[\n,]+/).map(item=>item.trim()).filter(Boolean);
  function httpURL(value,label = '端点') {
    let url;
    try { url = new URL(value); } catch { throw new Error(`${label}必须是完整的 HTTP 或 HTTPS 地址。`); }
    if (!['http:','https:'].includes(url.protocol) || !url.hostname || url.username || url.password) throw new Error(`${label}必须使用 HTTP 或 HTTPS，且地址中不能包含用户名或密码。`);
    return value.trim();
  }
  function headers(value) {
    return String(value || '').split('\n').map(line=>line.trim()).filter(Boolean).map(line=>{
      const colon = line.indexOf(':');
      if (colon < 1) throw new Error('请每行写一个请求头，格式为“名称: 值”。');
      const name = line.slice(0,colon).trim(), value = line.slice(colon+1).trim();
      if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name) || /[\r\n\x00]/.test(value)) throw new Error('请求头包含不支持的字符。');
      return {name,value};
    });
  }
  function filter(values) {
    const type = values.filter, result = {type};
    if (!['all','sender','content','sender_and_content'].includes(type)) throw new Error('请选择消息过滤方式。');
    if (['sender','sender_and_content'].includes(type)) {
      result.patterns = list(values.patterns);
      if (!result.patterns.length) throw new Error('请至少输入一个发送者匹配模式。');
      if (result.patterns.some(pattern=>pattern.includes('*') && !(pattern === '*' || /^\*[^*]+$|^[^*]+\*$/.test(pattern)))) throw new Error('发送者匹配模式只允许在开头或结尾使用一个 *。');
    }
    if (['content','sender_and_content'].includes(type)) {
      result.keywords = list(values.keywords);
      if (!result.keywords.length) throw new Error('请至少输入一个消息关键词。');
    }
    return result;
  }
  function destination(values,saved) {
    const type = values.destination, previous = saved?.type === type ? saved : {};
    const required = (key,label,secret = false) => {
      const raw = String(values[key] || '').trim();
      const result = secret && !raw ? previous[key] : raw;
      if (!result) throw new Error(`请填写“${label}”。`);
      return result;
    };
    if (type === 'telegram') {
      const bot_token = required('bot_token','Telegram 机器人令牌',true), chat_id = required('chat_id','聊天 ID');
      if (!/^\d+:[\w-]+$/.test(bot_token)) throw new Error('请按 number:token 格式输入 Telegram 机器人令牌。');
      if (!/^-?\d+$|^@[A-Za-z0-9_]+$/.test(chat_id)) throw new Error('请使用数字聊天 ID 或以 @ 开头的频道名称。');
      return {type,bot_token,chat_id,silent:values.silent === 'true'};
    }
    if (type === 'webhook') {
      const url = httpURL(required('url','Webhook 地址',true));
      if (!['POST','PUT'].includes(values.method)) throw new Error('请为 Webhook 选择 POST 或 PUT。');
      return {type,url,method:values.method,headers:values.clear_headers ? [] : String(values.headers || '').trim() ? headers(values.headers) : previous.headers || []};
    }
    if (type === 'sms') {
      const forward_number = required('forward_number','转发电话号码').replace(/[ ()-]/g,'');
      if (!/^\+?\d{1,20}$/.test(forward_number)) throw new Error('请输入有效的转发电话号码。');
      return {type,forward_number};
    }
    if (type === 'ntfy') {
      const url = httpURL(required('ntfy_url','ntfy 服务器地址')), topic = required('topic','ntfy 主题');
      if (!/^[\w-]{1,128}$/.test(topic)) throw new Error('ntfy 主题只能使用字母、数字、下划线或连字符。');
      const token = values.clear_token ? null : String(values.token || '').trim() || previous.token || null;
      return {type,url,topic,...(token ? {token} : {})};
    }
    if (['discord','slack'].includes(type)) return {type,webhook_url:httpURL(required('webhook_url',`${type} Webhook 地址`,true))};
    throw new Error('请选择转发目标。');
  }
  function rule(values,saved) {
    const name = values.name.trim(); if (!name || name.length > 100) throw new Error('规则名称长度须为 1 到 100 个字符。');
    return {...(saved ? {id:saved.id} : {}),name,enabled:values.enabled === 'true',filter:filter(values),destination:destination(values,saved?.destination)};
  }
  const canonical = value => JSON.stringify(value && typeof value === 'object' ? Array.isArray(value) ? value.map(item=>JSON.parse(canonical(item))) : Object.fromEntries(Object.keys(value).sort().map(key=>[key,JSON.parse(canonical(value[key]))])) : value);
  function operators(data) {
    const rows = Array.isArray(data?.m_netselect_contents) ? data.m_netselect_contents : [];
    const seen = new Set();
    return rows.flatMap(item=>{
      const plmn = String(item.mcc_mnc ?? item.plmn ?? ''), rat = String(item.rat ?? ''), key = `${plmn}/${rat}`;
      if (seen.has(key)) return []; seen.add(key);
      return [{name:String(item.name || item.operator_name || '未命名网络'),plmn,rat,status:String(item.status || '未上报').toLowerCase(),selectable:/^\d{5,6}$/.test(plmn) && !!rat && String(item.status).toLowerCase() !== 'forbidden'}];
    });
  }
  function atCommand(value,timeout) {
    const command = value.trim();
    if (!/^AT/i.test(command) || command.length > 512 || /[\x00-\x1f\x7f'`$;|&]/.test(command)) throw new Error('请输入一条 AT 命令，最多 512 个字符。路由器无法接受控制字符、单引号、反引号、$、;、| 或 &。');
    if (!Number.isInteger(Number(timeout)) || Number(timeout) < 1 || Number(timeout) > 30) throw new Error('超时时间须在 1 到 30 秒之间。');
    return {command,timeout:Number(timeout)};
  }
  class Job {
    constructor(kind,limit = 90000) { this.kind = kind; this.limit = limit; this.clear(); }
    clear() { this.started = null; this.seenRunning = false; this.phase = 'idle'; }
    start(now = Date.now()) { this.started = now; this.seenRunning = false; this.phase = 'waiting'; }
    observe(value,now = Date.now()) {
      const raw = String(value ?? '').toLowerCase();
      let phase;
      if (this.kind === 'registration') phase = ['success','1'].includes(raw) ? 'complete' : ['fail','failed','0'].includes(raw) ? 'failed' : ['pending','running','registering'].includes(raw) ? 'running' : 'unknown';
      else if (this.kind === 'sweep') phase = Number.isFinite(Number(value)) && Number(value) >= 100 ? 'complete' : Number.isFinite(Number(value)) && Number(value) >= 0 && raw !== '' ? 'running' : 'unknown';
      else phase = ['done','complete','completed','2'].includes(raw) ? 'complete' : ['scanning','running','in_progress','1'].includes(raw) ? 'running' : ['error','fail','failed'].includes(raw) ? 'failed' : 'unknown';
      if (phase === 'running') this.seenRunning = true;
      if (this.started !== null) {
        if (now-this.started >= this.limit && !['complete','failed'].includes(phase)) phase = 'timeout';
        else if (['complete','failed'].includes(phase) && !this.seenRunning && now-this.started < 6000) phase = 'waiting';
      }
      this.phase = phase;
      return phase;
    }
    tick(now = Date.now()) { if (this.pending && now-this.started >= this.limit) this.phase = 'timeout'; return this.phase; }
    get pending() { return this.started !== null && ['waiting','running','unknown'].includes(this.phase); }
  }
  const api = {httpURL,headers,filter,destination,rule,canonical,operators,atCommand,Job};
  if (typeof module === 'object' && module.exports) module.exports = api; else globalThis.OpenU60Advanced = api;
})();
