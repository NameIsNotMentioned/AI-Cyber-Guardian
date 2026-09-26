(function() {
    window.runScanAnimation = async function(progressContainer, callback) {
        if (!progressContainer) {
            if (callback) callback();
            return;
        }

        progressContainer.classList.remove('hidden');

        const stepIds = ['step-1', 'step-2', 'step-3', 'step-4'];
        
        // Reset steps
        stepIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.classList.remove('active', 'completed');
            }
        });

        for (let i = 0; i < stepIds.length; i++) {
            const stepEl = document.getElementById(stepIds[i]);
            if (stepEl) {
                stepEl.classList.add('active');
                await new Promise(r => setTimeout(r, 450));
                stepEl.classList.remove('active');
                stepEl.classList.add('completed');
            }
        }

        await new Promise(r => setTimeout(r, 300));
        progressContainer.classList.add('hidden');

        if (callback) {
            callback();
        }
    };
})();
