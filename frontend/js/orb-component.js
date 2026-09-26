/**
 * orb-component.js
 * Implements the high-fidelity Liquid Glass AI Orb
 * based on provided visual parameters.
 */

function createAIOrb(canvasEl) {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, canvasEl.clientWidth / canvasEl.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, alpha: true, antialias: true });
    renderer.setSize(canvasEl.clientWidth, canvasEl.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // Lighting to enhance the 'Glass' feel
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0x00e5ff, 1, 10);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    // Orb Geometry - Using a Sphere with Noise-like deformation
    // Since we are in vanilla Three.js without custom shaders, we use a
    // highly segmented sphere with a MeshPhysicalMaterial for the 'glass' look.
    const geometry = new THREE.SphereGeometry(1, 64, 64);
    const material = new THREE.MeshPhysicalMaterial({
        color: 0x82F4FF,
        metalness: 0.22,
        roughness: 0.22,
        transmission: 0.44, // Glass opacity
        thickness: 0.5,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        emissive: 0x956CFF,
        emissiveIntensity: 0.5
    });
    const orb = new THREE.Mesh(geometry, material);
    scene.add(orb);

    camera.position.z = 3;

    let time = 0;
    let state = 'idle'; // 'idle' | 'thinking'

    function setState(newState) {
        state = newState;
    }

    function animate() {
        requestAnimationFrame(animate);
        time += 0.01;

        // Simulate the "Liquid" movement by subtly scaling axes
        if (state === 'thinking') {
            const scaleX = 1 + Math.sin(time * 2) * 0.05;
            const scaleY = 1 + Math.cos(time * 1.5) * 0.05;
            const scaleZ = 1 + Math.sin(time * 1.8) * 0.05;
            orb.scale.set(scaleX, scaleY, scaleZ);
            material.emissiveIntensity = 0.5 + Math.sin(time * 3) * 0.3;
        } else {
            orb.scale.set(1, 1, 1);
            material.emissiveIntensity = 0.3;
        }

        orb.rotation.y += 0.005;
        renderer.render(scene, camera);
    }

    animate();

    return {
        setState: setState
    };
}

window.createAIOrb = createAIOrb;
