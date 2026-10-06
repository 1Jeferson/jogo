import * as THREE from "three";
import { rooms, roomAt } from "./js/rooms.js";
import { cases, wallWorks } from "./js/exhibits.js";
import { bobWeasel, createWeasel } from "./js/weasel.js";

const canvas = document.getElementById("view");
const roomList = document.getElementById("roomList");
const roomName = document.getElementById("roomName");
const hint = document.getElementById("hint");
const prompt = document.getElementById("prompt");
const inspect = document.getElementById("inspect");
const inspectTitle = document.getElementById("inspectTitle");
const inspectText = document.getElementById("inspectText");
const inspectImage = document.getElementById("inspectImage");
const inspectClose = document.getElementById("inspectClose");
const eventToast = document.getElementById("eventToast");
const textures = new Map();
const loader = new THREE.TextureLoader();

function artTexture(url) {
  if (textures.has(url)) return textures.get(url);
  const map = loader.load(url, (tex) => {
    const img = tex.image;
    const max = 1024;
    if (!img || (img.width <= max && img.height <= max)) return;
    const scale = max / Math.max(img.width, img.height);
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(img.width * scale));
    c.height = Math.max(1, Math.round(img.height * scale));
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    tex.image = c;
    tex.needsUpdate = true;
  });
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 1;
  textures.set(url, map);
  return map;
}

const walls = [];
const interactives = [];
const keys = new Set();
const visited = new Set();
const questRooms = ["leste", "oeste"];
const seenArt = new Set();
const gardenDoor = {
  open: false,
  amount: 0,
  left: null,
  right: null,
  blocker: null,
  interactive: null,
  cover: null,
  slab: null,
  lights: [],
  announceUntil: 0,
};

let audioCtx = null;

function ensureAudio() {
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return null;
  if (!audioCtx) audioCtx = new Audio();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function playDoorOpenSound() {
  const ctx = ensureAudio();
  if (!ctx) return;
  const t0 = ctx.currentTime;

  const thud = ctx.createOscillator();
  const thudGain = ctx.createGain();
  thud.type = "sine";
  thud.frequency.setValueAtTime(150, t0);
  thud.frequency.exponentialRampToValueAtTime(58, t0 + 0.5);
  thudGain.gain.setValueAtTime(0.0001, t0);
  thudGain.gain.exponentialRampToValueAtTime(0.32, t0 + 0.05);
  thudGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.58);
  thud.connect(thudGain).connect(ctx.destination);
  thud.start(t0);
  thud.stop(t0 + 0.6);

  const seconds = 1.4;
  const noiseBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  const creak = ctx.createBufferSource();
  creak.buffer = noiseBuffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 8;
  filter.frequency.setValueAtTime(380, t0);
  filter.frequency.exponentialRampToValueAtTime(780, t0 + 0.55);
  filter.frequency.exponentialRampToValueAtTime(260, t0 + 1.25);
  const creakGain = ctx.createGain();
  creakGain.gain.setValueAtTime(0.0001, t0);
  creakGain.gain.exponentialRampToValueAtTime(0.24, t0 + 0.14);
  creakGain.gain.exponentialRampToValueAtTime(0.14, t0 + 0.75);
  creakGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.32);
  creak.connect(filter).connect(creakGain).connect(ctx.destination);
  creak.start(t0);
  creak.stop(t0 + seconds);

  const click = ctx.createOscillator();
  const clickGain = ctx.createGain();
  click.type = "triangle";
  click.frequency.setValueAtTime(980, t0 + 1.18);
  click.frequency.exponentialRampToValueAtTime(320, t0 + 1.32);
  clickGain.gain.setValueAtTime(0.0001, t0 + 1.18);
  clickGain.gain.exponentialRampToValueAtTime(0.14, t0 + 1.2);
  clickGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.34);
  click.connect(clickGain).connect(ctx.destination);
  click.start(t0 + 1.18);
  click.stop(t0 + 1.36);
}

function showDoorEvent() {
  eventToast.hidden = false;
  gardenDoor.announceUntil = performance.now() + 5200;
  playDoorOpenSound();
  window.clearTimeout(showDoorEvent.hideTimer);
  showDoorEvent.hideTimer = window.setTimeout(() => {
    eventToast.hidden = true;
  }, 5200);
}

let questArt = [];
let questHintCache = "";
let questHintDirty = true;

function requiredArt() {
  return questArt;
}

function invalidateQuest() {
  questHintDirty = true;
}

function questProgress() {
  const seen = questArt.filter((item) => seenArt.has(item.image)).length;
  const missingRoomNames = questRooms
    .filter((id) => !visited.has(id))
    .map((id) => rooms.find((room) => room.id === id)?.name)
    .filter(Boolean);
  return { total: questArt.length, seen, remaining: questArt.length - seen, missingRoomNames };
}

