import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette, spacing } from '../../core/theme/designTokens';

interface AppContainerProps {
  children: React.ReactNode;
  scrollable?: boolean;
  padded?: boolean;
}

/**
 * AppContainer — safe area + consistent padding + optional scroll.
 * Wraps every screen for uniform layout.
 */
export const AppContainer: React.FC<AppContainerProps> = ({
  children,
  scrollable = true,
  padded = true,
}) => {
  const insets = useSafeAreaInsets();

  const content = (
    <View style={[
      styles.inner,
      padded && styles.padded,
      { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing['3xl'] },
    ]}>
      {children}
    </View>
  );

  if (scrollable) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {content}
      </ScrollView>
    );
  }

  return <View style={[styles.container, styles.flex]}>{content}</View>;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bgBase },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  inner: { flex: 1 },
  padded: { paddingHorizontal: spacing.screenPadding },
});
