import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { login } from '../store/authStore';
import { useNavigation } from '@react-navigation/native';
import { toast } from '../../components/toastComponent';

const LoginScreen = () => {
  const navigation = useNavigation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      toast.error('Error', 'Username dan password wajib diisi');
      return;
    }

    try {
      setLoading(true);
      const result = await login(username, password);

      if (result.success) {
        toast.success(
          'Login Berhasil',
          'Selamat datang ' + (result.user?.name || username),
        );
        (navigation as any).replace('Home');
      } else {
        toast.error('Login Gagal', result.message || 'Login gagal');
      }
    } catch (error: any) {
      toast.error('Error', error?.message || 'Terjadi kesalahan saat login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sistem MMT Login</Text>

      <TextInput
        style={styles.input}
        placeholder="Username"
        autoCapitalize="none"
        value={username}
        onChangeText={setUsername}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Menghubungkan...' : 'MASUK'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    marginBottom: 15,
    borderRadius: 10,
  },
  button: { backgroundColor: '#2196F3', padding: 15, borderRadius: 10 },
  buttonText: { color: 'white', textAlign: 'center', fontWeight: 'bold' },
  buttonDisabled: { backgroundColor: '#ccc' },
});

export default LoginScreen;
