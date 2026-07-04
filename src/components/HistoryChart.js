import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Line, Text as SvgText } from 'react-native-svg';
import { COLORS } from '../theme/colors';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 40 - 24; // Padding adjustments
const CHART_HEIGHT = 160;

export default function HistoryChart({ history = [] }) {
  // Take last 7 days of prediction data, sorted chronologically
  const sortedHistory = [...history]
    .reverse()
    .slice(-7)
    .map(item => {
      // Convert 0.0 - 3.0 score to 0 - 100 percentage
      const pct = Math.round((item.predicted_score / 3.0) * 100);
      
      // Parse YYYY-MM-DD to MM-DD
      const dateParts = item.date.split('-');
      const dateStr = dateParts.length >= 3 ? `${dateParts[1]}/${dateParts[2]}` : item.date;
      
      return {
        date: dateStr,
        score: pct,
        label: item.predicted_label,
      };
    });

  // Fallback mock data if no history exists yet
  const chartData = sortedHistory.length >= 2 ? sortedHistory : [
    { date: '06/20', score: 65 },
    { date: '06/21', score: 80 },
    { date: '06/22', score: 45 },
    { date: '06/23', score: 75 },
    { date: '06/24', score: 90 },
    { date: '06/25', score: 85 },
    { date: 'Today', score: 70 },
  ];

  const maxVal = 100;
  const paddingX = 30;
  const paddingY = 20;
  const graphWidth = CHART_WIDTH - paddingX * 2;
  const graphHeight = CHART_HEIGHT - paddingY * 2;

  // Calculate coordinates for points
  const points = chartData.map((d, index) => {
    const x = paddingX + (index * (graphWidth / (chartData.length - 1)));
    const y = CHART_HEIGHT - paddingY - ((d.score / maxVal) * graphHeight);
    return { x, y, score: d.score, date: d.date };
  });

  // Generate SVG path for the line
  let linePath = '';
  let fillPath = '';

  if (points.length > 0) {
    linePath = `M ${points[0].x} ${points[0].y}`;
    points.forEach((p, index) => {
      if (index > 0) {
        linePath += ` L ${p.x} ${p.y}`;
      }
    });

    // Fill path goes to the bottom of the graph to close the polygon
    fillPath = `${linePath} L ${points[points.length - 1].x} ${CHART_HEIGHT - paddingY} L ${points[0].x} ${CHART_HEIGHT - paddingY} Z`;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.chartTitle}>7-Day Sleep Score Trends</Text>
      
      <View style={styles.chartWrapper}>
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          <Defs>
            {/* Smooth glowing gradient under the line */}
            <LinearGradient id="gradientFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={COLORS.primaryLight} stopOpacity="0.45" />
              <Stop offset="1" stopColor={COLORS.primary} stopOpacity="0.0" />
            </LinearGradient>
            {/* Line glow effect */}
            <LinearGradient id="lineColor" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={COLORS.primaryLight} stopOpacity="1" />
              <Stop offset="1" stopColor="#A5B4FC" stopOpacity="1" />
            </LinearGradient>
          </Defs>

          {/* Gridlines */}
          {[0.25, 0.5, 0.75, 1.0].map((ratio, idx) => {
            const y = CHART_HEIGHT - paddingY - (ratio * graphHeight);
            return (
              <Line
                key={idx}
                x1={paddingX}
                y1={y}
                x2={CHART_WIDTH - paddingX}
                y2={y}
                stroke={COLORS.border}
                strokeWidth="1"
                strokeDasharray="4 4"
              />
            );
          })}

          {/* Render filled area under the line */}
          {fillPath ? <Path d={fillPath} fill="url(#gradientFill)" /> : null}

          {/* Render the curve line */}
          {linePath ? (
            <Path
              d={linePath}
              fill="none"
              stroke="url(#lineColor)"
              strokeWidth="3.5"
            />
          ) : null}

          {/* Render points and score values */}
          {points.map((p, idx) => (
            <React.Fragment key={idx}>
              {/* Outer ring */}
              <Circle cx={p.x} cy={p.y} r="6" fill={COLORS.card} stroke={COLORS.primaryLight} strokeWidth="2" />
              {/* Inner core */}
              <Circle cx={p.x} cy={p.y} r="2.5" fill={COLORS.white} />
              
              {/* Score text label above point */}
              <SvgText
                x={p.x}
                y={p.y - 10}
                fontSize="9"
                fontWeight="bold"
                fill={COLORS.text}
                textAnchor="middle"
              >
                {p.score}%
              </SvgText>

              {/* Date text label below the graph */}
              <SvgText
                x={p.x}
                y={CHART_HEIGHT - 4}
                fontSize="9"
                fill={COLORS.textSecondary}
                textAnchor="middle"
              >
                {p.date}
              </SvgText>
            </React.Fragment>
          ))}
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primaryLight,
    letterSpacing: 1.0,
    textTransform: 'uppercase',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
