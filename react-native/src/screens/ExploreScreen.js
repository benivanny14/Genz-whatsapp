import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  TextInput
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const ExploreScreen = () => {
  const [activeTab, setActiveTab] = useState('trending');
  const [searchQuery, setSearchQuery] = useState('');

  const tabs = [
    { id: 'trending', icon: 'trending-up', label: 'Trending' },
    { id: 'foryou', icon: 'local-fire-department', label: 'For You' },
    { id: 'nearby', icon: 'location-on', label: 'Nearby' },
    { id: 'creators', icon: 'star', label: 'Creators' }
  ];

  const trendingContent = [
    { id: 1, type: 'video', user: 'creator1', verified: true, views: '1.2M', likes: '45K' },
    { id: 2, type: 'image', user: 'creator2', verified: false, views: '890K', likes: '32K' },
    { id: 3, type: 'status', user: 'creator3', verified: true, views: '750K', likes: '28K' }
  ];

  const creators = [
    { id: 1, username: 'top_creator', name: 'Top Creator', verified: true, followers: '2.5M' },
    { id: 2, username: 'influencer_x', name: 'Influencer X', verified: true, followers: '1.8M' },
    { id: 3, username: 'artist_pro', name: 'Artist Pro', verified: false, followers: '950K' }
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Explore</Text>
        <TouchableOpacity style={styles.iconButton}>
          <Icon name="search" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton}>
          <Icon name="more-vert" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by hashtag, location..."
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.activeTab]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Icon
              name={tab.icon}
              size={18}
              color={activeTab === tab.id ? '#fff' : '#666'}
            />
            <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.content}>
        {activeTab === 'trending' && (
          <View style={styles.grid}>
            {trendingContent.map((item) => (
              <TouchableOpacity key={item.id} style={styles.gridItem}>
                <View style={styles.gridThumbnail}>
                  <Text style={styles.gridEmoji}>
                    {item.type === 'video' ? '🎬' : item.type === 'image' ? '📷' : '📱'}
                  </Text>
                </View>
                <View style={styles.gridInfo}>
                  <View style={styles.gridHeader}>
                    <Text style={styles.gridUsername}>@{item.user}</Text>
                    {item.verified && <Icon name="verified" size={14} color="#00a884" />}
                  </View>
                  <View style={styles.gridStats}>
                    <Text style={styles.gridStat}>{item.views} views</Text>
                    <Text style={styles.gridStat}>{item.likes} likes</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {activeTab === 'creators' && (
          <View style={styles.creatorsList}>
            {creators.map((creator) => (
              <TouchableOpacity key={creator.id} style={styles.creatorItem}>
                <View style={styles.creatorAvatar}>
                  <Text style={styles.creatorAvatarText}>{creator.name[0]}</Text>
                </View>
                <View style={styles.creatorInfo}>
                  <View style={styles.creatorHeader}>
                    <Text style={styles.creatorUsername}>@{creator.username}</Text>
                    {creator.verified && <Icon name="verified" size={14} color="#00a884" />}
                  </View>
                  <Text style={styles.creatorName}>{creator.name}</Text>
                  <Text style={styles.creatorFollowers}>{creator.followers} followers</Text>
                </View>
                <TouchableOpacity style={styles.followButton}>
                  <Text style={styles.followButtonText}>Follow</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a2e35',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    height: 48
  },
  searchIcon: {
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16
  },
  tabsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#1a2e35'
  },
  activeTab: {
    backgroundColor: '#00a884'
  },
  tabText: {
    color: '#666',
    fontSize: 14,
    marginLeft: 4
  },
  activeTabText: {
    color: '#fff'
  },
  content: {
    flex: 1,
    padding: 16
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  gridItem: {
    width: '48%',
    backgroundColor: '#1a2e35',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden'
  },
  gridThumbnail: {
    aspectRatio: 1,
    backgroundColor: '#0b141a',
    alignItems: 'center',
    justifyContent: 'center'
  },
  gridEmoji: {
    fontSize: 40
  },
  gridInfo: {
    padding: 12
  },
  gridHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  gridUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff'
  },
  gridStats: {
    flexDirection: 'row',
    gap: 8
  },
  gridStat: {
    fontSize: 12,
    color: '#666'
  },
  creatorsList: {
    gap: 12
  },
  creatorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a2e35',
    borderRadius: 12,
    padding: 12
  },
  creatorAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#00a884',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  creatorAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff'
  },
  creatorInfo: {
    flex: 1
  },
  creatorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2
  },
  creatorUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff'
  },
  creatorName: {
    fontSize: 12,
    color: '#666'
  },
  creatorFollowers: {
    fontSize: 12,
    color: '#00a884',
    marginTop: 2
  },
  followButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#00a884',
    borderRadius: 8
  },
  followButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  }
});

export default ExploreScreen;
