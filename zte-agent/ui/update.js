'use strict';
(() => {
  const UI = globalThis.OpenU60UI;
  if (!UI) return;
  const $ = id => document.getElementById(id);
  const form = $('update-settings-form'), fields = $('update-settings-fields');
  const channel = $('update-channel'), autoCheck = $('update-auto-check'), autoDownload = $('update-auto-download');
  const save = $('update-save'), check = $('update-check'), download = $('update-download'), install = $('update-install'), rollback = $('update-rollback');
  const feedback = $('update-feedback');
  let status = null, busy = false, baseline = '';
  const bytes = value => {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return '—';
    const unit = n >= 1048576 ? 'MB' : n >= 1024 ? 'KB' : 'B';
    return `${(n / ({MB:1048576,KB:1024,B:1}[unit])).toFixed(unit === 'B' ? 0 : 1)} ${unit}`;
  };
  const title = value => String(value || 'idle').replaceAll('_',' ').replace(/^./,letter=>letter.toUpperCase());
  const numeric = value => value !== null && value !== undefined && Number.isFinite(Number(value));
  const progressValue = (progress,phase) => {
    const total = numeric(progress?.total) ? Math.max(0,Number(progress.total)) : 0;
    const received = numeric(progress?.received) ? Math.max(0,Number(progress.received)) : 0;
    if (!total) return {total:0,received:0,percent:0,verifying:false};
    const bounded = Math.min(received,total), exact = Math.floor(bounded / total * 100), reported = numeric(progress?.percent) ? Math.floor(Number(progress.percent)) : exact;
    // The progress block represents download + signature/probe verification. Do
    // not announce 100% while those final checks are still running.
    const verifying = phase === 'downloading' && bounded >= total;
    const percent = verifying ? 99 : Math.max(0,Math.min(100,exact,reported));
    return {total,received:bounded,percent,verifying};
  };
  const currentSettings = () => JSON.stringify({channel:channel.value,automatic_checks:autoCheck.checked,automatic_downloads:autoDownload.checked});
  function setBusy(value) {
    busy = value; form.inert = value; check.disabled = value;
    render();
  }
  function render(next = status) {
    if (next) status = next;
    if (!status) return;
    const current = status.current || {}, progress = status.progress || {};
    $('update-current-version').textContent = current.version ? `v${current.version}` : '未知';
    $('update-current-commit').textContent = [current.commit,current.target].filter(Boolean).join(' · ') || '构建详情不可用';
    $('update-channel-state').textContent = status.channel === 'beta' ? 'Beta' : '稳定版';
    $('update-check-time').textContent = status.last_check ? `上次检查 ${new Date(status.last_check * 1000).toLocaleString()}` : '尚未检查';
    $('update-phase').textContent = status.trial_in_progress ? '健康试运行' : ({idle:'空闲',checking:'检查中',downloading:'下载中',staged:'已暂存',installing:'安装中',rolling_back:'回滚中',failed:'失败'}[status.phase] || title(status.phase));
    const readiness = status.install_readiness || {};
    $('update-ready').textContent = readiness.ready ? '就绪' : '等待中';
    const battery = numeric(readiness.battery_percent) ? `${readiness.battery_percent}%${readiness.external_power ? ' · 充电中' : ''}` : '电池不可用';
    const signalValue = numeric(readiness.signal_bars) && readiness.signal_bars > 0 ? ` · ${readiness.signal_bars} 格信号` : numeric(readiness.signal_dbm) ? ` · ${readiness.signal_dbm} dBm` : '';
    const signal = readiness.network_type ? `${readiness.network_type}${signalValue}` : '蜂窝网络不可用';
    $('update-ready-detail').textContent = readiness.reason || `${battery} · ${signal} · WAN 在线`;
    $('update-guard').textContent = status.bootstrap_ready ? 'A/B 恢复已就绪' : '需要引导安装';
    $('update-slot').textContent = status.active_slot ? `活动槽位 ${status.active_slot.toUpperCase()} · 仅重启 Agent` : '需通过 SSH 安装一次以启用 OTA';
    const release = status.available, staged = status.staged;
    $('update-state-detail').textContent = status.last_error || (!status.signing_configured ? '此开发构建没有版本校验密钥。' : staged ? `v${staged.version} 已校验并暂存。` : release ? `可以下载 v${release.version}。` : '未上报更新的已签名版本。');
    $('update-release').hidden = !release;
    if (release) {
      $('update-available-version').textContent = `v${release.version}${staged?.version === release.version ? ' · 已暂存' : ''}`;
      $('update-release-copy').textContent = release.channel === 'beta' ? '已签名的 Beta 版本。安装前请查看版本说明。' : '此设备有可用的已签名稳定版。';
      $('update-notes').href = release.notes_url;
    }
    const {total,received,percent,verifying} = progressValue(progress,status.phase);
    $('update-progress').hidden = status.phase !== 'downloading' && !(total && received);
    OpenU60Numbers.set($('update-percent'),percent);
    $('update-progress-bar').style.width = `${percent}%`;
    $('update-bytes').textContent = verifying ? `已接收 ${bytes(total)} · 正在校验已签名二进制文件…` : status.phase === 'staged' && received >= total ? `已下载并校验 ${bytes(total)}` : `已下载 ${bytes(received)}（共 ${bytes(total)}）`;
    if (!fields.matches(':focus-within') && !busy) {
      channel.value = status.settings?.channel || status.channel || 'stable';
      autoCheck.checked = status.settings?.automatic_checks !== false;
      autoDownload.checked = status.settings?.automatic_downloads === true;
      baseline = currentSettings();
    }
    fields.disabled = false;
    save.disabled = busy || currentSettings() === baseline;
    check.disabled = busy || !status.signing_configured;
    download.disabled = busy || !release || staged?.version === release.version;
    install.disabled = busy || !staged || !status.bootstrap_ready || status.trial_in_progress || readiness.ready !== true;
    rollback.disabled = busy || !status.bootstrap_ready || !status.rollback_available || status.trial_in_progress;
  }
  form.addEventListener('input',()=>{ save.disabled = busy || currentSettings() === baseline; });
  form.addEventListener('submit',async event => {
    event.preventDefault();
    if (channel.value === 'beta' && status?.settings?.channel !== 'beta' && !await UI.confirm('使用 Beta 通道？','Beta 版本发布更早，可能测试较少。每个版本仍然经过签名，并受自动回滚保护。',{label:'使用 Beta'})) return;
    await action('正在保存更新偏好…','更新偏好已保存。',()=>UI.request('/api/update/settings',UI.json('PUT',JSON.parse(currentSettings()))));
  });
  check.addEventListener('click',()=>action('正在检查已签名版本通道…','已签名版本检查完成。',()=>UI.request('/api/update/check',{method:'POST',timeoutMs:360000})));
  download.addEventListener('click',()=>action('正在下载并校验非活动槽位…','版本已下载、校验并暂存。',()=>UI.request('/api/update/download',{method:'POST',timeoutMs:360000})));
  install.addEventListener('click',async()=>{
    if (!await UI.confirm('安装已暂存的 Agent？',`安装 v${status?.staged?.version || ''} 并仅重启 Agent？控制台将在 60 秒健康试运行后重新连接。Wi-Fi 与蜂窝网络保持在线。`,{label:'安装 Agent'})) return;
    await action('正在交由更新监督程序处理…','已接受 Agent 重启请求。此控制台将自动重新连接。',()=>UI.request('/api/update/install',UI.json('POST',{confirm:true})));
  });
  rollback.addEventListener('click',async()=>{
    if (!await UI.confirm('回退到上一个 Agent？','从另一个已验证槽位重启 Agent。Wi-Fi 与蜂窝网络保持在线。',{label:'回退到上一个版本'})) return;
    await action('正在启动受保护的回滚…','已接受回滚请求。此控制台将自动重新连接。',()=>UI.request('/api/update/rollback',UI.json('POST',{confirm:true})));
  });
  async function action(working,done,request) {
    if (busy) return;
    await UI.mutate(feedback,async current => {
      setBusy(true); UI.say(feedback,working);
      try { const result = await request(); if (!current()) return; render(result); baseline = currentSettings(); UI.say(feedback,done); }
      finally { setBusy(false); }
    });
  }
  window.addEventListener('dashboard:readings',event=>{
    const reading = event.detail.readings?.ota_status;
    if (reading?.ok) render(reading.data);
    else if (reading && !reading.ok) UI.say(feedback,'实时更新状态不可用。',true);
  });
  window.addEventListener('dashboard:locked',()=>{
    status = null; baseline = ''; fields.disabled = true; save.disabled = check.disabled = download.disabled = install.disabled = rollback.disabled = true;
    UI.say(feedback,'解锁控制台后可读取更新状态。');
  });
})();
