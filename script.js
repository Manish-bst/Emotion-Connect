let currentMood = '';
let lastDetectedMood = '';
let detectionInterval = null;
let modelsLoaded = false;
let chatHistory = [];
let messagesToShow = 20;

// Static content fallback (enhanced relatable content with valid links)
const content = {
    happy: {
        jokes: [
            "Why don't scientists trust atoms? Kyun ki woh sab kuch banate hain, lekin kabhi credit nahi lete! 😄🔬",
            "Mera computer break mang raha tha, toh maine Kit-Kat di - ab woh mujhe chocolates bhej raha hai! 😂💻",
            "Cycle kyun gir gayi? Kyun ki woh two-tired thi, aur ek wheel pe kaam kar rahi thi! 🚲😆"
        ],
        shayari: [
            "Hansi ki baarish, dil ko bhigo de, khushi ka jadoo, har ghum bhula de. 😊🌈",
            "Muskan ki kiran, andhere ko mitaye, zindagi ka rang, naye rang bharaaye. ✨😂"
        ],
        songs: [
            "Badtameez Dil - Yeh Jawaani Hai Deewani (https://www.youtube.com/watch?v=II2EO3Nw4m0&list=RDII2EO3Nw4m0&start_radio=1&pp=ygUnQmFkdGFtZWV6IERpbCAtIFllaCBKYXdhYW5pIEhhaSBEZWV3YW5poAcB)",
            "Gallan Goodiyaan - Dil Dhadakne Do (https://www.youtube.com/watch?v=jCEdTq3j-0U&list=RDjCEdTq3j-0U&start_radio=1&pp=ygUiR2FsbGFuIEdvb2RpeWFhbiAtIERpbCBEaGFkYWtuZSBEb6AHAQ%3D%3D)",
            "London Thumakda - Queen (https://www.youtube.com/watch?v=udra3Mfw2oo&list=RDudra3Mfw2oo&start_radio=1&pp=ygUXTG9uZG9uIFRodW1ha2RhIC0gUXVlZW6gBwE%3DU)"
        ]
    },
    sad: {
        jokes: [
            "Scarecrow ko award mila kyun? Kyun ki woh outstanding tha, field mein khada reh kar! 🌾😔",
            "Fake spaghetti ko kya kehte hain? An impasta - aur woh bhi jail mein hai! 🍝😢",
            "Skeletons kyun nahi ladte? Kyun ki unke paas guts hi nahi hain, sirf bones! 💀😞"
        ],
        shayari: [
            "Aansoon ki boondein, dil se tapke, gham ki yaadein, mann ko sataye. 😢💧",
            "Dard ki raah mein, akela chalun, khushi ka intezaar, kabhi na aaye. 💔🌧️"
        ],
        songs: [
            "Tum Hi Ho - Aashiqui 2 (https://www.youtube.com/watch?v=IJq0yyWug1k&list=RDIJq0yyWug1k&start_radio=1&pp=ygUWVHVtIEhpIEhvIC0gQWFzaGlxdWkgMqAHAdIHCQkDCgGHKiGM7w%3D%3D)",
            "Channa Mereya - Ae Dil Hai Mushkil (https://www.youtube.com/watch?v=284Ov7ysmfA&list=RD284Ov7ysmfA&start_radio=1&pp=ygUiQ2hhbm5hIE1lcmV5YSAtIEFlIERpbCBIYWkgTXVzaGtpbKAHAQ%3D%3D)",
            "Samjhawan - Humpty Sharma Ki Dulhania (https://www.youtube.com/watch?v=H2f7MZaw3Yo&list=RDH2f7MZaw3Yo&start_radio=1&pp=ygUlU2Ftamhhd2FuIC0gSHVtcHR5IFNoYXJtYSBLaSBEdWxoYW5pYaAHAQ%3D%3D)"
        ]
    },
    angry: {
        jokes: [
            "Math book sad kyun tha? Kyun ki uske paas too many problems the, aur solutions kam! 📚😠",
            "Toothless bear ko kya kehte hain? Gummy bear - woh bhi chocolate wala! 🐻🍫🤬",
            "Golfer ne do pants kyun pehni? Kyun ki ek mein hole in one tha! ⛳😡"
        ],
        shayari: [
            "Gusse ki aag, dil ko jalaaye, shanti ki dhun, door bhagaaye. 🔥😠",
            "Krodh ka toofan, mann mein utha, sukoon ka sapna, toot gaya sada. ⚡🤬"
        ],
        songs: [
            "Gallan Goodiyaan - Dil Dhadakne Do (hhttps://www.youtube.com/watch?v=jCEdTq3j-0U&list=RDjCEdTq3j-0U&start_radio=1&pp=ygUiR2FsbGFuIEdvb2RpeWFhbiAtIERpbCBEaGFkYWtuZSBEb6AHAQ%3D%3D)",
            "Malhari - Bajirao Mastani (https://www.youtube.com/watch?v=l_MyUGq7pgs&list=RDl_MyUGq7pgs&start_radio=1&pp=ygUZTWFsaGFyaSAtIEJhamlyYW8gTWFzdGFuaaAHAQ%3D%3D)",
            "Kamariya - Mitron (https://www.youtube.com/watch?v=MhPNBN9knIk&list=RDMhPNBN9knIk&start_radio=1&pp=ygUSS2FtYXJpeWEgLSBNaXRyb24goAcB)"
        ]
    },
    neutral: {
        jokes: [
            "Tomato red kyun hua? Kyun ki salad dressing ko dekh kar sharma gaya! 🍅😐",
            "Watch se banaye belt ko kya kehte hain? Waist of time - aur woh bhi tick tick karta hai! ⌚😐",
            "Coffee ne police complaint kyun ki? Kyun ki woh mugged tha, aur uska mug chori ho gaya! ☕😐"
        ],
        shayari: [
            "Sukoon ki dhun, dil mein basi, na khushi na gham, bas yun hi rasi. 😐🌿",
            "Aram ki lehren, mann ko behlaaye, zindagi ka safar, aaram se jaaye. 🕊️😌"
        ],
        songs: [
            "Kal Ho Naa Ho - Kal Ho Naa Ho (https://www.youtube.com/watch?v=g0eO74UmRBs&list=RDg0eO74UmRBs&start_radio=1&pp=ygUdS2FsIEhvIE5hYSBIbyAtIEthbCBIbyBOYWEgSG-gBwE%3D)",
            "Tum Se Hi - Jab We Met (https://www.youtube.com/watch?v=mt9xg0mmt28&list=RDmt9xg0mmt28&start_radio=1&pp=ygUWVHVtIFNlIEhpIC0gSmFiIFdlIE1ldKAHAQ%3D%3D)",
            "Jeene Laga Hoon - Ramaiya Vastavaiya (https://www.youtube.com/watch?v=qpIdoaaPa6U&list=RDqpIdoaaPa6U&start_radio=1&pp=ygUkSmVlbmUgTGFnYSBIb29uIC0gUmFtYWl5YSBWYXN0YXZhaXlhoAcB)"
        ]
    },
    fear: {
        jokes: [
            "Ghosts rain se kyun darte hain? Kyun ki woh unki spirits ko dampen kar deti hai! 👻😨",
            "Ghost ki true love ko kya kehte hain? Ghoul-friend - aur woh bhi spooky! 💀😱",
            "Ghost party mein kyun gaya? Kyun ki woh boo-last tha! 🎉😰"
        ],
        shayari: [
            "Dar ki raat, andhera ghere, himmat ki roshni, abhi na aaye. 🌑😨",
            "Bhayaan ke jaal, dil ko bandhe, azadi ka geet, abhi na gaaye. ⚡😱"
        ],
        songs: [
            "Aankhon Ki Gustakhiyan - Hum Dil De Chuke Sanam (https://www.youtube.com/watch?v=7k5gM4ClRRo&list=RD7k5gM4ClRRo&start_radio=1&pp=ygUvQWFua2hvbiBLaSBHdXN0YWtoaXlhbiAtIEh1bSBEaWwgRGUgQ2h1a2UgU2FuYW2gBwHSBwkJAwoBhyohjO8%3D)",
            "Dil Diyan Gallan - Tiger Zinda Hai (https://www.youtube.com/watch?v=SAcpESN_Fk4&list=RDSAcpESN_Fk4&start_radio=1&pp=ygUiRGlsIERpeWFuIEdhbGxhbiAtIFRpZ2VyIFppbmRhIEhhaaAHAQ%3D%3D)",
            "Yeh Ishq Hai - Jab We Met (https://www.youtube.com/watch?v=dXpG0kavjUo&list=RDdXpG0kavjUo&start_radio=1&pp=ygUaWWVoIElzaHEgSGFpIC0gSmFiIFdlIE1ldCCgBwE%3D)"
        ]
    },
    surprise: {
        jokes: [
            "Student ne homework kyun kha liya? Kyun ki teacher ne kaha tha piece of cake! 📚😲",
            "Magic show mein kyun gaya? Kyun ki surprise ka intezaar tha, ab toh amazed ho gaya! 🎩😮",
            "Gift kholte hi kya hua? Surprise ka dhamaal, dil khush ho gaya! 🎁😲"
        ],
        shayari: [
            "Achanak ki chamak, dil ko jagaye, hairat ka rang, naye rang bharaaye. 😲✨",
            "Wonder ki duniya, nazar aaye, har pal naya, sapna sa laaye. 🌟😮"
        ],
        songs: [
            "Aankh Marey - Simmba (https://www.youtube.com/watch?v=_KhQT-LGb-4&list=RD_KhQT-LGb-4&start_radio=1&pp=ygUVQWFua2ggTWFyZXkgLSBTaW1tYmEgoAcB)",
            "Tum Se Hi - Jab We Met (https://www.youtube.com/watch?v=Cb6wuzOurPc&list=RDCb6wuzOurPc&start_radio=1&pp=ygUWVHVtIFNlIEhpIC0gSmFiIFdlIE1ldKAHAQ%3D%3D)",
            "Zingaat - Sairat (https://www.youtube.com/watch?v=2gcsgfzqN8k&list=RD2gcsgfzqN8k&start_radio=1&pp=ygUQWmluZ2FhdCAtIFNhaXJhdKAHAQ%3D%3D)"
        ]
    },
    disgust: {
        jokes: [
            "Cookie doctor ke paas kyun gaya? Kyun ki woh crummy feel kar raha tha! 🍪🤢",
            "Kisi aur ka cheese ko kya kehte hain? Nacho cheese - aur woh bhi stolen! 🧀😖",
            "Scientists atoms ko trust kyun nahi karte? Kyun ki woh bad smells bhi banate hain! ⚛️🤮"
        ],
        shayari: [
            "Ghin ki hawa, dil ko bhaaye na, saaf raahon ka, ab intezaar karna. 🤢🧼",
            "Beizzati ki lehar, mann ko sataye, pavitrata ka, geet ab gaaye. 😖💧"
        ],
        songs: [
            "Naatu Naatu - RRR (https://www.youtube.com/watch?v=sAzlWScHTc4&list=RDsAzlWScHTc4&start_radio=1&pp=ygUSTmFhdHUgTmFhdHUgLSBSUlIgoAcB)",
            "Shake It Off - Taylor Swift (https://www.youtube.com/watch?v=5zHicybHGV0&list=RD5zHicybHGV0&start_radio=1&pp=ygUbU2hha2UgSXQgT2ZmIC0gVGF5bG9yIFN3aWZ0oAcB)",
            "Socha Hai - Rock On (https://www.youtube.com/watch?v=dnXGxMlV-rU&list=RDdnXGxMlV-rU&start_radio=1&pp=ygUTU29jaGEgSGFpIC0gUm9jayBPbqAHAQ%3D%3DI)"
        ]
    }
};

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

