import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  useFonts,
  Fraunces_600SemiBold,
  Fraunces_600SemiBold_Italic,
} from '@expo-google-fonts/fraunces';
import AppIcon from '../components/AppIcon';
import MeditatingBuddha from '../components/MeditatingBuddha';

const INK = '#2A2033';
const MUTED = 'rgba(42, 32, 51, 0.62)';
const SOFT = 'rgba(42, 32, 51, 0.42)';
const CREAM = '#FDF9F3';
const TERRACOTTA = '#B0664A';
const LILAC = '#8C5AA8';

const PHASES = [
  { label: 'Breathe in', short: 'In', duration: 4000, targetScale: 1.36 },
  { label: 'Hold gently', short: 'Hold', duration: 4000, targetScale: 1.36 },
  { label: 'Release slowly', short: 'Out', duration: 4000, targetScale: 1.0 },
  { label: 'Rest in the quiet', short: 'Rest', duration: 4000, targetScale: 1.0 },
];

export default function BreathingScreen({ onBack }) {
  const [fontsLoaded] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_600SemiBold_Italic,
  });

  const serif = fontsLoaded ? 'Fraunces_600SemiBold' : 'Georgia, "Times New Roman", serif';
  const serifItalic = fontsLoaded
    ? 'Fraunces_600SemiBold_Italic'
    : 'Georgia, "Times New Roman", serif';

  const [phaseIndex, setPhaseIndex] = useState(0);
  const [cycle, setCycle] = useState(1);
  const [isRunning, setIsRunning] = useState(true);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    let timeoutId;

    if (isRunning) {
      const current = PHASES[phaseIndex];

      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (e) {}

      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: current.targetScale,
          duration: current.duration,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: current.targetScale > 1 ? 0.85 : 0.35,
          duration: current.duration,
          useNativeDriver: true,
        }),
      ]).start();

      timeoutId = setTimeout(() => {
        setPhaseIndex((prev) => {
          const next = (prev + 1) % PHASES.length;
          if (next === 0) setCycle((c) => c + 1);
          return next;
        });
      }, current.duration);
    }

    return () => clearTimeout(timeoutId);
  }, [phaseIndex, isRunning]);

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#FDF9F3', '#F8F0E8', '#F2E9F4']} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={[styles.orb, styles.orbTop]} />
      <View pointerEvents="none" style={[styles.orb, styles.orbBottom]} />

      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.frame}>
          {/* Quiet top bar */}
          <View style={styles.topBar}>
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

            <View style={styles.cyclePill}>
              <Text style={styles.cycleText}>
                {isRunning ? `Cycle ${cycle}` : 'Paused'}
              </Text>
            </View>
          </View>

          {/* Hero */}
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>A SMALL PAUSE</Text>
            <Text style={[styles.title, { fontFamily: serif }]}>Follow your breath,</Text>
            <Text style={[styles.titleAccent, { fontFamily: serifItalic }]}>nothing else.</Text>
            <Text style={styles.subtitle}>Four seconds in. Four seconds out. That is enough.</Text>
          </View>

          {/* Breathing figure */}
          <View style={styles.centerContainer}>
            <Animated.View
              style={[
                styles.outerGlow,
                {
                  transform: [{ scale: scaleAnim }],
                  opacity: opacityAnim,
                },
              ]}
            />

            <Animated.View
              style={[styles.breathingCircle, { transform: [{ scale: scaleAnim }] }]}
            >
              <LinearGradient
                colors={['#FFFDF8', '#F6E9DF']}
                start={{ x: 0.3, y: 0 }}
                end={{ x: 0.7, y: 1 }}
                style={styles.circleInner}
              >
                <MeditatingBuddha size={98} />
              </LinearGradient>
            </Animated.View>

            <Text style={[styles.phaseLabel, { fontFamily: serif }]}>
              {PHASES[phaseIndex].label}
            </Text>
            <Text style={styles.subHint}>
              Let your breath follow the gentle rhythm of the circle
            </Text>
          </View>

          {/* Four small steps */}
          <View style={styles.phaseRow}>
            {PHASES.map((phase, i) => {
              const isActive = i === phaseIndex;
              return (
                <View key={phase.label} style={styles.phaseStep}>
                  <View style={[styles.phaseDot, isActive && styles.phaseDotActive]} />
                  <Text style={[styles.phaseName, isActive && styles.phaseNameActive]}>
                    {phase.short}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Controls */}
          <View style={styles.bottomControls}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.pauseResumeBtn}
              onPress={() => setIsRunning(!isRunning)}
              accessibilityRole="button"
              accessibilityLabel={isRunning ? 'Pause session' : 'Resume session'}
            >
              <View style={styles.pauseLeft}>
                <AppIcon
                  name={isRunning ? 'pause' : 'play'}
                  size={14}
                  color={CREAM}
                  strokeWidth={1.9}
                />
                <Text style={[styles.pauseResumeText, { fontFamily: serif }]}>
                  {isRunning ? 'Pause this moment' : 'Begin again'}
                </Text>
              </View>
              <View style={styles.pauseCircle}>
                <AppIcon
                  name={isRunning ? 'pause' : 'play'}
                  size={12}
                  color={CREAM}
                  strokeWidth={1.9}
                />
              </View>
            </TouchableOpacity>

            <Text style={styles.caption}>
              {isRunning ? 'Nothing to achieve. Just this breath.' : 'Paused. Come back when you are ready.'}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CREAM },
  safeArea: { flex: 1, alignItems: 'center' },
  frame: { width: '100%', flex: 1, paddingHorizontal: 24 },

  orb: { position: 'absolute', borderRadius: 999 },
  orbTop: {
    width: 300,
    height: 300,
    top: -160,
    right: -110,
    backgroundColor: 'rgba(233, 185, 160, 0.20)',
  },
  orbBottom: {
    width: 290,
    height: 290,
    bottom: -150,
    left: -120,
    backgroundColor: 'rgba(196, 167, 232, 0.14)',
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingBottom: 2,
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
  cyclePill: {
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 253, 248, 0.62)',
    borderWidth: 1,
    borderColor: 'rgba(42, 32, 51, 0.06)',
  },
  cycleText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: SOFT,
    letterSpacing: 0.8,
  },

  hero: { marginTop: 16, marginBottom: 4 },
  eyebrow: {
    fontSize: 9,
    letterSpacing: 2.2,
    fontWeight: '700',
    color: TERRACOTTA,
    marginBottom: 8,
  },
  title: { fontSize: 30, lineHeight: 34, letterSpacing: -0.6, color: INK },
  titleAccent: {
    fontSize: 30,
    lineHeight: 38,
    letterSpacing: -0.6,
    color: LILAC,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 11.5,
    lineHeight: 18,
    color: MUTED,
    maxWidth: 290,
    letterSpacing: 0.1,
  },

  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 2,
  },
  outerGlow: {
    position: 'absolute',
    top: '50%',
    marginTop: -130,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: 'rgba(233, 185, 160, 0.55)',
  },
  breathingCircle: {
    width: 152,
    height: 152,
    borderRadius: 76,
    shadowColor: '#B0664A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    overflow: 'hidden',
  },
  circleInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseLabel: {
    fontSize: 24,
    lineHeight: 30,
    color: INK,
    marginTop: 40,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subHint: {
    fontSize: 11,
    color: SOFT,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 38,
    lineHeight: 17,
    letterSpacing: 0.1,
  },

  phaseRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  phaseStep: { alignItems: 'center', width: 62 },
  phaseDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(42, 32, 51, 0.14)',
    marginBottom: 6,
  },
  phaseDotActive: { backgroundColor: TERRACOTTA },
  phaseName: {
    fontSize: 8.5,
    letterSpacing: 1.1,
    fontWeight: '600',
    color: 'rgba(42, 32, 51, 0.30)',
  },
  phaseNameActive: { color: TERRACOTTA, fontWeight: '700' },

  bottomControls: { alignItems: 'center', paddingBottom: 16 },
  pauseResumeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: TERRACOTTA,
    paddingLeft: 22,
    paddingRight: 7,
    paddingVertical: 7,
    borderRadius: 999,
    width: '100%',
    minHeight: 54,
    shadowColor: TERRACOTTA,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 5,
  },
  pauseLeft: { flexDirection: 'row', alignItems: 'center' },
  pauseResumeText: {
    color: CREAM,
    fontSize: 15.5,
    letterSpacing: 0.2,
    marginLeft: 9,
  },
  pauseCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(253, 249, 243, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: {
    fontSize: 10,
    color: SOFT,
    marginTop: 12,
    letterSpacing: 0.2,
    fontStyle: 'italic',
  },
});
