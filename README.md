# Artefatos de Suporte Audiovisual — Agroadvance

Site estático que publica os artefatos de suporte de AV e monta, com um clique,
o pacote pronto para colar num chat de IA.

## O que tem aqui

```
conteudo/      os .md originais — esta e a fonte da verdade
assets/        CSS, JS e favicon
build.mjs      gerador (Node puro, sem dependencias)
docs/          saida gerada — e a pasta que o GitHub Pages serve
```

## Como atualizar o conteúdo

1. Edite o `.md` em `conteudo/` (ou adicione histórico resolvido nos artefatos).
2. Rode o gerador:

   ```
   node build.mjs
   ```

3. Confira localmente:

   ```
   node -e "const h=require('http'),f=require('fs'),p=require('path');const r=p.join(process.cwd(),'docs');const m={'.html':'text/html;charset=utf-8','.css':'text/css;charset=utf-8','.js':'text/javascript;charset=utf-8','.md':'text/plain;charset=utf-8','.svg':'image/svg+xml'};h.createServer((q,s)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u.endsWith('/'))u+='index.html';f.readFile(p.join(r,u),(e,d)=>{if(e){s.writeHead(404);return s.end('404')}s.writeHead(200,{'content-type':m[p.extname(u)]||'application/octet-stream'});s.end(d)})}).listen(4321,()=>console.log('http://localhost:4321'))"
   ```

4. Commit e push. O Pages republica sozinho em cerca de um minuto.

`docs/` é gerado — não edite nada lá dentro na mão, o próximo build sobrescreve.

## As cadeias de sinal

Os diagramas de cadeia ficam em `build.mjs`, na constante `CADEIAS`. Cada módulo
é uma tripla `['nome', 'papel', estado]`, e o estado governa a cor do LED:

| estado | significado          |
|--------|----------------------|
| `on`   | em uso no formato    |
| `bkp`  | backup ou eventual   |
| `live` | transmissão ao vivo  |
| `off`  | fora deste formato   |

`off` é o que carrega mais informação de diagnóstico: é o equipamento que **não
adianta investigar** naquele formato. Se a estrutura técnica mudar, mexa aqui e
rode o build de novo.

## Nota sobre visibilidade

As páginas saem com `noindex,nofollow`, o que desestimula buscadores. Isso não é
controle de acesso: num repositório público, quem tiver o link acessa.
