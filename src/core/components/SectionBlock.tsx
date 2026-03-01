import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { palette, fonts, spacing } from '../../core/theme/designTokens';

interface SectionBlockProps {
  title?: string;
  children: React.ReactNode;
}

export const SectionBlock: React.FC<SectionBlockProps> = ({ title, children }) => (
  <View style={styles.container}>
    {title ? <Text style={styles.title}>{title}</Text> : null}
    {children}
  </View>
);

const styles = StyleSheet.create({
  container: { marginTop: spacing.sectionGap },
  title: { ...fonts.sectionHeader, color: palette.textPrimary, marginBottom: spacing.innerMd },
});
