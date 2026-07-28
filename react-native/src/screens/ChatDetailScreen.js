import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSelector, useDispatch } from 'react-redux';
import { addMessage } from '../store';

const ChatDetailScreen = ({ route, navigation }) => {
  const { name, chatId } = route.params;
  const [message, setMessage] = useState('');
  const flatListRef = useRef(null);
  const dispatch = useDispatch();
  const { messages } = useSelector(state => state.chats);

  const mockMessages = [
    { id: '1', text: 'Hey, how are you?', sender: 'other', time: '10:30 AM' },
    { id: '2', text: 'I am good, thanks!', sender: 'me', time: '10:31 AM' },
    { id: '3', text: 'What are you up to?', sender: 'other', time: '10:32 AM' }
  ];

  useEffect(() => {
    if (!messages[chatId]) {
      dispatch(setMessages({ chatId, messages: mockMessages }));
    }
  }, []);

  const handleSend = () => {
    if (message.trim()) {
      const newMessage = {
        id: Date.now().toString(),
        text: message,
        sender: 'me',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      dispatch(addMessage({ chatId, message: newMessage }));
      setMessage('');
    }
  };

  const renderMessage = ({ item }) => (
    <View
      style={[
        styles.messageBubble,
        item.sender === 'me' ? styles.myMessage : styles.otherMessage
      ]}
    >
      <Text style={[
        styles.messageText,
        item.sender === 'me' ? styles.myMessageText : styles.otherMessageText
      ]}>
        {item.text}
      </Text>
      <Text style={[
        styles.messageTime,
        item.sender === 'me' ? styles.myMessageTime : styles.otherMessageTime
      ]}>
        {item.time}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{name}</Text>
          <Text style={styles.headerStatus}>online</Text>
        </View>
        <TouchableOpacity style={styles.iconButton}>
          <Icon name="videocam" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton}>
          <Icon name="call" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton}>
          <Icon name="more-vert" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages[chatId] || mockMessages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.inputIconButton}>
            <Icon name="emoji-emotions" size={24} color="#666" />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#666"
            value={message}
            onChangeText={setMessage}
          />
          <TouchableOpacity style={styles.inputIconButton}>
            <Icon name="attach-file" size={24} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.inputIconButton}>
            <Icon name="camera-alt" size={24} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sendButton, message.trim() ? styles.sendButtonActive : styles.sendButtonInactive]}
            onPress={handleSend}
          >
            <Icon name="send" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    padding: 16,
    backgroundColor: '#1a2e35'
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12
  },
  headerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff'
  },
  headerStatus: {
    fontSize: 12,
    color: '#00a884'
  },
  iconButton: {
    padding: 8
  },
  messagesList: {
    flex: 1
  },
  messagesContent: {
    padding: 16
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#00a884'
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#1a2e35'
  },
  messageText: {
    fontSize: 16,
    marginBottom: 4
  },
  myMessageText: {
    color: '#fff'
  },
  otherMessageText: {
    color: '#fff'
  },
  messageTime: {
    fontSize: 10
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right'
  },
  otherMessageTime: {
    color: '#666'
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#1a2e35',
    gap: 8
  },
  inputIconButton: {
    padding: 4
  },
  input: {
    flex: 1,
    backgroundColor: '#0b141a',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: '#fff',
    fontSize: 16
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  sendButtonActive: {
    backgroundColor: '#00a884'
  },
  sendButtonInactive: {
    backgroundColor: '#666'
  }
});

export default ChatDetailScreen;
