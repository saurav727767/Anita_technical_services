// Creative Editors Suite - Client Application Logic

// ==========================================
// GLOBAL STATE & SYSTEM INITIALIZATION
// ==========================================
let activeTab = 'dashboard';
let currentTheme = 'dark';

// Video Editor State
let videoProjectName = "Untitled Video Project";
let videoPlaying = false;
let playheadTime = 0.0; // Current position in seconds
const maxTimelineDuration = 30.0; // Fixed duration for demo (seconds)
let timelineZoom = 15; // Pixels per second
let selectedClipId = null;
let animationFrameId = null;
let isScrubbing = false;

// Demo Media Library Assets
const demoAssets = [
  { id: 'asset-1', name: 'Bihar Farms Sunrise.mp4', type: 'video', duration: 15, color: '#f59e0b', videoUrl: 'image/demo_farm.mp4' },
  { id: 'asset-2', name: 'Panchayat Meet Interview.mp4', type: 'video', duration: 10, color: '#8b5cf6', videoUrl: 'image/demo_interview.mp4' },
  { id: 'asset-3', name: 'Harvesting Fasal Drone.mp4', type: 'video', duration: 8, color: '#10b981', videoUrl: 'image/demo_drone.mp4' },
  { id: 'asset-4', name: 'Ambient Flute BGM.mp3', type: 'audio', duration: 25, color: '#06b6d4' }
];

// Active Timeline Tracks
let timelineClips = [
  { id: 'clip-v1', name: 'Bihar Farms Sunrise.mp4', type: 'video', start: 0, duration: 12, speed: 1.0, filter: 'none', track: 'video' },
  { id: 'clip-v2', name: 'Harvesting Fasal Drone.mp4', type: 'video', start: 12, duration: 8, speed: 1.0, filter: 'none', track: 'video' },
  { id: 'clip-a1', name: 'Ambient Flute BGM.mp3', type: 'audio', start: 0, duration: 20, speed: 1.0, filter: 'none', track: 'audio' },
  { id: 'clip-t1', name: 'Intro Title Card', type: 'text', start: 1, duration: 4, speed: 1.0, filter: 'none', track: 'text', textContent: 'Bihar Krishi Darshan 🌿', textColor: '#f8fafc', textSize: 28 }
];

// Document Editor State
let docContent = "";

// Spreadsheet Editor State
let excelCellsData = {}; // Format: { "A1": { raw: "=SUM(B1:B3)", computed: "150" } }

// Presentation Editor State
let pptSlides = [
  { id: 'slide-1', title: 'Bihar Digital Panchayat', subtitle: 'Welfare Schemes & Mandi Tracker Project Overview', bg: '#8b5cf6' },
  { id: 'slide-2', title: 'Project Objectives', subtitle: 'Provide real-time market data directly to grassroot farmers.', bg: '#06b6d4' }
];
let activeSlideIndex = 0;

// Onload initialization
window.addEventListener('DOMContentLoaded', () => {
  initSystem();
});

function initSystem() {
  // Load saved configurations
  if (localStorage.getItem('anita_editor_theme')) {
    setTheme(localStorage.getItem('anita_editor_theme'));
  }

  // Detect active page based on elements present
  const isVideoPage = document.getElementById('preview-canvas') !== null;
  const isOfficePage = document.getElementById('doc-editor-textarea') !== null;

  if (isVideoPage) {
    if (localStorage.getItem('anita_active_proj_name')) {
      videoProjectName = localStorage.getItem('anita_active_proj_name');
      const nameInput = document.getElementById('video-project-name');
      if (nameInput) nameInput.value = videoProjectName;
    }
    
    // Init Video Editor components
    renderMediaLibrary();
    renderTimelineRuler();
    renderTimelineClips();
    initPreviewCanvas();
    
    switchSuiteTab('video');
  } else if (isOfficePage) {
    // Init Spreadsheet cells
    initExcelGrid();

    // Init PPT outline
    renderPPTOutline();
    loadSlideContent();

    // Init Paint Editor canvas
    initPaintEditor();

    switchSuiteTab('doc');
  }

  // Auto-Save background cycle
  setInterval(triggerAutoSave, 5000);
}

// Open recent files from welcome dashboard
function openDashboardFile(fileType) {
  switchSuiteTab(fileType);
  let name = "ATS.docx";
  if (fileType === 'excel') name = "ATS.spreadsheet";
  if (fileType === 'ppt') name = "ATS.presentation";
  if (fileType === 'video') name = "ATS.video";
  showToast(`Loaded ${name} successfully!`, 'success');
}

// ==========================================
// SYSTEM ACTIONS (THEME & AUTO-SAVE)
// ==========================================
function toggleTheme() {
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
}

function setTheme(theme) {
  currentTheme = theme;
  localStorage.setItem('anita_editor_theme', theme);
  const themeIcon = document.getElementById('theme-icon');
  
  if (theme === 'light') {
    document.body.classList.remove('dark-mode');
    document.body.classList.add('light-mode');
    themeIcon.className = 'fa-solid fa-sun';
  } else {
    document.body.classList.remove('light-mode');
    document.body.classList.add('dark-mode');
    themeIcon.className = 'fa-solid fa-moon';
  }
}

function triggerAutoSave() {
  const statusEl = document.getElementById('save-status');
  if (!statusEl) return; // Silent return if not on an editor workspace page
  
  statusEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
  
  // Save Document
  const docBody = document.getElementById('doc-editor-textarea');
  if (docBody) {
    localStorage.setItem('anita_doc_saved_text', docBody.innerHTML);
  }

  // Save Excel
  localStorage.setItem('anita_excel_saved_cells', JSON.stringify(excelCellsData));

  // Save PPT
  localStorage.setItem('anita_ppt_saved_slides', JSON.stringify(pptSlides));

  // Save Video
  localStorage.setItem('anita_video_saved_clips', JSON.stringify(timelineClips));

  setTimeout(() => {
    statusEl.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Project Saved';
  }, 800);
}

