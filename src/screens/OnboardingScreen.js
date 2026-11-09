import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import {
  useFonts,
  Fraunces_600SemiBold,
  Fraunces_600SemiBold_Italic,
} from '@expo-google-fonts/fraunces';
import AppIcon from '../components/AppIcon';

const { width: windowWidth } = Dimensions.get('window');

const INK = '#2A2033';
const MUTED = 'rgba(42, 32, 51, 0.62)';
const CREAM = '#FDF9F3';
const ACCENT = '#6E5AA8';

const SLIDES = [
  {
    key: 'companion',
    icon: 'feather',
    eyebrow: 'A COMPANION, NOT AN APP',
    titleTop: 'Someone is',
    titleAccent: 'here for you.',
    text: 'A gentle companion who remembers how you feel, never rushes you, and never judges what you bring.',
  },
  {
    key: 'talk',
    icon: 'chat',
    eyebrow: 'SAY IT HOWEVER IT COMES',
    titleTop: 'Out loud,',
    titleAccent: 'or softly.',
    text: 'Type it, speak it, or just sit in the quiet. There is no right way to share what is on your mind.',
  },
  {
    key: 'grow',
    icon: 'sprout',
    eyebrow: 'SMALL STEPS, KEPT GENTLY',
    titleTop: 'A little',
    titleAccent: 'lighter.',
    text: 'Mood check-ins, slow breathing and soft reminders — a calm routine you can actually keep.',
  },
];

/* A sparse field of little stars. Two depths, so the sky turns at
   a slightly different speed than the page. */
const STARS_FAR = [
  { x: 0.06, y: 58, size: 2.5, base: 0.45, duration: 3600 },
  { x: 0.17, y: 112, size: 2, base: 0.35, duration: 4200 },
  { x: 0.29, y: 44, size: 2.5, base: 0.4, duration: 3200 },
  { x: 0.41, y: 148, size: 2, base: 0.3, duration: 4600 },
  { x: 0.53, y: 62, size: 2.5, base: 0.4, duration: 3800 },
  { x: 0.64, y: 132, size: 2, base: 0.3, duration: 4400 },
  { x: 0.76, y: 38, size: 2, base: 0.35, duration: 3500 },
  { x: 0.9, y: 96, size: 2.5, base: 0.4, duration: 4100 },
];

const STARS_NEAR = [
  { x: 0.1, y: 132, size: 3, base: 0.6, duration: 5200 },
  { x: 0.22, y: 68, size: 2.5, base: 0.5, duration: 4700 },
  { x: 0.36, y: 166, size: 2.5, base: 0.5, duration: 5600 },
  { x: 0.5, y: 30, size: 3, base: 0.6, duration: 4300 },
  { x: 0.62, y: 108, size: 2.5, base: 0.5, duration: 5000 },
  { x: 0.88, y: 158, size: 3, base: 0.55, duration: 4800 },
];

function Glow({ color, style, width = 220, height = 220 }) {
  const breath = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1,
          duration: 5200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breath, {
          toValue: 0,
          duration: 5200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const scale = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] });
  const opacity = breath.interpolate({ inputRange: [0, 1], outputRange: [0.26, 0.44] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.glow,
        { width, height, borderRadius: width / 2, backgroundColor: color, opacity, transform: [{ scale }] },
        style,
      ]}
    />
  );
}

function Star({ x, y, size, base, duration, fieldWidth }) {
  const pulse = useRef(new Animated.Value(Math.random())).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
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

  const opacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [base, Math.min(1, base + 0.35)],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.star,
        {
          left: fieldWidth * x,
          top: y,
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity,
        },
      ]}
    />
  );
}

function Shimmer() {
  const shine = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shine, {
          toValue: 1,
          duration: 4200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(shine, {
          toValue: 0,
          duration: 4200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const opacity = shine.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.42] });

  return <Animated.View style={[styles.moonReflection, { opacity }]} />;
}

