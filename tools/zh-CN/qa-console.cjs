// Smoke test for the OpenU60 console using the system Edge browser.
// Usage: node qa-console.cjs [baseUrl] [password] [outDir]
const { chromium } = require('playwright-core');
const fs = require('node:fs');

const base = process.argv[2] || 'http://192.168.0.1:9090';
const password = process.argv[3] || process.env.ZTE_AGENT_PASSWORD;
if (!password) { console.error('用法: node qa-console.cjs <baseUrl> <agentPassword> [outDir]（或设置 ZTE_AGENT_PASSWORD）'); process.exit(2); }
const outDir = process.argv[4] || 'C:\\Users\\Administrator\\Downloads\\u60qa\\shots';

const ROUTES = [
  'dashboard/overview',
  'dashboard/history',
  'network/signal',
  'network/wifi',
  'network/clients',
  'network/dns',
  'network/dns-cache',
  'network/vpn',
  'network/lan',
  'network/firewall',
  'network/ports',
  'network/qos',
  'network/mobile',
  'network/ttl',
  'network/esim',
  'network/operators',
  'network/apn',
  'network/bands',
  'sms/inbox',
  'sms/compose',
  'sms/forwarding',
  'sms/storage',
  'tools/device',
  'tools/battery',
  'tools/diagnostics',
  'tools/radio',
  'tools/speedtest',
  'tools/data',
  'tools/terminal',
  'tools/traffic',
  'settings/device',
  'settings/https',
  'settings/appearance',
  'settings/connection',
  'settings/update',
  'settings/about',
];

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 }, locale: 'zh-CN' });
  const page = await context.newPage();
  const errors = [];
  const failedRequests = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('response', (response) => {
    if (response.status() >= 400) failedRequests.push({ status: response.status(), url: response.url() });
  });

  await page.goto(`${base}/console/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  const lang = await page.evaluate(() => document.documentElement.lang);

  // Sign in when the dialog is shown.
  if (await page.locator('#password').count()) {
    if (await page.locator('#password').isVisible()) {
      await page.fill('#password', password);
      await page.click('#login-form button[type=submit]');
    }
  }
  await page.waitForFunction(() => globalThis.OpenU60Console?.connected === true, null, { timeout: 30000 });
  await page.waitForTimeout(1500);

  const title = await page.title();
  const navLabels = await page.$$eval('#primary-navigation summary .nav-text', (nodes) => nodes.map((node) => node.textContent.trim()));
  const pageLabels = await page.$$eval('#section-tabs .section-tab-links a', (nodes) => nodes.map((node) => node.textContent.trim()));
  const results = [];
  for (const route of ROUTES) {
    await page.evaluate((value) => globalThis.OpenU60Navigation.go(value), route);
    await page.waitForFunction((value) => document.documentElement.dataset.route === value, route, { timeout: 15000 });
    await page.waitForTimeout(700);
    const snapshot = await page.evaluate(() => ({
      route: document.documentElement.dataset.route,
      heading: document.querySelector('#page-title')?.textContent.trim(),
      description: document.querySelector('#page-description')?.textContent.trim(),
      chinese: /[\u4e00-\u9fff]/.test(document.querySelector('#main')?.innerText || ''),
    }));
    results.push(snapshot);
    const name = route.replace('/', '-');
    await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: false });
  }

  // Live dashboard screenshot at the end.
  await page.evaluate(() => globalThis.OpenU60Navigation.go('dashboard/overview'));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${outDir}/dashboard-overview.png`, fullPage: false });

  const summary = {
    lang,
    title,
    navLabels,
    pageLabels,
    routes: results,
    errors: errors.slice(0, 40),
    failedRequests: failedRequests.slice(0, 60),
    connected: await page.evaluate(() => globalThis.OpenU60Console?.connected === true),
  };
  fs.writeFileSync(`${outDir}/report.json`, JSON.stringify(summary, null, 2), 'utf8');
  console.log(JSON.stringify(summary, null, 2));
  await browser.close();
})().catch((error) => {
  console.error('QA FAILED:', error);
  process.exitCode = 1;
});