function switchSuiteTab(tabId) {
  activeTab = tabId;
  
  // Update sidebar menu highlight if elements exist
  document.querySelectorAll('.sidebar-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  const activeTabEl = document.getElementById(`tab-${tabId}`);
  if (activeTabEl) activeTabEl.classList.add('active');

  // Update visible workspace view
  document.querySelectorAll('.workspace-view').forEach(view => {
    view.classList.remove('active');
  });
  const viewEl = document.getElementById(`view-${tabId}`);
  if (viewEl) viewEl.classList.add('active');

  // Pause playback if exiting video editor tab
  if (tabId !== 'video' && videoPlaying) {
    togglePlayback();
  }
}

// ==========================================
// VIDEO EDITOR LOGIC
// ==========================================
function initPreviewCanvas() {
  const canvas = document.getElementById('preview-canvas');
  canvas.width = 640;
  canvas.height = 360;
  drawCanvasFrame();
}

function renderMediaLibrary() {
  const lib = document.getElementById('media-library-list');
  lib.innerHTML = '';
  
  demoAssets.forEach(asset => {
    let icon = asset.type === 'video' ? 'fa-video' : 'fa-music';
    let labelColor = asset.type === 'video' ? 'var(--accent-purple)' : 'var(--accent-cyan)';
    
    lib.innerHTML += `
      <div class="media-item-card" onclick="addAssetToTimeline('${asset.id}')">
        <div class="media-item-thumb" style="border-bottom: 2px solid ${labelColor};">
          <i class="fa-solid ${icon}"></i>
        </div>
        <span class="media-item-name">${asset.name}</span>
        <span class="media-item-duration">${asset.duration}s</span>
      </div>
    `;
  });
}

function addAssetToTimeline(assetId) {
  const asset = demoAssets.find(a => a.id === assetId);
  if (!asset) return;

  // Insert clip on corresponding track
  const track = asset.type === 'video' ? 'video' : 'audio';
  
  // Find dynamic start time (right after the last clip on that track)
  const trackClips = timelineClips.filter(c => c.track === track);
  let start = 0;
  trackClips.forEach(c => {
    if (c.start + c.duration > start) {
      start = c.start + c.duration;
    }
  });

  if (start >= maxTimelineDuration) {
    showToast('Timeline capacity limit reached (Max 30s for demo)', 'error');
    return;
  }

  // Adjust duration if it exceeds timeline limit
  let dur = asset.duration;
  if (start + dur > maxTimelineDuration) {
    dur = maxTimelineDuration - start;
  }

  const newClip = {
    id: 'clip-' + Math.floor(1000 + Math.random() * 9000),
    name: asset.name,
    type: asset.type,
    start: start,
    duration: dur,
    speed: 1.0,
    filter: 'none',
    track: track
  };

  timelineClips.push(newClip);
  renderTimelineClips();
  showToast(`Added ${asset.name} to timeline`, 'success');
}

function renderTimelineRuler() {
  const ruler = document.getElementById('timeline-ruler-grid');
  ruler.innerHTML = '';
  
  for (let i = 0; i <= maxTimelineDuration; i += 2) {
    const mark = document.createElement('div');
    mark.className = 'ruler-tick';
    mark.style.left = `${i * timelineZoom}px`;
    mark.innerHTML = `${i}s`;
    ruler.appendChild(mark);
  }
}

function renderTimelineClips() {
  const videoTrack = document.getElementById('track-video-clips');
  const audioTrack = document.getElementById('track-audio-clips');
  const textTrack = document.getElementById('track-text-clips');

  videoTrack.innerHTML = '';
  audioTrack.innerHTML = '';
  textTrack.innerHTML = '';

  timelineClips.forEach(clip => {
    const block = document.createElement('div');
    block.className = `timeline-clip-block ${selectedClipId === clip.id ? 'selected' : ''}`;
    block.style.left = `${clip.start * timelineZoom}px`;
    block.style.width = `${clip.duration * timelineZoom}px`;
    block.setAttribute('data-type', clip.type);
    block.id = clip.id;
    block.innerHTML = `<span>${clip.name}</span>`;
    
    block.addEventListener('click', (e) => {
      e.stopPropagation();
      selectTimelineClip(clip.id);
    });

    if (clip.track === 'video') videoTrack.appendChild(block);
    else if (clip.track === 'audio') audioTrack.appendChild(block);
    else if (clip.track === 'text') textTrack.appendChild(block);
  });
}

function selectTimelineClip(clipId) {
  selectedClipId = clipId;
  renderTimelineClips();

  const clip = timelineClips.find(c => c.id === clipId);
  const textEditor = document.getElementById('property-text-editor');
  
  if (clip) {
    // Populate properties panel
    document.getElementById('clip-speed-slider').value = clip.speed;
    document.getElementById('clip-speed-val').innerText = `${clip.speed.toFixed(2)}x (${clip.speed === 1 ? 'Normal' : clip.speed > 1 ? 'Fast' : 'Slow'})`;
    
    if (clip.type === 'text') {
      textEditor.style.display = 'block';
      document.getElementById('text-edit-content').value = clip.textContent || '';
      document.getElementById('text-edit-size').value = clip.textSize || 24;
      document.getElementById('text-edit-color').value = clip.textColor || '#ffffff';
    } else {
      textEditor.style.display = 'none';
    }
  } else {
    textEditor.style.display = 'none';
  }
}

function updateClipSpeed(speed) {
  const clip = timelineClips.find(c => c.id === selectedClipId);
  if (clip) {
    clip.speed = parseFloat(speed);
    document.getElementById('clip-speed-val').innerText = `${clip.speed.toFixed(2)}x (${clip.speed === 1.0 ? 'Normal' : clip.speed > 1.0 ? 'Fast' : 'Slow'})`;
    drawCanvasFrame();
  }
}

function updateActiveTextContent(val) {
  const clip = timelineClips.find(c => c.id === selectedClipId);
  if (clip && clip.type === 'text') {
    clip.textContent = val;
    clip.name = val.substring(0, 15);
    renderTimelineClips();
    drawCanvasFrame();
  }
}

function updateActiveTextSize(size) {
  const clip = timelineClips.find(c => c.id === selectedClipId);
  if (clip && clip.type === 'text') {
    clip.textSize = parseInt(size);
    drawCanvasFrame();
  }
}

function updateActiveTextColor(color) {
  const clip = timelineClips.find(c => c.id === selectedClipId);
  if (clip && clip.type === 'text') {
    clip.textColor = color;
    drawCanvasFrame();
  }
}

// Split clip
function splitTimelineClip() {
  if (!selectedClipId) {
    showToast('Select a clip on the timeline to split', 'info');
    return;
  }

  const clipIndex = timelineClips.findIndex(c => c.id === selectedClipId);
  if (clipIndex === -1) return;

  const clip = timelineClips[clipIndex];
  // Verify if playhead intersects the clip
  if (playheadTime > clip.start && playheadTime < (clip.start + clip.duration)) {
    const leftDuration = playheadTime - clip.start;
    const rightDuration = clip.duration - leftDuration;

    // Create right portion of split
    const rightClip = {
      ...clip,
      id: 'clip-' + Math.floor(1000 + Math.random() * 9000),
      start: playheadTime,
      duration: rightDuration
    };

    // Shrink left portion
    clip.duration = leftDuration;

    timelineClips.push(rightClip);
    renderTimelineClips();
    selectTimelineClip(rightClip.id);
    showToast('Clip split successfully', 'success');
  } else {
    showToast('Place playhead inside the clip to split', 'error');
  }
}

function deleteTimelineClip() {
  if (!selectedClipId) {
    showToast('Select a clip to delete', 'info');
    return;
  }
  
  timelineClips = timelineClips.filter(c => c.id !== selectedClipId);
  selectedClipId = null;
  document.getElementById('property-text-editor').style.display = 'none';
  renderTimelineClips();
  drawCanvasFrame();
  showToast('Clip deleted from timeline', 'success');
}

// Timeline Scrubbing Handlers
function startTimelineScrub(e) {
  isScrubbing = true;
  handleTimelineScrub(e);
}

function stopTimelineScrub() {
  isScrubbing = false;
}

function handleTimelineScrub(e) {
  if (!isScrubbing) return;
  const tracksBox = document.getElementById('timeline-tracks-box');
  const rect = tracksBox.getBoundingClientRect();
  const clickX = e.clientX - rect.left - 100; // Account for 100px track label width
  
  if (clickX >= 0) {
    let t = clickX / timelineZoom;
    if (t < 0) t = 0;
    if (t > maxTimelineDuration) t = maxTimelineDuration;
    
    playheadTime = t;
    updatePlayheadUI();
    drawCanvasFrame();
  }
}

function updatePlayheadUI() {
  const playhead = document.getElementById('timeline-playhead-pointer');
  const textVal = document.getElementById('video-timecode');
  
  const leftPos = 100 + (playheadTime * timelineZoom);
  playhead.style.left = `${leftPos}px`;
  
  // Format MM:SS.CC
  const mins = Math.floor(playheadTime / 60);
  const secs = Math.floor(playheadTime % 60);
  const cent = Math.floor((playheadTime % 1) * 100);
  
  const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${cent.toString().padStart(2, '0')}`;
  textVal.innerText = `${formatted} / 00:30.00`;
}

// Playback Trigger Loop
function togglePlayback() {
  const btn = document.getElementById('btn-video-play');
  
  if (videoPlaying) {
    videoPlaying = false;
    btn.innerHTML = '<i class="fa-solid fa-play"></i>';
    cancelAnimationFrame(animationFrameId);
  } else {
    videoPlaying = true;
    btn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    lastTime = performance.now();
    playbackLoop();
  }
}

let lastTime = 0;
function playbackLoop() {
  if (!videoPlaying) return;
  
  const now = performance.now();
  const delta = (now - lastTime) / 1000;
  lastTime = now;
  
  playheadTime += delta;
  
  if (playheadTime >= maxTimelineDuration) {
    playheadTime = 0.0;
  }
  
  updatePlayheadUI();
  drawCanvasFrame();
  
  animationFrameId = requestAnimationFrame(playbackLoop);
}

function playbackRewind() {
  playheadTime = 0.0;
  updatePlayheadUI();
  drawCanvasFrame();
}

function playbackForward() {
  playheadTime += 2.0;
  if (playheadTime > maxTimelineDuration) playheadTime = maxTimelineDuration;
  updatePlayheadUI();
  drawCanvasFrame();
}

// Preview Canvas visual rendering
let activeVideoFilter = 'none';
let canvasRotate = 0; // degrees
let canvasFlip = false;

function applyVideoFilter(filter) {
  activeVideoFilter = filter;
  drawCanvasFrame();
  showToast(`Applied visual effect`, 'success');
}

function transformPreview(mode) {
  if (mode === 'rotate') {
    canvasRotate = (canvasRotate + 90) % 360;
  } else if (mode === 'flip') {
    canvasFlip = !canvasFlip;
  } else if (mode === 'crop') {
    showToast('Crop template applied: 16:9 widescreen ratio normalized.', 'info');
  }
  drawCanvasFrame();
}

function drawCanvasFrame() {
  const canvas = document.getElementById('preview-canvas');
  const ctx = canvas.getContext('2d');
  
  // Clear Frame
  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#020308';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Apply rotation / mirroring transforms
  ctx.translate(canvas.width / 2, canvas.height / 2);
  if (canvasFlip) ctx.scale(-1, 1);
  ctx.rotate((canvasRotate * Math.PI) / 180);
  ctx.translate(-canvas.width / 2, -canvas.height / 2);

  // Search active video clips at playhead time
  const activeVideo = timelineClips.find(c => c.track === 'video' && playheadTime >= c.start && playheadTime < (c.start + c.duration));
  
  if (activeVideo) {
    // Apply filters
    ctx.filter = activeVideoFilter;
    
    // Draw visual landscape frame depending on active clip
    let clipGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    if (activeVideo.name.includes('Sunrise')) {
      clipGrad.addColorStop(0, '#f59e0b');
      clipGrad.addColorStop(0.5, '#ec4899');
      clipGrad.addColorStop(1, '#8b5cf6');
    } else if (activeVideo.name.includes('Drone')) {
      clipGrad.addColorStop(0, '#10b981');
      clipGrad.addColorStop(0.5, '#06b6d4');
      clipGrad.addColorStop(1, '#3b82f6');
    } else {
      clipGrad.addColorStop(0, '#3b82f6');
      clipGrad.addColorStop(1, '#1d4ed8');
    }
    
    ctx.fillStyle = clipGrad;
    ctx.fillRect(40, 30, canvas.width - 80, canvas.height - 60);

    // Mock elements representing motion
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    let xOffset = (playheadTime * 50) % (canvas.width - 120);
    ctx.beginPath();
    ctx.arc(80 + xOffset, 120, 40, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 20px Outfit';
    ctx.fillText('[RAW Video Feed Stream]', 60, 80);
    ctx.font = '14px Outfit';
    ctx.fillText(`Timestamp: ${playheadTime.toFixed(2)}s | Speed: ${activeVideo.speed}x`, 60, 310);
  } else {
    // Black screen or static overlay
    ctx.fillStyle = '#111827';
    ctx.fillRect(40, 30, canvas.width - 80, canvas.height - 60);
    ctx.fillStyle = '#4b5563';
    ctx.font = '18px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText('No Video Clip Active (Blank Stage)', canvas.width / 2, canvas.height / 2);
  }

  // Restore transform states to draw overlay text properly
  ctx.restore();
  ctx.save();

  // Search active text overlay clips
  const activeText = timelineClips.find(c => c.track === 'text' && playheadTime >= c.start && playheadTime < (c.start + c.duration));
  if (activeText && activeText.textContent) {
    ctx.fillStyle = activeText.textColor || '#ffffff';
    ctx.font = `bold ${activeText.textSize || 24}px Outfit`;
    ctx.textAlign = 'center';
    ctx.fillText(activeText.textContent, canvas.width / 2, canvas.height / 2 + 50);
  }

  // Search active audio track indicator
  const activeAudio = timelineClips.find(c => c.track === 'audio' && playheadTime >= c.start && playheadTime < (c.start + c.duration));
  if (activeAudio) {
    ctx.fillStyle = 'rgba(6, 182, 212, 0.75)';
    ctx.fillRect(10, 10, 20, 20);
    ctx.fillStyle = '#fff';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('🔊 BGM Mixed', 35, 24);
  }

  ctx.restore();
}

// Add Text Clip
function addTimelineText(defaultVal, isSticker = false) {
  const newClip = {
    id: 'clip-' + Math.floor(1000 + Math.random() * 9000),
    name: isSticker ? 'Sticker' : 'Text Card',
    type: 'text',
    start: playheadTime,
    duration: 5,
    speed: 1.0,
    filter: 'none',
    track: 'text',
    textContent: defaultVal,
    textColor: '#f8fafc',
    textSize: 28
  };
  timelineClips.push(newClip);
  renderTimelineClips();
  selectTimelineClip(newClip.id);
  drawCanvasFrame();
  showToast('Added overlay elements', 'success');
}

// Extract Audio
function extractAudioFromActive() {
  const activeVideo = timelineClips.find(c => c.track === 'video' && playheadTime >= c.start && playheadTime < (c.start + c.duration));
  if (activeVideo) {
    const newAudio = {
      id: 'clip-' + Math.floor(1000 + Math.random() * 9000),
      name: `Audio Extracted (${activeVideo.name.substring(0, 10)})`,
      type: 'audio',
      start: activeVideo.start,
      duration: activeVideo.duration,
      speed: 1.0,
      filter: 'none',
      track: 'audio'
    };
    timelineClips.push(newAudio);
    renderTimelineClips();
    showToast('Soundtrack extracted and added to Audio track', 'success');
  } else {
    showToast('No active video clip at playhead to extract audio', 'error');
  }
}

function addBackgroundMusic(name, url) {
  const newAudio = {
    id: 'clip-' + Math.floor(1000 + Math.random() * 9000),
    name: name,
    type: 'audio',
    start: playheadTime,
    duration: 10,
    speed: 1.0,
    filter: 'none',
    track: 'audio'
  };
  timelineClips.push(newAudio);
  renderTimelineClips();
  showToast(`Added soundtrack ${name}`, 'success');
}

function handleMediaImport(e) {
  const files = e.target.files;
  if (!files || files.length === 0) return;
  
  const file = files[0];
  const type = file.type.startsWith('audio') ? 'audio' : 'video';
  
  showToast(`Uploading ${file.name} to server...`, 'info');
  
  const formData = new FormData();
  formData.append('media', file);
  
  const backendBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : (window.location.origin.includes('netlify.app') ? 'https://ats-unified-backend.onrender.com' : window.location.origin);
  
  fetch(`${backendBase}/api/video/upload`, {
    method: 'POST',
    body: formData
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      const newAsset = {
        id: 'import-' + Math.floor(1000 + Math.random() * 9000),
        name: data.file.name,
        type: type,
        duration: 10,
        color: type === 'video' ? '#8b5cf6' : '#06b6d4',
        videoUrl: data.file.path // Saves path returned from backend storage
      };
      demoAssets.push(newAsset);
      renderMediaLibrary();
      showToast(`Uploaded successfully! Add to timeline to edit.`, 'success');
    } else {
      showToast(`Upload failed: ${data.message}`, 'error');
    }
  })
  .catch(err => {
    console.warn("Backend offline, adding as mock asset:", err);
    const newAsset = {
      id: 'import-' + Math.floor(1000 + Math.random() * 9000),
      name: file.name,
      type: type,
      duration: 10,
      color: type === 'video' ? '#8b5cf6' : '#06b6d4',
      videoUrl: ''
    };
    demoAssets.push(newAsset);
    renderMediaLibrary();
    showToast(`Server offline. Added as local preview asset.`, 'warning');
  });
}

function switchVideoPanel(panelId) {
  document.querySelectorAll('.video-panel-left .panel-tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  // Find match
  const matchBtn = Array.from(document.querySelectorAll('.video-panel-left .panel-tab-btn')).find(b => b.outerHTML.includes(panelId));
  if (matchBtn) matchBtn.classList.add('active');

  document.querySelectorAll('.panel-sub-content').forEach(panel => {
    panel.classList.remove('active');
  });
  document.getElementById(`panel-${panelId}`).classList.add('active');
}

function saveVideoProjectName(val) {
  videoProjectName = val || "Untitled Video Project";
  localStorage.setItem('anita_active_proj_name', videoProjectName);
}

// Export Video Actions
function openExportModal() {
  document.getElementById('export-video-modal').style.display = 'flex';
  document.getElementById('export-settings-view').style.display = 'block';
  document.getElementById('export-rendering-view').style.display = 'none';
}

function closeExportModal() {
  document.getElementById('export-video-modal').style.display = 'none';
}

function startVideoRendering() {
  document.getElementById('export-settings-view').style.display = 'none';
  document.getElementById('export-rendering-view').style.display = 'block';

  const progressFill = document.getElementById('render-progress-fill');
  const progressText = document.getElementById('render-progress-text');
  const timeLeftText = document.getElementById('render-time-left');
  const statusHeading = document.getElementById('render-status-heading');
  
  const backendBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : (window.location.origin.includes('netlify.app') ? 'https://ats-unified-backend.onrender.com' : window.location.origin);

  // Get active video clips from timeline
  const payload = {
    clips: timelineClips.map(c => ({
      name: c.name,
      track: c.track,
      start: c.start,
      duration: c.duration,
      speed: c.speed,
      path: c.videoUrl || c.name
    })),
    filter: activeVideoFilter
  };

  statusHeading.innerText = "Sending editing parameters to rendering engine...";
  progressFill.style.width = `15%`;
  
  fetch(`${backendBase}/api/video/process`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      progressFill.style.width = `100%`;
      progressText.innerText = "Progress: 100%";
      timeLeftText.innerText = "Estimated: Completed";
      statusHeading.innerText = "Video rendering finished!";
      
      setTimeout(() => {
        closeExportModal();
        showToast('Rendering complete! Downloading your edited video file.', 'success');
        
        // Trigger download of real processed file
        const element = document.createElement('a');
        element.setAttribute('href', backendBase + data.downloadUrl);
        element.setAttribute('download', data.filename || 'edited_video.mp4');
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
      }, 1000);
    } else {
      closeExportModal();
      showToast(`Rendering failed: ${data.message}`, 'error');
    }
  })
  .catch(err => {
    console.warn("Backend offline, triggering mockup preview download:", err);
    // Fall back to original simulated preview download
    let progress = 15;
    const interval = setInterval(() => {
      progress += 10;
      progressFill.style.width = `${progress}%`;
      progressText.innerText = `Progress: ${progress}%`;
      timeLeftText.innerText = `Estimated: ${Math.ceil((100 - progress) / 10)} seconds left`;
      
      if (progress >= 100) {
        clearInterval(interval);
        closeExportModal();
        showToast('Rendering Complete (Simulated fallback)!', 'success');
        
        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent('Anita Tech Custom Rendered Video File Output'));
        element.setAttribute('download', `${videoProjectName.replace(/\s+/g, '_')}_render.mp4`);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
      }
    }, 200);
  });
}

// Zoom Timeline
function zoomTimeline(amount) {
  timelineZoom += amount * 3;
  if (timelineZoom < 8) timelineZoom = 8;
  if (timelineZoom > 30) timelineZoom = 30;
  renderTimelineRuler();
  renderTimelineClips();
  updatePlayheadUI();
}

// ==========================================
// DOCUMENT EDITOR ACTIONS
// ==========================================
function execDocCommand(cmd, val = null) {
  document.execCommand(cmd, false, val);
}

function insertDocTable() {
  const rows = prompt("Enter number of rows:", "3");
  const cols = prompt("Enter number of columns:", "3");
  if (!rows || !cols) return;

  let tableHtml = `<table style="width: 100%; border-collapse: collapse; margin-top: 1rem;">`;
  for (let r = 0; r < parseInt(rows); r++) {
    tableHtml += `<tr>`;
    for (let c = 0; c < parseInt(cols); c++) {
      tableHtml += `<td style="border: 1px solid #cbd5e1; padding: 8px;">Cell ${r + 1},${c + 1}</td>`;
    }
    tableHtml += `</tr>`;
  }
  tableHtml += `</table><p></p>`;
  
  document.execCommand('insertHTML', false, tableHtml);
}

function insertDocImage() {
  const url = prompt("Enter image link URL:", "https://picsum.photos/600/300");
  if (url) {
    const imgHtml = `<img src="${url}" style="max-width: 100%; border-radius: 8px; margin: 1rem 0;" /><p></p>`;
    document.execCommand('insertHTML', false, imgHtml);
  }
}

function exportDocFile() {
  const content = document.getElementById('doc-editor-textarea').innerHTML;
  
  // HTML encapsulation wrapper
  const encapsulated = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><title>Exported Document</title></head>
    <body style="font-family: Arial, sans-serif;">${content}</body>
    </html>
  `;
  
  const blob = new Blob(['\ufeff' + encapsulated], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const element = document.createElement('a');
  element.href = url;
  element.download = 'Anita_Tech_Document.docx';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
  showToast('Document exported as DOCX file', 'success');
}

// ==========================================
// SPREADSHEET EDITOR ACTIONS
// ==========================================
let excelRowCount = 40;
let excelColCount = 15;

function getExcelColumnLabel(index) {
  let label = '';
  let temp = index;
  while (temp >= 0) {
    label = String.fromCharCode((temp % 26) + 65) + label;
    temp = Math.floor(temp / 26) - 1;
  }
  return label;
}

function renderExcelHeaders() {
  const headerRow = document.getElementById('excel-grid-header-row');
  if (!headerRow) return;
  headerRow.innerHTML = '<th class="grid-header-corner"></th>';
  for (let c = 0; c < excelColCount; c++) {
    const th = document.createElement('th');
    th.innerText = getExcelColumnLabel(c);
    headerRow.appendChild(th);
  }
}

function addExcelRow(r) {
  const body = document.getElementById('excel-grid-body');
  if (!body) return;

  const rowEl = document.createElement('tr');
  
  const indexCell = document.createElement('td');
  indexCell.className = 'row-index-header';
  indexCell.innerText = r;
  rowEl.appendChild(indexCell);
  
  for (let c = 0; c < excelColCount; c++) {
    const colChar = getExcelColumnLabel(c);
    const cellId = `${colChar}${r}`;
    
    const cellTd = document.createElement('td');
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'excel-cell-input';
    input.id = `excel-cell-${cellId}`;
    input.setAttribute('data-cell-id', cellId);
    
    input.addEventListener('focus', () => handleCellFocus(cellId));
    input.addEventListener('blur', () => handleCellBlur(cellId));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') input.blur();
    });
    
    cellTd.appendChild(input);
    rowEl.appendChild(cellTd);
  }
  
  body.appendChild(rowEl);
}

