# Cloudflare Worker — OneArete Decision Engine

## Instalação

1. Abrir o Worker `nomi-decision-engine` na Cloudflare.
2. Edit code.
3. Apagar o código atual.
4. Colar todo o conteúdo de `worker.js`.
5. Deploy.

## Secrets e variáveis

Obrigatório:
- `GEMINI_API_KEY` — Secret.

Recomendado:
- `ALLOWED_ORIGIN` — URL exato do GitHub Pages, por exemplo `https://possn.github.io`.

Opcional:
- `GEMINI_MODEL` — por omissão usa `gemini-2.5-flash`.

## Teste

Abrir o endereço do Worker no browser. Deve devolver:

```json
{
  "ok": true,
  "service": "OneArete Decision Engine",
  "product": "Nomi",
  "version": "3.0.1"
}
```
