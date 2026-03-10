import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthInput } from '../components/AuthInput';
import { AuthButton } from '../components/AuthButton';
import { authService } from '../services/authService';
import { palette, fonts, spacing, radius, shadows } from '../../../core/theme/designTokens';

export const SignupScreen = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    try {
      setLoading(true);
      await authService.signUp(email, password);
      Alert.alert('Success', 'Account created! You can now log in.');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Signup Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.illustrationArea}>
          <Text style={styles.illustrationEmoji}>💪</Text>
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Start your fitness transformation today</Text>
        </View>

        <View style={styles.form}>
          <AuthInput
            label="Email"
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <AuthInput
            label="Password"
            placeholder="Create a password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <View style={styles.buttonGroup}>
            <AuthButton
              title="Sign Up"
              onPress={handleSignup}
              loading={loading}
            />
            <AuthButton
              title="Already have an account?"
              variant="outline"
              onPress={() => navigation.goBack()}
              disabled={loading}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bgBase },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.screenPadding,
    justifyContent: 'center',
    paddingTop: 80,
  },
  illustrationArea: {
    alignItems: 'center',
    marginBottom: 40,
  },
  illustrationEmoji: { fontSize: 80 },
  header: { marginBottom: 40, alignItems: 'center' },
  title: { ...fonts.h1, color: palette.textPrimary, marginBottom: 12 },
  subtitle: { ...fonts.body, color: palette.textSecondary, textAlign: 'center', lineHeight: 22 },
  form: { width: '100%' },
  buttonGroup: { marginTop: 20, gap: 12 },
});
