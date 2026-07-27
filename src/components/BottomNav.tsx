import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/tokens';

const items = [
  ['⌂', 'Explorar'],
  ['♡', 'Favoritos'],
  ['⚔', 'Decisões'],
  ['♙', 'Perfil'],
] as const;

type Props = { active: number; onChange: (index: number) => void };

export function BottomNav({ active, onChange }: Props) {
  return (
    <View style={styles.bar}>
      {items.map(([icon, label], index) => {
        const selected = active === index;
        return (
          <Pressable key={label} style={styles.item} onPress={() => onChange(index)}>
            <Text style={[styles.icon, selected && styles.selected]}>{icon}</Text>
            <Text style={[styles.label, selected && styles.selected]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    paddingTop: 10,
    paddingBottom: 12,
  },
  item: { flex: 1, alignItems: 'center', gap: 3 },
  icon: { fontSize: 23, color: colors.muted },
  label: { fontSize: 11, color: colors.muted },
  selected: { color: colors.coral, fontWeight: '700' },
});
