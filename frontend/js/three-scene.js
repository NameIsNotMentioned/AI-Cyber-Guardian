(function() {
    let loaderHidden = false;
    function hideWebglLoader() {
        if (loaderHidden) return;
        loaderHidden = true;
        const loader = document.getElementById('webgl-loader');
        if (loader) loader.classList.add('is-hidden');
    }
    document.addEventListener('DOMContentLoaded', () => setTimeout(hideWebglLoader, 4000));
    // 1. Hero Canvas Scene on index.html
    document.addEventListener('DOMContentLoaded', () => {
        const heroCanvas = document.getElementById('hero-canvas');
        if (heroCanvas && window.THREE) {
            initHeroScene(heroCanvas);
        }
    });

    function initHeroScene(canvas) {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
        camera.position.z = 5;

        const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.matchMedia('(max-width: 768px)').matches ? 1.25 : 1.75));

        // Core Glowing Mesh (Cyber Icosahedron)
        const geometry = new THREE.IcosahedronGeometry(2, 2);
        const wireframeMaterial = new THREE.MeshBasicMaterial({
            color: 0x66877e,
            wireframe: true,
            transparent: true,
            opacity: 0.35
        });
        const globe = new THREE.Mesh(geometry, wireframeMaterial);
        scene.add(globe);

        // Particle Points
        const particlesCount = window.matchMedia('(max-width: 768px)').matches ? 90 : 220;
        const positions = new Float32Array(particlesCount * 3);
        for (let i = 0; i < particlesCount * 3; i += 3) {
            const radius = 2.4 + Math.random() * 0.8;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            positions[i] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i + 2] = radius * Math.cos(phi);
        }
        const particlesGeometry = new THREE.BufferGeometry();
        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const particlesMaterial = new THREE.PointsMaterial({
            color: 0x66877e,
            size: 0.04,
            transparent: true,
            opacity: 0.22
        });
        const particles = new THREE.Points(particlesGeometry, particlesMaterial);
        scene.add(particles);

        // Ambient Light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        // Mouse interaction
        let mouseX = 0, mouseY = 0;
        window.addEventListener('mousemove', (e) => {
            mouseX = (e.clientX / window.innerWidth - 0.5) * 0.5;
            mouseY = (e.clientY / window.innerHeight - 0.5) * 0.5;
        });

        // Window resize
        window.addEventListener('resize', () => {
            if (!canvas.parentElement) return;
            const width = canvas.parentElement.clientWidth || window.innerWidth;
            const height = canvas.parentElement.clientHeight || window.innerHeight;
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
        });

        // Animation Loop
        let clock = new THREE.Clock();
        function animate() {
            requestAnimationFrame(animate);
            const elapsedTime = clock.getElapsedTime();

            globe.rotation.y = elapsedTime * 0.15;
            globe.rotation.x = elapsedTime * 0.08;
            particles.rotation.y = -elapsedTime * 0.1;

            camera.position.x += (mouseX - camera.position.x) * 0.05;
            camera.position.y += (-mouseY - camera.position.y) * 0.05;
            camera.lookAt(scene.position);

            renderer.render(scene, camera);
            hideWebglLoader();
        }
        animate();
    }

    // 2. Guardian Shield 3D Component for scanner.html
    window.createGuardianShield = function(canvas) {
        if (!canvas || !window.THREE) {
            return {
                setState: function(state) { console.log('Shield state:', state); }
            };
        }

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
        camera.position.z = 4.2;

        const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.matchMedia('(max-width: 768px)').matches ? 1.25 : 1.75));

        // Colors
        const colors = {
            idle: 0x66877e,
            scanning: 0x66877e,
            safe: 0x55745b,
            suspicious: 0xa27b38,
            dangerous: 0xa85349
        };

        // Outer Wireframe Shield
        const outerGeo = new THREE.IcosahedronGeometry(1.6, 1);
        const outerMat = new THREE.MeshBasicMaterial({
            color: colors.idle,
            wireframe: true,
            transparent: true,
            opacity: 0.6
        });
        const outerShield = new THREE.Mesh(outerGeo, outerMat);
        scene.add(outerShield);

        // Inner Core Octahedron
        const innerGeo = new THREE.OctahedronGeometry(1.0, 0);
        const innerMat = new THREE.MeshBasicMaterial({
            color: colors.idle,
            wireframe: true,
            transparent: true,
            opacity: 0.4
        });
        const innerCore = new THREE.Mesh(innerGeo, innerMat);
        scene.add(innerCore);

        let currentState = 'idle';
        let speed = 0.015;

        function animateShield() {
            requestAnimationFrame(animateShield);

            if (currentState === 'scanning') {
                outerShield.rotation.y += 0.06;
                outerShield.rotation.x += 0.04;
                innerCore.rotation.y -= 0.08;
                const scale = 1 + Math.sin(Date.now() * 0.008) * 0.1;
                outerShield.scale.set(scale, scale, scale);
            } else {
                outerShield.rotation.y += speed;
                outerShield.rotation.x += speed * 0.5;
                innerCore.rotation.y -= speed * 0.7;
                outerShield.scale.set(1, 1, 1);
            }

            renderer.render(scene, camera);
            hideWebglLoader();
        }
        animateShield();

        return {
            setState: function(state) {
                currentState = state;
                const hex = colors[state] || colors.idle;
                outerMat.color.setHex(hex);
                innerMat.color.setHex(hex);
                if (state === 'scanning') {
                    speed = 0.08;
                } else if (state === 'dangerous') {
                    speed = 0.035;
                } else {
                    speed = 0.015;
                }
            }
        };
    };
    // Override the initial placeholder with the stateful, lit Guardian Shield.
    window.createGuardianShield = function(canvas) {
        if (!canvas || !window.THREE) return { setState: function() {} };
        const width = canvas.clientWidth || 220;
        const height = canvas.clientHeight || 220;
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
        camera.position.z = 4.2;
        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.matchMedia('(max-width: 768px)').matches ? 1.25 : 1.75));

        const states = {
            idle: { color: 0x66877e, label: 'SECURE' },
            scanning: { color: 0x66877e, label: 'SCANNING...' },
            safe: { color: 0x55745b, label: '\u2713 SAFE' },
            suspicious: { color: 0xa27b38, label: '\u26a0 WARNING' },
            dangerous: { color: 0xa85349, label: '\u26a0 THREAT' }
        };
        scene.add(new THREE.AmbientLight(0xd8dfd2, 1.1));
        const pointLight = new THREE.PointLight(states.idle.color, 2.2, 12);
        pointLight.position.set(2, 2, 4);
        scene.add(pointLight);

        // Replace this placeholder with GLTFLoader.load(...) when the shield model is ready.
        const material = new THREE.MeshStandardMaterial({ color: states.idle.color, emissive: states.idle.color, emissiveIntensity: 0.38, metalness: 0.35, roughness: 0.38, wireframe: true, transparent: true, opacity: 0.65 });
        const shield = new THREE.Mesh(new THREE.IcosahedronGeometry(1.45, 1), material);
        scene.add(shield);
        const coreMaterial = new THREE.MeshStandardMaterial({ color: states.idle.color, emissive: states.idle.color, emissiveIntensity: 0.25, metalness: 0.3, roughness: 0.4, wireframe: true, transparent: true, opacity: 0.45 });
        const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.72), coreMaterial);
        scene.add(core);
        const label = canvas.parentElement && canvas.parentElement.querySelector('.shield-state-label');
        let state = 'idle';
        let stateStartedAt = performance.now();
        if (label) label.textContent = states.idle.label;

        const resize = () => {
            const w = canvas.clientWidth || width, h = canvas.clientHeight || height;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };
        window.addEventListener('resize', resize);

        function animateShield() {
            requestAnimationFrame(animateShield);
            const now = performance.now(), elapsed = (now - stateStartedAt) / 1000;
            const dangerous = state === 'dangerous', scanning = state === 'scanning';
            const speed = scanning ? 0.055 : dangerous ? 0.035 : 0.012;
            const pulse = scanning || dangerous ? 0.8 + 0.5 * (0.5 + 0.5 * Math.sin(now * (dangerous ? 0.013 : 0.006))) : 0.8;
            const shake = dangerous ? Math.sin(now * 0.045) * 0.07 : state === 'suspicious' ? Math.sin(now * 0.025) * 0.025 : 0;
            const pop = state === 'safe' && elapsed < 0.45 ? 1 + 0.18 * Math.sin(elapsed / 0.45 * Math.PI) : 1;
            shield.rotation.y += speed;
            shield.rotation.x += speed * 0.45;
            shield.position.x = shake;
            shield.scale.setScalar(pop);
            core.rotation.y -= speed * 1.4;
            core.rotation.x += speed * 0.65;
            material.emissiveIntensity = pulse;
            coreMaterial.emissiveIntensity = pulse * 0.6;
            if (scanning && label) label.textContent = 'SCANNING' + '.'.repeat(1 + Math.floor(now / 350) % 3);
            renderer.render(scene, camera);
            hideWebglLoader();
        }
        animateShield();

        return {
            setState(next) {
                if (!states[next]) return;
                state = next;
                stateStartedAt = performance.now();
                const color = states[next].color;
                material.color.setHex(color);
                material.emissive.setHex(color);
                coreMaterial.color.setHex(color);
                coreMaterial.emissive.setHex(color);
                pointLight.color.setHex(color);
                if (label) label.textContent = states[next].label;
            }
        };
    };
})();
