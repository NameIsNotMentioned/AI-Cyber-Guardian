(function() {
    document.addEventListener('DOMContentLoaded', () => {
        // Counter animation
        const animateCounter = (id, targetValue) => {
            const element = document.getElementById(id);
            if (!element) return;

            let currentValue = 0;
            const duration = 1800; // 1.8 seconds
            const stepTime = 20; // every 20ms
            const increment = targetValue / (duration / stepTime);

            const timer = setInterval(() => {
                currentValue += increment;
                if (currentValue >= targetValue) {
                    element.innerText = targetValue.toLocaleString();
                    clearInterval(timer);
                } else {
                    element.innerText = Math.floor(currentValue).toLocaleString();
                }
            }, stepTime);
        };

        // Start animations for home page counters with live API fetch
        window.secureFetch('/stats')
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data) {
                    animateCounter('scanned-count', data.messages_scanned || 12842);
                    animateCounter('threats-count', data.threats_detected || 3104);
                } else {
                    animateCounter('scanned-count', 12842);
                    animateCounter('threats-count', 3104);
                }
            })
            .catch(() => {
                animateCounter('scanned-count', 12842);
                animateCounter('threats-count', 3104);
            });

        // Smooth scrolling for in-page links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth'
                    });
                }
            });
        });
    });
})();
