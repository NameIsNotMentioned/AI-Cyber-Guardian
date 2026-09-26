import re
from urllib.parse import urlparse

URL_PATTERN = re.compile(
    r"(?i)(?:(?:https?://|www\.)[^\s<>\"']+|"
    r"(?:[a-z0-9-]+\.)+[a-z]{2,}(?:/[^\s<>\"']*)?)"
)
KNOWN_BRAND_HOSTS = {
    "paypal": ("paypal.com", "paypal.co.uk"),
    "microsoft": ("microsoft.com", "live.com", "outlook.com"),
    "apple": ("apple.com", "icloud.com"),
    "amazon": ("amazon.com", "amazon.co.uk"),
    "google": ("google.com", "accounts.google.com"),
}


def _extract_urls(text: str) -> list[str]:
    return [match.rstrip(".,;:!?)]}") for match in URL_PATTERN.findall(text)]


def _brand_path_mismatch(url: str, hostname: str) -> str | None:
    normalized_host = hostname.lower().removeprefix("www.").rstrip(".")
    for brand, trusted_hosts in KNOWN_BRAND_HOSTS.items():
        if not re.search(rf"(?i)(?<![a-z0-9]){brand}\.(?:com|co\.uk|co\.jp|net)", url):
            continue
        if any(
            normalized_host == trusted or normalized_host.endswith("." + trusted)
            for trusted in trusted_hosts
        ):
            continue
        return brand
    return None


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
    found_urls = _extract_urls(message)
    url_score = 0
    brand_mismatches = []

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
        for found_url in found_urls:
            parsed_url = urlparse(found_url if "://" in found_url else f"http://{found_url}")
            brand = _brand_path_mismatch(found_url, parsed_url.hostname or "")
            if brand:
                brand_mismatches.append((brand, parsed_url.hostname or "unknown host"))
        if brand_mismatches:
            url_score = 100
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
        for brand, hostname in brand_mismatches:
            reasons.append({
                "title": "Brand/domain mismatch",
                "detail": f"The URL mentions {brand.title()} but leads to {hostname}. Check the registered domain before opening it."
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
    if brand_mismatches:
        base_score = max(base_score, 70)

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
        "age": {"val": "Not checked (no domain-age lookup)", "status": "warning"},
        "redirects": {"val": "Not checked (link not opened)", "status": "warning"},
        "reputation": {"val": "Unverified (no reputation feed)", "status": "warning"}
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
    hostname = ""
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

    # A brand-looking domain in the path can disguise an unrelated host.
    brand = _brand_path_mismatch(url_clean, hostname)
    if brand:
        score += 65
        findings["pattern"] = {
            "val": f"Brand/domain mismatch ({brand.title()} text, host: {hostname})",
            "status": "dangerous",
        }

    # Determine Verdict
    score = min(100, score)
    if score > 60:
        verdict = "DANGEROUS"
        findings["reputation"] = {"val": "High heuristic risk (not reputation checked)", "status": "dangerous"}
    elif score > 30:
        verdict = "SUSPICIOUS"
        findings["reputation"] = {"val": "Unverified (no reputation feed)", "status": "warning"}
    else:
        verdict = "SAFE"

    return {
        "verdict": verdict,
        "score": score,
        "findings": findings
    }
