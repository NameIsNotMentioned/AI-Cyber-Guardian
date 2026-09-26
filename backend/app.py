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
    print("AI Cyber Guardian API server running on http://127.0.0.1:5000")
    app.run(debug=True, port=5000, host="0.0.0.0")
