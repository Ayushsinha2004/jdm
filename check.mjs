import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const errors = []
page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })

// Navigate and wait for network to settle (Baserow fetches multiple pages)
await page.goto('http://localhost:5175/', { waitUntil: 'networkidle', timeout: 45000 });

// Extra wait for slow Baserow pagination
await page.waitForTimeout(3000);
await page.screenshot({ path: 'screenshot_live.png', fullPage: true });

const bodyText = await page.evaluate(() => document.body.innerText);
console.log('=== PAGE TEXT (first 1200 chars) ===');
console.log(bodyText.slice(0, 1200));

console.log('\n=== CONSOLE ERRORS ===');
errors.forEach(e => console.log(e));

const err    = await page.locator('.error-screen').isVisible().catch(() => false);
const loading = await page.locator('.live-kpi-loading').isVisible().catch(() => false);
const kpiErr  = await page.locator('.live-kpi-error').isVisible().catch(() => false);
const cards   = await page.locator('.live-card').count().catch(() => 0);
const chart   = await page.locator('.value-chart').isVisible().catch(() => false);

console.log('\n=== STATE ===');
console.log('error-screen:', err, '| live-kpi-loading:', loading, '| kpi-error:', kpiErr);
console.log('live-card count:', cards, '| value-chart:', chart);

await browser.close();
