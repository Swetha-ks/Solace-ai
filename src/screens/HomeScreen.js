import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Easing,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Image,
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
import VoiceListeningModal from '../components/VoiceListeningModal';
import AppIcon from '../components/AppIcon';
import { ensureSession, insightsApi, moodsApi } from '../lib/api';
import { useLanguage } from '../lib/i18n';

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

const HABIT_SUGGESTIONS = [
  'Stretch for a minute',
  'Call someone I love',
  'Sit in the sunlight',
  'Tidy one small corner',
  'Rest without guilt',
  'Put my phone down for ten minutes',
];

const GARDEN_STAGES = [
  { icon: 'circle', color: 'rgba(176, 102, 74, 0.38)' },
  { icon: 'sprout', color: '#6F8F6B' },
  { icon: 'leaf', color: '#4F7C6B' },
  { icon: 'flower', color: '#8C5AA8' },
];

const GARDEN_PREVIEW = [
  { icon: 'sprout', color: '#6F8F6B' },
  { icon: 'flower', color: '#8C5AA8' },
  { icon: 'leaf', color: '#4F7C6B' },
  { icon: 'leaf', color: '#6F8F6B' },
  { icon: 'sprout', color: '#4F7C6B' },
  { icon: 'flower', color: '#B0664A' },
  { icon: 'flower', color: '#8C5AA8' },
  { icon: 'leaf', color: '#4F7C6B' },
  { icon: 'sprout', color: '#6F8F6B' },
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

const TINY_ACTIONS = [
  'Look out of the nearest window for twenty seconds. Let your eyes go far.',
  'Drink a glass of water, slowly, all the way down.',
  'Put both feet on the floor and press down. Feel the ground hold you.',
  'Stretch your arms overhead, then let them fall. Let your shoulders drop.',
  'Send one kind message to someone you have not spoken to in a while.',
  'Step outside, or open a window, and take three slow breaths of fresh air.',
  'Tidy one small square of your space. Just one.',
  'Put your phone down for one minute and listen to the room.',
  'Name three things within reach that you are glad exist.',
  'Warm your hands together, then rest them over your eyes for ten seconds.',
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

export default function HomeScreen({ onOpenChat, onOpenBreathing, onOpenChatDraft, user }) {
  const [fontsLoaded] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_600SemiBold_Italic,
  });

  const serif = fontsLoaded ? 'Fraunces_600SemiBold' : 'Georgia, "Times New Roman", serif';
  const serifItalic = fontsLoaded
    ? 'Fraunces_600SemiBold_Italic'
    : 'Georgia, "Times New Roman", serif';
  const { t } = useLanguage();

  const [selectedMood, setSelectedMood] = useState(null);
  const [streak, setStreak] = useState(0);
  const [weekMoods, setWeekMoods] = useState([]);
  const [streakOpen, setStreakOpen] = useState(false);
  const [affirmation, setAffirmation] = useState('');
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [habitsOpen, setHabitsOpen] = useState(false);
  const [habitsDone, setHabitsDone] = useState([]);
  const [customHabits, setCustomHabits] = useState([]);
  const [habitDraft, setHabitDraft] = useState('');
  const [gameOpen, setGameOpen] = useState(false);
  const [garden, setGarden] = useState(Array(9).fill(0));
  const [tinyIndex, setTinyIndex] = useState(0);
  const [quickChatText, setQuickChatText] = useState('');

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
  const lift = useRef(new Animated.Value(0)).current;
  const cardUnfold = useRef(new Animated.Value(0)).current;
  const birdFly = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(reveal, {
        toValue: 1,
        duration: 360,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(lift, {
        toValue: 1,
        speed: 18,
        bounciness: 6,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(80),
        Animated.spring(cardUnfold, {
          toValue: 1,
          speed: 14,
          bounciness: 9,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(220),
        Animated.timing(birdFly, {
          toValue: 1,
          duration: 1350,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const rise = {
    opacity: reveal,
    transform: [
      {
        translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [26, 0] }),
      },
    ],
  };

  const unfold = {
    opacity: cardUnfold.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    }),
    transform: [
      { translateY: cardUnfold.interpolate({ inputRange: [0, 1], outputRange: [26, 0] }) },
      { scaleY: cardUnfold.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }) },
      { scaleX: cardUnfold.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
    ],
  };

  const birdStyle = {
    opacity: birdFly.interpolate({
      inputRange: [0, 0.1, 0.82, 1],
      outputRange: [0, 1, 1, 0],
    }),
    transform: [
      {
        translateX: birdFly.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [190, 40, -90],
        }),
      },
      {
        translateY: birdFly.interpolate({
          inputRange: [0, 0.28, 0.6, 1],
          outputRange: [-18, -44, -16, -34],
        }),
      },
      {
        rotate: birdFly.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: ['-10deg', '3deg', '-12deg'],
        }),
      },
    ],
  };

  useEffect(() => {
    loadSavedData();
  }, []);

  const loadSavedData = async () => {
    try {
      const rawHabits = await AsyncStorage.getItem('@solace_habits');
      if (rawHabits) {
        const saved = JSON.parse(rawHabits);
        setHabitsDone(saved.date === todayKey() ? saved.done || [] : []);
      }
    } catch (e) {}

    try {
      const rawCustomHabits = await AsyncStorage.getItem('@solace_custom_habits');
      if (rawCustomHabits) {
        const saved = JSON.parse(rawCustomHabits);
        setCustomHabits(Array.isArray(saved) ? saved : []);
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

  const saveCustomHabits = (items) => {
    AsyncStorage.setItem('@solace_custom_habits', JSON.stringify(items)).catch(() => {});
  };

  const addCustomHabit = (title) => {
    const clean = String(title || '').trim();
    if (!clean) return;

    const exists = [...HABITS, ...customHabits].some(
      (habit) => habit.title.toLowerCase() === clean.toLowerCase()
    );
    if (exists) {
      setHabitDraft('');
      return;
    }

    const habit = {
      id: `custom-${Date.now()}`,
      title: clean,
      sub: 'Your own small promise.',
      custom: true,
    };
    const next = [...customHabits, habit];
    setCustomHabits(next);
    saveCustomHabits(next);
    setHabitDraft('');
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
  };

  const removeCustomHabit = (habitId) => {
    const next = customHabits.filter((habit) => habit.id !== habitId);
    setCustomHabits(next);
    saveCustomHabits(next);
    setHabitsDone((prev) => {
      const kept = prev.filter((id) => id !== habitId);
      AsyncStorage.setItem(
        '@solace_habits',
        JSON.stringify({ date: todayKey(), done: kept })
      ).catch(() => {});
      return kept;
    });
  };

  const allHabits = [...HABITS, ...customHabits];
  const keptHabits = allHabits.filter((h) => habitsDone.includes(h.id)).length;
  const activeMood = MOODS.find((m) => m.id === selectedMood) || null;
  const tinyAction = TINY_ACTIONS[tinyIndex % TINY_ACTIONS.length];
  const habitSuggestions = HABIT_SUGGESTIONS.filter(
    (suggestion) =>
      !allHabits.some((habit) => habit.title.toLowerCase() === suggestion.toLowerCase()) &&
      (!habitDraft.trim() ||
        suggestion.toLowerCase().includes(habitDraft.trim().toLowerCase()))
  ).slice(0, 3);
  const keptWindDown = WIND_DOWN_STEPS.filter((s) => windDownDone.includes(s.id)).length;
  const todayJournalEntry = journalEntries.find((entry) => entry.date === todayKey());

  const gardenBlooms = garden.filter((stage) => stage === 3).length;
  const gardenGrowing = garden.filter((stage) => stage > 0).length;

  const growGarden = (index) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
    setGarden((prev) =>
      prev.map((stage, i) => (i === index ? Math.min(stage + 1, 3) : stage))
    );
  };

  const resetGarden = () => {
    setGarden(Array(9).fill(0));
  };

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

  const shuffleTiny = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
    setTinyIndex((i) => (i + 1) % TINY_ACTIONS.length);
  };

  const sendQuickChat = () => {
    const text = quickChatText.trim();
    setQuickChatText('');
    if (!text) {
      onOpenChat();
      return;
    }
    if (onOpenChatDraft) onOpenChatDraft(text);
    else onOpenChat();
  };

  const now = new Date();
  const week = buildWeek(weekMoods);
  const moodAccent = (id) => MOODS.find((m) => m.id === id)?.accent || 'rgba(42, 32, 51, 0.14)';
  const greetingKey =
    now.getHours() < 5
      ? 'greetingAwake'
      : now.getHours() < 12
      ? 'greetingMorning'
      : now.getHours() < 17
      ? 'greetingAfternoon'
      : 'greetingEvening';

  const firstName = String(user?.name || '').trim().split(' ')[0];
  const hourNow = now.getHours();

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#FDF9F3', '#F8F0E8', '#F2E9F4']}
        style={StyleSheet.absoluteFill}
      />

      <View pointerEvents="none" style={[styles.orb, styles.orbTop]} />
      <View pointerEvents="none" style={[styles.orb, styles.orbBottom]} />

      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.mobilePhoneFrame}>
          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            {/* Quiet header */}
            <View style={styles.topBar}>
              <View style={styles.brandRow}>
                <Text style={styles.wordmark}>SOLACE</Text>
                <View style={styles.topRule} />
                <Text style={styles.topNote}>{t('quietPlace')}</Text>
              </View>

              {streak >= 2 ? (
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.streakPill}
                  onPress={() => setStreakOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Your gentle streak"
                >
                  <AppIcon name="streak" size={11} color={TERRACOTTA} strokeWidth={1.6} />
                  <Text style={styles.streakText}>{`${streak} days`}</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Companion hero */}
            <Animated.View style={[styles.heroCardWrap, rise]}>
              <Animated.View style={[styles.heroUnfold, unfold]}>
              <LinearGradient
                colors={['#FFF6EC', '#FAE5D8', '#F2E5F7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroCard}
              >
                <View pointerEvents="none" style={styles.heroGlowA} />
                <View pointerEvents="none" style={styles.heroGlowB} />

                <View style={styles.heroTopRow}>
                  <View style={styles.heroAvatarWrap}>
                    <View style={styles.heroAvatarHalo} />
                    <Image
                      source={require('../../assets/hug.png')}
                      style={styles.heroAvatar}
                      resizeMode="cover"
                    />
                    <View style={styles.heroLiveDot} />
                  </View>

                  <View style={styles.heroTopText}>
                    <Text style={styles.heroBrand}>SOLACE</Text>
                    <Text style={styles.heroLive}>here with you, right now</Text>
                  </View>

                  <View style={styles.heroMomentChip}>
                    <AppIcon
                      name={hourNow < 17 && hourNow >= 5 ? 'sun' : 'moon'}
                      size={12}
                      color={TERRACOTTA}
                      strokeWidth={1.7}
                    />
                    <Text style={styles.heroMomentText}>
                      {hourNow < 5
                        ? 'late'
                        : hourNow < 12
                        ? 'morning'
                        : hourNow < 17
                        ? 'afternoon'
                        : 'evening'}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.heroGreeting, { fontFamily: serif }]}>
                  {t(greetingKey)}
                  {firstName ? `, ${firstName}` : ''}.
                </Text>
                <Text style={[styles.heroSub, { fontFamily: serifItalic }]}>
                  {t('homeSub')}
                </Text>

                <View style={styles.heroActions}>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={styles.heroPrimary}
                    onPress={onOpenChat}
                    accessibilityRole="button"
                    accessibilityLabel="Talk with Solace"
                  >
                    <AppIcon name="chat" size={16} color={CREAM} strokeWidth={1.8} />
                    <Text style={[styles.heroPrimaryText, { fontFamily: serif }]}>
                      Talk with me
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={styles.heroSpeak}
                    onPress={() => setIsVoiceModalOpen(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Speak instead of typing"
                  >
                    <AppIcon name="mic" size={15} color={TERRACOTTA} strokeWidth={1.7} />
                    <Text style={styles.heroSpeakText}>Speak</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
              </Animated.View>

              <Animated.View pointerEvents="none" style={[styles.messenger, birdStyle]}>
                <View style={styles.messengerEnvelope}>
                  <AppIcon name="mail" size={11} color={TERRACOTTA} strokeWidth={1.7} />
                </View>
                <AppIcon name="bird" size={26} color={TERRACOTTA} strokeWidth={1.4} />
              </Animated.View>
            </Animated.View>
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

            {/* One small thing */}
            <Animated.View style={[styles.tinyWrap, rise]}>
              <LinearGradient
                colors={['#FDF3E7', '#F6E6D4', '#EFE6F7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.tinyCard}
              >
                <View pointerEvents="none" style={styles.tinyGlow} />

                <View style={styles.tinyTopRow}>
                  <View style={styles.tinyBadge}>
                    <AppIcon name="sparkles" size={11} color={TERRACOTTA} strokeWidth={1.7} />
                    <Text style={styles.tinyEyebrow}>ONE SMALL THING, RIGHT NOW</Text>
                  </View>
                  <Text style={styles.tinyAside}>NOT A TASK</Text>
                </View>

                <Text style={[styles.tinyText, { fontFamily: serifItalic }]}>{tinyAction}</Text>

                <View style={styles.tinyFootRow}>
                  <Text style={styles.tinyFoot}>Nothing to finish. Nothing to keep.</Text>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={styles.tinyShuffle}
                    onPress={shuffleTiny}
                    accessibilityRole="button"
                    accessibilityLabel="Show another small thing"
                  >
                    <AppIcon name="sparkles" size={12} color={CREAM} strokeWidth={1.8} />
                    <Text style={styles.tinyShuffleText}>Another</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </Animated.View>

            {/* A minute to play */}
            <Animated.View style={[styles.section, rise]}>
              <View style={styles.sectionHead}>
                <View>
                  <Text style={[styles.sectionTitle, { fontFamily: serif }]}>
                    A minute to play
                  </Text>
                  <Text style={styles.sectionSub}>
                    No score. No timer. Just a small patch of calm.
                  </Text>
                </View>
                <Text style={styles.sectionAside}>JUST FOR FUN</Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setGameOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Grow a little garden game"
              >
                <LinearGradient
                  colors={['#F2F9EC', '#E2F0D7', '#F3EBF9']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.gameCard}
                >
                  <View pointerEvents="none" style={styles.gameCardGlow} />

                  <View style={styles.gameCardText}>
                    <Text style={styles.gameCardEyebrow}>A QUIET GAME</Text>
                    <Text style={[styles.gameCardTitle, { fontFamily: serif }]}>
                      Grow a little garden
                    </Text>
                    <Text style={styles.gameCardSub}>
                      Tap the soil and watch it bloom. Nothing here can be lost.
                    </Text>

                    <View style={styles.gameCardCta}>
                      <Text style={styles.gameCardCtaText}>
                        {gardenBlooms > 0 ? 'Back to your garden' : 'Play a minute'}
                      </Text>
                      <AppIcon name="arrowRight" size={13} color={CREAM} strokeWidth={1.9} />
                    </View>
                  </View>

                  <View style={styles.gamePreview}>
                    {garden.map((stage, index) => {
                      const preview =
                        stage > 0 ? GARDEN_STAGES[stage] : GARDEN_PREVIEW[index];
                      return (
                        <View key={index} style={styles.gamePreviewTile}>
                          <AppIcon
                            name={preview.icon}
                            size={15}
                            color={preview.color}
                            strokeWidth={1.6}
                          />
                        </View>
                      );
                    })}
                  </View>
                </LinearGradient>
              </TouchableOpacity>
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
                        ? `${keptHabits} of ${allHabits.length} kept`
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

              {/* Quick chat before the day closes */}
              <View style={styles.quickChatCard}>
                <View style={styles.quickChatHead}>
                  <View style={styles.quickChatOrb}>
                    <AppIcon name="chat" size={15} color={TERRACOTTA} strokeWidth={1.6} />
                  </View>
                  <View style={styles.quickChatHeadText}>
                    <Text style={styles.quickChatEyebrow}>IF IT IS STILL LOUD</Text>
                    <Text style={[styles.quickChatTitle, { fontFamily: serif }]}>
                      Tell me one line.
                    </Text>
                  </View>
                </View>

                <View style={styles.quickChatRow}>
                  <TextInput
                    value={quickChatText}
                    onChangeText={setQuickChatText}
                    placeholder="Say it however it comes..."
                    placeholderTextColor="rgba(42, 32, 51, 0.3)"
                    style={styles.quickChatInput}
                    returnKeyType="send"
                    onSubmitEditing={sendQuickChat}
                    onFocus={() => {
                      setTimeout(() => {
                        scrollRef.current?.scrollToEnd({ animated: true });
                      }, 260);
                    }}
                    maxLength={300}
                  />
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={styles.quickChatSend}
                    onPress={sendQuickChat}
                    accessibilityRole="button"
                    accessibilityLabel="Continue this in chat"
                  >
                    <AppIcon name="arrowUp" size={15} color={CREAM} strokeWidth={2.1} />
                  </TouchableOpacity>
                </View>
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
          <KeyboardAvoidingView
            style={styles.habitsOverlay}
            behavior="padding"
          >
            <View style={styles.habitsSheet}>
              <LinearGradient
                colors={['#FDF9F3', '#F8F0E8', '#F1E8F5']}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.grabber} />

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.habitsScroll}
              >
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
                    {keptHabits} of {allHabits.length} kept today
                  </Text>
                  <View style={styles.habitsProgressTrack}>
                    <View
                      style={[
                        styles.habitsProgressFill,
                        {
                          width: `${
                            allHabits.length
                              ? (keptHabits / allHabits.length) * 100
                              : 0
                          }%`,
                        },
                      ]}
                    />
                  </View>
                </View>

                {allHabits.map((habit) => {
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
                      {habit.custom ? (
                        <TouchableOpacity
                          activeOpacity={0.7}
                          style={styles.habitRemove}
                          onPress={() => removeCustomHabit(habit.id)}
                          accessibilityRole="button"
                          accessibilityLabel={`Remove ${habit.title}`}
                        >
                          <AppIcon name="close" size={12} color={SOFT} strokeWidth={1.8} />
                        </TouchableOpacity>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}

                <View style={styles.habitAddBlock}>
                  <Text style={styles.habitAddLabel}>ADD YOUR OWN</Text>
                  <View style={styles.habitInputRow}>
                    <TextInput
                      value={habitDraft}
                      onChangeText={setHabitDraft}
                      onSubmitEditing={() => addCustomHabit(habitDraft)}
                      placeholder="Something small, just for you"
                      placeholderTextColor="rgba(42, 32, 51, 0.34)"
                      style={styles.habitInput}
                      returnKeyType="done"
                      maxLength={60}
                    />
                    <TouchableOpacity
                      activeOpacity={0.85}
                      style={[
                        styles.habitAddBtn,
                        !habitDraft.trim() && styles.habitAddBtnIdle,
                      ]}
                      onPress={() => addCustomHabit(habitDraft)}
                      accessibilityRole="button"
                      accessibilityLabel="Add habit"
                    >
                      <AppIcon
                        name="plus"
                        size={16}
                        color={CREAM}
                        strokeWidth={2}
                      />
                    </TouchableOpacity>
                  </View>

                  {habitSuggestions.length > 0 ? (
                    <View style={styles.habitChipRow}>
                      {habitSuggestions.map((suggestion) => (
                        <TouchableOpacity
                          key={suggestion}
                          activeOpacity={0.85}
                          style={styles.habitChip}
                          onPress={() => addCustomHabit(suggestion)}
                          accessibilityRole="button"
                          accessibilityLabel={`Add ${suggestion}`}
                        >
                          <AppIcon name="plus" size={10} color={TERRACOTTA} strokeWidth={2} />
                          <Text style={styles.habitChipText}>{suggestion}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : null}
                </View>

                <Text style={[styles.habitsFooter, { fontFamily: serifItalic }]}>
                  Come back tomorrow, gently.
                </Text>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
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
            behavior="padding"
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
            behavior="padding"
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

        {/* A quiet game */}
        <Modal
          visible={gameOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setGameOpen(false)}
        >
          <View style={styles.habitsOverlay}>
            <View style={styles.habitsSheet}>
              <LinearGradient
                colors={['#F4F9F1', '#E8F1E4', '#F4EEF9']}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.grabber} />

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.habitsScroll}
              >
                <View style={styles.habitsHeader}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={styles.habitsEyebrow}>A QUIET GAME</Text>
                    <Text style={[styles.habitsTitle, { fontFamily: serif }]}>
                      Grow a little garden
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.habitsCloseBtn}
                    onPress={() => setGameOpen(false)}
                    accessibilityRole="button"
                    accessibilityLabel="Close the garden"
                  >
                    <AppIcon name="close" size={15} color={SOFT} strokeWidth={1.8} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.habitsSub}>
                  Tap a patch of soil and watch it grow. There is no score, no timer, and
                  nothing here can be lost.
                </Text>

                <View style={styles.gardenGrid}>
                  {garden.map((stage, index) => {
                    const meta = GARDEN_STAGES[stage];
                    return (
                      <TouchableOpacity
                        key={index}
                        activeOpacity={0.8}
                        style={styles.gardenTile}
                        onPress={() => growGarden(index)}
                        accessibilityRole="button"
                        accessibilityLabel={`Garden patch ${index + 1}`}
                      >
                        <AppIcon
                          name={meta.icon}
                          size={stage === 0 ? 12 : 28}
                          color={meta.color}
                          strokeWidth={1.5}
                        />
                        {stage === 0 ? (
                          <Text style={styles.gardenTapHint}>tap</Text>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.gardenFootRow}>
                  <Text style={styles.gardenProgress}>
                    {gardenBlooms > 0
                      ? `${gardenBlooms} of 9 in bloom`
                      : gardenGrowing > 0
                      ? `${gardenGrowing} of 9 growing`
                      : 'Nothing planted yet'}
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.gardenReset}
                    onPress={resetGarden}
                    accessibilityRole="button"
                    accessibilityLabel="Start the garden again"
                  >
                    <Text style={styles.gardenResetText}>Start again</Text>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.habitsFooter, { fontFamily: serifItalic }]}>
                  {gardenBlooms === 9
                    ? 'Every patch is in bloom. You did that, gently.'
                    : 'Stay as long as you like. The garden keeps waiting.'}
                </Text>
              </ScrollView>
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
  mobilePhoneFrame: { width: '100%', flex: 1 },
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

  // Companion hero
  heroCardWrap: {
    marginTop: 20,
    marginBottom: 6,
    borderRadius: 30,
    shadowColor: '#B0664A',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.14,
    shadowRadius: 28,
    elevation: 5,
  },
  heroUnfold: {
    borderRadius: 30,
    overflow: 'hidden',
  },
  messenger: {
    position: 'absolute',
    top: -32,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  messengerEnvelope: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(176, 102, 74, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },
  heroCard: {
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.92)',
    paddingVertical: 20,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  heroGlowA: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    top: -120,
    right: -70,
    backgroundColor: 'rgba(233, 185, 160, 0.34)',
  },
  heroGlowB: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    bottom: -110,
    left: -70,
    backgroundColor: 'rgba(196, 167, 232, 0.20)',
  },
  heroTopRow: { flexDirection: 'row', alignItems: 'center' },
  heroAvatarWrap: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  heroAvatarHalo: {
    position: 'absolute',
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
  },
  heroAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    backgroundColor: '#F7EEE4',
  },
  heroLiveDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    right: 0,
    bottom: 1,
    backgroundColor: SAGE,
    borderWidth: 2,
    borderColor: '#FFF7EF',
  },
  heroTopText: { flex: 1, minWidth: 0 },
  heroBrand: {
    fontSize: 9.5,
    letterSpacing: 3.4,
    fontWeight: '700',
    color: 'rgba(42, 32, 51, 0.6)',
  },
  heroLive: {
    fontSize: 10.5,
    color: 'rgba(42, 32, 51, 0.44)',
    marginTop: 3,
    letterSpacing: 0.2,
  },
  heroMomentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.75)',
  },
  heroMomentText: {
    fontSize: 8.5,
    letterSpacing: 1,
    fontWeight: '700',
    color: TERRACOTTA,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  heroGreeting: {
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.6,
    color: INK,
    marginTop: 18,
  },
  heroSub: {
    fontSize: 13.5,
    lineHeight: 20,
    color: MUTED,
    marginTop: 8,
    maxWidth: 300,
    letterSpacing: 0.1,
  },
  heroChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 14,
  },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    marginRight: 7,
    marginBottom: 7,
  },
  heroChipText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: 'rgba(42, 32, 51, 0.62)',
    marginLeft: 5,
    letterSpacing: 0.1,
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 13,
  },
  heroPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TERRACOTTA,
    paddingLeft: 18,
    paddingRight: 20,
    height: 48,
    borderRadius: 999,
    shadowColor: TERRACOTTA,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
    elevation: 3,
  },
  heroPrimaryText: {
    color: CREAM,
    fontSize: 15,
    letterSpacing: 0.1,
    marginLeft: 8,
  },
  heroSpeak: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(176, 102, 74, 0.22)',
  },
  heroSpeakText: {
    marginLeft: 6,
    fontSize: 12.5,
    fontWeight: '600',
    color: TERRACOTTA,
    letterSpacing: 0.2,
  },

  // One small thing
  tinyWrap: {
    marginBottom: 26,
  },
  tinyCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.92)',
    paddingVertical: 18,
    paddingHorizontal: 18,
    overflow: 'hidden',
    shadowColor: '#B0664A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: 2,
  },
  tinyGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    top: -110,
    right: -60,
    backgroundColor: 'rgba(196, 167, 232, 0.22)',
  },
  tinyTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  tinyBadge: { flexDirection: 'row', alignItems: 'center' },
  tinyEyebrow: {
    fontSize: 8.5,
    letterSpacing: 1.4,
    fontWeight: '700',
    color: TERRACOTTA,
    marginLeft: 5,
  },
  tinyAside: {
    fontSize: 8.5,
    letterSpacing: 1.2,
    fontWeight: '700',
    color: 'rgba(42, 32, 51, 0.35)',
  },
  tinyText: {
    fontSize: 20,
    lineHeight: 28,
    color: INK,
    letterSpacing: -0.2,
  },
  tinyFootRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  tinyFoot: {
    flex: 1,
    fontSize: 10.5,
    color: MUTED,
    marginRight: 10,
  },
  tinyShuffle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TERRACOTTA,
    paddingHorizontal: 13,
    height: 34,
    borderRadius: 999,
  },
  tinyShuffleText: {
    color: CREAM,
    fontSize: 11.5,
    fontWeight: '600',
    marginLeft: 5,
  },

  // Quick chat before wind-down
  quickChatCard: {
    marginTop: 14,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.92)',
    backgroundColor: 'rgba(255, 250, 244, 0.82)',
    paddingVertical: 16,
    paddingHorizontal: 16,
    shadowColor: '#B0664A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    elevation: 2,
  },
  quickChatHead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickChatOrb: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(176, 102, 74, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  quickChatHeadText: { flex: 1 },
  quickChatEyebrow: {
    fontSize: 8.5,
    letterSpacing: 1.4,
    fontWeight: '700',
    color: TERRACOTTA,
  },
  quickChatTitle: {
    fontSize: 19,
    color: INK,
    marginTop: 2,
    letterSpacing: -0.2,
  },
  quickChatRow: { flexDirection: 'row', alignItems: 'center' },
  quickChatInput: {
    flex: 1,
    height: 44,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(176, 102, 74, 0.16)',
    paddingHorizontal: 16,
    fontSize: 13.5,
    color: INK,
    marginRight: 9,
  },
  quickChatSend: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: TERRACOTTA,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Garden game card
  gameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 18,
    paddingHorizontal: 18,
    overflow: 'hidden',
    shadowColor: '#6F8F6B',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 3,
  },
  gameCardGlow: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    top: -110,
    right: -60,
    backgroundColor: 'rgba(140, 90, 168, 0.14)',
  },
  gameCardText: { flex: 1, paddingRight: 10 },
  gameCardEyebrow: {
    fontSize: 8.5,
    letterSpacing: 1.8,
    fontWeight: '700',
    color: SAGE,
    marginBottom: 6,
  },
  gameCardTitle: {
    fontSize: 22,
    lineHeight: 27,
    letterSpacing: -0.4,
    color: INK,
  },
  gameCardSub: {
    fontSize: 11.5,
    lineHeight: 17,
    color: MUTED,
    marginTop: 6,
  },
  gameCardCta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#4F7C6B',
    paddingLeft: 14,
    paddingRight: 12,
    height: 36,
    borderRadius: 999,
    marginTop: 12,
  },
  gameCardCtaText: {
    color: CREAM,
    fontSize: 11.5,
    fontWeight: '600',
    letterSpacing: 0.2,
    marginRight: 8,
  },
  gamePreview: {
    width: 96,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gamePreviewTile: {
    width: 28,
    height: 28,
    borderRadius: 10,
    marginBottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
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
    backgroundColor: 'rgba(255, 253, 248, 0.78)',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 18,
    paddingHorizontal: 18,
    shadowColor: '#B0664A',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.06,
    shadowRadius: 26,
    elevation: 3,
  },
  noteHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  noteHeadText: {
    flex: 1,
    marginLeft: 8,
    minWidth: 0,
  },
  noteHeadSub: {
    fontSize: 12,
    color: 'rgba(42, 32, 51, 0.42)',
    marginTop: 3,
    letterSpacing: 0.1,
  },
  noteBody: { marginTop: 14 },
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
    maxHeight: '88%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 22,
    overflow: 'hidden',
    shadowColor: '#B0664A',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.14,
    shadowRadius: 26,
    elevation: 12,
  },
  habitsScroll: { paddingBottom: 8 },
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
  habitRemove: {
    width: 26,
    height: 26,
    borderRadius: 13,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(42, 32, 51, 0.05)',
  },
  habitAddBlock: { marginTop: 12 },
  habitAddLabel: {
    fontSize: 8.5,
    letterSpacing: 2,
    fontWeight: '700',
    color: TERRACOTTA,
    marginBottom: 8,
  },
  habitInputRow: { flexDirection: 'row', alignItems: 'center' },
  habitInput: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    paddingHorizontal: 15,
    fontSize: 13,
    color: INK,
    backgroundColor: 'rgba(255, 253, 248, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  habitAddBtn: {
    width: 46,
    height: 46,
    borderRadius: 16,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TERRACOTTA,
  },
  habitAddBtnIdle: { opacity: 0.4 },
  habitChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  habitChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(176, 102, 74, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(176, 102, 74, 0.16)',
    marginRight: 7,
    marginBottom: 7,
  },
  habitChipText: {
    fontSize: 11,
    color: 'rgba(42, 32, 51, 0.72)',
    marginLeft: 5,
    letterSpacing: 0.1,
  },
  habitsFooter: {
    marginTop: 14,
    fontSize: 12.5,
    color: SOFT,
    textAlign: 'center',
    letterSpacing: 0.1,
  },

  // Little garden game
  gardenGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  gardenTile: {
    width: '31.5%',
    aspectRatio: 1,
    borderRadius: 22,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 253, 248, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  gardenTapHint: {
    marginTop: 5,
    fontSize: 8.5,
    letterSpacing: 1.2,
    fontWeight: '700',
    color: 'rgba(176, 102, 74, 0.42)',
    textTransform: 'uppercase',
  },
  gardenFootRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  gardenProgress: {
    fontSize: 11,
    fontWeight: '700',
    color: SAGE,
    letterSpacing: 0.4,
  },
  gardenReset: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(111, 143, 107, 0.2)',
  },
  gardenResetText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#4F7C6B',
    letterSpacing: 0.2,
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
