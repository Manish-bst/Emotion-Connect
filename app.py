from flask import Flask, send_from_directory, request, jsonify
import logging
from openai import OpenAI
import os
import json
from datetime import datetime
import base64
import numpy as np
import cv2
from deepface import DeepFace
from dotenv import load_dotenv
from flask_cors import CORS

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize OpenAI client using environment variable
api_key = os.environ.get('OPENAI_API_KEY')
client = OpenAI(api_key=api_key) if api_key else None
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
    detected_mood = 'neutral'
    try:
        logger.info("Received mood detection request.")
        data = request.json
        image_data = data.get('image')
        if not image_data:
            logger.warning("No image data provided in request.")
            return jsonify({'mood': detected_mood})

        # Decode base64 image
        header, encoded = image_data.split(",", 1)
        image_bytes = base64.b64decode(encoded)
        np_arr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if img is None:
            logger.warning("Invalid image data provided.")
            return jsonify({'mood': detected_mood})

        logger.info("Image decoded successfully. Analyzing emotions with DeepFace...")

        try:
            result = DeepFace.analyze(img, actions=['emotion'], enforce_detection=False)
            if result:
                detected_mood = result[0]['dominant_emotion']
                logger.info(f"Detected mood: {detected_mood}")
            else:
                logger.warning("No face detected in the image.")
        except Exception as e:
            logger.error(f"DeepFace error: {e}")
    except Exception as e:
        logger.error(f"Unexpected error in detect_mood: {str(e)}")

    return jsonify({'mood': detected_mood})

# Content generation endpoint
@app.route('/generate_content', methods=['POST'])
def generate_content():
    try:
        if not client:
            return jsonify({'error': 'OpenAI API key not configured'}), 500

        data = request.json
        mood = data['mood']
        content_type = data['type']

        if content_type == 'jokes':
            prompt = f"Generate exactly 3 original, short, funny jokes suitable for someone feeling {mood}. Do not use any pre-existing, common, or known jokes; create completely new ones from scratch. Format strictly as a numbered list: 1. [Joke one]. 2. [Joke two]. 3. [Joke three]."
        elif content_type == 'shayari':
            prompt = f"Generate exactly 3 original short shayari (Hindi poetry lines) that evoke a {mood} mood. Do not use any pre-existing, famous, or known shayari; create completely new ones from scratch. Format strictly as a numbered list: 1. [Shayari one]. 2. [Shayari two]. 3. [Shayari three]."
        elif content_type == 'songs':
            prompt = f"Generate exactly 3 original song title (with artist names) that would suit a {mood} mood. Do not suggest any real existing hindi songs, artists, or known titles; create completely new ones from scratch. Format strictly as a numbered list: 1. [Song Title] - [Fictional Artist]. 2. [Song Title] - [Fictional Artist]. 3. [Song Title] - [Fictional Artist]."
        else:
            return jsonify({'error': 'Invalid content type'}), 400

        response = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="gpt-3.5-turbo",
            max_tokens=300,
            temperature=0.8
        )

        generated_text = response.choices[0].message.content.strip()
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
        if not client:
            return jsonify({'error': 'OpenAI API key not configured'}), 500

        data = request.json
        mood = data.get('mood', 'neutral')
        user_message = data.get('message', '')

        prompt = f"You are an empathetic AI friend helping someone who is feeling {mood}. Respond in a supportive, understanding way. Keep responses concise (under 100 words) and focus on emotional support, advice, or light conversation. Current mood: {mood}. User message: {user_message}"

        response = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="gpt-3.5-turbo",
            max_tokens=150,
            temperature=0.7
        )

        bot_response = response.choices[0].message.content.strip()
        return jsonify({'response': bot_response})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