function addExcelColumn() {
  excelColCount++;
  renderExcelHeaders();
  
  const body = document.getElementById('excel-grid-body');
  if (!body) return;
  
  const rows = body.querySelectorAll('tr');
  rows.forEach((rowEl, index) => {
    const r = index + 1;
    const colChar = getExcelColumnLabel(excelColCount - 1);
    const cellId = `${colChar}${r}`;
    
    const cellTd = document.createElement('td');
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'excel-cell-input';
    input.id = `excel-cell-${cellId}`;
    input.setAttribute('data-cell-id', cellId);
    
    input.addEventListener('focus', () => handleCellFocus(cellId));
    input.addEventListener('blur', () => handleCellBlur(cellId));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') input.blur();
    });
    
    cellTd.appendChild(input);
    rowEl.appendChild(cellTd);
  });
}

function initExcelGrid() {
  excelRowCount = 40;
  excelColCount = 15;
  
  const body = document.getElementById('excel-grid-body');
  if (!body) return;
  body.innerHTML = '';
  
  renderExcelHeaders();
  
  // Render initial rows
  for (let r = 1; r <= excelRowCount; r++) {
    addExcelRow(r);
  }

  // Prepopulate mockup values for demonstration
  excelCellsData = {
    "A1": { raw: "Project Costs", computed: "Project Costs" },
    "A2": { raw: "Design Mockups", computed: "Design Mockups" },
    "B2": { raw: "1200", computed: "1200" },
    "A3": { raw: "Backend Engineers", computed: "Backend Engineers" },
    "B3": { raw: "3400", computed: "3400" },
    "A4": { raw: "Deployment Setup", computed: "Deployment Setup" },
    "B4": { raw: "800", computed: "800" },
    "A5": { raw: "Total Cost", computed: "Total Cost" },
    "B5": { raw: "=SUM(B2:B4)", computed: "5400" }
  };

  // Render populated values
  for (const cellId in excelCellsData) {
    const input = document.getElementById(`excel-cell-${cellId}`);
    if (input) {
      input.value = excelCellsData[cellId].computed;
    }
  }

  // Setup infinite scroll listeners
  const scrollContainer = document.getElementById('excel-sheet-scroll-container');
  if (scrollContainer) {
    scrollContainer.addEventListener('scroll', () => {
      // Infinite Vertical Scroll: Load 20 more rows
      if (scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight - 60) {
        const target = excelRowCount + 20;
        for (let r = excelRowCount + 1; r <= target; r++) {
          excelRowCount++;
          addExcelRow(excelRowCount);
        }
        // Restore values
        for (const cellId in excelCellsData) {
          const input = document.getElementById(`excel-cell-${cellId}`);
          if (input && !input.value) {
            input.value = excelCellsData[cellId].computed;
          }
        }
      }
      
      // Infinite Horizontal Scroll: Load 5 more columns
      if (scrollContainer.scrollLeft + scrollContainer.clientWidth >= scrollContainer.scrollWidth - 60) {
        for (let i = 0; i < 5; i++) {
          addExcelColumn();
        }
        // Restore values
        for (const cellId in excelCellsData) {
          const input = document.getElementById(`excel-cell-${cellId}`);
          if (input && !input.value) {
            input.value = excelCellsData[cellId].computed;
          }
        }
      }
    });
  }
}

