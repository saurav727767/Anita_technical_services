import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function TimelineEditor({
  tracks,
  currentTime,
  duration,
  onScrub,
  onSplit,
  onDeleteClip,
  onSelectClip,
  selectedClip
}) {
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleRulerPress = (event) => {
    const { locationX } = event.nativeEvent;
    const progress = locationX / (SCREEN_WIDTH - 40);
    onScrub(progress * duration);
  };

  return (
    <View style={styles.container}>
      {/* Header controls */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.actionBtn} onPress={onSplit}>
          <Text style={styles.btnText}>✂️ Split</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={onDeleteClip}>
          <Text style={styles.btnText}>🗑️ Delete</Text>
        </TouchableOpacity>
      </View>

      {/* Scrub Ruler */}
      <TouchableOpacity activeOpacity={0.8} style={styles.ruler} onPress={handleRulerPress}>
        <View style={styles.timeIndicators}>
          <Text style={styles.timeLabel}>0:00</Text>
          <Text style={styles.timeLabel}>{formatTime(duration / 2)}</Text>
          <Text style={styles.timeLabel}>{formatTime(duration)}</Text>
        </View>
        {/* Playhead indicator bar */}
        <View style={[styles.playhead, { left: `${(currentTime / duration) * 100}%` }]} />
      </TouchableOpacity>

      {/* Timeline track lists */}
      <ScrollView style={styles.tracksScroll}>
        {Object.keys(tracks).map((trackName) => (
          <View key={trackName} style={styles.trackRow}>
            <View style={styles.trackHeader}>
              <Text style={styles.trackTitle}>{trackName.toUpperCase()}</Text>
            </View>
            <View style={styles.trackTimeline}>
              {tracks[trackName].map((clip) => {
                const isSelected = selectedClip?.id === clip.id;
                const leftPos = (clip.start / duration) * 100;
                const widthPercent = (clip.duration / duration) * 100;
                return (
                  <TouchableOpacity
                    key={clip.id}
                    onPress={() => onSelectClip(clip)}
                    style={[
                      styles.clipBlock,
                      {
                        left: `${leftPos}%`,
                        width: `${widthPercent}%`,
                        backgroundColor: isSelected ? '#7209b7' : styles.colors[trackName],
                        borderColor: isSelected ? '#f72585' : 'transparent'
                      }
                    ]}
                  >
                    <Text style={styles.clipText} numberOfLines={1}>
                      {clip.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#16161a',
    padding: 10,
    height: 240,
    borderTopWidth: 1,
    borderTopColor: '#2e2e38'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  actionBtn: {
    backgroundColor: '#2e2e38',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4
  },
  deleteBtn: {
    backgroundColor: '#9b2226'
  },
  btnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600'
  },
  ruler: {
    height: 24,
    backgroundColor: '#202024',
    borderRadius: 4,
    position: 'relative',
    justifyContent: 'center',
    marginBottom: 8
  },
  timeIndicators: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8
  },
  timeLabel: {
    color: '#7e7e8a',
    fontSize: 10
  },
  playhead: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#f72585',
    zIndex: 5
  },
  tracksScroll: {
    flex: 1
  },
  trackRow: {
    flexDirection: 'row',
    height: 44,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#202024'
  },
  trackHeader: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111',
    height: '100%',
    borderRightWidth: 1,
    borderRightColor: '#2e2e38'
  },
  trackTitle: {
    color: '#a0a0b2',
    fontSize: 9,
    fontWeight: 'bold'
  },
  trackTimeline: {
    flex: 1,
    position: 'relative',
    height: '100%',
    backgroundColor: '#0f0f11'
  },
  clipBlock: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 4
  },
  clipText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '600'
  },
  colors: {
    video: '#3a86c8',
    audio: '#38b000',
    text: '#ffb703'
  }
});
