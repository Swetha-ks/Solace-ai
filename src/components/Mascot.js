import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, TouchableOpacity, Text } from 'react-native';
import Svg, { Circle, Path, Defs, RadialGradient, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';

export default function Mascot({ mood = 'idle', onPress, size = 160 }) {
  const breathAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  // Gentle breathing and floating loop
  useEffect(() => {
    const breathing = Animated.loop(
      Animated.sequence([
        Animated.timing(breathAnim, {
          toValue: 1.08,
          duration: 2600,
          useNativeDriver: true,
        }),
        Animated.timing(breathAnim, {
          toValue: 1,
          duration: 2600,
          useNativeDriver: true,
        }),
      ])
    );

    const glowing = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.85,
          duration: 2200,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.35,
          duration: 2200,
          useNativeDriver: true,
        }),
      ])
    );

    const floating = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );

    breathing.start();
    glowing.start();
    floating.start();

    return () => {
      breathing.stop();
      glowing.stop();
      floating.stop();
    };
  }, []);

  const handlePress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      // Haptics fallback for web
    }
    if (onPress) onPress();
  };

  const isSmiling = mood === 'comforting' || mood === 'smile';

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={handlePress}
      style={styles.touchable}
    >
      <Animated.View
        style={[
          styles.container,
          {
            width: size,
            height: size,
            transform: [
              { scale: breathAnim },
              { translateY: floatAnim },
            ],
          },
        ]}
      >
        {/* Glowing Lavender Halo */}
        <Animated.View
          style={[
            styles.halo,
            {
              width: size * 1.35,
              height: size * 1.35,
              opacity: glowAnim,
            },
          ]}
        />

        {/* Mascot Face & Body SVG */}
        <Svg width={size} height={size} viewBox="0 0 160 160">
          <Defs>
            <RadialGradient id="mascotGrad" cx="50%" cy="40%" r="60%">
              <Stop offset="0%" stopColor="#FFFFFF" />
              <Stop offset="65%" stopColor="#E9D5FF" />
              <Stop offset="100%" stopColor="#D8B4FE" />
            </RadialGradient>
          </Defs>

          {/* Main Body Orb */}
          <Circle
            cx="80"
            cy="80"
            r="68"
            fill="url(#mascotGrad)"
            stroke="#C4B5FD"
            strokeWidth="3"
          />

          {/* Rosy Cheeks */}
          <Circle cx="45" cy="94" r="11" fill="#F472B6" opacity="0.45" />
          <Circle cx="115" cy="94" r="11" fill="#F472B6" opacity="0.45" />

          {/* Eyes */}
          {isSmiling ? (
            // Happy crescent eyes
            <>
              <Path
                d="M 46 76 Q 56 64 66 76"
                stroke="#4C1D95"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
              />
              <Path
                d="M 94 76 Q 104 64 114 76"
                stroke="#4C1D95"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
              />
            </>
          ) : (
            // Gentle caring open eyes with sparkle
            <>
              <Circle cx="56" cy="74" r="7" fill="#4C1D95" />
              <Circle cx="58" cy="71" r="2.5" fill="#FFFFFF" />
              <Circle cx="104" cy="74" r="7" fill="#4C1D95" />
              <Circle cx="106" cy="71" r="2.5" fill="#FFFFFF" />
            </>
          )}

          {/* Pretty Gentle Smile */}
          <Path
            d={
              isSmiling
                ? 'M 64 96 Q 80 114 96 96'
                : 'M 68 96 Q 80 106 92 96'
            }
            stroke="#4C1D95"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />

          {/* Small Heart on forehead */}
          <Path
            d="M 80 40 C 76 34 68 36 68 43 C 68 51 80 58 80 58 C 80 58 92 51 92 43 C 92 36 84 34 80 40 Z"
            fill="#EC4899"
            opacity="0.8"
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
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    borderRadius: 200,
    backgroundColor: '#C4B5FD',
  },
});