let activeExcelCellId = "A1";

function handleCellFocus(cellId) {
  activeExcelCellId = cellId;
  document.getElementById('excel-active-cell').innerText = cellId;
  
  const cellRecord = excelCellsData[cellId];
  const formulaInput = document.getElementById('excel-formula-input');
  
  if (cellRecord) {
    formulaInput.value = cellRecord.raw;
    // Show formula raw input value in cell during edit mode
    document.getElementById(`excel-cell-${cellId}`).value = cellRecord.raw;
  } else {
    formulaInput.value = '';
  }
}

function handleCellBlur(cellId) {
  const input = document.getElementById(`excel-cell-${cellId}`);
  const val = input.value.trim();
  
  if (val) {
    let computed = val;
    if (val.startsWith('=')) {
      computed = evaluateCellFormula(val);
    }
    
    excelCellsData[cellId] = {
      raw: val,
      computed: computed
    };
    
    input.value = computed;
    
    // Recalculate spreadsheet dependencies
    recalculateSpreadsheet();
  } else {
    delete excelCellsData[cellId];
  }
}

function handleFormulaInput(val) {
  const input = document.getElementById(`excel-cell-${activeExcelCellId}`);
  if (input) {
    input.value = val;
  }
}

function evaluateCellFormula(formula) {
  const cleaned = formula.toUpperCase().replace(/\s+/g, '');
  
  // Support SUM(A1:A5)
  if (cleaned.startsWith('=SUM(') && cleaned.endsWith(')')) {
    const range = cleaned.substring(5, cleaned.length - 1);
    const coords = parseExcelRange(range);
    
    let total = 0;
    coords.forEach(cellId => {
      const val = parseFloat(excelCellsData[cellId]?.computed || 0);
      if (!isNaN(val)) total += val;
    });
    return total.toString();
  }

  // Support AVERAGE(B1:B5)
  if (cleaned.startsWith('=AVERAGE(') && cleaned.endsWith(')')) {
    const range = cleaned.substring(9, cleaned.length - 1);
    const coords = parseExcelRange(range);
    
    let sum = 0;
    let count = 0;
    coords.forEach(cellId => {
      const val = parseFloat(excelCellsData[cellId]?.computed || 0);
      if (!isNaN(val)) {
        sum += val;
        count++;
      }
    });
    return count > 0 ? (sum / count).toFixed(2) : "0";
  }

  return "ERR (Formula)";
}

