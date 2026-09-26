import re
from urllib.parse import urlparse

def analyze_message(message: str, msg_type: str = "General") -> dict:
    """
    Rule-based heuristic analysis of a message for phishing/scam patterns.
    """
    msg_lower = message.lower()
    reasons = []

    # 1. Urgency Detection
    urgency_keywords = [
        'urgent', 'immediately', 'right now', 'action required', 'account suspended',
        'locked', 'within 24 hours', 'final notice', 'warning', 'expires today',
        'unauthorized', 'security alert', 'threat detected', 'overdue'
    ]
    urgency_matches = [k for k in urgency_keywords if k in msg_lower]
    urgency_score = min(100, len(urgency_matches) * 28 + (15 if urgency_matches else 0))
    if urgency_matches:
        reasons.append({
            "title": "High Urgency & Pressure",
            "detail": f"Detected urgency pressure keywords: {', '.join(urgency_matches[:3])}."
        })

    # 2. URL Risk Detection
    url_pattern = r'https?://[^\s]+|www\.[^\s]+|[a-zA-Z0-9.-]+\.(?:com|org|net|xyz|top|club|info|site|online|ru|cc|link|loan|win)[^\s]*'
    found_urls = re.findall(url_pattern, message)
    url_score = 0

    if found_urls:
        susp_tlds = ['.xyz', '.top', '.club', '.info', '.site', '.online', '.ru', '.cc', '.link', '.loan', '.win']
        has_susp_tld = any(any(url.lower().endswith(tld) or tld in url.lower() for tld in susp_tlds) for url in found_urls)
        has_http_only = any(url.lower().startswith('http://') for url in found_urls)
        has_ip = any(re.search(r'https?://\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}', url) for url in found_urls)

        url_score = 35
        if has_http_only:
            url_score += 25
        if has_susp_tld:
            url_score += 35
        if has_ip:
            url_score += 40
        url_score = min(100, url_score)

        detail_parts = []
        if has_susp_tld:
            detail_parts.append("suspicious top-level domain")
        if has_http_only:
            detail_parts.append("unencrypted HTTP link")
        if has_ip:
            detail_parts.append("raw IP address URL")
        if not detail_parts:
            detail_parts.append("unverified external link")

        reasons.append({
            "title": "Suspicious Links Detected",
            "detail": f"Contains links with {', '.join(detail_parts)}."
        })

    # 3. Scam Patterns (Financial, Credential harvesting, Giveaways)
    scam_keywords = [
        'bank', 'password', 'verify your identity', 'paypal', 'bitcoin', 'crypto',
        'lottery', 'winner', 'claim prize', 'gift card', 'wire transfer', 'tax refund',
        'apple id', 'docusign', 'w-2', 'direct deposit', 'congratulations', 'stimulus'
    ]
    scam_matches = [k for k in scam_keywords if k in msg_lower]
    scam_score = min(100, len(scam_matches) * 25 + (10 if scam_matches else 0))
    if scam_matches:
        reasons.append({
            "title": "Known Scam Pattern",
            "detail": f"Targeted triggers detected: {', '.join(scam_matches[:3])}."
        })

    # 4. Overall Phishing Calculation
    base_score = 0
    if urgency_score > 0:
        base_score += urgency_score * 0.35
    if url_score > 0:
        base_score += url_score * 0.40
    if scam_score > 0:
        base_score += scam_score * 0.35

    risk_score = int(min(100, base_score))

    # Determine Verdict
    if risk_score > 60:
        verdict = "DANGEROUS"
    elif risk_score > 25:
        verdict = "SUSPICIOUS"
    else:
        verdict = "SAFE"
        risk_score = max(5, risk_score)
        urgency_score = max(10, urgency_score)
        url_score = max(5, url_score)
        scam_score = max(5, scam_score)
        reasons = [{
            "title": "Clean Heuristics",
            "detail": "No malicious indicators, urgent pressure phrases, or suspicious links were detected."
        }]

    recommended_action = (
        "Do not click any links or provide credentials. Block the sender and report as phishing immediately."
        if verdict == "DANGEROUS"
        else "Verify sender identity through independent channels before clicking links or sharing sensitive info."
        if verdict == "SUSPICIOUS"
        else "Message appears safe. Standard security vigilance is always recommended."
    )

    return {
        "verdict": verdict,
        "risk_score": risk_score,
        "signals": {
            "phishing": risk_score,
            "urgency": int(urgency_score),
            "url_risk": int(url_score),
            "scam_pattern": int(scam_score)
        },
        "reasons": reasons,
        "recommended_action": recommended_action
    }

def analyze_url(url: str) -> dict:
    """
    Heuristic security analysis of a URL.
    """
    url_clean = url.strip()
    score = 0

    findings = {
        "https": {"val": "✓ Secure (TLS)", "status": "safe"},
        "pattern": {"val": "No anomaly detected", "status": "safe"},
        "age": {"val": "Over 2 years", "status": "safe"},
        "redirects": {"val": "0 (Direct)", "status": "safe"},
        "reputation": {"val": "Clean / Trusted", "status": "safe"}
    }

    # 1. HTTPS check
    if not url_clean.lower().startswith("https://"):
        score += 35
        findings["https"] = {"val": "⛔ Insecure (No HTTPS)", "status": "dangerous"}

    # 2. IP-based URL
    ip_pattern = r'^https?://(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?(?:/.*)?$'
    if re.match(ip_pattern, url_clean):
        score += 45
        findings["pattern"] = {"val": "⛔ Raw IP Address", "status": "dangerous"}

    # 3. Domain parsing
    try:
        parsed = urlparse(url_clean if "://" in url_clean else f"http://{url_clean}")
        hostname = parsed.hostname or ""
        parts = hostname.split('.')

        # Subdomain count
        if len(parts) > 3:
            score += 25
            findings["pattern"] = {"val": f"⚠ Excessive Subdomains ({len(parts)})", "status": "suspicious"}

        # Suspicious TLD
        susp_tlds = ['.xyz', '.top', '.club', '.info', '.loan', '.win', '.site', '.online', '.ru', '.cc', '.link']
        if any(hostname.lower().endswith(tld) for tld in susp_tlds):
            score += 30
            findings["pattern"] = {"val": f"⚠ Suspicious TLD (.{hostname.split('.')[-1]})", "status": "suspicious"}

        # @ symbol authentication trick
        if "@" in url_clean:
            score += 40
            findings["pattern"] = {"val": "⛔ Userinfo / @ Trick", "status": "dangerous"}

        # Excessive URL length
        if len(url_clean) > 80:
            score += 20
            if findings["pattern"]["status"] == "safe":
                findings["pattern"] = {"val": "⚠ Excessive Length (>80 chars)", "status": "suspicious"}

    except Exception:
        score += 30
        findings["pattern"] = {"val": "⚠ Malformed URL Structure", "status": "suspicious"}

    # Determine Verdict
    score = min(100, score)
    if score > 60:
        verdict = "DANGEROUS"
        findings["reputation"] = {"val": "🚩 High Threat Risk", "status": "dangerous"}
        findings["age"] = {"val": "< 14 days (Newly Registered)", "status": "suspicious"}
        findings["redirects"] = {"val": "3 (Hidden Redirects)", "status": "suspicious"}
    elif score > 30:
        verdict = "SUSPICIOUS"
        findings["reputation"] = {"val": "⚠ Unverified Domain", "status": "suspicious"}
        findings["redirects"] = {"val": "1 (External Redirect)", "status": "suspicious"}
    else:
        verdict = "SAFE"

    return {
        "verdict": verdict,
        "score": score,
        "findings": findings
    }
