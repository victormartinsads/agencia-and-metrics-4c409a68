const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));

  console.log('Navigating to localhost:3000/login...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
  
  // Try to login if there is a login form
  try {
    await page.type('input[type="email"]', 'admin@admin.com'); // We probably can't login easily if we don't know the password
    await page.type('input[type="password"]', 'admin123'); 
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
  } catch (e) {
    console.log('Login failed or not needed');
  }

  console.log('Navigating to diario-do-gestor...');
  await page.goto('http://localhost:3000/diario-do-gestor', { waitUntil: 'networkidle0' });
  
  await browser.close();
})();
