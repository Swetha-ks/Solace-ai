import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Animated,
  Easing,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import {
  useFonts,
  Fraunces_600SemiBold,
  Fraunces_600SemiBold_Italic,
} from '@expo-google-fonts/fraunces';
import AppIcon from '../components/AppIcon';
import { authApi, insightsApi, conversationsApi } from '../lib/api';
import {
  isRemindersEnabled,
  enableReminders,
  disableReminders,
} from '../lib/notifications';

const INK = '#2A2033';
const MUTED = 'rgba(42, 32, 51, 0.62)';
const SOFT = 'rgba(42, 32, 51, 0.42)';
const FAINT = 'rgba(42, 32, 51, 0.30)';
const CREAM = '#FDF9F3';
const TERRACOTTA = '#B0664A';
const LILAC = '#8C5AA8';
const SAGE = '#6F8F6B';

const MANTRA_KEY = '@solace_my_mantra';

const MOOD_META = {
  joyful: { icon: 'sun', label: 'Joyful', accent: '#B0703C', soft: 'rgba(176, 112, 60, 0.13)' },
  calm: { icon: 'leaf', label: 'Calm', accent: '#5F7D59', soft: 'rgba(95, 125, 89, 0.13)' },
  okay: { icon: 'cloud', label: 'Okay', accent: '#5C719C', soft: 'rgba(92, 113, 156, 0.13)' },
  tired: { icon: 'moon', label: 'Tired', accent: '#8C5AA8', soft: 'rgba(140, 90, 168, 0.13)' },
  anxious: { icon: 'rain', label: 'Anxious', accent: '#B0664A', soft: 'rgba(176, 102, 74, 0.13)' },
};

function pad(value) {
  return String(value).padStart(2, '0');
}

