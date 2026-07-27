# Nomi v0.2.0 — Visual Decision Flow

Primeira fase funcional e navegável da aplicação Nomi.

## O que já funciona

- Ícone oficial baseado no layout aprovado.
- Splash screen Nomi.
- Home premium com as opções Comer, Café, Beber um copo, Sobremesa e Surpreende-me.
- Navegação inferior.
- Fluxo completo:
  1. Mood
  2. Orçamento
  3. Distância
  4. Preferências
  5. Recomendação
- Recomendação principal com explicação dinâmica.
- Duas alternativas.
- Favorito local durante a sessão.
- Botão “Decide por mim”.
- Layout responsivo para iOS e Android.
- Dados simulados; ainda sem Google Places.

## Instalação

```bash
npm install
npx expo install --fix
npx expo-doctor
npx expo start
```

Depois abre o QR Code no Expo Go compatível com SDK 57 ou num simulador.

## Ficheiros a colocar/substituir no GitHub

Nesta primeira entrega, carregar todo o conteúdo do ZIP para a raiz do repositório.

## Próxima fase sugerida

- Persistência de favoritos e decisões.
- Melhorar animações e feedback háptico.
- Ecrãs reais de Favoritos, Decisões e Perfil.
- Integração inicial com Google Places.
