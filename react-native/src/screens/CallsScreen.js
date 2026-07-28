import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const CallsScreen = ({ navigation }) => {
  const [tab, setTab] = useState('all');

  const mockCalls = [
    {
      id: '1',
      name: 'John Doe',
      type: 'incoming',
      time: '10:30 AM',
      duration: '5:23',
      avatar: 'https://i.pravatar.cc/150?img=1'
    },
    {
      id: '2',
      name: 'Jane Smith',
      type: 'outgoing',
      time: 'Yesterday',
      duration: '12:45',
      avatar: 'https://i.pravatar.cc/150?img=2'
    },
    {
      id: '3',
      name: 'Mom',
      type: 'missed',
      time: '2 days ago',
      duration: null,
      avatar: 'https://i.pravatar.cc/150?img=3'
    }
  ];

  const renderCallItem = ({ item }) => (
    <TouchableOpacity style={styles.callItem}>
      <View style={styles.avatarContainer}>
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
      </View>
      <View style={styles.callInfo}>
        <Text style={styles.callName}>{item.name}</Text>
        <View style={styles.callDetails}>
          <Icon
            name={item.type === 'incoming' ? 'call-received' : item.type === 'outgoing' ? 'call-made' : 'call-missed'}
            size={16}
            color={item.type === 'missed' ? '#ff6b6b' : '#00a884'}
          />
          <Text style={[
            styles.callType,
            item.type === 'missed' && styles.missedCall
          ]}>
            {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
          </Text>
          <Text style={styles.callTime}>{item.time}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.callButton}>
        <Icon name="call" size={24} color="#00a884" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Calls</Text>
        <TouchableOpacity style={styles.iconButton}>
          <Icon name="search" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton}>
          <Icon name="more-vert" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'all' && styles.activeTab]}
          onPress={() => setTab('all')}
        >
          <Text style={[styles.tabText, tab === 'all' && styles.activeTabText]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'missed' && styles.activeTab]}
          onPress={() => setTab('missed')}
        >
          <Text style={[styles.tabText, tab === 'missed' && styles.activeTabText]}>Missed</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={mockCalls}
        renderItem={renderCallItem}
        keyExtractor={item => item.id}
        style={styles.callList}
      />

      <TouchableOpacity style={styles.fab}>
        <Icon name="add-call" size={24} color="#fff" />
      </TouchableOpacity>
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
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#1a2e35',
    padding: 4
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center'
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#00a884'
  },
  tabText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500'
  },
  activeTabText: {
    color: '#fff'
  },
  callList: {
    flex: 1,
    padding: 16
  },
  callItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#1a2e35',
    borderRadius: 12,
    marginBottom: 8
  },
  avatarContainer: {
    marginRight: 12
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25
  },
  callInfo: {
    flex: 1
  },
  callName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff'
  },
  callDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4
  },
  callType: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4
  },
  missedCall: {
    color: '#ff6b6b'
  },
  callTime: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8
  },
  callButton: {
    padding: 8
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#00a884',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4
  }
});

export default CallsScreen;
