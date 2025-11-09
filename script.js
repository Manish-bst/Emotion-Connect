let currentMood = '';
let lastDetectedMood = '';
let detectionInterval = null;
let modelsLoaded = false;



// Event listeners
document.getElementById('webcam-btn').addEventListener('click', startWebcam);
document.getElementById('upload-btn').addEventListener('click', () => document.getElementById('file-input').click());
document.getElementById('file-input').addEventListener('change', handleFileUpload);
document.getElementById('manual-btn').addEventListener('click', showManualInput);
document.getElementById('submit-mood').addEventListener('click', handleManualMood);
document.getElementById('back-to-home-manual').addEventListener('click', backToHome);
document.getElementById('capture-btn').addEventListener('click', captureImage);
document.getElementById('back-btn').addEventListener('click', backToMoodSelection);
document.getElementById('back-to-home').addEventListener('click', backToHome);
document.getElementById('back-to-home-rec').addEventListener('click', backToHome);

// Content buttons
document.querySelectorAll('.content-btn').forEach(btn => {
    btn.addEventListener('click', (e) => showRecommendations(e.target.dataset.type));
});

// Chatbox event listeners
document.getElementById('chatbox-toggle-btn').addEventListener('click', toggleChatbox);
document.getElementById('chatbox-toggle').addEventListener('click', toggleChatbox);
document.getElementById('chat-send').addEventListener('click', sendChatMessage);
document.getElementById('chat-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendChatMessage();
    }
});

function startWebcam() {
    document.querySelector('.options').style.display = 'none';
    document.getElementById('camera-container').style.display = 'block';
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            const video = document.getElementById('video');
            video.srcObject = stream;
            video.onloadedmetadata = () => {
                const canvas = document.getElementById('overlay');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                loadModels();
            };
        })
        .catch(err => {
            alert('Error accessing webcam: ' + err.message);
        });
}

async function loadModels() {
    if (modelsLoaded) return;
    const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
    try {
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
        modelsLoaded = true;
        startDetection();
    } catch (err) {
        console.error('Error loading models:', err);
        alert('Error loading face detection models. Falling back to backend detection.');
    }
}

function startDetection() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('overlay');
    const ctx = canvas.getContext('2d');

    detectionInterval = setInterval(async () => {
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
                .withFaceExpressions();

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            detections.forEach(detection => {
                const box = detection.detection.box;
                const expressions = detection.expressions;
                const maxEmotion = Object.keys(expressions).reduce((a, b) => expressions[a] > expressions[b] ? a : b);
                lastDetectedMood = mapEmotion(maxEmotion);

                // Draw bounding box (square-like, but use actual box)
                ctx.strokeStyle = '#00ff00';
                ctx.lineWidth = 2;
                ctx.strokeRect(box.x, box.y, box.width, box.height);

                // Draw emotion label above box
                ctx.fillStyle = '#00ff00';
                ctx.font = '16px Arial';
                ctx.fillText(maxEmotion.toUpperCase(), box.x, box.y - 5);
            });
        }
    }, 100); // Detect every 100ms for real-time feel
}

function mapEmotion(emotion) {
    const mapping = {
        happy: 'happy',
        sad: 'sad',
        angry: 'angry',
        fearful: 'fear',
        disgusted: 'disgust',
        surprised: 'surprise',
        neutral: 'neutral'
    };
    return mapping[emotion] || 'neutral';
}

function captureImage() {
    const video = document.getElementById('video');
    if (lastDetectedMood) {
        currentMood = lastDetectedMood;
    } else {
        // Fallback to backend if no live detection
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg');
        
        fetch('/detect_mood', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ image: imageData }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert('Error detecting mood: ' + data.error);
                return;
            }
            currentMood = data.mood;
        })
        .catch(err => {
            alert('Error: ' + err.message);
            currentMood = 'neutral'; // Default fallback
        });
    }
    
    // Stop detection and webcam
    if (detectionInterval) {
        clearInterval(detectionInterval);
        detectionInterval = null;
    }
    video.srcObject.getTracks().forEach(track => track.stop());
    
    showMoodDisplay();
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const imageData = e.target.result;
            
            // Send to backend for mood detection
            fetch('/detect_mood', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ image: imageData }),
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    alert('Error detecting mood: ' + data.error);
                    return;
                }
                currentMood = data.mood;
                showMoodDisplay();
            })
            .catch(err => {
                alert('Error: ' + err.message);
            });
        };
        reader.readAsDataURL(file);
    }
}

function showManualInput() {
    document.querySelector('.options').style.display = 'none';
    document.getElementById('manual-input').style.display = 'block';
}

function handleManualMood() {
    const selectedRadio = document.querySelector('#mood-radios input:checked');
    if (selectedRadio) {
        currentMood = selectedRadio.value;
        showMoodDisplay();
    } else {
        alert('Please select a mood.');
    }
}

