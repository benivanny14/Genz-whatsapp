import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Provider } from 'react-redux';
import store from './src/store';

// Screens
import ChatListScreen from './src/screens/ChatListScreen';
import StatusScreen from './src/screens/StatusScreen';
import CallsScreen from './src/screens/CallsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ChatDetailScreen from './src/screens/ChatDetailScreen';
import StatusDetailScreen from './src/screens/StatusDetailScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#00a884',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: { backgroundColor: '#1a2e35' },
        headerStyle: { backgroundColor: '#0b141a' },
        headerTintColor: '#fff'
      }}
    >
      <Tab.Screen
        name="Chats"
        component={ChatListScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="chat" color={color} size={size} />
          )
        }}
      />
      <Tab.Screen
        name="Status"
        component={StatusScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="camera-alt" color={color} size={size} />
          )
        }}
      />
      <Tab.Screen
        name="Calls"
        component={CallsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="call" color={color} size={size} />
          )
        }}
/>
       <Tab.Screen
         name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="person" color={color} size={size} />
          )
        }}
      />
    </Tab.Navigator>
  );
};

const MainNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#0b141a' },
        headerTintColor: '#fff',
        headerShadowVisible: false
      }}
    >
      <Stack.Screen
        name="MainTabs"
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ChatDetail"
        component={ChatDetailScreen}
        options={({ route }) => ({ title: route.params?.name || 'Chat' })}
      />
      <Stack.Screen
        name="StatusDetail"
        component={StatusDetailScreen}
        options={{ title: 'Status' }}
      />
    </Stack.Navigator>
  );
};

const App = () => {
  return (
    <Provider store={store}>
      <NavigationContainer>
        <MainNavigator />
      </NavigationContainer>
    </Provider>
  );
};

export default App;
