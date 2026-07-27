export type Mood = 'Romântico' | 'Amigos' | 'Família' | 'Trabalho' | 'Relaxado' | 'Celebrar';

export type DecisionState = {
  mood: Mood | null;
  budget: number;
  distance: number;
  preferences: string[];
};
