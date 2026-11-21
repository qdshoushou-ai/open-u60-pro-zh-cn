'use strict';
(() => {
  const UI=OpenU60UI,API=OpenU60Console,E=OpenU60Esim,{el,button,say,json,request,confirm,mutate}=UI;
  let inventory=null,chip=null,receipts=null,switchState={state:'idle'},download={state:'idle'},attempted=false,loading=false,chipLoading=false,qrBusy=false;
  let pendingSwitch=null,pendingDownload=false,refreshQueued=false,renameId=null,renameBaseline='',renameDirty=false,activationDirty=false,passwordRequired=false;
  let lastStatusAt=null,sourceAvailable=false,agentInstance=null,downloadRevision=0,qrMessage='',qrError=false;
  const route=()=>OpenU60Navigation.current.key==='network/esim';
  const online=()=>API.connected && !API.locked;
  const busy=()=>loading || chipLoading || qrBusy || UI.saving || E.switchBusy(switchState) || E.downloadBusy(download) || !!pendingSwitch || pendingDownload;
  const ready=()=>online() && sourceAvailable && !passwordRequired && inventory && !inventory.stale && !inventory.updating && !busy();
  const dashboardProfiles=document.querySelector('#dashboard-esim-profiles'),dashboardStatus=document.querySelector('#dashboard-esim-status'),dashboardFeedback=document.querySelector('#dashboard-esim-feedback');
  const switchPanel=UI.panel('network/esim','esim-switch','配置连接状态','只有在卡、调制解调器与移动数据均确认后，配置才算完全连接。');switchPanel.classList.add('esim-status-panel');
  const switchRegion=el('div','esim-switch-state'),switchTitle=el('h3','','没有正在进行的切换'),switchCopy=el('p','section-subtitle');switchRegion.setAttribute('role','status');switchRegion.setAttribute('aria-live','polite');switchRegion.setAttribute('aria-atomic','true');switchRegion.append(switchTitle,switchCopy);switchPanel.append(switchRegion);
  const mobileLink=el('a','button','移动数据与漫游');mobileLink.href='#network/mobile';const apnLink=el('a','button','APN 配置');apnLink.href='#network/apn';const connectionLinks=el('div','form-actions');connectionLinks.append(mobileLink,apnLink);switchPanel.append(connectionLinks);
  const section=UI.panel('network/esim','esim-profiles','eSIM 上的配置','管理安装在路由器中的 eSIM 卡。需要兼容的 eUICC 卡；普通实体 SIM 卡无法存储 eSIM 配置。');
  const toolbar=el('div','form-actions rule-toolbar'),reload=button('读取配置',()=>load());toolbar.append(reload);section.append(toolbar);
  const statistics=el('dl','routing-stats'),statNodes={};for(const [key,label]of [['count','已保存配置'],['active','当前配置'],['receipts','待处理运营商回执']]){const pair=el('div'),value=el('dd',key==='active' ? '' : 'mono','—');pair.append(el('dt','',label),value);statistics.append(pair);statNodes[key]=value;}section.append(statistics);
  const freshness=el('p','reading-caption','等待 eSIM 状态。'),profileList=el('div','rule-list');profileList.id='esim-profile-list';section.append(freshness,profileList);const feedback=UI.status(section);
  const rename=UI.panel('network/esim','esim-rename','重命名配置','使用便于识别的昵称。昵称留空将恢复运营商的原始配置名称。');
  const renameForm=el('form','settings-form'),renameFields=el('fieldset','form-grid'),renameHeading=el('legend','sr-only','重命名配置');renameFields.disabled=true;renameFields.append(renameHeading);
  const renameChoice=el('select'),renameInput=el('input');renameChoice.id='esim-rename-profile';renameInput.id='esim-nickname';renameInput.maxLength=64;renameInput.autocomplete='off';
  function formField(parent,label,input,help){const wrapper=el('div','form-field'),name=el('label','',label);name.htmlFor=input.id;wrapper.append(name,input);if(help){const note=el('small','field-help',help);note.id=input.id+'-help';input.setAttribute('aria-describedby',note.id);wrapper.append(note);}parent.append(wrapper);}
  formField(renameFields,'配置',renameChoice);formField(renameFields,'昵称',renameInput,'最多 64 个 UTF-8 字节。留空可清除已保存的昵称。');const renameActions=el('div','form-actions'),saveName=button('保存昵称',null,'primary'),discardName=button('放弃修改',()=>selectRename(renameId));saveName.type='submit';renameActions.append(saveName,discardName);renameForm.append(renameFields,renameActions);rename.append(renameForm);const renameFeedback=UI.status(rename);
  const add=UI.panel('network/esim','esim-add','添加 eSIM 配置','选择运营商的二维码图片或输入激活码。路由器将使用其移动连接下载配置。');
  const addForm=el('form','settings-form'),addFields=el('fieldset','form-grid');addFields.disabled=true;addFields.append(el('legend','sr-only','添加 eSIM 配置'));
  const qrUpload=el('div','esim-qr-upload'),qrMark=el('span','esim-qr-mark'),qrCopy=el('div','esim-qr-copy'),qrTitle=el('strong','','使用二维码图片'),qrHelp=el('small','','JPEG 或 PNG · 最大 8 MB · 仅在本 U60 上解码'),qrState=el('span','esim-qr-state','未选择图片'),qrInput=el('input','esim-qr-file'),qrLabel=el('label','button esim-qr-button','选择二维码图片');qrMark.setAttribute('aria-hidden','true');qrState.id='esim-qr-status';qrState.setAttribute('role','status');qrState.setAttribute('aria-live','polite');qrInput.id='esim-qr-file';qrInput.type='file';qrInput.accept='image/jpeg,image/png';qrInput.setAttribute('aria-describedby',qrState.id);qrLabel.htmlFor=qrInput.id;qrCopy.append(qrTitle,qrHelp,qrState);qrUpload.append(qrMark,qrCopy,qrInput,qrLabel);addFields.append(qrUpload);
  const activation=el('input'),confirmationCode=el('input');activation.id='esim-activation-code';activation.type='password';activation.autocomplete='off';activation.maxLength=512;activation.required=true;activation.placeholder='LPA:1$服务器$匹配 ID';confirmationCode.id='esim-confirmation-code';confirmationCode.type='password';confirmationCode.autocomplete='off';confirmationCode.maxLength=64;
  formField(addFields,'激活码',activation,'二维码图片在解码后即被丢弃。激活码与确认码仅保留在本标签页，提交后将被清除。');formField(addFields,'确认码（如已提供）',confirmationCode);
  const addActions=el('div','form-actions'),start=button('检查并下载',null,'primary'),clearCode=button('清除激活码',clearCodes);start.type='submit';addActions.append(start,clearCode);addForm.append(addFields,addActions);add.append(addForm);const addFeedback=UI.status(add);
  const progressPanel=UI.panel('network/esim','esim-download','下载与安装','安装前你可以检查运营商的配置详情。已下载的配置在你激活前保持停用。');
  const progressTitle=el('h3','','没有正在进行的下载'),progressCopy=el('p','section-subtitle'),preview=el('dl','settings-facts'),downloadActions=el('div','form-actions diagnostic-actions');
  const install=button('安装配置',()=>decideDownload(true),'primary'),decline=button('拒绝配置',()=>decideDownload(false)),cancel=button('取消下载',cancelDownload),dismiss=button('关闭结果',dismissDownload);downloadActions.append(install,decline,cancel,dismiss);progressPanel.append(progressTitle,progressCopy,preview,downloadActions);const downloadFeedback=UI.status(progressPanel);
  const chipPanel=UI.panel('network/esim','esim-chip','eSIM 卡信息','卡标识、软件版本与上报的可用内存。标识符以文本形式保留。');
  const chipToolbar=el('div','form-actions'),readChip=button('读取卡信息',()=>loadChip());chipToolbar.append(readChip);const chipFacts=el('dl','settings-facts'),chipNodes={};for(const [key,label]of [['eid','EID'],['firmware','固件'],['sgp22_version','SGP.22 版本'],['profile_version','配置版本'],['free_nvm_bytes','可用配置存储'],['free_ram_bytes','可用运行内存']]){const pair=el('div'),value=el('dd','mono','未上报');pair.append(el('dt','',label),value);chipFacts.append(pair);chipNodes[key]=value;}chipPanel.append(chipToolbar,chipFacts);const chipFeedback=UI.status(chipPanel);
  const receiptsPanel=UI.panel('network/esim','esim-receipts','运营商回执','配置变更后，卡会保留回执，直到其运营商接受为止。常规重试由 Agent 处理。');
  const receiptActions=el('div','form-actions'),readReceipts=button('读取待处理回执',loadReceipts),sendReceipts=button('发送待处理回执',processReceipts);receiptActions.append(readReceipts,sendReceipts);const receiptList=el('div','rule-list');receiptList.id='esim-receipt-list';receiptsPanel.append(receiptActions,receiptList);const receiptFeedback=UI.status(receiptsPanel);
  const cards=new Map(),profileKeys=new Map(),keyProfiles=new Map();let nextProfileKey=0;
  function profileKey(id){if(!id)return '';if(!profileKeys.has(id)){const key=`profile-${++nextProfileKey}`;profileKeys.set(id,key);keyProfiles.set(key,id);}return profileKeys.get(id);}
  const byteText=value=>value===null || value===undefined ? '未上报' : Number.isFinite(Number(value)) ? `${(Number(value)/1024).toFixed(1)} KiB` : '未上报';
  function drawQr(){qrUpload.dataset.state=qrError?'error':qrBusy?'busy':qrMessage?'ready':'idle';qrState.textContent=qrBusy?'正在路由器上读取二维码图片…':qrMessage || '未选择图片';qrLabel.textContent=qrBusy?'正在读取图片…':'选择二维码图片';qrLabel.setAttribute('aria-disabled',String(!ready() || qrBusy));}
  function clearCodes(){activation.value='';confirmationCode.value='';qrInput.value='';qrMessage='';qrError=false;activationDirty=false;add.dataset.dirty='false';drawQr();}
  function markDraft(event){activationDirty=!!(activation.value || confirmationCode.value);add.dataset.dirty=String(activationDirty);if(event?.isTrusted && qrMessage){qrMessage='';qrError=false;drawQr();}}
  addForm.addEventListener('input',markDraft);
  qrInput.addEventListener('change',decodeQr);
  function acceptInventory(data){const next=E.inventory(data);if(E.older(next,inventory))return false;inventory=next;drawProfiles();render();return true;}
  function selectRename(id){renameId=id;const profile=inventory?.profiles.find(profile=>profile.iccid===id);renameChoice.value=profileKey(id);renameBaseline=profile?.nickname || '';renameInput.value=renameBaseline;renameDirty=false;rename.dataset.dirty='false';render();}
  renameChoice.addEventListener('change',async()=>{const selected=keyProfiles.get(renameChoice.value);renameChoice.value=profileKey(renameId);if(!renameDirty || await confirm('放弃昵称修改？','选择其他配置将放弃此昵称草稿。',{label:'放弃修改'}))selectRename(selected);});
  renameInput.addEventListener('input',()=>{renameDirty=renameInput.value!==renameBaseline;rename.dataset.dirty=String(renameDirty);render();});
  function drawProfiles(){
    const profiles=inventory?.profiles || [],ids=new Set(profiles.map(profile=>profile.iccid));
    for(const [id,card]of cards)if(!ids.has(id)){card.node.remove();cards.delete(id);}
    profileList.querySelector('.empty')?.remove();
    if(!profiles.length)profileList.append(el('p','empty',inventory ? '此卡上没有存储的配置。' : '读取配置以查看此 eSIM 卡。'));
    for(const [index,profile]of profiles.entries()){
      let card=cards.get(profile.iccid);if(!card){const profileId=profile.iccid,node=el('article','rule-card'),copy=el('div'),heading=el('div','title-count'),name=el('h3'),badge=el('span','tag'),provider=el('p'),identity=el('p','mono'),actions=el('div','form-actions rule-actions'),activate=button('激活',()=>switchProfile(profileId),'primary'),renameButton=button('重命名',()=>{selectRename(profileId);rename.scrollIntoView({block:'center',behavior:'smooth'});renameInput.focus({preventScroll:true});}),remove=button('删除',()=>deleteProfile(profileId),'danger');node.dataset.profile=profileKey(profileId);heading.append(name,badge);copy.append(heading,provider,identity);actions.append(activate,renameButton,remove);node.append(copy,actions);card={node,name,badge,provider,identity,activate,renameButton,remove};cards.set(profile.iccid,card);}
      card.name.textContent=E.name(profile);card.badge.textContent=profile.state==='enabled' ? '已启用' : profile.state==='disabled' ? '已停用' : '未上报状态';card.provider.textContent=[profile.provider,profile.class].filter(Boolean).join(' · ');card.identity.textContent=`ICCID …${profile.iccid.slice(-4)}`;
      card.activate.hidden=profile.state==='enabled';card.activate.disabled=!ready() || profile.state!=='disabled' || profile.class!=='operational';card.renameButton.disabled=!ready();card.remove.disabled=!ready() || profile.state!=='disabled';
      if(profileList.children[index]!==card.node)profileList.insertBefore(card.node,profileList.children[index] || null);
    }
    const selected=renameId,options=new Map([...renameChoice.options].map(option=>[option.value,option]));for(const [id,option]of options)if(!ids.has(keyProfiles.get(id)))option.remove();for(const [index,profile]of profiles.entries()){const option=options.get(profileKey(profile.iccid))||new Option('',profileKey(profile.iccid));option.textContent=`${E.name(profile)} · …${profile.iccid.slice(-4)}`;if(renameChoice.options[index]!==option)renameChoice.insertBefore(option,renameChoice.options[index]||null);}
    if(!ids.has(selected)){renameId=profiles[0]?.iccid || null;renameBaseline=profiles[0]?.nickname || '';renameInput.value=renameBaseline;renameDirty=false;rename.dataset.dirty='false';}
    renameChoice.value=profileKey(renameId);
  }
  function drawDashboardProfiles(){
    dashboardProfiles.replaceChildren();const profiles=inventory?.profiles || [];
    if(!profiles.length)dashboardProfiles.append(el('span','dashboard-esim-empty',loading ? '正在读取配置…' : inventory ? '此 eSIM 上没有存储的配置。' : '尚未读取配置。'));
    for(const profile of profiles){const isp=profile.provider || E.name(profile),label=profile.nickname && profile.nickname!==isp ? profile.nickname : profile.name && profile.name!==isp ? profile.name : '',choice=el('button','dashboard-esim-profile');choice.type='button';choice.setAttribute('aria-current',profile.state==='enabled' ? 'true' : 'false');choice.setAttribute('aria-label',profile.state==='enabled' ? `${isp}，当前 eSIM 配置` : `激活 ${isp}${label ? `，${label}` : ''}`);choice.append(el('strong','',isp),el('small','',profile.state==='enabled' ? '当前使用中' : label || '点击切换'));choice.disabled=!ready() || profile.state!=='disabled' || profile.class!=='operational';choice.addEventListener('click',()=>switchProfile(profile.iccid));dashboardProfiles.append(choice);}
  }
  function reportSwitch(message,error=false){say(feedback,message,error);say(dashboardFeedback,message,error);}
  function renderDashboard(){
    drawDashboardProfiles();
    dashboardStatus.textContent=passwordRequired ? '切换配置前请先设置 Agent 密码。' : pendingSwitch && !pendingSwitch.observed ? '正在等待路由器确认切换。' : E.switchBusy(switchState) ? E.switchMessage(switchState) : E.downloadBusy(download) ? `配置下载 · ${E.stepLabel(download.step)}。打开 eSIM 管理以检查或取消。` : switchState.state!=='idle' ? E.switchMessage(switchState) : inventory ? '点击未启用的 ISP 名称即可切换。始终需要确认。' : '等待 eSIM 配置。';
    dashboardStatus.dataset.state=E.switchBusy(switchState) || E.downloadBusy(download) ? 'busy' : switchState.state;
  }
  function render(){
    OpenU60Numbers.set(statNodes.count,inventory ? inventory.profiles.length : '—');statNodes.active.textContent=E.name(inventory?.profiles.find(profile=>profile.state==='enabled'));
    if(!inventory?.profiles.some(profile=>profile.state==='enabled'))statNodes.active.textContent='未上报';OpenU60Numbers.set(statNodes.receipts,receipts?.count ?? inventory?.pending_receipts ?? '—');
    freshness.textContent=passwordRequired ? '管理 eSIM 配置前请先设置 Agent 密码。' : lastStatusAt ? `${online() && sourceAvailable ? '实时 eSIM 状态' : '最近接收的 eSIM 状态'} · ${new Date(lastStatusAt).toLocaleTimeString()}${inventory?.updating ? ' · 卡正忙或 SIM 正在重新加载' : inventory?.stale ? ' · 已保存的配置列表；更改前请重新读取' : ''}` : '等待 eSIM 状态。';freshness.dataset.stale=String(!online() || !sourceAvailable || passwordRequired || !!inventory?.stale);
    reload.disabled=!online() || loading || chipLoading || UI.saving || E.downloadBusy(download) || E.switchBusy(switchState);readChip.disabled=reload.disabled;readReceipts.disabled=reload.disabled;sendReceipts.disabled=!ready() || !receipts?.count || receipts?.retrying;
    renameFields.disabled=!ready() || !renameId;saveName.disabled=!ready() || !renameDirty;discardName.disabled=!renameDirty || UI.saving;addFields.disabled=!ready();start.disabled=!ready() || !activation.value.trim() || download.state!=='idle';clearCode.disabled=!activationDirty || UI.saving;qrInput.disabled=!ready() || qrBusy;drawQr();
    for(const profile of inventory?.profiles || []){const card=cards.get(profile.iccid);if(!card)continue;card.activate.disabled=!ready() || profile.state!=='disabled' || profile.class!=='operational';card.renameButton.disabled=!ready();card.remove.disabled=!ready() || profile.state!=='disabled';}
    switchPanel.dataset.state=pendingSwitch && !pendingSwitch.observed ? 'pending' : switchState.state;
    switchTitle.textContent=pendingSwitch && !pendingSwitch.observed ? '等待切换确认' : switchState.state==='idle' ? '没有正在进行的切换' : `配置切换 · ${switchState.state.replaceAll('_',' ')}`;
    switchCopy.textContent=pendingSwitch && !pendingSwitch.observed ? '请求不会自动重发。正在等待路由器确认的切换状态。' : E.switchMessage(switchState);
    progressTitle.textContent=pendingDownload ? '等待下载请求' : download.state==='idle' ? '没有正在进行的下载' : download.state==='confirm' ? '安装前请检查此配置' : `下载 · ${download.state}`;
    progressCopy.textContent=download.state==='idle' ? '安装前，运营商的详情会显示在这里。' : `${E.stepLabel(download.step)}${download.error ? ` · ${download.error}` : ''}`;
    preview.replaceChildren();for(const [key,label]of [['provider','运营商'],['name','配置'],['iccid','ICCID']])if(download[key]){const row=el('div');row.append(el('dt','',label),el('dd',key==='iccid' ? 'mono' : '',(key==='iccid' ? `…${String(download[key]).slice(-4)}` : String(download[key]))));preview.append(row);}
    install.hidden=decline.hidden=download.state!=='confirm';install.disabled=decline.disabled=!online() || UI.saving;cancel.hidden=!['running','confirm'].includes(download.state);cancel.disabled=!online() || UI.saving || String(download.step).startsWith('es10b_load_bound_profile_package');dismiss.hidden=!['done','failed','cancelled'].includes(download.state);dismiss.disabled=!online() || UI.saving;
    for(const [key,node]of Object.entries(chipNodes)){const value=chip?.[key];if(key.startsWith('free_'))OpenU60Numbers.set(node,byteText(value));else node.textContent=value===null || value===undefined || value==='' ? '未上报' : String(value);}
    receiptList.replaceChildren();if(!receipts?.pending?.length)receiptList.append(el('p','empty',receipts?.count===0 ? '没有待处理的运营商回执。' : '尚未从卡读取回执。'));
    for(const item of receipts?.pending || []){const card=el('article','rule-card'),copy=el('div');copy.append(el('h3','',String(item.operation || '运营商回执')),el('p','mono',String(item.address || '未上报地址')),el('p','',`${item.attempts ?? 0} 次尝试${item.gave_up ? ' · 自动重试已暂停' : ''}${item.last_error ? ` · ${item.last_error}` : ''}`));card.append(copy);receiptList.append(card);}
    renderDashboard();
  }
  async function getInventory(){const data=await request('/api/esim/profiles',{timeoutMs:45000});return E.inventory(data);}
  async function load(){
    if(!online() || loading || chipLoading || UI.saving || E.downloadBusy(download) || E.switchBusy(switchState))return;
    attempted=true;loading=true;const epoch=UI.epoch;say(feedback,'正在从 eSIM 卡读取配置…');render();
    try{const data=await getInventory();if(!UI.current(epoch))return;acceptInventory(data);pendingSwitch=null;pendingDownload=false;if(data.updating)refreshQueued=true;say(feedback,data.stale ? `显示已保存的列表。${data.error?.message || '卡尚未准备好进行新的读取。'}` : '已加载当前 eSIM 配置。',!!data.stale);}
    catch(error){if(UI.current(epoch))say(feedback,`配置不可用。${error.message}。请确认已安装兼容的 eSIM 卡，然后重试“读取配置”。`,true);}
    finally{if(UI.current(epoch)){loading=false;render();}}
  }
  async function loadChip(){
    if(!online() || busy())return;chipLoading=true;render();const epoch=UI.epoch;say(chipFeedback,'正在读取卡信息…');
    try{const data=await request('/api/esim/chip',{timeoutMs:45000});if(!UI.current(epoch))return;chip=data;if(data.card_changed){inventory=null;drawProfiles();say(feedback,'检测到另一张 eSIM 卡。进行更改前请先读取其配置。',true);}say(chipFeedback,`卡信息已读取（${new Date().toLocaleTimeString()}）。`);}
    catch(error){if(UI.current(epoch))say(chipFeedback,`卡信息不可用。${error.message}。`,true);}
    finally{if(UI.current(epoch)){chipLoading=false;render();}}
  }
  async function freshProfile(id){const current=await getInventory();if(current.stale || current.updating)throw new Error('卡正忙或其列表已过期。更改前请重新读取配置。');const profile=current.profiles.find(profile=>profile.iccid===id);if(!profile)throw new Error('该配置已不在当前卡上。');return {current,profile};}
  async function decodeQr(){
    const file=qrInput.files?.[0];if(!file)return;const epoch=UI.epoch,previous=!!(activation.value.trim() || confirmationCode.value.trim());
    if(previous && !await confirm('替换当前激活码？','读取此二维码图片将替换表单中现有的激活码与确认码。',{label:'替换激活码'})){qrInput.value='';return;}
    const extension=file.name.toLowerCase().split('.').pop(),media=file.type==='image/jpeg'||file.type==='image/png'?file.type:extension==='jpg'||extension==='jpeg'?'image/jpeg':extension==='png'?'image/png':'';
    if(!media){qrInput.value='';qrMessage='请选择 JPEG 或 PNG 图片。';qrError=true;drawQr();return;}
    if(file.size>8*1024*1024){qrInput.value='';qrMessage='此图片大于 8 MB。请选择更小的图片。';qrError=true;drawQr();return;}
    qrBusy=true;qrMessage='';qrError=false;render();
    try{
      const result=await request('/api/esim/qr',{method:'POST',body:file,contentType:media,timeoutMs:135000});if(!UI.current(epoch))return;
      if(typeof result.activation_code!=='string'||!/^[Ll][Pp][Aa]:1\$/.test(result.activation_code))throw new Error('路由器返回了无效的激活码。');
      activation.value=result.activation_code;confirmationCode.value='';markDraft();qrMessage=result.confirmation_code_required?'二维码已读取。请输入运营商单独提供的确认码。':'二维码已读取。激活码可供检查。';qrError=false;
      (result.confirmation_code_required?confirmationCode:start).focus({preventScroll:true});
    }catch(error){if(UI.current(epoch)){qrMessage=error.message;qrError=true;}}
    finally{qrBusy=false;qrInput.value='';if(UI.current(epoch))render();}
  }
  async function switchProfile(id){
    if(!ready())return;const epoch=UI.epoch;
    try{const {current,profile}=await freshProfile(id);if(!UI.current(epoch))return;if(profile.state!=='disabled' || profile.class!=='operational')throw new Error('只有未启用且状态正常的配置才能激活。');acceptInventory(current);
      const warnings=E.warnings(profile,current);if(!await confirm('激活 eSIM 配置',`激活 ${E.name(profile)}（ICCID …${id.slice(-4)}）？调制解调器重新连接期间移动数据将断开。${warnings.join(' ')}`,{label:'激活配置'}))return;
      await mutate(feedback,async stillCurrent=>{let fresh;try{fresh=await freshProfile(id);}catch(error){if(stillCurrent())say(dashboardFeedback,`切换已停止。${error.message}`,true);throw error;}if(!stillCurrent())return;if(fresh.profile.state!=='disabled' || fresh.profile.class!=='operational' || JSON.stringify(E.warnings(fresh.profile,fresh.current))!==JSON.stringify(warnings) || fresh.current.agent_instance!==current.agent_instance){const message='配置或连接设置已更改。激活前请重新检查。';say(dashboardFeedback,message,true);throw new Error(message);}pendingSwitch={id,base:Number(switchState.generation || 0),observed:false};render();reportSwitch('正在发送配置切换请求…');
        try{const result=await request('/api/esim/enable',{...json('POST',{iccid:id}),timeoutMs:45000});if(!stillCurrent())return;if(pendingSwitch && Number(result.generation)>pendingSwitch.base)pendingSwitch.generation=Number(result.generation);reportSwitch('切换请求已接受。正在等待卡、调制解调器与移动数据确认。');reconcileSwitch();}
        catch(error){if(!stillCurrent())return;if(error.status && error.status<500 && error.details?.outcome!=='unknown')pendingSwitch=null;reportSwitch(`切换结果未确认。${error.message}。重试前请检查实时状态。`,true);}
      });
    }catch(error){if(UI.current(epoch))reportSwitch(error.message,true);}finally{render();}
  }
  async function deleteProfile(id){
    if(!ready())return;const profile=inventory.profiles.find(profile=>profile.iccid===id);if(!profile || profile.state!=='disabled')return;
    if(!await confirm('删除 eSIM 配置',`永久删除 ${E.name(profile)}（ICCID …${id.slice(-4)}）？运营商可能要求提供新的激活码才能恢复。`,{label:'删除配置',destructive:true,typed:true,phrase:'DELETE'}))return;
    await mutate(feedback,async current=>{const fresh=await freshProfile(id);if(!current())return;if(fresh.profile.state!=='disabled')throw new Error('该配置当前已启用，无法删除。');await request('/api/esim/delete',{...json('POST',{iccid:id}),timeoutMs:65000});if(!current())return;const latest=await getInventory();if(!current())return;acceptInventory(latest);say(feedback,!latest.stale && !latest.profiles.some(profile=>profile.iccid===id) ? '卡已确认删除配置。' : '删除未确认。重试前请重新读取配置。',!!latest.stale || latest.profiles.some(profile=>profile.iccid===id));});render();
  }
  renameForm.addEventListener('submit',async event=>{
    event.preventDefault();if(!ready() || !renameDirty || !renameId)return;const id=renameId,epoch=UI.epoch;try{const name=E.nickname(renameInput.value);if(!await confirm('重命名 eSIM 配置',name ? `为 ICCID …${id.slice(-4)} 保存昵称“${name}”？` : `清除 ICCID …${id.slice(-4)} 的昵称？`,{label:'保存昵称'}))return;
      await mutate(renameFeedback,async current=>{const fresh=await freshProfile(id);if(!current())return;if((fresh.profile.nickname || '')!==renameBaseline)throw new Error('昵称已在其他位置更改。请读取配置并检查你的草稿。');await request('/api/esim/nickname',{...json('POST',{iccid:id,nickname:name}),timeoutMs:45000});if(!current())return;const latest=await getInventory();if(!current())return;acceptInventory(latest);const saved=latest.profiles.find(profile=>profile.iccid===id);if(!latest.stale && saved && (saved.nickname || '')===name){selectRename(id);say(renameFeedback,'昵称已保存，卡已确认。');}else say(renameFeedback,'昵称尚未确认。你的草稿已保留。',true);});
    }catch(error){if(UI.current(epoch))say(renameFeedback,error.message,true);}finally{render();}
  });
  addForm.addEventListener('submit',async event=>{
    event.preventDefault();if(!ready() || download.state!=='idle' || !addForm.reportValidity())return;const epoch=UI.epoch;
    try{const body=E.activation(activation.value,confirmationCode.value);if(!await confirm('下载 eSIM 配置','通过路由器的移动连接联系运营商并下载此配置？安装前你将检查其名称与提供商。',{label:'开始下载'}))return;
      await mutate(addFeedback,async current=>{const status=await request('/api/esim/download');if(!current())return;if(status.state!=='idle')throw new Error('已有其他下载或结果。开始新的下载前请先检查。');clearCodes();pendingDownload=true;render();try{const revision=downloadRevision,result=await request('/api/esim/download',{...json('POST',body),timeoutMs:45000});if(!current())return;if(downloadRevision===revision)download=result;pendingDownload=false;say(addFeedback,'下载请求已接受。安装前请在下方检查运营商的配置详情。');if(download.state==='done')queueRefresh();}catch(error){if(!current())return;if(error.status && error.status<500){pendingDownload=false;activation.value=body.activation_code;confirmationCode.value=body.confirmation_code || '';markDraft();}say(addFeedback,`下载请求未能确认。${error.message}。重试前请关注其实时状态。`,true);}});
    }catch(error){if(UI.current(epoch))say(addFeedback,error.message,true);}finally{render();}
  });
  async function decideDownload(accept){if(download.state!=='confirm')return;const expected={started_at:download.started_at,agent_instance:agentInstance};if(!await confirm(accept ? '安装此 eSIM 配置？' : '拒绝此配置？',`${download.provider || '运营商'} · ${download.name || '配置'}。${accept ? '将其安装到卡上？在你激活前它将保持停用。' : '拒绝此次安装？'}`,{label:accept ? '安装配置' : '拒绝配置'}))return;
    await mutate(downloadFeedback,async current=>{const status=await request('/api/esim/download');if(!current())return;if(status.state!=='confirm' || status.started_at!==expected.started_at || agentInstance!==expected.agent_instance)throw new Error('配置预览已更改或已过期。请检查当前状态。');const revision=downloadRevision,result=await request('/api/esim/download/confirm',json('POST',{accept,expected}));if(!current())return;if(downloadRevision===revision)download=result;say(downloadFeedback,accept ? '已批准安装。正在等待卡的结果。' : '拒绝请求已接受。正在等待取消。');});render();
  }
  async function cancelDownload(){
    const expected={started_at:download.started_at,agent_instance:agentInstance};
    if(!await confirm('取消 eSIM 下载？','请求运营商和卡在下一个安全步骤停止。安装一旦开始便无法中断。',{label:'取消下载'}))return;
    await mutate(downloadFeedback,async current=>{const status=await request('/api/esim/download');if(!current())return;if(status.started_at!==expected.started_at || agentInstance!==expected.agent_instance || !['running','confirm'].includes(status.state) || String(status.step).startsWith('es10b_load_bound_profile_package'))throw new Error('下载已更改或已开始安装。请检查其当前状态。');const revision=downloadRevision,result=await request('/api/esim/download/cancel',json('POST',{expected}));if(!current())return;if(downloadRevision===revision)download=result;say(downloadFeedback,'已请求取消。正在等待路由器完成停止。');});render();
  }
  async function dismissDownload(){const expected={started_at:download.started_at,agent_instance:agentInstance};await mutate(downloadFeedback,async current=>{const revision=downloadRevision,result=await request('/api/esim/download',json('DELETE',{expected}));if(!current())return;if(downloadRevision===revision)download=result;pendingDownload=false;say(downloadFeedback,'下载结果已关闭。');});render();}
  async function loadReceipts(){if(!online() || busy())return;loading=true;render();const epoch=UI.epoch;try{const data=await request('/api/esim/notifications',{timeoutMs:65000});if(!UI.current(epoch))return;receipts=data;say(receiptFeedback,data.stale ? '显示最近上报的运营商回执。' : '已从卡读取待处理回执。');}catch(error){if(UI.current(epoch))say(receiptFeedback,error.message,true);}finally{if(UI.current(epoch)){loading=false;render();}}}
  async function processReceipts(){if(!ready() || !receipts?.count)return;if(!await confirm('发送待处理运营商回执？',`通过路由器的移动连接向运营商的服务器发送 ${receipts.count} 条待处理回执？`,{label:'发送回执'}))return;await mutate(receiptFeedback,async current=>{const result=await request('/api/esim/notifications/process',json('POST',{}));if(!current())return;receipts=result;say(receiptFeedback,'回执处理已开始。实时状态将显示剩余数量。');});render();}
  function reconcileSwitch(){if(!pendingSwitch)return;const matches=switchState.target_iccid===pendingSwitch.id && Number(switchState.generation)>pendingSwitch.base;if(!matches)return;pendingSwitch.observed=true;if(!E.switchBusy(switchState) && switchState.state!=='idle'){reportSwitch(E.switchMessage(switchState),switchState.state!=='connected');pendingSwitch=null;queueRefresh();}}
  function queueRefresh(){refreshQueued=true;refreshAfterJob();}
  function refreshAfterJob(){if(refreshQueued && route() && online() && !inventory?.updating && !busy()){refreshQueued=false;load();}}
  window.addEventListener('dashboard:readings',event=>{
    const reading=event.detail.readings.esim_status;if(!reading)return;sourceAvailable=!!reading.ok;if(!reading.ok){render();return;}const data=reading.data || {},oldDownloadBusy=E.downloadBusy(download),oldSwitchBusy=E.switchBusy(switchState);
    if(agentInstance!==null && data.agent_instance && data.agent_instance!==agentInstance){inventory=null;chip=null;pendingSwitch=null;pendingDownload=false;drawProfiles();}agentInstance=data.agent_instance || agentInstance;lastStatusAt=Date.now();passwordRequired=!!data.password_required;
    if(data.inventory_loaded && data.inventory)try{acceptInventory(data.inventory);}catch(error){say(feedback,error.message,true);}else if(inventory && data.inventory && Number(data.inventory.generation)>Number(inventory.generation)){inventory=null;chip=null;drawProfiles();}
    switchState=data.switch || switchState;if(data.download){downloadRevision++;download=data.download;}receipts=data.receipts || receipts;if(E.downloadBusy(download))pendingDownload=false;reconcileSwitch();if(oldDownloadBusy && !E.downloadBusy(download) || oldSwitchBusy && !E.switchBusy(switchState))queueRefresh();render();refreshAfterJob();
  });
  window.addEventListener('dashboard:connection',render);window.addEventListener('dashboard:navigate',()=>{render();refreshAfterJob();});window.addEventListener('dashboard:mutation-complete',()=>{render();refreshAfterJob();});
  UI.track({route:'network/esim',get loaded(){return attempted;},get dirty(){return renameDirty || activationDirty;},load,clear(){inventory=null;chip=null;receipts=null;switchState={state:'idle'};download={state:'idle'};attempted=false;loading=false;chipLoading=false;qrBusy=false;pendingSwitch=null;pendingDownload=false;refreshQueued=false;renameId=null;renameBaseline='';renameDirty=false;passwordRequired=false;lastStatusAt=null;sourceAvailable=false;agentInstance=null;downloadRevision++;clearCodes();renameInput.value='';renameChoice.replaceChildren();rename.dataset.dirty='false';cards.clear();profileKeys.clear();keyProfiles.clear();nextProfileKey=0;profileList.replaceChildren();for(const node of [feedback,renameFeedback,addFeedback,downloadFeedback,chipFeedback,receiptFeedback])say(node,'解锁控制台以读取 eSIM 信息。');say(dashboardFeedback,'解锁控制台以切换 eSIM 配置。');drawProfiles();render();}});
  UI.track({route:'dashboard/overview',get loaded(){return attempted;},load,clear(){renderDashboard();}});
  drawProfiles();render();
})();
