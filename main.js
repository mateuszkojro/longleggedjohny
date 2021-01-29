import {OrbitControls} from "./js/controls.js";
import {GLTFLoader} from "./js/loader.js";
//import {Vector3} from "./js/three.module";


// class player {
//     constructor(physi_obj,  model) {
//         this.position = new Vector3(0,0,0);
//     }
// }


var loader = new GLTFLoader();

Physijs.scripts.worker = '/js/physijs_worker.js';
Physijs.scripts.ammo = '/js/ammo.js';

// dzieki temu moge znalezc z ktorej strony uderzyla - mega chujowo zrobione
// ale will do for now

const find_bigest = (vector) => {
    const max = max([vector.x, vector.y, vector.z]);
    switch (max) {
        case a.size:
            return new THREE.Vector3(1, 0, 0);
        case b.size:
            return new THREE.Vector3(0, 1, 0);
        case c.size:
            return new THREE.Vector3(0, 0, 1);
    }
}

// controlsy dla obkeitu oznaczonego nazwa player - poki co tylko rudamentary
document.onkeydown = function (key) {
    var box = scene.getObjectByName('player');
    // jezeli zmieniamy pozycje muismy uzyc tkiego hacka
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
    }
    ;
    scene.simulate();
}

const randomInt = (min, max) => {
    return min + Math.floor((max - min) * Math.random());
}

const create_building = (x, y, z, scale) => {
    // -- buildings --
    const build_material = Physijs.createMaterial(
        new THREE.MeshLambertMaterial({
            color: 0x00ff00, wireframe: true
        }),
        9, // tarcie
        0.1) // bouncines

    const build = new Physijs.BoxMesh(
        new THREE.CubeGeometry(5 * scale, 10, 5 * scale),
        build_material,
        500, 500 // im wieksze tym i guess ciezsze
    )

    build.position.y = y;
    build.position.x = x;
    build.position.z = z;
    return build;
}

const create_floor = () => {
    // --- FLOOR ---
    const floor_material = new Physijs.createMaterial(
        new THREE.MeshLambertMaterial({color: 0x0000ff, wireframe: true}),
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

// returns an arr of new obj adding up to old obj 
const collapse_building = (angle, building, force) => {

    //mozna by bylo zmniejszac predkosc z jaka porusza sie cialo po zderzeniu
    //that would look more real

    const build_material = Physijs.createMaterial(
        new THREE.MeshLambertMaterial({
            color: 0x00ff00, wireframe: true
        }),
        9, // tarcie
        0.1) // bouncines

    const base = new Physijs.BoxMesh(
        new THREE.CubeGeometry(5, 10 * 0.5, 5),
        build_material,
        500, 500 // im wieksze tym i guess ciezsze
    )

    base.position.x = angle.x * building.geometry.parameters.width + building.position.x;
    base.position.y = angle.y * building.geometry.parameters.height + building.position.y;
    base.position.z = angle.z * building.geometry.parameters.depth + building.position.y;

    const gravel = new Physijs.BoxMesh(
        new THREE.CubeGeometry(5, 10 * 0.4, 5),
        build_material,
        500, 500 // im wieksze tym i guess ciezsze
    )

    gravel.position.x = angle.x * building.geometry.parameters.width + building.position.x;
    gravel.position.y = angle.y * building.geometry.parameters.height + building.position.y;
    gravel.position.z = angle.z * building.geometry.parameters.depth + building.position.z;
    return {base, gravel}

}

var crab, initScene, render, renderer, scene, camera, box;

initScene = (loaded_crab) => {
    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('viewport').appendChild(renderer.domElement);


    crab = loaded_crab.scene.children[2];

    scene = new Physijs.Scene({fixedTimeStep: 1 / 60});


    scene.background = new THREE.CubeTextureLoader().setPath('./files/skybox/').load([
        'px.png',
        'nx.png',
        'py.png',
        'ny.png',
        'pz.png',
        'nz.png'
    ]);

    const light = new THREE.AmbientLight(0xffffff); // soft white light
    scene.add(light);

    scene.add(crab);
    crab.position.y = 10;


    camera = new THREE.PerspectiveCamera(
        35,
        window.innerWidth / window.innerHeight,
        1,
        1000
    );
    camera.position.set(60, 50, 60);
    camera.lookAt(scene.position);
    scene.add(camera);

    //
    scene.add(create_floor())
    //  for (let i = 0; i < 2; i++) {
    // scene.add(
    // create_building(randomInt(-25, 25),
    // 5,
    // randomInt(-25, 25)))
    // }

    scene.add(
        create_building(4, 4, 4, 1)
    )


    console.log("loaded crab: ", crab)


    // --- BOX ---
    const box_material = new Physijs.createMaterial(new
    THREE.MeshLambertMaterial({
        color: "red",
        wireframe: true
    }), 9, 0.2)


    const box = new Physijs.BoxMesh(
        new THREE.CubeGeometry(5, 2, 5),
        box_material
    );

    box.rotateX(0.39)
    const player = new THREE.Group()
    player.add(box)
    player.add(crab)
    //player.name = "player"
    console.log("ready crab: ", crab)
    box.name = "player";
    scene.add(box);
    scene.add(player);

    const test = create_building(0, 9, 0, 1)
    test.name = "sp";
    scene.add(test);

    test.addEventListener('collision', function (other_object, relative_velocity,
                                                 relative_rotation, contact_normal) {

        if (other_object.name === 'player') {
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

            point.position.x = this.position.x + (2.5 * contact_normal.x);
            point.position.y = this.position.y + (2.5 * contact_normal.y);
            point.position.z = this.position.z + (2.5 * contact_normal.z);

            //scene.add(point);

            //const x = this.position.x;
            //const y = this.position.y;
            //const z = this.position.z;

            const {base, gravel} = collapse_building(contact_normal, this, relative_velocity);

            const world = this.world;

            this.world.remove(this);

            console.log(base)

            scene.add(base)
            scene.add(gravel)

            console.log(base)

            const geo = new THREE.BufferGeometry().setFromPoints(
                [point.position.x,
                    point.position.y,
                    point.position.z])
            //const new_one = create_building(x, y, z, 1 / 2);
            //scene.add(new_one);

        }


    });


    //crab.scene.children[0].boundingBox = new THREE.Box3(new THREE.Vector3(1,1,1), new THREE.Vector3(3,3,3));


    // const sphere = new Physijs.ConvexMesh(
    //       crab.scene.children[1], //new THREE.SphereGeometry(2.5),
    //       box_material
    //   )
    //sphere.position.y = 3;
    // sphere.name = "sp";
    //scene.add(sphere)


    const controls = new OrbitControls(camera, renderer.domElement);
    requestAnimationFrame(render);
};

render = function () {
    if (crab != undefined) {
        var box = scene.getObjectByName('player');
        crab.position.x = box.position.x;
        crab.position.y = box.position.y;
        crab.position.z = box.position.z;
        crab.rotation.x = box.rotation.x;
        crab.rotation.y = box.rotation.y;
        crab.rotation.z = box.rotation.z;
    }
    scene.simulate();
    // run physics
    renderer.render(scene, camera); // render the scene
    requestAnimationFrame(render);
};



loader.load(
    "./files/crab.glb",
    initScene,
    (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
    },
    (err) => {
        console.log("An error happened", err);
    }
);

//@TODO jak dodamy sepie to bedzie wygladalo cool a bedzie o wiele mniej
//problemow z kolorami