function parseExcelRange(range) {
  const parts = range.split(':');
  if (parts.length !== 2) return [parts[0]];
  
  const start = parts[0];
  const end = parts[1];
  
  const startCol = start.charCodeAt(0);
  const startRow = parseInt(start.substring(1));
  const endCol = end.charCodeAt(0);
  const endRow = parseInt(end.substring(1));
  
  const cells = [];
  for (let c = Math.min(startCol, endCol); c <= Math.max(startCol, endCol); c++) {
    for (let r = Math.min(startRow, endRow); r <= Math.max(startRow, endRow); r++) {
      cells.push(`${String.fromCharCode(c)}${r}`);
    }
  }
  return cells;
}

function recalculateSpreadsheet() {
  for (const cellId in excelCellsData) {
    const cell = excelCellsData[cellId];
    if (cell.raw.startsWith('=')) {
      cell.computed = evaluateCellFormula(cell.raw);
      const input = document.getElementById(`excel-cell-${cellId}`);
      if (input && document.activeElement !== input) {
        input.value = cell.computed;
      }
    }
  }
}

function exportExcelFile() {
  // Simple CSV generation
  let csvContent = "";
  for (let r = 1; r <= 20; r++) {
    const rowValues = [];
    for (let c = 0; c < 10; c++) {
      const cellId = `${String.fromCharCode(65 + c)}${r}`;
      rowValues.push(excelCellsData[cellId]?.computed || "");
    }
    csvContent += rowValues.join(',') + "\r\n";
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const element = document.createElement('a');
  element.href = url;
  element.download = 'Anita_Tech_Spreadsheet.csv';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
  showToast('Spreadsheet exported as CSV file', 'success');
}

// ==========================================
// PRESENTATION EDITOR ACTIONS
// ==========================================
function renderPPTOutline() {
  const list = document.getElementById('ppt-slides-outline');
  list.innerHTML = '';
  
  pptSlides.forEach((slide, idx) => {
    list.innerHTML += `
      <div class="slide-thumb-card ${activeSlideIndex === idx ? 'active' : ''}" onclick="selectPPTSlide(${idx})">
        <div class="slide-thumb-preview" style="background: linear-gradient(135deg, ${slide.bg} 0%, #1e1e30 100%);">
          Slide ${idx + 1}
        </div>
        <span class="slide-thumb-label">${slide.title.substring(0, 15)}</span>
      </div>
    `;
  });
}

function selectPPTSlide(idx) {
  activeSlideIndex = idx;
  renderPPTOutline();
  loadSlideContent();
}

function loadSlideContent() {
  const board = document.getElementById('active-slide-board');
  const slide = pptSlides[activeSlideIndex];
  
  board.style.background = `linear-gradient(135deg, ${slide.bg} 0%, #111827 100%)`;
  board.innerHTML = `
    <h2 style="font-size: 2.25rem; font-weight: 800; color: #ffffff; margin-bottom: 1.5rem; text-shadow: 0 4px 10px rgba(0,0,0,0.3);" contenteditable="true" id="ppt-slide-title" onblur="savePPTContent()">${slide.title}</h2>
    <p style="font-size: 1.15rem; color: rgba(255, 255, 255, 0.85);" contenteditable="true" id="ppt-slide-subtitle" onblur="savePPTContent()">${slide.subtitle}</p>
  `;
}

function savePPTContent() {
  const title = document.getElementById('ppt-slide-title').innerText;
  const subtitle = document.getElementById('ppt-slide-subtitle').innerText;
  
  pptSlides[activeSlideIndex].title = title;
  pptSlides[activeSlideIndex].subtitle = subtitle;
  
  renderPPTOutline();
}

function addNewSlide() {
  const themes = ['#8b5cf6', '#06b6d4', '#10b981', '#ec4899', '#f59e0b'];
  const newBg = themes[Math.floor(Math.random() * themes.length)];
  
  const newSlide = {
    id: 'slide-' + Math.floor(1000 + Math.random() * 9000),
    title: 'Double Click to Edit Title',
    subtitle: 'Click here to insert slide description body text.',
    bg: newBg
  };
  
  pptSlides.push(newSlide);
  selectPPTSlide(pptSlides.length - 1);
  showToast('New slide created', 'success');
}

function changeSlideBg() {
  const themes = ['#8b5cf6', '#06b6d4', '#10b981', '#ec4899', '#f59e0b', '#3b82f6'];
  const currentBgIndex = themes.indexOf(pptSlides[activeSlideIndex].bg);
  const nextBg = themes[(currentBgIndex + 1) % themes.length];
  
  pptSlides[activeSlideIndex].bg = nextBg;
  loadSlideContent();
  renderPPTOutline();
}

function addPPTText() {
  const board = document.getElementById('active-slide-board');
  const txt = document.createElement('div');
  txt.style.position = 'absolute';
  txt.style.top = '100px';
  txt.style.left = '100px';
  txt.style.color = '#fff';
  txt.style.padding = '0.5rem';
  txt.style.border = '1px dashed rgba(255,255,255,0.3)';
  txt.contentEditable = true;
  txt.innerText = 'New Text Block';
  txt.addEventListener('blur', () => {
    txt.style.border = 'none';
  });
  board.appendChild(txt);
}

// Fullscreen Presentation Slideshow
let slideshowActiveIdx = 0;

function toggleSlideShow() {
  slideshowActiveIdx = 0;
  document.getElementById('ppt-slideshow-overlay').style.display = 'flex';
  renderSlideshowFrame();
}

function exitSlideShow() {
  document.getElementById('ppt-slideshow-overlay').style.display = 'none';
}

function navSlideShow(direction) {
  slideshowActiveIdx += direction;
  if (slideshowActiveIdx < 0) slideshowActiveIdx = 0;
  if (slideshowActiveIdx >= pptSlides.length) slideshowActiveIdx = pptSlides.length - 1;
  renderSlideshowFrame();
}

function renderSlideshowFrame() {
  const board = document.getElementById('slideshow-board');
  const slide = pptSlides[slideshowActiveIdx];
  
  board.style.background = `linear-gradient(135deg, ${slide.bg} 0%, #111827 100%)`;
  board.innerHTML = `
    <h2 style="font-size: 3.5rem; color: #fff; margin-bottom: 2rem;">${slide.title}</h2>
    <p style="font-size: 1.75rem; color: rgba(255,255,255,0.85);">${slide.subtitle}</p>
  `;

  document.getElementById('slideshow-idx').innerText = `${slideshowActiveIdx + 1} / ${pptSlides.length}`;
}

// ==========================================
// APK & EXE DOWNLOAD ACTIONS
// ==========================================
function startSuiteDownloadSim(type) {
  const selector = document.getElementById('ats-editor-download-selector');
  const block = document.getElementById('ats-editor-download-progress-block');
  const fill = document.getElementById('ats-editor-download-progress-fill');
  const pct = document.getElementById('ats-editor-download-percentage');
  const caption = document.getElementById('ats-editor-download-caption');

  selector.style.display = 'none';
  block.style.display = 'flex';
  caption.innerText = 'Requesting secure download handshake...';

  const totalSize = type === 'exe' ? 65.0 : 35.0;
  const fileName = type === 'exe' ? 'ATS_Video_Editor_Setup.exe' : 'ATS_Video_Editor.apk';

  let progress = 0;
  const interval = setInterval(() => {
    progress += 4;
    if (progress > 100) progress = 100;

    fill.style.width = `${progress}%`;
    const mbs = ((progress / 100) * totalSize).toFixed(1);
    pct.innerText = `Downloading Suite: ${progress.toFixed(0)}% (${mbs} / ${totalSize} MB)`;

    if (progress >= 20 && progress < 50) {
      caption.innerText = "Downloading suite core assets...";
    } else if (progress >= 50 && progress < 85) {
      caption.innerText = "Extracting offline compiler components...";
    } else if (progress >= 85 && progress < 100) {
      caption.innerText = "Verifying package digital signature...";
    }

    if (progress >= 100) {
      clearInterval(interval);
      setTimeout(() => {
        block.style.display = 'none';
        selector.style.display = 'grid';
        caption.innerHTML = `<i class="fa-solid fa-circle-check text-accent-emerald"></i> Download complete! Installer ${fileName} saved.`;
        showToast(`Downloaded ${fileName} successfully!`, 'success');

        // Trigger file download
        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent('ATS Office Standalone Installer'));
        element.setAttribute('download', fileName);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
      }, 500);
    }
  }, 100);
}

