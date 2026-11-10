import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  Easing,
  Dimensions,
  Image,
  ScrollView,
  Modal,
} from 'react-native';
import LocalizedText from '../components/LocalizedText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  useFonts,
  Fraunces_600SemiBold,
  Fraunces_600SemiBold_Italic,
} from '@expo-google-fonts/fraunces';
import AppIcon from '../components/AppIcon';
import { LANGUAGES, useLanguage } from '../lib/i18n';

const { width, height } = Dimensions.get('window');

const FALLBACK_SERIF = Platform.select({
  web: 'Georgia, "Times New Roman", serif',
  ios: 'Georgia',
  default: 'serif',
});

/**
 * A slow, warm light that drifts behind the cover.
 * Purely decorative, so it never catches touches.
 */
function DriftOrb({ size, color, top, left, right, bottom, duration = 14000, drift = 18 }) {
  const move = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(move, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(move, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const translateY = move.interpolate({ inputRange: [0, 1], outputRange: [-drift, drift] });
  const translateX = move.interpolate({ inputRange: [0, 1], outputRange: [drift, -drift] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.driftOrb,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          top,
          left,
          right,
          bottom,
          opacity: 0.55,
          transform: [{ translateX }, { translateY }],
        },
      ]}
    />
  );
}

// ================= FLOATING MOTES OF LIGHT =================
function HeavenlyParticle({ delay, startX, startY, tone = '#DDD6FE', size = 10 }) {
  const animY = useRef(new Animated.Value(0)).current;
  const animX = useRef(new Animated.Value(0)).current;
  const animOpacity = useRef(new Animated.Value(0)).current;
  const animScale = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(animY, {
          toValue: -100 - Math.random() * 80,
          duration: 2200,
          useNativeDriver: true,
        }),
        Animated.timing(animX, {
          toValue: (Math.random() - 0.5) * 120,
          duration: 2200,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(animOpacity, {
            toValue: 0.85,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(animOpacity, {
            toValue: 0,
            duration: 1700,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(animScale, {
          toValue: 1.4,
          duration: 2200,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.heavenParticle,
        {
          left: startX,
          top: startY,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: tone,
          opacity: animOpacity,
          transform: [
            { translateX: animX },
            { translateY: animY },
            { scale: animScale },
          ],
        },
      ]}
    />
  );
}

// ================= THE SOFT, DREAMY HEAVENLY BURST =================
// Kept exactly as it was — this is the moment after "Tap me, I will listen to you".
function HeavenlyBurstScene({ onComplete }) {
  const outerAuraScale = useRef(new Animated.Value(0.3)).current;
  const mainAuraScale = useRef(new Animated.Value(0.2)).current;
  const auraOpacity = useRef(new Animated.Value(0)).current;

  const hugOpacity = useRef(new Animated.Value(0)).current;
  const hugScale = useRef(new Animated.Value(0.9)).current;
  const heartFloat = useRef(new Animated.Value(0)).current;

  const blessingFade = useRef(new Animated.Value(0)).current;
  const screenDissolve = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 250);
    } catch (e) {}

    // 1. Soft glowing circles expand outward like a heavenly halo
    Animated.parallel([
      Animated.timing(outerAuraScale, {
        toValue: 3.6,
        duration: 1300,
        useNativeDriver: true,
      }),
      Animated.timing(mainAuraScale, {
        toValue: 2.8,
        duration: 1100,
        useNativeDriver: true,
      }),
      Animated.timing(auraOpacity, {
        toValue: 0.88,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.spring(hugScale, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(hugOpacity, {
        toValue: 0.35,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(heartFloat, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(blessingFade, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Holds for a moment in the glow, then dissolves gently into the app.
    const autoTimer = setTimeout(() => {
      Animated.timing(screenDissolve, {
        toValue: 0,
        duration: 650,
        useNativeDriver: true,
      }).start(() => {
        onComplete();
      });
    }, 3500);

    return () => clearTimeout(autoTimer);
  }, []);

  return (
    <Animated.View style={[styles.animationContainer, { opacity: screenDissolve }]}>
      <Animated.View
        style={[
          styles.outerRadiantAura,
          {
            opacity: Animated.multiply(auraOpacity, 0.6),
            transform: [{ scale: outerAuraScale }],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.mainRadiantAura,
          {
            opacity: auraOpacity,
            transform: [{ scale: mainAuraScale }],
          },
        ]}
      />

      {/* Floating motes of light */}
      <View style={styles.particlesLayer}>
        <HeavenlyParticle delay={0} startX={width * 0.24} startY={height * 0.4} tone="#C4B5FD" size={9} />
        <HeavenlyParticle delay={150} startX={width * 0.72} startY={height * 0.35} tone="#FBCFE8" size={7} />
        <HeavenlyParticle delay={300} startX={width * 0.48} startY={height * 0.28} tone="#FFFFFF" size={8} />
        <HeavenlyParticle delay={450} startX={width * 0.28} startY={height * 0.48} tone="#FDE68A" size={6} />
        <HeavenlyParticle delay={600} startX={width * 0.66} startY={height * 0.46} tone="#DDD6FE" size={9} />
        <HeavenlyParticle delay={750} startX={width * 0.5} startY={height * 0.38} tone="#F5D0FE" size={7} />
      </View>

      <View style={styles.hugSceneStage}>
        <Animated.View
          style={[
            styles.floatingHeartBadge,
            {
              transform: [{ scale: heartFloat }],
              opacity: heartFloat,
            },
          ]}
        >
          <AppIcon name="heart" size={32} color="#F9A8D4" fill="#FBCFE8" strokeWidth={1.4} />
        </Animated.View>

        <Animated.View
          style={[
            styles.softDreamyHugCircle,
            {
              opacity: hugOpacity,
              transform: [{ scale: hugScale }],
            },
          ]}
        >
          <Image
            source={require('../../assets/hug.png')}
            style={styles.softDreamyHugImage}
            resizeMode="cover"
          />
        </Animated.View>
      </View>

      <Animated.View style={[styles.heavenBlessingCard, { opacity: blessingFade }]}>
        <View style={styles.blessingIcon}>
          <AppIcon name="feather" size={26} color="#A78BFA" strokeWidth={1.4} />
        </View>
        <LocalizedText style={styles.heavenBlessingTitle}>
          You are safe. You are protected.
        </LocalizedText>
        <LocalizedText style={styles.heavenBlessingSub}>
          Welcome to your peaceful haven
        </LocalizedText>
      </Animated.View>
    </Animated.View>
  );
}

// ================= WELCOME COVER =================
export default function WelcomeScreen({ onGoHome }) {
  const [fontsLoaded] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_600SemiBold_Italic,
  });
  const { t, language, setLanguage } = useLanguage();
  const [langOpen, setLangOpen] = useState(false);

  const serifSemiBold = fontsLoaded ? 'Fraunces_600SemiBold' : FALLBACK_SERIF;
  const serifItalic = fontsLoaded ? 'Fraunces_600SemiBold_Italic' : FALLBACK_SERIF;

  const [isJourneyStarted, setIsJourneyStarted] = useState(false);

  // Entrance: each block lifts in a little after the one before it.
  const eyebrowIn = useRef(new Animated.Value(0)).current;
  const titleIn = useRef(new Animated.Value(0)).current;
  const subIn = useRef(new Animated.Value(0)).current;
  const orbIn = useRef(new Animated.Value(0)).current;
  const bottomIn = useRef(new Animated.Value(0)).current;

  // The listening orb breathes, very slowly.
  const breath = useRef(new Animated.Value(0)).current;

  // Cover fades away, then the loved heavenly burst begins.
  const welcomeFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.stagger(140, [
      Animated.timing(eyebrowIn, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(titleIn, {
        toValue: 1,
        duration: 850,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(subIn, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(orbIn, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(bottomIn, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breath, {
          toValue: 0,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    breathe.start();
    return () => breathe.stop();
  }, []);

  const handleBegin = () => {
    if (isJourneyStarted) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}

    Animated.timing(welcomeFade, {
      toValue: 0,
      duration: 350,
      useNativeDriver: true,
    }).start(() => {
      setIsJourneyStarted(true);
    });
  };

  const rise = (value, distance = 18) => ({
    opacity: value,
    transform: [
      {
        translateY: value.interpolate({
          inputRange: [0, 1],
          outputRange: [distance, 0],
        }),
      },
    ],
  });

  const orbScale = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.055] });
  const haloScale = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
  const haloOpacity = breath.interpolate({ inputRange: [0, 1], outputRange: [0.32, 0.62] });

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <LinearGradient
        colors={['#FDF9F3', '#F7EFE8', '#F1E8F5']}
        style={StyleSheet.absoluteFill}
      />

      <DriftOrb size={340} color="rgba(233, 185, 160, 0.30)" top={-120} right={-110} />
      <DriftOrb
        size={280}
        color="rgba(196, 167, 232, 0.26)"
        bottom={-90}
        left={-110}
        duration={18000}
        drift={24}
      />

      <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
        {!isJourneyStarted ? (
          <ScrollView
            contentContainerStyle={styles.coverScroll}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
          <Animated.View style={[styles.frame, { opacity: welcomeFade }]}>
            {/* Quiet wordmark */}
            <Animated.View style={[styles.topBar, rise(eyebrowIn, 10)]}>
              <LocalizedText style={styles.wordmark}>SOLACE</LocalizedText>
              <View style={styles.topRule} />
              <LocalizedText style={styles.topNote}>{t('quietPlace')}</LocalizedText>

              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.langPill}
                onPress={() => setLangOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Change language"
              >
                <LocalizedText style={styles.langPillText}>{language.toUpperCase()}</LocalizedText>
              </TouchableOpacity>
            </Animated.View>

            {/* The greeting */}
            <View style={styles.hero}>
              <Animated.View style={rise(eyebrowIn)}>
                <LocalizedText style={styles.eyebrow}>{t('welcomeEyebrow')}</LocalizedText>
              </Animated.View>

              <Animated.Text
                style={[
                  styles.title,
                  { fontFamily: serifSemiBold, color: '#2A2033' },
                  rise(titleIn, 22),
                ]}
              >
                {t('welcomeHi')}
              </Animated.Text>

              <Animated.View style={rise(titleIn, 22)}>
                <LocalizedText style={[styles.titleItalic, { fontFamily: serifItalic }]}>
                  {t('welcomeFriend')}
                </LocalizedText>
                <View style={styles.underline} />
              </Animated.View>

              <Animated.Text style={[styles.sub, rise(subIn, 16)]}>
                {t('welcomeSub')}
              </Animated.Text>
            </View>

            {/* The listening orb */}
            <Animated.View style={[styles.orbStage, rise(orbIn, 26)]}>
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.orbHalo,
                  { opacity: haloOpacity, transform: [{ scale: haloScale }] },
                ]}
              />
              <View style={styles.orbRing} />

              <TouchableOpacity
                activeOpacity={0.9}
                onPress={handleBegin}
                accessibilityRole="button"
                accessibilityLabel="Tap to come in"
                style={styles.orbPress}
              >
                <Animated.View style={{ transform: [{ scale: orbScale }] }}>
                  <LinearGradient
                    colors={['#E9B69C', '#D3A6D8', '#B49AE6']}
                    start={{ x: 0.15, y: 0.05 }}
                    end={{ x: 0.9, y: 1 }}
                    style={styles.orb}
                  >
                    <View style={styles.orbInnerLight} />
                    <AppIcon name="feather" size={30} color="#FFFBF6" strokeWidth={1.25} />
                  </LinearGradient>
                </Animated.View>
              </TouchableOpacity>

              <LocalizedText style={styles.orbHint}>{t('welcomeTap')}</LocalizedText>
            </Animated.View>

            {/* Quiet note */}
            <Animated.View style={[styles.bottom, rise(bottomIn, 14)]}>
              <LocalizedText style={styles.footnote}>{t('welcomeFootnote')}</LocalizedText>
            </Animated.View>
          </Animated.View>
          </ScrollView>
        ) : (
          <HeavenlyBurstScene onComplete={onGoHome} />
        )}
      </SafeAreaView>

      <Modal
        visible={langOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLangOpen(false)}
      >
        <View style={styles.langOverlay}>
          <TouchableOpacity
            activeOpacity={1}
            style={StyleSheet.absoluteFill}
            onPress={() => setLangOpen(false)}
          />
          <View style={styles.langSheet}>
            <View style={styles.langGrabber} />
            <LocalizedText style={[styles.langTitle, { fontFamily: serifSemiBold }]}>
              {t('languageTitle')}
            </LocalizedText>
            <LocalizedText style={styles.langSub}>{t('languageSub')}</LocalizedText>

            {LANGUAGES.map((item) => {
              const active = item.code === language;
              return (
                <TouchableOpacity
                  key={item.code}
                  activeOpacity={0.85}
                  style={[styles.langRow, active && styles.langRowActive]}
                  onPress={() => {
                    setLanguage(item.code);
                    setLangOpen(false);
                  }}
                >
                  <LocalizedText style={styles.langNative}>{item.native}</LocalizedText>
                  {active ? (
                    <AppIcon name="check" size={15} color="#B0664A" strokeWidth={2} />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // Cover
  root: { flex: 1, backgroundColor: '#FDF9F3' },
  safe: { flex: 1 },
  coverScroll: { flexGrow: 1 },
  frame: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 28,
    paddingTop: 14,
    paddingBottom: 22,
  },
  driftOrb: { position: 'absolute' },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
  },
  wordmark: {
    fontSize: 10,
    letterSpacing: 4.2,
    fontWeight: '700',
    color: 'rgba(42, 32, 51, 0.62)',
  },
  topRule: {
    width: 22,
    height: 1,
    backgroundColor: 'rgba(42, 32, 51, 0.18)',
    marginHorizontal: 10,
  },
  topNote: {
    fontSize: 10.5,
    letterSpacing: 0.6,
    color: 'rgba(42, 32, 51, 0.42)',
    fontStyle: 'italic',
  },
  langPill: {
    marginLeft: 'auto',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(42, 32, 51, 0.10)',
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
  },
  langPillText: {
    fontSize: 9.5,
    letterSpacing: 1.1,
    fontWeight: '700',
    color: 'rgba(42, 32, 51, 0.55)',
  },
  langOverlay: {
    flex: 1,
    backgroundColor: 'rgba(42, 32, 51, 0.36)',
    justifyContent: 'flex-end',
  },
  langSheet: {
    width: '100%',
    backgroundColor: '#FDF9F3',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 30,
  },
  langGrabber: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(42, 32, 51, 0.12)',
    alignSelf: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  langTitle: {
    fontSize: 24,
    color: '#2A2033',
    letterSpacing: -0.3,
  },
  langSub: {
    fontSize: 12.5,
    lineHeight: 19,
    color: 'rgba(42, 32, 51, 0.5)',
    marginTop: 6,
    marginBottom: 14,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
  },
  langRowActive: {
    backgroundColor: 'rgba(176, 102, 74, 0.10)',
    borderColor: 'rgba(176, 102, 74, 0.25)',
  },
  langNative: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2A2033',
  },

  // Greeting
  hero: { marginTop: 54 },
  eyebrow: {
    fontSize: 9.5,
    letterSpacing: 2.4,
    fontWeight: '700',
    color: '#B0664A',
    marginBottom: 18,
  },
  title: {
    fontSize: 58,
    lineHeight: 62,
    letterSpacing: -1.2,
  },
  titleItalic: {
    fontSize: 58,
    lineHeight: 66,
    letterSpacing: -1.2,
    color: '#8C5AA8',
  },
  underline: {
    width: 118,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(176, 102, 74, 0.28)',
    marginTop: 6,
    marginLeft: 4,
  },
  sub: {
    marginTop: 22,
    maxWidth: 310,
    fontSize: 15,
    lineHeight: 24,
    color: 'rgba(42, 32, 51, 0.62)',
    letterSpacing: 0.1,
  },

  // Orb
  orbStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 190,
  },
  orbHalo: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: '#D9C2EC',
  },
  orbRing: {
    position: 'absolute',
    width: 148,
    height: 148,
    borderRadius: 74,
    borderWidth: 1,
    borderColor: 'rgba(140, 90, 168, 0.22)',
  },
  orbPress: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orb: {
    width: 108,
    height: 108,
    borderRadius: 54,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#A074BE',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.28,
    shadowRadius: 26,
    elevation: 8,
  },
  orbInnerLight: {
    position: 'absolute',
    top: -26,
    left: -18,
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: 'rgba(255, 250, 243, 0.42)',
  },
  orbHint: {
    marginTop: 22,
    fontSize: 9.5,
    letterSpacing: 2.6,
    fontWeight: '700',
    color: 'rgba(42, 32, 51, 0.38)',
  },

  // Bottom
  bottom: { width: '100%' },
  footnote: {
    marginTop: 14,
    textAlign: 'center',
    fontSize: 11.5,
    letterSpacing: 0.2,
    color: 'rgba(42, 32, 51, 0.42)',
  },

  // ===== Heavenly burst (unchanged) =====
  animationContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  outerRadiantAura: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(243, 232, 255, 0.55)',
    zIndex: 1,
  },
  mainRadiantAura: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(233, 213, 255, 0.85)',
    shadowColor: '#C084FC',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 36,
    elevation: 8,
    zIndex: 2,
  },
  particlesLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    pointerEvents: 'none',
  },
  heavenParticle: {
    position: 'absolute',
  },
  hugSceneStage: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 220,
    width: '100%',
    zIndex: 10,
  },
  floatingHeartBadge: {
    position: 'absolute',
    top: -14,
    zIndex: 15,
  },
  softDreamyHugCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 175,
    height: 175,
    borderRadius: 88,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(216, 180, 254, 0.4)',
  },
  softDreamyHugImage: {
    width: 150,
    height: 150,
  },
  heavenBlessingCard: {
    alignItems: 'center',
    marginTop: 26,
    paddingHorizontal: 24,
    zIndex: 25,
  },
  blessingIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  heavenBlessingTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#3B0764',
    textAlign: 'center',
    marginBottom: 6,
  },
  heavenBlessingSub: {
    fontSize: 15,
    fontWeight: '500',
    color: '#8B5CF6',
    textAlign: 'center',
  },
});
