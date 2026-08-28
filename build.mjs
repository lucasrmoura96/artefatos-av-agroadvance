// Gera o site a partir dos .md em /conteudo. Sem dependencias.
// Uso: node build.mjs
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = dirname(fileURLToPath(import.meta.url));
const CONT = join(RAIZ, 'conteudo');
const OUT = join(RAIZ, 'docs');

/* ------------------------------------------------------------------ *
 * 1. Markdown -> HTML (subconjunto usado nestes documentos)
 * ------------------------------------------------------------------ */
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function inline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/ -&gt; /g, ' &rarr; ');
}

// Converte markdown. Os titulos descem um nivel (# -> h2) porque o h1 da
// pagina e o titulo do formato.
function md2html(src, semTitulo = false) {
  const linhas = src.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0;

  const eTabela = (n) =>
    linhas[n] != null && linhas[n].trim().startsWith('|') &&
    linhas[n + 1] != null && /^\|[\s|:-]+\|$/.test(linhas[n + 1].trim());

  const celulas = (linha) => {
    const t = linha.trim().replace(/^\|/, '').replace(/\|$/, '');
    return t.split('|').map((c) => c.trim());
  };

  while (i < linhas.length) {
    const linha = linhas[i];
    const t = linha.trim();

    if (t === '') { i++; continue; }

    if (/^(-{3,}|\*{3,})$/.test(t)) { out.push('<hr>'); i++; continue; }

    const h = t.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      if (semTitulo && h[1].length === 1) { i++; continue; }
      const nivel = Math.min(h[1].length + 1, 5);
      out.push(`<h${nivel}>${inline(h[2])}</h${nivel}>`);
      i++; continue;
    }

    if (eTabela(i)) {
      const cab = celulas(linhas[i]);
      i += 2;
      const corpo = [];
      while (i < linhas.length && linhas[i].trim().startsWith('|')) {
        corpo.push(celulas(linhas[i])); i++;
      }
      const th = cab.map((c) => `<th>${c ? inline(c) : '&nbsp;'}</th>`).join('');
      const tr = corpo
        .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`)
        .join('');
      out.push(`<div class="tw"><table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table></div>`);
      continue;
    }

    if (t.startsWith('>')) {
      const bloco = [];
      while (i < linhas.length && linhas[i].trim().startsWith('>')) {
        bloco.push(linhas[i].trim().replace(/^>\s?/, '')); i++;
      }
      out.push(`<blockquote><p>${inline(bloco.join(' ').trim())}</p></blockquote>`);
      continue;
    }

    if (/^[-*]\s+/.test(t)) {
      const itens = [];
      while (i < linhas.length && /^\s*[-*]\s+/.test(linhas[i])) {
        itens.push(linhas[i].trim().replace(/^[-*]\s+/, '')); i++;
      }
      out.push(`<ul>${itens.map((x) => `<li>${inline(x)}</li>`).join('')}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/.test(t)) {
      const itens = [];
      while (i < linhas.length && /^\s*\d+\.\s+/.test(linhas[i])) {
        itens.push(linhas[i].trim().replace(/^\d+\.\s+/, '')); i++;
      }
      out.push(`<ol>${itens.map((x) => `<li>${inline(x)}</li>`).join('')}</ol>`);
      continue;
    }

    const par = [];
    while (i < linhas.length && linhas[i].trim() !== '' &&
           !/^(#{1,4}\s|>|[-*]\s|\d+\.\s|\|)/.test(linhas[i].trim()) &&
           !/^(-{3,}|\*{3,})$/.test(linhas[i].trim())) {
      par.push(linhas[i].trim()); i++;
    }
    if (par.length) out.push(`<p>${inline(par.join(' '))}</p>`);
  }
  return out.join('\n');
}

/* ------------------------------------------------------------------ *
 * 2. Cadeias de sinal — cada modulo vem do descritivo do formato.
 *    on = em uso | bkp = backup/eventual | live = ao vivo | off = fora
 * ------------------------------------------------------------------ */