// Global Toast System
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container') || createToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let icon = '<i class="fa-solid fa-circle-info toast-icon"></i>';
  if (type === 'success') icon = '<i class="fa-solid fa-circle-check toast-icon"></i>';
  if (type === 'error') icon = '<i class="fa-solid fa-circle-exclamation toast-icon"></i>';

  toast.innerHTML = `
    ${icon}
    <div class="toast-message" style="margin-left: 8px;">${message}</div>
  `;
  
  // Custom Toast CSS directly
  toast.style.display = 'flex';
  toast.style.alignItems = 'center';
  toast.style.background = 'rgba(15,23,42,0.9)';
  toast.style.borderLeft = type === 'success' ? '4px solid var(--accent-emerald)' : type === 'error' ? '4px solid var(--accent-pink)' : '4px solid var(--accent-purple)';
  toast.style.padding = '0.75rem 1.25rem';
  toast.style.borderRadius = '6px';
  toast.style.color = '#fff';
  toast.style.boxShadow = '0 10px 25px rgba(0,0,0,0.3)';
  toast.style.fontSize = '0.85rem';
  toast.style.fontWeight = '600';
  toast.style.marginTop = '0.5rem';
  toast.style.animation = 'slideIn 0.3s ease forwards';

  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 4000);
}

