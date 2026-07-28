# Motor Google Places — instalação

Este Worker mantém a chave Google fora do GitHub Pages.

## 1. Criar o Worker

No Cloudflare Dashboard:

Workers & Pages → Create → Worker → Deploy.

Depois use **Edit code** e substitua o conteúdo por `worker.js`.

## 2. Guardar a chave

Worker → Settings → Variables and Secrets → Add:

- Nome: `GOOGLE_PLACES_API_KEY`
- Tipo: Secret
- Valor: a chave da Google Places API

Não colocar a chave em `config.js` nem no GitHub.

## 3. Origem permitida

Adicione uma variável normal:

- Nome: `ALLOWED_ORIGIN`
- Valor: `https://possn.github.io`

## 4. Copiar o URL

Exemplo:

`https://nomi-places.<conta>.workers.dev`

Coloque esse endereço em `config.js`:

```js
window.NOMI_CONFIG = {
  GOOGLE_PLACES_PROXY_URL: "https://nomi-places.<conta>.workers.dev"
};
```

## 5. Google Cloud

Ativar:

- Places API (New)
- faturação do projeto
- restrição da chave à Places API

O Worker usa Text Search (New), Place Photos e ranking contextual.
