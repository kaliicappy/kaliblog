const PLANET_IDS = ['mercure','venus','terre','mars','jupiter','saturne','uranus','neptune'];
const PLANET_COLORS = {
  mercure: '#b5b5b5',
  venus:   '#e8cda0',
  terre:   '#4f9de0',
  mars:    '#c1440e',
  jupiter: '#c88b3a',
  saturne: '#e4d191',
  uranus:  '#7de8e8',
  neptune: '#5b7fde',
};
 
const J2000 = 2451545.0;
 
let zoomFactor = 1.0;
let panX = 0, panY = 0;
 
function dateToJD(date) {
  return (date.getTime() / 86400000) + 2440587.5;
}
 
function keplerEquation(M, e, tol = 1e-8) {
  let E = M;
  for (let i = 0; i < 50; i++) {
    const dE = (M - E + e * Math.sin(E)) / (1 - e * Math.cos(E));
    E += dE;
    if (Math.abs(dE) < tol) break;
  }
  return E;
}
 
function orbitalPosition(body, jd) {
  const a = body.semimajorAxis / 149597870.7;
  const e = body.eccentricity;
  const n = 360 / body.sideralOrbit;
  const M0_deg = body.mainAnomaly;
  const w_deg = body.argPeriapsis;
  const omega_deg = body.longAscNode;
  const daysSinceJ2000 = jd - J2000;
  const M = ((M0_deg + n * daysSinceJ2000) % 360) * Math.PI / 180;
  const E = keplerEquation(((M % (2*Math.PI)) + 2*Math.PI) % (2*Math.PI), e);
  const nu = 2 * Math.atan2(
    Math.sqrt(1 + e) * Math.sin(E / 2),
    Math.sqrt(1 - e) * Math.cos(E / 2)
  );
  const r = a * (1 - e * Math.cos(E));
  const theta = nu + w_deg * Math.PI / 180;
  const lon = omega_deg * Math.PI / 180 + theta;
  return {
    x: r * Math.cos(lon),
    y: r * Math.sin(lon),
    r,
    name: body.englishName,
    id: body.id,
  };
}

async function fetchData() {
  const bodyMap = Object.fromEntries(
    PLANET_DATA.bodies.map(b => [b.id, b])
  );

  return PLANET_IDS
    .map(id => bodyMap[id])
    .filter(Boolean);
}

function draw(planets, positions) {
  const canvas = document.getElementById('canvas');
  const size = 900;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);
 
  const cx = size / 2 + panX;
  const cy = size / 2 + panY;
 
  const maxR = Math.max(...positions.map(p => p.r)) * 1.12;
  const baseScale = (size / 2 - 10) / maxR;
  const scale = baseScale * zoomFactor;

  // Lines + dots
  for (const pos of positions) {
    const px = cx + pos.x * scale;
    const py = cy - pos.y * scale;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(px, py);
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth = 1;
    ctx.stroke();
    const col = PLANET_COLORS[pos.id] || '#ffffff';
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(px, py, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Sun
  ctx.beginPath();
  ctx.arc(cx, cy, 2, 0, 2 * Math.PI);
  ctx.fillStyle = '#fff8e7';
  ctx.fill();
 
  // Legend (build once)
  const legend = document.getElementById('legend');
  if (!legend.children.length) {
    for (const pos of positions) {
      const item = document.createElement('div');
      item.className = 'legend-item';
      const dot = document.createElement('div');
      dot.className = 'legend-dot';
      dot.style.background = PLANET_COLORS[pos.id] || '#fff';
      const label = document.createElement('span');
      label.textContent = pos.name.toUpperCase();
      item.appendChild(dot);
      item.appendChild(label);
      legend.appendChild(item);
    }
  }
}
 
async function main() {
  const now = new Date();
  const jd = dateToJD(now);
 
  document.getElementById('date-display').textContent =
    now.toISOString().slice(0, 10).replace(/-/g, '·') + ' · JD ' + Math.floor(jd);
 
  let planets;
  try {
    planets = await fetchData();
  } catch (e) {
    document.body.insertAdjacentHTML('beforeend',
      '<p style="color:#c44;font-size:11px;margin-top:12px">Could not load data.</p>');
    return;
  }
 
  const positions = planets.map(b => orbitalPosition(b, jd));
  draw(planets, positions);
  window.addEventListener('resize', () => draw(planets, positions));
}
 
main();

