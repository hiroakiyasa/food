import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, type ViewStyle } from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import { colors, radius } from '@/src/lib/theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = radius.sm,
  style,
}: SkeletonProps) {
  const isDark = useColorScheme() === 'dark';
  const c = isDark ? colors.dark : colors.light;
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width: width as number, height, borderRadius, backgroundColor: c.skeleton, opacity },
        style,
      ]}
    />
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  const isDark = useColorScheme() === 'dark';
  const c = isDark ? colors.dark : colors.light;

  return (
    <Animated.View style={[styles.card, { backgroundColor: c.surface }]}>
      <Skeleton width="40%" height={14} />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} width={i === lines - 1 ? '60%' : '100%'} height={12} style={{ marginTop: 10 }} />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  skeleton: {},
  card: {
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 12,
  },
});
