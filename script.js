let username = '';
let currentMood = '';
let lastDetectedMood = '';
let detectionInterval = null;
let modelsLoaded = false;
let chatHistory = [];
let moodHistory = [];
let messagesToShow = 20;
let historyMessagesToShow = 20;
let loadedHistory = [];
let staticContent = {};

// Load static content from JSON
async function loadStaticContent() {
    try {
        const response = await fetch('/static-content.json');
        staticContent = await response.json();
    } catch (err) {
        console.error('Error loading static content:', err);
        // No fallback; staticContent remains empty
    }
}

// Load on page load
document.addEventListener('DOMContentLoaded', () => {
    // Show username input first
    document.getElementById('username-container').style.display = 'block';
    document.querySelector('.container').style.display = 'none';
    loadStaticContent();

    // Sidebar toggle functionality
    document.getElementById('sidebar-toggle').addEventListener('click', () => {
        const sidebar = document.querySelector('.sidebar');
        sidebar.classList.toggle('hidden');
    });
});

// Username submit
document.getElementById('submit-username').addEventListener('click', () => {
    username = document.getElementById('username-input').value.trim();
    if (username) {
        document.getElementById('username-container').style.display = 'none';
        document.querySelector('.container').style.display = 'block';
        currentMood = 'neutral'; // Default mood for chat saving
    } else {
        alert('Please enter a username.');
    }
});

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
document.getElementById('view-history-btn').addEventListener('click', () => {
    document.getElementById('history-modal').style.display = 'block';
});
document.getElementById('close-history').addEventListener('click', () => {
    document.getElementById('history-modal').style.display = 'none';
});
document.getElementById('search-history-btn').addEventListener('click', async () => {
    const searchUser = document.getElementById('search-history').value.trim();
    if (searchUser) {
        try {
            const res = await fetch(`/load_chat?username=${encodeURIComponent(searchUser)}`);
            loadedHistory = await res.json();
            const content = document.getElementById('history-content');
            content.innerHTML = '';
            if (loadedHistory.length === 0) {
                content.innerHTML = '<p>No history found.</p>';
            } else {
                renderHistory(loadedHistory, content);
                const loadMoreBtn = document.getElementById('load-more-history');
                if (loadMoreBtn) {
                    loadMoreBtn.style.display = loadedHistory.some(chat => chat.messages.length > historyMessagesToShow) ? 'block' : 'none';
                }
            }
        } catch (err) {
            console.error('Load history error:', err);
            document.getElementById('history-content').innerHTML = '<p>Error loading history.</p>';
        }
    }
});

function renderHistory(history, content) {
    history.forEach(chat => {
        const div = document.createElement('div');
        const slicedMessages = chat.messages.slice(-historyMessagesToShow);
        div.innerHTML = `<h4>Mood: ${chat.mood} (Last updated: ${new Date(chat.date).toLocaleString()})</h4><ul>${slicedMessages.map(m => `<li><strong>[${new Date(m.timestamp).toLocaleTimeString()}] ${m.sender}:</strong> ${m.text}</li>`).join('')}</ul><hr>`;
        content.appendChild(div);
    });
}

document.getElementById('load-more-history').addEventListener('click', () => {
    historyMessagesToShow += 20;
    const content = document.getElementById('history-content');
    content.innerHTML = '';
    renderHistory(loadedHistory, content);
    const loadMoreBtn = document.getElementById('load-more-history');
    loadMoreBtn.style.display = loadedHistory.some(chat => chat.messages.length > historyMessagesToShow) ? 'block' : 'none';
});
document.getElementById('chat-send').addEventListener('click', sendChatMessage);
document.getElementById('chat-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendChatMessage();
    }
});
document.getElementById('load-more').addEventListener('click', loadMoreMessages);

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

    // Load existing chat history for this mood if username exists
    if (username && currentMood) {
        fetch(`/load_chat?username=${encodeURIComponent(username)}&mood=${encodeURIComponent(currentMood)}`)
            .then(response => response.json())
            .then(data => {
                if (data && data.length > 0) {
                    chatHistory = data[0].messages || [];
                    messagesToShow = chatHistory.length;
                    moodHistory = chatHistory.slice();
                } else {
                    chatHistory = [];
                    messagesToShow = 20;
                    moodHistory = [];
                }

                // If chatbox is open, render existing and add greeting only if no history
                const chatbox = document.getElementById('chatbox');
                if (chatbox.style.display === 'flex') {
                    renderMessages(true);
                    if (chatHistory.length === 0) {
                        addMessage(`Hi! I see you're feeling ${currentMood}. How can I help you today?`, 'bot');
                    }
                }
            })
            .catch(err => {
                console.error('Error loading chat history:', err);
                chatHistory = [];
                messagesToShow = 20;
                moodHistory = [];
            });
    } else {
        chatHistory = [];
        messagesToShow = 20;
        moodHistory = [];
    }

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

    // Single mood only, as mixed moods are not supported with radio buttons
    if (staticContent[currentMood] && staticContent[currentMood][type]) {
        staticContent[currentMood][type].forEach(item => {
            const li = document.createElement('li');
            if (type === 'songs' && item.includes('https://')) {
                const [songName, link] = item.split(' (');
                const cleanLink = link.replace(')', '');
                // Extract video ID from YouTube URL
                const videoIdMatch = cleanLink.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
                const videoId = videoIdMatch ? videoIdMatch[1] : '';
                if (videoId) {
                    li.innerHTML = `
                        <div style="margin-bottom: 20px;">
                            <strong>${songName}</strong>
                            <iframe width="100%" height="200" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="border-radius: 5px;"></iframe>
                        </div>
                    `;
                } else {
                    li.textContent = songName;
                }
            } else {
                li.textContent = item;
            }
            list.appendChild(li);
        });
    } else {
        const li = document.createElement('li');
        li.textContent = 'No content available for this mood.';
        list.appendChild(li);
    }
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
        if (chatHistory.length === 0 && currentMood) {
            addMessage(`Hi! I see you're feeling ${currentMood}. How can I help you today?`, 'bot');
            // Save the greeting
            if (username && currentMood) {
                fetch('/save_chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: username,
                        mood: currentMood,
                        messages: [{ text: `Hi! I see you're feeling ${currentMood}. How can I help you today?`, sender: 'bot', timestamp: new Date().toISOString() }]
                    })
                }).then(() => {
                    moodHistory = chatHistory.slice();
                }).catch(err => console.error('Save greeting error:', err));
            }
        } else if (chatHistory.length === 0) {
            addMessage('Hi! Detect your mood first or select manually to chat about your emotions.', 'bot');
        } else if (currentMood) {
            // If history exists but no greeting added yet, don't add duplicate
            renderMessages(true);
        }
        renderMessages(true); // Ensure messages are rendered and scrolled to bottom when opening
    }
}

