'use strict';
(() => {
  const icons = {
    dashboard: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 3v18M9 10h12"/>',
    network: '<path d="M3 9a15 15 0 0 1 18 0M6 13a10 10 0 0 1 12 0m-9 4a5 5 0 0 1 6 0"/><circle cx="12" cy="21" r=".5"/>',
    sms: '<path d="M21 11a8 8 0 0 1-8 8H7l-4 3V5a3 3 0 0 1 3-3h7a8 8 0 0 1 8 9Z"/><path d="M7 8h10M7 12h7"/>',
    tools: '<path d="m14 6 4-4a6 6 0 0 1-7 8L4 21l-3-3L12 7a6 6 0 0 1 8-7l-4 4 1 3 3 1"/>',
    settings: '<path d="m10 3-1 3-3 1-3 3 2 3-1 3 3 3 3-1 3 2 3-3 1-3 3-1-1-4-3-1-1-3Z"/><circle cx="12" cy="12" r="3"/>'
  };
  const groups = [
    {id:'dashboard',label:'仪表盘',pages:[
      {id:'overview',label:'概览',title:'路由器概览',description:'清晰查看你的连接状态与接入设备。'},
      {id:'history',label:'连接历史',title:'连接历史',description:'本标签页会话期间观察到的中断与恢复。'}
    ]},
    {id:'network',label:'网络',pages:[
      {id:'signal',label:'信号与小区',title:'信号与小区',description:'每个已上报的 LTE 与 NR 载波，并清晰显示 SA 与 NSA 状态。'},
      {id:'wifi',label:'Wi-Fi',title:'Wi-Fi 网络',description:'你的本地无线网络与射频状态。'},
      {id:'clients',label:'已连接设备',title:'已连接设备',description:'你的设备、实时流量、观察到的峰值与上报的速率限制。'},
      {id:'dns',label:'DNS 与隐私',title:'DNS 与隐私',description:'选择域名解析方式，测试加密 DNS，并在设置异常时安全恢复。'},
      {id:'dns-cache',label:'实时 DNS 缓存',title:'实时 DNS 缓存',description:'观察应答进入路由器缓存、倒计时，并在过期时消失。'},
      {id:'vpn',label:'WireGuard VPN',title:'WireGuard VPN',description:'导入分流隧道配置，并查看原生内核握手与流量。'},
      {id:'lan',label:'局域网与 DHCP',title:'局域网与 DHCP',description:'路由器的本地地址以及它分配给你设备的地址。'},
      {id:'firewall',label:'防火墙与 DMZ',title:'防火墙与 DMZ',description:'控制入站防护、地址转换与自动端口放行。'},
      {id:'ports',label:'端口转发',title:'端口转发',description:'将特定的入站连接转发到本地网络中的某台设备。'},
      {id:'qos',label:'服务质量（QoS）',title:'服务质量（QoS）',description:'管理路由器内置的流量优先级。'},
      {id:'mobile',label:'移动网络',title:'移动网络',description:'蜂窝数据连接与调制解调器射频状态。'},
      {id:'ttl',label:'数据包 TTL',title:'数据包 TTL',description:'调整蜂窝软件路径上出站 IPv4 TTL 与 IPv6 跳数限制。'},
      {id:'esim',label:'eSIM 管理',title:'eSIM 管理',description:'路由器中 eSIM 卡的配置文件、激活码与连接状态。'},
      {id:'operators',label:'网络运营商',title:'网络运营商',description:'查找可用的移动网络，并选择自动或手动注册。'},
      {id:'apn',label:'APN 配置',title:'APN 配置',description:'管理用于移动数据的接入点配置。'},
      {id:'bands',label:'频段与锁小区',title:'频段与锁小区',description:'选择首选 LTE 与 NR 频段或指定服务小区。'}
    ]},
    {id:'sms',label:'短信',pages:[
      {id:'inbox',label:'消息',title:'消息',description:'阅读、回复并管理路由器与 SIM 卡上的消息。'},
      {id:'compose',label:'新建消息',title:'新消息',description:'通过路由器的 SIM 卡发送短信。'},
      {id:'forwarding',label:'转发规则',title:'短信转发',description:'将收到的消息转发到你选择的目的地。'},
      {id:'storage',label:'消息存储',title:'消息存储',description:'调制解调器上报的容量与未读消息数。'}
    ]},
    {id:'tools',label:'工具',pages:[
      {id:'device',label:'设备信息',title:'设备信息',description:'设备端 Agent 上报的系统详情。'},
      {id:'battery',label:'电池与电源',title:'电池与电源',description:'电池状况、充电状态、运行时间估算与实测功率。'},
      {id:'diagnostics',label:'系统诊断',title:'系统诊断',description:'实时资源占用、温度、进程与接口详情。'},
      {id:'radio',label:'无线诊断',title:'无线诊断',description:'检查邻区并运行信号质量扫描。'},
      {id:'speedtest',label:'网速测试',title:'网速测试',description:'测量路由器的互联网连接，并实时显示进度。'},
      {id:'data',label:'流量统计',title:'流量统计',description:'跟踪路由器统计的流量，并设置每月流量上限、预警与计费周期。'},
      {id:'terminal',label:'AT 终端',title:'AT 终端',description:'发送明确的调制解调器命令并查看其响应。'},
      {id:'traffic',label:'流量监控',title:'流量监控',description:'实时传输速率与接口累计流量，由路由器推送。'}
    ]},
    {id:'settings',label:'设置',pages:[
      {id:'device',label:'设备与电源',title:'设备与电源',description:'充电、电源设置与设备维护。'},
      {id:'https',label:'HTTPS 与安装',title:'HTTPS 与安装',description:'安全本地访问，并将此控制台安装到你的设备。'},
      {id:'appearance',label:'外观',title:'外观',description:'无论环境光线如何，都能舒适查看。'},
      {id:'connection',label:'控制台连接',title:'控制台连接',description:'连接状态以及对此本地控制台的访问。'},
      {id:'update',label:'Agent 更新',title:'Agent 更新',description:'已签名的稳定版与 Beta 版本，并具备自动回滚保护。'},
      {id:'about',label:'关于',title:'关于 OpenU60',description:'适用于你的 ZTE U60 Pro 的本地控制台。'}
    ]}
  ];
  const aliases = {overview:'dashboard/overview',cellular:'network/signal',wireless:'network/wifi',devices:'network/clients',system:'tools/device'};
  const remembered = new Map(), positions = new Map();
  let current;
  const root = document.documentElement;
  const primary = document.querySelector('#primary-navigation');
  const sidebarToggle = document.querySelector('#sidebar-toggle');
  const mobileHost = document.querySelector('#mobile-navigation-host');
  const navigationSlot = document.createComment('Desktop navigation');
  primary.before(navigationSlot);
  const mobileLayout = matchMedia('(max-width:767px), (max-width:1023px) and (max-height:500px) and (hover:none) and (pointer:coarse)');
  const desktopLayout = matchMedia('(min-width:768px)');
  const reducedMotion = matchMedia('(prefers-reduced-motion:reduce)');
  const navigationPreference = 'openu60.navigation.collapsed';
  const groupAnimations = new WeakMap();
  let navigationCollapsed = false, navigationMotionTimer;
  let viewportFrame;
  try { navigationCollapsed = localStorage.getItem(navigationPreference) === 'true'; } catch { /* Private browsing can block storage. */ }
  function setNavigationCollapsed(collapsed,{remember=true,animate=true}={}) {
    navigationCollapsed = !!collapsed;
    clearTimeout(navigationMotionTimer);
    if (animate && desktopLayout.matches && !reducedMotion.matches) {
      root.dataset.navigationMotion = 'true';
      navigationMotionTimer = setTimeout(()=>delete root.dataset.navigationMotion,320);
    } else delete root.dataset.navigationMotion;
    root.dataset.navigation = navigationCollapsed ? 'collapsed' : 'expanded';
    const action = navigationCollapsed ? '展开导航' : '收起导航';
    sidebarToggle.setAttribute('aria-expanded',String(!navigationCollapsed));
    sidebarToggle.setAttribute('aria-label',action);
    sidebarToggle.title = action;
    if (remember) try { localStorage.setItem(navigationPreference,String(navigationCollapsed)); } catch { /* Keep the choice for this tab. */ }
  }
  function stopGroupAnimation(details) {
    const running = groupAnimations.get(details);
    if (!running) return;
    running.animation.cancel(); groupAnimations.delete(details);
    const children = details.querySelector('.nav-children');
    children.style.removeProperty('height'); children.style.removeProperty('opacity'); children.style.removeProperty('overflow');
  }
  function animateGroup(details,targetOpen) {
    const children = details.querySelector('.nav-children');
    if (reducedMotion.matches) { stopGroupAnimation(details); details.open = targetOpen; return; }
    const running = groupAnimations.get(details);
    const startHeight = details.open ? children.getBoundingClientRect().height : 0;
    running?.animation.cancel();
    if (targetOpen) details.open = true;
    const endHeight = targetOpen ? children.scrollHeight : 0;
    children.style.overflow = 'hidden';
    const animation = children.animate([
      {height:`${startHeight}px`,opacity:targetOpen ? 0 : 1,transform:targetOpen ? 'translateY(-5px)' : 'translateY(0)'},
      {height:`${endHeight}px`,opacity:targetOpen ? 1 : 0,transform:targetOpen ? 'translateY(0)' : 'translateY(-5px)'}
    ],{duration:targetOpen ? 230 : 180,easing:'cubic-bezier(.22,.8,.24,1)'});
    groupAnimations.set(details,{animation,targetOpen});
    animation.addEventListener('finish',()=>{
      if (groupAnimations.get(details)?.animation !== animation) return;
      if (!targetOpen) details.open = false;
      groupAnimations.delete(details);
      children.style.removeProperty('height'); children.style.removeProperty('opacity'); children.style.removeProperty('overflow');
    },{once:true});
  }
  setNavigationCollapsed(navigationCollapsed,{remember:false,animate:false});
  sidebarToggle.addEventListener('click',()=>setNavigationCollapsed(!navigationCollapsed));
  for (const group of groups) {
    const details = document.createElement('details'); details.className = 'nav-group'; details.dataset.group = group.id;
    const summary = document.createElement('summary');
    // Icons are static application assets; page and modem values are never parsed as markup.
    summary.innerHTML = `<span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24">${icons[group.id]}</svg></span><span class="nav-text">${group.label}</span><span class="nav-chevron" aria-hidden="true">›</span>`;
    summary.setAttribute('aria-label',group.label); summary.title = group.label;
    const children = document.createElement('div'); children.className = 'nav-children';
    for (const page of group.pages) {
      const link = document.createElement('a'); link.href = `#${group.id}/${page.id}`; link.textContent = page.label; link.dataset.route = `${group.id}/${page.id}`;
      children.append(link);
    }
    summary.addEventListener('click', event => {
      if (mobileLayout.matches) {
        event.preventDefault(); go(remembered.get(group.id) || `${group.id}/${group.pages[0].id}`);
      } else if (navigationCollapsed) {
        event.preventDefault(); go(remembered.get(group.id) || `${group.id}/${group.pages[0].id}`);
      } else {
        event.preventDefault();
        const running = groupAnimations.get(details);
        animateGroup(details,running ? !running.targetOpen : !details.open);
      }
    });
    details.append(summary,children); primary.append(details);
  }
  function resolve(hash) {
    const key = aliases[hash] || hash;
    for (const group of groups) {
      const page = group.pages.find(page => `${group.id}/${page.id}` === key);
      if (page) return {group,page,key};
    }
    return {group:groups[0],page:groups[0].pages[0],key:'dashboard/overview'};
  }
  function apply(initial = false) {
    if (current) positions.set(current.key, scrollY);
    current = resolve(location.hash.slice(1));
    remembered.set(current.group.id,current.key);
    document.documentElement.dataset.route = current.key;
    document.title = `${current.page.title} · OpenU60`;
    const title = document.querySelector('#page-title');
    title.textContent = current.page.title;
    const dot = document.createElement('span'); dot.textContent = '。'; title.append(dot);
    document.querySelector('#page-description').textContent = current.page.description;
    document.querySelector('#page-section').textContent = current.group.label.toUpperCase();
    document.querySelector('#breadcrumb-section').textContent = current.group.label;
    document.querySelector('#breadcrumb-page').textContent = current.page.label;
    for (const details of primary.querySelectorAll('.nav-group')) {
      const active = details.dataset.group === current.group.id;
      details.classList.toggle('active',active);
      const summary = details.querySelector('summary');
      if (active) { stopGroupAnimation(details); details.open = true; summary.setAttribute('aria-current','true'); }
      else summary.removeAttribute('aria-current');
      for (const link of details.querySelectorAll('a')) {
        const selected = link.dataset.route === current.key;
        link.classList.toggle('active',selected);
        if (selected) link.setAttribute('aria-current','page'); else link.removeAttribute('aria-current');
      }
    }
    const subtabs = document.querySelector('#section-tabs'); subtabs.replaceChildren();
    const picker = document.createElement('label'); picker.className = 'section-tabs-picker';
    const pickerLabel = document.createElement('span'); pickerLabel.className = 'section-tabs-picker-label';
    pickerLabel.textContent = `${current.group.label}页面`;
    const pickerControl = document.createElement('span'); pickerControl.className = 'section-tabs-picker-control';
    const select = document.createElement('select'); select.id = 'section-page-picker';
    select.setAttribute('aria-label',`${current.group.label}页面`);
    const links = document.createElement('div'); links.className = 'section-tab-links';
    for (const page of current.group.pages) {
      const route = `${current.group.id}/${page.id}`;
      const option = document.createElement('option'); option.value = route; option.textContent = page.label;
      option.selected = page.id === current.page.id; select.append(option);
      const link = document.createElement('a'); link.href = `#${current.group.id}/${page.id}`;
      link.textContent = page.label;
      if (page.id === current.page.id) link.setAttribute('aria-current','page');
      links.append(link);
    }
    select.addEventListener('change',() => go(select.value));
    pickerControl.append(select); picker.append(pickerLabel,pickerControl); subtabs.append(picker,links);
    for (const panel of document.querySelectorAll('[data-views]')) {
      panel.dataset.viewHidden = String(!panel.dataset.views.split(' ').includes(current.key));
    }
    window.dispatchEvent(new CustomEvent('dashboard:navigate',{detail:{group:current.group.id,page:current.page.id,key:current.key}}));
    if (!initial) {
      scrollTo({top:positions.get(current.key) || 0,behavior:'instant'});
      title.focus({preventScroll:true});
    }
    revealCurrentPage();
  }
  function revealCurrentPage() {
    const tabs = document.querySelector('.section-tab-links'), selected = tabs?.querySelector('[aria-current]');
    if (!selected || !tabs.clientWidth) return;
    const left = selected.getBoundingClientRect().left - tabs.getBoundingClientRect().left + tabs.scrollLeft;
    if (left < tabs.scrollLeft) tabs.scrollLeft = Math.max(0,left - 12);
    else if (left + selected.offsetWidth > tabs.scrollLeft + tabs.clientWidth) tabs.scrollLeft = left + selected.offsetWidth - tabs.clientWidth + 12;
  }
  function updateViewport() {
    viewportFrame = undefined;
    const root = document.documentElement;
    if (!mobileLayout.matches) {
      root.style.removeProperty('--mobile-navigation-lift');
      root.style.removeProperty('--mobile-navigation-height');
      root.style.removeProperty('--mobile-viewport-height');
      root.style.removeProperty('--mobile-viewport-top');
      return;
    }
    const viewport = window.visualViewport;
    const normalScale = viewport && Math.abs(viewport.scale - 1) < .01 && viewport.height > 0;
    // The keyboard can shrink only the visible viewport while fixed elements stay below it.
    const lift = normalScale
      ? Math.max(0,Math.round(root.clientHeight - viewport.height - Math.max(0,viewport.offsetTop))) : 0;
    const sizes = {
      '--mobile-navigation-lift':lift,
      '--mobile-navigation-height':Math.ceil(primary.getBoundingClientRect().height),
      '--mobile-viewport-height':normalScale ? viewport.height : root.clientHeight,
      '--mobile-viewport-top':normalScale ? Math.max(0,viewport.offsetTop) : 0
    };
    for (const [name,value] of Object.entries(sizes)) {
      if (root.style.getPropertyValue(name) !== `${value}px`) root.style.setProperty(name,`${value}px`);
    }
  }
  function scheduleViewport() {
    if (viewportFrame === undefined) viewportFrame = requestAnimationFrame(updateViewport);
  }
  function placeNavigation() {
    const destination = mobileLayout.matches ? mobileHost : navigationSlot.parentElement;
    if (primary.parentElement !== destination) {
      const focused = primary.contains(document.activeElement) ? document.activeElement : null;
      if (mobileLayout.matches) mobileHost.append(primary); else navigationSlot.after(primary);
      focused?.focus({preventScroll:true});
    }
    scheduleViewport();
    revealCurrentPage();
  }
  function go(route) {
    if (location.hash.slice(1) === route) OpenU60Motion.changePage(() => apply(),{animate:false}); else location.hash = route;
  }
  document.querySelector('.skip').addEventListener('click',event => {
    event.preventDefault();
    const main = document.querySelector('#main');
    main.tabIndex = -1; main.focus({preventScroll:true}); scrollTo({top:0,behavior:'instant'});
  });
  window.addEventListener('hashchange',() => {
    OpenU60Motion.changePage(() => apply(),{animate:resolve(location.hash.slice(1)).key !== current.key});
  });
  mobileLayout.addEventListener('change',placeNavigation);
  desktopLayout.addEventListener('change',()=>{ delete root.dataset.navigationMotion; placeNavigation(); });
  window.addEventListener('resize',() => { placeNavigation(); scheduleViewport(); },{passive:true});
  window.addEventListener('pageshow',placeNavigation);
  window.visualViewport?.addEventListener('resize',scheduleViewport,{passive:true});
  window.visualViewport?.addEventListener('scroll',scheduleViewport,{passive:true});
  if (typeof ResizeObserver === 'function') new ResizeObserver(scheduleViewport).observe(primary);
  globalThis.OpenU60Navigation = {go,get current(){return {group:current.group.id,page:current.page.id,key:current.key};}};
  apply(true);
  placeNavigation();
})();