function Backdrop({ width, height, scrollX }) {
  if (!height) return null;

  const fieldWidth = width * 1.5;

  const farShift = scrollX.interpolate({
    inputRange: [0, width * 2],
    outputRange: [0, -width * 0.08],
    extrapolate: 'clamp',
  });

  const nearShift = scrollX.interpolate({
    inputRange: [0, width * 2],
    outputRange: [0, -width * 0.2],
    extrapolate: 'clamp',
  });

  return (
    <View pointerEvents="none" style={[styles.backdrop, { height }]}>
      <LinearGradient
        colors={['#DED8F3', '#EDE4F1', '#F7EEE7']}
        style={StyleSheet.absoluteFill}
      />

      <Glow color="#CFC3EA" width={170} height={170} style={styles.moonHalo} />

      <Animated.View
        style={[
          styles.starLayer,
          { width: fieldWidth, left: -width * 0.25, transform: [{ translateX: farShift }] },
        ]}
      >
        {STARS_FAR.map((star, i) => (
          <Star key={`far-${i}`} {...star} fieldWidth={fieldWidth} />
        ))}
      </Animated.View>

      <Animated.View
        style={[
          styles.starLayer,
          { width: fieldWidth, left: -width * 0.25, transform: [{ translateX: nearShift }] },
        ]}
      >
        {STARS_NEAR.map((star, i) => (
          <Star key={`near-${i}`} {...star} fieldWidth={fieldWidth} />
        ))}
      </Animated.View>

      <LinearGradient colors={['#F8F3FF', '#D9D0F0']} style={styles.moon} />

      <View style={styles.cloud}>
        <View style={styles.cloudPuff} />
        <View style={[styles.cloudPuff, styles.cloudPuffSmall]} />
      </View>

      <View style={styles.shore} />

      <LinearGradient colors={['#CBBFE6', '#B3A6D4']} style={styles.water}>
        <View style={[styles.wave, { top: 44, width: width * 0.36, left: width * 0.12 }]} />
        <View style={[styles.wave, { top: 78, width: width * 0.22, left: width * 0.55, opacity: 0.3 }]} />
        <View style={[styles.wave, { top: 112, width: width * 0.44, left: width * 0.3, opacity: 0.24 }]} />
        <View style={[styles.wave, { top: 150, width: width * 0.18, left: width * 0.16, opacity: 0.2 }]} />
        <Shimmer />
      </LinearGradient>
    </View>
  );
}

