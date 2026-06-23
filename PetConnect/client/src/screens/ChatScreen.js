import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { io } from 'socket.io-client';

import { useAuth } from '../context/AuthContext';
import api, { API_URL } from '../services/api';

const SOCKET_URL = API_URL.replace(/\/api\/?$/, '');

const getErrorMessage = (error, fallback) =>
  error.response?.data?.message || error.message || fallback;

const getId = (value) => {
  if (!value) {
    return '';
  }

  return typeof value === 'string' ? value : value._id;
};

const formatTime = (dateValue) => {
  if (!dateValue) {
    return '';
  }

  return new Date(dateValue).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default function ChatScreen() {
  const { user, token } = useAuth();
  const socketRef = useRef(null);
  const selectedUserIdRef = useRef(null);
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  const selectedUserId = selectedUser?._id;

  useEffect(() => {
    selectedUserIdRef.current = selectedUserId;
  }, [selectedUserId]);

  const fetchConversations = useCallback(async ({ refreshing = false } = {}) => {
    try {
      setError('');
      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoadingConversations(true);
      }

      const { data } = await api.get('/messages/conversations');
      setConversations(data.conversations || []);
    } catch (conversationError) {
      setError(getErrorMessage(conversationError, 'Could not load conversations.'));
    } finally {
      setIsLoadingConversations(false);
      setIsRefreshing(false);
    }
  }, []);

  const fetchConversation = useCallback(async (userId) => {
    if (!userId) {
      setMessages([]);
      return;
    }

    try {
      setError('');
      setIsLoadingMessages(true);
      const { data } = await api.get(`/messages/conversation/${userId}`);
      setMessages(data.messages || []);
    } catch (conversationError) {
      setError(getErrorMessage(conversationError, 'Could not load messages.'));
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    const socket = io(SOCKET_URL, {
      auth: { token }
    });

    socketRef.current = socket;

    socket.on('connect_error', (socketError) => {
      setError(socketError.message || 'Socket connection failed.');
    });

    socket.on('receiveMessage', (message) => {
      if (message.error) {
        setError(message.error);
        return;
      }

      const senderId = getId(message.sender);
      const receiverId = getId(message.receiver);
      const currentUserId = user?.id;
      const activeConversationId = selectedUserIdRef.current;

      if (
        activeConversationId &&
        (senderId === activeConversationId || receiverId === activeConversationId)
      ) {
        setMessages((current) => {
          if (current.some((item) => item._id === message._id)) {
            return current;
          }

          return [...current, message];
        });
      }

      if (senderId === currentUserId || receiverId === currentUserId) {
        fetchConversations();
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [fetchConversations, token, user?.id]);

  const sortedMessages = useMemo(
    () =>
      [...messages].sort(
        (first, second) => new Date(first.createdAt) - new Date(second.createdAt)
      ),
    [messages]
  );

  const selectConversation = (conversation) => {
    setSelectedUser(conversation.user);
    fetchConversation(conversation.user._id);
  };

  const sendMessage = async () => {
    const text = messageText.trim();

    if (!selectedUserId) {
      setError('Select a conversation first.');
      return;
    }

    if (!text) {
      setError('Message text is required.');
      return;
    }

    try {
      setError('');
      setIsSending(true);
      await api.post('/messages', {
        receiver: selectedUserId,
        text
      });
      setMessageText('');
      await fetchConversation(selectedUserId);
      await fetchConversations();
    } catch (sendError) {
      setError(getErrorMessage(sendError, 'Could not send message.'));
    } finally {
      setIsSending(false);
    }
  };

  const renderConversation = (conversation) => {
    const isActive = selectedUserId === conversation.user._id;

    return (
      <TouchableOpacity
        key={conversation.user._id}
        style={[styles.conversationCard, isActive && styles.conversationCardActive]}
        onPress={() => selectConversation(conversation)}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {conversation.user.username?.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.conversationTextWrap}>
          <Text style={styles.conversationName}>{conversation.user.username}</Text>
          <Text style={styles.conversationPreview} numberOfLines={1}>
            {conversation.lastMessage?.text || 'No messages yet'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderMessage = (message) => {
    const isMine = getId(message.sender) === user?.id;

    return (
      <View
        key={message._id}
        style={[
          styles.messageBubble,
          isMine ? styles.myMessageBubble : styles.theirMessageBubble
        ]}
      >
        <Text style={[styles.messageText, isMine && styles.myMessageText]}>
          {message.text}
        </Text>
        <Text style={[styles.messageTime, isMine && styles.myMessageTime]}>
          {formatTime(message.createdAt)}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => fetchConversations({ refreshing: true })}
            tintColor="#2f8f68"
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.kicker}>Realtime messages</Text>
          <Text style={styles.title}>Chat</Text>
          <Text style={styles.subtitle}>
            Talk with other pet owners and keep adoption, meetup, and care plans moving.
          </Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conversations</Text>
          {isLoadingConversations ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#2f8f68" />
              <Text style={styles.loadingText}>Loading conversations...</Text>
            </View>
          ) : conversations.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptyText}>
                Send a message through a user profile later, or use seeded users to test chat.
              </Text>
            </View>
          ) : (
            <View style={styles.conversationList}>
              {conversations.map(renderConversation)}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {selectedUser ? `Chat with ${selectedUser.username}` : 'Messages'}
          </Text>

          {!selectedUser ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Select a conversation</Text>
              <Text style={styles.emptyText}>
                Choose someone above to view your message history.
              </Text>
            </View>
          ) : isLoadingMessages ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#2f8f68" />
              <Text style={styles.loadingText}>Loading messages...</Text>
            </View>
          ) : sortedMessages.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No messages here yet</Text>
              <Text style={styles.emptyText}>Start the conversation below.</Text>
            </View>
          ) : (
            <View style={styles.messageList}>{sortedMessages.map(renderMessage)}</View>
          )}
        </View>
      </ScrollView>

      <View style={styles.inputBar}>
        <TextInput
          value={messageText}
          onChangeText={setMessageText}
          placeholder={selectedUser ? 'Type a message' : 'Select a conversation first'}
          placeholderTextColor="#8a9b91"
          style={styles.messageInput}
          editable={Boolean(selectedUser) && !isSending}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!selectedUser || isSending) && styles.sendButtonDisabled
          ]}
          onPress={sendMessage}
          disabled={!selectedUser || isSending}
        >
          <Text style={styles.sendButtonText}>{isSending ? '...' : 'Send'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7fbf6'
  },
  content: {
    flex: 1
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100
  },
  header: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: '#dcebe1',
    marginBottom: 16
  },
  kicker: {
    color: '#2f8f68',
    fontWeight: '800',
    marginBottom: 6
  },
  title: {
    color: '#173b2c',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8
  },
  subtitle: {
    color: '#5f7569',
    lineHeight: 22
  },
  error: {
    color: '#b3261e',
    lineHeight: 20,
    marginBottom: 12
  },
  section: {
    marginBottom: 16
  },
  sectionTitle: {
    color: '#173b2c',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 10
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dcebe1',
    paddingVertical: 28
  },
  loadingText: {
    color: '#5f7569',
    marginTop: 10
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dcebe1',
    padding: 18
  },
  emptyTitle: {
    color: '#173b2c',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6
  },
  emptyText: {
    color: '#5f7569',
    lineHeight: 22
  },
  conversationList: {
    gap: 10
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dcebe1',
    padding: 14
  },
  conversationCardActive: {
    borderColor: '#2f8f68',
    backgroundColor: '#eef8f0'
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#2f8f68',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800'
  },
  conversationTextWrap: {
    flex: 1
  },
  conversationName: {
    color: '#173b2c',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4
  },
  conversationPreview: {
    color: '#5f7569'
  },
  messageList: {
    gap: 10
  },
  messageBubble: {
    maxWidth: '84%',
    borderRadius: 8,
    padding: 12
  },
  myMessageBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#2f8f68'
  },
  theirMessageBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dcebe1'
  },
  messageText: {
    color: '#173b2c',
    lineHeight: 20
  },
  myMessageText: {
    color: '#ffffff'
  },
  messageTime: {
    color: '#5f7569',
    fontSize: 12,
    marginTop: 6,
    alignSelf: 'flex-end'
  },
  myMessageTime: {
    color: '#ddf4e7'
  },
  inputBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#dcebe1'
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d7e5dc',
    borderRadius: 8,
    color: '#173b2c',
    backgroundColor: '#fbfdfb',
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 11
  },
  sendButton: {
    backgroundColor: '#2f8f68',
    borderRadius: 8,
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center'
  },
  sendButtonDisabled: {
    opacity: 0.6
  },
  sendButtonText: {
    color: '#ffffff',
    fontWeight: '800'
  }
});
