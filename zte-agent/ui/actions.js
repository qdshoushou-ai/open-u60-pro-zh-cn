'use strict';
(() => {
  const bytes = value => new TextEncoder().encode(value).length;
  const restricted = /['";$`\\|<>&]/;
  function wifiText(value,label,max = 32) {
    if (!value || bytes(value) > max) throw new Error(`${label}必须包含 1–${max} 个 UTF-8 字节。`);
    if (restricted.test(value)) throw new Error(`${label}含有路由器无法保存的字符：引号、分号、$、反引号、反斜杠、|、<、> 或 &。`);
  }
  function wifiPassword(value) {
    if (restricted.test(value)) throw new Error('路由器无法保存此 Wi-Fi 密码中的一个或多个字符。请选择其他密码。');
    if (!((value.length >= 8 && bytes(value) <= 63) || /^[0-9a-f]{64}$/i.test(value))) throw new Error('请使用 8–63 字节的 Wi-Fi 密码，或 64 位十六进制密钥。');
  }
  function encodeSMS(value) {
    let body = '';
    for (let index = 0; index < value.length; index++) body += value.charCodeAt(index).toString(16).padStart(4,'0').toUpperCase();
    return body;
  }
  function smsBody(number,message,date = new Date()) {
    const recipient = number.trim().replace(/[ ()-]/g,'');
    if (!/^\+?\d{1,20}$/.test(recipient)) throw new Error('请输入有效的电话号码，必要时请包含国家代码。');
    if (!message.trim()) throw new Error('请输入消息内容。');
    if (message.length > 1530) throw new Error('消息请控制在 1,530 个字符以内。');
    const pad = value => String(value).padStart(2,'0');
    const offset = -date.getTimezoneOffset()/60;
    const timestamp = [pad(date.getFullYear()%100),pad(date.getMonth()+1),pad(date.getDate()),pad(date.getHours()),pad(date.getMinutes()),pad(date.getSeconds()),`${offset >= 0 ? '+' : ''}${offset}`].join(';');
    const gsm = '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà^{}\\[~]|€';
    return {number:recipient,sms_time:timestamp,message_body:encodeSMS(message),id:'-1',encode_type:[...message].every(char => gsm.includes(char)) ? 'GSM7_default' : 'UNICODE'};
  }
  function ids(values) {
    if (!values.length || values.some(value => !/^\d+$/.test(String(value)))) throw new Error('未选择有效消息。');
    return [...new Set(values.map(String))].join(';')+';';
  }
  function bands(value,maximum) {
    const list = value.split(/[\s,;]+/).filter(Boolean).map(part => Number(part.replace(/^[bn]/i,'')));
    if (!list.length || list.some(band => !Number.isInteger(band) || band < 1 || band > maximum)) throw new Error(`请输入 1 到 ${maximum} 之间的频段号，用逗号分隔。`);
    return [...new Set(list)].sort((a,b)=>a-b).join(',');
  }
  const api = {wifiText,wifiPassword,smsBody,encodeSMS,ids,bands};
  if (typeof module === 'object' && module.exports) module.exports = api; else globalThis.OpenU60Actions = api;
})();
