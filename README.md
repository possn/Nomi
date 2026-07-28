# Nomi v1.2.0 — Live Search + Layout Repair

Esta versão corrige dois problemas:

1. O layout aproxima-se do mockup oficial, com tipografia, espaçamento, cartões e cores corrigidos.
2. Não contém qualquer restaurante pré-gravado. O resultado só aparece depois de uma pesquisa real.

## Pesquisa

- Pede autorização de localização no Safari.
- Pesquisa restaurantes e cafés próximos em OpenStreetMap/Overpass.
- Tenta três servidores Overpass para maior disponibilidade.
- Pode usar Google Places através de um proxy seguro configurado em `config.js`.
- Em caso de falha, apresenta erro; nunca mostra “Casa Mia” nem resultados simulados.

## Atualização obrigatória

Substituir todo o conteúdo do repositório por este ZIP.

O `index.html` usa `?v=1.2.0` para evitar que o Safari carregue ficheiros antigos.

Depois da publicação:
- fechar a janela da app;
- abrir novamente `https://possn.github.io/Nomi/?v=1.2.0`;
- confirmar em Perfil que aparece “Versão 1.2.0”.