function buildWeek(last7Days) {
  const byDate = {};
  (last7Days || []).forEach((entry) => {
    byDate[entry.date] = entry.mood;
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - offset);
    const key = `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
    days.push({
      key,
      letter: day
        .toLocaleDateString('en-GB', { weekday: 'narrow' })
        .toUpperCase(),
      mood: byDate[key] || null,
      isToday: offset === 0,
    });
  }
  return days;
}

function memberSince(value) {
  if (!value) return '';
  const iso = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

function CompanionLight() {
  const breath = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1,
          duration: 3800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breath, {
          toValue: 0,
          duration: 3800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <View style={styles.avatarStage}>
      <Animated.View
        style={[
          styles.avatarHalo,
          {
            opacity: breath.interpolate({ inputRange: [0, 1], outputRange: [0.16, 0.3] }),
            transform: [
              { scale: breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] }) },
            ],
          },
        ]}
      />
      <LinearGradient
        colors={['#F5D5BE', '#D9C3EC']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={styles.avatarCore}
      >
        <AppIcon name="feather" size={24} color="#FFFBF6" strokeWidth={1.1} />
      </LinearGradient>
    </View>
  );
}

export default function ProfileScreen({ onSignOut, onOpenChat, onOpenBreathing, onOpenHome }) {
  const [fontsLoaded] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_600SemiBold_Italic,
  });

  const serif = fontsLoaded ? 'Fraunces_600SemiBold' : 'Georgia, "Times New Roman", serif';
  const serifItalic = fontsLoaded
    ? 'Fraunces_600SemiBold_Italic'
    : 'Georgia, "Times New Roman", serif';

  const [user, setUser] = useState(null);
  const [insights, setInsights] = useState(null);
  const [conversationCount, setConversationCount] = useState(0);
  const [mantra, setMantra] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState(null);

  const [remindersOn, setRemindersOn] = useState(false);
  const [reminderBusy, setReminderBusy] = useState(false);
  const [reminderNote, setReminderNote] = useState(null);

  const reveal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(reveal, {
      toValue: 1,
      duration: 780,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  const rise = {
    opacity: reveal,
    transform: [
      { translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
    ],
  };

  const load = async () => {
    try {
      const [meResult, summary] = await Promise.all([
        authApi.me(),
        insightsApi.get(),
      ]);
      setUser(meResult.user);
      setInsights(summary);
      setError(null);
    } catch (e) {
      setError(e.message);
    }

    try {
      const { conversations } = await conversationsApi.list();
      setConversationCount(Array.isArray(conversations) ? conversations.length : 0);
    } catch (e) {}

    try {
      const savedMantra = await AsyncStorage.getItem(MANTRA_KEY);
      if (savedMantra) setMantra(savedMantra);
    } catch (e) {}

    try {
      setRemindersOn(await isRemindersEnabled());
    } catch (e) {}
  };

  const toggleReminders = async () => {
    if (reminderBusy) return;
    setReminderBusy(true);
    setReminderNote(null);

    try {
      if (remindersOn) {
        await disableReminders();
        setRemindersOn(false);
        setReminderNote('Reminders are off. You can bring them back anytime.');
      } else {
        const result = await enableReminders();
        if (result.granted) {
          setRemindersOn(true);
          setReminderNote('Three soft reminders are set for your day.');
        } else if (!result.supported) {
          setRemindersOn(false);
          setReminderNote('Reminders live in the phone app. This web preview cannot show them.');
        } else {
          setRemindersOn(false);
          setReminderNote(
            'Notifications are off in your device settings, so I cannot reach you yet.'
          );
        }
      }
    } catch (e) {
      setReminderNote('That did not save. Try once more.');
    } finally {
      setReminderBusy(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      await load();
      if (mounted) setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const openEditor = (mode) => {
    setEditing(mode);
    setDraft(mode === 'name' ? user?.name || '' : mantra);
    setEditError(null);
  };

  const closeEditor = () => {
    if (saving) return;
    setEditing(null);
    setDraft('');
    setEditError(null);
  };

  const saveEditor = async () => {
    const value = draft.trim();
    setSaving(true);
    setEditError(null);

    try {
      if (editing === 'name') {
        if (!value) {
          setEditError('A name helps me know you. Even a nickname is enough.');
          setSaving(false);
          return;
        }
        const { user: updated } = await authApi.updateName(value);
        setUser((prev) => ({ ...prev, ...updated }));
      } else {
        await AsyncStorage.setItem(MANTRA_KEY, value);
        setMantra(value);
      }

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {}

      setEditing(null);
      setDraft('');
    } catch (e) {
      setEditError(e.message || 'That did not save. Try once more.');
    } finally {
      setSaving(false);
    }
  };

  const week = buildWeek(insights?.last7Days);
  const daysWithMood = week.filter((day) => day.mood).length;
  const totalMoods = insights?.moodCounts?.reduce((sum, item) => sum + item.count, 0) || 0;
  const displayName = user?.name || 'friend';
  const firstName = displayName.split(' ')[0];
  const todayLine = new Date()
    .toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
    .toUpperCase();

  const mantraText = mantra || insights?.affirmation || 'I am allowed to begin again, gently.';
  const isOwnMantra = Boolean(mantra);

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#FDF9F3', '#F8F0E8', '#F2E9F4']} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={[styles.orb, styles.orbTop]} />
      <View pointerEvents="none" style={[styles.orb, styles.orbBottom]} />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={TERRACOTTA}
              colors={[TERRACOTTA]}
            />
          }
        >
          {/* Quiet brand line */}
          <View style={styles.topBar}>
            <Text style={styles.wordmark}>SOLACE</Text>
            <View style={styles.topRule} />
            <Text style={styles.topNote}>your space</Text>
          </View>

          {/* Hero */}
          <Animated.View style={[styles.hero, rise]}>
            <Text style={styles.eyebrow}>{todayLine}</Text>
            <Text style={[styles.title, { fontFamily: serif }]}>This is all</Text>
            <Text style={[styles.titleAccent, { fontFamily: serifItalic }]}>yours.</Text>
            <Text style={styles.subtitle}>No performance here. Just your own quiet corner.</Text>
          </Animated.View>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={TERRACOTTA} />
              <Text style={styles.loadingText}>Opening your space...</Text>
            </View>
          ) : (
            <>
              {/* Identity */}
              <Animated.View style={[styles.identityCard, rise]}>
                <CompanionLight />

                <View style={styles.identityInfo}>
                  <Text style={styles.identityLabel}>
                    {user?.isGuest ? 'A GUEST, WELCOME TO STAY' : 'SIGNED IN AS'}
                  </Text>
                  <Text style={[styles.name, { fontFamily: serif }]} numberOfLines={1}>
                    {displayName}
                  </Text>
                  <Text style={styles.identitySub} numberOfLines={1}>
                    {user?.isGuest ? 'Nothing here is tied to an email' : user?.email}
                  </Text>
                  {user?.createdAt ? (
                    <Text style={styles.identitySince}>
                      With Solace since {memberSince(user.createdAt)}
                    </Text>
                  ) : null}
                </View>

                <TouchableOpacity
                  style={styles.editNameBtn}
                  activeOpacity={0.8}
                  onPress={() => openEditor('name')}
                  accessibilityRole="button"
                  accessibilityLabel="Change your name"
                >
                  <AppIcon name="pen" size={14} color={TERRACOTTA} strokeWidth={1.7} />
                </TouchableOpacity>
              </Animated.View>

              {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

              {/* Stats */}
              <Animated.View style={[styles.statsCard, rise]}>
                <View style={styles.statCell}>
                  <Text style={[styles.statValue, { fontFamily: serif }]}>
                    {insights?.streak ?? 0}
                  </Text>
                  <Text style={styles.statLabel}>DAY STREAK</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCell}>
                  <Text style={[styles.statValue, { fontFamily: serif }]}>
                    {insights?.totalCheckIns ?? 0}
                  </Text>
                  <Text style={styles.statLabel}>CHECK-INS</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCell}>
                  <Text style={[styles.statValue, { fontFamily: serif }]}>
                    {conversationCount}
                  </Text>
                  <Text style={styles.statLabel}>CONVERSATIONS</Text>
                </View>
              </Animated.View>

              {/* Week */}
              <Animated.View style={[styles.section, rise]}>
                <View style={styles.sectionHead}>
                  <View>
                    <Text style={[styles.sectionTitle, { fontFamily: serif }]}>This week</Text>
                    <Text style={styles.sectionSub}>A gentle look at how your heart has been.</Text>
                  </View>
                  <Text style={styles.sectionAside}>
                    {daysWithMood} of 7 days
                  </Text>
                </View>

                <View style={styles.weekCard}>
                  {week.map((day) => {
                    const meta = day.mood ? MOOD_META[day.mood] : null;
                    return (
                      <View key={day.key} style={styles.weekDay}>
                        <Text style={[styles.weekLetter, day.isToday && styles.weekLetterToday]}>
                          {day.letter}
                        </Text>
                        <View
                          style={[
                            styles.weekDot,
                            meta && { backgroundColor: meta.soft, borderColor: meta.accent },
                            day.isToday && !meta && { borderColor: 'rgba(176, 102, 74, 0.55)' },
                            day.isToday && meta && { borderWidth: 1.5 },
                          ]}
                        >
                          {meta ? (
                            <AppIcon name={meta.icon} size={14} color={meta.accent} strokeWidth={1.5} />
                          ) : (
                            <View style={styles.weekDotEmpty} />
                          )}
                        </View>
                        <Text style={styles.weekName}>
                          {day.isToday ? 'Today' : meta ? meta.label : ''}
                        </Text>
                      </View>
                    );
                  })}
                </View>

                <Text style={styles.weekCaption}>
                  {daysWithMood === 0
                    ? 'No check-ins yet this week. There is no wrong time to begin.'
                    : daysWithMood >= 6
                    ? 'Almost every day, you stopped to notice yourself. That matters.'
                    : 'One honest moment is enough. The rest can wait.'}
                </Text>
              </Animated.View>

              {/* Mood mix */}
              <Animated.View style={[styles.section, rise]}>
                <View style={styles.sectionHead}>
                  <View>
                    <Text style={[styles.sectionTitle, { fontFamily: serif }]}>Your mood mix</Text>
                    <Text style={styles.sectionSub}>Every feeling you have named so far.</Text>
                  </View>
                </View>

                {insights?.moodCounts?.length ? (
                  <View style={styles.moodMixCard}>
                    {insights.moodCounts.map((item) => {
                      const meta =
                        MOOD_META[item.mood] || {
                          icon: 'circle',
                          label: item.mood,
                          accent: LILAC,
                          soft: 'rgba(140, 90, 168, 0.12)',
                        };
                      const pct = totalMoods
                        ? Math.max(10, Math.round((item.count / totalMoods) * 100))
                        : 0;
                      return (
                        <View key={item.mood} style={styles.moodRow}>
                          <View style={styles.moodLabelWrap}>
                            <AppIcon name={meta.icon} size={13} color={meta.accent} strokeWidth={1.6} />
                            <Text style={styles.moodLabel}>{meta.label}</Text>
                          </View>
                          <View style={styles.moodBarTrack}>
                            <View
                              style={[
                                styles.moodBarFill,
                                { width: `${pct}%`, backgroundColor: meta.accent },
                              ]}
                            />
                          </View>
                          <Text style={styles.moodCount}>{item.count}</Text>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={styles.emptyText}>
                    Check in with your heart on the home screen and your mood mix will appear
                    here.
                  </Text>
                )}
              </Animated.View>

              {/* Own mantra */}
              <Animated.View style={[styles.mantraCard, rise]}>
                <View style={styles.mantraHead}>
                  <AppIcon name="sparkles" size={12} color={TERRACOTTA} strokeWidth={1.6} />
                  <Text style={styles.mantraLabel}>A LINE TO COME BACK TO</Text>
                </View>
                <Text style={[styles.mantraText, { fontFamily: serifItalic }]}>
                  {mantraText}
                </Text>
                <View style={styles.mantraFoot}>
                  <Text style={styles.mantraNote}>
                    {isOwnMantra ? 'Your own words' : 'Today\'s affirmation'}
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.mantraAction}
                    onPress={() => openEditor('mantra')}
                    accessibilityRole="button"
                    accessibilityLabel="Write your own line"
                  >
                    <Text style={styles.mantraActionText}>
                      {isOwnMantra ? 'Rewrite it' : 'Write your own'}
                    </Text>
                    <AppIcon name="arrowRight" size={13} color={TERRACOTTA} strokeWidth={1.8} />
                  </TouchableOpacity>
                </View>
              </Animated.View>

              {/* Quiet toolkit */}
              <Animated.View style={[styles.section, rise]}>
                <Text style={[styles.sectionTitle, { fontFamily: serif }]}>Your quiet toolkit</Text>
                <Text style={styles.sectionSub}>Ways back to yourself, whenever you need one.</Text>

                <TouchableOpacity
                  activeOpacity={0.9}
                  style={styles.toolCard}
                  onPress={onOpenChat}
                  accessibilityRole="button"
                  accessibilityLabel="Talk with Solace"
                >
                  <View style={[styles.toolIcon, { backgroundColor: 'rgba(176, 102, 74, 0.10)' }]}>
                    <AppIcon name="chat" size={18} color={TERRACOTTA} strokeWidth={1.5} />
                  </View>
                  <View style={styles.toolInfo}>
                    <Text style={styles.toolTitle}>Talk it out</Text>
                    <Text style={styles.toolSub}>Say it however it comes</Text>
                  </View>
                  <AppIcon name="chevronRight" size={16} color="rgba(42, 32, 51, 0.22)" />
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.9}
                  style={[styles.toolCard, styles.toolCardSpacing]}
                  onPress={onOpenBreathing}
                  accessibilityRole="button"
                  accessibilityLabel="Two minutes of breathing"
                >
                  <View style={[styles.toolIcon, { backgroundColor: 'rgba(111, 143, 107, 0.12)' }]}>
                    <AppIcon name="wind" size={18} color={SAGE} strokeWidth={1.5} />
                  </View>
                  <View style={styles.toolInfo}>
                    <Text style={styles.toolTitle}>Two minutes of breathing</Text>
                    <Text style={styles.toolSub}>Slow the body, soften the mind</Text>
                  </View>
                  <AppIcon name="chevronRight" size={16} color="rgba(42, 32, 51, 0.22)" />
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.9}
                  style={[styles.toolCard, styles.toolCardSpacing]}
                  onPress={onOpenHome}
                  accessibilityRole="button"
                  accessibilityLabel="Check in on the home screen"
                >
                  <View style={[styles.toolIcon, { backgroundColor: 'rgba(140, 90, 168, 0.10)' }]}>
                    <AppIcon name="heart" size={18} color={LILAC} strokeWidth={1.5} />
                  </View>
                  <View style={styles.toolInfo}>
                    <Text style={styles.toolTitle}>Today&apos;s check-in</Text>
                    <Text style={styles.toolSub}>One honest tap, then let it be</Text>
                  </View>
                  <AppIcon name="chevronRight" size={16} color="rgba(42, 32, 51, 0.22)" />
                </TouchableOpacity>
              </Animated.View>

              {/* Gentle reminders */}
              <Animated.View style={[styles.section, rise]}>
                <Text style={[styles.sectionTitle, { fontFamily: serif }]}>
                  Gentle reminders
                </Text>
                <Text style={styles.sectionSub}>
                  A soft nudge back to yourself, three times a day.
                </Text>

                <View style={[styles.toolCard, styles.reminderCard]}>
                  <View
                    style={[styles.toolIcon, { backgroundColor: 'rgba(176, 102, 74, 0.10)' }]}
                  >
                    <AppIcon name="bell" size={18} color={TERRACOTTA} strokeWidth={1.5} />
                  </View>
                  <View style={styles.toolInfo}>
                    <Text style={styles.toolTitle}>
                      {remindersOn ? 'Reminders are on' : 'Reminders are off'}
                    </Text>
                    <Text style={styles.toolSub}>Morning, afternoon, and night</Text>
                  </View>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={toggleReminders}
                    style={[
                      styles.switchTrack,
                      remindersOn && styles.switchTrackOn,
                      reminderBusy && styles.switchBusy,
                    ]}
                    accessibilityRole="switch"
                    accessibilityState={{ checked: remindersOn }}
                    accessibilityLabel="Gentle reminders"
                  >
                    <View style={[styles.switchKnob, remindersOn && styles.switchKnobOn]} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.reminderTimes}>
                  9:00 in the morning · 3:00 in the afternoon · 9:30 at night
                </Text>
                {reminderNote ? <Text style={styles.reminderNote}>{reminderNote}</Text> : null}
              </Animated.View>

              {/* Privacy */}
              <Animated.View style={[styles.privacyCard, rise]}>
                <View style={styles.privacyIcon}>
                  <AppIcon name="lock" size={15} color={MUTED} strokeWidth={1.6} />
                </View>
                <View style={styles.privacyInfo}>
                  <Text style={styles.privacyTitle}>Just between us</Text>
                  <Text style={styles.privacySub}>
                    Your conversations belong to this account. Nothing is shared, sold or
                    shown to anyone else.
                  </Text>
                </View>
              </Animated.View>

              <TouchableOpacity
                style={styles.signOutBtn}
                activeOpacity={0.85}
                onPress={() => {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  } catch (e) {}
                  onSignOut();
                }}
                accessibilityRole="button"
                accessibilityLabel="Sign out"
              >
                <AppIcon name="logout" size={14} color="rgba(42, 32, 51, 0.45)" strokeWidth={1.6} />
                <Text style={styles.signOutText}>Sign out of this space</Text>
              </TouchableOpacity>

              <Text style={[styles.footerNote, { fontFamily: serifItalic }]}>
                You are not alone in this.
              </Text>
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Small editor sheet, used for both name and mantra */}
      <Modal visible={editing !== null} transparent animationType="fade" onRequestClose={closeEditor}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalAlign}
          >
            <View style={styles.editorSheet}>
              <LinearGradient
                colors={['#FDF9F3', '#F8F0E8', '#F1E8F5']}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.grabber} />

              <Text style={styles.editorLabel}>
                {editing === 'name' ? 'YOUR NAME' : 'YOUR OWN WORDS'}
              </Text>
              <Text style={[styles.editorTitle, { fontFamily: serif }]}>
                {editing === 'name' ? 'What should I call you?' : 'A line to come back to.'}
              </Text>
              <Text style={styles.editorSub}>
                {editing === 'name'
                  ? 'However you would like to be met.'
                  : 'Something you want to remember on the harder days.'}
              </Text>

              <TextInput
                value={draft}
                onChangeText={(text) => {
                  setDraft(text);
                  if (editError) setEditError(null);
                }}
                autoFocus
                multiline={editing === 'mantra'}
                maxLength={editing === 'name' ? 40 : 140}
                placeholder={editing === 'name' ? 'Your name or nickname' : 'Write it gently...'}
                placeholderTextColor="rgba(42, 32, 51, 0.28)"
                style={[styles.editorInput, editing === 'mantra' && styles.editorInputMultiline]}
                returnKeyType="done"
                onSubmitEditing={editing === 'name' ? saveEditor : undefined}
              />

              {editError ? <Text style={styles.editorError}>{editError}</Text> : null}

              <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.editorSave, saving && styles.editorSaveBusy]}
                onPress={saveEditor}
                disabled={saving}
                accessibilityRole="button"
                accessibilityLabel="Save"
              >
                <Text style={[styles.editorSaveText, { fontFamily: serif }]}>
                  {saving ? 'Saving...' : 'Keep this'}
                </Text>
                <View style={styles.editorSaveCircle}>
                  <AppIcon name="arrowRight" size={14} color={CREAM} strokeWidth={1.8} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={closeEditor}
                style={styles.editorCancel}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text style={styles.editorCancelText}>Not now</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CREAM },
  safeArea: { flex: 1, alignItems: 'center' },
  scrollContent: {
    width: '100%',
    maxWidth: 430,
    paddingHorizontal: 24,
    paddingTop: 6,
    paddingBottom: 40,
  },

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

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
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

  hero: { marginTop: 26, marginBottom: 20 },
  eyebrow: {
    fontSize: 9.5,
    letterSpacing: 2.2,
    fontWeight: '700',
    color: TERRACOTTA,
    marginBottom: 10,
  },
  title: { fontSize: 38, lineHeight: 42, letterSpacing: -0.8, color: INK },
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

  loadingWrap: { paddingVertical: 60, alignItems: 'center' },
  loadingText: {
    marginTop: 12,
    fontSize: 11.5,
    color: SOFT,
    letterSpacing: 0.2,
    fontStyle: 'italic',
  },

  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
  avatarStage: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHalo: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(233, 185, 160, 0.55)',
  },
  avatarCore: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityInfo: { flex: 1, marginLeft: 12 },
  identityLabel: {
    fontSize: 8.5,
    letterSpacing: 1.8,
    fontWeight: '700',
    color: SOFT,
    marginBottom: 6,
  },
  name: { fontSize: 22, lineHeight: 27, color: INK, letterSpacing: -0.3 },
  identitySub: { fontSize: 11.5, color: MUTED, marginTop: 4, letterSpacing: 0.1 },
  identitySince: {
    fontSize: 10,
    color: FAINT,
    marginTop: 5,
    letterSpacing: 0.2,
    fontStyle: 'italic',
  },
  editNameBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(176, 102, 74, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(176, 102, 74, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  errorBanner: {
    fontSize: 11,
    color: '#A45A5A',
    marginTop: 10,
    lineHeight: 17,
  },

  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 253, 248, 0.72)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 16,
    marginTop: 14,
  },
  statCell: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 26, lineHeight: 30, color: INK, letterSpacing: -0.5 },
  statLabel: {
    fontSize: 8,
    letterSpacing: 1.4,
    fontWeight: '700',
    color: SOFT,
    marginTop: 5,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(42, 32, 51, 0.08)',
  },

  section: { marginTop: 28 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 23, lineHeight: 28, letterSpacing: -0.3, color: INK },
  sectionSub: { fontSize: 12, color: SOFT, marginTop: 4, letterSpacing: 0.1 },
  sectionAside: {
    fontSize: 9.5,
    color: 'rgba(42, 32, 51, 0.38)',
    letterSpacing: 0.4,
    marginBottom: 4,
  },

  weekCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 253, 248, 0.72)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  weekDay: { alignItems: 'center', width: '13.5%' },
  weekLetter: {
    fontSize: 8.5,
    letterSpacing: 1,
    fontWeight: '700',
    color: 'rgba(42, 32, 51, 0.32)',
    marginBottom: 8,
  },
  weekLetterToday: { color: TERRACOTTA },
  weekDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(42, 32, 51, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDotEmpty: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(42, 32, 51, 0.14)',
  },
  weekName: {
    fontSize: 8.5,
    color: 'rgba(42, 32, 51, 0.42)',
    marginTop: 7,
    letterSpacing: 0.1,
  },
  weekCaption: {
    fontSize: 11,
    lineHeight: 17,
    color: SOFT,
    marginTop: 10,
    marginLeft: 4,
    letterSpacing: 0.1,
    fontStyle: 'italic',
  },

  moodMixCard: {
    backgroundColor: 'rgba(255, 253, 248, 0.72)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  moodRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  moodLabelWrap: { width: 92, flexDirection: 'row', alignItems: 'center' },
  moodLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: INK,
    marginLeft: 7,
    letterSpacing: 0.1,
  },
  moodBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(42, 32, 51, 0.06)',
    overflow: 'hidden',
    marginHorizontal: 9,
  },
  moodBarFill: { height: '100%', borderRadius: 3 },
  moodCount: {
    width: 22,
    textAlign: 'right',
    fontSize: 11,
    fontWeight: '600',
    color: SOFT,
  },
  emptyText: { fontSize: 12.5, color: SOFT, lineHeight: 19, letterSpacing: 0.1 },

  mantraCard: {
    marginTop: 26,
    backgroundColor: 'rgba(255, 253, 248, 0.72)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    borderLeftWidth: 2,
    borderLeftColor: TERRACOTTA,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  mantraHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 7 },
  mantraLabel: {
    fontSize: 8.5,
    letterSpacing: 2,
    fontWeight: '700',
    color: TERRACOTTA,
    marginLeft: 6,
  },
  mantraText: { fontSize: 18, lineHeight: 26, color: INK, letterSpacing: -0.2 },
  mantraFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  mantraNote: { fontSize: 9.5, color: FAINT, letterSpacing: 0.3 },
  mantraAction: { flexDirection: 'row', alignItems: 'center', paddingVertical: 2 },
  mantraActionText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: TERRACOTTA,
    letterSpacing: 0.2,
    marginRight: 5,
  },

  toolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 253, 248, 0.74)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 14,
    paddingHorizontal: 14,
    shadowColor: '#B0664A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 18,
    elevation: 1,
  },
  toolCardSpacing: { marginTop: 10 },
  toolIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  toolInfo: { flex: 1 },
  toolTitle: { fontSize: 14.5, fontWeight: '600', color: INK, letterSpacing: 0.1 },
  toolSub: { fontSize: 12, color: SOFT, marginTop: 3, letterSpacing: 0.1 },

  reminderCard: { marginTop: 14 },
  switchTrack: {
    width: 46,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(42, 32, 51, 0.12)',
    padding: 3,
    justifyContent: 'center',
  },
  switchTrackOn: { backgroundColor: TERRACOTTA },
  switchBusy: { opacity: 0.6 },
  switchKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFDF8',
    shadowColor: '#2A2033',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 1,
  },
  switchKnobOn: { alignSelf: 'flex-end' },
  reminderTimes: {
    fontSize: 10.5,
    color: SOFT,
    marginTop: 9,
    marginLeft: 4,
    letterSpacing: 0.2,
  },
  reminderNote: {
    fontSize: 11,
    color: TERRACOTTA,
    marginTop: 7,
    marginLeft: 4,
    lineHeight: 16,
  },

  privacyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 26,
    backgroundColor: 'rgba(255, 253, 248, 0.55)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(42, 32, 51, 0.06)',
    padding: 15,
  },
  privacyIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(42, 32, 51, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  privacyInfo: { flex: 1 },
  privacyTitle: { fontSize: 13, fontWeight: '600', color: INK, letterSpacing: 0.1 },
  privacySub: {
    fontSize: 11,
    lineHeight: 17,
    color: SOFT,
    marginTop: 3,
    letterSpacing: 0.1,
  },

  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 18,
  },
  signOutText: {
    color: 'rgba(42, 32, 51, 0.45)',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 7,
    letterSpacing: 0.2,
  },
  footerNote: {
    marginTop: 6,
    fontSize: 14,
    color: 'rgba(42, 32, 51, 0.38)',
    textAlign: 'center',
    letterSpacing: 0.1,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(42, 32, 51, 0.32)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalAlign: { width: '100%', alignItems: 'center' },
  editorSheet: {
    width: '100%',
    maxWidth: 440,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 26,
    paddingTop: 10,
    paddingBottom: 28,
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
    marginBottom: 22,
  },
  editorLabel: {
    fontSize: 8.5,
    letterSpacing: 2.2,
    fontWeight: '700',
    color: TERRACOTTA,
    marginBottom: 9,
  },
  editorTitle: { fontSize: 27, lineHeight: 32, color: INK, letterSpacing: -0.5 },
  editorSub: {
    fontSize: 12,
    color: SOFT,
    marginTop: 8,
    letterSpacing: 0.1,
    lineHeight: 18,
  },
  editorInput: {
    marginTop: 18,
    backgroundColor: 'rgba(255, 253, 248, 0.85)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(42, 32, 51, 0.10)',
    paddingVertical: 13,
    paddingHorizontal: 15,
    fontSize: 16,
    color: INK,
    fontFamily: 'Georgia, "Times New Roman", serif',
  },
  editorInputMultiline: {
    minHeight: 96,
    textAlignVertical: 'top',
    lineHeight: 23,
    fontStyle: 'italic',
  },
  editorError: {
    fontSize: 11,
    color: '#A45A5A',
    marginTop: 8,
    lineHeight: 16,
  },
  editorSave: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: TERRACOTTA,
    paddingLeft: 22,
    paddingRight: 7,
    paddingVertical: 7,
    borderRadius: 999,
    minHeight: 54,
    marginTop: 18,
    shadowColor: TERRACOTTA,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 5,
  },
  editorSaveBusy: { opacity: 0.7 },
  editorSaveText: { color: CREAM, fontSize: 16, letterSpacing: 0.2 },
  editorSaveCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(253, 249, 243, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editorCancel: { alignItems: 'center', paddingVertical: 14 },
  editorCancelText: { fontSize: 11.5, color: SOFT, letterSpacing: 0.2 },
});
