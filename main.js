const canvas = document.getElementById('world');
const ctx = canvas.getContext('2d');
const themePicker = document.getElementById('themePicker');
const vehiclePicker = document.getElementById('vehiclePicker');
const viewPicker = document.getElementById('viewPicker');
const controlHints = document.getElementById('controlHints');

const vehicles = {
  car: {
    label: 'Car',
    controls: 'Car controls: W/S accelerate-brake, A/D steer',
    accelerate: 'w',
    brake: 's',
    left: 'a',
    right: 'd',
    maxSpeed: 9,
    minSpeed: 1,
    accelRate: 4.4,
    steerRate: 9,
    grip: 1,
    sprite: 'car'
  },
  horse: {
    label: 'Horse',
    controls: 'Horse controls: I/K gallop-slow, J/L reins',
    accelerate: 'i',
    brake: 'k',
    left: 'j',
    right: 'l',
    maxSpeed: 6,
    minSpeed: 0.8,
    accelRate: 3,
    steerRate: 6,
    grip: 0.7,
    sprite: 'horse'
  },
  bike: {
    label: 'Bike',
    controls: 'Bike controls: Arrow Up/Down pedal-brake, Arrow Left/Right steer',
    accelerate: 'arrowup',
    brake: 'arrowdown',
    left: 'arrowleft',
    right: 'arrowright',
    maxSpeed: 7.2,
    minSpeed: 1,
    accelRate: 3.7,
    steerRate: 10,
    grip: 1.25,
    sprite: 'bike'
  }
};

const state = {
  speed: 3,
  steer: 0,
  heading: 0,
  cameraX: 0,
  distance: 0,
  keys: new Set(),
  time: 0,
  theme: 'day',
  vehicle: 'car',
  view: 'fpv'
};

const palettes = {
  day: { skyTop: '#7bb6ff', skyBottom: '#d0ebff', ground: '#6aa25f', road: '#34363d', lane: '#fff9c1', hills: '#6d8f7c' },
  sunset: { skyTop: '#5f5de4', skyBottom: '#ff9966', ground: '#597245', road: '#2d2a34', lane: '#ffe9a8', hills: '#7c5e61' },
  night: { skyTop: '#070b1f', skyBottom: '#1a284e', ground: '#1f3b2f', road: '#262a33', lane: '#c9d6e8', hills: '#2a3659' }
};

const resize = () => {
  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height = window.innerHeight * devicePixelRatio;
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
};

const activeVehicle = () => vehicles[state.vehicle];
const horizon = () => (state.view === 'top' ? window.innerHeight * 0.1 : window.innerHeight * 0.42);

function updateControlHints() {
  controlHints.textContent = `${activeVehicle().controls} • Camera: ${state.view}`;
}

window.addEventListener('resize', resize);
resize();

const normalizeKey = (event) => event.key.length === 1 ? event.key.toLowerCase() : event.key.toLowerCase();

document.addEventListener('keydown', (event) => state.keys.add(normalizeKey(event)));
document.addEventListener('keyup', (event) => state.keys.delete(normalizeKey(event)));

themePicker.addEventListener('change', () => {
  state.theme = themePicker.value;
});

vehiclePicker.addEventListener('change', () => {
  state.vehicle = vehiclePicker.value;
  state.speed = Math.min(state.speed, activeVehicle().maxSpeed);
  updateControlHints();
});

viewPicker.addEventListener('change', () => {
  state.view = viewPicker.value;
  updateControlHints();
});

updateControlHints();

function update(dt) {
  const vehicle = activeVehicle();
  if (state.keys.has(vehicle.accelerate)) state.speed = Math.min(vehicle.maxSpeed, state.speed + dt * vehicle.accelRate);
  if (state.keys.has(vehicle.brake)) state.speed = Math.max(vehicle.minSpeed, state.speed - dt * vehicle.accelRate);

  const steerInput = (state.keys.has(vehicle.left) ? -1 : 0) + (state.keys.has(vehicle.right) ? 1 : 0);
  state.steer += (steerInput - state.steer) * Math.min(1, dt * vehicle.steerRate);

  const steerMultiplier = state.view === 'top' ? 0.35 : 0.9;
  state.heading += state.steer * dt * steerMultiplier * vehicle.grip;

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
  for (let i = -1; i < 9; i++) {
    const x = ((i * 220 - state.cameraX * 0.2) % (window.innerWidth + 220)) - 110;
    const h = 80 + Math.sin(i * 1.3 + state.time * 0.15) * 22;
    ctx.beginPath();
    ctx.moveTo(x - 130, baseY + 80);
    ctx.quadraticCurveTo(x, baseY - h, x + 130, baseY + 80);
    ctx.fill();
  }
}

