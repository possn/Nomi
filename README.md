# Nomi v3.1.0 — OneArete Decision Engine Foundation

**Stop searching. Start deciding.**  
**by OneArete**

Esta versão parte diretamente da Nomi v1.9.0 e preserva o seu design, navegação, favoritos, histórico, PWA e fluxo visual. Acrescenta o primeiro núcleo funcional do OneArete Decision Engine (ODE).

## Domínios incluídos

- Restaurantes, cafés, bebidas e sobremesas.
- Atividades com miúdos, com idades, orçamento, distância e preferências próprias.

## Motor

A aplicação envia um pedido estruturado ao Cloudflare Worker. O Worker usa a secret `GEMINI_API_KEY`, ativa Grounding with Google Maps e devolve recomendações compatíveis com a interface existente da Nomi.

## Configuração rápida

1. Cloudflare Worker → Edit code.
2. Substituir o código pelo ficheiro `worker/worker.js`.
3. Confirmar a secret `GEMINI_API_KEY`.
4. Deploy.
5. Abrir o URL do Worker e confirmar a resposta de estado.
6. Colar esse URL em `config.js`.
7. Substituir no GitHub os ficheiros indicados em `FILES_TO_REPLACE_IN_GITHUB.txt`.

Nunca colocar a chave Gemini no GitHub.
