import React from 'react';

export default function Timeline({
  tracks,
  currentTime,
  duration,
  zoom,
  selectedClip,
  onSelectClip,
  onScrub,
  onSplit,
  onDeleteClip,
  setZoom
}) {
  const rulerTicks = [];
  const maxTicks = Math.ceil(duration || 60);

  for (let i = 0; i <= maxTicks; i += 5) {
    rulerTicks.push(i);
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const handleRulerClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    onScrub(percentage * duration);
  };

  return (
    <div style={styles.timelineContainer}>
      {/* Toolbar */}
      <div style={styles.toolbar}>
        <div style={styles.toolbarLeft}>
          <button style={styles.btn} onClick={onSplit}>
            ✂️ Split Clip
          </button>
          <button style={{ ...styles.btn, ...styles.btnDanger }} onClick={onDeleteClip}>
            🗑️ Delete Selected
          </button>
        </div>
        <div style={styles.toolbarRight}>
          <span style={styles.zoomLabel}>Zoom:</span>
          <button style={styles.zoomBtn} onClick={() => setZoom(Math.max(1, zoom - 1))}>-</button>
          <span style={{ margin: '0 8px' }}>{zoom}x</span>
          <button style={styles.zoomBtn} onClick={() => setZoom(Math.min(10, zoom + 1))}>+</button>
        </div>
      </div>

      {/* Tracks Board */}
      <div style={styles.board}>
        {/* Playhead */}
        <div 
          style={{
            ...styles.playhead,
            left: `${((currentTime / (duration || 60)) * 100)}%`
          }} 
        />

        {/* Ruler */}
        <div style={styles.ruler} onClick={handleRulerClick}>
          {rulerTicks.map((tick) => (
            <div 
              key={tick} 
              style={{
                ...styles.rulerTick,
                left: `${((tick / (duration || 60)) * 100)}%`
              }}
            >
              | {tick}s
            </div>
          ))}
        </div>

        {/* Track Rows */}
        {Object.keys(tracks).map((trackName) => (
          <div key={trackName} style={styles.trackRow}>
            <div style={styles.trackLabel}>
              {trackName.toUpperCase()}
            </div>
            <div style={styles.trackContent}>
              {tracks[trackName].map((clip) => {
                const isSelected = selectedClip?.id === clip.id;
                return (
                  <div
                    key={clip.id}
                    onClick={() => onSelectClip(clip)}
                    style={{
                      ...styles.clipBlock,
                      left: `${(clip.start / (duration || 60)) * 100}%`,
                      width: `${(clip.duration / (duration || 60)) * 100}%`,
                      backgroundColor: isSelected ? '#7209b7' : styles.trackColors[trackName],
                      borderColor: isSelected ? '#f72585' : 'transparent'
                    }}
                  >
                    <span style={styles.clipTitle}>{clip.name}</span>
                    <span style={styles.clipDuration}>
                      {clip.duration.toFixed(1)}s
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      
      <div style={styles.statusBar}>
        <span>Playhead: {formatTime(currentTime)} / {formatTime(duration)}</span>
      </div>
    </div>
  );
}

const styles = {
  timelineContainer: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#1a1a1e',
    borderTop: '1px solid #2e2e38',
    padding: '12px',
    height: '280px',
    boxSizing: 'border-box'
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '10px',
    alignItems: 'center'
  },
  toolbarLeft: {
    display: 'flex',
    gap: '8px'
  },
  toolbarRight: {
    display: 'flex',
    alignItems: 'center'
  },
  zoomLabel: {
    fontSize: '0.85rem',
    color: '#a0a0b2',
    marginRight: '6px'
  },
  zoomBtn: {
    backgroundColor: '#2e2e38',
    border: 'none',
    color: '#fff',
    width: '24px',
    height: '24px',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  btn: {
    backgroundColor: '#2e2e38',
    border: '1px solid #3e3e4a',
    color: '#fff',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.85rem'
  },
  btnDanger: {
    backgroundColor: '#9b2226',
    borderColor: '#ae2012'
  },
  board: {
    position: 'relative',
    flexGrow: 1,
    backgroundColor: '#121214',
    borderRadius: '6px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  },
  playhead: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '2px',
    backgroundColor: '#f72585',
    zIndex: 10,
    pointerEvents: 'none'
  },
  ruler: {
    height: '24px',
    backgroundColor: '#1a1a24',
    borderBottom: '1px solid #282830',
    position: 'relative',
    cursor: 'ew-resize'
  },
  rulerTick: {
    position: 'absolute',
    color: '#6e6e80',
    fontSize: '0.7rem',
    top: '4px',
    transform: 'translateX(-50%)',
    pointerEvents: 'none'
  },
  trackRow: {
    display: 'flex',
    height: '50px',
    borderBottom: '1px solid #1a1a20',
    alignItems: 'center'
  },
  trackLabel: {
    width: '80px',
    backgroundColor: '#16161a',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    color: '#a0a0b2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    borderRight: '1px solid #282830'
  },
  trackContent: {
    flexGrow: 1,
    height: '100%',
    position: 'relative',
    backgroundColor: '#111113'
  },
  clipBlock: {
    position: 'absolute',
    top: '6px',
    bottom: '6px',
    borderRadius: '4px',
    border: '2px solid transparent',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '0 8px',
    cursor: 'pointer',
    overflow: 'hidden',
    boxSizing: 'border-box'
  },
  clipTitle: {
    fontSize: '0.75rem',
    fontWeight: '600',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    overflow: 'hidden'
  },
  clipDuration: {
    fontSize: '0.65rem',
    opacity: 0.8
  },
  statusBar: {
    marginTop: '6px',
    fontSize: '0.75rem',
    color: '#8e8e9f',
    display: 'flex',
    justifyContent: 'space-between'
  },
  trackColors: {
    video: '#3a86c8',
    audio: '#38b000',
    text: '#ffb703'
  }
};
