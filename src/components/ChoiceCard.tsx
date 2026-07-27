import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme/tokens';

type Props = {
  emoji: string;
  label: string;
  selected?: boolean;
  onPress: () => void;
  compact?: boolean;
};

export function ChoiceCard({ emoji, label, selected = false, onPress, compact = false }: Props) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [
      styles.card,
      compact && styles.compact,
      selected && styles.selected,
      pressed && styles.pressed,
    ]}>
      <Text style={compact ? styles.smallEmoji : styles.emoji}>{emoji}</Text>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    minHeight: 116,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  compact: {
    minHeight: 52,
    width: '48%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 14,
    gap: 9,
  },
  selected: { backgroundColor: colors.sageSoft, borderColor: colors.sage },
  pressed: { opacity: 0.82 },
  emoji: { fontSize: 38 },
  smallEmoji: { fontSize: 19 },
  label: { color: colors.text, fontSize: 15, fontWeight: '600' },
});
