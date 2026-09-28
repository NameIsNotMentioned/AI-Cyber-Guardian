(function () {
    // CONFIGURATION: Central API Base URL
    window.API_CONFIG = {
        BASE_URL: 'https://ai-cyber-guardian-ieri.onrender.com/api',
        TIMEOUT: 15000
    };

    // Utility for standardized fetch with error handling
    window.secureFetch = async function (endpoint, options = {}) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), window.API_CONFIG.TIMEOUT);

        try {
            const response = await fetch(`${window.API_CONFIG.BASE_URL}${endpoint}`, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(id);

            if (!response.ok) {
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        } catch (err) {
            console.error(`Fetch error on ${endpoint}:`, err);

            // Show global offline banner
            showOfflineBanner();

            throw err;
        }
    };

    function showOfflineBanner() {
        if (document.getElementById('api-error-banner')) return;

        const banner = document.createElement('div');
        banner.id = 'api-error-banner';
        banner.style.cssText = `
            position: fixed;
            top: 60px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--accent-red);
            color: white;
            padding: 0.5rem 1.5rem;
            border-radius: 0 0 8px 8px;
            font-size: 0.85rem;
            font-weight: bold;
            z-index: 2000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            gap: 0.5rem;
            animation: slideDown 0.3s ease-out;
        `;
        banner.innerHTML = `<span>⚠</span> Couldn't reach the server — showing offline demo data`;

        banner.textContent = "Could not reach the server - showing offline demo data";
        document.body.appendChild(banner);

        // Auto-hide after 5 seconds
        setTimeout(() => {
            banner.style.opacity = '0';
            banner.style.transition = 'opacity 0.5s';
            setTimeout(() => banner.remove(), 500);
        }, 5000);
    }

    // Add animation for banner
    const style = document.createElement('style');
    style, style.innerHTML = `
        @keyframes slideDown {
            from { transform: translate(-50%, -100%); }
            to { transform: translate(-50%, 0); }
        }
    `;
    document.head.appendChild(style);

})();
