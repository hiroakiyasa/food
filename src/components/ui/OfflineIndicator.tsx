import { View, Text, StyleSheet } from 'react-native';
import { useNetworkStatus } from '@/src/hooks/useNetworkStatus';
import { palette, typography, spacing } from '@/src/lib/theme';

export function OfflineIndicator() {
  const isOnline = useNetworkStatus();

  if (isOnline) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>オフラインです</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: palette.warning,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  text: {
    ...typography.caption1,
    color: palette.white,
    fontWeight: '600',
  },
});
