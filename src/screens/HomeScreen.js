import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Easing,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import {
  useFonts,
  Fraunces_600SemiBold,
  Fraunces_600SemiBold_Italic,
} from '@expo-google-fonts/fraunces';
import VoiceListeningModal from '../components/VoiceListeningModal';
import AppIcon from '../components/AppIcon';
import { ensureSession, insightsApi, moodsApi } from '../lib/api';

const INK = '#2A2033';
const MUTED = 'rgba(42, 32, 51, 0.62)';
const SOFT = 'rgba(42, 32, 51, 0.42)';
const CREAM = '#FDF9F3';
const TERRACOTTA = '#B0664A';
const LILAC = '#8C5AA8';
const SAGE = '#6F8F6B';

const MOODS = [
  {
    id: 'joyful',
    icon: 'sun',
    label: 'Joyful',
    gradient: ['#FDF0CE', '#F4DCA6'],
    accent: '#B0703C',
    title: 'Let this stay a little longer.',
    body: 'Tell me what made today feel light. Saying it out loud helps it last.',
    action: 'talk',
    actionLabel: 'Share it with Solace',
    secondary: 'breathe',
    secondaryLabel: 'Or just breathe',
  },
  {
    id: 'calm',
    icon: 'leaf',
    label: 'Calm',
    gradient: ['#E7F0E3', '#CFE2C9'],
    accent: '#5F7D59',
    title: 'Stay here a while.',
    body: 'Two quiet minutes can keep this softness with you a little longer.',
    action: 'breathe',
    actionLabel: 'Breathe with me',
    secondary: 'talk',
    secondaryLabel: 'Or tell me about it',
  },
  {
    id: 'okay',
    icon: 'cloud',
    label: 'Okay',
    gradient: ['#E9EFF8', '#D5E0F1'],
    accent: '#5C719C',
    title: 'Okay is a real place.',
    body: 'You do not have to feel more than you do. One honest line is enough.',
    action: 'talk',
    actionLabel: 'Say one small thing',
    secondary: 'breathe',
    secondaryLabel: 'Or sit with your breath',
  },
  {
    id: 'tired',
    icon: 'moon',
    label: 'Tired',
    gradient: ['#EFE8F7', '#DCCFEE'],
    accent: '#8C5AA8',
    title: 'Rest is allowed.',
    body: 'Let your shoulders drop. Two slow minutes, then let yourself stop.',
    action: 'breathe',
    actionLabel: 'Two minutes of rest',
    secondary: 'talk',
    secondaryLabel: 'Or say what is heavy',
  },
  {
    id: 'anxious',
    icon: 'rain',
    label: 'Anxious',
    gradient: ['#F8E9E4', '#EFD4CB'],
    accent: '#B0664A',
    title: 'Let us slow this down.',
    body: 'Breathe out a little longer than you breathe in. I am right here with you.',
    action: 'breathe',
    actionLabel: 'Slow it down together',
    secondary: 'talk',
    secondaryLabel: 'Or talk it out',
  },
];

function greetingForHour(hour) {
  if (hour < 5) return 'Still awake';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/** Seven gentle markers for the streak sheet, oldest first. */
function buildWeek(weekMoods) {
  const marks = [];

  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - i);

    const iso = d.toISOString().slice(0, 10);
    const hit = (weekMoods || []).find((entry) => entry.date === iso);

    marks.push({
      iso,
      mood: hit?.mood || null,
      letter: d.toLocaleDateString('en-GB', { weekday: 'narrow', timeZone: 'UTC' }),
    });
  }

  return marks;
}

const HABITS = [
  { id: 'water', title: 'Drink a glass of water', sub: 'Before anything else.' },
  { id: 'outside', title: 'Step outside for five minutes', sub: 'A little light on your face.' },
  { id: 'line', title: 'Write one honest line', sub: 'No one else has to read it.' },
];

const WIND_DOWN_STEPS = [
  { id: 'lights', title: 'Lower the lights', sub: 'Let your eyes soften with the room.' },
  { id: 'phone', title: 'Put the phone out of reach', sub: 'Just for the next few minutes.' },
  { id: 'good', title: 'Name one good thing', sub: 'However small it was.' },
  { id: 'enough', title: 'Let the day be enough', sub: 'You do not have to finish anything else.' },
];

const GROUNDING_STEPS = [
  { count: '5', sense: 'things you can see', hint: 'Let your eyes move slowly around the room.' },
  { count: '4', sense: 'things you can touch', hint: 'The chair, your sleeve, the air on your skin.' },
  { count: '3', sense: 'things you can hear', hint: 'Near sounds first, then far ones.' },
  { count: '2', sense: 'things you can smell', hint: 'Or two smells you love.' },
  { count: '1', sense: 'thing you can taste', hint: 'Even the last sip of water.' },
];

const DAILY_QUESTIONS = [
  'What is one thing you needed today that you did not ask for?',
  'Where in your body are you holding the day?',
  'What would you say to a friend who felt the way you feel now?',
  'What is one small thing that went right today?',
  'What are you ready to put down for tonight?',
  'Who or what made you feel a little less alone this week?',
  'What does rest look like for you right now?',
];

function CompanionLight({ onPress, size = 62 }) {
  const breath = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1,
          duration: 3600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breath, {
          toValue: 0,
          duration: 3600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const haloScale = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
  const haloOpacity = breath.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.34] });

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Speak with Solace"
      style={[styles.lightWrap, { width: size + 26, height: size + 26 }]}
    >
      <Animated.View
        style={[
          styles.lightHalo,
          {
            width: size + 26,
            height: size + 26,
            borderRadius: (size + 26) / 2,
            opacity: haloOpacity,
            transform: [{ scale: haloScale }],
          },
        ]}
      />
      <LinearGradient
        colors={['#F5D5BE', '#D9C3EC']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AppIcon name="feather" size={22} color="#FFFBF6" strokeWidth={1.1} />
      </LinearGradient>
    </TouchableOpacity>
  );
}

