/* ==========================================
   THE OCEAN'S FEVER - MOTEUR PRINCIPAL (V5)
   ========================================== */

// 1. DOM ELEMENTS
const splashScreen = document.getElementById("splashScreen");
const startAppBtn = document.getElementById("startAppBtn");
const appContent = document.getElementById("appContent");
const audioGuideBtn = document.getElementById("audioGuideBtn");
const playBtn = document.getElementById("playBtn");
const pauseBtn = document.getElementById("pauseBtn");
const stopBtn = document.getElementById("stopBtn");
const muteBtn = document.getElementById("muteBtn");
const compareBtn = document.getElementById("compareBtn");
const video = document.getElementById("nasaVideo");
const yearDisplay = document.getElementById("yearDisplay");
const statusDisplay = document.getElementById("statusDisplay");
const volumeControl = document.getElementById("volumeControl");
const volumeValue = document.getElementById("volumeValue");
const progressFill = document.getElementById("progressFill");
const currentTimeDisplay = document.getElementById("currentTime");
const guideText = document.getElementById("guideText");
const daySlider = document.getElementById("daySlider");
const mainContainer = document.getElementById("mainContainer");
const visualizerCanvas = document.getElementById("visualizer");

// 2. AUDIO SETUP
const synth = new Tone.Synth().toDestination();
const filter = new Tone.Filter(1200, "lowpass").toDestination();
synth.connect(filter);

const analyser = new Tone.Analyser("waveform", 128);
Tone.Destination.connect(analyser);
const canvasCtx = visualizerCanvas.getContext("2d");

let oceanData = [];
let updateInterval = null;
let isPlaying = false;
let isMuted = false;

// 3. FONCTION VOCALE (GUIDE)
function speakGuide() {
    window.speechSynthesis.cancel();
    const textToSpeak = "Welcome to The Ocean's Fever. Use the controls on the right to play the timeline. You can also use the comparison button to hear the difference between 2007 and 2008, or drag the slider to explore day by day.";
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
}

// 4. LOGIQUE DU SPLASH SCREEN
startAppBtn.addEventListener("click", async () => {
    // Déverrouille l'audio du navigateur au premier clic
    await Tone.start(); 
    
    // Animation de disparition
    splashScreen.classList.add("fade-out");
    
    // Affiche l'application et lance le guide
    setTimeout(() => {
        splashScreen.style.display = "none";
        appContent.classList.remove("hidden");
        speakGuide(); // Lance le guide vocal après l'entrée
    }, 800); // 800ms correspond au temps de la transition CSS
});

audioGuideBtn.addEventListener("click", speakGuide);

// 5. CHARGEMENT DES DONNÉES
async function loadData() {
    try {
        const response = await fetch('clean_data.json');
        oceanData = await response.json();
        daySlider.max = oceanData.length - 1;
        daySlider.value = 0;
        guideText.innerText = "✅ Data ready. Click Play or use the slider.";
    } catch (error) {
        guideText.innerText = "⚠️ Error: Could not load JSON data.";
    }
}

// 6. SYNCHRONISATION AUTOMATIQUE
function updateInterface() {
    if (!video || !oceanData.length) return;

    const currentTime = video.currentTime;
    if (video.duration > 0) progressFill.style.width = ((currentTime / video.duration) * 100) + "%";
    currentTimeDisplay.innerText = currentTime.toFixed(1) + "s";

    const dataPoint = oceanData.find(d => d.time >= currentTime);
    
    if (dataPoint) {
        const targetFilter = 1200 - (dataPoint.normalized * 900);
        filter.frequency.rampTo(targetFilter, 0.1);
        const targetFreq = 150 + (dataPoint.normalized * 300);
        synth.frequency.rampTo(targetFreq, 0.1);
        
        yearDisplay.innerText = dataPoint.date;
        statusDisplay.innerText = `${Math.round(dataPoint.normalized * 100)}%`;
        guideText.innerText = `Date: ${dataPoint.date}. Ocean Heat: ${Math.round(dataPoint.normalized * 100)}%.`;
    }
}