function questHint() {
  if (!questHintDirty) return questHintCache;
  const progress = questProgress();
  const parts = [];
  if (progress.missingRoomNames.length) parts.push(`visite ${progress.missingRoomNames.join(" e ")}`);
  if (progress.remaining) parts.push(`olhe todos os quadros (${progress.seen}/${progress.total})`);
  questHintCache = parts.length
    ? `Para abrir a porta: ${parts.join(" e ")}.`
    : "A porta de Luzes Internas está aberta.";
  questHintDirty = false;
  return questHintCache;
}

function questReady() {
  const progress = questProgress();
  return progress.missingRoomNames.length === 0 && progress.remaining === 0;
}

function tryOpenGardenDoor() {
  if (questReady()) openGardenDoor();
}

const player = {
  x: 0,
  z: 4,
  vx: 0,
  vz: 0,
  radius: 0.28,
};

const pixelRatio = Math.min(devicePixelRatio || 1, 1.25);
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: pixelRatio < 1.2,
  powerPreference: "high-performance",
  stencil: false,
});
renderer.setPixelRatio(pixelRatio);
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = false;
renderer.toneMapping = THREE.NoToneMapping;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87a0b8);
scene.fog = new THREE.Fog(0x87a0b8, 42, 90);

const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.1, 120);
const orbit = {
  yaw: 0,
  pitch: 0.52,
  dist: 6.1,
};
const dragging = { on: false, x: 0, y: 0 };

const girl = createWeasel({ src: "assets/girl.png", height: 1.62 });
girl.position.set(player.x, 0, player.z);
scene.add(girl);

const boy = createWeasel({ src: "assets/boy.png", height: 1.62 });
boy.position.set(0, 0, 21);
boy.visible = false;
scene.add(boy);

const matCache = new Map();
function colorMat(color, extra = {}) {
  if (extra.metalness || extra.emissive) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness: extra.roughness ?? 0.86,
      metalness: extra.metalness ?? 0.02,
      ...extra,
    });
  }
  const key = String(color);
  let mat = matCache.get(key);
  if (!mat) {
    mat = new THREE.MeshLambertMaterial({ color });
    matCache.set(key, mat);
  }
  return mat;
}

function box(w, h, d, x, y, z, material, collide = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  scene.add(mesh);
  if (collide) {
    walls.push({
      minX: x - w / 2,
      maxX: x + w / 2,
      minZ: z - d / 2,
      maxZ: z + d / 2,
    });
  }
  return mesh;
}

function floor(w, d, x, z, color) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.18, d), colorMat(color));
  mesh.position.set(x, -0.09, z);
  scene.add(mesh);
}

function ceiling(w, d, x, z, color = 0xcfc3b0) {
  if (w == null) return;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.36, d + 0.5), colorMat(color));
  mesh.position.set(x, 5.88, z);
  scene.add(mesh);
  return mesh;
}

function labelCanvas(title, subtitle) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 160;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#f7f1e4";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = "#1c1610";
  ctx.font = "700 54px Georgia";
  ctx.fillText(title, 36, 92);
  ctx.fillStyle = "#6c5c48";
  ctx.font = "italic 32px Georgia";
  ctx.fillText(subtitle, 36, 150);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function hangPhoto(work) {
  const tall = Boolean(work.tall);
  const fw = tall ? 1.55 : 2.55;
  const fh = tall ? 2.2 : 1.85;
  const pw = tall ? 1.28 : 2.2;
  const ph = tall ? 1.92 : 1.5;
  const wall = 0.45;
  const inset = wall / 2 + 0.06;
  const room = roomAt(work.x, work.z);
  const rot = work.rot || 0;
  let { x, y, z } = work;
  if (Math.abs(rot) < 0.01) x = work.x, z = room.bounds.minZ + inset;
  else if (Math.abs(Math.abs(rot) - Math.PI) < 0.01) z = room.bounds.maxZ - inset;
  else if (rot > 0) x = room.bounds.minX + inset;
  else x = room.bounds.maxX - inset;
  const group = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, 0.12), colorMat(0x6b4224));
  const photo = new THREE.Mesh(
    new THREE.PlaneGeometry(pw, ph),
    new THREE.MeshLambertMaterial({ map: artTexture(work.image) })
  );
  photo.position.z = 0.07;
  const plaque = new THREE.Mesh(
    new THREE.PlaneGeometry(1.35, 0.28),
    new THREE.MeshBasicMaterial({ map: labelCanvas(work.title, work.caption || "exposição temporária") })
  );
  plaque.position.set(0, -(fh / 2 + 0.22), 0.08);
  group.add(frame, photo, plaque);
  group.position.set(x, y, z);
  group.rotation.y = rot;
  scene.add(group);
  interactives.push({
    type: "art",
    title: work.title,
    message: work.text,
    image: work.image,
    roomId: roomAt(x, z).id,
    x,
    z,
  });
}

