import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import {
  useFonts,
  Fraunces_600SemiBold,
  Fraunces_600SemiBold_Italic,
} from '@expo-google-fonts/fraunces';
import AppIcon from '../components/AppIcon';
import VoiceListeningModal from '../components/VoiceListeningModal';
import {
  ensureSession,
  chatApi,
  conversationsApi,
  formatServerTime,
} from '../lib/api';

const INK = '#2A2033';
const MUTED = 'rgba(42, 32, 51, 0.62)';
const SOFT = 'rgba(42, 32, 51, 0.40)';
const FAINT = 'rgba(42, 32, 51, 0.28)';
const CREAM = '#FDF9F3';
const TERRACOTTA = '#B0664A';
const LILAC = '#8C5AA8';
const SAGE = '#6F8F6B';

const QUICK_SUGGESTIONS = [
  "I'm feeling anxious about today",
  'I feel overwhelmed with work',
  'Can we do a breathing exercise?',
  'I just need someone to talk to',
];

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function buildGreeting(mood) {
  let text = "Hi, friend. I'm right here with you. What's on your mind today?";
  if (mood === 'anxious') {
    text =
      "I noticed you felt anxious earlier. I'm right here, and there is no rush. What feels heavy right now?";
  } else if (mood === 'tired') {
    text =
      "You said you felt tired today. You don't have to carry everything at once. What would help you rest?";
  } else if (mood === 'joyful') {
    text =
      "You felt joyful earlier, and I would love to hear about it. What made today feel light?";
  } else if (mood === 'calm') {
    text =
      "You found some calm earlier. Let's stay here a while. What is sitting with you now?";
  } else if (mood === 'okay') {
    text = "Okay is a real place to be. I'm here. What has today been like for you?";
  }
  return {
    id: `greeting-${Date.now()}`,
    sender: 'solace',
    text,
    timestamp: nowTime(),
    suggestedActivity: null,
  };
}

function mapMessage(message) {
  return {
    id: String(message.id),
    sender: message.role === 'user' ? 'user' : 'solace',
    text: message.content,
    timestamp: formatServerTime(message.created_at) || nowTime(),
    suggestedActivity: message.suggested_activity,
  };
}

