/**
 * Detect short Google Maps URLs that need server-side expansion
 */
export function isShortUrl(url) {
  return /maps\.app\.goo\.gl|goo\.gl\/maps|maps\.google\.[a-z.]+\/\?/.test(url);
}

/**
 * Expand a short URL using the Node API (follows redirects server-side)
 */
export async function expandShortUrl(url) {
  const res = await fetch(`/api/expand?url=${encodeURIComponent(url)}`);
  if (!res.ok) throw new Error('No pude expandir el enlace corto. Pega la URL larga del navegador.');
  const data = await res.json();
  if (data.error || !data.url) throw new Error('No pude expandir el enlace corto. Pega la URL larga del navegador.');
  return data.url;
}

/**
 * Parses Google Maps URLs to extract waypoints
 * Handles formats:
 *  - /maps/dir/Origin/Destination
 *  - /maps/dir/?api=1&origin=...&destination=...&waypoints=...
 *  - /maps/@lat,lng,zoom (just a view, not a route)
 *  - maps.app.goo.gl short links (can't decode without redirect, user must expand)
 */

export function parseGoogleMapsUrl(url) {
  try {
    const u = new URL(url);

    // Format 1: /maps/dir/Place1/Place2/.../PlaceN
    const dirMatch = u.pathname.match(/\/maps\/dir\/(.+)/);
    if (dirMatch) {
      const parts = dirMatch[1].split('/').filter(Boolean);

      // Extract embedded coords from data= param for named waypoints
      // Google encodes them as !2d<lng>!2d<lat> or !1d<lng>!2d<lat> blocks
      const embeddedCoords = extractEmbeddedCoords(url); // data= is in pathname for google maps

      // Google appends technical path segments after the route points.
      // Once one appears, everything after it is metadata, not a waypoint.
      const cleanParts = [];
      for (const part of parts) {
        if (isGoogleMapsMetadataSegment(part)) break;
        cleanParts.push(part);
      }

      let namedIdx = 0;
      return cleanParts.map(part => {
        const coordMatch = part.match(/^(-?\d+\.?\d*),(-?\d+\.?\d*)$/);
        if (coordMatch) {
          return { type: 'coords', lat: parseFloat(coordMatch[1]), lng: parseFloat(coordMatch[2]), label: part };
        }
        // Named place — try to use embedded coords from data= first (avoids geocoding)
        const name = decodeURIComponent(part.replace(/\+/g, ' '));
        const embedded = embeddedCoords[namedIdx++];
        if (embedded) {
          return { type: 'coords', lat: embedded.lat, lng: embedded.lng, label: name };
        }
        return { type: 'place', name, label: name };
      });
    }

    // Format 2: query params ?origin=...&destination=...&waypoints=...
    const origin = u.searchParams.get('origin');
    const destination = u.searchParams.get('destination');
    const waypoints = u.searchParams.get('waypoints');

    if (origin && destination) {
      const points = [origin];
      if (waypoints) points.push(...waypoints.split('|'));
      points.push(destination);
      return points.map(p => {
        const coordMatch = p.match(/^(-?\d+\.?\d*),(-?\d+\.?\d*)$/);
        if (coordMatch) {
          return { type: 'coords', lat: parseFloat(coordMatch[1]), lng: parseFloat(coordMatch[2]), label: p };
        }
        return { type: 'place', name: p, label: p };
      });
    }

    throw new Error('Formato de URL no reconocido. Asegúrate de copiar una URL de ruta (Google Maps > Cómo llegar).');
  } catch (e) {
    if (e.message.includes('Invalid URL')) {
      throw new Error('URL no válida.');
    }
    throw e;
  }
}

/**
 * Extract embedded lat/lng pairs from Google Maps data= parameter.
 * Google encodes named waypoint coords as pairs of !2d<lng>!2d<lat> (or !1d lng !2d lat).
 * We scan for consecutive coord-like pairs.
 */
function extractEmbeddedCoords(dataStr) {
  // Google Maps uses different token formats depending on URL type:
  //   !1d/!2d  — older format (dir with named waypoints, data= in pathname)
  //   !3d/!4d  — newer format (!3d=lat, !4d=lng, explicit order)
  // Try !3d/!4d first (explicit lat/lng), then fall back to !1d/!2d pairs

  // Format A: !3d<lat>!4d<lng> — explicit, reliable
  const explicit = [...dataStr.matchAll(/!3d(-?[\d.]+).*?!4d(-?[\d.]+)/g)].map(m => ({
    lat: parseFloat(m[1]),
    lng: parseFloat(m[2]),
  }));
  if (explicit.length) return explicit;

  // Format B: !1d/!2d consecutive pairs
  const tokens = [...dataStr.matchAll(/![12]d(-?[\d.]+)/g)].map(m => parseFloat(m[1]));
  const pairs = [];
  for (let i = 0; i < tokens.length - 1; i += 2) {
    const a = tokens[i], b = tokens[i + 1];
    if (Math.abs(a) <= 180 && Math.abs(b) <= 90) {
      pairs.push({ lng: a, lat: b });
    } else if (Math.abs(a) <= 90 && Math.abs(b) <= 180) {
      pairs.push({ lat: a, lng: b });
    }
  }
  return pairs;
}

/**
 * Geocode a place name using Nominatim (OSM, free, no key)
 * Tries progressively simpler versions if full name fails
 */
export async function geocodePlace(name) {
  const queries = buildGeoQueries(name);

  for (const q of queries) {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'es', 'User-Agent': 'ElTiempoEnRuta/1.0' } }
    );
    const data = await res.json();
    if (data.length) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), label: data[0].display_name };
    }
  }

  throw new Error(`No encontré "${name}". Intenta con una dirección más específica.`);
}

