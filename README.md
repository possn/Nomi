# Nomi v1.8.0 — Google Places Engine

## O problema corrigido

O OpenStreetMap consegue localizar estabelecimentos, mas não fornece de forma consistente:

- avaliações;
- número de opiniões;
- fotografias reais;
- preço;
- ambiente romântico;
- qualidade;
- reservas;
- informação rica sobre o local.

Por isso apresentava opções próximas, mas pouco qualificadas.

## Novo motor

Esta versão inclui um backend Cloudflare Worker em `/worker` que usa:

- Google Places Text Search (New);
- pesquisas múltiplas relacionadas com mood e preferências;
- fotografias reais do Google Places;
- rating e número de opiniões;
- preço;
- distância;
- reservas, esplanada, vinho, crianças e acessibilidade;
- ranking contextual próprio da Nomi.

Exemplo: “restaurante romântico, até 100 €, vista, num raio de 50 km” deixa de ser apenas uma pesquisa por proximidade.

## Interface

- Footer mais compacto.
- Espaço inferior aumentado nos resultados.
- Botão “Decide por mim” já não fica coberto.
- Resultados indicam se estão a usar:
  - Google Places premium; ou
  - OpenStreetMap limitado.

## Ficheiros

Substituir todo o conteúdo do repositório por este ZIP.

Depois configurar o Worker seguindo:

`worker/README.md`

Abrir:

`https://possn.github.io/Nomi/?v=1.8.0`
