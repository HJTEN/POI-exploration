// DOM elements
const mainContent = document.getElementById('main-content');
const startExploringBtn = document.getElementById('start-exploring');
const cameraFeed = document.getElementById('camera-feed');
const canvas = document.getElementById('canvas');
const landmarkInfo = document.getElementById('landmark-info');
const landmarkDescription = document.getElementById('landmark-description');
const placesList = document.getElementById('places-list');

// API keys and endpoints
const GOOGLE_API_KEY = 'YOUR_GOOGLE_API_KEY';
const VISION_API_ENDPOINT = `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_API_KEY}`;
const WIKIPEDIA_API_ENDPOINT = 'https://en.wikipedia.org/w/api.php';

// Navigation
document.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = e.target.getAttribute('href').slice(1);
        showSection(targetId);
    });
});

function showSection(sectionId) {
    document.querySelectorAll('main > section').forEach(section => {
        section.classList.add('hidden');
    });
    document.getElementById(sectionId).classList.remove('hidden');
}

// Start exploring
startExploringBtn.addEventListener('click', () => {
    showSection('explore');
    startCamera();
});

// Camera functionality
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment',
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
        });
        cameraFeed.srcObject = stream;
        await cameraFeed.play();
        detectLandmarks();
    } catch (error) {
        console.error('Error accessing camera:', error);
    }
}

// Landmark detection using Google Vision API
async function detectLandmarks() {
    const ctx = canvas.getContext('2d');
    canvas.width = cameraFeed.videoWidth;
    canvas.height = cameraFeed.videoHeight;

    async function processFrame() {
        ctx.drawImage(cameraFeed, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        const base64Image = imageData.split(',')[1];

        const response = await fetch(VISION_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                requests: [{
                    image: { content: base64Image },
                    features: [{ type: 'LANDMARK_DETECTION', maxResults: 1 }]
                }]
            })
        });

        const data = await response.json();
        if (data.responses[0].landmarkAnnotations) {
            const landmark = data.responses[0].landmarkAnnotations[0];
            updateLandmarkInfo(landmark.description);
            getNearbyPlaces(landmark.locations[0].latLng);
        }

        requestAnimationFrame(processFrame);
    }

    processFrame();
}

async function updateLandmarkInfo(landmarkName) {
    landmarkInfo.querySelector('h2').textContent = landmarkName;
    const description = await getWikipediaDescription(landmarkName);
    landmarkDescription.innerHTML = formatDescriptionAsList(description);
}

function formatDescriptionAsList(description) {
    const sentences = description.split('. ').filter(sentence => sentence.trim() !== '');
    
    let listHtml = '<ul>';
    sentences.forEach(sentence => {
        listHtml += `<li>${sentence.trim()}.</li>`;
    });
    listHtml += '</ul>';
    
    return listHtml;
}

async function getWikipediaDescription(title) {
    const params = new URLSearchParams({
        action: 'query',
        format: 'json',
        titles: title,
        prop: 'extracts',
        exintro: true,
        explaintext: true,
        origin: '*'
    });

    const response = await fetch(`${WIKIPEDIA_API_ENDPOINT}?${params}`);
    const data = await response.json();
    const pages = data.query.pages;
    const pageId = Object.keys(pages)[0];
    return pages[pageId].extract || 'No description available.';
}

function getNearbyPlaces(location) {
    const service = new google.maps.places.PlacesService(document.createElement('div'));
    const request = {
        location: location,
        radius: '500',
        type: ['point_of_interest']
    };

    service.nearbySearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
            updateNearbyPlacesList(results);
        }
    });
}

function updateNearbyPlacesList(places) {
    placesList.innerHTML = '';
    places.slice(0, 5).forEach(place => {
        const li = document.createElement('li');
        li.textContent = place.name;
        placesList.appendChild(li);
    });
}