function roadCurveAt(i) {
  return Math.sin((state.distance * 0.004 + i * 0.05) + state.heading * 2.5) * 140;
}

function drawRoadPerspective(theme) {
  const y0 = horizon();

  for (let i = 1; i <= 150; i++) {
    const z = i / 150;
    const perspective = z * z;
    const roadW = 80 + perspective * (window.innerWidth * 1.1);
    const y = y0 + perspective * (window.innerHeight - y0);

    const curve = roadCurveAt(i);
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

function drawTopDownRoad(theme) {
  const laneCount = 120;
  const centerX = window.innerWidth / 2;
  const baseY = window.innerHeight * 0.06;
  const segment = (window.innerHeight * 0.92) / laneCount;

  for (let i = 0; i < laneCount; i++) {
    const y = baseY + i * segment;
    const width = window.innerWidth * 0.52;
    const sway = roadCurveAt(i + 5) * 0.7;
    const x = centerX + sway;

    ctx.fillStyle = theme.road;
    ctx.fillRect(x - width / 2, y, width, segment + 1);

    if ((i + Math.floor(state.distance / 14)) % 12 < 6) {
      ctx.strokeStyle = theme.lane;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y + 2);
      ctx.lineTo(x, y + segment - 2);
      ctx.stroke();
    }

    ctx.fillStyle = palettes[state.theme].ground;
    ctx.fillRect(0, y, x - width / 2, segment + 1);
    ctx.fillRect(x + width / 2, y, window.innerWidth - (x + width / 2), segment + 1);
  }
}

function drawVehicle() {
  if (state.view === 'fpv') return;

  const vehicle = activeVehicle();
  const x = window.innerWidth / 2;
  const y = state.view === 'top' ? window.innerHeight * 0.8 : window.innerHeight * 0.83;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(state.steer * 0.1);

  if (vehicle.sprite === 'car') {
    ctx.fillStyle = '#db3f3f';
    ctx.fillRect(-24, -40, 48, 72);
    ctx.fillStyle = '#a6d9ff';
    ctx.fillRect(-15, -25, 30, 22);
    ctx.fillStyle = '#12151d';
    ctx.fillRect(-28, -30, 6, 18);
    ctx.fillRect(22, -30, 6, 18);
    ctx.fillRect(-28, 10, 6, 18);
    ctx.fillRect(22, 10, 6, 18);
  } else if (vehicle.sprite === 'horse') {
    ctx.fillStyle = '#6a3f24';
    ctx.beginPath();
    ctx.ellipse(0, -10, 22, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-16, 10, 8, 26);
    ctx.fillRect(8, 10, 8, 26);
    ctx.fillStyle = '#3a2314';
    ctx.fillRect(-4, -42, 8, 24);
    ctx.fillStyle = '#d9c8a2';
    ctx.fillRect(-10, -18, 20, 12);
  } else {
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, -24, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 24, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#4fc3f7';
    ctx.beginPath();
    ctx.moveTo(0, -24);
    ctx.lineTo(0, 24);
    ctx.lineTo(12, 8);
    ctx.moveTo(0, -8);
    ctx.lineTo(-14, -2);
    ctx.stroke();
  }

  ctx.restore();
}

function render() {
  const theme = palettes[state.theme];
  drawSky(theme);
  if (state.view === 'top') {
    drawTopDownRoad(theme);
  } else {
    drawRoadPerspective(theme);
  }

  drawVehicle();

  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = '600 14px Inter';
  ctx.fillText(`${activeVehicle().label} • ${Math.round(state.speed * 18)} km/h • ${state.view}`, 18, window.innerHeight - 18);
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
