# Nomi v1.1.0 — Live Restaurant Search

Esta versão deixa de usar restaurantes gravados no código.

## Alterações

- Layout e alinhamentos corrigidos.
- Mais opções no passo de preferências.
- Pesquisa real pela localização do utilizador.
- Pesquisa OpenStreetMap/Overpass por defeito.
- Suporte preparado para Google Places através de backend/proxy seguro.
- Resultados mostram nome, cozinha, distância, morada disponível e ligação ao mapa.
- Não inventa ratings quando a fonte não os fornece.

## Google Places

Para usar Google Places, configure em `config.js` o URL de um backend/proxy seguro:

```js
window.NOMI_CONFIG = {
  GOOGLE_PLACES_PROXY_URL: "https://o-teu-backend.example/search"
};
```

Não colocar uma chave Google diretamente no JavaScript público do GitHub Pages.

## Atualização do GitHub

Substituir:
- `index.html`
- `styles.css`
- `app.js`
- `README.md`
- `RELEASE_NOTES.md`

Adicionar:
- `config.js`

Remover:
- `assets/casa-mia.jpg`
- `assets/osteria.jpg`
- `assets/luce.jpg`

Manter:
- `assets/icon-192.png`
- `assets/icon-512.png`
- `manifest.webmanifest`
- `.nojekyll`