/**
 * Build progressively simpler search queries from a messy Google Maps place name.
 * e.g. "Hotel Tharsis Cazorla, C. de Hilario Marco, 53, 23470 Cazorla, Jaén, España"
 *   → tries full name, then "Hotel Tharsis Cazorla, Cazorla, Jaén", then "Cazorla, Jaén", then "Cazorla"
 */
function buildGeoQueries(name) {
  const queries = [name];
  const parts = name.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length <= 1) return queries;

  // Remove postal codes and country names, keep meaningful parts
  const meaningful = parts.filter(p =>
    !/^\d{4,5}$/.test(p) &&
    !/^(España|France|Portugal|Germany|Italy|Maroc|Marruecos|Andorra)$/i.test(p)
  );

  if (meaningful.length >= 3) {
    // first part (POI name) + last 2 (city, province)
    queries.push([meaningful[0], ...meaningful.slice(-2)].join(', '));
  }
  if (meaningful.length >= 2) {
    // Just last 2: "City, Province"
    queries.push(meaningful.slice(-2).join(', '));
  }
  // Just the last meaningful part
  if (meaningful.length >= 1) {
    queries.push(meaningful[meaningful.length - 1]);
  }

  return [...new Set(queries)];
}

/**
 * Resolve all waypoints to lat/lng
 */
export async function resolveWaypoints(parsed) {
  const resolved = [];
  for (const p of parsed) {
    if (p.type === 'coords') {
      resolved.push({ lat: p.lat, lng: p.lng, label: p.label });
    } else {
      const geo = await geocodePlace(p.name);
      resolved.push({ ...geo, label: p.label });
    }
  }
  return resolved;
}

export async function getRoutesFromGoogle(waypoints, routeModifiers = {}, computeAlternativeRoutes = true) {
  const res = await fetch('/api/route', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ waypoints, routeModifiers, computeAlternativeRoutes }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Google Routes no pudo calcular la ruta.');

  return (data.routes || []).map((route, index) => {
    const geometry = decodePolyline(route.polyline?.encodedPolyline || '');
    const legDistances = (route.legs || []).map(leg => leg.distanceMeters || 0);
    const legDurations = (route.legs || []).map(leg => durationToSeconds(leg.duration || leg.staticDuration || '0s'));
    const durationS = durationToSeconds(route.duration || route.staticDuration || '0s');
    return {
      id: `google-${index}`,
      provider: 'google',
      geometry,
      distanceM: route.distanceMeters || 0,
      durationS,
      staticDurationS: durationToSeconds(route.staticDuration || route.duration || '0s'),
      legDistances,
      legDurations,
      description: route.description || '',
      warnings: route.warnings || [],
      routeLabels: route.routeLabels || [],
    };
  }).filter(route => route.geometry.length > 1);
}

function durationToSeconds(duration) {
  const match = String(duration).match(/^([\d.]+)s$/);
  return match ? Number(match[1]) : 0;
}

function decodePolyline(encoded) {
  let index = 0;
  let lat = 0;
  let lng = 0;
  const coordinates = [];

  while (index < encoded.length) {
    const latChange = decodePolylineValue(encoded, index);
    index = latChange.nextIndex;
    lat += latChange.value;

    const lngChange = decodePolylineValue(encoded, index);
    index = lngChange.nextIndex;
    lng += lngChange.value;

    coordinates.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return coordinates;
}

function decodePolylineValue(encoded, startIndex) {
  let result = 0;
  let shift = 0;
  let index = startIndex;
  let byte;

  do {
    byte = encoded.charCodeAt(index++) - 63;
    result |= (byte & 0x1f) << shift;
    shift += 5;
  } while (byte >= 0x20);

  return {
    value: (result & 1) ? ~(result >> 1) : (result >> 1),
    nextIndex: index,
  };
}

/**
 * Sample points along the geometry at regular distance intervals
 * Returns array of {lat, lng, distanceFromStart}
 */
export function sampleRoutePoints(geometry, distanceM, intervalKm = 20) {
  const intervalM = intervalKm * 1000;
  const totalPoints = geometry.length;
  const samples = [];

  // Calculate cumulative distance for each geometry point
  let cumDist = 0;
  const cumDistances = [0];
  for (let i = 1; i < totalPoints; i++) {
    cumDist += haversineM(geometry[i - 1], geometry[i]);
    cumDistances.push(cumDist);
  }

  // Sample at regular intervals
  let nextTarget = 0;
  for (let i = 0; i < totalPoints; i++) {
    if (cumDistances[i] >= nextTarget) {
      samples.push({ ...geometry[i], distanceFromStart: cumDistances[i] });
      nextTarget += intervalM;
    }
  }

  // Always include last point
  const last = geometry[totalPoints - 1];
  if (!samples.length || samples[samples.length - 1].distanceFromStart < cumDistances[totalPoints - 1] - 100) {
    samples.push({ ...last, distanceFromStart: cumDistances[totalPoints - 1] });
  }

  return samples;
}

function haversineM(a, b) {
  const R = 6371000;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const sa = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(sa), Math.sqrt(1 - sa));
}

function isGoogleMapsMetadataSegment(part) {
  const decoded = decodeURIComponent(part).trim();
  return (
    decoded === 'data' ||
    decoded.startsWith('data=') ||
    decoded.startsWith('am=') ||
    decoded.startsWith('@') ||
    decoded.startsWith('!') ||
    /^[A-Za-z]+=/.test(decoded)
  );
}
