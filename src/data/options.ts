import { Mood } from '../types/decision';

export const moods: { label: Mood; emoji: string }[] = [
  { label: 'Romântico', emoji: '❤️' },
  { label: 'Amigos', emoji: '🙂' },
  { label: 'Família', emoji: '👨‍👩‍👧' },
  { label: 'Trabalho', emoji: '💼' },
  { label: 'Relaxado', emoji: '🍃' },
  { label: 'Celebrar', emoji: '🎉' },
];

export const preferences = [
  ['Vista', '🌅'],
  ['Estacionamento', '🅿️'],
  ['Vinho', '🍷'],
  ['Esplanada', '🌳'],
  ['Vegetariano', '🌿'],
  ['Vegan', '💚'],
  ['Crianças', '🧒'],
  ['Cães', '🐕'],
  ['Sushi', '🍣'],
  ['Massa', '🍝'],
  ['Carne', '🥩'],
  ['Peixe', '🐟'],
] as const;
