'use strict';
(() => {
  const UI = OpenU60UI, API = OpenU60Console, A = OpenU60Advanced;
  const {el,button,say,json,request,confirm,mutate} = UI;
  const section = UI.panel('network/operators','operator-scan','可用移动网络','通过路由器的 SIM 卡扫描，然后选择网络。扫描可能中断移动数据，最长几分钟。');
  const actions = el('div','form-actions'), scan = button('扫描网络',startScan,'primary'), automatic = button('使用自动选择',useAutomatic);
  actions.append(scan,automatic); section.append(actions);
  const feedback = UI.status(section), state = el('p','field-help','等待调制解调器的扫描状态。'), list = el('div','operator-list');
  section.append(state,list);
  const scanJob = new A.Job('scan',120000), registerJob = new A.Job('registration',60000);
  let latest, selectedName = '', autoPending = false;
  function connected() { return API.connected && !API.locked; }
  function update(fresh = false) {
    const data = latest;
    const status = data?.status?.ok ? data.status.data?.m_netselect_status : undefined;
    const result = data?.registration?.ok ? data.registration.data?.m_netselect_result : undefined;
    const phase = fresh ? scanJob.observe(status) : scanJob.tick(), registration = registerJob.started !== null ? fresh ? registerJob.observe(result) : registerJob.tick() : 'idle';
    const scanning = ['running','waiting'].includes(phase) || scanJob.pending;
    scan.disabled = !connected() || scanning || registerJob.pending;
    automatic.disabled = !connected() || registerJob.pending;
    state.textContent = !data ? '等待扫描数据…' : data.status?.ok ? `调制解调器扫描状态：${status ?? '未上报'} · ${data.sampled_at ? new Date(Number(data.sampled_at)).toLocaleTimeString() : '实时数据流'}` : '扫描状态不可用。之前上报的网络已保留。';
    if (registerJob.started !== null) {
      if (registration === 'complete') say(feedback,`调制解调器报告已成功注册到 ${selectedName}。请在移动网络中检查由此产生的数据连接。`);
      else if (registration === 'failed') say(feedback,`调制解调器报告注册 ${selectedName} 失败。请尝试自动选择或其他允许的网络。`,true);
      else if (registration === 'timeout') say(feedback,'一分钟内未确认注册。调制解调器可能仍在处理；重试前请检查其状态。',true);
      else say(feedback,`正在等待注册到 ${selectedName}…`);
    } else if (scanJob.started !== null) {
      if (phase === 'complete') say(feedback,'调制解调器报告扫描完成。请在下方选择可用网络。结果可能包含缓存的运营商信息。');
      else if (phase === 'failed') say(feedback,'调制解调器报告扫描失败。重试前请检查 SIM 与射频状态。',true);
      else if (phase === 'timeout') say(feedback,'两分钟内未确认扫描完成。路由器上的扫描可能仍在继续。',true);
      else say(feedback,'正在扫描移动网络…结果会自动到达。');
    }
    if (data?.results?.ok) draw(A.operators(data.results.data),scanning);
  }
  function draw(rows,scanning) {
    list.replaceChildren();
    if (!rows.length) { list.append(el('p','carrier-empty',scanning ? '等待扫描结果…' : '未上报网络。开始扫描以查找运营商。')); return; }
    for (const operator of rows) {
      const card = el('article','operator-card'), copy = el('div'), heading = el('div','title-count');
      heading.append(el('h3','',operator.name),el('span','tag',operator.status));
      copy.append(heading,el('p','mono',`${operator.plmn || 'PLMN 不可用'} · ${operator.rat || '接入类型不可用'}`));
      const choose = button('注册',()=>register(operator));
      choose.disabled = !connected() || scanning || registerJob.pending || !operator.selectable;
      if (!operator.selectable) choose.title = '该运营商被禁止，或没有可用的网络标识。';
      card.append(copy,choose); list.append(card);
    }
  }
  async function startScan() {
    if (!await confirm('扫描移动网络？','路由器将搜索可用运营商。扫描期间移动数据可能断开。离开此页面后扫描仍会继续。',{label:'开始扫描'})) return;
    await mutate(feedback,async current=>{
      await request('/api/modem/scan',json('POST',{})); if (!current()) return;
      registerJob.clear(); scanJob.start(); autoPending = false; list.replaceChildren(el('p','carrier-empty','等待新的扫描结果…')); update(true);
    });
  }
  async function register(operator) {
    if (!operator.selectable || !await confirm('注册到此网络？',`选择 ${operator.name}（${operator.plmn}，${operator.rat}）。此操作可能断开移动数据。可能产生漫游费用；你的 SIM 必须允许接入。`,{label:'注册网络'})) return;
    await mutate(feedback,async current=>{
      await request('/api/modem/register',json('POST',{m_mcc_mnc:operator.plmn,m_rat:operator.rat})); if (!current()) return;
      scanJob.clear(); registerJob.start(); selectedName = operator.name; autoPending = false; update(true);
    });
  }
  async function useAutomatic() {
    if (!await confirm('使用自动网络选择？','让 SIM 与调制解调器重新选择移动运营商。移动数据可能重新连接。',{label:'使用自动选择'})) return;
    await mutate(feedback,async current=>{
      await request('/api/modem/network-mode',json('PUT',{net_select_mode:'auto_select'})); if (!current()) return;
      registerJob.clear(); scanJob.clear(); autoPending = API.data('signal')?.net_select_mode !== 'auto_select'; say(feedback,autoPending ? '已请求自动选择。正在等待调制解调器确认…' : '调制解调器已确认自动网络选择。');
    });
  }
  window.addEventListener('dashboard:readings',event=>{
    if (event.detail.readings.operators?.ok) { latest = event.detail.readings.operators.data; update(true); }
    if (autoPending && event.detail.readings.signal?.ok && event.detail.readings.signal.data?.net_select_mode === 'auto_select') { autoPending = false; say(feedback,'调制解调器已确认自动网络选择。'); }
  });
  const timer = setInterval(()=>{ if (!document.hidden && OpenU60Navigation.current.key === 'network/operators' && (scanJob.pending || registerJob.pending)) update(); },1000);
  window.addEventListener('dashboard:navigate',()=>{ if (OpenU60Navigation.current.key === 'network/operators') update(); });
  UI.track({route:'network/operators',loaded:true,load:()=>{},get dirty(){return false;},clear:()=>{ latest = null; selectedName = ''; autoPending = false; scanJob.clear(); registerJob.clear(); state.textContent = '解锁控制台以读取调制解调器状态。'; list.replaceChildren(); feedback.textContent = ''; scan.disabled = automatic.disabled = true; }});
  window.addEventListener('pagehide',event=>{ if (!event.persisted) clearInterval(timer); });
  latest = API.data('operators'); update(true);
})();
