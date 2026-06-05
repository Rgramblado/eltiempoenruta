// Vercel serverless function: expands a short Google Maps URL by following redirects
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing url parameter' });

  try {
    // Follow redirects manually to capture the final URL
    let currentUrl = url;
    let finalUrl = url;
    const maxRedirects = 10;

    for (let i = 0; i < maxRedirects; i++) {
      const response = await fetch(currentUrl, {
        method: 'GET',
        redirect: 'manual',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ElTiempoEnRuta/1.0)',
        },
      });

      const location = response.headers.get('location');
      if (response.status >= 300 && response.status < 400 && location) {
        finalUrl = location;
        currentUrl = location;
      } else {
        // No more redirects — try to read the body for a consent/meta redirect
        if (response.status === 200) {
          const text = await response.text();
          // Google sometimes embeds the real URL in the page
          const match = text.match(/https:\/\/www\.google\.[a-z.]+\/maps\/dir\/[^"'\\\s]+/);
          if (match) finalUrl = match[0];
        }
        break;
      }
    }

    // Google may bounce through a /sorry/ anti-bot or consent page;
    // the real destination is in the continue= param
    let cleanUrl = decodeURIComponent(finalUrl);
    const continueMatch = cleanUrl.match(/[?&]continue=([^&]+)/);
    if (continueMatch && cleanUrl.includes('/sorry/')) {
      cleanUrl = decodeURIComponent(continueMatch[1]);
    }
    // Strip any trailing consent params after the maps path if a clean dir path exists
    const dirMatch = cleanUrl.match(/(https:\/\/www\.google\.[a-z.]+\/maps\/dir\/.*)/);
    if (dirMatch) cleanUrl = dirMatch[1];

    return res.status(200).json({ url: cleanUrl });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
