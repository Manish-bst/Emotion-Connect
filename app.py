from flask import Flask, request, jsonify, send_from_directory
from deepface import DeepFace
import base64
import cv2
import numpy as np
import os
import openai
app = Flask(__name__)
# Set OpenAI API key from environment variable
openai.api_key = os.getenv('OPENAI_API_KEY')

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

@app.route('/Manish.jpg')
def manish_img():
    return send_from_directory('..', 'Manish.jpg')

@app.route('/Mayank.jpg')
def mayank_img():
    return send_from_directory('..', 'Mayank.jpg')

# Mood detection endpoint
@app.route('/detect_mood', methods=['POST'])
def detect_mood():
    try:
        data = request.json
        image_data = data['image'].split(',')[1]  # Remove data:image/jpeg;base64,
        image_bytes = base64.b64decode(image_data)
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        # Analyze emotion with DeepFace
        result = DeepFace.analyze(img, actions=['emotion'], enforce_detection=False)
        dominant_emotion = result[0]['dominant_emotion']

        # Map DeepFace emotions to our content moods
        mood_map = {
            'happy': 'happy',
            'sad': 'sad',
            'angry': 'angry',
            'fear': 'fear',
            'surprise': 'surprise',
            'disgust': 'disgust',
            'neutral': 'neutral'
        }
        detected_mood = mood_map.get(dominant_emotion.lower(), 'neutral')

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

        if not openai.api_key:
            return jsonify({'error': 'OpenAI API key not configured'}), 500

        client = openai.OpenAI(api_key=openai.api_key)

        if content_type == 'jokes':
            prompt = f"Generate exactly 3 original, short, funny jokes suitable for someone feeling {mood}. Do not use any pre-existing, common, or known jokes; create completely new ones from scratch. Format strictly as a numbered list: 1. [Joke one]. 2. [Joke two]. 3. [Joke three]."
        elif content_type == 'shayari':
            prompt = f"Generate exactly 3 original short shayari (Hindi poetry lines) that evoke a {mood} mood. Do not use any pre-existing, famous, or known shayari; create completely new ones from scratch. Format strictly as a numbered list: 1. [Shayari one]. 2. [Shayari two]. 3. [Shayari three]."
        elif content_type == 'songs':
            prompt = f"Generate exactly 3 original song title ideas (with fictional artist names) that would suit a {mood} mood. Do not suggest any real existing songs, artists, or known titles; create completely new ones from scratch. Format strictly as a numbered list: 1. [Song Title] - [Fictional Artist]. 2. [Song Title] - [Fictional Artist]. 3. [Song Title] - [Fictional Artist]."
        else:
            return jsonify({'error': 'Invalid content type'}), 400

        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
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
        data = request.json
        mood = data.get('mood', 'neutral')
        user_message = data.get('message', '')

        if not openai.api_key:
            return jsonify({'error': 'OpenAI API key not configured'}), 500

        client = openai.OpenAI(api_key=openai.api_key)

        prompt = f"You are an empathetic AI friend helping someone who is feeling {mood}. Respond in a supportive, understanding way. Keep responses concise (under 100 words) and focus on emotional support, advice, or light conversation. Current mood: {mood}. User message: {user_message}"

        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=150,
            temperature=0.7
        )

        bot_response = response.choices[0].message.content.strip()
        return jsonify({'response': bot_response})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)