const CADEIAS = {
  evento: [{
    nome: 'Configuração única',
    nota: 'Montagem e operação: 1 pessoa',
    estagios: [
      ['Captação de voz', [
        ['4x mic s/fio Dylan', '2 lapela Pertinence + 2 bastão', 'on'],
        ['XLR P2 do notebook', 'ocupa 1 canal quando o slide tem áudio', 'bkp'],
      ]],
      ['Roteamento de áudio', [
        ['Yamaha MG10XU', '4 entradas XLR', 'on'],
        ['Scarlett 16i16', 'ganho e volume', 'on'],
        ['Isolador de sinal', 'resolveu o ruído — ver histórico', 'on'],
      ]],
      ['Imagem e slides', [
        ['PTZ 4K + controladora', 'só o professor, com presets', 'on'],
        ['Sony A7 III', 'audiência', 'on'],
        ['Splitter HDMI', 'telão + entrada da ATEM', 'on'],
        ['Sony extra', 'só em exceção', 'off'],
      ]],
      ['Corte', [
        ['ATEM Extreme ISO', '4 das 8 entradas em uso', 'on'],
      ]],
      ['Registro', [
        ['ATEM', 'captura principal', 'on'],
        ['vMix', 'gravação backup', 'bkp'],
        ['Vimeo live', '2º backup', 'bkp'],
      ]],
      ['Sala', [
        ['Telão LED 2 x 1,5 m', '', 'on'],
        ['PA — 2 zonas', 'frontal e traseira, volumes independentes', 'on'],
      ]],
    ],
  }],

  aovivo: [
    {
      nome: 'Presencial em estúdio',
      nota: 'Padrão quando o professor está no estúdio',
      estagios: [
        ['Captação', [
          ['2x Sony A7 III', 'host e professor', 'on'],
          ['Notebook slides (HDMI)', '', 'on'],
        ]],
        ['Áudio', [['2x lapela s/fio Sony', 'modelo a confirmar', 'on']]],
        ['Corte', [['ATEM', 'grava SSD via USB-C · retorno na TV do estúdio', 'on']]],
        ['Encode', [
          ['vMix', 'recebe da ATEM via USB', 'on'],
          ['Gravação backup', '', 'bkp'],
        ]],
        ['Distribuição', [['Vimeo', 'transmissão ao vivo', 'live']]],
        ['Entrega', [['Plataforma LW', 'player recebendo o Vimeo', 'on']]],
      ],
    },
    {
      nome: 'Híbrido (Zoom + vMix)',
      nota: 'Padrão para aula remota convencional',
      estagios: [
        ['Captação', [['Câmeras via Zoom', 'professor, host e AV na sala', 'on']]],
        ['Áudio', [['Áudio nativo do Zoom', '', 'on']]],
        ['Corte', [['ATEM', 'não usada — logo não há gravação SSD', 'off']]],
        ['Encode', [
          ['vMix + plugin Zoom', 'mockup visual da Agroadvance', 'on'],
          ['Gravação backup', '', 'bkp'],
        ]],
        ['Distribuição', [['Vimeo', 'transmissão ao vivo', 'live']]],
        ['Entrega', [['Plataforma LW', 'player recebendo o Vimeo', 'on']]],
      ],
    },
    {
      nome: 'Somente Zoom',
      nota: 'Contingência do híbrido, ou aula de cases',
      estagios: [
        ['Captação', [['Câmeras nativas do Zoom', '', 'on']]],
        ['Áudio', [['Áudio nativo do Zoom', '', 'on']]],
        ['Corte', [['ATEM', 'fora deste formato', 'off']]],
        ['Encode', [['vMix', 'fora deste formato', 'off']]],
        ['Distribuição', [['Vimeo', 'gatilho típico: limite de lives simultâneas', 'off']]],
        ['Entrega', [['Embed do Zoom na LW', 'sem vMix e sem Vimeo', 'on']]],
      ],
    },
  ],

  gravadas: [
    {
      nome: 'Presencial em estúdio (gravado)',
      nota: 'Mesma estrutura do estúdio ao vivo, sem transmissão',
      estagios: [
        ['Captação', [
          ['2x Sony A7 III', 'host e professor', 'on'],
          ['Notebook slides (HDMI)', '', 'on'],
        ]],
        ['Áudio', [['2x lapela s/fio Sony', 'modelo a confirmar', 'on']]],
        ['Corte', [['ATEM', 'retorno na TV do estúdio', 'on']]],
        ['Registro', [
          ['ATEM — SSD via USB-C', 'fonte principal', 'on'],
          ['vMix', 'gravação backup', 'bkp'],
          ['Vimeo', 'não existe em aula gravada', 'off'],
        ]],
        ['Pós', [['Edição', '', 'on']]],
        ['Entrega', [['Upload na plataforma', '', 'on']]],
      ],
    },
    {
      nome: 'Remoto (gravado)',
      nota: 'Professor e AV na sala do Zoom, sem alunos',
      estagios: [
        ['Captação', [['Câmeras via Zoom', 'professor e AV', 'on']]],
        ['Áudio', [['Áudio nativo do Zoom', '', 'on']]],
        ['Corte', [['ATEM', 'fora deste formato', 'off']]],
        ['Registro', [
          ['vMix', 'gravação principal, inputs no padrão visual', 'on'],
          ['Vimeo', 'não existe em aula gravada', 'off'],
        ]],
        ['Pós', [['Edição', 'facilitada pela programação de inputs', 'on']]],
        ['Entrega', [['Upload na plataforma', 'material já editado', 'on']]],
      ],
    },
  ],
};