// 7. SLIDER LOGIC
daySlider.addEventListener("input", async (e) => {
    if (oceanData.length === 0) return;
    if (isPlaying) pausePlayback();

    const index = parseInt(e.target.value);
    const dataPoint = oceanData[index];

    if (dataPoint) {
        video.currentTime = dataPoint.time;
        await Tone.start();
        
        const targetFreq = 150 + (dataPoint.normalized * 300);
        const targetFilter = 1200 - (dataPoint.normalized * 900);
        
        filter.frequency.value = targetFilter;
        synth.triggerAttackRelease(targetFreq, "8n");

        yearDisplay.innerText = dataPoint.date;
        statusDisplay.innerText = `${Math.round(dataPoint.normalized * 100)}%`;
        progressFill.style.width = ((dataPoint.time / video.duration) * 100) + "%";
        currentTimeDisplay.innerText = dataPoint.time.toFixed(1) + "s";
        guideText.innerText = `Selected Date: ${dataPoint.date}. Heat Intensity: ${Math.round(dataPoint.normalized * 100)}%.`;
    }
});

// 8. BOUTON COMPARAISON
compareBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    if (isPlaying) pausePlayback();
    if (oceanData.length === 0) return;

    await Tone.start();
    const startData = oceanData[0];
    const endData = oceanData[oceanData.length - 1];

    guideText.innerText = `Comparison: Playing first day (${startData.date})...`;
    synth.triggerAttackRelease(150 + (startData.normalized * 300), "4n");
    
    setTimeout(() => {
        guideText.innerText = `Comparison: Playing last day (${endData.date})...`;
        synth.triggerAttackRelease(150 + (endData.normalized * 300), "4n");
    }, 1500);
});

// 9. CONTRÔLES DE LECTURE
async function startPlayback() {
    if (oceanData.length === 0) return;
    window.speechSynthesis.cancel();
    await Tone.start();
    
    if (video.currentTime >= video.duration) video.currentTime = 0;
    
    video.play();
    synth.triggerAttack(200);
    isPlaying = true;
    guideText.innerText = "▶️ Playing timeline...";

    if (updateInterval) clearInterval(updateInterval);
    updateInterval = setInterval(updateInterface, 100);
}

function pausePlayback() {
    if (!isPlaying) return;
    video.pause();
    synth.triggerRelease();
    isPlaying = false;
    if (updateInterval) clearInterval(updateInterval);
    guideText.innerText = "⏸️ Playback paused.";
}

function stopPlayback() {
    pausePlayback();
    video.currentTime = 0;
    yearDisplay.innerText = "----";
    statusDisplay.innerText = "0%";
    progressFill.style.width = "0%";
    currentTimeDisplay.innerText = "0.0s";
    daySlider.value = 0;
    guideText.innerText = "⏹️ Experience reset.";
}

// 10. VOLUME & MUTE
volumeControl.addEventListener("input", (e) => {
    const val = e.target.value;
    Tone.Destination.volume.value = Tone.gainToDb(val / 100);
    volumeValue.innerText = val + "%";
});

muteBtn.addEventListener("click", () => {
    isMuted = !isMuted;
    Tone.Destination.mute = isMuted;
    muteBtn.innerText = isMuted ? "🔇 Sound Off" : "🔊 Sound On";
    muteBtn.style.backgroundColor = isMuted ? "#ff4444" : "#00e5ff";
});

// 11. VISUALISEUR AUDIO
function drawVisualizer() {
    requestAnimationFrame(drawVisualizer);
    
    const bufferLength = analyser.getValue().length;
    const dataArray = analyser.getValue();
    
    canvasCtx.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);
    
    const barWidth = (visualizerCanvas.width / bufferLength) * 2.5;
    let barHeight;
    let x = 0;
    
    for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] + 1) * 30; 
        canvasCtx.fillStyle = barHeight > 40 ? '#ff3333' : '#00e5ff';
        canvasCtx.fillRect(x, visualizerCanvas.height / 2 - barHeight / 2, barWidth, barHeight);
        x += barWidth + 1;
    }
}

// 12. INIT
window.addEventListener("load", () => {
    loadData();
    drawVisualizer();
});

playBtn.addEventListener("click", startPlayback);
pauseBtn.addEventListener("click", pausePlayback);
stopBtn.addEventListener("click", stopPlayback);