function displayCase(work) {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.16, 1.35), colorMat(0x4d3424));
  base.position.y = 0.08;
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.78, 1.05), colorMat(0xe8dfd0));
  plinth.position.y = 0.55;
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(1.12, 1.15, 1.12),
    new THREE.MeshBasicMaterial({
      color: 0xdbe7f0,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    })
  );
  glass.position.y = 1.42;
  const map = artTexture(work.image);
  const paper = colorMat(0x2a221c);
  const print = new THREE.MeshLambertMaterial({ map });
  const cardW = work.tall ? 0.48 : 0.72;
  const cardH = work.tall ? 0.72 : 0.5;
  const inner = new THREE.Mesh(
    new THREE.BoxGeometry(cardW, cardH, 0.04),
    [paper, paper, paper, paper, print, print.clone()]
  );
  inner.position.set(0, 1.38, 0);
  const plaque = new THREE.Mesh(
    new THREE.PlaneGeometry(1.05, 0.24),
    new THREE.MeshBasicMaterial({ map: labelCanvas(work.title, "vitrine") })
  );
  plaque.position.set(0, 0.28, 0.7);
  [base, plinth, glass, inner, plaque].forEach((mesh) => group.add(mesh));
  group.position.set(work.x, 0, work.z);
  scene.add(group);
  walls.push({
    minX: work.x - 0.68,
    maxX: work.x + 0.68,
    minZ: work.z - 0.68,
    maxZ: work.z + 0.68,
  });
  interactives.push({
    type: "art",
    title: work.title,
    message: work.text,
    image: work.image,
    roomId: roomAt(work.x, work.z).id,
    x: work.x,
    z: work.z,
  });
}

function signCanvas(name) {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 256;
  const ctx = c.getContext("2d");
  const pad = 28;
  ctx.fillStyle = "#3a2416";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = "#e4c37a";
  ctx.lineWidth = 16;
  ctx.strokeRect(pad, pad, c.width - pad * 2, c.height - pad * 2);
  ctx.fillStyle = "#f7e7b4";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const label = name.toUpperCase();
  const maxW = c.width - pad * 2 - 48;
  let size = 78;
  ctx.font = `700 ${size}px Georgia`;
  while (size > 36 && ctx.measureText(label).width > maxW) {
    size -= 2;
    ctx.font = `700 ${size}px Georgia`;
  }
  ctx.fillText(label, c.width / 2, c.height / 2 + 2);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function doorSign(name, x, z, rotY) {
  const group = new THREE.Group();
  const board = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.62, 0.1), colorMat(0x4a2e1a));
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(3.25, 0.48),
    new THREE.MeshBasicMaterial({ map: signCanvas(name) })
  );
  plate.position.z = 0.06;
  group.add(board, plate);
  group.position.set(x, 3.92, z);
  group.rotation.y = rotY;
  scene.add(group);
}
function hall(opts) {
  const { x, z, w, d, wall, wood, door } = opts;
  floor(w, d, x, z, wood);
  if (opts.roof) ceiling(w, d, x, z, opts.roof);

  const t = 0.45;
  const h = 5.7;
  const left = x - w / 2;
  const right = x + w / 2;
  const front = z - d / 2;
  const back = z + d / 2;

  const wallMat = colorMat(wall);
  const open = door || {};

  function wallRun(side, length, cx, cz, gap) {
    if (!gap) {
      box(side === "x" ? length : t, h, side === "z" ? length : t, cx, h / 2, cz, wallMat);
      return;
    }
    const start = side === "x" ? cx - length / 2 : cz - length / 2;
    const gapStart = gap.center - gap.width / 2;
    const gapEnd = gap.center + gap.width / 2;
    const end = start + length;
    const first = gapStart - start;
    const second = end - gapEnd;
    if (first > 0.4) {
      if (side === "x") box(first, h, t, start + first / 2, h / 2, cz, wallMat);
      else box(t, h, first, cx, h / 2, start + first / 2, wallMat);
    }
    if (second > 0.4) {
      if (side === "x") box(second, h, t, gapEnd + second / 2, h / 2, cz, wallMat);
      else box(t, h, second, cx, h / 2, gapEnd + second / 2, wallMat);
    }
    // Verga só visual: colisão 2D no chão tapava o vão da porta.
    box(
      side === "x" ? gap.width : t,
      h - gap.height,
      side === "z" ? gap.width : t,
      side === "x" ? gap.center : cx,
      gap.height + (h - gap.height) / 2,
      side === "z" ? gap.center : cz,
      wallMat,
      false
    );
  }

  const gap = { width: 4.8, height: 3.6 };
  wallRun("x", w, x, front, open.north && { ...gap, center: x + (open.north.shift || 0) });
  wallRun("x", w, x, back, open.south && { ...gap, center: x + (open.south.shift || 0) });
  wallRun("z", d, left, z, open.west && { ...gap, center: z + (open.west.shift || 0) });
  wallRun("z", d, right, z, open.east && { ...gap, center: z + (open.east.shift || 0) });
}

