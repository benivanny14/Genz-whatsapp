import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, PanResponder } from 'react-native';

const HANDLE_SIZE = 24;

const formatTime = (s) => {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

/**
 * Two-handle trim slider. Drag either handle (or tap the track) to pick the
 * start/end of the video. Pure React Native (PanResponder) — no native deps.
 *
 * Props:
 *   duration  - video length in seconds
 *   start     - current trim start (seconds)
 *   end       - current trim end (seconds)
 *   onChange  - (start, end) called while dragging
 *   minGap    - minimum seconds between the two handles (default 1)
 */
const VideoTrimmer = ({ duration, start, end, onChange, minGap = 1 }) => {
  const [trackWidth, setTrackWidth] = useState(0);
  const containerRef = useRef(null);
  const basePageX = useRef(0);
  const dragging = useRef(null);

  const toTime = (x) => {
    if (!trackWidth || !duration) return 0;
    const clamped = Math.max(0, Math.min(trackWidth, x));
    return (clamped / trackWidth) * duration;
  };

  const applyMove = (x) => {
    if (!dragging.current) return;
    let s = start;
    let e = end;
    if (dragging.current === 'start') {
      s = Math.max(0, Math.min(toTime(x), e - minGap));
    } else {
      e = Math.min(duration, Math.max(toTime(x), s + minGap));
    }
    onChange(s, e);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        if (containerRef.current) {
          containerRef.current.measure((x, y, w, h, pageX) => {
            basePageX.current = pageX;
          });
        }
        const x = evt.nativeEvent.pageX - basePageX.current;
        const startX = trackWidth ? (start / duration) * trackWidth : 0;
        const endX = trackWidth ? (end / duration) * trackWidth : 0;
        dragging.current =
          Math.abs(x - startX) <= Math.abs(x - endX) ? 'start' : 'end';
        applyMove(x);
      },
      onPanResponderMove: (evt) => {
        applyMove(evt.nativeEvent.pageX - basePageX.current);
      },
      onPanResponderRelease: () => {
        dragging.current = null;
      },
      onPanResponderTerminate: () => {
        dragging.current = null;
      }
    })
  ).current;

  const startX = trackWidth ? (start / duration) * trackWidth : 0;
  const endX = trackWidth ? (end / duration) * trackWidth : 0;

  return (
    <View style={styles.container}>
      <View style={styles.timeRow}>
        <Text style={styles.timeText}>{formatTime(start)}</Text>
        <Text style={styles.timeText}>
          {formatTime(end)} / {formatTime(duration)}
        </Text>
      </View>

      <View
        ref={containerRef}
        style={styles.trackContainer}
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
        {...panResponder.panHandlers}
      >
        <View style={styles.track} />
        {trackWidth > 0 && duration > 0 && (
          <>
            <View
              style={[
                styles.selectedRange,
                { left: startX, width: Math.max(endX - startX, 2) }
              ]}
            />
            <View style={[styles.handle, { left: startX - HANDLE_SIZE / 2 }]}>
              <View style={styles.handleKnob} />
            </View>
            <View style={[styles.handle, { left: endX - HANDLE_SIZE / 2 }]}>
              <View style={styles.handleKnob} />
            </View>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  timeText: {
    color: '#00a884',
    fontSize: 13,
    fontWeight: '600'
  },
  trackContainer: {
    height: 32,
    justifyContent: 'center',
    overflow: 'visible'
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#0b141a'
  },
  selectedRange: {
    position: 'absolute',
    height: 4,
    borderRadius: 2,
    backgroundColor: '#00a884'
  },
  handle: {
    position: 'absolute',
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    backgroundColor: '#00a884',
    alignItems: 'center',
    justifyContent: 'center'
  },
  handleKnob: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0b141a'
  }
});

export default VideoTrimmer;
