import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  TextInput
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSelector, useDispatch } from 'react-redux';
import { setViewingStatus } from '../store';

const StatusDetailScreen = ({ route, navigation }) => {
  const { statusId } = route.params;
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const dispatch = useDispatch();

  const mockStatus = {
    id: statusId,
    user: 'John Doe',
    avatar: 'https://i.pravatar.cc/150?img=1',
    content: 'https://picsum.photos/400/600',
    type: 'image',
    time: '2 hours ago',
    viewers: 15
  };

  const handleReply = () => {
    if (replyText.trim()) {
      console.log('Reply sent:', replyText);
      setReplyText('');
      setShowReply(false);
    }
  };

  const handleMute = () => {
    setIsMuted(!isMuted);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Image source={{ uri: mockStatus.avatar }} style={styles.headerAvatar} />
          <View style={styles.headerText}>
            <Text style={styles.headerName}>{mockStatus.user}</Text>
            <Text style={styles.headerTime}>{mockStatus.time}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.iconButton} onPress={handleMute}>
          <Icon name={isMuted ? 'volume-off' : 'volume-up'} size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton}>
          <Icon name="more-vert" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.statusContainer}>
        <Image source={{ uri: mockStatus.content }} style={styles.statusImage} resizeMode="contain" />
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.replyButton}
          onPress={() => setShowReply(true)}
        >
          <Icon name="send" size={20} color="#fff" />
          <Text style={styles.replyButtonText}>Send reply</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showReply}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReply(false)}
      >
        <View style={styles.replyModal}>
          <View style={styles.replyModalContent}>
            <View style={styles.replyModalHeader}>
              <Text style={styles.replyModalTitle}>Reply to {mockStatus.user}</Text>
              <TouchableOpacity onPress={() => setShowReply(false)}>
                <Icon name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.replyInput}
              placeholder="Type your reply..."
              placeholderTextColor="#666"
              value={replyText}
              onChangeText={setReplyText}
              multiline
            />
            <TouchableOpacity style={styles.sendReplyButton} onPress={handleReply}>
              <Text style={styles.sendReplyButtonText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1a2e35'
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12
  },
  headerText: {
    flex: 1
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff'
  },
  headerTime: {
    fontSize: 12,
    color: '#666'
  },
  iconButton: {
    padding: 8
  },
  statusContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000'
  },
  statusImage: {
    width: '100%',
    height: '100%'
  },
  footer: {
    padding: 16,
    backgroundColor: '#1a2e35'
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00a884',
    padding: 16,
    borderRadius: 8
  },
  replyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8
  },
  replyModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  replyModalContent: {
    backgroundColor: '#1a2e35',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20
  },
  replyModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  replyModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff'
  },
  replyInput: {
    backgroundColor: '#0b141a',
    borderRadius: 8,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    minHeight: 100,
    marginBottom: 16
  },
  sendReplyButton: {
    backgroundColor: '#00a884',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center'
  },
  sendReplyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
});

export default StatusDetailScreen;
