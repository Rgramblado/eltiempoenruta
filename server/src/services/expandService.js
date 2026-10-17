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
      const matches = [
        ...text.matchAll(/https:\/\/www\.google\.[a-z.]+\/maps\/dir\/[^"'\\\s<>]+/g),
      ].map(match => match[0]);
      const bestMatch = chooseBestMapsDirUrl(matches);
      if (bestMatch) finalUrl = bestMatch;
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

function chooseBestMapsDirUrl(matches) {
  if (!matches.length) return null;

  return matches
    .map(url => ({ url, score: scoreMapsDirUrl(url) }))
    .sort((a, b) => b.score - a.score || b.url.length - a.url.length)[0].url;
}

function scoreMapsDirUrl(url) {
  let score = url.length;
  const decoded = decodeURIComponent(url);

  if (decoded.includes('/data=')) score += 1000;
  score += (decoded.match(/!3d-?[\d.]+/g) || []).length * 500;
  score += (decoded.match(/!4d-?[\d.]+/g) || []).length * 500;
  score += (decoded.match(/!1s/g) || []).length * 100;

  return score;
}
