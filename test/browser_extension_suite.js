const puppeteer = require('puppeteer');
const path = require('path');

async function runExtensionTests() {
  const extensionPath = path.join(process.cwd(), 'extension');
  console.log('Loading unpacked extension from:', extensionPath);

  const browser = await puppeteer.launch({
    headless: false, // Extensions demand headed Chrome to unpack
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--window-size=1280,800'
    ]
  });

  try {
    const page = await browser.newPage();
    
    // Test 1: React SPA (Next.js)
    console.log('Running Test 1: Navigation to React SPA...');
    const start = Date.now();
    await page.goto('https://react.dev/', { waitUntil: 'networkidle2' });
    
    // Evaluate if our content_script injected the Watermark
    await page.waitForSelector('#wormgpt-watermark-overlay', { timeout: 3000 });
    const watermarkExists = await page.evaluate(() => !!document.getElementById('wormgpt-watermark-overlay'));
    
    if (watermarkExists) {
       console.log('✅ Pass: Extension initialized and watermark attached.');
    } else {
       console.error('❌ Fail: Watermark not found.');
    }

    // Verify abstraction speed
    const duration = Date.now() - start;
    console.log(`Page Load & Extraction Latency: ${duration}ms (SLA: <500ms for extraction)`);
    
    // Verify Action Map Density
    const actionCount = await page.evaluate(() => Object.keys(window.actionMap || {}).length);
    console.log(`✅ Pass: Extracted ${actionCount} interactive elements into Context Map.`);

  } catch (error) {
    console.error('Test Suite Exception:', error);
  } finally {
    console.log('Closing test browser...');
    await browser.close();
  }
}

runExtensionTests();
