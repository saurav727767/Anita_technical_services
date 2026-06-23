import React, { useState, useEffect, useRef } from 'react';
import Timeline from './components/Timeline';
import { FFmpegBridge } from './services/FFmpegBridge';

export default function App() {
  const [projectName, setProjectName] = useState('My Awesome Video Project');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(60);
  const [zoom, setZoom] = useState(1);
  const [mediaList, setMediaList] = useState([]);
  const [selectedClip, setSelectedClip] = useState(null);
  const [filter, setFilter] = useState('none');
  const [activeTab, setActiveTab] = useState('media');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [cloudStatus, setCloudStatus] = useState('Connected to Google Drive');
  
  // Timeline tracks state
  const [tracks, setTracks] = useState({
    video: [
      { id: 'v1', name: 'Intro_Sequence.mp4', start: 0, duration: 15, path: 'Intro_Sequence.mp4' },
      { id: 'v2', name: 'Drone_Shot.mp4', start: 15, duration: 25, path: 'Drone_Shot.mp4' }
    ],
    audio: [
      { id: 'a1', name: 'Background_Beat.mp3', start: 0, duration: 40, path: 'Background_Beat.mp3' }
    ],
    text: [
      { id: 't1', name: 'Title Overlay', start: 2, duration: 8, text: 'ATS Video Editor', x: 100, y: 150 }
    ]
  });

  const canvasRef = useRef(null);

  // Playback timer simulation
  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= duration) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 0.1;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, duration]);

  // Auto-save simulation
  useEffect(() => {
    const saveTimer = setTimeout(() => {
      if (window.api && window.api.autoSaveProject) {
        window.api.autoSaveProject({ projectName, tracks, duration });
        console.log('Project auto-saved.');
      }
    }, 60000);
    return () => clearTimeout(saveTimer);
  }, [projectName, tracks, duration]);

  // Render video preview mockup on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Gradient Background representing video frames
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, '#1d1d26');
    grad.addColorStop(1, '#0e0e12');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid details for rendering simulation
    ctx.strokeStyle = '#282830';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    // Apply Filter overlays visually on canvas
    if (filter === 'grayscale') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (filter === 'sepia') {
      ctx.fillStyle = 'rgba(112, 66, 20, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw active video clip indicator
    const currentVideoClip = tracks.video.find(c => currentTime >= c.start && currentTime <= (c.start + c.duration));
    if (currentVideoClip) {
      ctx.fillStyle = '#06d6a0';
      ctx.font = '14px Inter';
      ctx.fillText(`Playing Source: ${currentVideoClip.name}`, 20, 30);
    }

    // Draw text overlays from text track
    tracks.text.forEach(txt => {
      if (currentTime >= txt.start && currentTime <= (txt.start + txt.duration)) {
        ctx.fillStyle = '#ffb703';
        ctx.font = 'bold 24px Inter';
        ctx.fillText(txt.text, txt.x, txt.y);
      }
    });

    // Playhead line marker
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Courier';
    ctx.fillText(`Scrubber: ${currentTime.toFixed(2)}s`, canvas.width - 130, canvas.height - 15);
  }, [currentTime, tracks, filter]);

  // Import media via Electron Native Dialog
  const handleImportMedia = async () => {
    if (window.api && window.api.openMedia) {
      const files = await window.api.openMedia();
      if (files && files.length > 0) {
        const newMedia = files.map(f => ({
          name: f.split('\\').pop().split('/').pop(),
          path: f
        }));
        setMediaList([...mediaList, ...newMedia]);
      }
    } else {
      // Mock for browser workspace viewing
      setMediaList([...mediaList, { name: 'Sample_Mobile_Shot.mp4', path: '/local/sample.mp4' }]);
    }
  };

  const handleSelectClip = (clip) => {
    setSelectedClip(clip);
  };

  const handleScrub = (time) => {
    setCurrentTime(time);
  };

  const handleSplit = () => {
    if (!selectedClip) return;
    const splitPoint = currentTime - selectedClip.start;
    if (splitPoint <= 0 || splitPoint >= selectedClip.duration) return;

    // Split logic
    const leftPart = { ...selectedClip, duration: splitPoint, id: selectedClip.id + '_L' };
    const rightPart = {
      ...selectedClip,
      start: currentTime,
      duration: selectedClip.duration - splitPoint,
      id: selectedClip.id + '_R',
      name: selectedClip.name + ' (Part 2)'
    };

    const trackName = tracks.video.find(c => c.id === selectedClip.id) ? 'video' :
                      tracks.audio.find(c => c.id === selectedClip.id) ? 'audio' : 'text';

    setTracks({
      ...tracks,
      [trackName]: [
        ...tracks[trackName].filter(c => c.id !== selectedClip.id),
        leftPart,
        rightPart
      ].sort((a, b) => a.start - b.start)
    });
    setSelectedClip(null);
  };

  const handleDeleteClip = () => {
    if (!selectedClip) return;
    const trackName = tracks.video.find(c => c.id === selectedClip.id) ? 'video' :
                      tracks.audio.find(c => c.id === selectedClip.id) ? 'audio' : 'text';
    setTracks({
      ...tracks,
      [trackName]: tracks[trackName].filter(c => c.id !== selectedClip.id)
    });
    setSelectedClip(null);
  };

  const handleStartExport = () => {
    setIsExporting(true);
    setExportProgress(0);
    const interval = setInterval(() => {
      setExportProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setTimeout(() => setIsExporting(false), 800);
          return 100;
        }
        return p + 10;
      });
    }, 300);
  };

  return (
    <div style={styles.appContainer}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.logo}>🎬 ATS Video Editor</span>
          <input 
            type="text" 
            value={projectName} 
            onChange={(e) => setProjectName(e.target.value)} 
            style={styles.projectNameInput}
          />
        </div>
        <div style={styles.headerRight}>
          <span style={styles.cloudStatus}>{cloudStatus}</span>
          <button style={styles.exportBtn} onClick={handleStartExport}>
            🚀 Export Movie
          </button>
        </div>
      </header>

      {/* Main Workspace Grid */}
      <div style={styles.workspace}>
        {/* Left Control Panel */}
        <div style={styles.leftPanel}>
          <div style={styles.tabButtons}>
            <button 
              style={activeTab === 'media' ? styles.tabActive : styles.tab} 
              onClick={() => setActiveTab('media')}
            >
              Media
            </button>
            <button 
              style={activeTab === 'filters' ? styles.tabActive : styles.tab} 
              onClick={() => setActiveTab('filters')}
            >
              Effects
            </button>
          </div>

          <div style={styles.tabContent}>
            {activeTab === 'media' && (
              <div>
                <button style={styles.importBtn} onClick={handleImportMedia}>
                  📁 Import Media
                </button>
                <div style={styles.mediaContainer}>
                  {mediaList.map((m, idx) => (
                    <div key={idx} style={styles.mediaItem}>
                      🎥 {m.name}
                    </div>
                  ))}
                  {mediaList.length === 0 && <span style={styles.mutedText}>No media files imported</span>}
                </div>
              </div>
            )}

            {activeTab === 'filters' && (
              <div style={styles.filtersList}>
                <button style={styles.filterBtn} onClick={() => setFilter('none')}>Original</button>
                <button style={styles.filterBtn} onClick={() => setFilter('grayscale')}>Grayscale B&W</button>
                <button style={styles.filterBtn} onClick={() => setFilter('sepia')}>Vintage Sepia</button>
              </div>
            )}
          </div>
        </div>

        {/* Center Canvas Preview */}
        <div style={styles.centerPanel}>
          <canvas ref={canvasRef} width="640" height="360" style={styles.canvas} />
          
          <div style={styles.playbackControls}>
            <button style={styles.playBtn} onClick={() => setIsPlaying(!isPlaying)}>
              {isPlaying ? '⏸️ Pause' : '▶️ Play'}
            </button>
          </div>
        </div>

        {/* Right Properties Panel */}
        <div style={styles.rightPanel}>
          <h3 style={styles.panelTitle}>Properties</h3>
          {selectedClip ? (
            <div>
              <div style={styles.propRow}>
                <span style={styles.propLabel}>Name:</span>
                <span style={styles.propVal}>{selectedClip.name}</span>
              </div>
              <div style={styles.propRow}>
                <span style={styles.propLabel}>Duration:</span>
                <span style={styles.propVal}>{selectedClip.duration.toFixed(2)}s</span>
              </div>
              {selectedClip.text && (
                <div style={styles.propRow}>
                  <span style={styles.propLabel}>Edit Text:</span>
                  <input 
                    type="text" 
                    value={selectedClip.text} 
                    style={styles.propInput}
                    onChange={(e) => {
                      const updatedText = tracks.text.map(t => t.id === selectedClip.id ? { ...t, text: e.target.value } : t);
                      setTracks({ ...tracks, text: updatedText });
                      setSelectedClip({ ...selectedClip, text: e.target.value });
                    }} 
                  />
                </div>
              )}
            </div>
          ) : (
            <span style={styles.mutedText}>Select a clip on the timeline to edit properties</span>
          )}
        </div>
      </div>

      {/* Multi-track Timeline */}
      <Timeline
        tracks={tracks}
        currentTime={currentTime}
        duration={duration}
        zoom={zoom}
        selectedClip={selectedClip}
        onSelectClip={handleSelectClip}
        onScrub={handleScrub}
        onSplit={handleSplit}
        onDeleteClip={handleDeleteClip}
        setZoom={setZoom}
      />

      {/* Export Process Modal Overlay */}
      {isExporting && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3>Rendering Video Ecosystem Bundle...</h3>
            <div style={styles.progressBarBg}>
              <div style={{ ...styles.progressBarFill, width: `${exportProgress}%` }} />
            </div>
            <span>Exporting: {exportProgress}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  appContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#121214'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 16px',
    height: '60px',
    backgroundColor: '#1a1a1e',
    borderBottom: '1px solid #2e2e38'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  logo: {
    fontWeight: 'bold',
    fontSize: '1.1rem'
  },
  projectNameInput: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#e1e1e6',
    fontSize: '0.9rem',
    borderBottom: '1px solid #333',
    padding: '4px',
    outline: 'none'
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  cloudStatus: {
    fontSize: '0.8rem',
    color: '#06d6a0'
  },
  exportBtn: {
    backgroundColor: '#f72585',
    color: '#fff',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '4px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  workspace: {
    display: 'flex',
    flexGrow: 1,
    overflow: 'hidden'
  },
  leftPanel: {
    width: '260px',
    backgroundColor: '#16161a',
    borderRight: '1px solid #2e2e38',
    display: 'flex',
    flexDirection: 'column'
  },
  tabButtons: {
    display: 'flex',
    borderBottom: '1px solid #2e2e38'
  },
  tab: {
    flexGrow: 1,
    backgroundColor: 'transparent',
    border: 'none',
    color: '#7e7e8a',
    padding: '10px',
    cursor: 'pointer',
    textAlign: 'center'
  },
  tabActive: {
    flexGrow: 1,
    backgroundColor: '#1e1e24',
    border: 'none',
    color: '#fff',
    padding: '10px',
    cursor: 'pointer',
    textAlign: 'center',
    borderBottom: '2px solid #f72585'
  },
  tabContent: {
    padding: '12px',
    flexGrow: 1,
    overflowY: 'auto'
  },
  importBtn: {
    width: '100%',
    backgroundColor: '#2e2e38',
    color: '#fff',
    border: '1px solid #3e3e4a',
    padding: '8px',
    borderRadius: '4px',
    cursor: 'pointer',
    marginBottom: '12px'
  },
  mediaContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  mediaItem: {
    padding: '6px',
    backgroundColor: '#202024',
    borderRadius: '4px',
    fontSize: '0.8rem'
  },
  mutedText: {
    color: '#7e7e8a',
    fontSize: '0.8rem',
    textAlign: 'center',
    display: 'block'
  },
  filtersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  filterBtn: {
    backgroundColor: '#202024',
    color: '#fff',
    border: '1px solid #2e2e38',
    padding: '8px',
    borderRadius: '4px',
    cursor: 'pointer',
    textAlign: 'left'
  },
  centerPanel: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f0f11',
    padding: '16px'
  },
  canvas: {
    backgroundColor: '#000',
    borderRadius: '8px',
    boxShadow: '0 8px 16px rgba(0,0,0,0.5)'
  },
  playbackControls: {
    marginTop: '12px'
  },
  playBtn: {
    backgroundColor: '#2e2e38',
    color: '#fff',
    border: 'none',
    padding: '8px 20px',
    borderRadius: '20px',
    cursor: 'pointer'
  },
  rightPanel: {
    width: '260px',
    backgroundColor: '#16161a',
    borderLeft: '1px solid #2e2e38',
    padding: '16px'
  },
  panelTitle: {
    marginTop: 0,
    fontSize: '0.95rem',
    borderBottom: '1px solid #2e2e38',
    paddingBottom: '8px'
  },
  propRow: {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: '12px',
    gap: '4px'
  },
  propLabel: {
    fontSize: '0.75rem',
    color: '#7e7e8a'
  },
  propVal: {
    fontSize: '0.85rem'
  },
  propInput: {
    backgroundColor: '#202024',
    border: '1px solid #2e2e38',
    color: '#fff',
    padding: '6px',
    borderRadius: '4px',
    outline: 'none'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modalContent: {
    backgroundColor: '#1a1a1e',
    padding: '24px',
    borderRadius: '8px',
    textAlign: 'center',
    width: '320px'
  },
  progressBarBg: {
    height: '10px',
    backgroundColor: '#333',
    borderRadius: '5px',
    overflow: 'hidden',
    margin: '16px 0'
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#06d6a0',
    transition: 'width 0.2s'
  }
};
