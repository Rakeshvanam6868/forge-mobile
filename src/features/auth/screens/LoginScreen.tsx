import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthInput } from '../components/AuthInput';
import { AuthButton } from '../components/AuthButton';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import { authService } from '../services/authService';
import { palette, fonts, spacing } from '../../../core/theme/designTokens';
import { BrandIdentity } from '../../../core/components/BrandIdentity';

export const LoginScreen = () => {
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    try {
      setLoading(true);
      await authService.signIn(email, password);
    } catch (error: any) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const result = await authService.signInWithGoogle();
      // If result is success, we STAY loading until the auth listener handles navigation
      if (!result?.success) {
        setLoading(false);
      }
    } catch (error: any) {
      if (error.message !== 'Google sign-in was cancelled' && 
          error.message !== 'Google sign-in was cancelled or failed to retrieve session') {
        Alert.alert('Google Sign-In Failed', error.message);
      }
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Branded Identity */}
        <View style={styles.illustrationArea}>
          <BrandIdentity size="large" vertical />
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue your fitness journey</Text>
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
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <View style={styles.buttonGroup}>
            <AuthButton
              title="Sign In"
              onPress={handleLogin}
              loading={loading}
            />
            <AuthButton
              title="Create an account"
              variant="outline"
              onPress={() => navigation.navigate('Signup')}
              disabled={loading}
            />
            
            <View style={styles.divider}>
              <View style={styles.line} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.line} />
            </View>

            <GoogleSignInButton
              disabled={loading}
              onPress={handleGoogleLogin}
            />
          </View>
        </View>
      </ScrollView>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={palette.primary} />
          <Text style={styles.loadingText}>Authenticating...</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bgBase },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.screenPadding,
    justifyContent: 'center',
    paddingTop: 40,
  },
  illustrationArea: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  illustrationEmoji: { fontSize: 64 },
  header: { marginBottom: spacing.xxl },
  title: { ...fonts.h1, color: palette.textPrimary, marginBottom: spacing.sm },
  subtitle: { ...fonts.body, color: palette.textSecondary, lineHeight: 22 },
  form: { width: '100%' },
  buttonGroup: { marginTop: spacing.lg, gap: spacing.md },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.md },
  line: { flex: 1, height: 1, backgroundColor: palette.borderSubtle },
  dividerText: { marginHorizontal: spacing.sm, ...fonts.label, color: palette.textMuted },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    ...fonts.h3,
    color: palette.white,
    marginTop: spacing.md,
  },
});
