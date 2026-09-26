(function() {
    document.addEventListener('DOMContentLoaded', () => {
        const urlInput = document.getElementById('url-input');
        const scanBtn = document.getElementById('url-scan-btn');
        const progressContainer = document.getElementById('url-scan-progress');
        const resultsPanel = document.getElementById('url-results');
        const errorDiv = document.getElementById('url-error-message');

        if (!scanBtn || !urlInput) return;

        scanBtn.addEventListener('click', async () => {
            const url = urlInput.value.trim();
            if (!url) return;

            // Reset UI
            if (errorDiv) {
                errorDiv.classList.add('error-hidden');
                errorDiv.innerText = '';
            }
            if (resultsPanel) resultsPanel.classList.add('hidden');
            scanBtn.disabled = true;

            // Custom animation steps for URL scanner
            const urlSteps = [
                { id: 'u-step-1', text: 'DNS Lookup' },
                { id: 'u-step-2', text: 'Checking SSL/TLS' },
                { id: 'u-step-3', text: 'Heuristic Analysis' },
            ];

            if (progressContainer) progressContainer.classList.remove('hidden');
            let currentStep = 0;

            async function runSequence() {
                if (currentStep >= urlSteps.length) {
                    await completeScan(url);
                    return;
                }

                const stepEl = document.getElementById(urlSteps[currentStep].id);
                if (stepEl) {
                    stepEl.classList.add('active');
                    await new Promise(r => setTimeout(r, 500));
                    stepEl.classList.remove('active');
                    stepEl.classList.add('completed');
                }
                currentStep++;
                await runSequence();
            }

            await runSequence();
        });

        async function completeScan(url) {
            try {
                let result;
                try {
                    const response = await window.secureFetch('/scan-url', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url })
                    });
                    if (response.ok) {
                        result = await response.json();
                    } else {
                        result = analyzeUrlHeuristically(url);
                    }
                } catch {
                    result = analyzeUrlHeuristically(url);
                }
                displayResults(result);
            } catch (err) {
                if (errorDiv) {
                    errorDiv.innerText = `SYSTEM ERROR: ${err.message}`;
                    errorDiv.classList.remove('error-hidden');
                }
            } finally {
                scanBtn.disabled = false;
                if (progressContainer) progressContainer.classList.add('hidden');
            }
        }

        function analyzeUrlHeuristically(url) {
            let score = 0;
            const findings = {
                https: { val: '✓ Secure', status: 'safe' },
                pattern: { val: 'No issues', status: 'safe' },
                age: { val: 'Not checked (no domain-age lookup)', status: 'suspicious' },
                redirects: { val: 'Not checked (link not opened)', status: 'suspicious' },
                reputation: { val: 'Unverified (no reputation feed)', status: 'suspicious' }
            };

            // 1. Check HTTPS
            if (!url.toLowerCase().startsWith('https://')) {
                score += 30;
                findings.https = { val: '⛔ Insecure', status: 'dangerous' };
            }

            // 2. Check IP-based URL
            const ipPattern = /^https?:\/\/(\d{1,3}\.){3}\d{1,3}/;
            if (ipPattern.test(url)) {
                score += 40;
                findings.pattern = { val: '⛔ IP-Based', status: 'dangerous' };
            }

            // 3. Check Subdomain count
            let hostname = '';
            try {
                hostname = new URL(url.includes('://') ? url : `http://${url}`).hostname.toLowerCase();
                const domain = hostname;
                const parts = domain.split('.');
                if (parts.length > 3) {
                    score += 20;
                    findings.pattern = { val: '⚠ High Subdomains', status: 'suspicious' };
                }
            } catch(e) {
                score += 10;
            }

            // 4. Suspicious TLDs
            const suspTLDs = ['.xyz', '.top', '.club', '.info', '.loan', '.win', '.site', '.online', '.ru', '.cc', '.link'];
            if (suspTLDs.some(tld => url.toLowerCase().includes(tld))) {
                score += 25;
                findings.pattern = { val: '⚠ Suspicious TLD', status: 'suspicious' };
            }

            // 5. URL Length
            if (url.length > 75) {
                score += 15;
                if (findings.pattern.status === 'safe') {
                    findings.pattern = { val: '⚠ Excessive Length', status: 'suspicious' };
                }
            }

            // 6. @ Auth trick
            if (url.includes('@')) {
                score += 40;
                findings.pattern = { val: '⛔ Auth Trick', status: 'dangerous' };
            }

            // Brand text in a path does not prove the destination belongs to that brand.
            const trustedBrandHosts = {
                paypal: ['paypal.com', 'paypal.co.uk'],
                microsoft: ['microsoft.com', 'live.com', 'outlook.com'],
                apple: ['apple.com', 'icloud.com'],
                amazon: ['amazon.com', 'amazon.co.uk'],
                google: ['google.com', 'accounts.google.com']
            };
            const mentionedBrand = Object.entries(trustedBrandHosts).find(([brand]) =>
                new RegExp(`(?:^|[^a-z0-9])${brand}\\.(?:com|co\\.uk|co\\.jp|net)`, 'i').test(url)
            );
            if (mentionedBrand) {
                const [brand, hosts] = mentionedBrand;
                const actualHost = hostname.replace(/^www\./, '');
                if (!hosts.some(host => actualHost === host || actualHost.endsWith(`.${host}`))) {
                    score += 70;
                    findings.pattern = { val: `Brand/domain mismatch: ${brand} text, host ${hostname}`, status: 'dangerous' };
                }
            }

            // Final Score Mapping
            score = Math.min(100, score);
            let verdict = 'SAFE';
            if (score > 60) verdict = 'DANGEROUS';
            else if (score > 30) verdict = 'SUSPICIOUS';

            if (verdict === 'DANGEROUS') {
                findings.reputation = { val: 'High URL heuristic risk', status: 'dangerous' };
            } else if (verdict === 'SUSPICIOUS') {
                findings.reputation = { val: 'Unverified (no reputation feed)', status: 'suspicious' };
            }

            return { verdict, score, findings };
        }

        function displayResults(result) {
            const resAge = document.getElementById('res-age');
            const resHttps = document.getElementById('res-https');
            const resPattern = document.getElementById('res-pattern');
            const resRedirects = document.getElementById('res-redirects');
            const resReputation = document.getElementById('res-reputation');
            const verdictBadge = document.getElementById('url-verdict');

            const findings = result.findings || {};
            const checks = result.checks || [];
            const fromCheck = label => {
                const row = checks.find(item => (item.label || '').toLowerCase().includes(label));
                return row ? { val: row.detail || row.value || row.status, status: row.status === 'ok' ? 'safe' : row.status === 'danger' ? 'dangerous' : 'suspicious' } : null;
            };
            const setFinding = (element, finding) => {
                if (!element || !finding) return;
                element.classList.remove('status-safe', 'status-suspicious', 'status-dangerous');
                const status = finding.status === 'danger' ? 'dangerous' : finding.status === 'warning' ? 'suspicious' : finding.status;
                const normalizedStatus = status || 'safe';
                const icons = { safe: String.fromCharCode(10003), suspicious: String.fromCharCode(9888), dangerous: String.fromCharCode(9940) };
                const value = String(finding.val || finding.detail || finding.status || '-')
                    .replace(/[^\x20-\x7e]/g, '')
                    .replace(/^dYsc\s*/i, '')
                    .replace(/^[os]{1,2}["\s]+/i, '')
                    .replace(/^[>"\s]+/, '');
                element.textContent = icons[normalizedStatus] + ' ' + value;
                element.classList.add('status-' + normalizedStatus);
            };
            setFinding(resAge, findings.age || fromCheck('age'));
            setFinding(resHttps, findings.https || fromCheck('https'));
            setFinding(resPattern, findings.pattern || fromCheck('pattern') || fromCheck('domain'));
            setFinding(resRedirects, findings.redirects || fromCheck('redirect'));
            setFinding(resReputation, findings.reputation || fromCheck('reputation'));

            if (verdictBadge) {
                const icons = { SAFE: '\u2713', SUSPICIOUS: '\u26a0', DANGEROUS: '\u26d4' };
                verdictBadge.innerText = `${icons[result.verdict] || icons.SUSPICIOUS} ${result.verdict}`;
                verdictBadge.className = 'verdict-badge ' +
                    (result.verdict === 'SAFE' ? 'verdict-safe' :
                     result.verdict === 'SUSPICIOUS' ? 'verdict-suspicious' : 'verdict-dangerous');
            }

            if (resultsPanel) {
                resultsPanel.classList.remove('hidden');
            }
        }
    });
})();