function createToastContainer() {
  const c = document.createElement('div');
  c.id = 'toast-container';
  c.style.position = 'fixed';
  c.style.bottom = '20px';
  c.style.right = '20px';
  c.style.zIndex = '9999';
  c.style.display = 'flex';
  c.style.flexDirection = 'column';
  document.body.appendChild(c);
  return c;
}

// ==========================================
// PAINT CANVAS EDITOR LOGIC
// ==========================================
let paintCanvas = null;
let paintCtx = null;
let isDrawing = false;
let paintBrushSize = 5;
let paintColor = '#10b981';
let isEraserMode = false;

function initPaintEditor() {
  paintCanvas = document.getElementById('paint-canvas');
  if (!paintCanvas) return;

  paintCtx = paintCanvas.getContext('2d');
  
  // Set initial size and style
  resizePaintCanvas();
  window.addEventListener('resize', resizePaintCanvas);

  paintCtx.lineCap = 'round';
  paintCtx.lineJoin = 'round';

  // Drag drawing events
  paintCanvas.addEventListener('mousedown', startDrawing);
  paintCanvas.addEventListener('mousemove', draw);
  paintCanvas.addEventListener('mouseup', stopDrawing);
  paintCanvas.addEventListener('mouseout', stopDrawing);

  // Touch drawing events
  paintCanvas.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    paintCanvas.dispatchEvent(mouseEvent);
    e.preventDefault();
  }, { passive: false });

  paintCanvas.addEventListener('touchmove', (e) => {
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    paintCanvas.dispatchEvent(mouseEvent);
    e.preventDefault();
  }, { passive: false });

  paintCanvas.addEventListener('touchend', () => {
    const mouseEvent = new MouseEvent('mouseup', {});
    paintCanvas.dispatchEvent(mouseEvent);
  });

  // Brush Size slider hook
  const sizeInput = document.getElementById('paint-brush-size');
  if (sizeInput) {
    sizeInput.addEventListener('input', (e) => {
      paintBrushSize = e.target.value;
      const valDisplay = document.getElementById('paint-brush-val');
      if (valDisplay) valDisplay.innerText = paintBrushSize + 'px';
    });
  }

  // Color picker selector hook
  const colorPicker = document.getElementById('paint-color-picker');
  if (colorPicker) {
    colorPicker.addEventListener('input', (e) => {
      if (!isEraserMode) {
        paintColor = e.target.value;
      }
    });
  }
}