export default function HomeScreen({ onOpenChat, onOpenBreathing }) {
  const [fontsLoaded] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_600SemiBold_Italic,
  });

  const serif = fontsLoaded ? 'Fraunces_600SemiBold' : 'Georgia, "Times New Roman", serif';
  const serifItalic = fontsLoaded
    ? 'Fraunces_600SemiBold_Italic'
    : 'Georgia, "Times New Roman", serif';

  const [selectedMood, setSelectedMood] = useState(null);
  const [streak, setStreak] = useState(0);
  const [weekMoods, setWeekMoods] = useState([]);
  const [streakOpen, setStreakOpen] = useState(false);
  const [affirmation, setAffirmation] = useState('');
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [habitsOpen, setHabitsOpen] = useState(false);
  const [habitsDone, setHabitsDone] = useState([]);

  // Private journal, gratitude, wind-down and grounding all keep their own state.
  const [journalOpen, setJournalOpen] = useState(false);
  const [journalPrompt, setJournalPrompt] = useState('');
  const [journalText, setJournalText] = useState('');
  const [journalEntries, setJournalEntries] = useState([]);
  const [journalNote, setJournalNote] = useState('');

  const [gratitudeOpen, setGratitudeOpen] = useState(false);
  const [gratitudeText, setGratitudeText] = useState('');
  const [gratitudeEntries, setGratitudeEntries] = useState([]);
  const [gratitudeNote, setGratitudeNote] = useState('');

  const [windDownOpen, setWindDownOpen] = useState(false);
  const [windDownDone, setWindDownDone] = useState([]);

  const [groundingOpen, setGroundingOpen] = useState(false);
  const [groundStep, setGroundStep] = useState(0);

  const reveal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(reveal, {
      toValue: 1,
      duration: 820,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  const rise = {
    opacity: reveal,
    transform: [
      {
        translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }),
      },
    ],
  };

  useEffect(() => {
    loadSavedData();
  }, []);

  const loadSavedData = async () => {
    try {
      const savedMood = await AsyncStorage.getItem('@solace_today_mood');
      const savedMoodDate = await AsyncStorage.getItem('@solace_mood_date');
      if (savedMood && savedMoodDate === todayKey()) setSelectedMood(savedMood);
    } catch (e) {}

    try {
      const rawHabits = await AsyncStorage.getItem('@solace_habits');
      if (rawHabits) {
        const saved = JSON.parse(rawHabits);
        setHabitsDone(saved.date === todayKey() ? saved.done || [] : []);
      }
    } catch (e) {}

    try {
      const rawJournal = await AsyncStorage.getItem('@solace_journal');
      if (rawJournal) {
        const saved = JSON.parse(rawJournal);
        setJournalEntries(Array.isArray(saved) ? saved : []);
      }
    } catch (e) {}

    try {
      const rawGratitude = await AsyncStorage.getItem('@solace_gratitude');
      if (rawGratitude) {
        const saved = JSON.parse(rawGratitude);
        setGratitudeEntries(Array.isArray(saved) ? saved : []);
      }
    } catch (e) {}

    try {
      const rawWindDown = await AsyncStorage.getItem('@solace_winddown');
      if (rawWindDown) {
        const saved = JSON.parse(rawWindDown);
        setWindDownDone(saved.date === todayKey() ? saved.done || [] : []);
      }
    } catch (e) {}

    try {
      await ensureSession();
      const insights = await insightsApi.get();
      setStreak(insights.streak ?? 0);
      setWeekMoods(Array.isArray(insights.last7Days) ? insights.last7Days : []);
      setAffirmation(insights.affirmation ?? '');
      try {
        await AsyncStorage.setItem('@solace_streak', String(insights.streak ?? 0));
      } catch (e) {}
    } catch (e) {
      try {
        const savedStreak = await AsyncStorage.getItem('@solace_streak');
        if (savedStreak) setStreak(parseInt(savedStreak, 10));
      } catch (err) {}
    }

    try {
      const today = await moodsApi.today();
      if (today.mood?.mood) setSelectedMood(today.mood.mood);
    } catch (e) {}
  };

  const handleSelectMood = async (moodId) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
    setSelectedMood(moodId);
    try {
      await AsyncStorage.setItem('@solace_today_mood', moodId);
      await AsyncStorage.setItem('@solace_mood_date', todayKey());
    } catch (e) {}

    try {
      await ensureSession();
      await moodsApi.save(moodId);
      const insights = await insightsApi.get();
      setStreak(insights.streak ?? 0);
      setWeekMoods(Array.isArray(insights.last7Days) ? insights.last7Days : []);
      setAffirmation(insights.affirmation ?? '');
      try {
        await AsyncStorage.setItem('@solace_streak', String(insights.streak ?? 0));
      } catch (e) {}
    } catch (e) {}
  };

  const toggleHabit = (habitId) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}

    setHabitsDone((prev) => {
      const next = prev.includes(habitId)
        ? prev.filter((id) => id !== habitId)
        : [...prev, habitId];

      try {
        AsyncStorage.setItem(
          '@solace_habits',
          JSON.stringify({ date: todayKey(), done: next })
        );
      } catch (e) {}

      return next;
    });
  };

  const keptHabits = HABITS.filter((h) => habitsDone.includes(h.id)).length;
  const activeMood = MOODS.find((m) => m.id === selectedMood) || null;
  const dailyQuestion = DAILY_QUESTIONS[new Date().getDate() % DAILY_QUESTIONS.length];
  const keptWindDown = WIND_DOWN_STEPS.filter((s) => windDownDone.includes(s.id)).length;
  const todayJournalEntry = journalEntries.find((entry) => entry.date === todayKey());

  const openJournal = (prompt = '') => {
    setJournalPrompt(prompt);
    setJournalText('');
    setJournalNote('');
    setJournalOpen(true);
  };

  const saveJournal = async () => {
    const text = journalText.trim();
    if (!text) {
      setJournalNote('Even one honest line is enough.');
      return;
    }

    const entry = { date: todayKey(), prompt: journalPrompt, text };
    const next = [entry, ...journalEntries].slice(0, 80);

    setJournalEntries(next);
    setJournalText('');
    setJournalNote('Saved privately on this device.');

    try {
      await AsyncStorage.setItem('@solace_journal', JSON.stringify(next));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {}
  };

  const saveGratitude = async () => {
    const text = gratitudeText.trim();
    if (!text) {
      setGratitudeNote('One small thing. It does not have to be big.');
      return;
    }

    const entry = { date: todayKey(), text };
    const next = [entry, ...gratitudeEntries].slice(0, 120);

    setGratitudeEntries(next);
    setGratitudeText('');
    setGratitudeNote('Added to your jar.');

    try {
      await AsyncStorage.setItem('@solace_gratitude', JSON.stringify(next));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {}
  };

  const toggleWindDown = (stepId) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}

    setWindDownDone((prev) => {
      const next = prev.includes(stepId)
        ? prev.filter((id) => id !== stepId)
        : [...prev, stepId];

      try {
        AsyncStorage.setItem(
          '@solace_winddown',
          JSON.stringify({ date: todayKey(), done: next })
        );
      } catch (e) {}

      return next;
    });
  };

  const openGrounding = () => {
    setGroundStep(0);
    setGroundingOpen(true);
  };

  const runMoodAction = (action) => {
    if (action === 'breathe') onOpenBreathing();
    else onOpenChat();
  };

  const now = new Date();
  const week = buildWeek(weekMoods);
  const moodAccent = (id) => MOODS.find((m) => m.id === id)?.accent || 'rgba(42, 32, 51, 0.14)';
  const dateLine = now
    .toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
    .toUpperCase();

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#FDF9F3', '#F8F0E8', '#F2E9F4']}
        style={StyleSheet.absoluteFill}
      />

      <View pointerEvents="none" style={[styles.orb, styles.orbTop]} />
      <View pointerEvents="none" style={[styles.orb, styles.orbBottom]} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.mobilePhoneFrame}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Quiet header */}
            <View style={styles.topBar}>
              <View style={styles.brandRow}>
                <Text style={styles.wordmark}>SOLACE</Text>
                <View style={styles.topRule} />
                <Text style={styles.topNote}>a quiet place</Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.streakPill}
                onPress={() => setStreakOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Your gentle streak"
              >
                <AppIcon name="streak" size={11} color={TERRACOTTA} strokeWidth={1.6} />
                <Text style={styles.streakText}>
                  {streak > 0
                    ? streak === 1
                      ? 'Day 1'
                      : `${streak} days`
                    : 'A new start'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Greeting */}
            <Animated.View style={[styles.hero, rise]}>
              <Text style={styles.eyebrow}>{dateLine}</Text>
              <Text style={[styles.title, { fontFamily: serif }]}>
                {greetingForHour(now.getHours())},
              </Text>
              <Text style={[styles.titleAccent, { fontFamily: serifItalic }]}>friend.</Text>
              <Text style={styles.subtitle}>
                However today went, you don’t have to hold it on your own.
              </Text>
            </Animated.View>

            {/* A note from Solace */}
            <Animated.View style={[styles.noteCard, rise]}>
              <CompanionLight onPress={() => setIsVoiceModalOpen(true)} />

              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.noteBody}
                onPress={onOpenChat}
                accessibilityRole="button"
                accessibilityLabel="Talk with Solace"
              >
                <Text style={styles.noteEyebrow}>A NOTE FROM SOLACE</Text>
                <Text style={[styles.noteText, { fontFamily: serifItalic }]}>
                  I’m here, with no rush. Tell me what today felt like — or we can just
                  sit in the quiet together.
                </Text>

                <View style={styles.noteActionRow}>
                  <Text style={styles.noteAction}>Start a conversation</Text>
                  <AppIcon name="arrowRight" size={14} color={TERRACOTTA} strokeWidth={1.8} />
                </View>
              </TouchableOpacity>
            </Animated.View>

            <Text style={styles.noteCaption}>Tap the light to speak instead of typing.</Text>

            {/* Mood check-in */}
            <Animated.View style={[styles.section, rise]}>
              <View style={styles.sectionHead}>
                <View>
                  <Text style={[styles.sectionTitle, { fontFamily: serif }]}>
                    How is your heart?
                  </Text>
                  <Text style={styles.sectionSub}>One honest tap. That’s all this asks.</Text>
                </View>
                <Text style={styles.sectionAside}>
                  {selectedMood ? 'Saved for today' : 'Not checked in yet'}
                </Text>
              </View>

              <View style={styles.moodRow}>
                {MOODS.map((m) => {
                  const isSelected = selectedMood === m.id;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      activeOpacity={0.85}
                      style={styles.moodItem}
                      onPress={() => handleSelectMood(m.id)}
                      accessibilityRole="button"
                      accessibilityLabel={m.label}
                      accessibilityState={{ selected: isSelected }}
                    >
                      <View
                        style={[
                          styles.moodOrbWrap,
                          isSelected && { borderColor: m.accent },
                        ]}
                      >
                        <LinearGradient
                          colors={m.gradient}
                          start={{ x: 0.2, y: 0 }}
                          end={{ x: 0.85, y: 1 }}
                          style={styles.moodOrb}
                        >
                          <AppIcon name={m.icon} size={20} color={m.accent} strokeWidth={1.5} />
                        </LinearGradient>
                      </View>
                      <Text
                        style={[
                          styles.moodLabel,
                          isSelected && { color: m.accent, fontWeight: '700' },
                        ]}
                      >
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {activeMood ? (
                <View
                  style={[styles.moodSuggestion, { borderLeftColor: activeMood.accent }]}
                >
                  <View style={styles.moodSuggestionTop}>
                    <View
                      style={[
                        styles.moodSuggestionIcon,
                        { backgroundColor: `${activeMood.accent}18` },
                      ]}
                    >
                      <AppIcon
                        name={activeMood.icon}
                        size={14}
                        color={activeMood.accent}
                        strokeWidth={1.6}
                      />
                    </View>
                    <Text
                      style={[styles.moodSuggestionEyebrow, { color: activeMood.accent }]}
                    >
                      A GENTLE NEXT STEP
                    </Text>
                  </View>

                  <Text style={[styles.moodSuggestionTitle, { fontFamily: serif }]}>
                    {activeMood.title}
                  </Text>
                  <Text style={styles.moodSuggestionBody}>{activeMood.body}</Text>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={styles.moodSuggestionPrimary}
                    onPress={() => runMoodAction(activeMood.action)}
                    accessibilityRole="button"
                    accessibilityLabel={activeMood.actionLabel}
                  >
                    <Text style={[styles.moodSuggestionPrimaryText, { fontFamily: serif }]}>
                      {activeMood.actionLabel}
                    </Text>
                    <View style={styles.moodSuggestionCircle}>
                      <AppIcon name="arrowRight" size={13} color={CREAM} strokeWidth={1.8} />
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={styles.moodSuggestionSecondaryBtn}
                    onPress={() => runMoodAction(activeMood.secondary)}
                    accessibilityRole="button"
                    accessibilityLabel={activeMood.secondaryLabel}
                  >
                    <Text style={styles.moodSuggestionSecondary}>
                      {activeMood.secondaryLabel}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </Animated.View>

            {/* Today's affirmation */}
            {affirmation ? (
              <Animated.View style={[styles.affirmationWrap, rise]}>
                <LinearGradient
                  colors={['#FAE9DB', '#F4DDEA', '#ECE2F6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.affirmationCard}
                >
                  <View pointerEvents="none" style={styles.affirmationGlow} />
                  <View pointerEvents="none" style={styles.affirmationArc} />

                  <View style={styles.affirmationTopRow}>
                    <View style={styles.affirmationBadge}>
                      <AppIcon name="sparkles" size={11} color={TERRACOTTA} strokeWidth={1.7} />
                      <Text style={styles.affirmationLabel}>TODAY’S AFFIRMATION</Text>
                    </View>
                    <Text style={styles.affirmationDate}>
                      {now
                        .toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                        .toUpperCase()}
                    </Text>
                  </View>

                  <Text style={[styles.affirmationMark, { fontFamily: serif }]}>“</Text>

                  <Text style={[styles.affirmationText, { fontFamily: serifItalic }]}>
                    {affirmation}
                  </Text>

                  <View style={styles.affirmationFootRow}>
                    <View style={styles.affirmationRule} />
                    <Text style={styles.affirmationFoot}>read it once more, slowly</Text>
                  </View>
                </LinearGradient>
              </Animated.View>
            ) : null}

            {/* A small question for today */}
            <Animated.View style={[styles.questionWrap, rise]}>
              <LinearGradient
                colors={['#F0E8F9', '#E7DEF5', '#F7EAF0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.questionCard}
              >
                <Text pointerEvents="none" style={[styles.questionMark, { fontFamily: serif }]}>
                  ?
                </Text>

                <View style={styles.questionTopRow}>
                  <View style={styles.questionBadge}>
                    <AppIcon name="sparkles" size={11} color={LILAC} strokeWidth={1.7} />
                    <Text style={styles.questionEyebrow}>A SMALL QUESTION FOR TODAY</Text>
                  </View>
                  <Text style={styles.questionAside}>JUST FOR YOU</Text>
                </View>

                <Text style={[styles.questionText, { fontFamily: serifItalic }]}>
                  {dailyQuestion}
                </Text>

                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.questionCta}
                  onPress={() => openJournal(dailyQuestion)}
                  accessibilityRole="button"
                  accessibilityLabel="Answer privately in your journal"
                >
                  <Text style={[styles.questionCtaText, { fontFamily: serif }]}>
                    Answer privately
                  </Text>
                  <View style={styles.questionCtaCircle}>
                    <AppIcon name="pen" size={13} color={CREAM} strokeWidth={1.8} />
                  </View>
                </TouchableOpacity>
              </LinearGradient>
            </Animated.View>

            {/* Mindful moments */}
            <Animated.View style={[styles.section, rise]}>
              <View style={styles.sectionHead}>
                <View>
                  <Text style={[styles.sectionTitle, { fontFamily: serif }]}>A little support</Text>
                  <Text style={styles.sectionSub}>Six quiet tools, each with its own door.</Text>
                </View>
                <Text style={styles.sectionAside}>YOURS TO USE</Text>
              </View>

              {/* Private journal — featured */}
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.featureTouch}
                onPress={() => openJournal('')}
                accessibilityRole="button"
                accessibilityLabel="Private journal"
              >
                <LinearGradient
                  colors={['#FCEEE5', '#F6E0D1']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.toolFeature}
                >
                  <View pointerEvents="none" style={styles.featureGlow} />
                  <View style={styles.featureRow}>
                    <View style={styles.featureIcon}>
                      <AppIcon name="pen" size={20} color={TERRACOTTA} strokeWidth={1.5} />
                    </View>
                    <View style={styles.featureInfo}>
                      <Text style={styles.featureEyebrow}>PRIVATE, ON THIS DEVICE</Text>
                      <Text style={[styles.featureTitle, { fontFamily: serif }]}>
                        Your journal
                      </Text>
                      <Text style={styles.featureSub}>
                        {journalEntries.length > 0
                          ? `${journalEntries.length} ${
                              journalEntries.length === 1 ? 'line' : 'lines'
                            } kept. Write another whenever it helps.`
                          : 'A page that asks nothing of you. Start anywhere.'}
                      </Text>
                    </View>
                    <View style={styles.featureCircle}>
                      <AppIcon name="arrowRight" size={14} color={TERRACOTTA} strokeWidth={1.8} />
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              {/* Two-column tiles */}
              <View style={styles.toolTileRow}>
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={styles.tileTouch}
                  onPress={onOpenBreathing}
                  accessibilityRole="button"
                  accessibilityLabel="Two minutes of breathing"
                >
                  <LinearGradient
                    colors={['#EEF4EA', '#DCEAD6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.toolTile}
                  >
                    <View pointerEvents="none" style={styles.toolTileGlow} />
                    <View style={styles.toolTileIcon}>
                      <AppIcon name="wind" size={19} color={SAGE} strokeWidth={1.5} />
                    </View>
                    <Text style={styles.toolTileTitle}>Breathing</Text>
                    <Text style={styles.toolTileSub}>Two quiet minutes</Text>
                    <View style={styles.toolTileCircle}>
                      <AppIcon name="arrowRight" size={12} color={SAGE} strokeWidth={1.8} />
                    </View>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.9}
                  style={styles.tileTouch}
                  onPress={() => setHabitsOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Gentle daily habits"
                >
                  <LinearGradient
                    colors={['#F4EDFA', '#E8DCF4']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.toolTile}
                  >
                    <View pointerEvents="none" style={styles.toolTileGlow} />
                    <View style={styles.toolTileIcon}>
                      <AppIcon name="sprout" size={19} color={LILAC} strokeWidth={1.5} />
                    </View>
                    <Text style={styles.toolTileTitle}>Daily habits</Text>
                    <Text style={styles.toolTileSub}>
                      {keptHabits > 0
                        ? `${keptHabits} of ${HABITS.length} kept`
                        : 'Small steps that add up'}
                    </Text>
                    <View style={styles.toolTileCircle}>
                      <AppIcon name="arrowRight" size={12} color={LILAC} strokeWidth={1.8} />
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              <View style={styles.toolTileRow}>
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={styles.tileTouch}
                  onPress={openGrounding}
                  accessibilityRole="button"
                  accessibilityLabel="A grounding minute"
                >
                  <LinearGradient
                    colors={['#EAF2EE', '#D8E8E1']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.toolTile}
                  >
                    <View pointerEvents="none" style={styles.toolTileGlow} />
                    <View style={styles.toolTileIcon}>
                      <AppIcon name="leaf" size={19} color="#4F7C6B" strokeWidth={1.5} />
                    </View>
                    <Text style={styles.toolTileTitle}>Grounding</Text>
                    <Text style={styles.toolTileSub}>Five senses, back to now</Text>
                    <View style={styles.toolTileCircle}>
                      <AppIcon name="arrowRight" size={12} color="#4F7C6B" strokeWidth={1.8} />
                    </View>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.9}
                  style={styles.tileTouch}
                  onPress={() => {
                    setGratitudeText('');
                    setGratitudeNote('');
                    setGratitudeOpen(true);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Gratitude jar"
                >
                  <LinearGradient
                    colors={['#FBEBE7', '#F5DAD3']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.toolTile}
                  >
                    <View pointerEvents="none" style={styles.toolTileGlow} />
                    <View style={styles.toolTileIcon}>
                      <AppIcon name="heart" size={19} color={TERRACOTTA} strokeWidth={1.5} />
                    </View>
                    <Text style={styles.toolTileTitle}>Gratitude jar</Text>
                    <Text style={styles.toolTileSub}>
                      {gratitudeEntries.length > 0
                        ? `${gratitudeEntries.length} small thanks kept`
                        : 'One small glad thing'}
                    </Text>
                    <View style={styles.toolTileCircle}>
                      <AppIcon name="arrowRight" size={12} color={TERRACOTTA} strokeWidth={1.8} />
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* Evening wind-down — featured */}
              <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.featureTouch, styles.featureTouchSpacing]}
                onPress={() => setWindDownOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Evening wind-down"
              >
                <LinearGradient
                  colors={['#EDEBF9', '#DED9F1']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.toolFeature}
                >
                  <View pointerEvents="none" style={styles.featureGlow} />
                  <View style={styles.featureRow}>
                    <View style={styles.featureIcon}>
                      <AppIcon name="moon" size={20} color="#5C5A9C" strokeWidth={1.5} />
                    </View>
                    <View style={styles.featureInfo}>
                      <Text style={[styles.featureEyebrow, { color: '#5C5A9C' }]}>
                        BEFORE THE DAY CLOSES
                      </Text>
                      <Text style={[styles.featureTitle, { fontFamily: serif }]}>
                        Evening wind-down
                      </Text>
                      <Text style={styles.featureSub}>
                        {keptWindDown > 0
                          ? `${keptWindDown} of ${WIND_DOWN_STEPS.length} steps tonight. The rest can wait.`
                          : 'Four quiet steps, then let the day be enough.'}
                      </Text>
                    </View>
                    <View style={styles.featureCircle}>
                      <AppIcon name="arrowRight" size={14} color="#5C5A9C" strokeWidth={1.8} />
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            <Text style={[styles.footerNote, { fontFamily: serifItalic }]}>
              Small steps count. So do you.
            </Text>
          </ScrollView>
        </View>

        <VoiceListeningModal
          visible={isVoiceModalOpen}
          onClose={() => setIsVoiceModalOpen(false)}
          onOpenTextChat={onOpenChat}
        />

        <Modal
          visible={habitsOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setHabitsOpen(false)}
        >
          <View style={styles.habitsOverlay}>
            <View style={styles.habitsSheet}>
              <LinearGradient
                colors={['#FDF9F3', '#F8F0E8', '#F1E8F5']}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.grabber} />

              <View style={styles.habitsHeader}>
                <View>
                  <Text style={styles.habitsEyebrow}>A LITTLE EVERY DAY</Text>
                  <Text style={[styles.habitsTitle, { fontFamily: serif }]}>
                    Gentle habits
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.habitsCloseBtn}
                  onPress={() => setHabitsOpen(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Close habits"
                >
                  <AppIcon name="close" size={15} color={SOFT} strokeWidth={1.8} />
                </TouchableOpacity>
              </View>

              <Text style={styles.habitsSub}>
                Tiny things, done kindly. Miss a day and nothing breaks.
              </Text>

              <View style={styles.habitsProgressRow}>
                <Text style={styles.habitsProgressText}>
                  {keptHabits} of {HABITS.length} kept today
                </Text>
                <View style={styles.habitsProgressTrack}>
                  <View
                    style={[
                      styles.habitsProgressFill,
                      { width: `${(keptHabits / HABITS.length) * 100}%` },
                    ]}
                  />
                </View>
              </View>

              {HABITS.map((habit) => {
                const isDone = habitsDone.includes(habit.id);
                return (
                  <TouchableOpacity
                    key={habit.id}
                    activeOpacity={0.85}
                    style={[styles.habitRow, isDone && styles.habitRowDone]}
                    onPress={() => toggleHabit(habit.id)}
                    accessibilityRole="button"
                    accessibilityState={{ checked: isDone }}
                    accessibilityLabel={habit.title}
                  >
                    <View style={[styles.habitCheck, isDone && styles.habitCheckDone]}>
                      {isDone ? (
                        <AppIcon name="check" size={13} color={CREAM} strokeWidth={2.4} />
                      ) : null}
                    </View>
                    <View style={styles.habitInfo}>
                      <Text style={[styles.habitTitle, isDone && styles.habitTitleDone]}>
                        {habit.title}
                      </Text>
                      <Text style={styles.habitSub}>{habit.sub}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              <Text style={[styles.habitsFooter, { fontFamily: serifItalic }]}>
                Come back tomorrow, gently.
              </Text>
            </View>
          </View>
        </Modal>

        {/* Gentle streak */}
        <Modal
          visible={streakOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setStreakOpen(false)}
        >
          <View style={styles.habitsOverlay}>
            <View style={styles.habitsSheet}>
              <LinearGradient
                colors={['#FDF9F3', '#F8F0E8', '#F1E8F5']}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.grabber} />

              <View style={styles.habitsHeader}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.habitsEyebrow}>A TRAIL OF RETURNS</Text>
                  <Text style={[styles.habitsTitle, { fontFamily: serif }]}>
                    Your gentle streak
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.habitsCloseBtn}
                  onPress={() => setStreakOpen(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Close streak"
                >
                  <AppIcon name="close" size={15} color={SOFT} strokeWidth={1.8} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.streakBig, { fontFamily: serif }]}>{streak}</Text>
              <Text style={styles.streakBigLabel}>
                {streak === 0
                  ? 'Not started yet. One honest check-in begins it.'
                  : streak === 1
                  ? 'day in a row. Beginning again counts.'
                  : 'days in a row. Not a score, just a trail.'}
              </Text>

              <View style={styles.weekRow}>
                {week.map((day) => {
                  const filled = Boolean(day.mood);
                  return (
                    <View key={day.iso} style={styles.weekDay}>
                      <View
                        style={[
                          styles.weekDot,
                          filled && {
                            backgroundColor: `${moodAccent(day.mood)}18`,
                            borderColor: `${moodAccent(day.mood)}55`,
                          },
                        ]}
                      >
                        {filled ? (
                          <View
                            style={[
                              styles.weekDotInner,
                              { backgroundColor: moodAccent(day.mood) },
                            ]}
                          />
                        ) : null}
                      </View>
                      <Text style={styles.weekLetter}>{day.letter}</Text>
                    </View>
                  );
                })}
              </View>

              <Text style={styles.streakCopy}>
                A streak here is not a number to protect. It is a small record of coming
                back to yourself. Miss a day and nothing breaks.
              </Text>

              <Text style={[styles.habitsFooter, { fontFamily: serifItalic }]}>
                Come back when you can, not because you owe it.
              </Text>
            </View>
          </View>
        </Modal>

        {/* Private journal */}
        <Modal
          visible={journalOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setJournalOpen(false)}
        >
          <KeyboardAvoidingView
            style={styles.habitsOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.habitsSheet}>
              <LinearGradient
                colors={['#FDF9F3', '#F8F0E8', '#F1E8F5']}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.grabber} />

              <View style={styles.habitsHeader}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.habitsEyebrow}>ONLY YOURS TO READ</Text>
                  <Text style={[styles.habitsTitle, { fontFamily: serif }]}>Your journal</Text>
                </View>
                <TouchableOpacity
                  style={styles.habitsCloseBtn}
                  onPress={() => setJournalOpen(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Close journal"
                >
                  <AppIcon name="close" size={15} color={SOFT} strokeWidth={1.8} />
                </TouchableOpacity>
              </View>

              {journalPrompt ? (
                <Text style={[styles.journalPrompt, { fontFamily: serifItalic }]}>
                  {journalPrompt}
                </Text>
              ) : (
                <Text style={styles.habitsSub}>
                  No one else can see this. It stays on your device.
                </Text>
              )}

              <TextInput
                style={styles.journalInput}
                value={journalText}
                onChangeText={setJournalText}
                placeholder="Start anywhere. A sentence is enough."
                placeholderTextColor="rgba(42, 32, 51, 0.28)"
                multiline
                textAlignVertical="top"
                maxLength={1200}
              />

              <TouchableOpacity
                style={styles.saveBtn}
                activeOpacity={0.85}
                onPress={saveJournal}
                accessibilityRole="button"
                accessibilityLabel="Keep this line"
              >
                <Text style={[styles.saveBtnText, { fontFamily: serif }]}>Keep this line</Text>
                <View style={styles.saveBtnCircle}>
                  <AppIcon name="check" size={14} color={CREAM} strokeWidth={2.2} />
                </View>
              </TouchableOpacity>

              {journalNote ? <Text style={styles.reminderNote}>{journalNote}</Text> : null}

              {journalEntries.length > 0 ? (
                <View style={styles.journalLatest}>
                  <Text style={styles.journalLabel}>LAST KEPT</Text>
                  <Text style={styles.journalLatestText} numberOfLines={3}>
                    {journalEntries[0].text}
                  </Text>
                </View>
              ) : null}

              {todayJournalEntry ? (
                <Text style={[styles.habitsFooter, { fontFamily: serifItalic }]}>
                  You have already written today. You can always write more.
                </Text>
              ) : null}
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Gratitude jar */}
        <Modal
          visible={gratitudeOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setGratitudeOpen(false)}
        >
          <KeyboardAvoidingView
            style={styles.habitsOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.habitsSheet}>
              <LinearGradient
                colors={['#FDF9F3', '#F8F0E8', '#F1E8F5']}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.grabber} />

              <View style={styles.habitsHeader}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.habitsEyebrow}>SMALL THINGS THAT HELD YOU</Text>
                  <Text style={[styles.habitsTitle, { fontFamily: serif }]}>
                    Gratitude jar
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.habitsCloseBtn}
                  onPress={() => setGratitudeOpen(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Close gratitude jar"
                >
                  <AppIcon name="close" size={15} color={SOFT} strokeWidth={1.8} />
                </TouchableOpacity>
              </View>

              <Text style={styles.habitsSub}>
                One small thing. It does not have to be big to count.
              </Text>

              <TextInput
                style={styles.journalInput}
                value={gratitudeText}
                onChangeText={setGratitudeText}
                placeholder="Today, I am glad for..."
                placeholderTextColor="rgba(42, 32, 51, 0.28)"
                multiline
                textAlignVertical="top"
                maxLength={400}
              />

              <TouchableOpacity
                style={styles.saveBtn}
                activeOpacity={0.85}
                onPress={saveGratitude}
                accessibilityRole="button"
                accessibilityLabel="Add to the gratitude jar"
              >
                <Text style={[styles.saveBtnText, { fontFamily: serif }]}>Add to the jar</Text>
                <View style={styles.saveBtnCircle}>
                  <AppIcon name="heart" size={14} color={CREAM} strokeWidth={1.8} />
                </View>
              </TouchableOpacity>

              {gratitudeNote ? <Text style={styles.reminderNote}>{gratitudeNote}</Text> : null}

              {gratitudeEntries.length > 0 ? (
                <View style={styles.journalLatest}>
                  <Text style={styles.journalLabel}>
                    {gratitudeEntries.length} SMALL{' '}
                    {gratitudeEntries.length === 1 ? 'THANK' : 'THANKS'} KEPT
                  </Text>
                  {gratitudeEntries.slice(0, 2).map((entry, index) => (
                    <Text key={`${entry.date}-${index}`} style={styles.journalLatestText}>
                      {entry.text}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Evening wind-down */}
        <Modal
          visible={windDownOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setWindDownOpen(false)}
        >
          <View style={styles.habitsOverlay}>
            <View style={styles.habitsSheet}>
              <LinearGradient
                colors={['#FDF9F3', '#F8F0E8', '#F1E8F5']}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.grabber} />

              <View style={styles.habitsHeader}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.habitsEyebrow}>BEFORE THE DAY CLOSES</Text>
                  <Text style={[styles.habitsTitle, { fontFamily: serif }]}>
                    Wind down
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.habitsCloseBtn}
                  onPress={() => setWindDownOpen(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Close wind-down"
                >
                  <AppIcon name="close" size={15} color={SOFT} strokeWidth={1.8} />
                </TouchableOpacity>
              </View>

              <Text style={styles.habitsSub}>
                Not a routine to perfect. Just a softer landing into sleep.
              </Text>

              <View style={styles.habitsProgressRow}>
                <Text style={styles.habitsProgressText}>
                  {keptWindDown} of {WIND_DOWN_STEPS.length} steps
                </Text>
                <View style={styles.habitsProgressTrack}>
                  <View
                    style={[
                      styles.habitsProgressFill,
                      { width: `${(keptWindDown / WIND_DOWN_STEPS.length) * 100}%` },
                    ]}
                  />
                </View>
              </View>

              {WIND_DOWN_STEPS.map((step) => {
                const isDone = windDownDone.includes(step.id);
                return (
                  <TouchableOpacity
                    key={step.id}
                    activeOpacity={0.85}
                    style={[styles.habitRow, isDone && styles.habitRowDone]}
                    onPress={() => toggleWindDown(step.id)}
                    accessibilityRole="button"
                    accessibilityState={{ checked: isDone }}
                    accessibilityLabel={step.title}
                  >
                    <View style={[styles.habitCheck, isDone && styles.habitCheckDone]}>
                      {isDone ? (
                        <AppIcon name="check" size={13} color={CREAM} strokeWidth={2.4} />
                      ) : null}
                    </View>
                    <View style={styles.habitInfo}>
                      <Text style={[styles.habitTitle, isDone && styles.habitTitleDone]}>
                        {step.title}
                      </Text>
                      <Text style={styles.habitSub}>{step.sub}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              <Text style={[styles.habitsFooter, { fontFamily: serifItalic }]}>
                Whatever is left undone can wait until morning.
              </Text>
            </View>
          </View>
        </Modal>

        {/* Grounding minute */}
        <Modal
          visible={groundingOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setGroundingOpen(false)}
        >
          <View style={styles.habitsOverlay}>
            <View style={styles.habitsSheet}>
              <LinearGradient
                colors={['#FDF9F3', '#F8F0E8', '#F1E8F5']}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.grabber} />

              <View style={styles.habitsHeader}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.habitsEyebrow}>COME BACK TO NOW</Text>
                  <Text style={[styles.habitsTitle, { fontFamily: serif }]}>
                    A grounding minute
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.habitsCloseBtn}
                  onPress={() => setGroundingOpen(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Close grounding"
                >
                  <AppIcon name="close" size={15} color={SOFT} strokeWidth={1.8} />
                </TouchableOpacity>
              </View>

              <View style={styles.groundingStage}>
                <Text style={[styles.groundingCount, { fontFamily: serif }]}>
                  {GROUNDING_STEPS[groundStep].count}
                </Text>
                <Text style={[styles.groundingSense, { fontFamily: serif }]}>
                  {GROUNDING_STEPS[groundStep].sense}
                </Text>
                <Text style={styles.groundingHint}>
                  {GROUNDING_STEPS[groundStep].hint}
                </Text>
              </View>

              <View style={styles.groundingDots}>
                {GROUNDING_STEPS.map((step, index) => (
                  <View
                    key={step.count}
                    style={[
                      styles.groundingDot,
                      index === groundStep && styles.groundingDotActive,
                      index < groundStep && styles.groundingDotDone,
                    ]}
                  />
                ))}
              </View>

              <TouchableOpacity
                style={styles.saveBtn}
                activeOpacity={0.85}
                onPress={() => {
                  if (groundStep < GROUNDING_STEPS.length - 1) {
                    setGroundStep(groundStep + 1);
                  } else {
                    setGroundingOpen(false);
                  }
                }}
                accessibilityRole="button"
                accessibilityLabel={
                  groundStep < GROUNDING_STEPS.length - 1 ? 'Next sense' : 'Finish grounding'
                }
              >
                <Text style={[styles.saveBtnText, { fontFamily: serif }]}>
                  {groundStep < GROUNDING_STEPS.length - 1
                    ? 'Next sense'
                    : 'I am here'}
                </Text>
                <View style={styles.saveBtnCircle}>
                  <AppIcon name="arrowRight" size={14} color={CREAM} strokeWidth={1.8} />
                </View>
              </TouchableOpacity>

              <Text style={[styles.habitsFooter, { fontFamily: serifItalic }]}>
                There is no wrong way to do this. Go at your own pace.
              </Text>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CREAM },
  safeArea: { flex: 1, alignItems: 'center' },
  mobilePhoneFrame: { width: '100%', maxWidth: 430, flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 6, paddingBottom: 40 },

  orb: { position: 'absolute', borderRadius: 999 },
  orbTop: {
    width: 320,
    height: 320,
    top: -170,
    right: -120,
    backgroundColor: 'rgba(233, 185, 160, 0.20)',
  },
  orbBottom: {
    width: 300,
    height: 300,
    bottom: -160,
    left: -130,
    backgroundColor: 'rgba(196, 167, 232, 0.14)',
  },

  // Header
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingBottom: 4,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  wordmark: {
    fontSize: 9.5,
    letterSpacing: 4,
    fontWeight: '700',
    color: 'rgba(42, 32, 51, 0.55)',
  },
  topRule: {
    width: 18,
    height: 1,
    backgroundColor: 'rgba(42, 32, 51, 0.18)',
    marginHorizontal: 8,
  },
  topNote: {
    fontSize: 10,
    letterSpacing: 0.5,
    color: 'rgba(42, 32, 51, 0.40)',
    fontStyle: 'italic',
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 253, 248, 0.70)',
    borderWidth: 1,
    borderColor: 'rgba(176, 102, 74, 0.18)',
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  streakText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: 'rgba(42, 32, 51, 0.55)',
    marginLeft: 5,
    letterSpacing: 0.2,
  },

  // Streak sheet
  streakBig: {
    fontSize: 68,
    lineHeight: 76,
    color: TERRACOTTA,
    letterSpacing: -2,
    textAlign: 'center',
    marginTop: 10,
  },
  streakBigLabel: {
    fontSize: 12.5,
    lineHeight: 19,
    color: MUTED,
    textAlign: 'center',
    marginTop: 2,
    letterSpacing: 0.1,
    paddingHorizontal: 12,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 22,
    marginBottom: 4,
  },
  weekDay: { alignItems: 'center', width: '13%' },
  weekDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(42, 32, 51, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(42, 32, 51, 0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
  },
  weekDotInner: { width: 12, height: 12, borderRadius: 6 },
  weekLetter: {
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.6,
    color: SOFT,
  },
  streakCopy: {
    fontSize: 12.5,
    lineHeight: 19,
    color: 'rgba(42, 32, 51, 0.54)',
    marginTop: 20,
    letterSpacing: 0.1,
  },

  // Hero
  hero: { marginTop: 26, marginBottom: 20 },
  eyebrow: {
    fontSize: 9.5,
    letterSpacing: 2.2,
    fontWeight: '700',
    color: TERRACOTTA,
    marginBottom: 10,
  },
  title: {
    fontSize: 38,
    lineHeight: 42,
    letterSpacing: -0.8,
    color: INK,
  },
  titleAccent: {
    fontSize: 38,
    lineHeight: 46,
    letterSpacing: -0.8,
    color: LILAC,
  },
  subtitle: {
    marginTop: 12,
    fontSize: 13.5,
    lineHeight: 21,
    color: MUTED,
    maxWidth: 300,
    letterSpacing: 0.1,
  },

  // Companion note
  lightWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  lightHalo: {
    position: 'absolute',
    backgroundColor: 'rgba(233, 185, 160, 0.55)',
  },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 253, 248, 0.78)',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 18,
    paddingHorizontal: 16,
    shadowColor: '#B0664A',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.06,
    shadowRadius: 26,
    elevation: 3,
  },
  noteBody: { flex: 1, marginLeft: 8 },
  noteEyebrow: {
    fontSize: 8.5,
    letterSpacing: 2,
    fontWeight: '700',
    color: SOFT,
    marginBottom: 7,
  },
  noteText: {
    fontSize: 15.5,
    lineHeight: 23,
    color: INK,
    letterSpacing: -0.1,
  },
  noteActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  noteAction: {
    fontSize: 12.5,
    fontWeight: '700',
    color: TERRACOTTA,
    letterSpacing: 0.3,
    marginRight: 6,
  },
  noteCaption: {
    fontSize: 10.5,
    color: SOFT,
    marginTop: 10,
    marginLeft: 6,
    letterSpacing: 0.1,
    fontStyle: 'italic',
  },

  // Sections
  section: { marginTop: 28 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 23,
    lineHeight: 28,
    letterSpacing: -0.3,
    color: INK,
  },
  sectionSub: {
    fontSize: 12,
    color: SOFT,
    marginTop: 4,
    letterSpacing: 0.1,
  },
  sectionAside: {
    fontSize: 9.5,
    color: 'rgba(42, 32, 51, 0.38)',
    letterSpacing: 0.4,
    marginBottom: 4,
  },

  // Mood
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 253, 248, 0.72)',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 16,
    paddingHorizontal: 10,
    shadowColor: '#B0664A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 2,
  },
  moodItem: { alignItems: 'center', width: '19%' },
  moodOrbWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
  moodOrb: {
    width: 45,
    height: 45,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodLabel: {
    fontSize: 10.5,
    color: 'rgba(42, 32, 51, 0.50)',
    fontWeight: '500',
    letterSpacing: 0.1,
  },

  // Mood suggestion
  moodSuggestion: {
    marginTop: 12,
    backgroundColor: 'rgba(255, 253, 248, 0.82)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    borderLeftWidth: 2,
    paddingVertical: 16,
    paddingHorizontal: 16,
    shadowColor: '#B0664A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 18,
    elevation: 1,
  },
  moodSuggestionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 9,
  },
  moodSuggestionIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  moodSuggestionEyebrow: {
    fontSize: 8.5,
    letterSpacing: 1.9,
    fontWeight: '700',
  },
  moodSuggestionTitle: {
    fontSize: 19,
    lineHeight: 24,
    color: INK,
    letterSpacing: -0.3,
  },
  moodSuggestionBody: {
    fontSize: 12.5,
    lineHeight: 19,
    color: MUTED,
    marginTop: 6,
    letterSpacing: 0.1,
  },
  moodSuggestionPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: TERRACOTTA,
    paddingLeft: 18,
    paddingRight: 5,
    paddingVertical: 5,
    borderRadius: 999,
    minHeight: 46,
    marginTop: 14,
    shadowColor: TERRACOTTA,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 2,
  },
  moodSuggestionPrimaryText: {
    color: CREAM,
    fontSize: 14,
    letterSpacing: 0.1,
  },
  moodSuggestionCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(253, 249, 243, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodSuggestionSecondaryBtn: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 2,
  },
  moodSuggestionSecondary: {
    fontSize: 11.5,
    color: SOFT,
    letterSpacing: 0.2,
    fontStyle: 'italic',
  },

  // Affirmation
  affirmationWrap: {
    marginTop: 26,
    borderRadius: 28,
    shadowColor: '#B0664A',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.14,
    shadowRadius: 28,
    elevation: 4,
  },
  affirmationCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    paddingVertical: 22,
    paddingHorizontal: 22,
    overflow: 'hidden',
  },
  affirmationGlow: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 115,
    top: -120,
    right: -70,
    backgroundColor: 'rgba(255, 255, 255, 0.42)',
  },
  affirmationArc: {
    position: 'absolute',
    width: 270,
    height: 270,
    borderRadius: 135,
    bottom: -195,
    left: -95,
    borderWidth: 1,
    borderColor: 'rgba(176, 102, 74, 0.16)',
  },
  affirmationTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  affirmationBadge: { flexDirection: 'row', alignItems: 'center' },
  affirmationLabel: {
    fontSize: 8.5,
    letterSpacing: 2,
    fontWeight: '700',
    color: TERRACOTTA,
    marginLeft: 6,
  },
  affirmationDate: {
    fontSize: 9,
    letterSpacing: 1.2,
    fontWeight: '700',
    color: 'rgba(42, 32, 51, 0.38)',
  },
  affirmationMark: {
    fontSize: 56,
    lineHeight: 46,
    color: 'rgba(176, 102, 74, 0.30)',
    marginTop: 8,
    marginBottom: -6,
    marginLeft: -4,
  },
  affirmationText: {
    fontSize: 22,
    lineHeight: 31,
    color: INK,
    letterSpacing: -0.3,
  },
  affirmationFootRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  affirmationRule: {
    width: 22,
    height: 1,
    backgroundColor: 'rgba(42, 32, 51, 0.18)',
    marginRight: 10,
  },
  affirmationFoot: {
    fontSize: 9.5,
    letterSpacing: 1.2,
    color: 'rgba(42, 32, 51, 0.40)',
    textTransform: 'uppercase',
  },

  // Tools
  featureTouch: {
    borderRadius: 24,
    shadowColor: '#B0664A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 2,
  },
  featureTouchSpacing: { marginTop: 10 },
  toolFeature: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    paddingVertical: 16,
    paddingHorizontal: 15,
    overflow: 'hidden',
  },
  featureGlow: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    top: -80,
    right: -40,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  featureRow: { flexDirection: 'row', alignItems: 'center' },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.62)',
    marginRight: 13,
  },
  featureInfo: { flex: 1 },
  featureEyebrow: {
    fontSize: 8,
    letterSpacing: 1.6,
    fontWeight: '700',
    color: TERRACOTTA,
    marginBottom: 4,
  },
  featureTitle: {
    fontSize: 19,
    lineHeight: 24,
    color: INK,
    letterSpacing: -0.3,
  },
  featureSub: {
    fontSize: 11.5,
    lineHeight: 17,
    color: 'rgba(42, 32, 51, 0.50)',
    marginTop: 4,
    letterSpacing: 0.1,
  },
  featureCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.66)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },

  toolTileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  tileTouch: {
    width: '48.5%',
    borderRadius: 22,
    shadowColor: '#B0664A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 1,
  },
  toolTile: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    paddingVertical: 14,
    paddingHorizontal: 13,
    minHeight: 148,
    overflow: 'hidden',
  },
  toolTileGlow: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    top: -55,
    right: -40,
    backgroundColor: 'rgba(255, 255, 255, 0.38)',
  },
  toolTileIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.62)',
    marginBottom: 11,
  },
  toolTileTitle: {
    fontSize: 14.5,
    fontWeight: '600',
    color: INK,
    letterSpacing: 0.1,
    lineHeight: 19,
  },
  toolTileSub: {
    fontSize: 11,
    lineHeight: 16,
    color: 'rgba(42, 32, 51, 0.48)',
    marginTop: 4,
    paddingRight: 20,
  },
  toolTileCircle: {
    position: 'absolute',
    right: 11,
    bottom: 11,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.66)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Habits sheet
  habitsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(42, 32, 51, 0.32)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  habitsSheet: {
    width: '100%',
    maxWidth: 440,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 30,
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
  habitsHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  habitsEyebrow: {
    fontSize: 8.5,
    letterSpacing: 2,
    fontWeight: '700',
    color: TERRACOTTA,
    marginBottom: 6,
  },
  habitsTitle: { fontSize: 26, lineHeight: 31, color: INK, letterSpacing: -0.4 },
  habitsCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 253, 248, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(42, 32, 51, 0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitsSub: {
    fontSize: 12.5,
    lineHeight: 19,
    color: MUTED,
    marginTop: 10,
    letterSpacing: 0.1,
    maxWidth: 320,
  },
  habitsProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 14,
  },
  habitsProgressText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: TERRACOTTA,
    letterSpacing: 0.3,
    marginRight: 12,
  },
  habitsProgressTrack: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(42, 32, 51, 0.07)',
    overflow: 'hidden',
  },
  habitsProgressFill: {
    height: 5,
    borderRadius: 3,
    backgroundColor: LILAC,
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 253, 248, 0.78)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  habitRowDone: {
    backgroundColor: 'rgba(140, 90, 168, 0.07)',
    borderColor: 'rgba(140, 90, 168, 0.18)',
  },
  habitCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(140, 90, 168, 0.32)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  habitCheckDone: {
    backgroundColor: LILAC,
    borderColor: LILAC,
  },
  habitInfo: { flex: 1 },
  habitTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    color: INK,
    letterSpacing: 0.1,
  },
  habitTitleDone: { color: 'rgba(42, 32, 51, 0.55)' },
  habitSub: { fontSize: 11, color: SOFT, marginTop: 3, letterSpacing: 0.1 },
  habitsFooter: {
    marginTop: 14,
    fontSize: 12.5,
    color: SOFT,
    textAlign: 'center',
    letterSpacing: 0.1,
  },

  // Daily question
  questionWrap: {
    marginTop: 26,
    borderRadius: 28,
    shadowColor: '#8C5AA8',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.13,
    shadowRadius: 26,
    elevation: 4,
  },
  questionCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    paddingVertical: 20,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  questionMark: {
    position: 'absolute',
    right: 4,
    top: -26,
    fontSize: 132,
    lineHeight: 150,
    color: 'rgba(140, 90, 168, 0.10)',
  },
  questionTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  questionBadge: { flexDirection: 'row', alignItems: 'center' },
  questionEyebrow: {
    fontSize: 8.5,
    letterSpacing: 2,
    fontWeight: '700',
    color: LILAC,
    marginLeft: 6,
  },
  questionAside: {
    fontSize: 8.5,
    letterSpacing: 1.4,
    fontWeight: '700',
    color: 'rgba(42, 32, 51, 0.32)',
  },
  questionText: {
    fontSize: 20,
    lineHeight: 28,
    color: INK,
    letterSpacing: -0.3,
    paddingRight: 18,
  },
  questionCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'flex-start',
    backgroundColor: LILAC,
    paddingLeft: 18,
    paddingRight: 5,
    paddingVertical: 5,
    borderRadius: 999,
    minHeight: 44,
    marginTop: 18,
    shadowColor: LILAC,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 2,
  },
  questionCtaText: {
    color: CREAM,
    fontSize: 14,
    letterSpacing: 0.1,
    marginRight: 14,
  },
  questionCtaCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(253, 249, 243, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Journal and gratitude sheets
  journalPrompt: {
    fontSize: 16,
    lineHeight: 24,
    color: LILAC,
    marginTop: 12,
    letterSpacing: -0.2,
  },
  journalInput: {
    minHeight: 104,
    maxHeight: 170,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(42, 32, 51, 0.08)',
    backgroundColor: 'rgba(255, 253, 248, 0.82)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 16,
    fontSize: 14,
    lineHeight: 21,
    color: INK,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: TERRACOTTA,
    paddingLeft: 20,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 999,
    minHeight: 50,
    marginTop: 14,
    shadowColor: TERRACOTTA,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 2,
  },
  saveBtnText: {
    color: CREAM,
    fontSize: 15.5,
    letterSpacing: 0.1,
  },
  saveBtnCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(253, 249, 243, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderNote: {
    fontSize: 11,
    color: TERRACOTTA,
    marginTop: 8,
    marginLeft: 4,
    lineHeight: 16,
  },
  journalLatest: {
    marginTop: 16,
    backgroundColor: 'rgba(140, 90, 168, 0.06)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(140, 90, 168, 0.12)',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  journalLabel: {
    fontSize: 8.5,
    fontWeight: '700',
    letterSpacing: 1.6,
    color: LILAC,
    marginBottom: 6,
  },
  journalLatestText: {
    fontSize: 12.5,
    lineHeight: 19,
    color: 'rgba(42, 32, 51, 0.68)',
    marginBottom: 4,
  },

  // Grounding
  groundingStage: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 26,
    minHeight: 190,
  },
  groundingCount: {
    fontSize: 74,
    lineHeight: 82,
    color: TERRACOTTA,
    letterSpacing: -2,
  },
  groundingSense: {
    fontSize: 21,
    lineHeight: 28,
    color: INK,
    marginTop: 2,
    textAlign: 'center',
  },
  groundingHint: {
    fontSize: 12.5,
    lineHeight: 19,
    color: MUTED,
    marginTop: 10,
    textAlign: 'center',
    maxWidth: 280,
    letterSpacing: 0.1,
  },
  groundingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  groundingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginHorizontal: 4,
    backgroundColor: 'rgba(42, 32, 51, 0.12)',
  },
  groundingDotActive: {
    width: 20,
    backgroundColor: TERRACOTTA,
  },
  groundingDotDone: {
    backgroundColor: 'rgba(176, 102, 74, 0.45)',
  },

  footerNote: {
    marginTop: 30,
    fontSize: 14,
    color: 'rgba(42, 32, 51, 0.38)',
    textAlign: 'center',
    letterSpacing: 0.1,
  },
});
