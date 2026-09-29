const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

let browserInstance = null;

async function getBrowser() {
  if (browserInstance && browserInstance.isConnected()) return browserInstance;
  browserInstance = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--single-process',
      '--no-zygote'
    ]
  });
  return browserInstance;
}

app.post('/api/grab', async (req, res) => {
  const { url, waitJs = true } = req.body || {};
  if (!url) return res.status(400).json({ error: 'URL wajib diisi' });

  let target;
  try {
    target = new URL(url.startsWith('http') ? url : 'https://' + url);
  } catch {
    return res.status(400).json({ error: 'URL tidak valid' });
  }

  let page = null;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    await page.setViewport({ width: 1920, height: 1080 });

    await page.goto(target.href, {
      waitUntil: waitJs ? 'networkidle2' : 'domcontentloaded',
      timeout: 30000
    });

    if (waitJs) await new Promise(r => setTimeout(r, 1500));

    const html = await page.content();
    const title = await page.title();

    res.json({ success: true, html, title, size: html.length });
  } catch (err) {
    res.status(500).json({ error: 'Gagal grab: ' + err.message });
  } finally {
    if (page) await page.close().catch(() => {});
  }
});

app.get('/ping', (req, res) => res.json({ status: 'awake', time: Date.now() }));
app.get('/', (req, res) => res.json({ status: 'ok', message: 'HTML Grabber Backend' }));

const PORT = process.env.PORT || 8000;
app.listen(PORT, '0.0.0.0', () => console.log('🚀 Server jalan di port ' + PORT));