const bookNotes = [
  "Aprecie nosso acervo de fotos nossas, aprecie cada detalhe, cada momento, cada sorriso. O que será que tem atrás daquela porta?",
  "Mais uma linha no caderno: a visita começou.",
  "O livro guarda seu nome entre as fotos de vocês.",
];
let bookIndex = 0;

function lanternsLit() {
  return interactives.filter((item) => item.type === "lantern" && item.lit).length;
}

function makeLantern(x, z, title) {
  const group = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 1.05, 8), colorMat(0x3a2418));
  pole.position.y = 0.52;
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 14, 12),
    new THREE.MeshStandardMaterial({
      color: 0x4a3a2a,
      emissive: 0x000000,
      roughness: 0.35,
    })
  );
  bulb.position.y = 1.18;
  const light = new THREE.PointLight(0xffc878, 0, 7, 1.7);
  light.position.y = 1.22;
  group.add(pole, bulb, light);
  group.position.set(x, 0, z);
  scene.add(group);
  walls.push({ minX: x - 0.22, maxX: x + 0.22, minZ: z - 0.22, maxZ: z + 0.22 });
  interactives.push({
    type: "lantern",
    title,
    message: "Uma lanterna apagada. E para acender.",
    lit: false,
    bulb,
    light,
    x,
    z,
  });
}

function makeGuestBook(x, z) {
  const group = new THREE.Group();
  const stand = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.95, 0.7), colorMat(0x6b4224));
  stand.position.y = 0.48;
  const book = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.06, 0.36), colorMat(0xf3ead4));
  book.position.set(0, 1.02, 0);
  group.add(stand, book);
  group.position.set(x, 0, z);
  scene.add(group);
  walls.push({ minX: x - 0.38, maxX: x + 0.38, minZ: z - 0.38, maxZ: z + 0.38 });
  interactives.push({
    type: "book",
    title: "Nosso museu",
    message: "Aprecie nosso acervo de fotos nossas, aprecie cada detalhe, cada momento, cada sorriso. O que será que tem atrás daquela porta?",
    x,
    z,
  });
}

function lamp(x, y, z, intensity = 18) {
  const light = new THREE.PointLight(0xfff1d0, intensity * 0.65, 16, 2);
  light.position.set(x, y, z);
  scene.add(light);
  return light;
}

const fairyBulbGeo = new THREE.SphereGeometry(0.055, 6, 5);
const fairyMats = [
  new THREE.MeshBasicMaterial({ color: 0xfff3d6 }),
  new THREE.MeshBasicMaterial({ color: 0xffd9a0 }),
];

function stringLights(from, to, count, sag = 0.26) {
  const group = new THREE.Group();
  const positions = [];
  for (let i = 0; i < count; i += 1) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    positions.push(
      from.x + (to.x - from.x) * t,
      from.y - Math.sin(t * Math.PI) * sag,
      from.z + (to.z - from.z) * t
    );
  }
  const wire = new THREE.Line(
    new THREE.BufferGeometry().setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    ),
    new THREE.LineBasicMaterial({ color: 0x2d261f })
  );
  group.add(wire);

  for (let i = 0; i < count; i += 1) {
    const bulb = new THREE.Mesh(fairyBulbGeo, fairyMats[i % 2]);
    bulb.position.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
    group.add(bulb);
  }
  scene.add(group);
}

function makeDoorLeaf(side) {
  const leaf = new THREE.Group();
  const wood = colorMat(0x6a4126);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(2.42, 3.6, 0.22), wood);
  panel.position.set(side * 1.21, 1.8, 0);
  const inset = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.28, 0.05), colorMat(0x7d4e2e));
  inset.position.set(side * 1.21, 1.92, 0.13);
  const knob = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 8, 6),
    colorMat(0xd4b36a, { metalness: 0.55, roughness: 0.32 })
  );
  knob.position.set(side * 2.16, 1.7, 0.16);
  leaf.add(panel, inset, knob);
  return leaf;
}

