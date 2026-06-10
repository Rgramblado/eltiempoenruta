/**
 * Encode/decode route state to/from URL params.
 * Keeps the URL razonablemente corta usando base64 para la URL de Maps (que puede ser larga).
 *
 * Params:
 *   r  = base64url(maps url)
 *   d  = departure ISO string (e.g. "2026-06-05T09:00")
 *   m  = speed multiplier * 100 as int (e.g. 100 = 1.0, 115 = 1.15)
 *   s  = stops encoded as "wpIdx:min,wpIdx:min" (e.g. "2:30,4:45")
 *   o  = route options bitmask: highways,tolls,ferries (1 = avoid)
 */

export function encodeShareUrl(mapsUrl, departureTime, speedMultiplier, stops, routeOptions = {}) {
  const params = new URLSearchParams();
  params.set('r', btoa(mapsUrl).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''));
  params.set('d', departureTime);
  params.set('m', Math.round((speedMultiplier || 1.0) * 100));
  params.set('o', [
    routeOptions.avoidHighways ? 1 : 0,
    routeOptions.avoidTolls ? 1 : 0,
    routeOptions.avoidFerries ? 1 : 0,
  ].join(''));
  if (stops && stops.length > 0) {
    params.set('s', stops.map(s => `${s.waypointIndex}:${s.durationMin}`).join(','));
  }
  return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
}

export function decodeShareUrl() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('r')) return null;

  try {
    const b64 = params.get('r').replace(/-/g, '+').replace(/_/g, '/');
    const mapsUrl = atob(b64);
    const departureTime = params.get('d') || new Date().toISOString().slice(0, 16);
    const speedMultiplier = (parseInt(params.get('m') || '100')) / 100;
    const optionsRaw = params.get('o') || '111';
    const routeOptions = {
      avoidHighways: optionsRaw[0] !== '0',
      avoidTolls: optionsRaw[1] !== '0',
      avoidFerries: optionsRaw[2] !== '0',
    };
    const stopsRaw = params.get('s') || '';
    const stops = stopsRaw
      ? stopsRaw.split(',').map((chunk, i) => {
          const [wpIdx, min] = chunk.split(':').map(Number);
          return { waypointIndex: wpIdx, durationMin: min, id: String(i) };
        })
      : [];
    return { mapsUrl, departureTime, speedMultiplier, routeOptions, stops };
  } catch (e) {
    console.warn('Failed to decode share URL', e);
    return null;
  }
}

export function clearShareUrl() {
  const url = `${window.location.origin}${window.location.pathname}`;
  window.history.replaceState({}, '', url);
}
