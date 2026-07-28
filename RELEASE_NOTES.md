# Nomi v3.1.0 — ODE Live Decision Integration

## Implementado

- Endpoint real `POST /decision` no Cloudflare Worker.
- Endpoints `GET /health` e `GET /version`.
- Nomi ligada ao ODE através de `ODE_URL`.
- Compatibilidade temporária com `GOOGLE_PLACES_PROXY_URL`.
- Decision Confidence visível nos resultados.
- Decision Uncertainty para factos que o ODE não conseguiu confirmar.
- Completion actions: disponibilidade/reserva/bilhetes, calendário e convite.
- Domínios Restaurantes e Atividades com Miúdos preservados.
- Branding `by OneArete` preservado.

## Configuração obrigatória

1. Publicar `worker/worker.js` no Worker Cloudflare.
2. Manter a secret `GEMINI_API_KEY`.
3. Em `config.js`, preencher `ODE_URL` com o URL do Worker, sem barra final.
4. Publicar os ficheiros da raiz no GitHub Pages.