function hushLight(light, onIntensity) {
  light.userData.onIntensity = onIntensity;
  light.intensity = 0;
  gardenDoor.lights.push(light);
}

function makeGardenDoor() {
  const left = makeDoorLeaf(1);
  left.position.set(-2.42, 0, 10);
  const right = makeDoorLeaf(-1);
  right.position.set(2.42, 0, 10);
  const slab = new THREE.Mesh(new THREE.BoxGeometry(4.9, 3.62, 0.4), colorMat(0x5a3820));
  slab.position.set(0, 1.81, 10);
  const cover = new THREE.Mesh(new THREE.BoxGeometry(17.8, 5.58, 21.5), colorMat(0xc8d5b8));
  cover.position.set(0, 2.79, 21.2);
  scene.add(left, right, slab, cover);
  const blocker = {
    minX: -2.5,
    maxX: 2.5,
    minZ: 9.7,
    maxZ: 10.3,
  };
  walls.push(blocker);
  const interactive = {
    type: "garden-door",
    title: "Porta de Luzes Internas",
    message: "A porta está fechada. Olhe todos os quadros da Ala do Jogo e da Ala das Papadas.",
    x: 0,
    z: 10,
  };
  interactives.push(interactive);
  gardenDoor.left = left;
  gardenDoor.right = right;
  gardenDoor.slab = slab;
  gardenDoor.cover = cover;
  gardenDoor.blocker = blocker;
  gardenDoor.interactive = interactive;
}

function openGardenDoor() {
  if (gardenDoor.open) return;
  gardenDoor.open = true;
  const index = walls.indexOf(gardenDoor.blocker);
  if (index >= 0) walls.splice(index, 1);
  if (gardenDoor.slab) gardenDoor.slab.visible = false;
  if (gardenDoor.cover) gardenDoor.cover.visible = false;
  boy.visible = true;
  for (const light of gardenDoor.lights) {
    light.intensity = light.userData.onIntensity ?? 8;
  }
  if (gardenDoor.interactive) {
    gardenDoor.interactive.message = "A porta de Luzes Internas se abriu.";
  }
  const glow = scene.getObjectByName("inviteGlow");
  if (glow) glow.intensity = Math.max(glow.intensity, 8);
  showDoorEvent();
}

function markRoomVisit() {
  const room = roomAt(player.x, player.z);
  if (questRooms.includes(room.id) && !visited.has(room.id)) {
    visited.add(room.id);
    invalidateQuest();
    tryOpenGardenDoor();
  }
}

function markArtSeen(item) {
  if (item?.type !== "art" || !questRooms.includes(item.roomId) || !item.image) return;
  if (seenArt.has(item.image)) return;
  seenArt.add(item.image);
  invalidateQuest();
  tryOpenGardenDoor();
}

function hangFairyLights() {
  stringLights({ x: -8.42, y: 4.78, z: 12.2 }, { x: -8.42, y: 4.78, z: 30.2 }, 7);
  stringLights({ x: 8.42, y: 4.78, z: 12.2 }, { x: 8.42, y: 4.78, z: 30.2 }, 7);
  stringLights({ x: -6.4, y: 4.78, z: 31.38 }, { x: 6.4, y: 4.78, z: 31.38 }, 5, 0.2);
  stringLights({ x: -6.4, y: 4.78, z: 10.55 }, { x: 6.4, y: 4.78, z: 10.55 }, 5, 0.18);
  const glow = new THREE.PointLight(0xffe3b4, 2.4, 12, 2);
  glow.position.set(0, 4.2, 22);
  scene.add(glow);
  hushLight(glow, 2.4);
}