function resizePaintCanvas() {
  if (!paintCanvas) return;
  const container = paintCanvas.parentElement;
  if (!container) return;

  // Cache current drawing state to survive resize
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = paintCanvas.width;
  tempCanvas.height = paintCanvas.height;
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.drawImage(paintCanvas, 0, 0);

  paintCanvas.width = Math.max(600, container.clientWidth - 40);
  paintCanvas.height = Math.max(400, container.clientHeight - 40);

  // Initialize with clear white background
  paintCtx.fillStyle = '#ffffff';
  paintCtx.fillRect(0, 0, paintCanvas.width, paintCanvas.height);

  // Restore cached lines
  paintCtx.drawImage(tempCanvas, 0, 0);

  paintCtx.lineCap = 'round';
  paintCtx.lineJoin = 'round';
}

function startDrawing(e) {
  isDrawing = true;
  paintCtx.beginPath();
  const rect = paintCanvas.getBoundingClientRect();
  paintCtx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
}

function draw(e) {
  if (!isDrawing) return;
  const rect = paintCanvas.getBoundingClientRect();
  paintCtx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
  paintCtx.strokeStyle = isEraserMode ? '#ffffff' : paintColor;
  paintCtx.lineWidth = paintBrushSize;
  paintCtx.stroke();
}

function stopDrawing() {
  isDrawing = false;
  paintCtx.closePath();
}

function togglePaintEraser() {
  isEraserMode = !isEraserMode;
  const btn = document.getElementById('paint-eraser');
  if (btn) {
    if (isEraserMode) {
      btn.classList.add('active');
      btn.style.background = 'var(--accent-purple)';
      btn.style.color = '#fff';
    } else {
      btn.classList.remove('active');
      btn.style.background = '';
      btn.style.color = '';
    }
  }
}

function clearPaintCanvas() {
  if (!confirm('Are you sure you want to clear the canvas?')) return;
  paintCtx.fillStyle = '#ffffff';
  paintCtx.fillRect(0, 0, paintCanvas.width, paintCanvas.height);
  showToast('Canvas cleared successfully!', 'success');
}

function exportPaintDrawing() {
  if (!paintCanvas) return;
  const dataUrl = paintCanvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = 'ATS_Drawing.png';
  link.href = dataUrl;
  link.click();
  showToast('Drawing exported as PNG!', 'success');
}
