from flask import Flask, request, jsonify, send_from_directory
import json
import os
from datetime import datetime
from openai import OpenAI

app = Flask(__name__)

# Initialize OpenAI client (hardcoded for functionality; consider using environment variable in production)
client = OpenAI(api_key="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")

# Serve static files
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/styles.css')
def css():
    return send_from_directory('.', 'styles.css')

@app.route('/script.js')
def js():
    return send_from_directory('.', 'script.js')

@app.route('/static-content.json')
def static_json():
    return send_from_directory('.', 'static-content.json')

@app.route('/Manish.jpg')
def manish_img():
    return send_from_directory('.', 'Manish.jpg')

@app.route('/Mayank.jpg')
def mayank_img():
    return send_from_directory('.', 'Mayank.jpg')

# Chat history endpoints
@app.route('/save_chat', methods=['POST'])
def save_chat():
    try:
        data = request.json
        username = data.get('username')
        mood = data.get('mood')
        messages = data.get('messages', [])

        if not username or not messages:
            return jsonify({'error': 'Username and messages required'}), 400

        chats_file = 'chats.json'
        if os.path.exists(chats_file):
            with open(chats_file, 'r', encoding='utf-8') as f:
                chats = json.load(f)
        else:
            chats = {"users": {}}

        if username not in chats["users"]:
            chats["users"][username] = []

        # Find existing entry for this mood
        existing_entry = None
        for entry in chats["users"][username]:
            if entry["mood"] == mood:
                existing_entry = entry
                break

        current_date = datetime.now().isoformat()

        # Add timestamp to each message if not present
        for msg in messages:
            if 'timestamp' not in msg:
                msg['timestamp'] = current_date

        if existing_entry:
            # Append new messages and update date
            existing_entry["messages"].extend(messages)
            existing_entry["date"] = current_date
        else:
            # Create new entry
            chats["users"][username].append({
                "mood": mood,
                "date": current_date,
                "messages": messages
            })

        with open(chats_file, 'w', encoding='utf-8') as f:
            json.dump(chats, f, ensure_ascii=False, indent=2)

        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/load_chat')
def load_chat():
    try:
        username = request.args.get('username')
        mood = request.args.get('mood')
        if not username:
            return jsonify({'error': 'Username required'}), 400

        chats_file = 'chats.json'
        if not os.path.exists(chats_file):
            return jsonify([])

        with open(chats_file, 'r', encoding='utf-8') as f:
            chats = json.load(f)

        user_entries = chats["users"].get(username, [])

        if mood:
            # Return single entry for the mood
            for entry in user_entries:
                if entry["mood"] == mood:
                    # Sort messages by timestamp
                    entry["messages"].sort(key=lambda m: m.get('timestamp', ''))
                    return jsonify([entry])
            return jsonify([])
        else:
            # Return all entries, sorted messages
            for entry in user_entries:
                entry["messages"].sort(key=lambda m: m.get('timestamp', ''))
            return jsonify(user_entries)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Mood detection endpoint
@app.route('/detect_mood', methods=['POST'])
def detect_mood():
    try:
        # Mock mood detection (DeepFace not compatible with Python 3.14)
        detected_mood = 'neutral'

        return jsonify({'mood': detected_mood})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Content generation endpoint
@app.route('/generate_content', methods=['POST'])
def generate_content():
    try:
        data = request.json
        mood = data['mood']
        content_type = data['type']

        if not client:
            return jsonify({'error': 'OpenAI client not configured'}), 500

        if content_type == 'jokes':
            prompt = f"Generate exactly 3 original, short, funny jokes suitable for someone feeling {mood}. Do not use any pre-existing, common, or known jokes; create completely new ones from scratch. Format strictly as a numbered list: 1. [Joke one]. 2. [Joke two]. 3. [Joke three]."
        elif content_type == 'shayari':
            prompt = f"Generate exactly 3 original short shayari (Hindi poetry lines) that evoke a {mood} mood. Do not use any pre-existing, famous, or known shayari; create completely new ones from scratch. Format strictly as a numbered list: 1. [Shayari one]. 2. [Shayari two]. 3. [Shayari three]."
        elif content_type == 'songs':
            prompt = f"Generate exactly 3 original existing Hindi song  (with the artist name of the song ) that would suit a {mood} mood. Do suggest any real existing songs, artists, or known titles; . Format strictly as a numbered list: 1. [Song Title] - [Fictional Artist]. 2. [Song Title] - [Fictional Artist]. 3. [Song Title] - [Fictional Artist]."
        else:
            return jsonify({'error': 'Invalid content type'}), 400

        response = client.responses.create(
            model="gpt-5-nano",
            input=prompt,
            store=True,
        )

        generated_text = response.output_text.strip()
        # Improved parsing: extract lines starting with numbers
        items = []
        lines = generated_text.split('\n')
        for line in lines:
            line = line.strip()
            if line and line[0].isdigit() and '.' in line:
                # Extract after number and dot
                item = line.split('.', 1)[1].strip() if '.' in line else line
                items.append(item)
            elif line.startswith('-') and len(items) < 3:
                items.append(line.strip('- ').strip())

        # Ensure exactly 3, pad with defaults if needed
        while len(items) < 3:
            items.append(f"Original {content_type} for {mood} mood (AI generation incomplete)")

        return jsonify({'items': items[:3]})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Chat endpoint
@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        mood = data.get('mood', 'neutral')
        user_message = data.get('message', '')

        if not client:
            return jsonify({'error': 'OpenAI client not configured'}), 500

        prompt = f"You are an empathetic AI friend helping someone who is feeling {mood}. Respond in a supportive, understanding way. Keep responses concise (under 100 words) and focus on emotional support, advice, or light conversation. Current mood: {mood}. User message: {user_message}"

        response = client.responses.create(
            model="gpt-5-nano",
            input=prompt,
            store=True,
        )

        bot_response = response.output_text.strip()
        return jsonify({'response': bot_response})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
