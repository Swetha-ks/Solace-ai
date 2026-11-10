import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import LocalizedText from '../components/LocalizedText';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { chatApi, ensureSession } from '../lib/api';
import {
  useFonts,
  Fraunces_600SemiBold,
  Fraunces_600SemiBold_Italic,
} from '@expo-google-fonts/fraunces';
import AppIcon from './AppIcon';

const INK = '#2A2033';
const MUTED = 'rgba(42, 32, 51, 0.62)';
const SOFT = 'rgba(42, 32, 51, 0.42)';
const CREAM = '#FDF9F3';
const TERRACOTTA = '#B0664A';
const LILAC = '#8C5AA8';

export default function VoiceListeningModal({ visible, onClose, onOpenTextChat }) {
  const [fontsLoaded] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_600SemiBold_Italic,
  });

  const serif = fontsLoaded ? 'Fraunces_600SemiBold' : 'Georgia, "Times New Roman", serif';
  const serifItalic = fontsLoaded
    ? 'Fraunces_600SemiBold_Italic'
    : 'Georgia, "Times New Roman", serif';

  const [isRecording, setIsRecording] = useState(false);
  const [spokenText, setSpokenText] = useState('');
  const [aiSpokenReply, setAiSpokenReply] = useState('');
  const [statusText, setStatusText] = useState('');

  const glowAnim = useRef(new Animated.Value(0.4)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const recognitionRef = useRef(null);
  const dialogueRef = useRef(null);

  const bars = useRef([0, 1, 2, 3, 4].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 0.85, duration: 2200, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.35, duration: 2200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // A wider, slower pulse while the app is actually listening.
  useEffect(() => {
    if (!isRecording) {
      pulseAnim.setValue(0);
      return undefined;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isRecording]);

  // The little waveform only moves while we are actually listening.
  useEffect(() => {
    const loops = bars.map((value, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, {
            toValue: 1,
            duration: 420 + i * 70,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 380 + i * 60,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      )
    );

    if (isRecording) {
      bars.forEach((value) => value.setValue(Math.random()));
      loops.forEach((loop) => loop.start());
    } else {
      loops.forEach((loop) => loop.stop());
      bars.forEach((value) => value.setValue(0));
    }

    return () => loops.forEach((loop) => loop.stop());
  }, [isRecording]);

  // Real speech recognition: the phone's own recognizer on a device, the browser
  // engine on web. If a device cannot listen we say so, instead of inventing words.
  const isWeb = Platform.OS === 'web';
  const nativeRecognition = useRef(null);
  const finalTranscript = useRef('');
  const heardSomething = useRef(false);
  const errored = useRef(false);
  const conversationId = useRef(null);
  const processVoiceRef = useRef(null);

  const getNativeRecognition = () => {
    if (isWeb) return null;
    if (nativeRecognition.current) return nativeRecognition.current;
    try {
      const mod = require('expo-speech-recognition');
      nativeRecognition.current = mod.ExpoSpeechRecognitionModule || null;
    } catch (e) {
      nativeRecognition.current = null;
    }
    return nativeRecognition.current;
  };

  const speakReply = (reply) => {
    try {
      Speech.stop();
      Speech.speak(reply, {
        rate: 0.92,
        pitch: 1.02,
        onDone: () => setStatusText(''),
        onStopped: () => setStatusText(''),
        onError: () => setStatusText(''),
      });
    } catch (e) {
      setStatusText('');
    }
  };

  const processVoice = async (text) => {
    const message = (text || '').trim();
    if (!message) {
      setStatusText('I did not catch that. Tap once more and speak.');
      return;
    }

    setStatusText('Holding what you said...');

    try {
      await ensureSession();
      const data = await chatApi.send({
        message,
        ...(conversationId.current ? { conversationId: conversationId.current } : {}),
      });

      if (data?.conversation?.id) conversationId.current = data.conversation.id;

      const reply = data?.assistantMessage?.content || data?.reply || '';
      if (!reply) throw new Error('No reply');

      setAiSpokenReply(reply);
      setStatusText('Speaking to you with care...');

      setTimeout(() => {
        if (dialogueRef.current) dialogueRef.current.scrollToEnd({ animated: true });
      }, 140);

      speakReply(reply);

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {}
    } catch (e) {
      setStatusText('I could not reach my own thoughts just now. Try once more, or open the chat.');
    }
  };

  processVoiceRef.current = processVoice;

  // Native listener lifecycle. Registered once, removed when the sheet unmounts.
  useEffect(() => {
    const module = getNativeRecognition();
    if (!module || !module.addListener) return undefined;

    const onResult = (event) => {
      const text = event?.results?.[0]?.transcript || '';
      if (text) {
        finalTranscript.current = text;
        heardSomething.current = true;
        setSpokenText(text);
      }
    };

    const onEnd = () => {
      setIsRecording(false);
      if (errored.current) return;

      const text = finalTranscript.current;
      finalTranscript.current = '';

      if (text.trim()) processVoiceRef.current?.(text);
      else setStatusText('I did not hear anything. Tap once more and speak.');
    };

    const onError = (event) => {
      errored.current = true;
      setIsRecording(false);

      const code = event?.error;
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        setStatusText('I need microphone permission before I can hear you.');
      } else if (code === 'no-speech') {
        setStatusText('I did not hear anything. Tap once more and speak.');
      } else {
        setStatusText('I could not hear you just then. Let us try again.');
      }
    };

    const subscriptions = [
      module.addListener('result', onResult),
      module.addListener('end', onEnd),
      module.addListener('error', onError),
    ];

    return () => {
      subscriptions.forEach((sub) => {
        if (sub && sub.remove) sub.remove();
      });
    };
  }, []);

  const startListening = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}

    try {
      await Speech.stop();
    } catch (e) {}

    finalTranscript.current = '';
    heardSomething.current = false;
    errored.current = false;
    setIsRecording(true);
    setSpokenText('');
    setAiSpokenReply('');
    setStatusText('Listening, gently...');

    if (isWeb) {
      const supportsSpeech =
        typeof window !== 'undefined' &&
        ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

      if (!supportsSpeech) {
        setIsRecording(false);
        setStatusText('This browser cannot listen. Try Chrome, or write to me instead.');
        return;
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      let finalText = '';

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((r) => r[0].transcript)
          .join(' ')
          .trim();
        if (transcript) {
          finalText = transcript;
          heardSomething.current = true;
          setSpokenText(transcript);
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
        if (errored.current) return;
        if (finalText.trim()) processVoice(finalText);
        else setStatusText('I did not hear anything. Tap once more and speak.');
      };

      recognition.onerror = (event) => {
        errored.current = true;
        setIsRecording(false);
        if (event.error === 'not-allowed') {
          setStatusText('I need microphone permission before I can hear you.');
        } else if (event.error === 'no-speech') {
          setStatusText('I did not hear anything. Tap once more and speak.');
        } else {
          setStatusText('I could not hear you just then. Let us try again.');
        }
      };

      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch (err) {
        setIsRecording(false);
        setStatusText('I could not start listening. Please try again.');
      }
      return;
    }

    const module = getNativeRecognition();
    if (!module) {
      setIsRecording(false);
      setStatusText('Voice is not available in this build. You can write to me instead.');
      return;
    }

    try {
      const permission = await module.requestPermissionsAsync();
      if (!permission?.granted) {
        setIsRecording(false);
        setStatusText('I need microphone permission before I can hear you.');
        return;
      }

      module.start({
        lang: 'en-US',
        interimResults: true,
        continuous: false,
        addsPunctuation: true,
        volumeChangeEventOptions: { enabled: true, intervalMillis: 160 },
      });
    } catch (e) {
      setIsRecording(false);
      setStatusText('I could not start listening. Please try again.');
    }
  };

  const stopListening = () => {
    if (isWeb) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    } else {
      const module = getNativeRecognition();
      if (module) {
        try {
          module.stop();
        } catch (e) {}
      }
    }
    setIsRecording(false);
    if (!heardSomething.current && !spokenText) {
      setStatusText('I did not catch that. Tap and try once more.');
    }
  };

  const handleClose = () => {
    try {
      Speech.stop();
    } catch (e) {}

    if (isWeb) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    } else {
      const module = getNativeRecognition();
      if (module) {
        try {
          module.abort();
        } catch (e) {}
      }
    }

    setIsRecording(false);
    onClose();
  };

  const hasDialogue = spokenText !== '' || aiSpokenReply !== '';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.sheetContainer}>
          <LinearGradient
            colors={['#FDF9F3', '#F8F0E8', '#F1E8F5']}
            style={StyleSheet.absoluteFill}
          />

          <View pointerEvents="none" style={[styles.orb, styles.orbTop]} />
          <View pointerEvents="none" style={[styles.orb, styles.orbBottom]} />

          <View style={styles.grabber} />

          <TouchableOpacity
            style={styles.closeBtn}
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <AppIcon name="close" size={15} color={SOFT} strokeWidth={1.8} />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.headerBadgeRow}>
              <AppIcon name="ear" size={11} color={TERRACOTTA} strokeWidth={1.8} />
              <LocalizedText style={styles.headerBadge}>
                {isRecording ? 'I AM RIGHT HERE' : 'HERE TO LISTEN'}
              </LocalizedText>
            </View>
            <LocalizedText style={[styles.headerTitle, { fontFamily: serif }]}>
              {isRecording
                ? 'I’m listening,'
                : hasDialogue
                ? 'I heard you,'
                : 'Say it out loud,'}
            </LocalizedText>
            <LocalizedText style={[styles.headerTitleAccent, { fontFamily: serifItalic }]}>
              {isRecording
                ? 'take your time.'
                : hasDialogue
                ? 'and I’m still here.'
                : 'slowly.'}
            </LocalizedText>
            <LocalizedText style={styles.headerSubtitle}>
              {isRecording
                ? 'You can pause. I will wait.'
                : hasDialogue
                ? 'Nothing you said scared me away.'
                : 'No rush. However it comes is fine.'}
            </LocalizedText>
          </View>

          <View style={[styles.lightStage, hasDialogue && styles.lightStageCompact]}>
            <View
              style={[styles.stageInner, hasDialogue && styles.stageInnerCompact]}
            >
              <Animated.View
                style={[
                  styles.outerRing,
                  isRecording
                    ? {
                        opacity: pulseAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.5, 0.12],
                        }),
                        transform: [
                          {
                            scale: pulseAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [1, 1.3],
                            }),
                          },
                        ],
                      }
                    : { opacity: glowAnim },
                ]}
              />
              <View style={styles.innerRing} />
              <LinearGradient
                colors={isRecording ? ['#C98A6B', '#A4749A'] : ['#F5D5BE', '#D9C3EC']}
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.85, y: 1 }}
                style={styles.micDisc}
              >
                <AppIcon
                  name={isRecording ? 'ear' : 'mic'}
                  size={30}
                  color="#FFFBF6"
                  strokeWidth={1.2}
                />
              </LinearGradient>
            </View>
          </View>

          {isRecording ? (
            <View style={styles.waveRow}>
              {bars.map((value, i) => (
                <Animated.View
                  key={i}
                  style={[
                    styles.waveBar,
                    {
                      height: value.interpolate({ inputRange: [0, 1], outputRange: [6, 26] }),
                      opacity: value.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.9] }),
                    },
                  ]}
                />
              ))}
            </View>
          ) : null}

          <LocalizedText style={styles.statusIndicator} numberOfLines={1}>
            {statusText}
          </LocalizedText>
          <ScrollView
            style={styles.dialogueArea}
            contentContainerStyle={styles.dialogueContent}
            showsVerticalScrollIndicator={false}
          >
            {spokenText !== '' && (
              <View style={styles.userBubble}>
                <LocalizedText style={styles.bubbleLabel}>YOU SAID</LocalizedText>
                <LocalizedText style={styles.userBubbleText}>{spokenText}</LocalizedText>
              </View>
            )}

            {aiSpokenReply !== '' && (
              <View style={styles.solaceBubble}>
                <LocalizedText style={styles.bubbleLabelSolace}>SOLACE</LocalizedText>
                <LocalizedText style={[styles.solaceBubbleText, { fontFamily: serifItalic }]}>
                  {aiSpokenReply}
                </LocalizedText>
              </View>
            )}

            {!hasDialogue && (
              <LocalizedText style={[styles.dialogueHint, { fontFamily: serifItalic }]}>
                Whatever is sitting heavy, you can say it here.
              </LocalizedText>
            )}
          </ScrollView>

          <View style={styles.bottomControls}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.voiceTapBtn}
              onPress={isRecording ? stopListening : startListening}
              accessibilityRole="button"
              accessibilityLabel={isRecording ? 'Stop listening' : 'Tap to speak out loud'}
            >
              <View style={styles.voiceTapLeft}>
                <AppIcon
                  name={isRecording ? 'ear' : 'mic'}
                  size={18}
                  color={CREAM}
                  strokeWidth={1.7}
                />
                <LocalizedText style={[styles.voiceTapText, { fontFamily: serif }]}>
                  {isRecording ? 'Listening' : hasDialogue ? 'Say more' : 'Tap to speak'}
                </LocalizedText>
              </View>
              <View style={styles.voiceTapCircle}>
                <AppIcon
                  name={isRecording ? 'pause' : 'arrowRight'}
                  size={isRecording ? 13 : 15}
                  color={CREAM}
                  strokeWidth={1.8}
                />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.whisperOption}
              onPress={() => {
                handleClose();
                onOpenTextChat();
              }}
              accessibilityRole="button"
              accessibilityLabel="Open the chat instead"
            >
              <AppIcon name="pen" size={12} color={SOFT} strokeWidth={1.6} />
              <LocalizedText style={styles.whisperText}>Prefer to write? Open the chat</LocalizedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(42, 32, 51, 0.32)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheetContainer: {
    width: '100%',
    maxWidth: 440,
    height: '90%',
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    paddingHorizontal: 26,
    paddingTop: 10,
    paddingBottom: 24,
    alignItems: 'center',
    justifyContent: 'flex-start',
    overflow: 'hidden',
    shadowColor: '#B0664A',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.14,
    shadowRadius: 26,
    elevation: 12,
  },
  orb: { position: 'absolute', borderRadius: 999 },
  orbTop: {
    width: 300,
    height: 300,
    top: -150,
    right: -120,
    backgroundColor: 'rgba(233, 185, 160, 0.22)',
  },
  orbBottom: {
    width: 300,
    height: 300,
    bottom: -160,
    left: -130,
    backgroundColor: 'rgba(196, 167, 232, 0.16)',
  },
  grabber: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(42, 32, 51, 0.12)',
    marginTop: 4,
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 20,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(42, 32, 51, 0.07)',
    zIndex: 2,
  },

  header: { alignItems: 'center', marginTop: 14 },
  headerBadgeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  headerBadge: {
    fontSize: 9.5,
    fontWeight: '700',
    color: TERRACOTTA,
    letterSpacing: 2.2,
    marginLeft: 7,
  },
  headerTitle: {
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.6,
    color: INK,
    textAlign: 'center',
  },
  headerTitleAccent: {
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.6,
    color: LILAC,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 12.5,
    color: SOFT,
    marginTop: 8,
    textAlign: 'center',
    letterSpacing: 0.1,
  },

  lightStage: {
    width: '100%',
    height: 194,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  lightStageCompact: { height: 108 },
  stageInner: {
    width: 190,
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageInnerCompact: { transform: [{ scale: 0.55 }] },
  outerRing: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(233, 185, 160, 0.30)',
  },
  innerRing: {
    position: 'absolute',
    width: 132,
    height: 132,
    borderRadius: 66,
    borderWidth: 1,
    borderColor: 'rgba(140, 90, 168, 0.16)',
  },
  micDisc: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#B0664A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 4,
  },

  waveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 30,
    marginTop: -2,
  },
  waveBar: {
    width: 4,
    borderRadius: 2,
    marginHorizontal: 3,
    backgroundColor: TERRACOTTA,
  },

  statusIndicator: {
    fontSize: 12,
    lineHeight: 16,
    height: 16,
    color: SOFT,
    fontStyle: 'italic',
    textAlign: 'center',
    letterSpacing: 0.2,
    marginTop: 6,
    marginBottom: 4,
  },

  dialogueArea: {
    width: '100%',
    flexGrow: 1,
    flexShrink: 1,
    marginVertical: 8,
  },
  dialogueContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 2,
  },
  dialogueHint: {
    fontSize: 14.5,
    lineHeight: 22,
    color: 'rgba(42, 32, 51, 0.32)',
    textAlign: 'center',
    letterSpacing: -0.1,
    paddingHorizontal: 12,
  },

  userBubble: {
    backgroundColor: 'rgba(255, 253, 248, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(42, 32, 51, 0.06)',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 18,
    width: '100%',
    marginBottom: 8,
  },
  bubbleLabel: {
    fontSize: 8.5,
    fontWeight: '700',
    letterSpacing: 1.6,
    color: SOFT,
    marginBottom: 4,
  },
  userBubbleText: {
    fontSize: 13.5,
    color: INK,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  solaceBubble: {
    backgroundColor: 'rgba(140, 90, 168, 0.07)',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(140, 90, 168, 0.12)',
  },
  bubbleLabelSolace: {
    fontSize: 8.5,
    fontWeight: '700',
    letterSpacing: 1.6,
    color: LILAC,
    marginBottom: 5,
  },
  solaceBubbleText: {
    fontSize: 15,
    color: INK,
    lineHeight: 23,
    letterSpacing: -0.1,
  },

  bottomControls: { width: '100%', alignItems: 'center' },
  voiceTapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: TERRACOTTA,
    paddingLeft: 22,
    paddingRight: 7,
    paddingVertical: 7,
    borderRadius: 999,
    width: '100%',
    minHeight: 56,
    shadowColor: TERRACOTTA,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 5,
  },
  voiceTapLeft: { flexDirection: 'row', alignItems: 'center' },
  voiceTapText: {
    color: CREAM,
    fontSize: 16.5,
    letterSpacing: 0.2,
    marginLeft: 10,
  },
  voiceTapCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(253, 249, 243, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  whisperOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  whisperText: {
    fontSize: 11.5,
    color: SOFT,
    marginLeft: 7,
    letterSpacing: 0.1,
  },
});
