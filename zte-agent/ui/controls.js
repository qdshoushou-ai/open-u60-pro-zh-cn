'use strict';
(() => {
  const consoleAPI = globalThis.OpenU60Console, A = globalThis.OpenU60Actions;
  const views = [], selected = new Set();
  let session = 0, mutationBusy = false;
  const el = (tag,className,text) => { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; };
  const button = (text,run,className = '') => { const node = el('button',`button ${className}`,text); node.type = 'button'; if (run) node.addEventListener('click',run); return node; };
  const say = (node,text,error = false) => { node.textContent = text; node.dataset.error = String(error); };
  const json = (method,body) => ({method,body:JSON.stringify(body)});
  const request = (...args) => consoleAPI.request(...args);
  const route = () => OpenU60Navigation.current.key;
  const delay = ms => new Promise(resolve => setTimeout(resolve,ms));
  function panel(key,id,title,description) {
    const section = el('section','panel control-panel'); section.id = id; section.dataset.views = key;
    section.dataset.viewHidden = String(route() !== key);
    const heading = el('div','section-heading'), copy = el('div');
    copy.append(el('h2','',title),el('p','section-subtitle',description)); heading.append(copy); section.append(heading);
    document.querySelector('#cellular').before(section); return section;
  }
  const status = section => { const node = el('p','action-status'); node.setAttribute('role','status'); node.setAttribute('aria-live','polite'); section.append(node); return node; };
  const confirmation = el('dialog','confirm-dialog');
  confirmation.setAttribute('aria-labelledby','confirm-title');
  const confirmForm = el('form'), confirmTitle = el('h2','','确认更改'); confirmTitle.id = 'confirm-title';
  const confirmCopy = el('p','confirm-copy'), confirmLabel = el('label','','输入 RESET 以继续'), confirmInput = el('input');
  confirmInput.id = 'confirm-reset'; confirmInput.autocomplete = 'off'; confirmLabel.htmlFor = confirmInput.id;
  const confirmActions = el('div','form-actions'), cancel = button('取消'), proceed = button('确认',null,'primary');
  confirmActions.append(cancel,proceed); confirmForm.append(confirmTitle,confirmCopy,confirmLabel,confirmInput,confirmActions); confirmation.append(confirmForm); document.body.append(confirmation);
  let pendingConfirmation, confirmationPhrase='RESET', closingConfirmation=false, confirmationResult=false;
  function finishConfirmation(value) {
    if (!pendingConfirmation) return;
    if (closingConfirmation) { if (!value) confirmationResult=false; return; }
    closingConfirmation=true;confirmationResult=value;cancel.disabled=proceed.disabled=true;
    OpenU60Motion.closeDialog(confirmation).then(() => {
      const resolve=pendingConfirmation;pendingConfirmation=null;closingConfirmation=false;
      confirmInput.value='';confirmCopy.textContent='';resolve(confirmationResult);
    });
  }
  cancel.addEventListener('click',()=>finishConfirmation(false));
  proceed.addEventListener('click',()=>finishConfirmation(true));
  confirmation.addEventListener('cancel',event=>{ event.preventDefault(); finishConfirmation(false); });
  confirmForm.addEventListener('submit',event=>event.preventDefault());
  confirmInput.addEventListener('input',()=>{ proceed.disabled = confirmInput.value !== confirmationPhrase; });
  function confirm(title,text,{destructive = false,typed = false,label = '应用更改',phrase='RESET'} = {}) {
    if (pendingConfirmation || mutationBusy) return Promise.resolve(false);
    confirmationPhrase=phrase;confirmLabel.textContent=`输入 ${phrase} 以继续`;
    confirmTitle.textContent = title; confirmCopy.textContent = text; confirmLabel.hidden = confirmInput.hidden = !typed;
    confirmInput.value = ''; proceed.textContent = label; proceed.disabled = typed; proceed.classList.toggle('danger',destructive);
    cancel.disabled=false;OpenU60Motion.showDialog(confirmation);cancel.focus();return new Promise(resolve=>{ pendingConfirmation = resolve; });
  }
  async function mutate(node,operation) {
    if (mutationBusy) { say(node,'另一项更改正在进行中，请等待其完成。',true); return; }
    if (consoleAPI.locked || !consoleAPI.connected) { say(node,'请先连接并解锁控制台，再进行更改。',true); return; }
    mutationBusy = true; const epoch = session;
    document.documentElement.dataset.saving = 'true';
    const surfaces = [...document.querySelectorAll('.control-panel form,#apn-profile,.message-toolbar,.message-actions,.rule-toolbar,.rule-actions,.operator-list,.diagnostic-actions')];
    for (const surface of surfaces) surface.inert = true;
    try { await operation(()=>epoch === session && !consoleAPI.locked); }
    catch (error) { if (epoch === session && !consoleAPI.locked) say(node,`更改未能确认。${error.message}。请先检查路由器状态再重试；请求可能已生效。`,true); }
    finally { mutationBusy = false; delete document.documentElement.dataset.saving; for (const surface of surfaces) surface.inert = false; window.dispatchEvent(new Event('dashboard:mutation-complete')); }
  }
  function field(key,label,options = {}) { return {key,label,...options}; }
  const choices = (key,label,values,options) => field(key,label,{values,...options});
  const onoff = (key,label,options) => choices(key,label,[['1','开启'],['0','关闭']],options);
  const disabled = (key,label,options) => choices(key,label,[['0','开启'],['1','关闭']],options);
  const security = [['psk2+ccmp','WPA2 · AES'],['sae-mixed','WPA2 / WPA3'],['sae','WPA3'],['none','开放 · 无密码']];
  function makeForm(config) {
    const section = panel(config.route,config.id,config.title,config.description);
    const specs = config.fields.filter(spec=>!spec.heading);
    const form = el('form','settings-form'); form.autocomplete = 'off';
    const fields = el('fieldset','form-grid'); fields.disabled = true;
    const legend = el('legend','sr-only',config.title); fields.append(legend);
    const inputs = new Map(); let baseline = null, loading = false, dirty = false, attempted = false;
    for (const spec of config.fields) {
      if (spec.heading) { fields.append(el('h3','form-group-heading',spec.heading)); continue; }
      const wrapper = el('div','form-field'), label = el('label','',spec.label);
      const input = el(spec.values ? 'select' : spec.type === 'textarea' ? 'textarea' : 'input');
      input.id = `${config.id}-${spec.key}`; input.name = spec.key; label.htmlFor = input.id;
      if (spec.values) for (const [value,text] of spec.values) input.add(new Option(text,String(value)));
      else { input.type = spec.type || 'text'; if (spec.min !== undefined) input.min = spec.min; if (spec.max !== undefined) input.max = spec.max; if (spec.type === 'number') input.step = '1'; }
      input.autocomplete = spec.secret ? 'new-password' : 'off';
      if (spec.placeholder) input.placeholder = spec.placeholder;
      if (spec.required) input.required = true;
      if (spec.maxLength) input.maxLength = spec.maxLength;
      wrapper.append(label,input);
      if (spec.help || spec.secret) { const help = el('small','field-help',spec.help || '留空则保留当前密码。'); help.id = `${input.id}-help`; input.setAttribute('aria-describedby',help.id); wrapper.append(help); }
      fields.append(wrapper); inputs.set(spec.key,input);
    }
    const actions = el('div','form-actions'), save = button(config.saveLabel || '保存更改',null,'primary'); save.type = 'submit';
    const discard = button('放弃修改',()=>{ if (baseline) populate(baseline); });
    const reload = button('读取当前设置',async()=>{ if (!dirty || await confirm('放弃未保存的修改？','读取路由器当前设置并替换此草稿。',{label:'放弃并读取'})) await load(); });
    actions.append(save,discard,reload); form.append(fields,actions); section.append(form); const feedback = status(section); save.disabled = discard.disabled = true;
    const readKey = spec => spec.readKey || spec.key;
    function value(spec) { const raw = baseline?.[readKey(spec)]; return raw === undefined || raw === null ? '' : String(raw); }
    function populate(data) {
      baseline = data; dirty = false;
      for (const spec of specs) {
        const input = inputs.get(spec.key), raw = spec.secret ? '' : value(spec);
        if (spec.values) { for (const option of [...input.options]) if (option.dataset.current) option.remove(); if (![...input.options].some(option=>option.value === raw)) { const option = new Option(raw ? `当前：${raw}` : '未上报',raw); option.dataset.current = 'true'; input.add(option); } }
        input.value = raw;
      }
      fields.disabled = false; save.disabled = true; discard.disabled = true; section.dataset.dirty = 'false';
    }
    function changes() {
      const changed = {};
      for (const spec of specs) {
        const raw = inputs.get(spec.key).value;
        if (spec.secret && !raw) continue;
        if (raw !== value(spec)) changed[spec.key] = spec.type === 'number' ? Number(raw) : spec.boolean ? raw === 'true' : raw;
      }
      return changed;
    }
    form.addEventListener('input',()=>{ dirty = baseline && Object.keys(changes()).length > 0; save.disabled = !dirty; discard.disabled = !dirty; section.dataset.dirty = String(!!dirty); if (dirty) say(feedback,'未保存的修改 · 实时更新会保留你的草稿。'); });
    form.addEventListener('change',()=>form.dispatchEvent(new Event('input')));
    async function read() {
      const data = await (config.read ? config.read() : request(config.endpoint));
      if (!data || typeof data !== 'object' || Array.isArray(data) || !specs.some(spec=>Object.hasOwn(data,readKey(spec)))) throw new Error('路由器未返回可用的设置');
      return data;
    }
    async function load() {
      if (loading || consoleAPI.locked) return; loading = true; attempted = true; const epoch = session; fields.disabled = true; save.disabled = discard.disabled = true; say(feedback,'正在读取当前设置…');
      try { const data = await read(); if (epoch !== session || consoleAPI.locked) return; populate(data); say(feedback,'当前设置已加载。'); }
      catch (error) { if (epoch === session && !consoleAPI.locked) { say(feedback,`设置不可用。${error.message}。使用“读取当前设置”重试。`,true); fields.disabled = !baseline; save.disabled = !dirty; discard.disabled = !dirty; } }
      finally { loading = false; }
    }
    form.addEventListener('submit',async event=>{
      event.preventDefault(); if (!baseline || !form.reportValidity() || !dirty) return;
      try {
        const changed = changes(), all = Object.fromEntries(specs.map(spec=>[spec.key,inputs.get(spec.key).value]));
        for (const spec of specs) {
          if (!(spec.key in changed)) continue;
          const raw = all[spec.key];
          if (spec.type === 'number' && (raw === '' || !Number.isInteger(Number(raw)))) throw new Error(`请为“${spec.label}”输入整数。`);
          if (spec.values && !spec.values.some(([value])=>String(value) === raw)) throw new Error(`请为“${spec.label}”选择一个受支持的值。`);
        }
        await config.validate?.(changed,all,baseline);
        const warning = typeof config.warning === 'function' ? config.warning(changed,all,baseline) : config.warning;
        if (warning && !await confirm(config.title,warning,{label:'保存更改'})) return;
        await mutate(feedback,async current=>{
          fields.disabled = true; save.disabled = discard.disabled = reload.disabled = true; say(feedback,'正在应用更改…');
          try {
            const body = config.body ? config.body(changed,all,baseline) : changed;
            if (config.guardKeys) {
              const fresh = await read(); if (!current()) return;
              if (config.guardKeys.some(key=>String(fresh[key] ?? '') !== String(baseline[key] ?? ''))) throw new Error('这些设置已在别处更改；请读取当前设置并检查你的修改');
            }
            if (config.preflight) { await config.preflight(body,all,baseline); if (!current()) return; }
            config.onWriting?.(body);
            await request(config.writeEndpoint || config.endpoint,json(config.method || 'PUT',body));
            if (!current()) return;
            let latest, matched = false;
            for (const wait of [0,1000,2000]) {
              if (wait) await delay(wait); if (!current()) return;
              latest = await read(); if (!current()) return;
              matched = config.verify ? config.verify(latest,body) : Object.entries(changed).every(([key,val])=>String(latest[readKey(specs.find(spec=>spec.key === key))]) === String(val));
              if (matched) break;
            }
            if (matched) { populate(latest); say(feedback,'已保存，并已由路由器确认。'); }
            else say(feedback,'请求已接受，但路由器尚未确认这些值。你的草稿已保留。请先读取当前设置再重试。',true);
          } finally { if (current()) { fields.disabled = false; save.disabled = !dirty; discard.disabled = !dirty; reload.disabled = false; } }
        });
      } catch (error) { say(feedback,error.message,true); }
    });
    const view = {route:config.route,section,load,clear:()=>{ baseline = null; dirty = false; attempted = false; fields.disabled = true; for (const input of inputs.values()) input.value = ''; save.disabled = discard.disabled = true; reload.disabled = false; section.dataset.dirty = 'false'; say(feedback,'解锁控制台以加载设置。'); },get loaded(){return attempted;},get dirty(){return dirty;},sync(readings) {
      const source = config.source || {'/api/wifi/status':'wifi','/api/wifi/guest':'guest','/api/modem/data':'mobile','/api/modem/status':'modem','/api/network/signal':'signal','/api/device/charge-control':'charging'}[config.endpoint];
      const raw = readings[source]?.ok ? readings[source].data : null;
      const data = config.liveData && raw ? config.liveData(raw) : raw;
      if (!baseline || !data || mutationBusy || loading) return;
      const safe = Object.fromEntries(specs.filter(spec=>!spec.secret && Object.hasOwn(data,readKey(spec))).map(spec=>[readKey(spec),data[readKey(spec)]]));
      if (!Object.entries(safe).some(([key,value])=>String(value) !== String(baseline[key]))) return;
      if (dirty) say(feedback,'路由器设置已更改。你未保存的草稿已保留。请先读取当前设置再应用。',true);
      else { populate({...baseline,...safe}); say(feedback,'已从路由器实时数据流更新。'); }
    }};
    views.push(view); return view;
  }
  const wifiWarning = '应用无线设置可能会断开此设备。请使用新的网络名称或密码重新连接，然后重新打开控制台。';
  const wifiFields = [onoff('wifi_onoff','Wi-Fi'),onoff('wifi6_switch','Wi-Fi 6')];
  for (const [suffix,label,channels,widths] of [
    ['2g','2.4 GHz',['auto','1','2','3','4','5','6','7','8','9','10','11','12','13'],['auto','EHT20','EHT40']],
    ['5g','5 GHz',['auto','36','40','44','48','52','56','60','64','100','104','108','112','116','120','124','128','132','136','140','144','149','153','157','161','165'],['auto','EHT20','EHT40','EHT80','EHT160']]
  ]) wifiFields.push({heading:label},disabled(suffix === '2g' ? 'radio2_disabled' : 'radio5_disabled',`${label} 射频`),field(`ssid_${suffix}`,`${label} 名称`,{required:true}),choices(`encryption_${suffix}`,`${label} 安全`,security),field(`key_${suffix}`,`${label} 新密码`,{type:'password',secret:true}),onoff(`hidden_${suffix}`,`${label} 隐藏网络`),choices(`channel_${suffix}`,`${label} 信道`,channels.map(value=>[value,value === 'auto' ? '自动' : value]),{help:'可用信道取决于路由器的国家/地区设置。'}),choices(`htmode_${suffix}`,`${label} 信道宽度`,widths.map(value=>[value,value === 'auto' ? '自动' : `${value.slice(3)} MHz`])),field(`txpower_${suffix}`,`${label} 发射功率（%）`,{type:'number',min:1,max:100}));
  function validateWiFi(changed,all,baseline,guest = false) {
    const prefixes = guest ? ['guest'] : ['2g','5g'];
    for (const suffix of prefixes) {
      const name = guest ? 'guest_ssid' : `ssid_${suffix}`, key = guest ? 'guest_key' : `key_${suffix}`, securityKey = guest ? 'guest_encryption' : `encryption_${suffix}`;
      if (name in changed) A.wifiText(all[name],'网络名称');
      if (all[key]) { A.wifiPassword(all[key]); if (all[securityKey].startsWith('sae') && all[key].length > 63) throw new Error('WPA3 密码长度必须为 8–63 字节。'); }
      if (all[securityKey] !== 'none' && securityKey in changed && !all[key] && !baseline[guest ? 'key' : key]) throw new Error('启用网络安全时必须输入密码。');
    }
  }
  makeForm({route:'network/wifi',id:'wifi-config',title:'无线网络',description:'分别编辑每个射频。在你替换密码之前，密码不会显示。',endpoint:'/api/wifi/status',writeEndpoint:'/api/wifi/settings',fields:wifiFields,warning:wifiWarning,validate:validateWiFi});
  makeForm({route:'network/wifi',id:'guest-config',title:'访客网络',description:'为访客提供的共享名称与密码，射频控制相互独立。',endpoint:'/api/wifi/guest',fields:[disabled('guest_disabled_2g','2.4 GHz 访客射频',{readKey:'disabled_2g'}),disabled('guest_disabled_5g','5 GHz 访客射频',{readKey:'disabled_5g'}),field('guest_ssid','访客网络名称',{readKey:'ssid',required:true}),choices('guest_encryption','安全',security,{readKey:'encryption'}),field('guest_key','新密码',{type:'password',secret:true,readKey:'key'}),onoff('guest_hidden','隐藏网络',{readKey:'hidden'}),onoff('guest_isolate','隔离访客设备',{readKey:'isolate'}),choices('guest_active_time','自动关闭',[[0,'不限制时间'],[30,'30 分钟后'],[60,'1 小时后'],[120,'2 小时后'],[240,'4 小时后'],[480,'8 小时后'],[720,'12 小时后'],[1440,'24 小时后']])],warning:wifiWarning,validate:(...args)=>validateWiFi(...args,true)});
  const mobileWarning = '更改移动网络设置可能会中断互联网访问。漫游可能产生运营商费用。请保持与路由器的本地连接。';
  makeForm({route:'network/mobile',id:'mobile-config',title:'移动数据',description:'控制 SIM 卡数据连接与漫游。',endpoint:'/api/modem/data',validate:(_,all,baseline)=>{ if (!['enable','roam_enable','connect_mode'].every(key=>['0','1'].includes(all[key]))) throw new Error('保存前请为每个移动数据设置选择值。'); if (all.roam_enable === '1' && String(baseline.roam_enable) !== '1' && all.enable !== '1') throw new Error('开启漫游时请同时启用移动数据。路由器需要它来建立漫游连接。'); },fields:[choices('enable','移动数据',[['1','已启用'],['0','已停用']]),choices('roam_enable','数据漫游',[['0','已停用'],['1','允许 · 可能产生运营商费用']]),choices('connect_mode','连接模式',[['1','自动'],['0','手动']])],warning:mobileWarning,body:(_,all)=>({cid:1,enable:Number(all.enable),roam_enable:Number(all.roam_enable),connect_mode:Number(all.connect_mode),...(all.enable === '0' ? {connect_status:'disconnected'} : {})}),verify:(data,body)=>['enable','roam_enable','connect_mode'].every(key=>String(data[key]) === String(body[key]))});
  makeForm({route:'network/mobile',id:'radio-config',title:'调制解调器射频',description:'飞行模式会停用蜂窝服务，Wi-Fi 仍可保持可用。',endpoint:'/api/modem/status',writeEndpoint:'/api/modem/airplane',method:'POST',fields:[choices('operate_mode','射频状态',[['ONLINE','在线'],['LPM','飞行模式']])],warning:'飞行模式会断开蜂窝数据、通话与消息。请保持本地连接，以便重新开启射频。'});
  makeForm({route:'network/mobile',id:'network-mode-config',title:'首选移动网络',description:'自动模式提供最广的回退范围。SA 需要运营商与 SIM 卡支持。',endpoint:'/api/network/signal',writeEndpoint:'/api/modem/network-mode',fields:[choices('net_select','网络偏好',[['WL_AND_5G','自动 · 5G / 4G / 3G'],['LTE_AND_5G','5G NSA · LTE + NR'],['Only_5G','仅 5G SA'],['Only_LTE','仅 4G LTE'],['WCDMA_AND_LTE','4G / 3G'],['Only_WCDMA','仅 3G']])],warning:mobileWarning});
  makeForm({route:'network/apn',id:'apn-mode',title:'APN 选择',description:'使用运营商的自动配置，或在下方选择手动配置。',endpoint:'/api/router/apn/mode',fields:[choices('apn_mode','配置模式',[['0','自动'],['1','手动']])],body:changed=>({apn_mode:Number(changed.apn_mode)}),warning:mobileWarning});

  // Manual APN profiles are kept in memory only; passwords never populate visible fields.
  const apnPanel = panel('network/apn','apn-profiles','手动 APN 配置','添加、编辑并激活运营商接入点。更改可能会中断移动数据。');
  const profileList = el('div','profile-list'), apnActions = el('div','form-actions');
  const profileSelect = el('select'); profileSelect.id = 'apn-profile'; const profileLabel = el('label','','配置'); profileLabel.htmlFor = profileSelect.id;
  apnPanel.append(profileLabel,profileSelect,profileList);
  const apnForm = el('form','settings-form'), apnFields = el('fieldset','form-grid'); apnFields.disabled = true;
  const apnInputs = {};
  for (const [key,label,values] of [['profilename','配置名称'],['wanapn','APN'],['pdpType','IP 版本',[['1','IPv4'],['2','IPv6'],['3','IPv4 + IPv6']]],['pppAuthMode','身份验证',[['0','无'],['1','PAP'],['2','CHAP']]],['username','用户名'],['password','新密码']]) {
    const wrapper = el('div','form-field'), input = el(values ? 'select' : 'input'), labelNode = el('label','',label); input.id = `apn-${key}`; labelNode.htmlFor = input.id;
    if (values) for (const [value,text] of values) input.add(new Option(text,value));
    else { input.type = key === 'password' ? 'password' : 'text'; input.autocomplete = key === 'password' ? 'new-password' : 'off'; input.maxLength = 128; }
    input.required = ['profilename','wanapn'].includes(key); wrapper.append(labelNode,input);
    if (key === 'password') wrapper.append(el('small','field-help','留空则保留所选配置的密码。'));
    apnInputs[key] = input; apnFields.append(wrapper);
  }
  let profiles = [], apnLoaded = false, apnDirty = false, apnAttempted = false, apnLoading = false;
  const apnFeedback = el('p','action-status'); apnFeedback.setAttribute('role','status');
  function editProfile() {
    const profile = profiles.find(item=>String(item.profileId) === profileSelect.value);
    for (const [key,input] of Object.entries(apnInputs)) input.value = key === 'password' ? '' : String(profile?.[key] ?? (key === 'pdpType' ? 3 : key === 'pppAuthMode' ? 0 : ''));
    profileList.textContent = profile ? `配置 ${profile.profileId} · ${String(profile.isEnable) === '1' ? '已启用' : '未启用'}` : '新建手动配置';
    apnDirty = false; apnPanel.dataset.dirty = 'false'; profileSelect.dataset.previous = profileSelect.value;
    activateAPN.disabled = deleteAPN.disabled = !profile; if (String(profile?.isEnable) === '1') deleteAPN.disabled = true;
  }
  async function loadProfiles(keep = false) {
    if (apnLoading) return; apnLoading = true; apnAttempted = true; apnFields.disabled = true; profileSelect.disabled = true; apnForm.inert = true; saveAPN.disabled = activateAPN.disabled = deleteAPN.disabled = readAPN.disabled = true;
    const epoch = session;
    try {
      const data = await request('/api/router/apn/profiles'); if (epoch !== session || consoleAPI.locked) return;
      if (!Array.isArray(data.apnListArray)) throw new Error('路由器未返回配置列表');
      profiles = data.apnListArray.filter(item=>item.profilename || item.wanapn); apnLoaded = true; apnFields.disabled = false;
      if (keep && apnDirty) return;
      const id = profileSelect.value; profileSelect.replaceChildren(new Option('新建配置','new'));
      for (const item of profiles) profileSelect.add(new Option(`${item.profilename || item.wanapn}${String(item.isEnable) === '1' ? ' · 已启用' : ''}`,String(item.profileId)));
      profileSelect.value = profiles.some(item=>String(item.profileId) === id) ? id : 'new'; editProfile(); say(apnFeedback,'配置已加载。');
    } catch (error) { if (epoch === session && !consoleAPI.locked) say(apnFeedback,`无法加载 APN 配置。${error.message}`,true); }
    finally { apnLoading = false; if (epoch === session && !consoleAPI.locked) { apnFields.disabled = !apnLoaded; profileSelect.disabled = false; apnForm.inert = mutationBusy; saveAPN.disabled = !apnLoaded; readAPN.disabled = false; const profile = profiles.find(item=>String(item.profileId) === profileSelect.value); activateAPN.disabled = !profile; deleteAPN.disabled = !profile || String(profile.isEnable) === '1'; } }
  }
  const saveAPN = button('保存配置',null,'primary'); saveAPN.type = 'submit';
  const activateAPN = button('激活配置',async()=>{
    const profile = profiles.find(item=>String(item.profileId) === profileSelect.value); if (!profile) return;
    if (!await confirm('激活 APN 配置？',`将“${profile.profilename}”（${profile.wanapn}）用于移动数据。未保存的配置修改不会包含在内。请将 APN 选择切换为“手动”以使用手动配置。`,{label:'激活配置'})) return;
    await mutate(apnFeedback,async current=>{ await request('/api/router/apn/profiles/activate',json('POST',{profileId:profile.profileId})); if (!current()) return; await loadProfiles(true); if (current()) say(apnFeedback,profiles.some(item=>String(item.profileId) === String(profile.profileId) && String(item.isEnable) === '1') ? '配置激活已由路由器确认。' : '已请求激活；请重新读取配置以确认。'); });
  });
  const deleteAPN = button('删除配置',async()=>{
    const profile = profiles.find(item=>String(item.profileId) === profileSelect.value); if (!profile) return;
    if (!await confirm('删除 APN 配置？',`永久删除“${profile.profilename}”。`,{destructive:true,label:'删除配置'})) return;
    await mutate(apnFeedback,async current=>{
      const fresh = await request('/api/router/apn/profiles'); if (!current()) return;
      if ((fresh.apnListArray || []).some(item=>String(item.profileId) === String(profile.profileId) && String(item.isEnable) === '1')) throw new Error('无法删除已启用的配置');
      await request('/api/router/apn/profiles/delete',json('POST',{profileId:profile.profileId})); if (!current()) return; apnDirty = false; await loadProfiles();
      if (current()) say(apnFeedback,profiles.some(item=>String(item.profileId) === String(profile.profileId)) ? '已请求删除，但配置仍然存在。请重新读取配置后再重试。' : '配置删除已确认。');
    });
  },'danger');
  const readAPN = button('读取配置',async()=>{ if (!apnDirty || await confirm('放弃配置修改？','用当前 APN 配置替换此草稿。',{label:'放弃并读取'})) { apnDirty = false; await loadProfiles(); } });
  activateAPN.disabled = deleteAPN.disabled = true;
  apnActions.append(saveAPN,activateAPN,deleteAPN,readAPN); apnForm.append(apnFields,apnActions); apnPanel.append(apnForm,apnFeedback);
  profileSelect.addEventListener('change',async()=>{ if (apnDirty && !await confirm('放弃配置修改？','选择配置将替换当前草稿。',{label:'放弃修改'})) { profileSelect.value = profileSelect.dataset.previous || 'new'; return; } editProfile(); profileSelect.dataset.previous = profileSelect.value; });
  apnForm.addEventListener('input',()=>{ apnDirty = true; apnPanel.dataset.dirty = 'true'; say(apnFeedback,'未保存的配置修改。'); });
  apnForm.addEventListener('submit',async event=>{
    event.preventDefault(); if (!apnLoaded || !apnForm.reportValidity()) return;
    const profile = profiles.find(item=>String(item.profileId) === profileSelect.value);
    const body = Object.fromEntries(Object.entries(apnInputs).map(([key,input])=>[key,['pdpType','pppAuthMode'].includes(key) ? Number(input.value) : key === 'password' ? input.value : input.value.trim()]));
    if (profiles.some(item=>String(item.profileId) !== String(profile?.profileId) && item.profilename === body.profilename)) { say(apnFeedback,'配置名称必须唯一。',true); return; }
    if (profile) { body.profileId = profile.profileId; if (!apnInputs.password.value) body.password = profile.password || ''; }
    else body.password = apnInputs.password.value;
    if (!await confirm('保存 APN 配置？',`以 APN“${body.wanapn}”保存“${body.profilename}”。保存已启用的配置可能会中断移动数据。`,{label:'保存配置'})) return;
    await mutate(apnFeedback,async current=>{ await request('/api/router/apn/profiles',json(profile ? 'PUT' : 'POST',body)); if (!current()) return; await loadProfiles(true); if (!current()) return;
      const saved = profiles.find(item=>item.profilename === body.profilename && item.wanapn === body.wanapn && String(item.pdpType) === String(body.pdpType) && String(item.pppAuthMode) === String(body.pppAuthMode) && String(item.username || '') === body.username && String(item.password || '') === body.password);
      if (saved) { apnDirty = false; await loadProfiles(); profileSelect.value = String(saved.profileId); editProfile(); say(apnFeedback,'配置已保存并确认。'); } else say(apnFeedback,'已请求保存，但配置值未获确认。你的草稿已保留。',true);
    });
  });
  views.push({route:'network/apn',section:apnPanel,load:loadProfiles,get loaded(){return apnAttempted;},get dirty(){return apnDirty;},clear:()=>{ profiles = []; apnLoaded = apnDirty = apnAttempted = false; profileSelect.replaceChildren(); profileSelect.disabled = true; apnForm.inert = false; for (const input of Object.values(apnInputs)) input.value = ''; apnFields.disabled = true; activateAPN.disabled = deleteAPN.disabled = true; apnPanel.dataset.dirty = 'false'; profileList.textContent = ''; apnFeedback.textContent = ''; }});

  function commandForm(config) {
    const section = panel(config.route,config.id,config.title,config.description), form = el('form','settings-form'), fields = el('div','form-grid'), inputs = {};
    for (const spec of config.fields || []) {
      const wrapper = el('div','form-field'), label = el('label','',spec.label), input = el(spec.values ? 'select' : spec.type === 'textarea' ? 'textarea' : 'input'); input.id = `${config.id}-${spec.key}`; input.name = spec.key; label.htmlFor = input.id;
      if (spec.values) for (const [value,text] of spec.values) input.add(new Option(text,value)); else { if (spec.type !== 'textarea') input.type = spec.type || 'text'; input.required = spec.required !== false; if (spec.min !== undefined) input.min = spec.min; if (spec.max !== undefined) input.max = spec.max; if (spec.maxLength) input.maxLength = spec.maxLength; }
      if (spec.placeholder) input.placeholder = spec.placeholder; wrapper.append(label,input); if (spec.help) wrapper.append(el('small','field-help',spec.help)); fields.append(wrapper); inputs[spec.key] = input;
    }
    const actions = el('div','form-actions'), run = button(config.label,null,config.danger ? 'danger' : 'primary'); run.type = 'submit'; actions.append(run); form.append(fields,actions); section.append(form); const feedback = status(section);
    form.addEventListener('input',()=>{ section.dataset.dirty = String(Object.values(inputs).some(input=>input.value)); });
    form.addEventListener('submit',async event=>{
      event.preventDefault(); if (!form.reportValidity()) return;
      const values = Object.fromEntries(Object.entries(inputs).map(([key,input])=>[key,input.value]));
      try {
        const body = config.body ? config.body(values) : {};
        if (!await confirm(config.confirmTitle || config.title,typeof config.warning === 'function' ? config.warning(values) : config.warning,{label:config.label,destructive:config.danger,typed:config.typed})) return;
        await mutate(feedback,async current=>{ run.disabled = true; say(feedback,'正在发送请求…'); try { const result = await request(config.endpoint,json('POST',body)); if (!current()) return; if (result && typeof result === 'object' && 'result' in result && !(config.resultCodes || [0,'0',true,'success','SUCCESS']).includes(result.result)) throw new Error(`调制解调器返回结果 ${result.result}；操作未获确认`); if (config.success) await config.success(result,values); if (current()) { say(feedback,config.accepted || '请求已接受。请检查实时连接以查看结果状态。'); if (config.clearOnSuccess) { form.reset(); form.dispatchEvent(new Event('reset-complete')); section.dataset.dirty = 'false'; } } } finally { run.disabled = false; } });
      } catch (error) { say(feedback,error.message,true); }
    });
    views.push({route:config.route,section,loaded:true,load:()=>{},get dirty(){return section.dataset.dirty === 'true';},clear:()=>{ form.reset(); for (const input of Object.values(inputs)) if (input.tagName !== 'SELECT') input.value = ''; section.dataset.dirty = 'false'; feedback.textContent = ''; }});
    return {section,form,inputs,feedback};
  }
  const lockWarning = '频段与小区限制可能导致路由器失去服务。请保持本地连接；若服务丢失，请使用重置限制功能。';
  commandForm({route:'network/bands',id:'lte-band',title:'LTE 频段',description:'将 4G 限制为所选频段。调制解调器仍会自行选择服务载波。',fields:[field('bands','LTE 频段',{placeholder:'1, 3, 7, 28',help:'以逗号分隔的频段编号。使用重置操作可允许所有频段。'})],label:'应用 LTE 频段',endpoint:'/api/cell/band/lte',warning:lockWarning,body:values=>({is_lte_band:'1',lte_band_mask:A.bands(values.bands,88),is_gw_band:'0',gw_band_mask:''})});
  commandForm({route:'network/bands',id:'nr-band',title:'5G NR 频段',description:'为所选 5G 模式设置频段偏好。',fields:[choices('mode','5G 模式',[['nsa','NSA · LTE 锚点'],['sa','独立组网']]),field('bands','NR 频段',{placeholder:'41, 78',help:'以逗号分隔的 NR 频段编号。'})],label:'应用 NR 频段',endpoint:'/api/cell/band/nr',warning:lockWarning,body:values=>({nr5g_type:values.mode,nr5g_band:A.bands(values.bands,1024)})});
  for (const [rat,label,max,channelMax] of [['lte','4G LTE',503,262143],['nr','5G NR',1007,3279165]]) commandForm({route:'network/bands',id:`${rat}-cell-lock`,title:`${label} 锁小区`,description:'使用“信号与小区”中的值。载波的物理小区 ID 并非物理站点标识。',fields:[field('pci','物理小区 ID',{type:'number',min:0,max}),field('earfcn',rat === 'nr' ? 'NR-ARFCN' : 'EARFCN',{type:'number',min:0,max:channelMax}),...(rat === 'nr' ? [field('band','NR 频段',{type:'number',min:1,max:1024,required:false})] : [])],label:`锁定 ${label} 小区`,endpoint:`/api/cell/lock/${rat}`,warning:lockWarning,body:values=>Object.fromEntries(Object.entries(values).filter(([,value])=>value !== ''))});
  commandForm({route:'network/bands',id:'band-reset',title:'重置频段限制',description:'允许调制解调器自动选择受支持的频段。',label:'允许所有频段',endpoint:'/api/cell/band/reset',warning:'移除所有 LTE 与 NR 频段偏好。调制解调器可能会重新连接。'});
  commandForm({route:'network/bands',id:'cell-reset',title:'重置锁小区',description:'允许调制解调器重新选择服务小区。',label:'解锁小区',endpoint:'/api/cell/lock/reset',warning:'移除服务小区锁定。调制解调器可能会重新连接。'});

  // ZTE WMS reports successful SMS submission with result 3, matching the agent forwarder.
  const composer = commandForm({resultCodes:[3,'3'],route:'sms/compose',id:'sms-compose',title:'新建消息',description:'消息通过路由器中的 SIM 卡发送。可能产生运营商费用，并受多段短信条数限制。',fields:[field('number','收件人',{type:'tel',placeholder:'+63…',maxLength:40}),field('message','消息',{type:'textarea',maxLength:1530,help:'最多 1,530 个字符。Unicode 字符和长消息可能占用多条短信。'})],label:'发送消息',confirmTitle:'发送此消息？',warning:values=>`收件人：${values.number}\n\n${values.message}\n\n将通过路由器中的 SIM 卡发送，可能产生运营商费用。`,endpoint:'/api/sms/send',body:values=>A.smsBody(values.number,values.message),accepted:'调制解调器已接受发送请求。投递未获确认；重试前请检查消息列表。',clearOnSuccess:true});
  const counter = el('p','field-help','0 个字符'); composer.inputs.message.after(counter); composer.form.addEventListener('reset-complete',()=>{ counter.textContent = '0 个字符'; }); composer.inputs.message.addEventListener('input',()=>{ const value = composer.inputs.message.value; counter.textContent = `${value.length.toLocaleString()} 个字符 · ${A.smsBody('+1',value || ' ').encode_type === 'UNICODE' ? 'Unicode' : 'GSM 字符集'}`; });
  const smsPanel = document.querySelector('#messages-panel'), smsToolbar = el('div','message-toolbar'), selectionLabel = el('span','','已选 0 项');
  const smsFeedback = status(smsPanel); smsFeedback.id = 'sms-action-status';
  const refreshMessages = async current=>{
    const data = await request('/api/sms/list',json('POST',{page:0,data_per_page:500,mem_store:2,tags:10,order_by:'order by id desc'}));
    if (!Array.isArray(data.messages)) throw new Error('路由器未返回消息列表');
    if (current()) consoleAPI.updateMessages(data); return data;
  };
  const selectVisible = button('选择可见项',()=>{ for (const message of consoleAPI.messages()) { const query = document.querySelector('#sms-search').value.trim().toLowerCase(); if (`${message.number} ${message.body}`.toLowerCase().includes(query) && /^\d+$/.test(String(message.id))) selected.add(String(message.id)); } consoleAPI.redrawMessages(); updateSelection(); });
  const clearSelection = button('清除选择',()=>{ selected.clear(); consoleAPI.redrawMessages(); updateSelection(); });
  async function smsAction(kind,ids) {
    let list = ids || [...selected];
    list = list.filter(id=>consoleAPI.messages().some(message=>String(message.id) === String(id) && (kind === 'delete' || [0,1].includes(Number(message.tag)))));
    if (!list.length) { say(smsFeedback,'请选择已接收的消息以更改已读状态，或选择要删除的消息。',true); return; }
    const deletion = kind === 'delete';
    if (!await confirm(deletion ? '删除消息？' : '更改已读状态？',`${deletion ? '永久删除' : kind === 'read' ? '标记为已读：' : '标记为未读：'} ${list.length} 条消息。${deletion ? '此操作无法撤销。' : ''}`,{label:deletion ? '删除消息' : '应用',destructive:deletion})) return;
    await mutate(smsFeedback,async current=>{
      await request(`/api/sms/${deletion ? 'delete' : 'read'}`,json('POST',{id:A.ids(list),...(!deletion ? {tag:kind === 'read' ? 0 : 1} : {})})); if (!current()) return;
      const data = await refreshMessages(current); if (!current()) return;
      const confirmed = list.every(id=>deletion ? !(data.messages || []).some(message=>String(message.id) === id) : (data.messages || []).some(message=>String(message.id) === id && Number(message.tag) === (kind === 'read' ? 0 : 1)));
      if (confirmed) { for (const id of list) selected.delete(id); consoleAPI.redrawMessages(); updateSelection(); }
      say(smsFeedback,confirmed ? (deletion ? '消息删除已确认。' : '已读状态已确认。') : '请求已接受，但消息列表尚未确认该更改。请检查后再重试。',!confirmed);
    });
  }
  const markRead = button('标记已读',()=>smsAction('read')), markUnread = button('标记未读',()=>smsAction('unread')), deleteSMS = button('删除',()=>smsAction('delete'), 'danger');
  smsToolbar.append(selectionLabel,selectVisible,clearSelection,markRead,markUnread,deleteSMS); document.querySelector('#message-list').before(smsToolbar);
  const newMessage = el('a','button primary','新建消息'); newMessage.href = '#sms/compose'; smsPanel.querySelector('.section-heading').append(newMessage);
  function updateSelection() { const existing = new Set(consoleAPI.messages().map(message=>String(message.id))); for (const id of selected) if (!existing.has(id)) selected.delete(id); selectionLabel.textContent = `已选 ${selected.size} 项`; clearSelection.disabled = markRead.disabled = markUnread.disabled = deleteSMS.disabled = !selected.size; }
  globalThis.OpenU60Controls = {decorateMessage(card,message) {
    const id = String(message.id); if (!/^\d+$/.test(id)) return;
    const actions = el('div','message-actions'), label = el('label','message-select'), check = el('input'); check.type = 'checkbox'; check.checked = selected.has(id); check.setAttribute('aria-label',`选择来自 ${message.number} 的消息 ${id}`); check.addEventListener('change',()=>{ check.checked ? selected.add(id) : selected.delete(id); updateSelection(); }); label.append(check,el('span','','选择'));
    const reply = button(Number(message.tag) === 2 ? '再写一条' : '回复',async()=>{
      if (composer.section.dataset.dirty === 'true' && !await confirm('替换消息草稿？','回复将替换现有的收件人与消息。',{label:'替换草稿'})) return;
      composer.inputs.number.value = message.number || ''; composer.inputs.message.value = ''; composer.section.dataset.dirty = 'true'; OpenU60Navigation.go('sms/compose'); composer.inputs.message.focus();
    });
    actions.append(label,reply); if ([0,1].includes(Number(message.tag))) actions.append(button(Number(message.tag) === 1 ? '标记已读' : '标记未读',()=>smsAction(Number(message.tag) === 1 ? 'read' : 'unread',[id])));
    actions.append(button('删除',()=>smsAction('delete',[id]),'danger')); card.append(actions);
  }};
  updateSelection(); consoleAPI.redrawMessages();

  makeForm({route:'settings/device',id:'charge-config',title:'电池充电上限',description:'限制长时间使用 USB 供电时的充电。迟滞值决定低于上限多少时恢复充电。',endpoint:'/api/device/charge-control',fields:[choices('charge_limit_enabled','充电上限',[['true','已启用'],['false','已停用']],{boolean:true}),field('charge_limit','停止充电（%）',{type:'number',min:50,max:100}),field('hysteresis','低于上限（%）时恢复充电',{type:'number',min:1,max:20})]});
  makeForm({route:'settings/device',id:'manual-charge',title:'手动充电控制',description:'手动停止会覆盖自动充电策略，直到你再次允许充电。',endpoint:'/api/device/charge-control',fields:[choices('charging_stopped','充电',[['false','允许充电'],['true','停止充电']],{boolean:true})],warning:'路由器运行时停止充电可能会耗尽电池。此操作将设置手动覆盖。'});
  makeForm({route:'settings/device',id:'power-save',title:'节能模式',description:'使用路由器内置模式降低设备功耗。',endpoint:'/api/device/power-save',read:()=>request('/api/device/power-save',json('POST',{deviceInfoList:['power_saver_mode']})),fields:[onoff('power_saver_mode','节能模式')],body:changed=>({deviceInfoList:changed}),verify:(data,body)=>String(data.power_saver_mode) === String(body.deviceInfoList.power_saver_mode)});
  makeForm({route:'settings/device',id:'fast-boot',title:'快速启动',description:'选择路由器是否使用快速开机设置。',endpoint:'/api/device/fast-boot',fields:[onoff('fast_boot','快速启动')]});
  makeForm({route:'settings/device',id:'auto-sleep',title:'自动休眠',description:'让路由器在无活动后休眠。休眠期间本控制台可能不可用，直到设备唤醒。',endpoint:'/api/device/auto-sleep',fields:[choices('enabled','自动休眠',[['true','已启用'],['false','已停用']],{boolean:true}),field('timeout','无活动超时（分钟）',{type:'number',min:-1,max:1440,help:'使用 1–1,440 分钟，或 −1 表示不超时。'})],body:(changed,all)=>({enabled:all.enabled === 'true',timeout:all.timeout}),validate:(_,all)=>{ if (!['true','false'].includes(all.enabled)) throw new Error('请选择是否启用自动休眠。'); if (!(all.timeout === '-1' || /^\d+$/.test(all.timeout) && Number(all.timeout) >= 1 && Number(all.timeout) <= 1440)) throw new Error('请输入 1–1,440 分钟，或 −1。'); },warning:'自动休眠可能断开客户端并使控制台不可用。如需唤醒设备，请使用其物理按键。'});
  commandForm({route:'settings/device',id:'device-reboot',title:'重启路由器',description:'重启设备。已连接的客户端将暂时无法访问。',endpoint:'/api/device/reboot',label:'重启路由器',warning:'现在重启路由器？启动期间互联网、Wi-Fi 与本控制台将断开。',danger:true,accepted:'重启请求已接受。请等待设备恢复；实时数据流将自动重新连接。'});
  commandForm({route:'settings/device',id:'device-reset',title:'恢复出厂设置',description:'清除路由器设置并恢复出厂默认值。你需要重新设置路由器。',endpoint:'/api/device/factory-reset',label:'清除并重置',warning:'这将永久清除路由器配置，包括网络设置与 Wi-Fi 凭据。控制台将断开连接。请输入 RESET 以确认。',danger:true,typed:true,accepted:'已请求恢复出厂设置。设备重启后，请使用出厂网络设置重新连接。'});

  function loadRoute(refresh = false) {
    if (consoleAPI.locked || !consoleAPI.connected) return;
    for (const view of views) {
      if (view.route !== route()) continue;
      if (!view.loaded) view.load();
      else if (refresh && view.refresh) view.refresh();
      else if (refresh && !view.dirty) view.load();
    }
  }
  // A route activation is an explicit request to see current router state.
  // Dirty drafts stay untouched unless that view provides a safe refresh which
  // updates read-only data while preserving its form fields.
  window.addEventListener('dashboard:navigate',()=>{ loadRoute(true); });
  window.addEventListener('dashboard:readings',event=>{ loadRoute(event.detail.snapshot===true); for (const view of views) view.sync?.(event.detail.readings); updateSelection(); });
  window.addEventListener('dashboard:locked',()=>{ session++; finishConfirmation(false); selected.clear(); for (const view of views) view.clear(); smsFeedback.textContent = ''; counter.textContent = '0 个字符'; updateSelection(); });
  window.addEventListener('beforeunload',event=>{ if (views.some(view=>view.dirty)) { event.preventDefault(); event.returnValue = ''; } });
  globalThis.OpenU60UI = {el,button,panel,status,say,json,request,confirm,mutate,makeForm,field,choices,onoff,
    track:view=>{ views.push(view); loadRoute(); },
    get epoch(){return session;}, get saving(){return mutationBusy;}, current:epoch=>epoch === session && !consoleAPI.locked
  };
  loadRoute();
})();
