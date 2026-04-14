import https from 'https';
https.get('https://searx.ro/search?q={input}&format=json', (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => console.log(data.substring(0, 500)));
});