function Slide({
  item,
  index,
  activeIndex,
  width,
  serifSemiBold,
  serifItalic,
  onNext,
  onGoTo,
  isLast,
  height,
}) {
  const reveal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(reveal, {
      toValue: 1,
      duration: 760,
      delay: index * 120,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  const copyAnimation = {
    opacity: reveal,
    transform: [
      {
        translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }),
      },
    ],
  };

  const compact = height > 0 && height < 640;

  return (
    <View style={[styles.slide, { width, height: height || undefined }]}>
      <View style={styles.sceneSpace} />

      <View style={styles.sheet}>
        <Animated.View style={[styles.sheetCopy, copyAnimation]}>
          <View style={styles.eyebrowRow}>
            <AppIcon name={item.icon} size={11} color={ACCENT} strokeWidth={1.8} />
            <Text style={[styles.eyebrow, { color: ACCENT }]}>{item.eyebrow}</Text>
          </View>

          <Text style={[styles.title, compact && styles.titleCompact, { fontFamily: serifSemiBold }]}>
            {item.titleTop}
          </Text>
          <Text
            style={[
              styles.titleAccent,
              compact && styles.titleAccentCompact,
              { fontFamily: serifItalic, color: ACCENT },
            ]}
          >
            {item.titleAccent}
          </Text>

          <Text style={[styles.text, compact && styles.textCompact]}>{item.text}</Text>
        </Animated.View>

        <View style={styles.footer}>
          <View style={styles.progressRow}>
            {SLIDES.map((slide, i) => (
              <TouchableOpacity
                key={slide.key}
                onPress={() => onGoTo(i)}
                activeOpacity={0.8}
                style={[styles.track, i === activeIndex && styles.trackActive]}
              />
            ))}
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.cta}
            onPress={onNext}
            accessibilityRole="button"
            accessibilityLabel={isLast ? 'Get started' : 'Continue'}
          >
            <Text style={[styles.ctaText, { fontFamily: serifSemiBold }]}>
              {isLast ? 'Get started' : 'Continue'}
            </Text>
            <View style={styles.ctaArrow}>
              <AppIcon name="arrowRight" size={17} color={CREAM} strokeWidth={1.8} />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function OnboardingScreen({ onComplete, onSkip }) {
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

  const [index, setIndex] = useState(0);
  const [pageWidth, setPageWidth] = useState(Math.min(windowWidth, 430));
  const [pageHeight, setPageHeight] = useState(0);
  const listHeightRef = useRef(0);
  const listRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const isLast = index === SLIDES.length - 1;

  const goTo = (nextIndex) => {
    const clamped = Math.max(0, Math.min(nextIndex, SLIDES.length - 1));
    listRef.current?.scrollToOffset({ offset: clamped * pageWidth, animated: true });
    setIndex(clamped);
  };

  const handleNext = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
    if (isLast) {
      onComplete();
    } else {
      goTo(index + 1);
    }
  };

  const handleSkip = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
    onSkip();
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <View
          style={styles.body}
          onLayout={(event) => {
            const nextWidth = Math.min(event.nativeEvent.layout.width, 430);
            if (nextWidth && Math.abs(nextWidth - pageWidth) > 1) setPageWidth(nextWidth);
          }}
        >
          <Backdrop width={pageWidth} height={pageHeight * 0.56} scrollX={scrollX} />

          <Animated.FlatList
            ref={listRef}
            data={SLIDES}
            keyExtractor={(item) => item.key}
            renderItem={({ item, index: itemIndex }) => (
              <Slide
                item={item}
                index={itemIndex}
                activeIndex={index}
                width={pageWidth}
                serifSemiBold={serifSemiBold}
                serifItalic={serifItalic}
                onNext={handleNext}
                onGoTo={goTo}
                isLast={itemIndex === SLIDES.length - 1}
                height={pageHeight}
              />
            )}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            bounces={false}
            style={styles.list}
            scrollEventThrottle={16}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: Platform.OS !== 'web' }
            )}
            onLayout={(event) => {
              const nextHeight = Math.round(event.nativeEvent.layout.height);
              if (nextHeight > 0 && Math.abs(nextHeight - listHeightRef.current) > 1) {
                listHeightRef.current = nextHeight;
                setPageHeight(nextHeight);
              }
            }}
            getItemLayout={(data, i) => ({
              length: pageWidth,
              offset: pageWidth * i,
              index: i,
            })}
            onMomentumScrollEnd={(event) => {
              const next = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
              setIndex(Math.max(0, Math.min(next, SLIDES.length - 1)));
            }}
          />

          {/* Quiet header, fixed above the sky */}
          <View pointerEvents="box-none" style={styles.topBar}>
            <View style={styles.brandRow}>
              <Text style={styles.wordmark}>SOLACE</Text>
              <View style={styles.topRule} />
              <Text style={styles.topNote}>a quiet place</Text>
            </View>
            <TouchableOpacity onPress={handleSkip} activeOpacity={0.7} style={styles.skipBtn}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CREAM },
  safe: { flex: 1, alignItems: 'center' },
  body: { flex: 1, width: '100%', maxWidth: 430 },

  // Fixed header
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 14,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
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
  skipBtn: { paddingVertical: 8, paddingHorizontal: 4 },
  skipText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(42, 32, 51, 0.48)',
    letterSpacing: 0.2,
  },

  // Fixed night scene
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  glow: { position: 'absolute' },
  starLayer: { position: 'absolute', top: 0, height: 260 },
  star: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
  },
  moonHalo: { top: 40, right: 40 },
  moon: {
    position: 'absolute',
    top: 86,
    right: 74,
    width: 62,
    height: 62,
    borderRadius: 31,
  },
  cloud: {
    position: 'absolute',
    top: 178,
    left: 26,
    width: 108,
    height: 30,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cloudPuff: {
    width: 86,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.32)',
  },
  cloudPuffSmall: {
    width: 44,
    height: 20,
    borderRadius: 10,
    marginLeft: -30,
    marginTop: -10,
    backgroundColor: 'rgba(255, 255, 255, 0.32)',
  },
  shore: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '53%',
    height: 20,
    backgroundColor: 'rgba(94, 76, 140, 0.16)',
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
  },
  water: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '55%',
    bottom: 0,
  },
  wave: {
    position: 'absolute',
    height: 2,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  moonReflection: {
    position: 'absolute',
    top: 22,
    right: 74,
    width: 62,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },

  // Slides
  list: { flex: 1 },
  slide: { flex: 1 },
  sceneSpace: { flex: 1.15 },

  // Cream sheet
  sheet: {
    flex: 1,
    marginTop: -26,
    backgroundColor: CREAM,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    paddingHorizontal: 26,
    paddingTop: 22,
    paddingBottom: 16,
    justifyContent: 'space-between',
  },
  sheetCopy: {},
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  eyebrow: {
    fontSize: 9.5,
    letterSpacing: 2.2,
    fontWeight: '700',
    marginLeft: 7,
  },
  title: {
    fontSize: 38,
    lineHeight: 42,
    letterSpacing: -0.7,
    color: INK,
  },
  titleAccent: {
    fontSize: 38,
    lineHeight: 46,
    letterSpacing: -0.7,
  },
  titleCompact: {
    fontSize: 32,
    lineHeight: 36,
  },
  titleAccentCompact: {
    fontSize: 32,
    lineHeight: 39,
  },
  text: {
    marginTop: 12,
    fontSize: 13.5,
    lineHeight: 21,
    color: MUTED,
    letterSpacing: 0.1,
  },
  textCompact: {
    marginTop: 8,
    fontSize: 12.5,
    lineHeight: 19,
  },

  // Footer
  footer: { paddingTop: 12 },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  track: {
    width: 18,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(42, 32, 51, 0.16)',
    marginRight: 8,
  },
  trackActive: {
    width: 34,
    backgroundColor: ACCENT,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 999,
    paddingLeft: 24,
    paddingRight: 7,
    paddingVertical: 7,
    minHeight: 56,
    backgroundColor: ACCENT,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 5,
  },
  ctaText: {
    color: CREAM,
    fontSize: 17,
    letterSpacing: 0.2,
  },
  ctaArrow: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(253, 249, 243, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
