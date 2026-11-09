import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import Svg, { Circle, Path, Defs, RadialGradient as SvgRadial, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

export default function ListeningMascot({ isListening = false, size = 110, onPress }) {
  const earWiggle = useRef(new Animated.Value(0)).current;
  const soundWave1 = useRef(new Animated.Value(1)).current;
  const soundWave2 = useRef(new Animated.Value(1)).current;
  const breathAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Gentle breathing
    Animated.loop(
      Animated.sequence([
        Animated.timing(breathAnim, { toValue: 1.05, duration: 1800, useNativeDriver: true }),
        Animated.timing(breathAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
      ])
    ).start();

    if (isListening) {
      // Ears perking up and wiggling with attention!
      Animated.loop(
        Animated.sequence([
          Animated.timing(earWiggle, { toValue: -6, duration: 300, useNativeDriver: true }),
          Animated.timing(earWiggle, { toValue: 6, duration: 300, useNativeDriver: true }),
          Animated.timing(earWiggle, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(1200),
        ])
      ).start();

      // Radiating soundwaves from ears
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(soundWave1, { toValue: 1.5, duration: 1400, useNativeDriver: true }),
            Animated.timing(soundWave2, { toValue: 1.8, duration: 1800, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(soundWave1, { toValue: 1, duration: 0, useNativeDriver: true }),
            Animated.timing(soundWave2, { toValue: 1, duration: 0, useNativeDriver: true }),
          ]),
        ])
      ).start();
    }
  }, [isListening]);

  const handlePress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
    if (onPress) onPress();
  };

  return (
    <TouchableOpacity activeOpacity={0.88} onPress={handlePress} style={styles.container}>
      {/* Soundwaves radiating from ears when listening */}
      {isListening && (
        <>
          <Animated.View
            style={[
              styles.soundWaveRing,
              {
                width: size * 1.35,
                height: size * 1.35,
                borderRadius: (size * 1.35) / 2,
                transform: [{ scale: soundWave1 }],
                opacity: 0.45,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.soundWaveRing,
              {
                width: size * 1.6,
                height: size * 1.6,
                borderRadius: (size * 1.6) / 2,
                transform: [{ scale: soundWave2 }],
                opacity: 0.25,
              },
            ]}
          />
        </>
      )}

      {/* Main Companion Body with Cute Listening Ears */}
      <Animated.View
        style={{
          transform: [
            { scale: breathAnim },
            { rotate: earWiggle.interpolate({ inputRange: [-10, 10], outputRange: ['-5deg', '5deg'] }) },
          ],
        }}
      >
        <Svg width={size} height={size * 1.15} viewBox="0 0 120 138">
          <Defs>
            <SvgRadial id="earsGrad" cx="50%" cy="40%" r="60%">
              <Stop offset="0%" stopColor="#FFFFFF" />
              <Stop offset="70%" stopColor="#E9D5FF" />
              <Stop offset="100%" stopColor="#C084FC" />
            </SvgRadial>
          </Defs>

          {/* Left Cute Listening Ear (perking up) */}
          <Path
            d="M 32 44 C 18 10 32 -4 44 14 C 48 22 46 38 42 46 Z"
            fill="#DDD6FE"
            stroke="#A855F7"
            strokeWidth="2.5"
          />
          {/* Left Ear Inner Soft Pink */}
          <Path d="M 32 36 C 26 16 32 6 38 18 C 40 24 38 34 36 38 Z" fill="#F472B6" opacity="0.6" />

          {/* Right Cute Listening Ear (perking up) */}
          <Path
            d="M 88 44 C 102 10 88 -4 76 14 C 72 22 74 38 78 46 Z"
            fill="#DDD6FE"
            stroke="#A855F7"
            strokeWidth="2.5"
          />
          {/* Right Ear Inner Soft Pink */}
          <Path d="M 88 36 C 94 16 88 6 82 18 C 80 24 82 34 84 38 Z" fill="#F472B6" opacity="0.6" />

          {/* Main Face Orb */}
          <Circle cx="60" cy="80" r="48" fill="url(#earsGrad)" stroke="#A855F7" strokeWidth="2.5" />

          {/* Rosy Blushing Cheeks */}
          <Circle cx="36" cy="90" r="9" fill="#F472B6" opacity="0.55" />
          <Circle cx="84" cy="90" r="9" fill="#F472B6" opacity="0.55" />

          {/* Caring Attentive Eyes with Sparkle */}
          <Circle cx="44" cy="74" r="6.5" fill="#4C1D95" />
          <Circle cx="46" cy="72" r="2.2" fill="#FFFFFF" />
          <Circle cx="76" cy="74" r="6.5" fill="#4C1D95" />
          <Circle cx="78" cy="72" r="2.2" fill="#FFFFFF" />

          {/* Sweet Attentive Smile */}
          <Path d="M 50 90 Q 60 100 70 90" stroke="#4C1D95" strokeWidth="3" strokeLinecap="round" fill="none" />

          {/* Soft Forehead Heart */}
          <Path
            d="M 60 52 C 57 47 51 49 51 54 C 51 60 60 65 60 65 C 60 65 69 60 69 54 C 69 49 63 47 60 52 Z"
            fill="#EC4899"
            opacity="0.85"
          />
        </Svg>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  soundWaveRing: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#C084FC',
    backgroundColor: 'rgba(233, 213, 255, 0.25)',
  },
});