function railHTML(cadeia, idxCadeia) {
  let n = 0;
  const estagios = cadeia.estagios.map(([rotulo, mods]) => {
    const m = mods.map(([nome, papel, estado]) => {
      const html = `<div class="mod" data-s="${estado}" style="--i:${n};--c:${idxCadeia}">
            <span class="led" aria-hidden="true"></span>
            <span class="txt"><span class="n">${esc(nome)}</span>${papel ? `<span class="r">${esc(papel)}</span>` : ''}</span>
          </div>`;
      n++;
      return html;
    }).join('\n');
    return `<div class="stage"><span class="lbl">${esc(rotulo)}</span>\n${m}\n</div>`;
  }).join('\n');

  return `<div class="chain">
      <div class="chain-head">
        <span class="name">${esc(cadeia.nome)}</span>
        <span class="note">${esc(cadeia.nota)}</span>
      </div>
      <div class="rail">${estagios}</div>
    </div>`;
}

/* ------------------------------------------------------------------ *
 * 3. Formatos
 * ------------------------------------------------------------------ */
const FORMATOS = [
  {
    slug: 'evento-presencial-sede',
    nav: 'Evento presencial',
    h1: ['Evento presencial', 'na sede'],
    titulo: 'Evento presencial na sede',
    cadeias: 'evento',
    qtd: '1 configuração',
    resumo: 'Imersões e eventos no auditório da sede: 40 a 50 pessoas, telão de LED, PA em duas zonas. Áudio de quatro microfones sem fio passando por Yamaha, Scarlett e isolador antes da ATEM. Três registros do mesmo evento.',
    gear: 'Dylan · Yamaha MG10XU · Scarlett 16i16 · ATEM Extreme ISO · PTZ 4K · Sony A7 III · vMix · Vimeo',
    pasta: '01-evento-presencial-sede',
    arquivos: { artefato: 'artefato-evento-presencial-sede.md', descritivo: 'descritivo-evento-presencial-sede.md' },
  },
  {
    slug: 'aulas-ao-vivo',
    nav: 'Aulas ao vivo',
    h1: ['Aulas', 'ao vivo'],
    titulo: 'Aulas ao vivo',
    cadeias: 'aovivo',
    qtd: '3 configurações técnicas',
    resumo: 'Presencial em estúdio, híbrido pelo Zoom com vMix, e somente Zoom como contingência ou aula de cases. O aluno chega pela plataforma nos três, mas o caminho até ela muda por completo.',
    gear: 'Sony A7 III · ATEM · vMix + plugin Zoom · Vimeo · Zoom · plataforma LW',
    pasta: '02-aulas-ao-vivo',
    arquivos: { artefato: 'artefato-aulas-ao-vivo.md', descritivo: 'descritivo-aulas-ao-vivo.md' },
  },
  {
    slug: 'aulas-gravadas',
    nav: 'Aulas gravadas',
    h1: ['Aulas', 'gravadas'],
    titulo: 'Aulas gravadas',
    cadeias: 'gravadas',
    qtd: '2 configurações técnicas',
    resumo: 'Sem transmissão: grava, edita e só então sobe para a plataforma. Vimeo não entra em nenhuma das duas. Quem grava principal muda de lugar entre o estúdio (ATEM) e o remoto (vMix).',
    gear: 'Sony A7 III · ATEM (SSD) · vMix · Zoom · edição · plataforma LW',
    pasta: '03-aulas-gravadas',
    arquivos: { artefato: 'artefato-aulas-gravadas.md', descritivo: 'descritivo-aulas-gravadas.md' },
  },
];

