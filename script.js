// DRUMLAB - Virtual Drum Kit
// All sound paths are relative to index.html.

const soundFiles = {
    kick: "./sounds/kick.wav",
    snare: "./sounds/snare.wav",
    hihat: "./sounds/hihat.wav",
    openhat: "./sounds/openhat.wav",
    ride: "./sounds/ride.wav",
    boom: "./sounds/boom.wav",
    tom: "./sounds/tom.wav",
    clap: "./sounds/clap.wav",
    tink: "./sounds/tink.wav"
};

const pads = document.querySelectorAll(".drum-pad");
const recordButton = document.getElementById("record-button");
const playButton = document.getElementById("play-button");
const stopButton = document.getElementById("stop-button");
const clearButton = document.getElementById("clear-button");
const statusMessage = document.getElementById("status");
const recordingStatus = document.getElementById("recording-status");
const hitCount = document.getElementById("hit-count");

let isRecording = false;
let isPlaying = false;
let recordedHits = [];
let recordingStartedAt = 0;
let playbackTimers = [];

// Create a new Audio object for each hit so rapid/repeated hits overlap.
function playSound(name, shouldRecord = true) {
    const path = soundFiles[name];

    if (!path) {
        showStatus(`Unknown sound: ${name}`);
        console.error(`No sound is configured for "${name}".`);
        return;
    }

    const audio = new Audio(path);
    audio.preload = "auto";
    audio.volume = 1;

    audio.addEventListener("error", () => {
        showStatus(`Could not load ${name}.wav — check the sounds folder.`);
        console.error(`Audio file failed to load: ${path}`);
    }, { once: true });

    const playPromise = audio.play();
    if (playPromise) {
        playPromise.catch(error => {
            showStatus(`Audio could not play. Check browser permissions and ${name}.wav.`);
            console.error(`Playback error for ${path}:`, error);
        });
    }

    if (isRecording && shouldRecord) {
        recordedHits.push({
            sound: name,
            time: performance.now() - recordingStartedAt
        });
        updateHitCount();
    }

    animatePad(name);
}

function animatePad(name) {
    const pad = document.querySelector(`.drum-pad[data-sound="${name}"]`);
    if (!pad) return;

    pad.classList.remove("active");
    void pad.offsetWidth;
    pad.classList.add("active");

    window.setTimeout(() => pad.classList.remove("active"), 150);
}

function showStatus(message) {
    statusMessage.textContent = message;
}

// Mouse / touch controls
pads.forEach(pad => {
    pad.addEventListener("click", () => {
        playSound(pad.dataset.sound);
        showStatus(`${pad.dataset.sound.toUpperCase()} playing!`);
    });
});

// Keyboard controls: A, S, D, F, G, H, J, K, L
document.addEventListener("keydown", event => {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;

    const target = event.target;
    if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;

    const key = event.key.toUpperCase();
    const pad = document.querySelector(`.drum-pad[data-key="${key}"]`);

    if (pad) {
        event.preventDefault();
        playSound(pad.dataset.sound);
        showStatus(`${pad.dataset.sound.toUpperCase()} playing!`);
    }
});

// Recording
recordButton.addEventListener("click", () => {
    if (isRecording) {
        finishRecording();
        return;
    }

    stopPlayback();
    recordedHits = [];
    recordingStartedAt = performance.now();
    isRecording = true;

    recordButton.innerHTML = "<span>■</span> STOP RECORDING";
    recordButton.classList.add("recording");
    recordingStatus.textContent = "RECORDING";
    recordingStatus.classList.add("is-recording");
    playButton.disabled = true;

    updateHitCount();
    showStatus("Recording your performance...");
});

function finishRecording() {
    isRecording = false;
    recordButton.innerHTML = "<span>●</span> RECORD";
    recordButton.classList.remove("recording");
    recordingStatus.textContent = "SAVED";
    recordingStatus.classList.remove("is-recording");
    playButton.disabled = recordedHits.length === 0;

    showStatus(recordedHits.length
        ? "Your recording is ready to play!"
        : "No sounds were recorded.");
}

// Replay the recorded sequence with its original timing.
playButton.addEventListener("click", () => {
    if (!recordedHits.length || isRecording) return;

    stopPlayback();
    isPlaying = true;
    playButton.disabled = true;
    recordingStatus.textContent = "PLAYING";
    showStatus("Playing your performance...");

    recordedHits.forEach(hit => {
        const timer = window.setTimeout(() => {
            if (isPlaying) playSound(hit.sound, false);
        }, hit.time);
        playbackTimers.push(timer);
    });

    const lastHitTime = recordedHits[recordedHits.length - 1].time;
    playbackTimers.push(window.setTimeout(() => {
        isPlaying = false;
        playbackTimers = [];
        recordingStatus.textContent = "SAVED";
        playButton.disabled = recordedHits.length === 0;
        showStatus("Playback completed!");
    }, lastHitTime + 700));
});

function stopPlayback() {
    isPlaying = false;
    playbackTimers.forEach(timer => window.clearTimeout(timer));
    playbackTimers = [];
    playButton.disabled = recordedHits.length === 0;

    if (recordingStatus.textContent === "PLAYING") {
        recordingStatus.textContent = "SAVED";
    }
}

stopButton.addEventListener("click", () => {
    if (isRecording) finishRecording();
    stopPlayback();
    showStatus("Playback stopped.");
});

clearButton.addEventListener("click", () => {
    if (isRecording) finishRecording();
    stopPlayback();

    recordedHits = [];
    isRecording = false;

    recordButton.innerHTML = "<span>●</span> RECORD";
    recordButton.classList.remove("recording");
    recordingStatus.textContent = "READY";
    recordingStatus.classList.remove("is-recording");
    playButton.disabled = true;

    updateHitCount();
    showStatus("Recording cleared. Ready for a new beat!");
});

function updateHitCount() {
    hitCount.textContent = `${recordedHits.length} HITS`;
}

// Check that every expected audio URL can be loaded.
async function checkAudioFiles() {
    const results = await Promise.all(
        Object.entries(soundFiles).map(async ([name, path]) => {
            try {
                const response = await fetch(path, { method: "HEAD" });
                return { name, ok: response.ok, status: response.status };
            } catch (error) {
                return { name, ok: false, status: "network error" };
            }
        })
    );

    const missing = results.filter(result => !result.ok);

    if (missing.length) {
        console.error("Missing or inaccessible audio files:", missing);
        showStatus(`Audio file issue: ${missing.map(item => item.name + ".wav").join(", ")}`);
    } else {
        console.log("All 9 drum sound files were found.");
    }
}

updateHitCount();
checkAudioFiles();
console.log("DRUMLAB ready. Use A, S, D, F, G, H, J, K, L.");
