import https from 'https';

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function test() {
  const query = 'spacex latest news';
  const url = `https://api.allorigins.win/get?url=${encodeURIComponent('https://html.duckduckgo.com/html/?q=' + encodeURIComponent(query))}`;
  try {
    const raw = await fetchUrl(url);
    const json = JSON.parse(raw);
    console.log("Status:", json.status);
    const html = json.contents;
    // VERY simple regex to find a results
    const results = [];
    const regex = /<a class="result__url" href="([^"]+)".*?>([^<]+)<\/a>/g;
    let match;
    while ((match = regex.exec(html)) !== null && results.length < 3) {
      results.push({ url: match[1], title: match[2].trim() });
    }
    console.log("Parsed:", results);
  } catch (e) {
    console.error(e);
  }
}

test();
