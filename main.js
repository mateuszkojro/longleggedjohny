'use strict';
import { OrbitControls } from "./js/controls.js";

Physijs.scripts.worker = '/js/physijs_worker.js';
Physijs.scripts.ammo = '/js/ammo.js';


document.onkeydown = function(key) {
  var box = scene.getObjectByName('box');
  box.__dirtyRotation = true;
  box.__dirtyPosition = true;
  // You may also want to cancel the object's velocity
  box.setLinearVelocity(new THREE.Vector3(0, 0, 0));
  box.setAngularVelocity(new THREE.Vector3(0, 0, 0));

  switch (key.code) {
    case "ArrowRight":
      box.position.x += 1;
      break;
    case "ArrowLeft":
      box.position.x -= 1;
      break;
    case "ArrowUp":
      box.position.z -= 1;
      break;
    case "ArrowDown":
      box.position.z += 1;
      break;
  };
  scene.simulate();
  renderer.render();
}


const randomInt = (min, max) => {
  return min + Math.floor((max - min) * Math.random());
}

const create_building = (x, y, z) => {
  // -- buildings -- 
  const build_material = Physijs.createMaterial(
    new THREE.MeshLambertMaterial({
      color: 0x00ff00, wireframe: true
    }),
    9, // tarcie
    0.1) // bouncines

  const build = new Physijs.BoxMesh(
    new THREE.CubeGeometry(5, 10, 5),
    build_material,
    500, 500 // im wieksze tym i guess ciezsze 
  )

  // jezeli zmieniamy pozycje musimu uzyc dodatkowych func
  build.position.y = y;
  build.position.x = x;
  build.position.z = z;
  return build;
}

const create_floor = () => {

  // --- FLOOR ---
  const floor_material = new Physijs.createMaterial(
    new THREE.MeshLambertMaterial({ color: 0x0000ff, wireframe: true }),
    0.9,
    0.9
  )
  const floor = new Physijs.BoxMesh(
    new THREE.BoxGeometry(50, 1, 50),
    floor_material,
    0, 0
  )
  return floor;

}

var initScene, render, renderer, scene, camera, box;

initScene = function() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById('viewport').appendChild(renderer.domElement);

  scene = new Physijs.Scene({ fixedTimeStep: 1 / 300 });

  const light = new THREE.AmbientLight(0xffffff); // soft white light
  scene.add(light);



  camera = new THREE.PerspectiveCamera(
    35,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.set(60, 50, 60);
  camera.lookAt(scene.position);
  scene.add(camera);


  scene.add(create_floor())

  scene.add(create_building(10, 5, 0))
  scene.add(create_building(-10, 5, 0))
  scene.add(create_building(10, 5, 5))
  scene.add(create_building(0, 5, -10))
  scene.add(create_building(0, 5, 10))

  for (let i = 0; i < 2; i++) {
    scene.add(
      create_building(randomInt(-25, 25),
        5,
        randomInt(-25, 25)))
  }

  // --- BOX ---
  const box_material = new Physijs.createMaterial(new THREE.MeshLambertMaterial({
    color: "red",
    wireframe: true
  }), 9, 0.9)

  const box = new Physijs.BoxMesh(
    new THREE.CubeGeometry(5, 5, 5),
    box_material
  );
  box.position.y = 20;
  box.position.x = 5;
  box.name = "box";
  scene.add(box);

  box.addEventListener('collision', function(other_object, relative_velocity, relative_rotation, contact_normal) {
    if (other_object.name == 'sp') {
      console.log(other_object);
      console.log(relative_velocity);
      console.log(relative_rotation);
      console.log(contact_normal);
      //other_object.world.remove(other_object);
      //other_object.material.color.setHex(0x0000ff);
      const point = new Physijs.ConvexMesh(
        new THREE.SphereGeometry(.5),
        box_material,
        0
      )
      //point.position.x = other_object.position.x + (-2.5 * contact_normal.x);
      //point.position.y = other_object.position.y + (-2.5 * contact_normal.y);
      //point.position.z = other_object.position.z + (-2.5 * contact_normal.z);

      point.position.x = box.position.x + (2.5 * contact_normal.x);
      point.position.y = box.position.y + (2.5 * contact_normal.y);
      point.position.z = box.position.z + (2.5 * contact_normal.z);

      scene.add(point);

      const geo = new THREE.BufferGeometry().setFromPoints(
        [point.position.x,
        point.position.y,
        point.position.z])
    }
      
      //const new_one = create_building(box.position.x,box.position.y,box.position.z);
      //scene.add(new_one);
      
      //box.world.remove(box);

  });

  //const sphere = new Physijs.SphereMesh(
  //new THREE.SphereGeometry(2.5),
  //box_material
  //)
  ////sphere.position.y = 3;
  //sphere.name = "sp";
  //scene.add(sphere)

  const test = create_building(0,9,0)
  test.name  = "sp";
  scene.add(test);

  const controls = new OrbitControls(camera, renderer.domElement);
  requestAnimationFrame(render);
};

render = function() {



  scene.simulate(); // run physics
  renderer.render(scene, camera); // render the scene
  requestAnimationFrame(render);
};

window.onload = initScene();

//@TODO jak dodamy sepie to bedzie wygladalo cool a bedzie o wiele mniej
//problemow z kolorami
