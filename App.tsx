import React, { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BottomNav } from './src/components/BottomNav';
import { ChoiceCard } from './src/components/ChoiceCard';
import { PrimaryButton } from './src/components/PrimaryButton';
import { StepHeader } from './src/components/StepHeader';
import { moods, preferences } from './src/data/options';
import { colors, radius } from './src/theme/tokens';
import { DecisionState, Mood } from './src/types/decision';

type Screen = 'home' | 'mood' | 'budget' | 'distance' | 'preferences' | 'result';

const initialDecision: DecisionState = {
  mood: null,
  budget: 30,
  distance: 15,
  preferences: [],
};

const budgets = [10, 20, 30, 50, 100];
const distances = [5, 10, 15, 20, 30];

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [tab, setTab] = useState(0);
  const [decision, setDecision] = useState<DecisionState>(initialDecision);
  const [favorite, setFavorite] = useState(false);

  const explanation = useMemo(() => {
    const mood = decision.mood?.toLowerCase() ?? 'especial';
    const extras = decision.preferences.slice(0, 2).join(' e ').toLowerCase();
    return `Escolhemos este porque procuras um momento ${mood}, queres gastar cerca de ${decision.budget} € por pessoa, fica a apenas ${Math.min(decision.distance, 8)} minutos e combina${extras ? ` com ${extras}` : ''} com um ambiente tranquilo.`;
  }, [decision]);

  function goBack() {
    const order: Screen[] = ['home', 'mood', 'budget', 'distance', 'preferences', 'result'];
    const index = order.indexOf(screen);
    setScreen(order[Math.max(0, index - 1)]);
  }

  function reset() {
    setDecision(initialDecision);
    setScreen('home');
    setTab(0);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      {screen === 'home' && (
        <View style={styles.full}>
          <ScrollView contentContainerStyle={styles.homeContent}>
            <View style={styles.topLine}>
              <Text style={styles.menu}>☰</Text>
              <View style={styles.avatar}><Text>PN</Text></View>
            </View>
            <Text style={styles.greeting}>Boa noite, Pedro 👋</Text>
            <Text style={styles.heroTitle}>O que te apetece{'\n'}fazer hoje?</Text>

            <View style={styles.actionList}>
              {[
                ['🍽️', 'Comer', 'coral'],
                ['☕', 'Café', 'plain'],
                ['🍸', 'Beber um copo', 'plain'],
                ['🍰', 'Sobremesa', 'plain'],
                ['🎲', 'Surpreende-me', 'sage'],
              ].map(([emoji, label, tone]) => (
                <Pressable
                  key={label}
                  onPress={() => setScreen('mood')}
                  style={({ pressed }) => [
                    styles.homeAction,
                    tone === 'coral' && styles.homeActionCoral,
                    tone === 'sage' && styles.homeActionSage,
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text style={styles.homeEmoji}>{emoji}</Text>
                  <Text style={styles.homeActionText}>{label}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          <BottomNav active={tab} onChange={(index) => {
            setTab(index);
            if (index !== 0) setScreen('home');
          }} />
        </View>
      )}

      {screen === 'mood' && (
        <View style={styles.flow}>
          <StepHeader step={1} onBack={goBack} tone="coral" />
          <Text style={styles.title}>Qual é o mood?</Text>
          <Text style={styles.subtitle}>Escolhe o que melhor descreve{'\n'}este momento.</Text>
          <View style={styles.grid}>
            {moods.map((item) => (
              <ChoiceCard
                key={item.label}
                emoji={item.emoji}
                label={item.label}
                selected={decision.mood === item.label}
                onPress={() => setDecision((d) => ({ ...d, mood: item.label as Mood }))}
              />
            ))}
          </View>
          <View style={styles.bottomButton}>
            <PrimaryButton
              label="Continuar"
              onPress={() => setScreen('budget')}
              tone="coral"
            />
          </View>
        </View>
      )}

      {screen === 'budget' && (
        <View style={styles.flow}>
          <StepHeader step={2} onBack={goBack} tone="coral" />
          <Text style={styles.title}>Quanto queres gastar{'\n'}por pessoa?</Text>
          <Text style={styles.subtitle}>Escolhe um valor aproximado</Text>
          <View style={styles.bigValueWrap}>
            <Text style={styles.bigValue}>{decision.budget} €</Text>
          </View>
          <View style={styles.valueRow}>
            {budgets.map((value) => (
              <Pressable
                key={value}
                onPress={() => setDecision((d) => ({ ...d, budget: value }))}
                style={[styles.valueChip, decision.budget === value && styles.valueChipActiveCoral]}
              >
                <Text style={[styles.valueChipText, decision.budget === value && styles.valueChipTextActive]}>
                  {value === 100 ? '100 €+' : `${value} €`}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.bottomButton}>
            <PrimaryButton label="Continuar" onPress={() => setScreen('distance')} />
          </View>
        </View>
      )}

      {screen === 'distance' && (
        <View style={styles.flow}>
          <StepHeader step={3} onBack={goBack} tone="sage" />
          <Text style={styles.title}>Até onde vais?</Text>
          <Text style={styles.subtitle}>Tempo máximo de deslocação</Text>
          <View style={styles.bigValueWrap}>
            <Text style={styles.bigValue}>{decision.distance} min</Text>
          </View>
          <View style={styles.valueRow}>
            {distances.map((value) => (
              <Pressable
                key={value}
                onPress={() => setDecision((d) => ({ ...d, distance: value }))}
                style={[styles.valueChip, decision.distance === value && styles.valueChipActiveSage]}
              >
                <Text style={[styles.valueChipText, decision.distance === value && styles.valueChipTextActive]}>
                  {value === 30 ? '30+' : `${value} min`}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.bottomButton}>
            <PrimaryButton label="Continuar" onPress={() => setScreen('preferences')} tone="sage" />
          </View>
        </View>
      )}

      {screen === 'preferences' && (
        <View style={styles.flow}>
          <StepHeader step={4} onBack={goBack} tone="sage" />
          <Text style={styles.title}>O que é importante{'\n'}para ti hoje?</Text>
          <Text style={styles.subtitle}>Podes escolher várias opções</Text>
          <View style={styles.gridCompact}>
            {preferences.map(([label, emoji]) => {
              const selected = decision.preferences.includes(label);
              return (
                <ChoiceCard
                  key={label}
                  emoji={emoji}
                  label={label}
                  compact
                  selected={selected}
                  onPress={() =>
                    setDecision((d) => ({
                      ...d,
                      preferences: selected
                        ? d.preferences.filter((item) => item !== label)
                        : [...d.preferences, label],
                    }))
                  }
                />
              );
            })}
          </View>
          <View style={styles.bottomButton}>
            <PrimaryButton label="Ver a escolha da Nomi" onPress={() => setScreen('result')} tone="sage" />
          </View>
        </View>
      )}

      {screen === 'result' && (
        <View style={styles.full}>
          <ScrollView contentContainerStyle={styles.resultContent}>
            <View style={styles.resultHeader}>
              <Pressable onPress={goBack}><Text style={styles.backStandalone}>←</Text></Pressable>
              <Text style={styles.resultEyebrow}>Nomi encontrou para ti</Text>
              <Pressable onPress={reset}><Text style={styles.reset}>↻</Text></Pressable>
            </View>

            <View style={styles.restaurantCard}>
              <Image source={require('./assets/restaurant-main.jpg')} style={styles.restaurantImage} />
              <View style={styles.match}><Text style={styles.matchText}>♥ 95%{'\n'}match</Text></View>
              <View style={styles.overlay} />
              <View style={styles.restaurantInfo}>
                <Text style={styles.restaurantName}>Casa Mia</Text>
                <Text style={styles.restaurantMeta}>Italiana · Romântico · €€</Text>
                <Text style={styles.explanation}>{explanation}</Text>
                <View style={styles.stats}>
                  <Text style={styles.stat}>◷ 8 min</Text>
                  <Text style={styles.stat}>★ 4,7 (1286)</Text>
                  <Text style={styles.stat}>€ €€</Text>
                  <Pressable onPress={() => setFavorite((v) => !v)}>
                    <Text style={styles.heart}>{favorite ? '♥' : '♡'}</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Outras excelentes opções</Text>
            {[
              ['Osteria Nostra', 'Italiana · 10 min · ★ 4,6', require('./assets/restaurant-alt-1.jpg')],
              ['Luce Restaurant', 'Mediterrânea · 12 min · ★ 4,5', require('./assets/restaurant-alt-2.jpg')],
            ].map(([name, meta, image]: any) => (
              <View style={styles.altRow} key={name}>
                <Image source={image} style={styles.altImage} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.altName}>{name}</Text>
                  <Text style={styles.altMeta}>{meta}</Text>
                </View>
                <Text style={styles.altHeart}>♡</Text>
              </View>
            ))}

            <PrimaryButton label="🎲 Decide por mim" onPress={() => {}} />
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  full: { flex: 1 },
  homeContent: { paddingHorizontal: 24, paddingTop: 14, paddingBottom: 24 },
  topLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  menu: { fontSize: 24, color: colors.text },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.sageSoft, alignItems: 'center', justifyContent: 'center' },
  greeting: { marginTop: 28, fontSize: 20, color: colors.text, fontWeight: '500' },
  heroTitle: { marginTop: 8, fontSize: 37, lineHeight: 42, color: colors.text, fontWeight: '800', letterSpacing: -1.2 },
  actionList: { marginTop: 24, gap: 10 },
  homeAction: { minHeight: 58, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, gap: 14 },
  homeActionCoral: { backgroundColor: colors.surfaceWarm, borderColor: '#F8B9AA' },
  homeActionSage: { backgroundColor: colors.sageSoft, borderColor: '#C8D7C1' },
  homeEmoji: { fontSize: 23 },
  homeActionText: { fontSize: 17, color: colors.text, fontWeight: '600' },
  flow: { flex: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 18 },
  title: { marginTop: 30, textAlign: 'center', fontSize: 29, lineHeight: 34, color: colors.text, fontWeight: '800', letterSpacing: -0.6 },
  subtitle: { marginTop: 10, textAlign: 'center', fontSize: 15, lineHeight: 21, color: colors.muted },
  grid: { marginTop: 28, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  gridCompact: { marginTop: 24, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
  bottomButton: { marginTop: 'auto', paddingTop: 20 },
  bigValueWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 190 },
  bigValue: { fontSize: 44, fontWeight: '500', color: colors.text },
  valueRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 7 },
  valueChip: { flex: 1, minHeight: 48, borderRadius: 15, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  valueChipActiveCoral: { backgroundColor: colors.coral, borderColor: colors.coral },
  valueChipActiveSage: { backgroundColor: colors.sage, borderColor: colors.sage },
  valueChipText: { fontSize: 12, color: colors.text, fontWeight: '600' },
  valueChipTextActive: { color: '#FFFFFF' },
  resultContent: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 28 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  backStandalone: { fontSize: 29 },
  reset: { fontSize: 26 },
  resultEyebrow: { fontSize: 16, fontWeight: '700', color: colors.text },
  restaurantCard: { minHeight: 480, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.black, position: 'relative' },
  restaurantImage: { width: '100%', height: '100%', position: 'absolute' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.42)' },
  match: { position: 'absolute', right: 14, top: 14, backgroundColor: '#FFF6F2', paddingHorizontal: 11, paddingVertical: 8, borderRadius: 15, zIndex: 3 },
  matchText: { color: colors.coral, fontSize: 12, fontWeight: '800', textAlign: 'center' },
  restaurantInfo: { marginTop: 'auto', padding: 20, zIndex: 2 },
  restaurantName: { color: '#FFFFFF', fontSize: 34, fontWeight: '800' },
  restaurantMeta: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginTop: 4 },
  explanation: { color: '#FFFFFF', fontSize: 15, lineHeight: 21, marginTop: 14 },
  stats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 },
  stat: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  heart: { color: colors.coral, fontSize: 28 },
  sectionTitle: { marginTop: 20, marginBottom: 9, fontSize: 16, color: colors.text, fontWeight: '800' },
  altRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  altImage: { width: 78, height: 53, borderRadius: 10 },
  altName: { fontSize: 15, color: colors.text, fontWeight: '700' },
  altMeta: { marginTop: 2, fontSize: 12, color: colors.muted },
  altHeart: { fontSize: 26, color: colors.text },
});
