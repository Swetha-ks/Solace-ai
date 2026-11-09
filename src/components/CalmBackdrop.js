import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * Very soft, blurred-looking pastel orbs behind the content.
 * Purely decorative — it never intercepts touches.
 */
export default function CalmBackdrop() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={['rgba(216, 180, 254, 0.55)', 'rgba(216, 180, 254, 0)']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={[styles.orb, styles.orbTop]}
      />
      <LinearGradient
        colors={['rgba(251, 207, 232, 0.5)', 'rgba(251, 207, 232, 0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.orb, styles.orbLeft]}
      />
      <LinearGradient
        colors={['rgba(191, 219, 254, 0.42)', 'rgba(191, 219, 254, 0)']}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={[styles.orb, styles.orbBottom]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orbTop: {
    width: 300,
    height: 300,
    top: -90,
    right: -110,
  },
  orbLeft: {
    width: 240,
    height: 240,
    top: 260,
    left: -130,
  },
  orbBottom: {
    width: 320,
    height: 320,
    bottom: -140,
    right: -80,
  },
});
