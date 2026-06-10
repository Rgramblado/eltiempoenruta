/**
 * Build a GPX 1.1 document from the calculated route:
 * waypoints as <wpt> and the full geometry as a <trk>.
 */
export function buildGpx(routeData) {
  const { waypoints = [], geometry = [], departureTime } = routeData;
  const name = gpxName(waypoints);
  const time = departureTime ? new Date(departureTime).toISOString() : new Date().toISOString();

  const wptXml = waypoints.map((waypoint, i) => {
    const label = i === 0 ? 'Salida' : i === waypoints.length - 1 ? 'Llegada' : `Parada ${i}`;
    const description = escapeXml(shortLabel(waypoint.label));
    return `  <wpt lat="${fixed(waypoint.lat)}" lon="${fixed(waypoint.lng)}">
    <name>${label}${description ? `: ${description}` : ''}</name>
  </wpt>`;
  }).join('\n');

  const trkptXml = geometry.map(point => `      <trkpt lat="${fixed(point.lat)}" lon="${fixed(point.lng)}"/>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="El Tiempo en Ruta" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escapeXml(name)}</name>
    <time>${time}</time>
  </metadata>
${wptXml}
  <trk>
    <name>${escapeXml(name)}</name>
    <trkseg>
${trkptXml}
    </trkseg>
  </trk>
</gpx>
`;
}

export function downloadGpx(routeData) {
  const xml = buildGpx(routeData);
  const blob = new Blob([xml], { type: 'application/gpx+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${slugify(gpxName(routeData.waypoints || []))}.gpx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function gpxName(waypoints) {
  const origin = shortLabel(waypoints[0]?.label);
  const destination = shortLabel(waypoints[waypoints.length - 1]?.label);
  if (origin && destination) return `${origin} - ${destination}`;
  return 'Ruta El Tiempo en Ruta';
}

function shortLabel(label) {
  return String(label || '').split(',')[0].trim();
}

function fixed(value) {
  return Number(value).toFixed(6);
}

function escapeXml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'ruta';
}
