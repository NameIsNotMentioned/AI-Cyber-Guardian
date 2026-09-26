(() => {
    document.addEventListener('DOMContentLoaded', () => {
        const button = document.getElementById('nav-toggle');
        const links = document.getElementById('nav-links');
        if (!button || !links) return;

        const closeMenu = () => {
            links.classList.remove('active');
            button.setAttribute('aria-expanded', 'false');
            button.setAttribute('aria-label', 'Open navigation');
        };

        button.addEventListener('click', () => {
            const isOpen = links.classList.toggle('active');
            button.setAttribute('aria-expanded', String(isOpen));
            button.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
        });
        links.addEventListener('click', event => {
            if (event.target.closest('a')) closeMenu();
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') closeMenu();
        });
        document.addEventListener('click', event => {
            if (!button.contains(event.target) && !links.contains(event.target)) closeMenu();
        });
    });
})();
