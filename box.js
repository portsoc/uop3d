// RENDERER
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
renderer.setClearColor("#FFF");
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

// CONSTANTS
const purple = new THREE.MeshPhongMaterial( { color: "#621360", opacity: 0.9,
transparent: true } );
const blue = new THREE.MeshPhongMaterial( { color: "#6699FF", opacity: 0.9,
transparent: true } );
const extrusion = { steps: 1, depth: 0.5, bevelEnabled: false };

// LIGHT
const hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 0.2 );
hemiLight.color.setHSL( 1, 1, 1 );
hemiLight.position.set( 0, 50, 0 );
hemiLight.castShadow = true;

const topLight = new THREE.PointLight("#FFFFFF", 1, 10, 1);
topLight.position.set( -4, 50, 30 );
topLight.castShadow = true;

// FLOOR
const floorGeo = new THREE.PlaneGeometry( 200, 100 );
const floorMaterial = new THREE.MeshBasicMaterial( {color: "#fff", side: THREE.DoubleSide} );
const plane = new THREE.Mesh( floorGeo, floorMaterial );
plane.rotation.x = 90;

// LOGO
const logo = makeLogo();

// SCENE
const ratio = window.innerWidth/window.innerHeight;
const scene = new THREE.Scene();
scene.add( plane );
scene.add( topLight );
scene.add( logo );

// CAMERA
const camera = new THREE.PerspectiveCamera( 75, ratio, 0.1, 1000 );
camera.position.z = 70;
camera.position.y = 20;


// LOOP
function loop() {
  logo.rotation.x -= 0.0041;
  logo.rotation.y += 0.001;
  logo.rotation.z += 0.00321;
  renderer.render(scene, camera);
  requestAnimationFrame( loop );
};

loop();

function makeLogo() {

  const u = new THREE.Shape();
  u.moveTo( 0,0 );
  u.lineTo( 2,0 );
  u.lineTo( 2,3 );
  u.lineTo( 1,3 );
  u.bezierCurveTo(0.5,3,0,2.5,0,2)
  //u.lineTo( 0,2 );
  const ugeo = new THREE.ExtrudeGeometry( u, extrusion );
  const umesh = new THREE.Mesh( ugeo, blue );
  umesh.translateZ(extrusion.depth/2);
  umesh.translateX(-1.5);
  umesh.translateY(-2);

  const p = new THREE.Shape();
  p.moveTo( 1,1 );
  p.lineTo( 2,1 );
  p.bezierCurveTo(2.5,1,3,1.5,3,2)
  p.bezierCurveTo(3,2.5,2.5,3,2,3)
  p.lineTo( 1,4 );
  const pgeo = new THREE.ExtrudeGeometry( p, extrusion );
  const pmesh = new THREE.Mesh( pgeo, purple );
  pmesh.translateZ(-extrusion.depth/2);
  pmesh.translateX(-1.5);
  pmesh.translateY(-2);

  const g = new THREE.Group();
  g.add( umesh );
  g.add( pmesh );

  g.translateY(20);

  g.scale.set(10,10,10);
  g.castShadow = true;

  g.rotation.x = Math.PI;

  return g;
}

