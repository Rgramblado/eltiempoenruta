export async function expandMapsUrl(url) {
  if (!url) {
    const error = new Error('Falta el parámetro url.');
    error.statusCode = 400;
    throw error;
  }

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
      continue;
    }

    if (response.status === 200) {
      const text = await response.text();
      const match = text.match(/https:\/\/www\.google\.[a-z.]+\/maps\/dir\/[^"'\\\s]+/);
      if (match) finalUrl = match[0];
    }
    break;
  }

  let cleanUrl = decodeURIComponent(finalUrl);
  const continueMatch = cleanUrl.match(/[?&]continue=([^&]+)/);
  if (continueMatch && cleanUrl.includes('/sorry/')) {
    cleanUrl = decodeURIComponent(continueMatch[1]);
  }

  const dirMatch = cleanUrl.match(/(https:\/\/www\.google\.[a-z.]+\/maps\/dir\/.*)/);
  if (dirMatch) cleanUrl = dirMatch[1];

  return cleanUrl;
}
