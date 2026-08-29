import { View, Text, StyleSheet } from 'react-native';

// Placeholder - the FAB button redirects to the camera modal
export default function CameraTabPlaceholder() {
  return (
    <View style={styles.container}>
      <Text>カメラ</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
