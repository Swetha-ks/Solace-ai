import React from 'react';
import Svg, {
  Circle,
  Ellipse,
  Path,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
} from 'react-native-svg';

/**
 * A simple, quiet Buddha — one silhouette, one soft gradient.
 *
 * Deliberately minimal: no face lines, no ornament. Just a still figure
 * breathing inside the light.
 */
export default function MeditatingBuddha({ size = 92, glow = true }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <Defs>
        <SvgGradient id="buddhaFill" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#C98D6F" />
          <Stop offset="1" stopColor="#9A6FA4" />
        </SvgGradient>
        <SvgGradient id="buddhaGlow" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#E9B9A0" stopOpacity="0.5" />
          <Stop offset="1" stopColor="#C4A7E8" stopOpacity="0.12" />
        </SvgGradient>
      </Defs>

      {glow ? (
        <>
          <Circle cx="50" cy="52" r="34" fill="url(#buddhaGlow)" />
          <Circle
            cx="50"
            cy="42"
            r="30.5"
            stroke="rgba(176, 102, 74, 0.22)"
            strokeWidth="0.8"
          />
        </>
      ) : null}

      {/* Ushnisha and head */}
      <Circle cx="50" cy="21.5" r="4.2" fill="url(#buddhaFill)" />
      <Circle cx="50" cy="35" r="11" fill="url(#buddhaFill)" />

      {/* The small quiet point between the brows */}
      <Circle cx="50" cy="31.4" r="1.15" fill="#FDF9F3" opacity="0.85" />

      {/* Shoulders folding into the lap */}
      <Path
        d="M50 45 C39.5 45 34 53.5 31 68.5 C40 72.5 60 72.5 69 68.5 C66 53.5 60.5 45 50 45 Z"
        fill="url(#buddhaFill)"
      />

      {/* Hands, resting */}
      <Ellipse cx="50" cy="74.6" rx="7.2" ry="3.4" fill="#FDF9F3" opacity="0.42" />

      {/* Crossed legs */}
      <Path
        d="M22 79 C30 70.5 42 71.5 50 75.5 C58 71.5 70 70.5 78 79 C71.5 87.5 61 89.5 50 87.5 C39 89.5 28.5 87.5 22 79 Z"
        fill="url(#buddhaFill)"
      />

      {/* A soft place to sit */}
      <Ellipse cx="50" cy="92" rx="18" ry="2.6" fill="rgba(176, 102, 74, 0.14)" />
    </Svg>
  );
}
