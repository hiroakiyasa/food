import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polygon, Circle, Line } from 'react-native-svg';
import {
  useSharedValue,
  withTiming,
  Easing,
  runOnJS,
  useAnimatedReaction,
} from 'react-native-reanimated';
import { typography } from '@/src/lib/theme';

export interface RadarDataPoint {
  label: string;
  value: number;
  maxValue: number;
}

interface RadarChartProps {
  data: RadarDataPoint[];
  size?: number;
  fillColor?: string;
  strokeColor?: string;
  animated?: boolean;
  isDark: boolean;
  showLabels?: boolean;
}

function getPolygonPoint(
  centerX: number,
  centerY: number,
  radius: number,
  index: number,
  total: number,
): { x: number; y: number } {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  return {
    x: centerX + radius * Math.cos(angle),
    y: centerY + radius * Math.sin(angle),
  };
}

function RadarChartComponent({
  data,
  size = 200,
  fillColor = '#28A86B40',
  strokeColor = '#28A86B',
  animated = true,
  isDark,
  showLabels = true,
}: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const chartRadius = size / 2 - (showLabels ? 30 : 10);
  const gridLevels = [0.25, 0.5, 0.75, 1.0];
  const gridColor = isDark ? '#334155' : '#E9E5D8';
  const labelColor = isDark ? '#8D9993' : '#66766F';
  const n = data.length;

  const ratios = data.map((d) => Math.min(d.value / d.maxValue, 1.5));

  // State-based animation: shared value drives React state via useAnimatedReaction
  const progress = useSharedValue(animated ? 0 : 1);
  const [currentProgress, setCurrentProgress] = useState(animated ? 0 : 1);

  const updateProgress = useCallback((val: number) => {
    setCurrentProgress(val);
  }, []);

  useAnimatedReaction(
    () => progress.value,
    (val) => {
      runOnJS(updateProgress)(val);
    },
    [updateProgress],
  );

  useEffect(() => {
    if (animated) {
      progress.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });
    }
  }, [animated]);

  // Compute polygon points string from current progress
  const dataPoints = ratios.map((ratio, i) => {
    const r = chartRadius * ratio * currentProgress;
    return getPolygonPoint(cx, cy, r, i, n);
  });
  const dataPointsStr = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');

  // Static data points (final positions, for circles)
  const finalPoints = ratios.map((ratio, i) => {
    const r = chartRadius * Math.min(ratio, 1.5);
    return getPolygonPoint(cx, cy, r, i, n);
  });

  return (
    <View style={[styles.container, { width: size, height: size + (showLabels ? 10 : 0) }]}>
      <Svg width={size} height={size}>
        {/* Grid */}
        {gridLevels.map((level) => {
          const pts = Array.from({ length: n }, (_, i) =>
            getPolygonPoint(cx, cy, chartRadius * level, i, n),
          )
            .map((p) => `${p.x},${p.y}`)
            .join(' ');
          return (
            <Polygon
              key={level}
              points={pts}
              fill="none"
              stroke={gridColor}
              strokeWidth={0.5}
            />
          );
        })}

        {/* Axes */}
        {data.map((_, i) => {
          const pt = getPolygonPoint(cx, cy, chartRadius, i, n);
          return (
            <Line
              key={i}
              x1={cx}
              y1={cy}
              x2={pt.x}
              y2={pt.y}
              stroke={gridColor}
              strokeWidth={0.5}
            />
          );
        })}

        {/* Data polygon */}
        <Polygon
          points={dataPointsStr}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={2}
        />

        {/* Data points */}
        {finalPoints.map((pt, i) => (
          <Circle
            key={i}
            cx={pt.x}
            cy={pt.y}
            r={3}
            fill={strokeColor}
          />
        ))}
      </Svg>

      {/* Labels */}
      {showLabels &&
        data.map((d, i) => {
          const pt = getPolygonPoint(cx, cy, chartRadius + 18, i, n);
          return (
            <Text
              key={i}
              style={[
                styles.label,
                {
                  color: labelColor,
                  left: pt.x - 20,
                  top: pt.y - 7,
                },
              ]}
            >
              {d.label}
            </Text>
          );
        })}
    </View>
  );
}

export const RadarChart = React.memo(RadarChartComponent);

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    position: 'absolute',
    ...typography.caption2,
    width: 40,
    textAlign: 'center',
  },
});
