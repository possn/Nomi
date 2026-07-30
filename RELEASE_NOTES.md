# Nomi v3.1.2 — Gemini Model Migration Repair

## Correções

- Migração de `gemini-2.5-flash` para `gemini-3-flash-preview`.
- Remoção da configuração de temperatura antiga, seguindo as recomendações da família Gemini 3.
- Fallback automático para `gemini-flash-latest` e `gemini-3.1-flash-lite` quando um modelo é retirado ou fica indisponível.
- Mantidas as regras de relevância romântica da v3.1.1.

## Ficheiros a substituir

- `worker/worker.js` na Cloudflare.
- Opcionalmente `worker/README.md`, `README.md`, `RELEASE_NOTES.md` e `FILES_TO_REPLACE_IN_GITHUB.txt` no GitHub.
