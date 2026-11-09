import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import {
  useFonts,
  Fraunces_600SemiBold,
  Fraunces_600SemiBold_Italic,
} from '@expo-google-fonts/fraunces';
import AppIcon from '../components/AppIcon';
import { authApi, setToken } from '../lib/api';

const INK = '#2A2033';
const MUTED = 'rgba(42, 32, 51, 0.62)';
const SOFT = 'rgba(42, 32, 51, 0.40)';
const CREAM = '#FDF9F3';
const TERRACOTTA = '#B0664A';
const LILAC = '#8C5AA8';

export default function AuthScreen({ onAuthenticated, onBack }) {
  const [fontsLoaded] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_600SemiBold_Italic,
  });

  const serifSemiBold = fontsLoaded
    ? 'Fraunces_600SemiBold'
    : 'Georgia, "Times New Roman", serif';
  const serifItalic = fontsLoaded
    ? 'Fraunces_600SemiBold_Italic'
    : 'Georgia, "Times New Roman", serif';

  const [mode, setMode] = useState('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isSignup = mode === 'signup';

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
      {
        translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }),
      },
    ],
  };

  const switchMode = (next) => {
    if (next === mode) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
    setMode(next);
    setError(null);
  };

  const finish = async (session) => {
    await setToken(session.token);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {}
    onAuthenticated(session.user);
  };

  const handleSubmit = async () => {
    if (loading) return;

    if (isSignup && !name.trim()) return setError('Please tell me your name.');
    if (!email.trim() || !email.includes('@')) return setError('Please enter a valid email.');
    if (!password || password.length < 6) {
      return setError('Password needs at least 6 characters.');
    }

    setError(null);
    setLoading(true);
    try {
      const session = isSignup
        ? await authApi.signup({ name: name.trim(), email: email.trim(), password })
        : await authApi.login({ email: email.trim(), password });
      await finish(session);
    } catch (e) {
      setError(e.message);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch (err) {}
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const session = await authApi.guest('Friend');
      await finish(session);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fieldStyle = (key) => [styles.inputWrap, focused === key && styles.inputWrapFocused];

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#FDF9F3', '#F8F0E8', '#F1E8F5']}
        style={StyleSheet.absoluteFill}
      />

      <View pointerEvents="none" style={[styles.orb, styles.orbTop]} />
      <View pointerEvents="none" style={[styles.orb, styles.orbBottom]} />
      <View pointerEvents="none" style={styles.horizon} />

      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Quiet header */}
            <View style={styles.topBar}>
              <TouchableOpacity
                onPress={onBack}
                activeOpacity={0.7}
                style={styles.backBtn}
                accessibilityRole="button"
                accessibilityLabel="Back"
              >
                <AppIcon name="arrowLeft" size={15} color={SOFT} strokeWidth={1.7} />
              </TouchableOpacity>

              <View style={styles.brandRow}>
                <Text style={styles.wordmark}>SOLACE</Text>
                <View style={styles.topRule} />
                <Text style={styles.topNote}>a quiet place</Text>
              </View>

              <View style={styles.backSpacer} />
            </View>

            {/* Welcome words */}
            <Animated.View style={[styles.hero, rise]}>
              <View style={styles.eyebrowRow}>
                <AppIcon name="feather" size={11} color={TERRACOTTA} strokeWidth={1.8} />
                <Text style={styles.eyebrow}>
                  {isSignup ? 'YOUR SPACE, ALWAYS OPEN' : 'WELCOME BACK'}
                </Text>
              </View>

              <Text style={[styles.title, { fontFamily: serifSemiBold }]}>
                {isSignup ? 'Let’s create' : 'Good to see you'}
              </Text>
              <Text style={[styles.titleAccent, { fontFamily: serifItalic }]}>
                {isSignup ? 'your safe space.' : 'again.'}
              </Text>

              <Text style={styles.subtitle}>
                {isSignup
                  ? 'A calm place that remembers you, and grows with you.'
                  : 'I kept your conversations and check-ins safe for you.'}
              </Text>
            </Animated.View>

            {/* Two ways in */}
            <Animated.View style={[styles.tabsRow, rise]}>
              <TouchableOpacity
                onPress={() => switchMode('signup')}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityState={{ selected: isSignup }}
                style={styles.tabBtn}
              >
                <Text style={[styles.tabText, isSignup && styles.tabTextActive]}>Create account</Text>
                <View style={[styles.tabLine, isSignup && styles.tabLineActive]} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => switchMode('login')}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityState={{ selected: !isSignup }}
                style={styles.tabBtn}
              >
                <Text style={[styles.tabText, !isSignup && styles.tabTextActive]}>Log in</Text>
                <View style={[styles.tabLine, !isSignup && styles.tabLineActive]} />
              </TouchableOpacity>
            </Animated.View>

            {/* Form */}
            <Animated.View style={[styles.card, rise]}>
              {isSignup && (
                <View style={styles.field}>
                  <Text style={styles.label}>YOUR NAME</Text>
                  <View style={fieldStyle('name')}>
                    <TextInput
                      style={styles.input}
                      placeholder="What should I call you?"
                      placeholderTextColor="rgba(42, 32, 51, 0.32)"
                      value={name}
                      onChangeText={setName}
                      onFocus={() => setFocused('name')}
                      onBlur={() => setFocused(null)}
                      autoCapitalize="words"
                      returnKeyType="next"
                      selectionColor={LILAC}
                    />
                  </View>
                </View>
              )}

              <View style={styles.field}>
                <Text style={styles.label}>EMAIL</Text>
                <View style={fieldStyle('email')}>
                  <TextInput
                    style={styles.input}
                    placeholder="you@example.com"
                    placeholderTextColor="rgba(42, 32, 51, 0.32)"
                    value={email}
                    onChangeText={setEmail}
                    onFocus={() => setFocused('email')}
                    onBlur={() => setFocused(null)}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    returnKeyType="next"
                    selectionColor={LILAC}
                  />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>PASSWORD</Text>
                <View style={[fieldStyle('password'), styles.passwordWrap]}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="At least 6 characters"
                    placeholderTextColor="rgba(42, 32, 51, 0.32)"
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setFocused('password')}
                    onBlur={() => setFocused(null)}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                    selectionColor={LILAC}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword((v) => !v)}
                    style={styles.showBtn}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <Text style={styles.showText}>{showPassword ? 'HIDE' : 'SHOW'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                activeOpacity={0.92}
                style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel={isSignup ? 'Create my space' : 'Log in'}
              >
                {loading ? (
                  <ActivityIndicator color={CREAM} />
                ) : (
                  <View style={styles.submitContent}>
                    <Text style={[styles.submitText, { fontFamily: serifSemiBold }]}>
                      {isSignup ? 'Create my space' : 'Come back in'}
                    </Text>
                    <View style={styles.submitArrow}>
                      <AppIcon name="arrowRight" size={16} color={CREAM} strokeWidth={1.8} />
                    </View>
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.dividerRow}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.divider} />
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.guestBtn}
                onPress={handleGuest}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel="Continue as guest"
              >
                <AppIcon name="sprout" size={15} color={LILAC} strokeWidth={1.5} />
                <Text style={styles.guestText}>Continue as guest</Text>
              </TouchableOpacity>

              <View style={styles.privacyRow}>
                <AppIcon name="lock" size={11} color={SOFT} strokeWidth={1.6} />
                <Text style={styles.privacyNote}>
                  Private by design. Delete any conversation, anytime.
                </Text>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CREAM },
  safeArea: { flex: 1 },
  flex: { flex: 1 },

  orb: { position: 'absolute', borderRadius: 999 },
  orbTop: {
    width: 320,
    height: 320,
    top: -160,
    right: -120,
    backgroundColor: 'rgba(233, 185, 160, 0.22)',
  },
  orbBottom: {
    width: 300,
    height: 300,
    bottom: -150,
    left: -130,
    backgroundColor: 'rgba(196, 167, 232, 0.16)',
  },
  horizon: {
    position: 'absolute',
    left: -80,
    right: -80,
    bottom: -230,
    height: 320,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },

  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 6,
    paddingBottom: 44,
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
  },

  // Header
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(42, 32, 51, 0.07)',
  },
  backSpacer: { width: 34 },
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

  // Hero
  hero: { marginTop: 26, marginBottom: 22 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  eyebrow: {
    fontSize: 9.5,
    letterSpacing: 2.2,
    fontWeight: '700',
    color: TERRACOTTA,
    marginLeft: 7,
  },
  title: {
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -0.8,
    color: INK,
  },
  titleAccent: {
    fontSize: 40,
    lineHeight: 48,
    letterSpacing: -0.8,
    color: LILAC,
  },
  subtitle: {
    marginTop: 14,
    fontSize: 13.5,
    lineHeight: 21,
    color: MUTED,
    letterSpacing: 0.1,
    maxWidth: 300,
  },

  // Tabs
  tabsRow: { flexDirection: 'row', marginBottom: 14 },
  tabBtn: { marginRight: 24 },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(42, 32, 51, 0.38)',
    letterSpacing: 0.2,
    paddingBottom: 7,
  },
  tabTextActive: { color: INK },
  tabLine: {
    height: 2,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  tabLineActive: { backgroundColor: TERRACOTTA },

  // Card
  card: {
    backgroundColor: 'rgba(255, 253, 248, 0.72)',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 18,
    shadowColor: '#B0664A',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.06,
    shadowRadius: 30,
    elevation: 3,
  },
  field: { marginBottom: 14 },
  label: {
    fontSize: 9,
    letterSpacing: 1.8,
    fontWeight: '700',
    color: 'rgba(42, 32, 51, 0.45)',
    marginBottom: 7,
    marginLeft: 2,
  },
  inputWrap: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(42, 32, 51, 0.10)',
  },
  inputWrapFocused: {
    borderColor: 'rgba(140, 90, 168, 0.45)',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  input: {
    paddingHorizontal: 15,
    paddingVertical: 13,
    fontSize: 14.5,
    color: INK,
    letterSpacing: 0.1,
  },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 6,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 13,
    fontSize: 14.5,
    color: INK,
  },
  showBtn: { paddingHorizontal: 10, paddingVertical: 8 },
  showText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: LILAC,
  },

  errorBox: {
    backgroundColor: 'rgba(176, 102, 74, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(176, 102, 74, 0.18)',
    borderRadius: 13,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  errorText: { color: '#9C4A32', fontSize: 12, fontWeight: '600', lineHeight: 17 },

  submitBtn: {
    backgroundColor: TERRACOTTA,
    borderRadius: 999,
    paddingLeft: 22,
    paddingRight: 6,
    paddingVertical: 6,
    minHeight: 54,
    justifyContent: 'center',
    marginTop: 2,
    shadowColor: TERRACOTTA,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 5,
  },
  submitBtnDisabled: { opacity: 0.75 },
  submitContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  submitText: {
    color: CREAM,
    fontSize: 17,
    letterSpacing: 0.2,
    marginLeft: 4,
  },
  submitArrow: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(253, 249, 243, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  divider: { flex: 1, height: 1, backgroundColor: 'rgba(42, 32, 51, 0.10)' },
  dividerText: {
    marginHorizontal: 12,
    color: 'rgba(42, 32, 51, 0.35)',
    fontSize: 10,
    letterSpacing: 1.2,
    fontStyle: 'italic',
  },

  guestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(140, 90, 168, 0.22)',
    borderRadius: 999,
    paddingVertical: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
  },
  guestText: {
    color: LILAC,
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
    letterSpacing: 0.2,
  },

  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  privacyNote: {
    fontSize: 10.5,
    color: SOFT,
    marginLeft: 6,
    letterSpacing: 0.1,
  },
});
