import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Modal
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSelector, useDispatch } from 'react-redux';
import { setMyStatuses, addStatus } from '../store';

const StatusScreen = ({ navigation }) => {
  const [showAddStatus, setShowAddStatus] = useState(false);
  const dispatch = useDispatch();
  const { myStatuses } = useSelector(state => state.status);

  const mockStatuses = [
    {
      id: '1',
      thumbnail: 'https://i.pravatar.cc/150?img=10',
      time: '2 hours ago',
      viewers: 15
    },
    {
      id: '2',
      thumbnail: 'https://i.pravatar.cc/150?img=11',
      time: 'Yesterday',
      viewers: 42
    }
  ];

  useEffect(() => {
    dispatch(setMyStatuses(mockStatuses));
  }, []);

  const handleAddStatus = () => {
    setShowAddStatus(true);
  };

  const renderStatusItem = ({ item }) => (
    <TouchableOpacity
      style={styles.statusItem}
      onPress={() => navigation.navigate('StatusDetail', { statusId: item.id })}
    >
      <View style={styles.statusThumbnail}>
        <Image source={{ uri: item.thumbnail }} style={styles.thumbnailImage} />
        <View style={styles.statusRing} />
      </View>
      <View style={styles.statusInfo}>
        <Text style={styles.statusName}>My Status</Text>
        <Text style={styles.statusTime}>{item.time}</Text>
        <Text style={styles.statusViewers}>{item.viewers} views</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Status</Text>
        <TouchableOpacity style={styles.iconButton}>
          <Icon name="search" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton}>
          <Icon name="more-vert" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <TouchableOpacity
          style={styles.addStatusButton}
          onPress={handleAddStatus}
        >
          <View style={styles.addStatusIcon}>
            <Icon name="add" size={28} color="#00a884" />
          </View>
          <View style={styles.addStatusText}>
            <Text style={styles.addStatusLabel}>My Status</Text>
            <Text style={styles.addStatusSublabel}>Tap to add status update</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Recent Updates</Text>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {myStatuses.map((status) => (
            <TouchableOpacity
              key={status.id}
              style={styles.statusThumbnail}
              onPress={() => navigation.navigate('StatusDetail', { statusId: status.id })}
            >
              <Image source={{ uri: status.thumbnail }} style={styles.thumbnailImage} />
              <View style={styles.statusRing} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </ScrollView>

      <Modal
        visible={showAddStatus}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddStatus(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Status</Text>
              <TouchableOpacity onPress={() => setShowAddStatus(false)}>
                <Icon name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.statusOptions}>
              <TouchableOpacity style={styles.statusOption}>
                <Icon name="camera-alt" size={32} color="#00a884" />
                <Text style={styles.statusOptionText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.statusOption}>
                <Icon name="image" size={32} color="#00a884" />
                <Text style={styles.statusOptionText}>Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.statusOption}>
                <Icon name="text-fields" size={32} color="#00a884" />
                <Text style={styles.statusOptionText}>Text</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.statusOption}>
                <Icon name="gif" size={32} color="#00a884" />
                <Text style={styles.statusOptionText}>GIF</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b141a'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#1a2e35'
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff'
  },
  iconButton: {
    padding: 8
  },
  content: {
    flex: 1,
    padding: 16
  },
  addStatusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#1a2e35',
    borderRadius: 12,
    marginBottom: 24
  },
  addStatusIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0b141a',
    borderWidth: 2,
    borderColor: '#00a884',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  addStatusText: {
    flex: 1
  },
  addStatusLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff'
  },
  addStatusSublabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 2
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#1a2e35',
    borderRadius: 12,
    marginBottom: 8
  },
  statusThumbnail: {
    marginRight: 12
  },
  thumbnailImage: {
    width: 60,
    height: 60,
    borderRadius: 30
  },
  statusRing: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#00a884'
  },
  statusInfo: {
    flex: 1
  },
  statusName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff'
  },
  statusTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2
  },
  statusViewers: {
    fontSize: 12,
    color: '#00a884',
    marginTop: 2
  },
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
  statusOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around'
  },
  statusOption: {
    alignItems: 'center',
    padding: 16
  },
  statusOptionText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 8
  }
});

export default StatusScreen;
