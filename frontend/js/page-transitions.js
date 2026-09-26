/**
 * Page Transitions & Liquid Glass UI Enhancements
 * Powered by Anime.js & Liquid Glass Refraction
 */

(function(window) {
    // Universal Anime.js v3/v4 bridge
    function runAnime(params) {
        if (typeof window.anime === 'function') {
            return window.anime(params);
        } else if (window.anime && typeof window.anime.animate === 'function') {
            const { targets, ...rest } = params;
            return window.anime.animate(targets, rest);
        } else {
            console.warn('Anime.js not loaded, executing callback immediately');
            if (params.complete) params.complete();
        }
    }

    // Insert SVG Displacement Filters for Liquid Glass refraction
    function injectSvgFilters() {
        if (document.getElementById('liquid-glass-svg-defs')) return;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.id = 'liquid-glass-svg-defs';
        svg.setAttribute('style', 'position: absolute; width: 0; height: 0; pointer-events: none; overflow: hidden;');
        svg.innerHTML = `
            <defs>
                <!-- Real DOM Refraction Filter matching glass.samasante.com -->
                <filter id="liquid-glass-refract" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
                    <feTurbulence type="fractalNoise" baseFrequency="0.012 0.012" numOctaves="2" result="noise" seed="42" />
                    <feDisplacementMap in="SourceGraphic" in2="noise" scale="14" xChannelSelector="R" yChannelSelector="G" result="displaced" />
                    <feGaussianBlur in="displaced" stdDeviation="0.4" result="blurred" />
                    <feSpecularLighting in="noise" surfaceScale="2" specularConstant="1.2" specularExponent="20" lighting-color="#ffffff" result="specular">
                        <fePointLight x="100" y="-80" z="220" />
                    </feSpecularLighting>
                    <feComposite in="specular" in2="displaced" operator="in" result="specularOut" />
                    <feBlend in="blurred" in2="specularOut" mode="screen" />
                </filter>
            </defs>
        `;
        document.body.appendChild(svg);
    }

    // Transition Overlays
    function injectTransitionOverlays() {
        if (!document.getElementById('page-transition-curtain')) {
            const curtain = document.createElement('div');
            curtain.id = 'page-transition-curtain';
            document.body.appendChild(curtain);
        }
        if (!document.getElementById('page-transition-liquid-wipe')) {
            const wipe = document.createElement('div');
            wipe.id = 'page-transition-liquid-wipe';
            document.body.appendChild(wipe);
        }
    }

    // Interactive Liquid Glass Refraction Lens (glass.samasante.com)
    function setupLiquidLens() {
        if (document.getElementById('liquid-lens-container')) return;

        const lens = document.createElement('div');
        lens.id = 'liquid-lens-container';
        lens.className = 'liquid-refraction-lens';
        lens.style.display = 'none';
        lens.style.left = 'calc(50vw - 110px)';
        lens.style.top = 'calc(50vh - 70px)';
        lens.innerHTML = `
            <div class="liquid-lens-label">LIQUID GLASS LENS</div>
            <div style="font-size: 0.65rem; color: #82F4FF; margin-top: 4px; pointer-events:none;">Drag across DOM</div>
        `;
        document.body.appendChild(lens);

        // Toggle Button
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'lens-toggle-btn';
        toggleBtn.innerHTML = `<span>🔍</span> Liquid Glass Lens`;
        document.body.appendChild(toggleBtn);

        let isLensActive = false;
        let isDragging = false;
        let startX = 0, startY = 0;
        let initialLeft = 0, initialTop = 0;

        toggleBtn.addEventListener('click', () => {
            isLensActive = !isLensActive;
            toggleBtn.classList.toggle('active', isLensActive);
            if (isLensActive) {
                lens.style.display = 'flex';
                runAnime({
                    targets: lens,
                    scale: [0.7, 1],
                    opacity: [0, 1],
                    duration: 400,
                    easing: 'easeOutBack'
                });
            } else {
                runAnime({
                    targets: lens,
                    scale: [1, 0.7],
                    opacity: [1, 0],
                    duration: 300,
                    easing: 'easeInQuad',
                    complete: () => { lens.style.display = 'none'; }
                });
            }
        });

        // Dragging physics
        lens.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = lens.getBoundingClientRect();
            initialLeft = rect.left;
            initialTop = rect.top;
            e.preventDefault();
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            lens.style.left = `${initialLeft + dx}px`;
            lens.style.top = `${initialTop + dy}px`;
        });

        window.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }

    // Page Entrance Animation via Anime.js
    function animatePageEntrance() {
        const curtain = document.getElementById('page-transition-curtain');
        const wipe = document.getElementById('page-transition-liquid-wipe');
        const main = document.querySelector('.main-container, .hero, .features, body > div');

        // Reset curtain
        if (curtain) {
            runAnime({
                targets: curtain,
                scaleX: [1, 0],
                duration: 600,
                easing: 'easeOutExpo'
            });
        }
        if (wipe) {
            runAnime({
                targets: wipe,
                opacity: [1, 0],
                duration: 450,
                easing: 'easeOutQuad'
            });
        }

        // Animate Main Container
        if (main) {
            runAnime({
                targets: main,
                opacity: [0, 1],
                translateY: [8, 0],
                duration: 280,
                easing: 'easeOutQuad'
            });
        }

        // Stagger cards, headers, and UI elements
        const staggerTargets = document.querySelectorAll(
            '.feature-card, .stat-card, .scanner-panel, .shield-container, .chart-panel, .status-line, .reasons-section'
        );
        if (staggerTargets.length) {
            staggerTargets.forEach(el => {
                el.style.opacity = '0';
                el.style.transform = 'translateY(8px)';
            });

            runAnime({
                targets: Array.from(staggerTargets),
                opacity: [0, 1],
                translateY: [8, 0],
                delay: (el, i) => 35 + i * 20,
                duration: 280,
                easing: 'easeOutQuad'
            });
        }
    }

    // Intercept Links for Anime.js Page Switching
    function setupLinkInterception() {
        document.addEventListener('click', (e) => {
            const anchor = e.target.closest('a');
            if (!anchor) return;

            const href = anchor.getAttribute('href');
            // Ignore anchors, external links, empty links, or javascript:
            if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('http://') || href.startsWith('https://') || anchor.target === '_blank') {
                return;
            }

            e.preventDefault();
            navigateTo(href);
        });
    }

    // Cinematic Exit Animation
    function navigateTo(targetUrl) {
        const curtain = document.getElementById('page-transition-curtain');
        const wipe = document.getElementById('page-transition-liquid-wipe');
        const main = document.querySelector('.main-container, .hero, .features, body > div');

        if (curtain) {
            curtain.style.transformOrigin = 'left center';
            runAnime({
                targets: curtain,
                scaleX: [0, 1],
                duration: 450,
                easing: 'easeInOutCubic'
            });
        }

        if (wipe) {
            runAnime({
                targets: wipe,
                opacity: [0, 1],
                duration: 400,
                easing: 'easeInOutQuad'
            });
        }

        if (main) {
            runAnime({
                targets: main,
                opacity: [1, 0],
                translateY: [0, -4],
                duration: 180,
                easing: 'easeInQuad',
                complete: () => {
                    window.location.href = targetUrl;
                }
            });
        } else {
            setTimeout(() => {
                window.location.href = targetUrl;
                }, 180);
        }
    }

    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', () => {
        setupLinkInterception();
        animatePageEntrance();
    });

    window.navigateToPage = navigateTo;

})(window);
