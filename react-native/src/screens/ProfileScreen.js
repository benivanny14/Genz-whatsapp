import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSelector } from 'react-redux';

const ProfileScreen = ({ navigation }) => {
  const { user } = useSelector(state => state.auth);

  const menuItems = [
    { icon: 'star', label: 'Starred Messages', color: '#ffd700' },
    { icon: 'link', label: 'Linked Devices', color: '#00a884' },
    { icon: 'lock', label: 'Privacy', color: '#00a884' },
    { icon: 'security', label: 'Security', color: '#00a884' },
    { icon: 'notifications', label: 'Notifications', color: '#00a884' },
    { icon: 'storage', label: 'Storage and Data', color: '#00a884' },
    { icon: 'help', label: 'Help', color: '#00a884' },
    { icon: 'info', label: 'About', color: '#00a884' }
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity style={styles.iconButton}>
          <Icon name="qr-code-scanner" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton}>
          <Icon name="more-vert" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: user?.avatar || 'https://i.pravatar.cc/150?img=5' }}
              style={styles.avatar}
            />
          </View>
          <Text style={styles.profileName}>{user?.name || 'User Name'}</Text>
          <Text style={styles.profileBio}>Hey there! I am using Genz WhatsApp</Text>
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.menuItem}>
            <Icon name="groups" size={24} color="#00a884" />
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemLabel}>New Group</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Icon name="person-add" size={24} color="#00a884" />
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemLabel}>New Contact</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Icon name="payments" size={24} color="#00a884" />
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemLabel}>Payments</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          {menuItems.map((item, index) => (
            <TouchableOpacity key={index} style={styles.menuItem}>
              <Icon name={item.icon} size={24} color={item.color} />
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemLabel}>{item.label}</Text>
              </View>
              <Icon name="chevron-right" size={24} color="#666" />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutButton}>
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
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
  content: {
    flex: 1
  },
  profileSection: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#1a2e35',
    marginBottom: 16
  },
  avatarContainer: {
    marginBottom: 16
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8
  },
  profileBio: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center'
  },
  section: {
    backgroundColor: '#1a2e35',
    marginBottom: 16
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#0b141a'
  },
  menuItemContent: {
    flex: 1,
    marginLeft: 16
  },
  menuItemLabel: {
    fontSize: 16,
    color: '#fff'
  },
  logoutButton: {
    margin: 16,
    padding: 16,
    backgroundColor: '#ff6b6b',
    borderRadius: 8,
    alignItems: 'center'
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff'
  }
});

export default ProfileScreen;