function addMessage(text, sender) {
    const messagesContainer = document.getElementById('chat-messages');
    chatHistory.push({ text, sender, timestamp: new Date().toISOString() });
    renderMessages(true); // Always scroll to bottom for new messages

    // Simulate typing effect for bot messages
    if (sender === 'bot') {
        const messageDivs = messagesContainer.querySelectorAll('.chat-message');
        const lastMessageDiv = messageDivs[messageDivs.length - 1];
        if (lastMessageDiv && lastMessageDiv.classList.contains('bot')) {
            lastMessageDiv.textContent = '';
            let i = 0;
            const timer = setInterval(() => {
                if (i < text.length) {
                    lastMessageDiv.textContent += text.charAt(i);
                    i++;
                } else {
                    clearInterval(timer);
                }
            }, 50); // Adjust speed as needed
        }
    }
}

function renderMessages(autoScroll = true) {
    const messagesContainer = document.getElementById('chat-messages');
    const loadMoreBtn = document.getElementById('load-more');

    // Clear existing messages except the load more button
    const existingMessages = messagesContainer.querySelectorAll('.chat-message');
    existingMessages.forEach(msg => msg.remove());

    // Determine which messages to show (last N messages)
    const startIndex = Math.max(0, chatHistory.length - messagesToShow);
    const messagesToRender = chatHistory.slice(startIndex);

    // Show/hide load more button
    if (chatHistory.length > messagesToShow) {
        loadMoreBtn.style.display = 'block';
    } else {
        loadMoreBtn.style.display = 'none';
    }

    // Render only the sliced messages
    messagesToRender.forEach(msg => {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('chat-message', msg.sender);
        messageDiv.textContent = msg.text;
        messagesContainer.appendChild(messageDiv);
    });

    // Scroll to bottom only if autoScroll is true
    if (autoScroll) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

function loadMoreMessages() {
    messagesToShow += 10; // Load 10 more messages
    renderMessages(true); // Always scroll to bottom when loading more
}

function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    if (!message) return;

    addMessage(message, 'user');
    input.value = '';

    // Save user message immediately
    if (username && currentMood) {
        const userMsg = { sender: 'user', text: message, timestamp: chatHistory[chatHistory.length - 1].timestamp };
        fetch('/save_chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: username,
                mood: currentMood,
                messages: [userMsg]
            })
        }).then(() => {
            moodHistory = chatHistory.slice();
        }).catch(err => console.error('Save user message error:', err));
    }

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
            // Save error message as bot
            if (username && currentMood) {
                const errorMsg = { sender: 'bot', text: 'Sorry, I encountered an error. Try again!', timestamp: new Date().toISOString() };
                fetch('/save_chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: username,
                        mood: currentMood,
                        messages: [errorMsg]
                    })
                }).then(() => {
                    moodHistory = chatHistory.slice();
                }).catch(err => console.error('Save error message error:', err));
            }
        } else {
            addMessage(data.response, 'bot');
            // Save bot response
            if (username && currentMood) {
                const botMsg = { sender: 'bot', text: data.response, timestamp: chatHistory[chatHistory.length - 1].timestamp };
                fetch('/save_chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: username,
                        mood: currentMood,
                        messages: [botMsg]
                    })
                }).then(() => {
                    moodHistory = chatHistory.slice();
                }).catch(err => console.error('Save bot response error:', err));
            }
        }
    })
    .catch(err => {
        addMessage('Sorry, something went wrong. Please try again.', 'bot');
        // Save error message as bot
        if (username && currentMood) {
            const errorMsg = { sender: 'bot', text: 'Sorry, something went wrong. Please try again.', timestamp: new Date().toISOString() };
            fetch('/save_chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: username,
                    mood: currentMood,
                    messages: [errorMsg]
                })
            }).then(() => {
                moodHistory = chatHistory.slice();
            }).catch(err => console.error('Save catch error message error:', err));
        }
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
