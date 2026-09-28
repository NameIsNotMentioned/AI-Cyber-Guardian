import os
import sys
from flask import Flask, request, jsonify
from flask_cors import CORS

# Add backend directory to sys.path if not present
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import detector
import model

app = Flask(__name__)
CORS(app)

@app.route('/api/scan', methods=['POST'])
def scan_message():
    data = request.get_json()
    if not data or 'message' not in data or not str(data['message']).strip():
        return jsonify({"error": "Message content is required"}), 400

    message = data['message']
    msg_type = data.get('type', 'General')
    # Prefer the trained classifier for normal scans. Pass ?engine=rules to
    # compare it with the transparent heuristic detector during development.
    engine = request.args.get('engine', 'ml')

    try:
        if engine == 'ml':
            result = model.predict(message)
            if result is None:
                # Keep the API usable on a fresh clone before the model is trained.
                result = detector.analyze_message(message, msg_type)
            else:
                # Combine model language scores with explicit URL/brand heuristics.
                heuristic = detector.analyze_message(message, msg_type)
                if heuristic['risk_score'] > result['risk_score']:
                    result = heuristic
                else:
                    known_reasons = {reason['title'] for reason in result['reasons']}
                    result['reasons'].extend(
                        reason for reason in heuristic['reasons']
                        if reason['title'] != 'Clean Heuristics'
                        and reason['title'] not in known_reasons
                    )
                    result['signals'] = {
                        key: max(result['signals'].get(key, 0), heuristic['signals'].get(key, 0))
                        for key in result['signals']
                    }
        else:
            result = detector.analyze_message(message, msg_type)

        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/scan-url', methods=['POST'])
def scan_url():
    data = request.get_json()
    if not data or 'url' not in data or not str(data['url']).strip():
        return jsonify({"error": "URL is required"}), 400

    url = data['url']

    try:
        result = detector.analyze_url(url)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    # Stats endpoint used by the dashboard
    return jsonify({
        "messages_scanned": 12842,
        "threats_detected": 3104,
        "safe_messages": 9738,
        "critical_threats": 412
    })

if __name__ == "__main__":
    debug = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    port = int(os.environ.get("PORT", 5000))
    print(f"AI Cyber Guardian API server running on http://0.0.0.0:{port}")
    app.run(debug=debug, port=port, host="0.0.0.0")