function buildMuseum() {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    colorMat(0x6f8f55)
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.2;
  scene.add(ground);

  scene.add(new THREE.HemisphereLight(0xfff4e5, 0x3a2b1c, 1.05));
  const sun = new THREE.DirectionalLight(0xffe7c2, 0.7);
  sun.position.set(8, 16, 6);
  scene.add(sun);

  hall({
    x: 0,
    z: 0,
    w: 20,
    d: 20,
    wall: 0xe8dcc6,
    wood: 0xb88852,
    door: { south: true, east: true, west: true },
  });
  hall({
    x: 17,
    z: 0,
    w: 14,
    d: 12,
    wall: 0xcfd6d4,
    wood: 0x8f6a3d,
    door: { west: true },
  });
  hall({
    x: -22,
    z: 0,
    w: 24,
    d: 16,
    wall: 0xe4d3c0,
    wood: 0x9a7042,
    door: { east: true },
  });
  hall({
    x: 0,
    z: 21,
    w: 18,
    d: 22,
    wall: 0xc8d5b8,
    wood: 0x6f8a4a,
    door: { north: true },
    roof: 0xb7c4a8,
  });

  makeGardenDoor();
  doorSign("Luzes Internas", 0, 9.68, Math.PI);
  doorSign("Sala Nós", 0, 10.32, 0);
  doorSign("Ala do Jogo", 9.68, 0, -Math.PI / 2);
  doorSign("Sala Nós", 10.32, 0, Math.PI / 2);
  doorSign("Ala das Papadas", -9.68, 0, Math.PI / 2);
  doorSign("Sala Nós", -10.32, 0, -Math.PI / 2);

  wallWorks.forEach(hangPhoto);
  cases.forEach(displayCase);

  lamp(0, 4.6, 0, 22);
  lamp(17, 4.4, 0, 14);
  lamp(-24, 4.4, 0, 16);
  hushLight(lamp(0, 4.6, 22, 14), 14);

  const gardenLight = new THREE.PointLight(0xb7e38a, 10, 16, 1.8);
  gardenLight.position.set(0, 3.4, 22);
  scene.add(gardenLight);
  hushLight(gardenLight, 10);
  hangFairyLights();

  [
    [0, 10],
    [10, 0],
    [-10, 0],
  ].forEach(([x, z]) => {
    const rug = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.04, 1.4), colorMat(0x5b3a22));
    rug.position.set(x, 0.03, z);
    if (Math.abs(x) > Math.abs(z)) rug.rotation.y = Math.PI / 2;
    scene.add(rug);
  });

  makeLantern(-5.6, 3.6, "Lanterna da esquerda");
  makeLantern(5.6, 3.6, "Lanterna da direita");
  makeLantern(-5.6, -6.2, "Lanterna do fundo");
  makeGuestBook(0, 0.2);
  const doorGlow = new THREE.PointLight(0xffc878, 0, 10, 1.6);
  doorGlow.position.set(0, 3.2, 9.2);
  doorGlow.name = "inviteGlow";
  scene.add(doorGlow);

  interactives.push({
    type: "friend",
    title: "Fuinha que tanto te ama",
    message: "Amo muiiinnnto você, foi divertido criar esse museu com todas nossas pinturas mais lindas e estranhas juntos! Viver a vida contigo é o melhor presente que eu poderia ter recebido. Te amo, meu gnominho.",
    x: 0,
    z: 21,
  });
}

function blocked(x, z) {
  const r = player.radius;
  return walls.some(
    (wall) => x + r > wall.minX && x - r < wall.maxX && z + r > wall.minZ && z - r < wall.maxZ
  );
}

function movePlayer(dx, dz) {
  if (!dx && !dz) return;
  const steps = 4;
  const sx = dx / steps;
  const sz = dz / steps;
  for (let i = 0; i < steps; i += 1) {
    const nextX = player.x + sx;
    const nextZ = player.z + sz;
    if (!blocked(nextX, player.z)) player.x = nextX;
    else player.vx *= 0.35;
    if (!blocked(player.x, nextZ)) player.z = nextZ;
    else player.vz *= 0.35;
  }
}

function nearestInteractive() {
  let best = null;
  let bestDist = 3.6;
  for (const item of interactives) {
    if (item.type === "garden-door" && gardenDoor.open) continue;
    const dist = Math.hypot(item.x - player.x, item.z - player.z);
    if (dist < bestDist) {
      best = item;
      bestDist = dist;
    }
  }
  return best;
}

function renderRoomList(current) {
  roomList.innerHTML = rooms
    .map(
      (room) => `
        <li class="${room.id === current.id ? "here" : ""}">
          <strong>${room.name}</strong>
          <span>${room.content}</span>
        </li>`
    )
    .join("");
}

let hudHint = "";
let hudPrompt = "";
let hudPromptHidden = null;

function setHint(text) {
  if (text === hudHint) return;
  hudHint = text;
  hint.textContent = text;
}

function setPrompt(text, hidden) {
  if (hidden !== hudPromptHidden) {
    hudPromptHidden = hidden;
    prompt.hidden = hidden;
  }
  if (!hidden && text !== hudPrompt) {
    hudPrompt = text;
    prompt.textContent = text;
  }
}

