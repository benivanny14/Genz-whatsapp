import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  PermissionsAndroid,
  Platform,
  ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';

const audioRecorderPlayer = new AudioRecorderPlayer();

const formatTime = (s) => {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

/**
 * Bottom-sheet voice recorder. Props:
 *   visible  - show/hide
 *   onClose  - dismiss without saving
 *   onSave   - ({ uri, name, duration }) called with the recorded file
 */
const VoiceRecorderSheet = ({ visible, onClose, onSave }) => {
  const [recording, setRecording] = useState(false);
  const [starting, setStarting] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) {
      audioRecorderPlayer.removeRecordBackListener();
      setRecording(false);
      setStarting(false);
      setSeconds(0);
      setError('');
    }
  }, [visible]);

  const requestPermission = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message:
            'The app needs microphone access to record a voice note for your status.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny'
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  };

  const startRecording = async () => {
    try {
      setError('');
      setStarting(true);
      const ok = await requestPermission();
      if (!ok) {
        setError('Microphone permission was denied.');
        setStarting(false);
        return;
      }
      await audioRecorderPlayer.startRecorder();
      audioRecorderPlayer.addRecordBackListener((e) => {
        setSeconds(Math.floor((e.currentPosition || 0) / 1000));
      });
      setRecording(true);
    } catch (err) {
      setError(
        'Could not start recording: ' +
          ((err && err.message) || 'unknown error')
      );
    } finally {
      setStarting(false);
    }
  };

  const stopRecording = async () => {
    try {
      const uri = await audioRecorderPlayer.stopRecorder();
      audioRecorderPlayer.removeRecordBackListener();
      setRecording(false);
      if (uri) {
        onSave({
          uri,
          name: 'Voice note',
          duration: seconds
        });
      }
    } catch (err) {
      setError('Could not stop recording.');
      setRecording(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Record Voice Note</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.recorderBody}>
            <Text style={styles.timer}>{formatTime(seconds)}</Text>
            <Text style={styles.hint}>
              {recording
                ? 'Recording... tap the mic to stop'
                : 'Tap the mic to start recording'}
            </Text>

            <TouchableOpacity
              style={[
                styles.recordButton,
                recording && styles.recordButtonActive
              ]}
              onPress={recording ? stopRecording : startRecording}
              disabled={starting}
            >
              {starting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Icon
                  name={recording ? 'stop' : 'mic'}
                  size={40}
                  color="#fff"
                />
              )}
            </TouchableOpacity>

            {!!error && <Text style={styles.error}>{error}</Text>}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#1a2e35',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff'
  },
  recorderBody: {
    alignItems: 'center',
    paddingBottom: 12
  },
  timer: {
    color: '#fff',
    fontSize: 40,
    fontWeight: '600',
    fontVariant: ['tabular-nums']
  },
  hint: {
    color: '#666',
    fontSize: 14,
    marginTop: 8
  },
  recordButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#00a884',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20
  },
  recordButtonActive: {
    backgroundColor: '#e53935'
  },
  error: {
    color: '#e53935',
    fontSize: 13,
    marginTop: 16,
    textAlign: 'center'
  }
});

export default VoiceRecorderSheet;
