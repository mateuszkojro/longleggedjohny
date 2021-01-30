// controls
import {OrbitControls} from "./js/controls.js";
// ladowanie modelu craba
import {GLTFLoader} from "./js/loader.js";

// imports for sepia renderer pass
import { EffectComposer } from './js/jsm/postprocessing/EffectComposer.js';
import { ShaderPass } from "./js/jsm/postprocessing/ShaderPass.js";
import { FilmPass } from './js/jsm/postprocessing/FilmPass.js';
import { SepiaShader } from './js/jsm/shaders/SepiaShader.js';
import { MaskPass, ClearMaskPass } from './js/jsm/postprocessing/MaskPass.js';
import { RenderPass } from './js/jsm/postprocessing/RenderPass.js';
import { TexturePass } from './js/jsm/postprocessing/TexturePass.js';
import { GammaCorrectionShader } from './js/jsm/shaders/GammaCorrectionShader.js';
import { VignetteShader } from '/js/jsm/shaders/VignetteShader.js';
import { ColorifyShader } from './js/jsm/shaders/ColorifyShader.js';


// setup physics engine
Physijs.scripts.worker = '/js/physijs_worker.js';
Physijs.scripts.ammo = '/js/ammo.js';

// public names
var crab, initScene, render, renderer, scene, camera, box, mixer;
var loader = new GLTFLoader();
var clock = new THREE.Clock();

initScene = (loaded_crab) => {


    crab = loaded_crab.scene.children[2];
    crab.name = "crab"

    renderer = create_renderer()
    scene = create_scene()
    scene.add(create_light())
    camera = create_camera()
    scene.add(camera);
    scene.add(create_floor())
    scene.add(create_building(4, 4, 4, 1))
    scene.add(create_player())
    scene.add(crab);

    for (let i = 0; i < 2; i++) {
        scene.add(
            create_building(randomInt(-25, 25),
                5,
                randomInt(-25, 25))
        )
    }



    //--- Animating crab model ---
    mixer = new THREE.AnimationMixer(crab);

    loaded_crab.animations.forEach((clip) => {

        if (clip.name == "Walk"){
            console.log("playing: ", clip)

            mixer.clipAction(clip).play();

        }

    });
    //---


    const test = create_building(0, 9, 0, 1)
    scene.add(test);

    test.addEventListener('collision', collision_handler);

    const controls = new OrbitControls(camera, renderer.domElement);
    requestAnimationFrame(render);
};

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

const collision_handler = (other_object, relative_velocity,
                           relative_rotation, contact_normal) => {

    if (other_object.name === 'player') {
        console.log(other_object);
        console.log(relative_velocity);
        console.log(relative_rotation);
        console.log(contact_normal);
        //other_object.world.remove(other_object);
        //other_object.material.color.setHex(0x0000ff);

        // TODO: give him some new material
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

        scene.add(base)
        scene.add(gravel)

        const geo = new THREE.BufferGeometry().setFromPoints(
            [
                point.position.x,
                point.position.y,
                point.position.z
            ])

    }


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

const create_player = () => {
    // --- BOX ---
    const colider_material = new Physijs.createMaterial(new
    THREE.MeshLambertMaterial({
        color: "red",
        wireframe: true
    }), 9, 0.2)
    const player_colider = new Physijs.BoxMesh(
        new THREE.CubeGeometry(5, 2, 5),
        colider_material
    );
    player_colider.name = "player";
    return player_colider;
}

const create_light = () => {
    const light = new THREE.AmbientLight(0xffffff); // soft white light
    return light;
}

const create_sky_box = () => {
    let skybox = new THREE.CubeTextureLoader().setPath('./files/skybox/').load([
        'px.png',
        'nx.png',
        'py.png',
        'ny.png',
        'pz.png',
        'nz.png'
    ]);
    return skybox;
}

const create_camera = () => {
    let camera = new THREE.PerspectiveCamera(
        35,
        window.innerWidth / window.innerHeight,
        1,
        1000
    );
    camera.position.set(60, 50, 60);
    camera.lookAt(scene.position);
    return camera;
}

const create_renderer = () => {
    let renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('viewport').appendChild(renderer.domElement);
    return renderer;
}

const create_scene = () => {
    let scene = new Physijs.Scene({fixedTimeStep: 1 / 60});
    // scene.background = create_sky_box()
    return scene;
}

const sync_player = () => {
    let crab = scene.getObjectByName('crab')
    if (crab != undefined) {
        let box = scene.getObjectByName('player');
        crab.position.x = box.position.x;
        crab.position.y = box.position.y;
        crab.position.z = box.position.z;
        crab.rotation.x = box.rotation.x;
        crab.rotation.y = box.rotation.y;
        crab.rotation.z = box.rotation.z;
    }
}

const add_sepia = () => {
    let renderScene, composerScene, composer3;

    const shaderSepia = SepiaShader;
    const shaderVignette = VignetteShader;
    const effectSepia = new ShaderPass(shaderSepia);
    effectSepia.uniforms["amount"].value = 0.9;

    const effectFilm = new FilmPass(0.35, 0.025, 648, false);
    const gammaCorrection = new ShaderPass(GammaCorrectionShader);
    const clearMask = new ClearMaskPass();
    const renderMask = new MaskPass(scene, camera);
    const renderMaskInverse = new MaskPass(scene, camera);
    const effectVignette = new ShaderPass(shaderVignette);
    renderMaskInverse.inverse = true;


    effectVignette.uniforms["offset"].value = 0.95;
    effectVignette.uniforms["darkness"].value = 1.6;

    const effectColorify1 = new ShaderPass(ColorifyShader);
    const effectColorify2 = new ShaderPass(ColorifyShader);
    effectColorify1.uniforms['color'] = new THREE.Uniform(new THREE.Color(1, 0.8, 0.8));
    effectColorify2.uniforms['color'] = new THREE.Uniform(new THREE.Color(1, 0.75, 0.5));

    const rtParameters = {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBFormat,
        stencilBuffer: true
    };

    const renderModel = new RenderPass(scene, camera);

    const rtWidth = window.innerWidth / 2;
    const rtHeight = window.innerHeight / 2;

    renderModel.clear = false;

    composerScene = new EffectComposer(renderer, new THREE.WebGLRenderTarget(rtWidth * 2, rtHeight * 2, rtParameters));

    composerScene.addPass(renderModel);
    composerScene.addPass(renderMaskInverse);
    composerScene.addPass(clearMask);

    renderScene = new TexturePass(composerScene.renderTarget2.texture);


    composer3 = new EffectComposer(renderer, new THREE.WebGLRenderTarget(rtWidth, rtHeight, rtParameters));

    composer3.addPass(renderScene);
    composer3.addPass(gammaCorrection);
    composer3.addPass(effectSepia);
    composer3.addPass(effectFilm);
    composer3.addPass(effectVignette);
    composer3.addPass(effectColorify1);
    composer3.addPass(effectColorify2);

    renderScene.uniforms["tDiffuse"].value = composerScene.renderTarget2.texture;
    return {
        composer3, composerScene
    }
}

render = () => {
    sync_player()

    // --- animacje crab ---
    let delta = clock.getDelta();
    if (mixer) mixer.update(delta);
    // ---

    scene.simulate(); //update physics
    renderer.render(scene, camera); // render the scene

    // --- sepia ---
    // let {composer3, composerScene} = add_sepia();
    // composerScene.render(0.01);
    // composer3.render(0.01);
    // ---

    requestAnimationFrame(render);
};

// that is the place where everything begins
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
