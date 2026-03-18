import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { authService } from '../services/authService';
import { palette, fonts, spacing, radius } from '../../../core/theme/designTokens';

interface Props {
  onPress?: () => void;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

export const GoogleSignInButton: React.FC<Props> = ({ onPress, onSuccess, onError, disabled }) => {
  const [loading, setLoading] = useState(false);

  const handlePress = async () => {
    if (onPress) {
      onPress();
      return;
    }
    try {
      setLoading(true);
      await authService.signInWithGoogle();
      if (onSuccess) onSuccess();
    } catch (e: any) {
      if (onError) onError(e.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.disabled]}
      onPress={handlePress}
      disabled={loading || disabled}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color="#000" size="small" />
        ) : (
          <>
            <IconGoogle />
            <Text style={styles.text}>Continue with Google</Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
};

// Simple standalone Google Icon (no external SVG library needed if not installed, but react-native-svg is in package.json)
import Svg, { Path } from 'react-native-svg';

const IconGoogle = () => (
  <View style={styles.iconWrap}>
    <Svg width="18" height="18" viewBox="0 0 24 24">
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </Svg>
  </View>
);

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#FFFFFF', // Google guidelines typically require a white background in dark mode
    borderRadius: radius.md,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  disabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12, // For RN 0.71+
  },
  iconWrap: {
    marginRight: 2, // backup for gap
  },
  text: {
    ...fonts.h3,
    fontSize: 16,
    color: '#0F172A',
  },
});
