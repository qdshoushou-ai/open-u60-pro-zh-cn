// Scan the live console for user-visible English leftovers.
const { chromium } = require('playwright-core');
const fs = require('node:fs');

const base = 'http://192.168.0.1:9090';
const password = process.env.ZTE_AGENT_PASSWORD || process.argv[2];
if (!password) { console.error('用法: ZTE_AGENT_PASSWORD=<密码> node scan-english.cjs'); process.exit(2); }
const ROUTES = [
  'dashboard/overview', 'dashboard/history',
  'network/signal', 'network/wifi', 'network/clients', 'network/dns', 'network/dns-cache',
  'network/vpn', 'network/lan', 'network/firewall', 'network/ports', 'network/qos',
  'network/mobile', 'network/ttl', 'network/esim', 'network/operators', 'network/apn', 'network/bands',
  'sms/inbox', 'sms/compose', 'sms/forwarding', 'sms/storage',
  'tools/device', 'tools/battery', 'tools/diagnostics', 'tools/radio', 'tools/speedtest',
  'tools/data', 'tools/terminal', 'tools/traffic',
  'settings/device', 'settings/https', 'settings/appearance', 'settings/connection', 'settings/update', 'settings/about',
];
// Terms that are intentionally English in the UI (protocols, units, product names, enums shown by design).
const ALLOW = [
  /^OpenU60$/, /^ZTE/, /^MU5250$/, /^U60/, /^CMCC$/, /^Wi-?Fi/i, /^5G (SA|NSA)$/, /^4G/, /^LTE$/,
  /^NR$/, /^SA$/, /^NSA$/, /^PCC$/, /^SCC/, /^ONLINE$/, /^dBm/, /^dB$/, /^Mbps$/, /^MiB$/, /^GB$/, /^MB$/, /^KB$/, /^B$/,
  /^%$/, /^°C$/, /^USB/, /^eSIM$/, /^APN$/, /^DNS/, /^DHCP$/, /^VPN$/, /^WireGuard/, /^HTTPS?$/, /^TLS$/, /^IPv[46]$/,
  /^MAC$/, /^IP$/, /^TTL$/, /^QoS$/, /^DMZ$/, /^UPnP$/, /^NAT$/, /^MTU$/, /^ICCID$/, /^EID$/, /^IMSI$/, /^IMEI$/, /^PLMN$/,
  /^RSRP$/, /^RSRQ$/, /^SINR$/, /^RSSI$/, /^PCI$/, /^EARFCN$/, /^NR-ARFCN$/, /^AT$/, /^AT\+/, /^SIM$/, /^USSD$/, /^STK$/,
  /^Beta$/, /^Agent$/, /^Stable$/, /^sha/i, /^[0-9a-f]{6,}$/i, /^v?\d[\d.:/ -]*$/,
  /^sdr\d/, /^mmw\d/, /^epm\d/, /^cpuss-?\d/, /^aoss-?\d/, /^mdm/, /^wcn/, /^ipa/, /^q6/, /^adsp/, /^cdsp/, /^npu/,
  /^wlan\d$/, /^eth\d$/, /^rmnet/, /^sit\d$/, /^lo$/, /^br-/, /^br\d/,
];
function isEnglishLeftover(line) {
  if (!/[A-Za-z]/.test(line)) return false;
  if (/[\u4e00-\u9fff]/.test(line)) return false;           // mixed Chinese+English sentences are fine
  const text = line.trim();
  if (!text) return false;
  if (ALLOW.some((re) => re.test(text))) return false;
  // Ignore pure identifiers like WG-u60, IPv4-address, IMEI digits, domains, paths.
  if (!/\s/.test(text)) return false;
  return true;
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 }, locale: 'zh-CN' });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto(`${base}/console/`, { waitUntil: 'domcontentloaded' });
  if (await page.locator('#password').isVisible().catch(() => false)) {
    await page.fill('#password', password);
    await page.click('#login-form button[type=submit]');
  }
  await page.waitForFunction(() => globalThis.OpenU60Console?.connected === true, null, { timeout: 30000 });
  await page.waitForTimeout(1200);

  const report = {};
  for (const route of ROUTES) {
    await page.evaluate((value) => globalThis.OpenU60Navigation.go(value), route);
    await page.waitForFunction((value) => document.documentElement.dataset.route === value, route, { timeout: 15000 });
    await page.waitForTimeout(900);
    const text = await page.$eval('#main', (node) => node.innerText);
    const lines = [...new Set(text.split('\n').map((line) => line.trim()).filter(isEnglishLeftover))];
    if (lines.length) report[route] = lines.slice(0, 25);
  }
  fs.writeFileSync('C:\\Users\\Administrator\\Downloads\\u60qa\\shots\\english-leftovers.json', JSON.stringify({ report, pageErrors }, null, 2), 'utf8');
  console.log(JSON.stringify(report, null, 2));
  console.log('pageErrors:', pageErrors.length ? pageErrors : 'none');
  await browser.close();
})().catch((error) => {
  console.error('SCAN FAILED:', error);
  process.exitCode = 1;
});
