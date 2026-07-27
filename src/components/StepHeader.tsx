import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/tokens';

type Props = {
  step: number;
  total?: number;
  onBack: () => void;
  tone?: 'coral' | 'sage';
};

export function StepHeader({ step, total = 4, onBack, tone = 'coral' }: Props) {
  const active = tone === 'coral' ? colors.coral : colors.sage;
  return (
    <View>
      <View style={styles.row}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={styles.back}>←</Text>
        </Pressable>
        <Text style={styles.count}>{step}/{total}</Text>
        <View style={{ width: 26 }} />
      </View>
      <View style={styles.progress}>
        {Array.from({ length: total }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.segment,
              { backgroundColor: index < step ? active : '#E9E2DA' },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { fontSize: 29, color: colors.text, lineHeight: 34 },
  count: { fontSize: 15, color: colors.text, fontWeight: '700' },
  progress: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 20 },
  segment: { width: 38, height: 4, borderRadius: 99 },
});