const leia = (p) => readFileSync(join(CONT, p), 'utf8').replace(/\r\n/g, '\n').trim();
const PROMPT = leia('prompt-introdutorio.md');
// O prompt introdutorio tem cabecalho de instrucao antes do "---"; o que vai
// para o chat e o texto depois dele.
const PROMPT_CHAT = PROMPT.split(/\n---\n/).slice(1).join('\n---\n').trim() || PROMPT;

const bruto = (id, texto) =>
  `<script type="text/plain" id="${id}">${texto.replace(/<\/script/gi, '<\\/script')}</script>`;

/* ------------------------------------------------------------------ *
 * 4. Casca da pagina
 * ------------------------------------------------------------------ */
function pagina({ titulo, desc, atual, corpo, base = './' }) {
  const nav = FORMATOS.map((f) => {
    const href = `${base}${f.slug}/`;
    const marca = atual === f.slug ? ' aria-current="page"' : '';
    return `<a href="${href}"${marca}>${esc(f.nav)}</a>`;
  }).join('');

  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="noindex,nofollow">
<meta name="color-scheme" content="dark">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap" rel="stylesheet">
<link rel="icon" href="${base}favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="${base}assets/site.css">
<header class="top">
  <div class="wrap">
    <a class="home" href="${base}"><span aria-hidden="true">&#9679;</span> Suporte AV &middot; Agroadvance</a>
    <nav aria-label="Formatos">${nav}</nav>
  </div>
</header>
${corpo}
<footer>
  <div class="wrap">
    <p>Artefatos de suporte audiovisual &middot; Agroadvance</p>
    <p>Fonte dos textos: os <a href="${base}conteudo/">arquivos .md</a> deste repositório</p>
  </div>
</footer>
<div id="toast" role="status" aria-live="polite"></div>
<script src="${base}assets/site.js"></script>
`;
}

/* ------------------------------------------------------------------ *
 * 5. Home
 * ------------------------------------------------------------------ */
const GLOSSARIO = [
  ['ATEM Extreme ISO', 'Mesa de cortes. 8 entradas de vídeo e 2 canais de áudio independentes. Grava em SSD pela própria USB-C. Presente no evento presencial e no estúdio; ausente em tudo que é Zoom.'],
  ['vMix', 'Software de produção. Recebe da ATEM por USB no estúdio, ou as câmeras direto do Zoom pelo plugin. Aplica o mockup visual, grava e transmite.'],
  ['Vimeo', 'Veículo da transmissão ao vivo. Exclusivo do fluxo ao vivo: não aparece em aula gravada. Tem limite de lives simultâneas, e esse limite é um dos gatilhos da contingência.'],
  ['Plataforma (LW)', 'Onde o aluno assiste. Recebe o player do Vimeo, ou o embed direto do Zoom no formato de contingência.'],
  ['Zoom', 'Sala do professor nos formatos remotos. Nos cases, também divide os alunos em salas de grupo.'],
];

function home() {
  const cards = FORMATOS.map((f) => `      <a class="fcard" href="./${f.slug}/">
        <div class="fcard-top">
          <span class="h">${esc(f.titulo)}</span>
          <span class="cfg">${esc(f.qtd)}</span>
          <span class="arrow" aria-hidden="true">&rarr;</span>
        </div>
        <div class="sum">${esc(f.resumo)}<span class="gear">${f.gear.replace(/&/g, '&amp;')}</span></div>
      </a>`).join('\n');

  const gloss = GLOSSARIO.map(([nome, txt]) => `        <div class="doc" style="margin-top:0">
          <div style="padding:15px 18px">
            <span class="n" style="font-family:var(--fm);font-size:12px;letter-spacing:.06em;color:var(--led-bkp);text-transform:uppercase">${esc(nome)}</span>
            <p style="margin:7px 0 0;font-size:14px;color:var(--ink-2)">${esc(txt)}</p>
          </div>
        </div>`).join('\n');

  const corpo = `<main>
  <div class="wrap">
    <div class="hero">
      <div class="eyebrow"><span class="lbl">Suporte operacional</span><span class="bar"></span><span class="lbl">3 formatos &middot; 6 configurações</span></div>
      <h1>Antes de abrir<br>o chamado,<br><em>olhe a cadeia.</em></h1>
      <p class="thesis">Cada formato acende um conjunto diferente de equipamentos. Metade do diagnóstico é saber <b>o que nem está ligado</b> naquele formato &mdash; não faz sentido investigar a ATEM num problema do híbrido, onde ela não entra. Escolha o formato, confira a cadeia, e leve o pacote pronto para o chat.</p>
      <div class="legend" role="note">
        <span class="it"><span class="dot" style="background:var(--led-on)"></span> em uso</span>
        <span class="it"><span class="dot" style="background:var(--led-bkp)"></span> backup ou eventual</span>
        <span class="it"><span class="dot" style="background:var(--led-live)"></span> transmissão ao vivo</span>
        <span class="it"><span class="dot" style="background:var(--led-off)"></span> fora deste formato</span>
      </div>
    </div>

    <div class="formats">
${cards}
    </div>
  </div>

  <section>
    <div class="wrap">
      <div class="sec-head"><h2>Onde cada equipamento entra</h2><span class="bar"></span></div>
      <div style="display:grid;gap:12px">
${gloss}
      </div>
    </div>
  </section>

  <section style="padding-top:0">
    <div class="wrap">
      <div class="sec-head"><h2>Como usar com a IA</h2><span class="bar"></span></div>
      <div class="kit">
        <div class="kit-body">
          <div class="say">
            <span class="lbl">Prompt introdutório</span>
            <p>O mesmo prompt serve para os três formatos. Na página de cada formato o botão já copia <b>o prompt junto com os dois documentos</b>, na ordem certa.</p>
            <ol>
              <li>Abra uma conversa nova na IA que preferir.</li>
              <li>Cole o pacote do formato em que você está.</li>
              <li>Descreva o sintoma: formato, o que aconteceu e o que já tentou.</li>
            </ol>
          </div>
          <div class="kit-acts">
            <button class="btn ghost" data-copiar="raw-prompt" data-ok="prompt copiado">Copiar só o prompt <span class="k">txt</span></button>
          </div>
        </div>
      </div>
      <details class="doc">
        <summary><span class="t">Ler o prompt</span><span class="sub">prompt-introdutorio.md</span><span class="chev"><span class="word"></span></span></summary>
        <div class="md">${md2html(PROMPT)}</div>
      </details>
    </div>
  </section>
</main>
${bruto('raw-prompt', PROMPT_CHAT)}`;

  return pagina({
    titulo: 'Suporte AV - Agroadvance',
    desc: 'Cadeia técnica dos formatos de evento e aula da Agroadvance, com o pacote pronto para colar num chat de IA.',
    atual: null,
    corpo,
    base: './',
  });
}

/* ------------------------------------------------------------------ *
 * 6. Pagina de formato
 * ------------------------------------------------------------------ */
function paginaFormato(f) {
  const artefato = leia(join(f.pasta, f.arquivos.artefato));
  const descritivo = leia(join(f.pasta, f.arquivos.descritivo));
  const rails = CADEIAS[f.cadeias].map((c, i) => railHTML(c, i)).join('\n');
  const plural = CADEIAS[f.cadeias].length > 1;

  const corpo = `<main>
  <div class="wrap">
    <div class="hero">
      <div class="eyebrow"><span class="lbl">Formato</span><span class="bar"></span><span class="lbl">${esc(f.qtd)}</span></div>
      <h1>${esc(f.h1[0])}<br><em>${esc(f.h1[1])}</em></h1>
      <p class="thesis">${esc(f.resumo)}</p>
    </div>
  </div>

  <section>
    <div class="wrap">
      <div class="sec-head"><h2>${plural ? 'Cadeias de sinal' : 'Cadeia de sinal'}</h2><span class="bar"></span></div>
      <div class="legend" role="note" style="margin:0 0 20px">
        <span class="it"><span class="dot" style="background:var(--led-on)"></span> em uso</span>
        <span class="it"><span class="dot" style="background:var(--led-bkp)"></span> backup ou eventual</span>
        <span class="it"><span class="dot" style="background:var(--led-live)"></span> transmissão ao vivo</span>
        <span class="it"><span class="dot" style="background:var(--led-off)"></span> fora deste formato</span>
      </div>
      <div style="display:grid;gap:20px">
${rails}
      </div>
    </div>
  </section>

  <section style="padding-top:0">
    <div class="wrap">
      <div class="sec-head"><h2>Levar para o chat</h2><span class="bar"></span></div>
      <div class="kit">
        <div class="kit-body">
          <div class="say">
            <span class="lbl">Pacote deste formato</span>
            <p>Um clique copia o <b>prompt introdutório</b>, o <b>descritivo técnico</b> e o <b>artefato de operação</b> deste formato, na ordem que a IA espera. Cole numa conversa nova e descreva o problema.</p>
          </div>
          <div class="kit-acts">
            <button class="btn" data-copiar="raw-prompt,raw-descritivo,raw-artefato" data-ok="pacote copiado">Copiar o pacote <span class="k">3 docs</span></button>
            <button class="btn ghost" data-copiar="raw-artefato" data-ok="artefato copiado">Só o artefato <span class="k">txt</span></button>
            <button class="btn ghost" data-copiar="raw-descritivo" data-ok="descritivo copiado">Só o descritivo <span class="k">txt</span></button>
          </div>
        </div>
      </div>

      <details class="doc" open>
        <summary><span class="t">Artefato de operação</span><span class="sub">${esc(f.arquivos.artefato)}</span><span class="chev"><span class="word"></span></span></summary>
        <div class="md">${md2html(artefato, true)}</div>
      </details>

      <details class="doc">
        <summary><span class="t">Descritivo técnico</span><span class="sub">${esc(f.arquivos.descritivo)}</span><span class="chev"><span class="word"></span></span></summary>
        <div class="md">${md2html(descritivo, true)}</div>
      </details>
    </div>
  </section>
</main>
${bruto('raw-prompt', PROMPT_CHAT)}
${bruto('raw-artefato', artefato)}
${bruto('raw-descritivo', descritivo)}`;

  return pagina({
    titulo: `${f.titulo} - Suporte AV Agroadvance`,
    desc: f.resumo,
    atual: f.slug,
    corpo,
    base: '../',
  });
}

/* ------------------------------------------------------------------ *
 * 7. Escrita
 * ------------------------------------------------------------------ */
rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'assets'), { recursive: true });
for (const a of ['site.css', 'site.js']) {
  copyFileSync(join(RAIZ, 'assets', a), join(OUT, 'assets', a));
}
// os .md tambem vao para o site, para quem preferir baixar o arquivo
mkdirSync(join(OUT, 'conteudo'), { recursive: true });
copyFileSync(join(CONT, 'prompt-introdutorio.md'), join(OUT, 'conteudo', 'prompt-introdutorio.md'));
copyFileSync(join(CONT, 'LEIA-ME.md'), join(OUT, 'conteudo', 'LEIA-ME.md'));
for (const f of FORMATOS) {
  mkdirSync(join(OUT, 'conteudo', f.pasta), { recursive: true });
  for (const a of Object.values(f.arquivos)) {
    copyFileSync(join(CONT, f.pasta, a), join(OUT, 'conteudo', f.pasta, a));
  }
}

copyFileSync(join(RAIZ, 'assets', 'favicon.svg'), join(OUT, 'favicon.svg'));
writeFileSync(join(OUT, '.nojekyll'), '');
writeFileSync(join(OUT, 'index.html'), home());
let n = 1;
for (const f of FORMATOS) {
  mkdirSync(join(OUT, f.slug), { recursive: true });
  writeFileSync(join(OUT, f.slug, 'index.html'), paginaFormato(f));
  n++;
}
console.log(`ok - ${n} paginas em docs/`);
