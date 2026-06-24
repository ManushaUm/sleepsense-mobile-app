import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { COLORS } from '../theme/colors';

export default function Gauge({ score = 0, label = 'Unknown', size = 200, strokeWidth = 16 }) {
  // Score range is 0.0 - 3.0
  const normalizedScore = Math.max(0, Math.min(3.0, score));
  const percentage = score > 0 ? normalizedScore / 3.0 : 0;

  // Circle path calculations
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - percentage * circumference;

  // Decide indicator color based on score thresholds
  let color = COLORS.poor;
  if (score >= 2.0) {
    color = COLORS.good;
  } else if (score >= 1.0) {
    color = COLORS.fair;
  }

  // Friendly human-readable label mapper
  const getFriendlyLabel = (rawLabel) => {
    if (!score || score <= 0) return 'No Sleep Data 💤';
    const clean = String(rawLabel).toLowerCase();
    if (clean.includes('very good')) return 'Excellent Rest 🌟';
    if (clean.includes('fairly good')) return 'Good Rest 👍';
    if (clean.includes('fairly bad')) return 'Restless Sleep ⚠️';
    if (clean.includes('very bad')) return 'Poor / Restless Sleep 😴';
    return rawLabel;
  };

  const friendlyLabel = getFriendlyLabel(label);

  return (
    <View style={styles.wrapper}>
      <View style={[styles.container, { width: size, height: size }]}>
        <Svg width={size} height={size} style={styles.svg}>
          {/* Track circle (background) */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={COLORS.border}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>

        {/* Overlay labels */}
        <View style={styles.textContainer}>
          <Text style={styles.scoreText}>{score > 0 ? `${Math.round(percentage * 100)}%` : '--'}</Text>
          <Text style={styles.maxText}>Sleep Quality</Text>
        </View>
      </View>

      {/* Friendly description outside the circle */}
      <Text style={[styles.labelText, { color }]}>{friendlyLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  svg: {
    position: 'absolute',
  },
  textContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  maxText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: -4,
    fontWeight: '600',
  },
  labelText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
});