function updateHud() {
  markRoomVisit();
  const room = roomAt(player.x, player.z);
  if (roomName.textContent !== room.name) {
    roomName.textContent = room.name;
    renderRoomList(room);
  }
  if (inspect.open) {
    setPrompt(hudPrompt, true);
    return;
  }
  if (gardenDoor.announceUntil > performance.now()) {
    setPrompt(hudPrompt, true);
    setHint("Algo aconteceu. A porta de Luzes Internas se abriu.");
    return;
  }
  const near = nearestInteractive();
  if (!near || (near.type === "garden-door" && gardenDoor.open)) {
    setPrompt(hudPrompt, true);
    if (gardenDoor.open) {
      setHint(room.id === "atrio" ? "A porta de Luzes Internas está aberta." : room.content);
    } else if (questRooms.includes(room.id)) {
      const progress = questProgress();
      const here = questArt.filter((item) => item.roomId === room.id);
      const hereSeen = here.filter((item) => seenArt.has(item.image)).length;
      setHint(`Quadros desta sala: ${hereSeen}/${here.length}. No total: ${progress.seen}/${progress.total}.`);
    } else {
      setHint(questHint());
    }
    return;
  }
  let label = "Interagir — olhar";
  if (near.type === "friend") label = "Interagir — encontrar";
  else if (near.type === "lantern") label = near.lit ? "Já acesa" : "Acender lanterna";
  else if (near.type === "book") label = "Assinar o livro";
  else if (near.type === "garden-door") label = "Porta fechada";
  setPrompt(label, false);
  setHint(near.message);
}

function interact() {
  if (inspect.open) {
    inspect.close();
    return;
  }
  const near = nearestInteractive();
  if (!near) return;

  if (near.type === "lantern") {
    if (!near.lit) {
      near.lit = true;
      near.bulb.material.color.setHex(0xffe2a8);
      near.bulb.material.emissive.setHex(0xffb35a);
      near.bulb.material.emissiveIntensity = 1.4;
      near.light.intensity = 9;
      near.message = "A lanterna aquece o saguão.";
    }
    const lit = lanternsLit();
    hint.textContent =
      lit < 3
        ? `Lanternas acesas: ${lit}/3`
        : gardenDoor.open
          ? "As três lanternas acenderam. A porta de Luzes Internas está aberta."
          : questHint();
    const glow = scene.getObjectByName("inviteGlow");
    if (glow && lit === 3) glow.intensity = 14;
    return;
  }

  if (near.type === "garden-door") {
    inspectTitle.textContent = gardenDoor.open ? "Porta aberta" : "Porta fechada";
    inspectText.textContent = gardenDoor.open
      ? "A fuinha branca já olhou os quadros. Pode entrar."
      : questHint();
    inspectImage.hidden = true;
    inspectImage.removeAttribute("src");
    inspect.showModal();
    keys.clear();
    return;
  }

  if (near.type === "book") {
    inspectTitle.textContent = near.title;
    inspectText.textContent = bookNotes[bookIndex % bookNotes.length];
    bookIndex += 1;
    inspectImage.hidden = true;
    inspectImage.removeAttribute("src");
    inspect.showModal();
    keys.clear();
    return;
  }

  if (near.type === "art") markArtSeen(near);
  inspectTitle.textContent = near.title;
  inspectText.textContent =
    near.type === "friend"
      ? "Amo muiiinnnto você, foi divertido criar esse museu com todas nossas pinturas mais lindas e estranhas juntos! Viver a vinda contigo é o melhor presente que eu poderia ter recebido. Te amo, meu gnominho."
      : near.message;
  if (near.image) {
    inspectImage.hidden = false;
    inspectImage.src = near.image;
    inspectImage.alt = near.title;
  } else {
    inspectImage.hidden = true;
    inspectImage.removeAttribute("src");
  }
  inspect.showModal();
  keys.clear();
}

function resize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen().catch(() => {});
}

canvas.style.cursor = "grab";
canvas.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 && event.button !== 2) return;
  dragging.on = true;
  dragging.x = event.clientX;
  dragging.y = event.clientY;
  canvas.setPointerCapture(event.pointerId);
  canvas.style.cursor = "grabbing";
});
canvas.addEventListener("pointermove", (event) => {
  if (!dragging.on) return;
  orbit.yaw -= (event.clientX - dragging.x) * 0.0055;
  orbit.pitch = THREE.MathUtils.clamp(
    orbit.pitch + (event.clientY - dragging.y) * 0.0038,
    0.28,
    1.25
  );
  dragging.x = event.clientX;
  dragging.y = event.clientY;
});
function endDrag(event) {
  dragging.on = false;
  canvas.style.cursor = "grab";
  if (canvas.hasPointerCapture?.(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
}
canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);
canvas.addEventListener("contextmenu", (event) => event.preventDefault());
canvas.addEventListener("wheel", (event) => {
  event.preventDefault();
  orbit.dist = THREE.MathUtils.clamp(orbit.dist + event.deltaY * 0.008, 5.5, 16);
}, { passive: false });

prompt.addEventListener("click", (event) => {
  event.stopPropagation();
  interact();
});
inspectClose.addEventListener("click", () => inspect.close());
inspect.addEventListener("click", (event) => {
  if (event.target === inspect) inspect.close();
});

window.addEventListener("pointerdown", () => ensureAudio());
window.addEventListener("keydown", (event) => {
  ensureAudio();
  const key = event.key.toLowerCase();
  if (inspect.open && (key === "e" || key === "escape" || event.code === "Space")) {
    event.preventDefault();
    inspect.close();
    return;
  }
  keys.add(key);
  if (key === "e" || event.code === "Space") {
    event.preventDefault();
    interact();
  }
  if (key === "f") toggleFullscreen();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
    event.preventDefault();
  }
});
window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
window.addEventListener("blur", () => {
  keys.clear();
  dragging.on = false;
  canvas.style.cursor = "grab";
});
window.addEventListener("resize", resize);