export default function ChatScreen({ onBack, onOpenBreathing }) {
  const [fontsLoaded] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_600SemiBold_Italic,
  });

  const serif = fontsLoaded ? 'Fraunces_600SemiBold' : 'Georgia, "Times New Roman", serif';
  const serifItalic = fontsLoaded
    ? 'Fraunces_600SemiBold_Italic'
    : 'Georgia, "Times New Roman", serif';

  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userMood, setUserMood] = useState(null);
  const [voiceOpen, setVoiceOpen] = useState(false);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const flatListRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    bootstrap();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const bootstrap = async () => {
    let mood = null;
    try {
      mood = await AsyncStorage.getItem('@solace_today_mood');
      if (mountedRef.current) setUserMood(mood);
    } catch (e) {}

    try {
      await ensureSession();
      const { conversations: list } = await conversationsApi.list();

      if (!mountedRef.current) return;
      setConversations(list);

      if (list.length > 0) {
        const { messages: stored } = await conversationsApi.get(list[0].id);
        if (!mountedRef.current) return;
        setConversationId(list[0].id);
        setMessages(stored.length ? stored.map(mapMessage) : [buildGreeting(mood)]);
      } else {
        setMessages([buildGreeting(mood)]);
      }
    } catch (e) {
      if (!mountedRef.current) return;
      setError(e.message);
      setMessages([buildGreeting(mood)]);
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  };

  const refreshConversations = async () => {
    try {
      const { conversations: list } = await conversationsApi.list();
      if (mountedRef.current) setConversations(list);
    } catch (e) {}
  };

  const openConversation = async (id) => {
    setHistoryOpen(false);
    setIsLoading(true);
    setError(null);
    try {
      const { messages: stored } = await conversationsApi.get(id);
      if (!mountedRef.current) return;
      setConversationId(id);
      setMessages(stored.length ? stored.map(mapMessage) : [buildGreeting(userMood)]);
    } catch (e) {
      if (mountedRef.current) setError(e.message);
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  };

  const startNewChat = () => {
    setConversationId(null);
    setMessages([buildGreeting(userMood)]);
    setError(null);
    setHistoryOpen(false);
  };

  const openHistory = async () => {
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const { conversations: list } = await conversationsApi.list();
      if (mountedRef.current) setConversations(list);
    } catch (e) {
      if (mountedRef.current) setError(e.message);
    } finally {
      if (mountedRef.current) setHistoryLoading(false);
    }
  };

  const handleDeleteConversation = async (id) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
    try {
      await conversationsApi.remove(id);
      if (!mountedRef.current) return;
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (conversationId === id) startNewChat();
    } catch (e) {
      if (mountedRef.current) setError(e.message);
    }
  };

  const handleSend = async (textToSend) => {
    const content = (textToSend ?? inputText).trim();
    if (!content || isTyping) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}

    const tempId = `temp-${Date.now()}`;
    const optimistic = {
      id: tempId,
      sender: 'user',
      text: content,
      timestamp: nowTime(),
      suggestedActivity: null,
    };

    setMessages((prev) => [...prev, optimistic]);
    setInputText('');
    setIsTyping(true);
    setError(null);

    try {
      const result = await chatApi.send({
        conversationId: conversationId ?? undefined,
        message: content,
        mood: userMood ?? undefined,
      });

      if (!mountedRef.current) return;

      setConversationId(result.conversation.id);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempId),
        mapMessage(result.userMessage),
        { ...mapMessage(result.assistantMessage), affirmation: result.affirmation },
      ]);

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {}

      refreshConversations();
    } catch (e) {
      if (!mountedRef.current) return;
      setError(e.message);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          sender: 'solace',
          text:
            "I couldn't reach my thoughts just now. Please check that the server is running and try again.",
          timestamp: nowTime(),
          suggestedActivity: null,
          isError: true,
        },
      ]);
    } finally {
      if (mountedRef.current) setIsTyping(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isUser = item.sender === 'user';
    return (
      <View
        style={[
          styles.messageBubbleWrapper,
          isUser ? styles.userWrapper : styles.solaceWrapper,
        ]}
      >
        {!isUser ? (
          <View style={styles.miniOrb}>
            <AppIcon name="feather" size={11} color="#FFFBF6" strokeWidth={1.2} />
          </View>
        ) : null}

        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.solaceBubble,
            item.isError && styles.errorBubble,
          ]}
        >
          {!isUser ? <Text style={styles.solaceLabel}>SOLACE</Text> : null}

          <Text style={[styles.messageText, isUser ? styles.userText : styles.solaceText]}>
            {item.text}
          </Text>

          {item.affirmation ? (
            <View style={styles.affirmationCard}>
              <View style={styles.affirmationLabelRow}>
                <AppIcon name="sparkles" size={11} color={TERRACOTTA} strokeWidth={1.5} />
                <Text style={styles.affirmationLabel}>A LITTLE AFFIRMATION</Text>
              </View>
              <Text style={[styles.affirmationText, { fontFamily: serifItalic }]}>
                {item.affirmation}
              </Text>
            </View>
          ) : null}

          {item.suggestedActivity === 'breathing' && (
            <TouchableOpacity
              activeOpacity={0.88}
              style={styles.inlineActivityBtn}
              onPress={onOpenBreathing}
              accessibilityRole="button"
              accessibilityLabel="Start a breathing session"
            >
              <AppIcon name="wind" size={14} color={SAGE} strokeWidth={1.6} />
              <Text style={styles.inlineActivityText}>Two minutes of breathing</Text>
              <AppIcon name="arrowRight" size={13} color={SAGE} strokeWidth={1.8} />
            </TouchableOpacity>
          )}

          <Text
            style={[
              styles.timestamp,
              isUser ? styles.userTimestamp : styles.solaceTimestamp,
            ]}
          >
            {item.timestamp}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#FDF9F3', '#F8F0E8', '#F2E9F4']} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={[styles.orb, styles.orbTop]} />
      <View pointerEvents="none" style={[styles.orb, styles.orbBottom]} />

      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.frame}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={onBack}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Back to Haven"
            >
              <AppIcon name="arrowLeft" size={14} color={TERRACOTTA} strokeWidth={1.8} />
              <Text style={styles.backText}>Haven</Text>
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <LinearGradient
                colors={['#F5D5BE', '#D9C3EC']}
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.85, y: 1 }}
                style={styles.headerOrb}
              >
                <AppIcon name="feather" size={13} color="#FFFBF6" strokeWidth={1.2} />
              </LinearGradient>
              <View>
                <Text style={[styles.headerTitle, { fontFamily: serif }]}>Solace</Text>
                <Text style={styles.headerStatus}>here with you</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.historyBtn}
              onPress={openHistory}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Conversation history"
            >
              <AppIcon name="clock" size={15} color={TERRACOTTA} strokeWidth={1.7} />
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.chatArea}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <View style={styles.loadingLight}>
                  <AppIcon name="feather" size={20} color="#FFFBF6" strokeWidth={1.1} />
                </View>
                <ActivityIndicator color={TERRACOTTA} style={{ marginTop: 18 }} />
                <Text style={styles.loadingText}>Opening a quiet space...</Text>
              </View>
            ) : (
              <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.messageList}
                renderItem={renderMessage}
                onContentSizeChange={() =>
                  flatListRef.current?.scrollToEnd({ animated: true })
                }
              />
            )}

            {isTyping ? (
              <View style={styles.typingRow}>
                <View style={styles.miniOrb}>
                  <AppIcon name="feather" size={11} color="#FFFBF6" strokeWidth={1.2} />
                </View>
                <Text style={[styles.typingText, { fontFamily: serifItalic }]}>
                  Solace is here, thinking gently...
                </Text>
              </View>
            ) : null}

            {messages.length <= 2 && !isLoading ? (
              <View style={styles.quickPrompts}>
                {QUICK_SUGGESTIONS.map((item, idx) => (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.8}
                    style={styles.promptChip}
                    onPress={() => handleSend(item)}
                  >
                    <Text style={styles.promptChipText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            {error ? (
              <TouchableOpacity
                style={styles.errorBanner}
                activeOpacity={0.8}
                onPress={() => setError(null)}
              >
                <Text style={styles.errorBannerText}>{error} (tap to dismiss)</Text>
              </TouchableOpacity>
            ) : null}

            <View style={styles.inputRow}>
              <TextInput
                style={styles.textInput}
                placeholder="Say it however it comes..."
                placeholderTextColor="rgba(42, 32, 51, 0.28)"
                value={inputText}
                onChangeText={setInputText}
                multiline
              />

              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.micButton}
                onPress={() => setVoiceOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Speak instead of typing"
              >
                <AppIcon name="mic" size={17} color={TERRACOTTA} strokeWidth={1.6} />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
                onPress={() => handleSend()}
                disabled={!inputText.trim()}
                accessibilityRole="button"
                accessibilityLabel="Send message"
              >
                <AppIcon name="arrowUp" size={17} color={CREAM} strokeWidth={2.1} />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </SafeAreaView>

      <VoiceListeningModal
        visible={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        onOpenTextChat={() => setVoiceOpen(false)}
      />

      {/* Conversation history sheet */}
      <Modal
        visible={historyOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setHistoryOpen(false)}
      >
        <View style={styles.historyOverlay}>
          <View style={styles.historySheet}>
            <LinearGradient
              colors={['#FDF9F3', '#F8F0E8', '#F1E8F5']}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.grabber} />

            <View style={styles.historyHeader}>
              <View>
                <Text style={styles.historyEyebrow}>KEPT GENTLY</Text>
                <Text style={[styles.historyTitle, { fontFamily: serif }]}>
                  Your conversations
                </Text>
              </View>
              <TouchableOpacity
                style={styles.historyCloseBtn}
                onPress={() => setHistoryOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Close history"
              >
                <AppIcon name="close" size={15} color={SOFT} strokeWidth={1.8} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.newChatBtn}
              onPress={startNewChat}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Start a new conversation"
            >
              <View style={styles.newChatLeft}>
                <AppIcon name="plus" size={14} color={CREAM} strokeWidth={2} />
                <Text style={[styles.newChatText, { fontFamily: serif }]}>
                  Start a new conversation
                </Text>
              </View>
              <View style={styles.newChatCircle}>
                <AppIcon name="arrowRight" size={13} color={CREAM} strokeWidth={1.8} />
              </View>
            </TouchableOpacity>

            {historyLoading ? (
              <View style={styles.historyLoading}>
                <ActivityIndicator color={TERRACOTTA} />
              </View>
            ) : (
              <FlatList
                data={conversations}
                keyExtractor={(item) => String(item.id)}
                ListEmptyComponent={
                  <Text style={[styles.historyEmpty, { fontFamily: serifItalic }]}>
                    Nothing here yet. Say one small thing, and I will keep it for you.
                  </Text>
                }
                contentContainerStyle={{ paddingBottom: 12 }}
                renderItem={({ item }) => (
                  <View
                    style={[
                      styles.historyItem,
                      conversationId === item.id && styles.historyItemActive,
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.historyItemMain}
                      onPress={() => openConversation(item.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.historyItemTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.historyItemMeta} numberOfLines={1}>
                        {item.message_count} message{item.message_count === 1 ? '' : 's'} ·{' '}
                        {formatServerTime(item.updated_at)}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.historyDeleteBtn}
                      onPress={() => handleDeleteConversation(item.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${item.title}`}
                    >
                      <AppIcon name="trash" size={15} color="rgba(42, 32, 51, 0.24)" strokeWidth={1.6} />
                    </TouchableOpacity>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CREAM },
  safeArea: { flex: 1, alignItems: 'center' },
  frame: { width: '100%', maxWidth: 440, flex: 1 },

  orb: { position: 'absolute', borderRadius: 999 },
  orbTop: {
    width: 300,
    height: 300,
    top: -170,
    right: -120,
    backgroundColor: 'rgba(233, 185, 160, 0.18)',
  },
  orbBottom: {
    width: 280,
    height: 280,
    bottom: -150,
    left: -120,
    backgroundColor: 'rgba(196, 167, 232, 0.12)',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(42, 32, 51, 0.06)',
    backgroundColor: 'rgba(253, 249, 243, 0.72)',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 253, 248, 0.68)',
    borderWidth: 1,
    borderColor: 'rgba(176, 102, 74, 0.14)',
  },
  backText: {
    color: TERRACOTTA,
    fontSize: 11.5,
    fontWeight: '700',
    marginLeft: 5,
    letterSpacing: 0.2,
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center' },
  headerOrb: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
    shadowColor: '#B0664A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  headerTitle: { fontSize: 17, lineHeight: 20, color: INK, letterSpacing: -0.2 },
  headerStatus: {
    fontSize: 9.5,
    color: SOFT,
    letterSpacing: 0.4,
    fontStyle: 'italic',
    marginTop: 1,
  },
  historyBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 253, 248, 0.68)',
    borderWidth: 1,
    borderColor: 'rgba(42, 32, 51, 0.06)',
  },

  chatArea: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingLight: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: TERRACOTTA,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.9,
  },
  loadingText: {
    marginTop: 10,
    color: SOFT,
    fontSize: 12,
    fontStyle: 'italic',
    letterSpacing: 0.2,
  },

  messageList: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14 },
  messageBubbleWrapper: { marginVertical: 5, flexDirection: 'row', alignItems: 'flex-start' },
  userWrapper: { justifyContent: 'flex-end' },
  solaceWrapper: { justifyContent: 'flex-start' },
  miniOrb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#D8A78F',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '78%',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: TERRACOTTA,
    borderBottomRightRadius: 6,
    shadowColor: '#B0664A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 2,
  },
  solaceBubble: {
    backgroundColor: 'rgba(255, 253, 248, 0.88)',
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#B0664A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 1,
  },
  errorBubble: { borderColor: 'rgba(176, 102, 74, 0.4)' },
  solaceLabel: {
    fontSize: 7.5,
    letterSpacing: 1.6,
    fontWeight: '700',
    color: 'rgba(42, 32, 51, 0.32)',
    marginBottom: 5,
  },
  messageText: { fontSize: 14.5, lineHeight: 22, letterSpacing: 0.05 },
  userText: { color: '#FFFBF6' },
  solaceText: { color: INK },
  timestamp: { fontSize: 9, marginTop: 6, alignSelf: 'flex-end', letterSpacing: 0.2 },
  userTimestamp: { color: 'rgba(253, 249, 243, 0.6)' },
  solaceTimestamp: { color: FAINT },

  affirmationCard: {
    marginTop: 10,
    backgroundColor: 'rgba(140, 90, 168, 0.06)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderLeftWidth: 2,
    borderLeftColor: LILAC,
  },
  affirmationLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  affirmationLabel: {
    fontSize: 7.5,
    fontWeight: '700',
    color: TERRACOTTA,
    letterSpacing: 1.4,
    marginLeft: 5,
  },
  affirmationText: { fontSize: 14, lineHeight: 21, color: INK },

  inlineActivityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(111, 143, 107, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(111, 143, 107, 0.22)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    marginTop: 10,
  },
  inlineActivityText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: SAGE,
    marginLeft: 7,
    marginRight: 7,
    letterSpacing: 0.2,
  },

  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  typingText: { fontSize: 12.5, color: SOFT, letterSpacing: 0.1 },

  quickPrompts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 18,
    marginBottom: 8,
  },
  promptChip: {
    backgroundColor: 'rgba(255, 253, 248, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(42, 32, 51, 0.08)',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    marginRight: 7,
    marginBottom: 7,
  },
  promptChipText: { fontSize: 11.5, color: MUTED, letterSpacing: 0.1 },

  errorBanner: {
    marginHorizontal: 18,
    marginBottom: 6,
    backgroundColor: 'rgba(176, 102, 74, 0.08)',
    borderRadius: 14,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(176, 102, 74, 0.18)',
  },
  errorBannerText: { color: '#94543D', fontSize: 11.5, fontWeight: '600' },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: 'rgba(253, 249, 243, 0.92)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(42, 32, 51, 0.06)',
  },
  textInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 253, 248, 0.9)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 11,
    fontSize: 14,
    color: INK,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: 'rgba(42, 32, 51, 0.08)',
  },
  micButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    backgroundColor: 'rgba(176, 102, 74, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(176, 102, 74, 0.14)',
  },
  sendButton: {
    backgroundColor: TERRACOTTA,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    shadowColor: '#B0664A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 3,
  },
  sendButtonDisabled: { backgroundColor: 'rgba(176, 102, 74, 0.28)', shadowOpacity: 0 },

  // History sheet
  historyOverlay: {
    flex: 1,
    backgroundColor: 'rgba(42, 32, 51, 0.32)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  historySheet: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '80%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 22,
    overflow: 'hidden',
    shadowColor: '#B0664A',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.14,
    shadowRadius: 26,
    elevation: 12,
  },
  grabber: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(42, 32, 51, 0.12)',
    alignSelf: 'center',
    marginTop: 4,
    marginBottom: 18,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  historyEyebrow: {
    fontSize: 8.5,
    letterSpacing: 2,
    fontWeight: '700',
    color: TERRACOTTA,
    marginBottom: 6,
  },
  historyTitle: { fontSize: 26, lineHeight: 31, color: INK, letterSpacing: -0.4 },
  historyCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 253, 248, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(42, 32, 51, 0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: TERRACOTTA,
    paddingLeft: 20,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 999,
    minHeight: 52,
    marginBottom: 16,
    shadowColor: TERRACOTTA,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 3,
  },
  newChatLeft: { flexDirection: 'row', alignItems: 'center' },
  newChatText: { color: CREAM, fontSize: 15, marginLeft: 9, letterSpacing: 0.2 },
  newChatCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(253, 249, 243, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyLoading: { paddingVertical: 24, alignItems: 'center' },
  historyEmpty: {
    textAlign: 'center',
    color: SOFT,
    fontSize: 13.5,
    paddingVertical: 28,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 253, 248, 0.78)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  historyItemActive: {
    borderColor: 'rgba(176, 102, 74, 0.42)',
    backgroundColor: 'rgba(255, 250, 243, 0.95)',
  },
  historyItemMain: { flex: 1 },
  historyItemTitle: { fontSize: 13.5, fontWeight: '600', color: INK, letterSpacing: 0.1 },
  historyItemMeta: { fontSize: 10.5, color: FAINT, marginTop: 3, letterSpacing: 0.1 },
  historyDeleteBtn: { padding: 6, marginLeft: 8 },
});

