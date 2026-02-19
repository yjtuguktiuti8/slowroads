const canvas = document.getElementById('world');
const ctx = canvas.getContext('2d');
const themePicker = document.getElementById('themePicker');

const state = {
  speed: 4,
  steer: 0,
  heading: 0,
  cameraX: 0,
  distance: 0,
  keys: new Set(),
  time: 0,
  theme: 'day'
};

const palettes = {
  day: {
    skyTop: '#7bb6ff',
    skyBottom: '#d0ebff',
    ground: '#6aa25f',
    road: '#34363d',
    lane: '#fff9c1',
    hills: '#6d8f7c'
  },
  sunset: {
    skyTop: '#5f5de4',
    skyBottom: '#ff9966',
    ground: '#597245',
    road: '#2d2a34',
    lane: '#ffe9a8',
    hills: '#7c5e61'
  },
  night: {
    skyTop: '#070b1f',
    skyBottom: '#1a284e',
    ground: '#1f3b2f',
    road: '#262a33',
    lane: '#c9d6e8',
    hills: '#2a3659'
  }
};

const resize = () => {
  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height = window.innerHeight * devicePixelRatio;
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
};

window.addEventListener('resize', resize);
resize();

document.addEventListener('keydown', (event) => state.keys.add(event.key.toLowerCase()));
document.addEventListener('keyup', (event) => state.keys.delete(event.key.toLowerCase()));

themePicker.addEventListener('change', () => {
  state.theme = themePicker.value;
});

const horizon = () => window.innerHeight * 0.42;

function update(dt) {
  if (state.keys.has('w')) state.speed = Math.min(8, state.speed + dt * 4);
  if (state.keys.has('s')) state.speed = Math.max(1.5, state.speed - dt * 4);

  const steerInput = (state.keys.has('a') ? -1 : 0) + (state.keys.has('d') ? 1 : 0);
  state.steer += (steerInput - state.steer) * Math.min(1, dt * 8);
  state.heading += state.steer * dt * 0.9;

  state.distance += state.speed * dt * 60;
  state.cameraX += Math.sin(state.heading) * state.speed * dt * 26;
  state.time += dt;
}

function drawSky(theme) {
  const grad = ctx.createLinearGradient(0, 0, 0, window.innerHeight);
  grad.addColorStop(0, theme.skyTop);
  grad.addColorStop(1, theme.skyBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

  ctx.fillStyle = theme.hills;
  const baseY = horizon() + 45;
  for (let i = -1; i < 8; i++) {
    const x = ((i * 240 - state.cameraX * 0.2) % (window.innerWidth + 240)) - 120;
    const h = 80 + Math.sin(i * 1.3 + state.time * 0.15) * 22;
    ctx.beginPath();
    ctx.moveTo(x - 140, baseY + 80);
    ctx.quadraticCurveTo(x, baseY - h, x + 140, baseY + 80);
    ctx.fill();
  }
}

function drawRoad(theme) {
  const y0 = horizon();

  for (let i = 1; i <= 150; i++) {
    const z = i / 150;
    const perspective = z * z;
    const roadW = 80 + perspective * (window.innerWidth * 1.1);
    const y = y0 + perspective * (window.innerHeight - y0);

    const curve = Math.sin((state.distance * 0.004 + i * 0.05) + state.heading * 2.5) * 140;
    const x = window.innerWidth / 2 + curve - state.cameraX * (1 - z) * 0.18;

    const nextZ = (i + 1) / 150;
    const nextP = nextZ * nextZ;
    const nextY = y0 + nextP * (window.innerHeight - y0);
    const nextW = 80 + nextP * (window.innerWidth * 1.1);

    ctx.fillStyle = theme.road;
    ctx.beginPath();
    ctx.moveTo(x - roadW / 2, y);
    ctx.lineTo(x + roadW / 2, y);
    ctx.lineTo(x + nextW / 2, nextY + 2);
    ctx.lineTo(x - nextW / 2, nextY + 2);
    ctx.closePath();
    ctx.fill();

    if ((i + Math.floor(state.distance / 18)) % 16 < 8) {
      ctx.strokeStyle = theme.lane;
      ctx.lineWidth = Math.max(1, 5 * perspective);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, nextY + 1);
      ctx.stroke();
    }

    ctx.fillStyle = palettes[state.theme].ground;
    ctx.fillRect(0, y, x - roadW / 2, nextY - y + 3);
    ctx.fillRect(x + roadW / 2, y, window.innerWidth - (x + roadW / 2), nextY - y + 3);
  }
}

function render() {
  const theme = palettes[state.theme];
  drawSky(theme);
  drawRoad(theme);

  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = '600 14px Inter';
  ctx.fillText(`Speed ${Math.round(state.speed * 18)} km/h`, 18, window.innerHeight - 18);
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.032, (now - last) / 1000);
  last = now;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