document.getElementById('submit-username').addEventListener('click', handleUsernameSubmit);

function handleUsernameSubmit() {
    const usernameInput = document.getElementById('username-input');
    const username = usernameInput.value.trim();
    if (username === '') {
        alert('Please enter your username.');
        return;
    }
    localStorage.setItem('username', username);
    document.getElementById('username-container').style.display = 'none';
    document.querySelector('.container').style.display = 'block';
    usernameInput.value = ''; // Clear input
}

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

    // Clear chat history for new mood
    chatHistory = [];
    messagesToShow = 20;

    // If chatbox is open, update greeting
    const chatbox = document.getElementById('chatbox');
    if (chatbox.style.display === 'flex') {
        addMessage(`Hi! I see you're feeling ${currentMood}. How can I help you today?`, 'bot');
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
    if (content[currentMood] && content[currentMood][type]) {
        content[currentMood][type].forEach(item => {
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
        } else if (chatHistory.length === 0) {
            addMessage('Hi! Detect your mood first or select manually to chat about your emotions.', 'bot');
        }
        renderMessages(true); // Ensure messages are rendered and scrolled to bottom when opening
    }
}

function addMessage(text, sender) {
    const messagesContainer = document.getElementById('chat-messages');
    const isNearBottom = messagesContainer.scrollTop + messagesContainer.clientHeight >= messagesContainer.scrollHeight - 100;
    chatHistory.push({ text, sender });
    renderMessages(isNearBottom);
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
    } 
    else {
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
