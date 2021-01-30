// controls
// ladowanie modelu craba
import {GLTFLoader} from "./js/loader.js";
import {OrbitControls} from "./js/controls.js";

//hello
// imports for sepia renderer pass
import {EffectComposer} from './js/jsm/postprocessing/EffectComposer.js';
import {ShaderPass} from "./js/jsm/postprocessing/ShaderPass.js";
import {FilmPass} from './js/jsm/postprocessing/FilmPass.js';
import {SepiaShader} from './js/jsm/shaders/SepiaShader.js';
import {ClearMaskPass, MaskPass} from './js/jsm/postprocessing/MaskPass.js';
import {RenderPass} from './js/jsm/postprocessing/RenderPass.js';
import {TexturePass} from './js/jsm/postprocessing/TexturePass.js';
import {GammaCorrectionShader} from './js/jsm/shaders/GammaCorrectionShader.js';
import {VignetteShader} from '/js/jsm/shaders/VignetteShader.js';
import {ColorifyShader} from './js/jsm/shaders/ColorifyShader.js';


// setup physics engine
Physijs.scripts.worker = '/js/physijs_worker.js';
Physijs.scripts.ammo = '/js/ammo.js';

// public names - everything with global scopes goes here defined with var
var g_crab, g_initScene, g_render, g_renderer, g_scene, g_camera, g_mixer, g_composerScene, g_composer;
var g_loader = new GLTFLoader();
var g_clock = new THREE.Clock();

// our setup
g_initScene = (loaded_crab) => {

    g_renderer = create_renderer()
    g_scene = create_scene()
    g_scene.add(create_light())
    g_camera = create_camera()
    g_scene.add(g_camera);
    g_scene.add(create_floor())
    g_scene.add(create_player())

    // --- config loaded model
    g_crab = loaded_crab.scene.children[2];
    g_crab.name = "crab"
    g_crab.castShadow = true;
    g_crab.reciveShadow = true;
    g_scene.add(g_crab);
    // ---

    g_scene.add(create_building(10, 10, 10, 1))
    g_scene.add(create_building(10, 10, -10, 1))
    g_scene.add(create_building(-10, 10, 10, 1))
    g_scene.add(create_building(-10, 10, -10, 1))


    // FIXME: that could be done much better but i cannot
    // think of the way rn
    let [comp, compScene] = add_sepia();
    g_composer = comp;
    g_composerScene = compScene;

    
    //--- Run all animations in model for now ---
    // FIXME: get it to another func
    g_mixer = new THREE.AnimationMixer(g_crab);
    loaded_crab.animations.forEach((clip) => {
        // we could check for animation name here
        if (clip.name == "[Akcja odłożona].004") {
            console.log("playing: ", clip)
            g_mixer.clipAction(clip).play();
        }
    });
    //---

    // FIXME: for now nothing bcs collison_handler does not work
    g_scene.getObjectByName('player').addEventListener('collision', () => {
    });

    // const controls = new OrbitControls(g_camera, g_renderer.domElement);
    requestAnimationFrame(g_render);
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
    var box = g_scene.getObjectByName('player');
    // jezeli zmieniamy pozycje muismy uzyc tkiego hacka
    box.__dirtyRotation = true;
    box.__dirtyPosition = true;
    // You may also want to cancel the object's velocity
    box.setLinearVelocity(new THREE.Vector3(0, 0, 0));
    box.setAngularVelocity(new THREE.Vector3(0, 0, 0));

    const offset = 0.2

    switch (key.code) {
        case "ArrowRight":
            box.position.x += offset;
            
            break;
        case "ArrowLeft":
            box.position.x -= offset;
            break;
        case "ArrowUp":
            box.position.z -= offset;
            break;
        case "ArrowDown":
            box.position.z += offset;
            break;
    }
    ;
    g_scene.simulate();
}

const randomInt = (min, max) => {
    return min + Math.floor((max - min) * Math.random());
}

// FIXME: for now there is shit going there dont use it
const collision_handler = (other_object, relative_velocity,
                           relative_rotation, contact_normal) => {
    return;
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

        g_scene.add(base)
        g_scene.add(gravel)

        const geo = new THREE.BufferGeometry().setFromPoints(
            [
                point.position.x,
                point.position.y,
                point.position.z
            ])

    }


}

// returns a box with configured textures
const create_building = (x, y, z, scale) => {
    // -- buildings --
    const texture = new THREE.TextureLoader().load("./files/building.jpg");
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);

    const build_material = Physijs.createMaterial(
        new THREE.MeshLambertMaterial({
            color: 0x00ff00,
            wireframe: false,
            map: texture
        }),
        1, // tarcie
        0.1) // bouncines

    const build = new Physijs.BoxMesh(
        new THREE.CubeGeometry(5 * scale, 10, 5 * scale),
        build_material,
        50,
        250 // im wieksze tym i guess ciezsze
    )


    build.position.set(x, y, z)
    build.castShadow = true;
    build.reciveShadow = true;
    console.log(build.position)
    return build;
}

