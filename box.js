const PURPLE = new THREE.MeshPhongMaterial({ color: '#621360', opacity: 0.9, transparent: true });
const BLUE = new THREE.MeshPhongMaterial({ color: '#6699FF', opacity: 0.9, transparent: true });
const EXTRUSION = { steps: 1, depth: 0.5, bevelEnabled: false, curveSegments: 64 };

const TARGET_LOGO_COUNT = 400;
const LOGO_SPACING = 40;
const EXTRA_OVERFLOW_COLS = 2;

const FOV_DEG = 75;
const INITIAL_ZOOM_T = 0.8;
const ZOOM_HALF_SECONDS = 15;
const OUT_PAUSE_SECONDS = 15;
const ZOOM_CYCLE_SECONDS = ZOOM_HALF_SECONDS * 2 + OUT_PAUSE_SECONDS;

const ROTATION_SPEED_SCALE = 0.05;
const Z_ROTATION_SPEED = 0.0041;

const DARK_SCHEME = window.matchMedia('(prefers-color-scheme: dark)');
const BG_LIGHT = '#FFFFFF';
const BG_DARK = '#111111';
const HEMI_INTENSITY_LIGHT = 0.5;
const HEMI_INTENSITY_DARK = 0.25;
const POINT_INTENSITY_LIGHT = 1;
const POINT_INTENSITY_DARK = 0.7;
const isDark = () => DARK_SCHEME.matches;

const toOdd = (n) => (n % 2 === 0 ? n + 1 : n);

function makeLogo() {
  const u = new THREE.Shape();
  u.moveTo(0, 0);
  u.lineTo(2, 0);
  u.lineTo(2, 3);
  u.lineTo(1, 3);
  u.bezierCurveTo(0.5, 3, 0, 2.5, 0, 2);

  const uMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(u, EXTRUSION), BLUE);
  uMesh.translateZ(EXTRUSION.depth / 2);
  uMesh.translateX(-1.5);
  uMesh.translateY(-2);

  const p = new THREE.Shape();
  p.moveTo(1, 1);
  p.lineTo(2, 1);
  p.bezierCurveTo(2.5, 1, 3, 1.5, 3, 2);
  p.bezierCurveTo(3, 2.5, 2.5, 3, 2, 3);
  p.lineTo(1, 4);

  const pMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(p, EXTRUSION), PURPLE);
  pMesh.translateZ(-EXTRUSION.depth / 2);
  pMesh.translateX(-1.5);
  pMesh.translateY(-2);

  const group = new THREE.Group();
  group.add(uMesh);
  group.add(pMesh);
  group.translateY(20);
  group.scale.set(8, 8, 8);
  group.castShadow = true;
  group.rotation.x = Math.PI;
  return group;
}

function buildLogoGrid(aspect) {
  const rows = toOdd(Math.max(1, Math.round(Math.sqrt(TARGET_LOGO_COUNT / aspect))));
  const visibleCols = toOdd(Math.max(1, Math.round(TARGET_LOGO_COUNT / rows)));
  const cols = visibleCols + EXTRA_OVERFLOW_COLS;

  const group = new THREE.Group();
  const logos = [];
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const logo = makeLogo();
      logo.position.x += (i - (cols - 1) / 2) * LOGO_SPACING;
      logo.position.y += (j - (rows - 1) / 2) * LOGO_SPACING;
      group.add(logo);
      logos.push(logo);
    }
  }
  return { group, logos, rows, visibleCols };
}

function createRenderer() {
  const r = new THREE.WebGLRenderer({ antialias: true });
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  r.setClearColor(isDark() ? BG_DARK : BG_LIGHT);
  r.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(r.domElement);
  return r;
}

function createLights() {
  const hemi = new THREE.HemisphereLight(0xffffff, 0xffffff, isDark() ? HEMI_INTENSITY_DARK : HEMI_INTENSITY_LIGHT);
  hemi.color.setHSL(1, 1, 1);
  hemi.position.set(0, 50, 0);
  hemi.castShadow = true;

  const top = new THREE.PointLight('#FFFFFF', isDark() ? POINT_INTENSITY_DARK : POINT_INTENSITY_LIGHT);
  top.position.set(-40, 150, 130);
  top.castShadow = true;

  return [hemi, top];
}

function createCamera(aspect, visibleCols, rows) {
  const camera = new THREE.PerspectiveCamera(FOV_DEG, aspect, 0.1, 5000);
  const halfFovTan = Math.tan((FOV_DEG * Math.PI / 180) / 2);
  const distToFit = (halfW, halfH) =>
    Math.max(halfW / (halfFovTan * aspect), halfH / halfFovTan);

  const minDist = distToFit(18, 22);
  const maxDist = distToFit(
    ((visibleCols - 1) * LOGO_SPACING) / 2 + 18,
    ((rows - 1) * LOGO_SPACING) / 2 + 22,
  );

  camera.position.set(0, 20, maxDist);
  return { camera, minDist, maxDist };
}

function makeZoomController(camera, minDist, maxDist) {
  const startMs = performance.now();
  const distFor = (t) => maxDist * Math.pow(minDist / maxDist, t);

  camera.position.z = distFor(INITIAL_ZOOM_T);

  return function update() {
    const elapsed = ((performance.now() - startMs) / 1000) % ZOOM_CYCLE_SECONDS;
    let t;
    if (elapsed < ZOOM_HALF_SECONDS) {
      t = (1 + Math.cos((Math.PI * elapsed) / ZOOM_HALF_SECONDS)) / 2;
    } else if (elapsed < ZOOM_HALF_SECONDS + OUT_PAUSE_SECONDS) {
      t = 0;
    } else {
      const local = elapsed - ZOOM_HALF_SECONDS - OUT_PAUSE_SECONDS;
      t = (1 - Math.cos((Math.PI * local) / ZOOM_HALF_SECONDS)) / 2;
    }
    camera.position.z = distFor(t);
  };
}

function makeMouseTracker() {
  const state = { x: 0, y: 0 };
  window.addEventListener('mousemove', (e) => {
    state.x = (e.clientX / window.innerWidth) * 2 - 1;
    state.y = (e.clientY / window.innerHeight) * 2 - 1;
  });
  return state;
}

function main() {
  const renderer = createRenderer();
  const aspect = window.innerWidth / window.innerHeight;

  const { group: logoGrid, logos, rows, visibleCols } = buildLogoGrid(aspect);
  const { camera, minDist, maxDist } = createCamera(aspect, visibleCols, rows);

  const scene = new THREE.Scene();
  const lights = createLights();
  for (const light of lights) scene.add(light);
  scene.add(logoGrid);

  DARK_SCHEME.addEventListener('change', () => {
    renderer.setClearColor(isDark() ? BG_DARK : BG_LIGHT);
    const [hemi, top] = lights;
    hemi.intensity = isDark() ? HEMI_INTENSITY_DARK : HEMI_INTENSITY_LIGHT;
    top.intensity = isDark() ? POINT_INTENSITY_DARK : POINT_INTENSITY_LIGHT;
  });

  const updateZoom = makeZoomController(camera, minDist, maxDist);
  const mouse = makeMouseTracker();

  function loop() {
    updateZoom();
    const xSpeed = mouse.y * ROTATION_SPEED_SCALE;
    const ySpeed = mouse.x * ROTATION_SPEED_SCALE;
    for (const logo of logos) {
      logo.rotation.x += xSpeed;
      logo.rotation.y += ySpeed;
      logo.rotation.z += Z_ROTATION_SPEED;
    }
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  loop();
}

main();
