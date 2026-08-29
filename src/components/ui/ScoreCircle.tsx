import { View, Text, StyleSheet } from 'react-native';
import { palette, typography } from '@/src/lib/theme';

interface ScoreCircleProps {
  score: number;
  size?: number;
  label?: string;
}

function getScoreColor(score: number): string {
  if (score >= 80) return palette.success;
  if (score >= 60) return palette.warning;
  return palette.error;
}

export function ScoreCircle({ score, size = 120, label }: ScoreCircleProps) {
  const color = getScoreColor(score);
  const borderWidth = size * 0.06;

  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth,
          borderColor: color + '30',
        },
      ]}
      accessible
      accessibilityLabel={`Score ${score}${label ? `, ${label}` : ''}`}
    >
      <View
        style={[
          styles.innerCircle,
          {
            width: size - borderWidth * 2 - 8,
            height: size - borderWidth * 2 - 8,
            borderRadius: (size - borderWidth * 2 - 8) / 2,
            borderWidth: borderWidth,
            borderColor: color,
          },
        ]}
      >
        <Text style={[styles.score, { fontSize: size * 0.26, color }]}>{score}</Text>
        {label && (
          <Text style={[styles.label, { fontSize: size * 0.1, color: color + 'AA' }]}>{label}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  score: {
    ...typography.number,
  },
  label: {
    marginTop: 1,
    fontWeight: '500',
  },
});
