import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius } from '../theme/tokens';

type Props = {
  label: string;
  onPress: () => void;
  tone?: 'coral' | 'sage';
};

export function PrimaryButton({ label, onPress, tone = 'coral' }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: tone === 'coral' ? colors.coral : colors.sage },
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 58,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  label: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
});