buildMuseum();
questArt = interactives.filter((item) => item.type === "art" && questRooms.includes(item.roomId));
invalidateQuest();
renderRoomList(rooms[0]);

const clock = new THREE.Clock();
function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;

  if (keys.has("q")) orbit.yaw += dt * 1.6;
  if (keys.has("c")) orbit.yaw -= dt * 1.6;

  const inputX = (keys.has("d") || keys.has("arrowright") ? 1 : 0) - (keys.has("a") || keys.has("arrowleft") ? 1 : 0);
  const inputZ = (keys.has("s") || keys.has("arrowdown") ? 1 : 0) - (keys.has("w") || keys.has("arrowup") ? 1 : 0);
  const inputLen = Math.hypot(inputX, inputZ);
  const forwardX = -Math.sin(orbit.yaw);
  const forwardZ = -Math.cos(orbit.yaw);
  const rightX = Math.cos(orbit.yaw);
  const rightZ = -Math.sin(orbit.yaw);
  const dirX = inputLen ? (forwardX * -inputZ + rightX * inputX) / inputLen : 0;
  const dirZ = inputLen ? (forwardZ * -inputZ + rightZ * inputX) / inputLen : 0;
  const accel = 22;
  const maxSpeed = 4.6;
  const damp = inputLen ? 8 : 14;

  player.vx += (dirX * maxSpeed - player.vx) * Math.min(1, accel * dt);
  player.vz += (dirZ * maxSpeed - player.vz) * Math.min(1, damp * dt);
  if (Math.hypot(player.vx, player.vz) < 0.02) {
    player.vx = 0;
    player.vz = 0;
  }

  movePlayer(player.vx * dt, player.vz * dt);
  const walking = Math.hypot(player.vx, player.vz) > 0.12;

  girl.position.set(player.x, 0, player.z);
  bobWeasel(girl, time, walking, player.vx * Math.cos(orbit.yaw) + player.vz * Math.sin(orbit.yaw));
  if (boy.visible) bobWeasel(boy, time + 1.1, false, -0.2);
  if (gardenDoor.open && gardenDoor.amount < 1) {
    gardenDoor.amount = Math.min(1, gardenDoor.amount + dt * 1.15);
    const swing = gardenDoor.amount * 1.85;
    if (gardenDoor.left) gardenDoor.left.rotation.y = -swing;
    if (gardenDoor.right) gardenDoor.right.rotation.y = swing;
  }
  if (gardenDoor.open && player.z > 9.5) {
    const a = 0.72 + 0.28 * (0.5 + 0.5 * Math.sin(time * 1.55));
    const b = 0.72 + 0.28 * (0.5 + 0.5 * Math.sin(time * 1.55 + 1.2));
    fairyMats[0].color.setRGB(1 * a, 0.95 * a, 0.84 * a);
    fairyMats[1].color.setRGB(1 * b, 0.85 * b, 0.63 * b);
  }

  const planar = orbit.dist * Math.cos(orbit.pitch);
  const camX = player.x + Math.sin(orbit.yaw) * planar;
  const camZ = player.z + Math.cos(orbit.yaw) * planar;
  const camY = Math.max(3.4, orbit.dist * Math.sin(orbit.pitch));
  camera.position.set(camX, camY, camZ);
  if (!gardenDoor.open) {
    const inside =
      camera.position.x > -9.15 &&
      camera.position.x < 9.15 &&
      camera.position.z > 10.08 &&
      camera.position.z < 32.25 &&
      camera.position.y < 6.05;
    if (inside) camera.position.z = 10.08;
  }
  camera.lookAt(player.x, 0.55, player.z);

  updateHud();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);