function showMoodDisplay() {
    document.getElementById('camera-container').style.display = 'none';
    document.getElementById('manual-input').style.display = 'none';

    const moodEmojis = {
        happy: '😊',
        sad: '😢',
        angry: '😠',
        fear: '😨',
        surprise: '😲',
        disgust: '🤢',
        neutral: '😐',
        motivated: '💪'
    };

    // Single mood only
    emoji = moodEmojis[currentMood] || '😐';
    moodText = currentMood.charAt(0).toUpperCase() + currentMood.slice(1);
    document.getElementById('detected-mood').innerHTML = emoji + ' ' + moodText;

    document.getElementById('mood-display').style.display = 'block';
}

function showRecommendations(type) {
    const list = document.getElementById('content-list');
    list.innerHTML = '';

    // Try AI first, fallback to static with message
    fetch('/generate_content', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mood: currentMood, type: type }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            console.log('API error, using static content:', data.error);
            // Show AI unable message and then static content
            const aiMessage = document.createElement('li');
            aiMessage.textContent = 'AI was unable to help, but here are our recommendations:';
            aiMessage.style.fontWeight = 'bold';
            aiMessage.style.marginBottom = '10px';
            list.appendChild(aiMessage);
            useStaticContent(type, false); // Don't add another message
        } else {
            data.items.forEach(item => {
                const li = document.createElement('li');
                li.textContent = item;
                list.appendChild(li);
            });
        }
    })
    .catch(err => {
        console.log('API fetch error, using static content:', err);
        // Show AI unable message and then static content
        const aiMessage = document.createElement('li');
        aiMessage.textContent = 'AI was unable to help, but here are our recommendations:';
        aiMessage.style.fontWeight = 'bold';
        aiMessage.style.marginBottom = '10px';
        list.appendChild(aiMessage);
        useStaticContent(type, false); // Don't add another message
    });

    // Keep mood-display visible and show recommendations below it
    document.getElementById('mood-display').style.display = 'block';
    document.getElementById('recommendations').style.display = 'block';
    // Update recommendations header to indicate the type
    document.querySelector('#recommendations h3').textContent = `Recommendations for ${type.charAt(0).toUpperCase() + type.slice(1)}:`;
}

function useStaticContent(type, showMessage = true) {
    const list = document.getElementById('content-list');
    if (showMessage) {
        list.innerHTML = '';
    }

    const li = document.createElement('li');
    li.textContent = 'No content available at the moment. Please try again later.';
    list.appendChild(li);
}

function backToMoodSelection() {
    const list = document.getElementById('content-list');
    list.innerHTML = '';
    document.getElementById('recommendations').style.display = 'none';
    // Keep mood-display visible for reselection
    document.getElementById('mood-display').style.display = 'block';
}

function toggleChatbox() {
    const chatbox = document.getElementById('chatbox');
    const toggleBtn = document.getElementById('chatbox-toggle-btn');
    if (chatbox.style.display === 'flex') {
        chatbox.style.display = 'none';
        toggleBtn.textContent = '💬';
    } else {
        chatbox.style.display = 'flex';
        toggleBtn.textContent = '✕';
        if (document.getElementById('chat-messages').children.length === 0 && currentMood) {
            addMessage(`Hi! I see you're feeling ${currentMood}. How can I help you today?`, 'bot');
        } else if (document.getElementById('chat-messages').children.length === 0) {
            addMessage('Hi! Detect your mood first or select manually to chat about your emotions.', 'bot');
        }
    }
}

function addMessage(text, sender) {
    const messages = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('chat-message', sender);
    messageDiv.textContent = text;
    messages.appendChild(messageDiv);
    messages.scrollTop = messages.scrollHeight;
}

function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    if (!message) return;

    addMessage(message, 'user');
    input.value = '';

    // Send to backend
    fetch('/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mood: currentMood, message: message }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            addMessage('Sorry, I encountered an error. Try again!', 'bot');
        } else {
            addMessage(data.response, 'bot');
        }
    })
    .catch(err => {
        addMessage('Sorry, something went wrong. Please try again.', 'bot');
        console.error('Chat error:', err);
    });
}

function backToHome() {
    document.getElementById('mood-display').style.display = 'none';
    document.getElementById('recommendations').style.display = 'none';
    document.querySelector('.options').style.display = 'block';
    document.getElementById('camera-container').style.display = 'none';
    document.getElementById('manual-input').style.display = 'none';
    document.getElementById('file-input').value = '';
    // Clear radios
    document.querySelectorAll('#mood-radios input').forEach(rb => rb.checked = false);
    const video = document.getElementById('video');
    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
        video.srcObject = null;
    }
    if (detectionInterval) {
        clearInterval(detectionInterval);
        detectionInterval = null;
    }
    const overlay = document.getElementById('overlay');
    const ctx = overlay.getContext('2d');
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    modelsLoaded = false;
    currentMood = '';
    lastDetectedMood = '';
}
