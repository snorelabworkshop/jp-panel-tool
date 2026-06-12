// 田中電機價格爬蟲：每週由 GitHub Actions 執行，輸出 prices.json（pid → 含稅價）
import { writeFileSync } from 'node:fs';

const CATS = [
  { cbid: 1689555, max: 20 },  // 神保電器
  { cbid: 1689543, max: 60 },  // Panasonic
];
const RE = /<a href="[^"]*\?pid=(\d+)[^"]*">([^<>]{2,60})<\/a>[\s\S]{0,300}?([\d,]+)\s*円/g;
const dec = new TextDecoder('euc-jp');

const prices = {};
let count = 0;

for (const cat of CATS) {
  for (let p = 1; p <= cat.max; p++) {
    const url = `https://www.tanakamusen.com/?mode=cate&cbid=${cat.cbid}&csid=0&sort=n&page=${p}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'jp-panel-tool price updater (weekly)' } });
    if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
    const html = dec.decode(await res.arrayBuffer());
    let m, found = 0;
    RE.lastIndex = 0;
    while ((m = RE.exec(html))) {
      const name = m[2].trim();
      if (/^[!\[]/.test(name)) continue;
      const pid = m[1];
      const price = parseInt(m[3].replace(/,/g, ''), 10);
      if (Number.isFinite(price) && !(pid in prices)) { prices[pid] = price; count++; }
      found++;
    }
    if (found === 0) break; // 超過最後一頁
    await new Promise(r => setTimeout(r, 1500)); // 禮貌間隔
  }
}

// 安全檢查：抓到的商品數異常少代表網站改版，不覆寫舊資料
if (count < 800) {
  console.error(`Only ${count} products found — site layout may have changed. Aborting.`);
  process.exit(1);
}

const out = { updated: new Date().toISOString().slice(0, 10), count, prices };
writeFileSync('prices.json', JSON.stringify(out));
console.log(`OK: ${count} products → prices.json`);
