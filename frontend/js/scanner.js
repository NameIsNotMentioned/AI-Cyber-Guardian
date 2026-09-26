(function() {
    document.addEventListener('DOMContentLoaded', () => {
        const messageInput = document.getElementById('message-input');
        const scanBtn = document.getElementById('scan-btn');
        const msgType = document.getElementById('msg-type');
        const progressContainer = document.getElementById('scan-progress');
        const errorDiv = document.getElementById('error-message');
        const shieldCanvas = document.getElementById('status-shield-canvas');

        // Instantiate the Guardian Shield
        let shield = null;
        if (shieldCanvas && window.createGuardianShield) {
            shield = window.createGuardianShield(shieldCanvas);
        }

        // 1. Enable/Disable button based on input
        if (messageInput && scanBtn) {
            messageInput.addEventListener('input', () => {
                scanBtn.disabled = messageInput.value.trim().length === 0;
            });
        }

        // 2. Scan Action
        if (scanBtn) {
            scanBtn.addEventListener('click', async () => {
                const message = messageInput.value.trim();
                const type = msgType ? msgType.value : 'General';

                // UI Reset
                if (errorDiv) {
                    errorDiv.classList.add('error-hidden');
                    errorDiv.innerText = '';
                }
                scanBtn.disabled = true;

                // Set shield to scanning
                if (shield) shield.setState('scanning');

                // Run sequence animation
                if (window.runScanAnimation) {
                    window.runScanAnimation(progressContainer, async () => {
                        await executeScan(message, type);
                    });
                } else {
                    await executeScan(message, type);
                }
            });
        }

        async function executeScan(message, type) {
            try {
                const result = await performScan(message, type);

                // Update shield based on verdict
                if (shield) {
                    shield.setState(result.verdict.toLowerCase());
                }

                // Store in sessionStorage for dashboard.js
                sessionStorage.setItem('lastScanResult', JSON.stringify(result));

                // Small delay to let the user see the shield state before redirecting
                setTimeout(() => {
                    window.location.href = 'dashboard.html?result=1';
                }, 1000);
            } catch (err) {
                if (shield) shield.setState('idle');
                if (errorDiv) {
                    errorDiv.innerText = `SYSTEM ERROR: ${err.message}`;
                    errorDiv.classList.remove('error-hidden');
                }
                if (scanBtn) scanBtn.disabled = false;
            }
        }

        async function performScan(message, type) {
            try {
                const response = await window.secureFetch('/scan?engine=ml', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message, type })
                });

                if (!response.ok) throw new Error('Server unavailable');
                return await response.json();

            } catch (e) {
                console.warn('Backend not reachable, using mock detector logic...');
                return generateMockResult(message);
            }
        }

        function generateMockResult(message) {
            const msg = message.toLowerCase();

            // Simple mock logic based on keywords
            const riskKeywords = ['urgent', 'bank', 'account', 'suspended', 'winner', 'prize', 'password', 'verify', 'login', 'http://', 'bit.ly'];
            const matched = riskKeywords.filter(k => msg.includes(k));

            const riskScore = Math.min(100, 30 + (matched.length * 15));
            let verdict = 'SAFE';
            if (riskScore > 70) verdict = 'DANGEROUS';
            else if (riskScore > 40) verdict = 'SUSPICIOUS';

            const reasons = [];
            if (msg.includes('http') || msg.includes('.com')) reasons.push({ title: 'Suspicious URL', detail: 'External links detected in untrusted context.' });
            if (msg.includes('urgent') || msg.includes('now')) reasons.push({ title: 'Urgency', detail: 'High-pressure language used to force quick action.' });
            if (msg.includes('winner') || msg.includes('prize')) reasons.push({ title: 'Reward Claim', detail: 'Typical scam pattern offering unexpected prizes.' });
            if (reasons.length === 0 && verdict !== 'SAFE') reasons.push({ title: 'Pattern Match', detail: 'Message matches known scam templates.' });

            return {
                verdict: verdict,
                risk_score: riskScore,
                signals: {
                    phishing: riskScore,
                    urgency: matched.includes('urgent') ? 90 : 20,
                    url_risk: matched.some(k => k.includes('http')) ? 85 : 10,
                    scam_pattern: Math.max(10, riskScore - 10)
                },
                reasons: reasons.length ? reasons : [{ title: 'Safe Content', detail: 'No known phishing patterns detected.' }],
                recommended_action: verdict === 'SAFE'
                    ? 'No immediate threat detected.'
                    : 'Do not click any links. Report as phishing and delete immediately.'
            };
        }
    });
})();
