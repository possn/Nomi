# Nomi v1.9.0 — Search Quality and Footer Repair

## Footer

Nos resultados, o footer deixa de flutuar sobre os cartões.

Passa a aparecer no fim da página, depois do conteúdo e dos botões. Nos ecrãs curtos mantém-se compacto e acessível.

## Motor de pesquisa

O motor foi refinado para evitar recomendações apenas por proximidade.

### Google Places

O Worker passa a executar várias pesquisas:

- contexto e mood;
- avaliação elevada;
- ocasião especial;
- restaurante romântico;
- restaurante com vista, rooftop ou waterfront;
- cozinha selecionada;
- nível de preço compatível.

O ranking penaliza fortemente:

- locais sem sinal de vista quando “Vista” é prioritária;
- cozinha incompatível;
- avaliações baixas;
- pouco volume de opiniões;
- preço claramente incompatível.

### OpenStreetMap

O modo OpenStreetMap passa a assumir claramente que é aproximado.

Resultados abaixo do nível mínimo de qualidade são removidos. A app fornece ainda um link para pesquisar os critérios exatos no Google Maps.

## Importante

Para obter recomendações realmente boas, fotografias, ratings e contexto, é necessário configurar o Worker Google Places incluído em:

`worker/README.md`

## Atualização

Substituir todo o conteúdo do repositório e abrir:

`https://possn.github.io/Nomi/?v=1.9.0`
