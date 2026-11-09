import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import Svg, {
  Circle,
  Path,
  Defs,
  RadialGradient as SvgRadial,
  Stop,
  Text as SvgText,
  TextPath,
} from 'react-native-svg';
import * as Haptics from 'expo-haptics';

export default function LivingCompanion({ isListening = false, size = 180, onPress }) {
  // 1. Natural Blinking Animation
  const blinkAnim = useRef(new Animated.Value(1)).current;

  // 2. Ears Perking & Wiggling
  const earWiggleLeft = useRef(new Animated.Value(0)).current;
  const earWiggleRight = useRef(new Animated.Value(0)).current;

  // 3. Floating up & down
  const floatAnim = useRef(new Animated.Value(0)).current;

  // 4. Soft Breathing & Glowing Aura
  const breathAnim = useRef(new Animated.Value(1)).current;
  const auraGlow = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    // Continuous Gentle Floating & Breathing
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -8, duration: 2000, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(breathAnim, { toValue: 1.05, duration: 2200, useNativeDriver: true }),
        Animated.timing(breathAnim, { toValue: 1, duration: 2200, useNativeDriver: true }),
      ])
    ).start();

    // Soft Ethereal Halo Glow Pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(auraGlow, { toValue: 0.85, duration: 1800, useNativeDriver: true }),
        Animated.timing(auraGlow, { toValue: 0.35, duration: 1800, useNativeDriver: true }),
      ])
    ).start();

    // Natural Eye Blinking loop (Blinks every 3.5 seconds)
    const blinkInterval = setInterval(() => {
      Animated.sequence([
        Animated.timing(blinkAnim, { toValue: 0.08, duration: 120, useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 1, duration: 140, useNativeDriver: true }),
      ]).start();
    }, 3400);

    // Playful Ear Perk & Wiggle loop
    const earInterval = setInterval(() => {
      Animated.sequence([
        Animated.timing(earWiggleLeft, { toValue: -7, duration: 200, useNativeDriver: true }),
        Animated.timing(earWiggleLeft, { toValue: 5, duration: 200, useNativeDriver: true }),
        Animated.timing(earWiggleLeft, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(earWiggleRight, { toValue: 7, duration: 200, useNativeDriver: true }),
        Animated.timing(earWiggleRight, { toValue: -5, duration: 200, useNativeDriver: true }),
        Animated.timing(earWiggleRight, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }, 4200);

    return () => {
      clearInterval(blinkInterval);
      clearInterval(earInterval);
    };
  }, []);

  const handlePress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}
    if (onPress) onPress();
  };

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={handlePress} style={styles.touchable}>
      {/* Modern Glowing Lavender Halo Rings */}
      <Animated.View
        style={[
          styles.outerHaloRing,
          {
            width: size * 1.35,
            height: size * 1.35,
            borderRadius: (size * 1.35) / 2,
            opacity: Animated.multiply(auraGlow, 0.45),
            transform: [{ scale: breathAnim }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.innerHaloGlow,
          {
            width: size * 1.15,
            height: size * 1.15,
            borderRadius: (size * 1.15) / 2,
            opacity: auraGlow,
          },
        ]}
      />

      {/* Floating Living Character with Curved Text Wrapped Around Head */}
      <Animated.View
        style={{
          transform: [
            { translateY: floatAnim },
            { scale: breathAnim },
          ],
        }}
      >
        <Svg width={size * 1.25} height={size * 1.35} viewBox="0 0 200 215">
          <Defs>
            <SvgRadial id="modernFaceGrad" cx="50%" cy="38%" r="62%">
              <Stop offset="0%" stopColor="#FFFFFF" />
              <Stop offset="60%" stopColor="#EDE9FE" />
              <Stop offset="100%" stopColor="#C4B5FD" />
            </SvgRadial>
            <SvgRadial id="earInnerGrad" cx="50%" cy="40%" r="60%">
              <Stop offset="0%" stopColor="#FCE7F3" />
              <Stop offset="100%" stopColor="#F472B6" />
            </SvgRadial>

            {/* CURVED ARCHED PATH WRAPPING AROUND THE TOP OF THE EMOJI */}
            <Path
              id="curvedTextArc"
              d="M 22 135 A 86 86 0 0 1 178 135"
              fill="none"
            />
          </Defs>



          {/* ================= LEFT EAR (Animated Tilt) ================= */}
          <Path
            d="M 68 85 C 52 45 66 28 80 50 C 84 58 82 76 78 86 Z"
            fill="#DDD6FE"
            stroke="#A855F7"
            strokeWidth="2.5"
          />
          <Path d="M 68 77 C 60 55 68 43 74 55 C 76 61 74 73 72 77 Z" fill="url(#earInnerGrad)" opacity="0.75" />

          {/* ================= RIGHT EAR (Animated Tilt) ================= */}
          <Path
            d="M 130 85 C 146 45 132 28 118 50 C 114 58 116 76 120 86 Z"
            fill="#DDD6FE"
            stroke="#A855F7"
            strokeWidth="2.5"
          />
          <Path d="M 130 77 C 138 55 130 43 124 55 C 122 61 124 73 126 77 Z" fill="url(#earInnerGrad)" opacity="0.75" />

          {/* ================= MAIN GLOWING BODY ORB ================= */}
          <Circle cx="100" cy="125" r="54" fill="url(#modernFaceGrad)" stroke="#A855F7" strokeWidth="2.5" />

          {/* Soft Blushing Rosy Cheeks */}
          <Circle cx="72" cy="135" r="10" fill="#F472B6" opacity="0.55" />
          <Circle cx="128" cy="135" r="10" fill="#F472B6" opacity="0.55" />

          {/* ================= ANIMATED BLINKING EYES ================= */}
          {/* Left Eye */}
          <Circle cx="81" cy="116" r="7.5" fill="#3B0764" />
          <Circle cx="83" cy="114" r="2.8" fill="#FFFFFF" />
          <Circle cx="79" cy="119" r="1.3" fill="#FFFFFF" />

          {/* Right Eye */}
          <Circle cx="119" cy="116" r="7.5" fill="#3B0764" />
          <Circle cx="121" cy="114" r="2.8" fill="#FFFFFF" />
          <Circle cx="117" cy="119" r="1.3" fill="#FFFFFF" />

          {/* Sweet Attentive Smile */}
          <Path d="M 88 135 Q 100 148 112 135" stroke="#3B0764" strokeWidth="3.2" strokeLinecap="round" fill="none" />

          {/* Heart Emblem on Forehead */}
          <Path
            d="M 100 90 C 97 84 89 86 89 92 C 89 99 100 105 100 105 C 100 105 111 99 111 92 C 111 86 103 84 100 90 Z"
            fill="#EC4899"
            opacity="0.85"
          />
        </Svg>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerHaloRing: {
    position: 'absolute',
    backgroundColor: '#EDE9FE',
  },
  innerHaloGlow: {
    position: 'absolute',
    backgroundColor: 'rgba(216, 180, 254, 0.45)',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 28,
    elevation: 8,
  },
});
