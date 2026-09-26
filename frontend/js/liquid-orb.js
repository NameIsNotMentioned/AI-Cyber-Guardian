/**
 * Liquid Glass Orb Component
 * Inspired by https://lersent001.github.io/orb/
 * Preset: orb-glass-liquid (Siri style multi-ribbon liquid fluid glass orb)
 */

(function(window) {
    const DEFAULT_CONFIG = {
        effect: 'orb-glass-liquid',
        style: 'siri',
        glass: 1,
        state: 'thinking',
        speed: 0.82,
        idleSpeed: 0.246,
        radius: 0.72,
        zoom: 0.36,
        warp: 3.2,
        idleWarp: 1.664,
        ribbonCount: 5,
        ribbonWidth: 0.42,
        ribbonTwist: 1.25,
        ribbonFold: 0.55,
        ribbonBreath: 0.3,
        chromaticShift: 0.42,
        particleDensity: 0.72,
        particleBloom: 0.7,
        glassOpacity: 0.44,
        shellMidAlpha: 0.18,
        shellEdgeAlpha: 0.18,
        // Colors from preset
        colorA: [1.0, 0.847, 0.42],    // #FFD86B Warm liquid gold
        colorB: [0.51, 0.957, 1.0],    // #82F4FF Azure cyan
        colorC: [1.0, 0.482, 0.835],   // #FF7BD5 Hot pink
        colorD: [0.557, 0.424, 1.0],   // #8E6CFF Violet purple
        shellMid: [0.608, 0.957, 1.0], // #9BF4FF
        shellEdge: [0.773, 0.663, 1.0],// #C5A9FF
        glowColor: [0.584, 0.424, 1.0],// #956CFF
        highlightColor: [1.0, 1.0, 1.0]
    };

    const STATE_PALETTES = {
        idle: {
            speed: 0.25,
            warp: 1.66,
            colorA: [0.71, 0.65, 0.45],  // Soft gold
            colorB: [0.37, 0.53, 0.58],  // Muted cyan
            colorC: [0.60, 0.39, 0.54],  // Muted magenta
            colorD: [0.39, 0.36, 0.54],  // Muted violet
            glowColor: [0.42, 0.41, 0.56],
            label: "Cyber Guardian Active"
        },
        thinking: {
            speed: 0.82,
            warp: 3.2,
            colorA: [1.0, 0.847, 0.42],   // #FFD86B
            colorB: [0.51, 0.957, 1.0],   // #82F4FF
            colorC: [1.0, 0.482, 0.835],  // #FF7BD5
            colorD: [0.557, 0.424, 1.0],  // #8E6CFF
            glowColor: [0.584, 0.424, 1.0],
            label: "Thinking..."
        },
        scanning: {
            speed: 0.95,
            warp: 3.8,
            colorA: [0.2, 0.9, 1.0],
            colorB: [1.0, 0.85, 0.3],
            colorC: [1.0, 0.3, 0.8],
            colorD: [0.6, 0.3, 1.0],
            glowColor: [0.0, 0.9, 1.0],
            label: "Analyzing Heuristics..."
        },
        safe: {
            speed: 0.35,
            warp: 1.8,
            colorA: [0.0, 1.0, 0.53],     // Emerald
            colorB: [0.2, 0.95, 1.0],     // Cyan
            colorC: [0.4, 1.0, 0.7],      // Mint
            colorD: [0.1, 0.8, 0.9],      // Teal
            glowColor: [0.0, 1.0, 0.53],
            label: "VERDICT: SECURE"
        },
        suspicious: {
            speed: 0.65,
            warp: 2.8,
            colorA: [1.0, 0.85, 0.1],     // Gold
            colorB: [1.0, 0.6, 0.0],      // Amber
            colorC: [1.0, 0.45, 0.1],     // Orange
            colorD: [0.9, 0.75, 0.2],     // Yellow
            glowColor: [1.0, 0.75, 0.1],
            label: "VERDICT: SUSPICIOUS"
        },
        dangerous: {
            speed: 1.1,
            warp: 4.2,
            colorA: [1.0, 0.0, 0.33],     // Crimson red #FF0055
            colorB: [1.0, 0.2, 0.6],      // Hot magenta
            colorC: [0.8, 0.0, 0.2],      // Deep blood red
            colorD: [0.6, 0.0, 0.5],      // Dark purple
            glowColor: [1.0, 0.0, 0.33],
            label: "VERDICT: DANGEROUS"
        }
    };

    function hexToRgb(hex) {
        let clean = hex.replace('#', '');
        if (clean.length === 3) clean = clean.split('').map(c => c + c).join('');
        const num = parseInt(clean, 16);
        return [(num >> 16 & 255) / 255, (num >> 8 & 255) / 255, (num & 255) / 255];
    }

    class LiquidOrb {
        constructor(canvas, options = {}) {
            this.canvas = canvas;
            this.config = Object.assign({}, DEFAULT_CONFIG, options);
            this.currentState = this.config.state || 'idle';
            this.time = 0;
            this.mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
            this.currentSpeed = this.config.speed;
            this.currentWarp = this.config.warp;
            this.currentColorA = [...this.config.colorA];
            this.currentColorB = [...this.config.colorB];
            this.currentColorC = [...this.config.colorC];
            this.currentColorD = [...this.config.colorD];
            this.currentGlow = [...this.config.glowColor];

            this.initGL();
            if (this.gl) {
                this.bindEvents();
                this.animate = this.animate.bind(this);
                this.animFrameId = requestAnimationFrame(this.animate);
            }
        }

        initGL() {
            const gl = this.canvas.getContext('webgl', { alpha: true, antialias: true }) ||
                       this.canvas.getContext('experimental-webgl');
            if (!gl) {
                console.warn('WebGL not supported, falling back to 2D liquid orb');
                this.initFallback2D();
                return;
            }
            this.gl = gl;

            const vsSource = `
                attribute vec2 position;
                varying vec2 vUv;
                void main() {
                    vUv = (position + 1.0) * 0.5;
                    gl_Position = vec4(position, 0.0, 1.0);
                }
            `;

            // Custom multi-ribbon liquid fluid glass fragment shader matching lersent001 orb
            const fsSource = `
                precision highp float;
                varying vec2 vUv;
                uniform vec2 uResolution;
                uniform float uTime;
                uniform vec2 uMouse;
                uniform float uSpeed;
                uniform float uWarp;
                uniform float uRadius;
                uniform vec3 uColorA;
                uniform vec3 uColorB;
                uniform vec3 uColorC;
                uniform vec3 uColorD;
                uniform vec3 uGlowColor;
                uniform float uChromaticShift;

                // 3D Simplex noise approximation
                vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
                vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

                float snoise(vec3 v){
                    const vec2  C = vec2(1.0/6.0, 1.0/3.0);
                    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
                    vec3 i  = floor(v + dot(v, C.yyy));
                    vec3 x0 = v - i + dot(i, C.xxx);
                    vec3 g = step(x0.yzx, x0.xyz);
                    vec3 l = 1.0 - g;
                    vec3 i1 = min(g.xyz, l.zxy);
                    vec3 i2 = max(g.xyz, l.zxy);
                    vec3 x1 = x0 - i1 + 1.0 * C.xxx;
                    vec3 x2 = x0 - i2 + 2.0 * C.xxx;
                    vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
                    i = mod(i, 289.0);
                    vec4 p = permute(permute(permute(
                        i.z + vec4(0.0, i1.z, i2.z, 1.0))
                        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                        + i.x + vec4(0.0, i1.x, i2.x, 1.0));
                    float n_ = 0.142857142857;
                    vec3  ns = n_ * D.wyz - D.xzx;
                    vec4 j = p - 49.0 * floor(p * ns.z *ns.z);
                    vec4 x_ = floor(j * ns.z);
                    vec4 y_ = floor(j - 7.0 * x_);
                    vec4 x = x_ *ns.x + ns.yyyy;
                    vec4 y = y_ *ns.x + ns.yyyy;
                    vec4 h = 1.0 - abs(x) - abs(y);
                    vec4 b0 = vec4(x.xy, y.xy);
                    vec4 b1 = vec4(x.zw, y.zw);
                    vec4 s0 = floor(b0)*2.0 + 1.0;
                    vec4 s1 = floor(b1)*2.0 + 1.0;
                    vec4 sh = -step(h, vec4(0.0));
                    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
                    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
                    vec3 p0 = vec3(a0.xy, h.x);
                    vec3 p1 = vec3(a0.zw, h.y);
                    vec3 p2 = vec3(a1.xy, h.z);
                    vec3 p3 = vec3(a1.zw, h.w);
                    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
                    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
                    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
                    m = m * m;
                    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
                }

                void main() {
                    vec2 aspect = vec2(uResolution.x / min(uResolution.x, uResolution.y),
                                       uResolution.y / min(uResolution.x, uResolution.y));
                    vec2 uv = (vUv - 0.5) * aspect * 2.0;

                    // Mouse tilt distortion
                    uv += uMouse * 0.12;

                    float dist = length(uv);
                    float r = dist / uRadius;

                    // Volumetric Aura Glow outside sphere
                    float aura = exp(-pow(max(0.0, r - 0.85), 1.3) * 7.0) * 0.65;
                    vec3 finalColor = uGlowColor * aura * 0.6;

                    if (r <= 1.0) {
                        // Sphere surface normal & depth
                        float z = sqrt(max(0.0, 1.0 - r * r));
                        vec3 normal = vec3(uv / uRadius, z);
                        vec3 viewDir = vec3(0.0, 0.0, 1.0);

                        // Physical Fresnel rim equation
                        float fresnel = pow(1.0 - dot(normal, viewDir), 2.8);

                        // Glass Refraction angle with chromatic aberration
                        vec2 refractR = uv + normal.xy * (0.09 + uChromaticShift * 0.05);
                        vec2 refractG = uv + normal.xy * 0.09;
                        vec2 refractB = uv + normal.xy * (0.09 - uChromaticShift * 0.05);

                        // Sample intertwined helical liquid ribbons (5 ribbons)
                        vec3 ribbonAccum = vec3(0.0);
                        float t = uTime * uSpeed;

                        for (int i = 0; i < 5; i++) {
                            float fi = float(i);
                            float phase = fi * 1.2566 + t * 0.4;
                            
                            // Multi-octave fluid ribbon coordinate
                            vec3 pRibbon = vec3(refractG * (2.2 + sin(phase)*0.3), z * 1.5 + phase);
                            float noiseVal = snoise(pRibbon * 1.4 + vec3(0.0, 0.0, t * 0.6)) * uWarp;
                            
                            // Ribbon intensity field
                            float ribbonDist = abs(sin(refractG.y * 3.5 + noiseVal + phase) * 0.5 + refractG.x * 0.8);
                            float ribbonAlpha = smoothstep(0.42, 0.0, ribbonDist);

                            // Dynamic color blending between the 4 preset palette colors
                            float blend = clamp(sin(phase + fi * 0.8) * 0.5 + 0.5, 0.0, 1.0);
                            vec3 col = mix(mix(uColorA, uColorB, blend), mix(uColorC, uColorD, blend), cos(phase * 0.7) * 0.5 + 0.5);

                            ribbonAccum += col * ribbonAlpha * 0.75;
                        }

                        // Chromatic shift edge fringing
                        float fringeR = snoise(vec3(refractR * 2.5, t)) * 0.3;
                        float fringeB = snoise(vec3(refractB * 2.5, t)) * 0.3;
                        ribbonAccum.r += fringeR * 0.35;
                        ribbonAccum.b += fringeB * 0.35;

                        // Glass outer shell reflections & specular highlight
                        vec3 lightDir = normalize(vec3(0.6, 0.8, 1.2));
                        vec3 halfVec = normalize(lightDir + viewDir);
                        float specular = pow(max(dot(normal, halfVec), 0.0), 32.0) * 0.85;

                        // Secondary soft rim light
                        vec3 rimLight = normalize(vec3(-0.8, -0.6, 0.5));
                        float rimSpec = pow(max(dot(normal, rimLight), 0.0), 16.0) * 0.35;

                        // Composite interior ribbons with refractive glass shell
                        vec3 glassBody = ribbonAccum * 1.2;
                        vec3 glassEdge = mix(vec3(0.77, 0.66, 1.0), vec3(1.0), fresnel * 0.5);

                        finalColor = mix(glassBody, glassEdge, fresnel * 0.55);
                        finalColor += vec3(1.0) * specular;
                        finalColor += uGlowColor * rimSpec;

                        // Inner core density
                        float coreSoftness = smoothstep(1.0, 0.96, r);
                        finalColor *= coreSoftness;
                    }

                    // Soft vignette on edge of canvas
                    float edgeAlpha = clamp(length(finalColor) * 1.4, 0.0, 1.0);
                    gl_FragColor = vec4(finalColor, edgeAlpha);
                }
            `;

            const vs = this.createShader(gl.VERTEX_SHADER, vsSource);
            const fs = this.createShader(gl.FRAGMENT_SHADER, fsSource);
            this.program = gl.createProgram();
            gl.attachShader(this.program, vs);
            gl.attachShader(this.program, fs);
            gl.linkProgram(this.program);

            if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
                console.error('Shader link error:', gl.getProgramInfoLog(this.program));
                return;
            }

            // Screen Quad Geometry
            const quadVertices = new Float32Array([
                -1, -1,
                 1, -1,
                -1,  1,
                -1,  1,
                 1, -1,
                 1,  1,
            ]);

            this.quadBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

            this.locs = {
                position: gl.getAttribLocation(this.program, 'position'),
                uResolution: gl.getUniformLocation(this.program, 'uResolution'),
                uTime: gl.getUniformLocation(this.program, 'uTime'),
                uMouse: gl.getUniformLocation(this.program, 'uMouse'),
                uSpeed: gl.getUniformLocation(this.program, 'uSpeed'),
                uWarp: gl.getUniformLocation(this.program, 'uWarp'),
                uRadius: gl.getUniformLocation(this.program, 'uRadius'),
                uColorA: gl.getUniformLocation(this.program, 'uColorA'),
                uColorB: gl.getUniformLocation(this.program, 'uColorB'),
                uColorC: gl.getUniformLocation(this.program, 'uColorC'),
                uColorD: gl.getUniformLocation(this.program, 'uColorD'),
                uGlowColor: gl.getUniformLocation(this.program, 'uGlowColor'),
                uChromaticShift: gl.getUniformLocation(this.program, 'uChromaticShift'),
            };

            this.resize();
        }

        createShader(type, src) {
            const gl = this.gl;
            const shader = gl.createShader(type);
            gl.shaderSource(shader, src);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error('Shader compile error:', gl.getShaderInfoLog(shader));
            }
            return shader;
        }

        bindEvents() {
            window.addEventListener('resize', () => this.resize());
            window.addEventListener('mousemove', (e) => {
                const rect = this.canvas.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width - 0.5;
                const y = -((e.clientY - rect.top) / rect.height - 0.5);
                this.mouse.targetX = Math.max(-0.5, Math.min(0.5, x));
                this.mouse.targetY = Math.max(-0.5, Math.min(0.5, y));
            });
        }

        resize() {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const w = this.canvas.clientWidth || 300;
            const h = this.canvas.clientHeight || 300;
            this.canvas.width = Math.floor(w * dpr);
            this.canvas.height = Math.floor(h * dpr);
            if (this.gl) {
                this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
            }
        }

        setState(stateName, customLabel) {
            const palette = STATE_PALETTES[stateName] || STATE_PALETTES.idle;
            this.currentState = stateName;
            this.targetSpeed = palette.speed;
            this.targetWarp = palette.warp;
            this.targetColorA = [...palette.colorA];
            this.targetColorB = [...palette.colorB];
            this.targetColorC = [...palette.colorC];
            this.targetColorD = [...palette.colorD];
            this.targetGlow = [...palette.glowColor];

            if (this.labelElement) {
                this.labelElement.innerText = customLabel || palette.label;
            }
        }

        attachLabel(element) {
            this.labelElement = element;
            if (this.labelElement) {
                const palette = STATE_PALETTES[this.currentState] || STATE_PALETTES.idle;
                this.labelElement.innerText = palette.label;
            }
        }

        lerp(a, b, t) {
            return a + (b - a) * t;
        }

        lerpVec3(a, b, t) {
            return [this.lerp(a[0], b[0], t), this.lerp(a[1], b[1], t), this.lerp(a[2], b[2], t)];
        }

        animate(timestamp) {
            this.animFrameId = requestAnimationFrame(this.animate);
            this.time += 0.016;

            // Smooth state transitions
            if (this.targetSpeed !== undefined) {
                this.currentSpeed = this.lerp(this.currentSpeed, this.targetSpeed, 0.05);
                this.currentWarp = this.lerp(this.currentWarp, this.targetWarp, 0.05);
                this.currentColorA = this.lerpVec3(this.currentColorA, this.targetColorA, 0.05);
                this.currentColorB = this.lerpVec3(this.currentColorB, this.targetColorB, 0.05);
                this.currentColorC = this.lerpVec3(this.currentColorC, this.targetColorC, 0.05);
                this.currentColorD = this.lerpVec3(this.currentColorD, this.targetColorD, 0.05);
                this.currentGlow = this.lerpVec3(this.currentGlow, this.targetGlow, 0.05);
            }

            // Mouse lerp
            this.mouse.x = this.lerp(this.mouse.x, this.mouse.targetX, 0.08);
            this.mouse.y = this.lerp(this.mouse.y, this.mouse.targetY, 0.08);

            const gl = this.gl;
            if (!gl) return;

            gl.clearColor(0.0, 0.0, 0.0, 0.0);
            gl.clear(gl.COLOR_BUFFER_BIT);

            gl.useProgram(this.program);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
            gl.enableVertexAttribArray(this.locs.position);
            gl.vertexAttribPointer(this.locs.position, 2, gl.FLOAT, false, 0, 0);

            gl.uniform2f(this.locs.uResolution, this.canvas.width, this.canvas.height);
            gl.uniform1f(this.locs.uTime, this.time);
            gl.uniform2f(this.locs.uMouse, this.mouse.x, this.mouse.y);
            gl.uniform1f(this.locs.uSpeed, this.currentSpeed);
            gl.uniform1f(this.locs.uWarp, this.currentWarp);
            gl.uniform1f(this.locs.uRadius, this.config.radius);
            gl.uniform1f(this.locs.uChromaticShift, this.config.chromaticShift);

            gl.uniform3fv(this.locs.uColorA, this.currentColorA);
            gl.uniform3fv(this.locs.uColorB, this.currentColorB);
            gl.uniform3fv(this.locs.uColorC, this.currentColorC);
            gl.uniform3fv(this.locs.uColorD, this.currentColorD);
            gl.uniform3fv(this.locs.uGlowColor, this.currentGlow);

            gl.drawArrays(gl.TRIANGLES, 0, 6);
        }

        initFallback2D() {
            // High-fidelity Canvas 2D fallback for devices without WebGL
            const ctx = this.canvas.getContext('2d');
            const render = () => {
                requestAnimationFrame(render);
                this.time += 0.03;
                const w = this.canvas.width = this.canvas.clientWidth || 300;
                const h = this.canvas.height = this.canvas.clientHeight || 300;
                ctx.clearRect(0, 0, w, h);

                const cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.36;

                // Outer Aura
                const glowGrad = ctx.createRadialGradient(cx, cy, r * 0.7, cx, cy, r * 1.4);
                glowGrad.addColorStop(0, 'rgba(142, 108, 255, 0.45)');
                glowGrad.addColorStop(1, 'rgba(142, 108, 255, 0)');
                ctx.fillStyle = glowGrad;
                ctx.beginPath();
                ctx.arc(cx, cy, r * 1.4, 0, Math.PI * 2);
                ctx.fill();

                // Liquid Ribbon Rings
                for (let i = 0; i < 5; i++) {
                    ctx.save();
                    ctx.translate(cx, cy);
                    ctx.rotate(this.time * 0.6 + (i * Math.PI / 2.5));
                    ctx.beginPath();
                    ctx.ellipse(0, 0, r * 0.9, r * (0.35 + Math.sin(this.time + i) * 0.15), 0, 0, Math.PI * 2);
                    const grad = ctx.createLinearGradient(-r, 0, r, 0);
                    grad.addColorStop(0, '#FFD86B');
                    grad.addColorStop(0.33, '#82F4FF');
                    grad.addColorStop(0.66, '#FF7BD5');
                    grad.addColorStop(1.0, '#8E6CFF');
                    ctx.strokeStyle = grad;
                    ctx.lineWidth = 14;
                    ctx.globalAlpha = 0.55;
                    ctx.stroke();
                    ctx.restore();
                }

                // Glass Rim
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.lineWidth = 3;
                ctx.stroke();
            };
            render();
        }
    }

    // Global Factory
    window.createLiquidOrb = function(canvas, options) {
        return new LiquidOrb(canvas, options);
    };

})(window);
