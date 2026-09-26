(function() {
    document.addEventListener('DOMContentLoaded', () => {
        const urlParams = new URLSearchParams(window.location.search);
        const hasResult = urlParams.get('result') === '1';

        if (hasResult) {
            const resultData = sessionStorage.getItem('lastScanResult');
            if (resultData) {
                renderScanResult(JSON.parse(resultData));
                return;
            }
        }

        renderRegularDashboard();
    });

    function renderScanResult(result) {
        const view = document.getElementById('scan-result-view');
        const statsView = document.getElementById('regular-stats-view');

        if (!view) return;

        // Hide regular stats when showing specific result
        if (statsView) statsView.classList.add('hidden');
        view.classList.remove('hidden');

        const verdictConfig = {
            'SAFE': { color: 'var(--accent-green, #55745b)', class: 'verdict-safe', icon: '✓' },
            'SUSPICIOUS': { color: 'var(--accent-yellow, #a27b38)', class: 'verdict-suspicious', icon: '⚠' },
            'DANGEROUS': { color: 'var(--accent-red, #a85349)', class: 'verdict-dangerous', icon: '⛔' }
        };

        verdictConfig.SAFE.icon = String.fromCharCode(10003);
        verdictConfig.SUSPICIOUS.icon = String.fromCharCode(9888);
        verdictConfig.DANGEROUS.icon = String.fromCharCode(9940);
        const config = verdictConfig[result.verdict] || verdictConfig['SUSPICIOUS'];
        const circumference = 2 * Math.PI * 90; // ~565.48

        view.innerHTML = `
            <div class="threat-analysis-panel">
                <div class="analysis-header">
                    <h2 style="margin:0; color: var(--text-primary); font-family: var(--font-sans);">Threat analysis</h2>
                    <div class="verdict-badge ${config.class}">
                        <span>${config.icon}</span> ${result.verdict}
                    </div>
                </div>

                <div class="analysis-grid">
                    <div class="gauge-container">
                        <svg class="gauge-svg" viewBox="0 0 200 200">
                            <circle class="gauge-bg" cx="100" cy="100" r="90"></circle>
                            <circle class="gauge-value" cx="100" cy="100" r="90"
                                    style="stroke: ${config.color}; stroke-dasharray: ${circumference}; stroke-dashoffset: ${circumference};"
                                    id="risk-gauge-circle"></circle>
                        </svg>
                        <div class="gauge-text">${result.risk_score}%</div>
                    </div>

                    <div class="signals-container">
                        ${Object.entries(result.signals || {}).map(([key, val]) => `
                            <div class="signal-row">
                                <div class="signal-label">${key.replace('_', ' ').toUpperCase()}</div>
                                <div class="signal-bar-bg">
                                    <div class="signal-bar-fill"
                                         style="width: 0%; background: ${config.color};"
                                         data-width="${val}%"></div>
                                </div>
                                <div class="signal-percent">${val}%</div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="reasons-section">
                    <h3>Why was this flagged?</h3>
                    <div class="reasons-grid">
                        ${(result.reasons || []).map(r => `
                            <div class="reason-card">
                                <span class="icon">⚠</span>
                                <div>
                                    <b>${r.title}</b>
                                    <p>${r.detail}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="action-callout">
                    <span class="icon">🛡</span>
                    <div>
                        <strong>Recommended Action:</strong> ${result.recommended_action || 'No action needed.'}
                    </div>
                </div>

                <a href="scanner.html" class="btn-scan-another">Scan Another Message</a>
            </div>
        `;

        // Animate gauge and bars
        setTimeout(() => {
            const gauge = document.getElementById('risk-gauge-circle');
            if (gauge) {
                const targetOffset = circumference - (result.risk_score / 100) * circumference;
                gauge.style.transition = 'stroke-dashoffset 1.2s ease-out';
                gauge.style.strokeDashoffset = targetOffset;
            }

            document.querySelectorAll('.signal-bar-fill').forEach(bar => {
                const width = bar.getAttribute('data-width');
                bar.style.transition = 'width 1s ease-out';
                bar.style.width = width;
            });
        }, 100);
    }

    async function renderRegularDashboard() {
        // Fetch stats
        let stats = {
            messages_scanned: 12842,
            threats_detected: 3104,
            safe_messages: 9738,
            critical_threats: 412
        };

        try {
            stats = await window.secureFetch('/stats');
        } catch (e) {
            // Use defaults
        }

        const animateStat = (id, target) => {
            const el = document.getElementById(id);
            if (!el) return;
            const start = performance.now();
            const duration = 1000;
            const tick = now => {
                const progress = Math.min(1, (now - start) / duration);
                el.textContent = Math.round(target * (1 - Math.pow(1 - progress, 3))).toLocaleString();
                if (progress < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        };

        animateStat('stat-scanned', stats.messages_scanned);
        animateStat('stat-threats', stats.threats_detected);
        animateStat('stat-safe', stats.safe_messages);
        animateStat('stat-critical', stats.critical_threats);

        // Chart.js Activity Chart
        const activityCtx = document.getElementById('activityChart');
        if (activityCtx && window.Chart) {
            const labels = Array.from({length: 14}, (_, i) => `Day ${i + 1}`);
            const threatData = [120, 145, 132, 189, 210, 195, 230, 215, 240, 275, 260, 310, 290, 320];
            const safeData = [540, 580, 610, 590, 640, 670, 710, 690, 730, 760, 790, 810, 830, 860];

            new Chart(activityCtx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Threats',
                            data: threatData,
                            borderColor: '#a85349',
                            backgroundColor: 'rgba(168, 83, 73, 0.10)',
                            fill: true,
                            tension: 0.3
                        },
                        {
                            label: 'Safe',
                            data: safeData,
                            borderColor: '#66877e',
                            backgroundColor: 'rgba(102, 135, 126, 0.08)',
                            fill: true,
                            tension: 0.3
                        }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { labels: { color: '#526052' } }
                    },
                    scales: {
                        x: { ticks: { color: '#69736a' }, grid: { color: 'rgba(63, 72, 62, 0.10)' } },
                        y: { ticks: { color: '#69736a' }, grid: { color: 'rgba(63, 72, 62, 0.10)' } }
                    }
                }
            });
        }

        // Breakdown Chart
        const breakdownCtx = document.getElementById('breakdownChart');
        if (breakdownCtx && window.Chart) {
            new Chart(breakdownCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Credential Harvesting', 'Urgent Wire Scams', 'Lottery/Giveaways', 'Malicious Links', 'Impersonation'],
                    datasets: [{
                        data: [35, 25, 18, 14, 8],
                        backgroundColor: ['#a85349', '#bb8855', '#b79c62', '#66877e', '#8a8090'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { position: 'bottom', labels: { color: '#526052' } }
                    }
                }
            });
        }

        // Risk distribution bar
        const distBar = document.getElementById('risk-distribution-bar');
        if (distBar) {
            distBar.innerHTML = `
                <div style="display:flex; height: 16px; border-radius: 8px; overflow:hidden; width:100%; margin-top: 1rem;">
                    <div style="width: 76%; background: #55745b;" title="Safe (76%)"></div>
                    <div style="width: 18%; background: #a27b38;" title="Suspicious (18%)"></div>
                    <div style="width: 6%; background: #a85349;" title="Dangerous (6%)"></div>
                </div>
                <div style="display:flex; justify-content:space-between; font-size: 0.8rem; margin-top: 0.5rem; color: #69736a;">
                    <span style="color:#55745b;">Safe: 76%</span>
                    <span style="color:#a27b38;">Suspicious: 18%</span>
                    <span style="color:#a85349;">Dangerous: 6%</span>
                </div>
            `;
        }
    }
})();