// creates and configues base
// returns configured Physijs.Box without mass
const create_floor = () => {
    // --- FLOOR ---

    const texture = new THREE.TextureLoader().load("./files/ground.jpg");
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);


    const floor_material = new Physijs.createMaterial(
        new THREE.MeshStandardMaterial({
            color: 0x0000ff,
            map: texture
        }),
        1,
        0.1
    )
    const floor = new Physijs.BoxMesh(
        new THREE.BoxGeometry(100, 1, 100),
        floor_material,
        0, 0
    )
    floor.receiveShadow = true;
    return floor;
}

// FIXME: not used bcs when building splits it shoots into space
//  returns an arr of new obj adding up to old obj
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
    const colider_material = new Physijs.createMaterial(
        new THREE.MeshLambertMaterial({
            color: "red",
            wireframe: true
        }), 9, 0.2)
    const player_colider = new Physijs.BoxMesh(
        new THREE.CubeGeometry(5, 2, 5),
        colider_material
    );
    player_colider.name = "player";
    player_colider.position.set(+20, 12, +20)
    return player_colider;
}

const create_light = () => {
    // const light = new THREE.AmbientLight(0xffffff); // soft white light
    const light = new THREE.PointLight(0xaaaaaa, 1, 1000);
    light.position.set(0, 50, 0);

    light.castShadow = true;
    light.shadowDarkness = 0.5;
    light.shadowCameraVisible = true;
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
    camera.position.set(60, 100, 60);
    camera.lookAt(g_scene.position);
    return camera;
}

const create_renderer = () => {
    let renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('viewport').appendChild(renderer.domElement);
    renderer.shadowMap.enabled = true;
    return renderer;
}

const create_scene = () => {
    let scene = new Physijs.Scene({fixedTimeStep: 1 / 60});
    scene.background = new THREE.Color(0x444444);
    // scene.background = create_sky_box()

    return scene;
}

const sync_player = () => {
    let crab = g_scene.getObjectByName('crab')
    if (crab != undefined) {
        let box = g_scene.getObjectByName('player');
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
    const renderMask = new MaskPass(g_scene, g_camera);
    const renderMaskInverse = new MaskPass(g_scene, g_camera);
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

    const renderModel = new RenderPass(g_scene, g_camera);

    const rtWidth = window.innerWidth / 2;
    const rtHeight = window.innerHeight / 2;

    renderModel.clear = false;

    composerScene = new EffectComposer(g_renderer, new THREE.WebGLRenderTarget(rtWidth * 2, rtHeight * 2, rtParameters));

    composerScene.addPass(renderModel);
    composerScene.addPass(renderMaskInverse);
    composerScene.addPass(clearMask);

    renderScene = new TexturePass(composerScene.renderTarget2.texture);


    composer3 = new EffectComposer(g_renderer, new THREE.WebGLRenderTarget(rtWidth, rtHeight, rtParameters));

    composer3.addPass(renderScene);
    composer3.addPass(gammaCorrection);
    composer3.addPass(effectSepia);
    composer3.addPass(effectFilm);
    composer3.addPass(effectVignette);
    composer3.addPass(effectColorify1);
    composer3.addPass(effectColorify2);

    renderScene.uniforms["tDiffuse"].value = composerScene.renderTarget2.texture;
    return [
        composer3, composerScene
    ]
}

const sync_camera = () => {
    let player = g_scene.getObjectByName('player')

    g_camera.position.set(
        player.position.x + 12,
        player.position.y + 2.5,
        player.position.z + 12,
    )
    g_camera.lookAt(player.position)
}

const update_animation = () => {
    // --- animacje crab ---
    let delta = g_clock.getDelta();
    if (g_mixer) g_mixer.update(delta);
    // ---
}

const apply_sepia = () => {
    if (g_composerScene) {
        // --- sepia ---
        g_composerScene.render(0.01);
        g_composer.render(0.01);
        // ---
    }
}

// our game loop
g_render = () => {
    sync_player()
    sync_camera() // neds to be below sync_player()

    update_animation()

    g_scene.simulate(); //update physics

    g_renderer.render(g_scene, g_camera); // render the scene


    apply_sepia() // neds to be below renderer

    requestAnimationFrame(g_render);
};

// that is the place where everything begins
g_loader.load(
    "./files/crab.glb",
    g_initScene,
    (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
    },
    (err) => {
        console.log("An error happened", err);
    }
);
