import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../core/supabase/client';
import { useAuth } from '../../auth/hooks/useAuth';
import { palette, fonts, spacing, radius, shadows } from '../../../core/theme/designTokens';
import { GradientCard } from '../../../core/components/GradientCard';

export const PredictionCard = ({ currentWorkoutType }: { currentWorkoutType: string }) => {
  const { user } = useAuth();

  const { data: lastSession, isLoading } = useQuery({
    queryKey: ['lastSessionSummary', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      // Get the most recent completed session
      const { data, error } = await supabase
        .from('workout_sessions')
        .select('total_volume, completed_at, workout_type')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "No rows found"
      return data;
    },
    enabled: !!user?.id,
  });

  if (isLoading || !lastSession) return null;

  const lastVolume = lastSession.total_volume || 0;
  const predictionVolume = Math.round(lastVolume * 1.05 / 2.5) * 2.5; // Predict 5% increase

  return (
    <GradientCard 
      colors={[palette.primary, palette.primaryDark]} 
      style={styles.card}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Session Prediction</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>AI INSIGHT</Text>
          </View>
        </View>
        
        <Text style={styles.predictionText}>
          Based on your last <Text style={styles.highlight}>{lastSession.workout_type}</Text> session, 
          we predict you will hit <Text style={styles.highlight}>{predictionVolume}kg</Text> total volume today.
        </Text>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Last Volume: {lastVolume}kg • +5% Target
          </Text>
        </View>
      </View>
    </GradientCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: spacing.md,
    ...shadows.level2,
  },
  content: {
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    ...fonts.h3,
    color: palette.white,
    letterSpacing: 0.5,
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    ...fonts.label,
    color: palette.white,
    fontSize: 10,
    fontWeight: '700',
  },
  predictionText: {
    ...fonts.body,
    color: palette.white,
    lineHeight: 22,
    opacity: 0.9,
  },
  highlight: {
    fontWeight: '800',
    color: palette.white,
  },
  footer: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  footerText: {
    ...fonts.label,
    color: palette.white,
    opacity: 0.7,
    fontSize: 12,
  },
});
