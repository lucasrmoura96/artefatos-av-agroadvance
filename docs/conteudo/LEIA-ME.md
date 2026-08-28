# Artefatos de Suporte Audiovisual — Agroadvance

O caminho normal é o manual no navegador:
**https://lucasrmoura96.github.io/artefatos-av-agroadvance/**

Deu problema numa aula ou num evento? Abra o manual e responda as perguntas
do guia. Ele leva até o ponto provável percorrendo a cadeia de sinal um
equipamento por vez, e mostra os passos de solução.

## Quando a IA entra

Só quando o manual não cobrir o sintoma. Nesse caso:

1. Abra uma conversa nova na IA de sua preferência.
2. Cole o conteúdo de `prompt-introdutorio.md`.
3. Cole o descritivo e o artefato da pasta do formato em questão.
4. Descreva formato, sintoma exato e o que já tentou.

O botão "Levar para a IA" dentro do manual monta esse pacote pronto, já com o
caminho que você percorreu no guia.

## As pastas

- `01-evento-presencial-sede` — imersões e eventos presenciais na sede
- `02-aulas-ao-vivo` — aulas transmitidas ao vivo (estúdio, híbrido, só Zoom)
- `03-aulas-gravadas` — aulas gravadas sem transmissão (estúdio ou remoto)

Cada pasta tem um **descritivo** (contexto técnico completo) e um **artefato**
(uso prático: diagnóstico e histórico resolvido).

## Como o manual cresce

Quando o time fechar um diagnóstico, escreva o resultado na seção
"Histórico resolvido" do artefato daquele formato. Duas linhas bastam: o que
era e o que resolveu. É o que evita reinvestigar o mesmo problema.

As soluções por equipamento ficam em `solucoes.mjs`, na raiz do repositório.
Cada item declara a origem: documento do time, fabricante, ou prática de
operação.
