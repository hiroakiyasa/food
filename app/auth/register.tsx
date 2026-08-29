import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { signUpWithEmail } from '@/src/lib/auth';
import { isValidEmail, isValidPassword } from '@/src/utils/validators';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async () => {
    if (!isValidEmail(email)) {
      Alert.alert('エラー', '有効なメールアドレスを入力してください');
      return;
    }
    if (!isValidPassword(password)) {
      Alert.alert('エラー', 'パスワードは8文字以上で入力してください');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('エラー', 'パスワードが一致しません');
      return;
    }

    setLoading(true);
    try {
      await signUpWithEmail(email, password);
      Alert.alert('登録完了', '確認メールを送信しました。メールのリンクをクリックしてアカウントを有効化してください。', [
        { text: 'OK', onPress: () => router.replace('/auth/login') },
      ]);
    } catch (error) {
      Alert.alert('登録エラー', (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.title}>新規登録</Text>
        <Text style={styles.subtitle}>アカウントを作成して始めましょう</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="メールアドレス"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
            accessibilityLabel="メールアドレス"
          />
          <TextInput
            style={styles.input}
            placeholder="パスワード（8文字以上）"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="newPassword"
            accessibilityLabel="パスワード 8文字以上"
          />
          <TextInput
            style={styles.input}
            placeholder="パスワード（確認）"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            textContentType="newPassword"
            accessibilityLabel="パスワード確認"
          />

          <Pressable
            onPress={handleRegister}
            disabled={loading}
            style={[styles.button, loading && styles.buttonDisabled]}
            accessibilityRole="button"
            accessibilityLabel="登録する"
          >
            <Text style={styles.buttonText}>
              {loading ? '登録中...' : '登録する'}
            </Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => router.replace('/auth/login')}
          style={styles.loginLinkButton}
          accessibilityRole="button"
          accessibilityLabel="ログイン画面へ"
        >
          <Text style={styles.linkText}>
            すでにアカウントをお持ちの方は <Text style={styles.link}>ログイン</Text>
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 40,
  },
  form: { gap: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#f9fafb',
  },
  button: {
    backgroundColor: '#22c55e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  linkText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
  },
  link: { color: '#3b82f6', fontWeight: '500' },
  loginLinkButton: {
    marginTop: 24,
    minHeight: 44,
    justifyContent: 'center',
  },
});
