// Gera o site a partir dos .md em /conteudo. Node puro, sem dependencias.
// Uso: node build.mjs
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = dirname(fileURLToPath(import.meta.url));
const CONT = join(RAIZ, 'conteudo');
const OUT = join(RAIZ, 'docs');

/* ==================================================================== *
 * 1. Markdown -> HTML (subconjunto usado nestes documentos)
 * ==================================================================== */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const slug = (s) =>
  String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

function inline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/ -&gt; /g, ' &rarr; ');
}

// Titulos descem um nivel: # -> h2, ## -> h3. semTitulo descarta o # de topo,
// porque o h1 da pagina ja diz o nome do formato. As secoes (##) recebem id
// para a busca poder apontar direto. Devolve { html, secoes }.
function md2html(src, { semTitulo = false, prefixoId = '' } = {}) {
  const linhas = String(src).replace(/\r\n/g, '\n').split('\n');
  const out = [];
  const secoes = [];
  let i = 0;

  const eTabela = (n) =>
    linhas[n] != null && linhas[n].trim().startsWith('|') &&
    linhas[n + 1] != null && /^\|[\s|:-]+\|$/.test(linhas[n + 1].trim());

  const celulas = (linha) =>
    linha.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());

  while (i < linhas.length) {
    const t = linhas[i].trim();

    if (t === '') { i++; continue; }
    if (/^(-{3,}|\*{3,})$/.test(t)) { out.push('<hr>'); i++; continue; }

    const h = t.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      if (semTitulo && h[1].length === 1) { i++; continue; }
      const nivel = Math.min(h[1].length + 1, 5);
      const texto = h[2].trim();
      let attr = '';
      if (h[1].length === 2) {
        const id = prefixoId + slug(texto);
        attr = ` id="${id}"`;
        secoes.push({ id, texto: texto.replace(/^\d+\.\s*/, '') });
      }
      out.push(`<h${nivel}${attr}>${inline(texto)}</h${nivel}>`);
      i++; continue;
    }

    if (eTabela(i)) {
      const cab = celulas(linhas[i]);
      i += 2;
      const corpo = [];
      while (i < linhas.length && linhas[i].trim().startsWith('|')) { corpo.push(celulas(linhas[i])); i++; }
      const th = cab.map((c) => `<th>${c ? inline(c) : '&nbsp;'}</th>`).join('');
      const tr = corpo.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('');
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

  return { html: out.join('\n'), secoes };
}

/* ==================================================================== *
 * 2. Cadeias de sinal
 *    Cada modulo: [nome, papel, estado, chaves]
 *    estado: on = em uso | bkp = backup/eventual | live = ao vivo | off = fora
 *    chaves: rotulos separados por espaco, usados pelo comparador
 *    Tudo aqui sai dos descritivos em /conteudo. Nao inventar.
 * ==================================================================== */
const CADEIAS = {
  evento: [{
    nome: 'Configuração única',
    nota: 'Montagem e operação: 1 pessoa',
    estagios: [
      ['Captação de voz', [
        ['4x mic s/fio Dylan', '2 lapela Pertinence + 2 bastão', 'on', 'mic-dylan'],
        ['XLR P2 do notebook', 'ocupa 1 canal quando o slide tem áudio', 'bkp', 'xlr-p2'],
      ]],
      ['Roteamento de áudio', [
        ['Yamaha MG10XU', '4 entradas XLR', 'on', 'yamaha'],
        ['Scarlett 16i16', 'ganho e volume', 'on', 'scarlett'],
        ['Isolador de sinal', 'resolveu o ruído — ver histórico', 'on', 'isolador'],
      ]],
      ['Imagem e slides', [
        ['PTZ 4K + controladora', 'só o professor, com presets', 'on', 'ptz'],
        ['Sony A7 III', 'audiência', 'on', 'sony-a7'],
        ['Splitter HDMI', 'telão + entrada da ATEM', 'on', 'slides'],
        ['Sony extra', 'só em exceção', 'off', 'sony-extra'],
      ]],
      ['Corte', [
        ['ATEM Extreme ISO', '4 das 8 entradas em uso', 'on', 'atem'],
      ]],
      ['Registro', [
        ['ATEM', 'captura principal', 'on', 'atem-ssd'],
        ['vMix', 'gravação backup', 'bkp', 'vmix'],
        ['Vimeo live', '2º backup', 'bkp', 'vimeo'],
      ]],
      ['Sala', [
        ['Telão LED 2 x 1,5 m', '', 'on', 'sala'],
        ['PA — 2 zonas', 'frontal e traseira, volumes independentes', 'on', 'sala'],
      ]],
    ],
  }],

  aovivo: [
    {
      nome: 'Presencial em estúdio',
      nota: 'Padrão quando o professor está no estúdio',
      estagios: [
        ['Captação', [
          ['2x Sony A7 III', 'host e professor', 'on', 'sony-a7'],
          ['Notebook slides (HDMI)', '', 'on', 'slides'],
        ]],
        ['Áudio', [['2x lapela s/fio Sony', 'modelo a confirmar', 'on', 'lapela-sony']]],
        ['Corte', [['ATEM', 'grava SSD via USB-C · retorno na TV do estúdio', 'on', 'atem atem-ssd']]],
        ['Encode', [
          ['vMix', 'recebe da ATEM via USB', 'on', 'vmix'],
          ['Gravação backup', '', 'bkp', 'vmix-rec'],
        ]],
        ['Distribuição', [['Vimeo', 'transmissão ao vivo', 'live', 'vimeo']]],
        ['Entrega', [['Plataforma LW', 'player recebendo o Vimeo', 'on', 'lw']]],
      ],
    },
    {
      nome: 'Híbrido (Zoom + vMix)',
      nota: 'Padrão para aula remota convencional',
      estagios: [
        ['Captação', [['Câmeras via Zoom', 'professor, host e AV na sala', 'on', 'zoom-cam']]],
        ['Áudio', [['Áudio nativo do Zoom', '', 'on', 'zoom-audio']]],
        ['Corte', [['ATEM', 'não usada — logo não há gravação SSD', 'off', 'atem atem-ssd']]],
        ['Encode', [
          ['vMix + plugin Zoom', 'mockup visual da Agroadvance', 'on', 'vmix'],
          ['Gravação backup', '', 'bkp', 'vmix-rec'],
        ]],
        ['Distribuição', [['Vimeo', 'transmissão ao vivo', 'live', 'vimeo']]],
        ['Entrega', [['Plataforma LW', 'player recebendo o Vimeo', 'on', 'lw']]],
      ],
    },
    {
      nome: 'Somente Zoom',
      nota: 'Contingência do híbrido, ou aula de cases',
      estagios: [
        ['Captação', [['Câmeras nativas do Zoom', '', 'on', 'zoom-cam']]],
        ['Áudio', [['Áudio nativo do Zoom', '', 'on', 'zoom-audio']]],
        ['Corte', [['ATEM', 'fora deste formato', 'off', 'atem atem-ssd']]],
        ['Encode', [['vMix', 'fora deste formato', 'off', 'vmix']]],
        ['Distribuição', [['Vimeo', 'gatilho típico: limite de lives simultâneas', 'off', 'vimeo']]],
        ['Entrega', [['Embed do Zoom na LW', 'sem vMix e sem Vimeo', 'on', 'lw zoom-embed']]],
      ],
    },
  ],

  gravadas: [
    {
      nome: 'Presencial em estúdio (gravado)',
      nota: 'Mesma estrutura do estúdio ao vivo, sem transmissão',
      estagios: [
        ['Captação', [
          ['2x Sony A7 III', 'host e professor', 'on', 'sony-a7'],
          ['Notebook slides (HDMI)', '', 'on', 'slides'],
        ]],
        ['Áudio', [['2x lapela s/fio Sony', 'modelo a confirmar', 'on', 'lapela-sony']]],
        ['Corte', [['ATEM', 'retorno na TV do estúdio', 'on', 'atem']]],
        ['Registro', [
          ['ATEM — SSD via USB-C', 'fonte principal', 'on', 'atem-ssd'],
          ['vMix', 'gravação backup', 'bkp', 'vmix'],
          ['Vimeo', 'não existe em aula gravada', 'off', 'vimeo'],
        ]],
        ['Pós', [['Edição', '', 'on', 'edicao']]],
        ['Entrega', [['Upload na plataforma', '', 'on', 'lw']]],
      ],
    },
    {
      nome: 'Remoto (gravado)',
      nota: 'Professor e AV na sala do Zoom, sem alunos',
      estagios: [
        ['Captação', [['Câmeras via Zoom', 'professor e AV', 'on', 'zoom-cam']]],
        ['Áudio', [['Áudio nativo do Zoom', '', 'on', 'zoom-audio']]],
        ['Corte', [['ATEM', 'fora deste formato', 'off', 'atem atem-ssd']]],
        ['Registro', [
          ['vMix', 'gravação principal, inputs no padrão visual', 'on', 'vmix'],
          ['Vimeo', 'não existe em aula gravada', 'off', 'vimeo'],
        ]],
        ['Pós', [['Edição', 'facilitada pela programação de inputs', 'on', 'edicao']]],
        ['Entrega', [['Upload na plataforma', 'material já editado', 'on', 'lw']]],
      ],
    },
  ],
};

/* ==================================================================== *
 * 3. Formatos
 * ==================================================================== */
const FORMATOS = [
  {
    slug: 'evento-presencial-sede',
    num: '01',
    nav: 'Evento presencial',
    titulo: 'Evento presencial na sede',
    h1: ['Evento presencial', 'na sede'],
    cadeias: 'evento',
    resumo: 'Imersões e eventos no auditório da sede: 40 a 50 pessoas, telão de LED, PA em duas zonas. Áudio de quatro microfones sem fio passando por Yamaha, Scarlett e isolador antes da ATEM. Três registros do mesmo evento.',
    destaque: 'Único formato em que a operação inteira — áudio, slides, câmeras e cortes — fica com uma só pessoa.',
    pasta: '01-evento-presencial-sede',
    arquivos: { artefato: 'artefato-evento-presencial-sede.md', descritivo: 'descritivo-evento-presencial-sede.md' },
  },
  {
    slug: 'aulas-ao-vivo',
    num: '02',
    nav: 'Aulas ao vivo',
    titulo: 'Aulas ao vivo',
    h1: ['Aulas', 'ao vivo'],
    cadeias: 'aovivo',
    resumo: 'Presencial em estúdio, híbrido pelo Zoom com vMix, e somente Zoom como contingência ou aula de cases. O aluno chega pela plataforma nos três, mas o caminho até ela muda por completo.',
    destaque: 'A ATEM só existe no estúdio. Nos dois formatos remotos ela não entra — e com ela vai embora a gravação em SSD.',
    pasta: '02-aulas-ao-vivo',
    arquivos: { artefato: 'artefato-aulas-ao-vivo.md', descritivo: 'descritivo-aulas-ao-vivo.md' },
  },
  {
    slug: 'aulas-gravadas',
    num: '03',
    nav: 'Aulas gravadas',
    titulo: 'Aulas gravadas',
    h1: ['Aulas', 'gravadas'],
    cadeias: 'gravadas',
    resumo: 'Sem transmissão: grava, edita e só então sobe para a plataforma. Vimeo não entra em nenhuma das duas. Quem grava principal muda de lugar entre o estúdio (ATEM) e o remoto (vMix).',
    destaque: 'Quem é a fonte principal de gravação troca de lugar: ATEM no estúdio, vMix no remoto.',
    pasta: '03-aulas-gravadas',
    arquivos: { artefato: 'artefato-aulas-gravadas.md', descritivo: 'descritivo-aulas-gravadas.md' },
  },
];

const leia = (p) => readFileSync(join(CONT, p), 'utf8').replace(/\r\n/g, '\n').trim();
const PROMPT = leia('prompt-introdutorio.md');
// O arquivo tem um cabecalho de instrucao antes do "---"; o que vai para o
// chat e o texto depois dele.
const PROMPT_CHAT = PROMPT.split(/\n---\n/).slice(1).join('\n---\n').trim() || PROMPT;

const bruto = (id, texto) =>
  `<script type="text/plain" id="${id}">${String(texto).replace(/<\/script/gi, '<\\/script')}</script>`;

/* ==================================================================== *
 * 4. Icones (inline, sem dependencia externa)
 * ==================================================================== */
const IC = {
  lupa: '<svg class="lupa" width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.5"/><path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  sol: '<svg class="sol" width="17" height="17" viewBox="0 0 18 18" fill="none" aria-hidden="true"><circle cx="9" cy="9" r="3.6" stroke="currentColor" stroke-width="1.5"/><path d="M9 1v2M9 15v2M1 9h2M15 9h2M3.5 3.5l1.4 1.4M13.1 13.1l1.4 1.4M14.5 3.5l-1.4 1.4M4.9 13.1l-1.4 1.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  lua: '<svg class="lua" width="17" height="17" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M15 11.2A6.5 6.5 0 016.8 3 6.5 6.5 0 109 15.5c2.4 0 4.5-1.3 5.6-3.3z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
  chev: '<svg class="chev" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M3.5 5.5L7 9l3.5-3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  seta: '<svg class="arr" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2.5 7h9M8 3.5L11.5 7 8 10.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  topo: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 13V4M4 7.5L8 3.5l4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  copia: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><rect x="5" y="5" width="7.5" height="7.5" rx="1.6" stroke="currentColor" stroke-width="1.4"/><path d="M9.4 3.2A1.6 1.6 0 007.9 2H3.1A1.6 1.6 0 001.5 3.6v4.8A1.6 1.6 0 003 10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
  check: '<svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M2 5.4L4 7.4 8 3" stroke="#0A2E14" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  alerta: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M9 6.2v4M9 12.4v.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="9" cy="9" r="6.8" stroke="currentColor" stroke-width="1.5"/></svg>',
  doc: '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M9 1.8H4.6A1.6 1.6 0 003 3.4v9.2a1.6 1.6 0 001.6 1.6h6.8a1.6 1.6 0 001.6-1.6V6l-4-4.2z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M9 2v4h4" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
  cubo: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 1.6l5.6 3.2v6.4L8 14.4 2.4 11.2V4.8L8 1.6z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M2.4 4.8L8 8l5.6-3.2M8 8v6.4" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
  grade: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="2" y="2" width="5" height="5" rx="1.2" stroke="currentColor" stroke-width="1.4"/><rect x="9" y="2" width="5" height="5" rx="1.2" stroke="currentColor" stroke-width="1.4"/><rect x="2" y="9" width="5" height="5" rx="1.2" stroke="currentColor" stroke-width="1.4"/><rect x="9" y="9" width="5" height="5" rx="1.2" stroke="currentColor" stroke-width="1.4"/></svg>',
};

/* ==================================================================== *
 * 5. Cadeia — render
 * ==================================================================== */
const ATIVO = (e) => e === 'on' || e === 'bkp' || e === 'live';
const ROTULO_ESTADO = { on: 'Em uso', bkp: 'Backup', live: 'Ao vivo', off: 'Não usa' };

function railHTML(cadeia, idCadeia) {
  const pecas = [];

  cadeia.estagios.forEach(([rotulo, mods], si) => {
    if (si > 0) {
      // o conector morre quando o estagio anterior nao tem nada aceso
      const vivo = cadeia.estagios[si - 1][1].some((m) => ATIVO(m[2]));
      pecas.push(`<div class="link${vivo ? '' : ' morto'}" aria-hidden="true">${vivo ? `<span class="pulso" style="--pd:${si}"></span>` : ''}</div>`);
    }

    const cartoes = mods.map(([nome, papel, estado, chaves]) => `
            <button type="button" class="mod" data-s="${estado}" data-k="${esc(chaves || '')}"
                    aria-pressed="false" title="Acender ${esc(nome)} nas outras configurações">
              ${estado === 'live' ? '<span class="tag">AO VIVO</span>' : ''}
              <span class="led" aria-hidden="true"></span>
              <span class="txt">
                <span class="nome">${esc(nome)}</span>
                ${papel ? `<span class="papel">${esc(papel)}</span>` : ''}
              </span>
            </button>`).join('');

    pecas.push(`<div class="stage">
            <span class="stage-lbl"><span class="n">${si + 1}</span>${esc(rotulo)}</span>${cartoes}
          </div>`);
  });

  return `<div class="chain" id="${idCadeia}">
        <div class="chain-head">
          <h3>${esc(cadeia.nome)}</h3>
          <span class="nota">${esc(cadeia.nota)}</span>
        </div>
        <div class="scene" data-vista="plano">
          <div class="rail">${pecas.join('')}</div>
        </div>
      </div>`;
}

const LEGENDA = `<div class="legenda">
        <span class="it"><span class="dot" style="background:var(--st-on)"></span> Em uso</span>
        <span class="it"><span class="dot" style="background:var(--st-bkp)"></span> Backup ou eventual</span>
        <span class="it"><span class="dot" style="background:var(--st-live)"></span> Transmissão ao vivo</span>
        <span class="it off"><span class="dot"></span> Fora deste formato</span>
      </div>`;

/* ==================================================================== *
 * 6. Comparador
 * ==================================================================== */
const LINHAS_MATRIZ = [
  ['Captação', 'sony-a7', 'Câmera Sony A7 III'],
  ['Captação', 'ptz', 'Câmera PTZ 4K'],
  ['Captação', 'zoom-cam', 'Câmeras pelo Zoom'],
  ['Captação', 'slides', 'Slides por HDMI'],
  ['Áudio', 'mic-dylan', 'Microfones Dylan'],
  ['Áudio', 'lapela-sony', 'Lapela sem fio Sony'],
  ['Áudio', 'zoom-audio', 'Áudio nativo do Zoom'],
  ['Áudio', 'yamaha', 'Mesa Yamaha MG10XU'],
  ['Áudio', 'scarlett', 'Scarlett 16i16'],
  ['Áudio', 'isolador', 'Isolador de sinal'],
  ['Corte e registro', 'atem', 'ATEM (mesa de cortes)'],
  ['Corte e registro', 'atem-ssd', 'Gravação em SSD pela ATEM'],
  ['Corte e registro', 'vmix', 'vMix'],
  ['Distribuição', 'vimeo', 'Vimeo'],
  ['Entrega', 'lw', 'Plataforma da Agroadvance (LW)'],
  ['Entrega', 'zoom-embed', 'Embed do Zoom na plataforma'],
  ['Entrega', 'edicao', 'Edição antes de publicar'],
  ['Entrega', 'sala', 'Telão e PA no auditório'],
];

const COLUNAS = FORMATOS.flatMap((f) =>
  CADEIAS[f.cadeias].map((c, i) => ({ formato: f, cadeia: c, idx: i }))
);

function achaEstado(cadeia, chave) {
  for (const [, mods] of cadeia.estagios) {
    for (const m of mods) {
      if (String(m[3] || '').split(/\s+/).includes(chave)) return m[2];
    }
  }
  return null;
}

function matrizHTML() {
  const cabeca = COLUNAS.map((c) =>
    `<th><span class="grupo">${esc(c.formato.num)} ${esc(c.formato.nav)}</span>${esc(c.cadeia.nome)}</th>`
  ).join('');

  let grupoAtual = '';
  const linhas = LINHAS_MATRIZ.map(([grupo, chave, rotulo]) => {
    let sep = '';
    if (grupo !== grupoAtual) {
      grupoAtual = grupo;
      sep = `<tr class="grupo-linha"><th colspan="${COLUNAS.length + 1}">${esc(grupo)}</th></tr>`;
    }
    const celulas = COLUNAS.map((c) => {
      const e = achaEstado(c.cadeia, chave);
      if (!e) return '<td><span class="cel cel-na">—</span></td>';
      return `<td><span class="cel cel-${e}"><span class="dot"></span>${ROTULO_ESTADO[e]}</span></td>`;
    }).join('');
    return `${sep}<tr><th>${esc(rotulo)}</th>${celulas}</tr>`;
  }).join('');

  return `<div class="matriz-wrap">
        <table class="matriz">
          <thead><tr><th>Equipamento</th>${cabeca}</tr></thead>
          <tbody>${linhas}</tbody>
        </table>
      </div>`;
}

/* ==================================================================== *
 * 6b. Mapa de equipamento -> em quantas configuracoes entra.
 *     Alimenta a barra de foco: "em 3 de 6 configuracoes".
 * ==================================================================== */
const ROTULO_CHAVE = Object.fromEntries(LINHAS_MATRIZ.map(([, k, r]) => [k, r]));

const CHAVES = (() => {
  const mapa = {};
  COLUNAS.forEach(({ cadeia }) => {
    cadeia.estagios.forEach(([, mods]) => {
      mods.forEach(([nome, , estado, chaves]) => {
        String(chaves || '').split(/\s+/).filter(Boolean).forEach((k) => {
          if (!mapa[k]) mapa[k] = { rotulo: ROTULO_CHAVE[k] || nome, usa: 0, fora: 0, total: COLUNAS.length };
          estado === 'off' ? mapa[k].fora++ : mapa[k].usa++;
        });
      });
    });
  });
  return mapa;
})();

/* ==================================================================== *
 * 7. Indice de busca
 * ==================================================================== */
const INDICE = [];
const indexa = (it) => INDICE.push(it);

FORMATOS.forEach((f) => {
  indexa({ t: f.titulo, s: f.resumo.slice(0, 100), h: `{B}${f.slug}/`, g: f.num, o: 'Formato', k: f.nav });
  CADEIAS[f.cadeias].forEach((c, i) => {
    indexa({ t: c.nome, s: `${c.nota} · ${f.titulo}`, h: `{B}${f.slug}/#cfg-${i}`, g: f.num, o: 'Configuração' });
    c.estagios.forEach(([rotulo, mods]) => {
      mods.forEach(([nome, papel, estado]) => {
        indexa({
          t: nome,
          s: `${rotulo} · ${ROTULO_ESTADO[estado]} em ${c.nome}${papel ? ' · ' + papel : ''}`,
          h: `{B}${f.slug}/#cfg-${i}`,
          g: estado === 'off' ? '×' : '•',
          o: f.nav,
          k: `${rotulo} ${papel} ${estado === 'off' ? 'nao usa fora' : 'em uso'}`,
        });
      });
    });
  });
});

/* ==================================================================== *
 * 8. Casca da pagina
 * ==================================================================== */
function pagina({ titulo, desc, atual, corpo, base, indiceJson }) {
  const nav = [
    ...FORMATOS.map((f) => ({ href: `${base}${f.slug}/`, nome: f.nav, id: f.slug })),
    { href: `${base}comparar/`, nome: 'Comparar', id: 'comparar' },
  ].map((n) => `<a href="${n.href}"${atual === n.id ? ' aria-current="page"' : ''}>${esc(n.nome)}</a>`).join('');

  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="noindex,nofollow">
<meta name="theme-color" content="#142C46">
<link rel="icon" href="${base}favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Familjen+Grotesk:wght@400..700&family=JetBrains+Mono:wght@400;500&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${base}assets/site.css">
<script>/* evita piscar o tema claro antes do JS principal */(function(){try{var t=localStorage.getItem('av-tema');if(!t)t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.setAttribute('data-theme',t)}catch(e){}})();</script>

<div id="progress" role="presentation"></div>

<header class="top">
  <div class="wrap">
    <a class="brand" href="${base}">
      <span class="mark" aria-hidden="true"><span></span></span>
      <span class="txt"><b>Suporte AV</b><small>Agroadvance</small></span>
    </a>
    <nav aria-label="Seções">${nav}</nav>
    <div class="tools">
      <button class="searchbtn" data-abre-paleta type="button" aria-label="Buscar equipamento ou formato">
        ${IC.lupa}<span class="rotulo">Buscar</span><span class="kbd">Ctrl K</span>
      </button>
      <button class="iconbtn" id="btnTema" type="button" aria-label="Alternar tema claro e escuro">
        ${IC.sol}${IC.lua}
      </button>
    </div>
  </div>
</header>

${corpo}

<footer>
  <div class="wrap">
    <p>Artefatos de suporte audiovisual · Agroadvance</p>
    <p>Fonte dos textos: os <a href="https://github.com/lucasrmoura96/artefatos-av-agroadvance/tree/main/conteudo">arquivos .md no GitHub</a></p>
  </div>
</footer>

<div id="paleta" role="dialog" aria-modal="true" aria-label="Buscar">
  <div class="paleta-box">
    <div class="paleta-input">
      ${IC.lupa}
      <input id="paletaCampo" type="text" placeholder="Equipamento, formato ou sintoma…" autocomplete="off" spellcheck="false" aria-label="Termo de busca">
      <span class="esc">esc</span>
    </div>
    <div class="paleta-lista" id="paletaLista" role="listbox" aria-label="Resultados"></div>
    <div class="paleta-pe">
      <span><kbd>&uarr;</kbd> <kbd>&darr;</kbd> navegar</span>
      <span><kbd>enter</kbd> abrir</span>
      <span><kbd>/</kbd> buscar de qualquer lugar</span>
    </div>
  </div>
</div>

<div id="toast" role="status" aria-live="polite"><span class="ok">${IC.check}</span><span class="msg"></span></div>

<button id="aoTopo" type="button" aria-label="Voltar ao topo">${IC.topo}</button>

<script>window.AV_INDICE=${indiceJson};window.AV_CHAVES=${JSON.stringify(CHAVES)};</script>
<script src="${base}assets/site.js"></script>
`;
}

const indicePara = (base) =>
  JSON.stringify(INDICE.map((i) => ({ ...i, h: i.h.replace('{B}', base) })));

/* ==================================================================== *
 * 9. Home
 * ==================================================================== */
const GLOSSARIO = [
  ['ATEM Extreme ISO', 'Mesa de cortes. 8 entradas de vídeo e 2 canais de áudio independentes. Grava em SSD pela própria USB-C. Presente no evento presencial e no estúdio; ausente em tudo que é Zoom.'],
  ['vMix', 'Software de produção. Recebe da ATEM por USB no estúdio, ou as câmeras direto do Zoom pelo plugin. Aplica o mockup visual, grava e transmite.'],
  ['Vimeo', 'Veículo da transmissão ao vivo. Exclusivo do fluxo ao vivo: não aparece em aula gravada. Tem limite de lives simultâneas, e esse limite é um dos gatilhos da contingência.'],
  ['Plataforma (LW)', 'Onde o aluno assiste. Recebe o player do Vimeo, ou o embed direto do Zoom no formato de contingência.'],
  ['Zoom', 'Sala do professor nos formatos remotos. Nos cases, também divide os alunos em salas de grupo.'],
];

function home() {
  const totalCfg = FORMATOS.reduce((n, f) => n + CADEIAS[f.cadeias].length, 0);

  const cards = FORMATOS.map((f) => {
    const chips = CADEIAS[f.cadeias].map((c, i) =>
      `<span class="chip${i === 0 ? ' chip-green' : ''}">${esc(c.nome)}</span>`).join('');
    return `        <a class="fcard" data-anima href="./${f.slug}/">
          <span class="num">${esc(f.num)}</span>
          <h3>${esc(f.titulo)}</h3>
          <span class="cfgs">${chips}</span>
          <p>${esc(f.destaque)}</p>
          <span class="go">Abrir a cadeia ${IC.seta}</span>
        </a>`;
  }).join('\n');

  const gloss = GLOSSARIO.map(([k, txt]) => `        <div class="gcard" data-anima>
          <span class="k"><span class="dot"></span>${esc(k)}</span>
          <p>${esc(txt)}</p>
        </div>`).join('\n');

  const corpo = `<main>
  <div class="hero">
    <div class="wrap">
      <div class="hero-top">
        <span class="eyebrow">Suporte operacional de audiovisual</span>
        <span class="rule"></span>
        <span class="eyebrow">${FORMATOS.length} formatos · ${totalCfg} configurações</span>
      </div>
      <h1>Antes de abrir o chamado,<br><span class="dim">olhe</span> <span class="mark-green">a cadeia</span>.</h1>
      <p class="lead">Cada formato acende um conjunto diferente de equipamentos. Metade do diagnóstico é saber <b>o que nem está ligado</b> naquele formato — não faz sentido investigar a ATEM num problema do híbrido, onde ela não entra.</p>
      <div class="hero-cta">
        <button class="btn btn-primary" data-abre-paleta type="button">${IC.lupa} Buscar equipamento ou sintoma <span class="meta">Ctrl K</span></button>
        <a class="btn btn-outline" href="./comparar/">${IC.grade} Comparar as ${totalCfg} configurações</a>
      </div>
    </div>
  </div>

  <section data-anima-grupo>
    <div class="wrap">
      <div class="sec-head">
        <h2>Escolha o formato</h2>
        <span class="rule"></span>
        <span class="count">${FORMATOS.length} formatos</span>
      </div>
      <p class="sec-sub">Dentro de cada um estão a cadeia de sinal, a triagem que monta o pacote para a IA, e os dois documentos completos.</p>
      <div class="grid-formats">
${cards}
      </div>
    </div>
  </section>

  <section data-anima-grupo style="padding-top:0">
    <div class="wrap">
      <div class="sec-head">
        <h2>Onde cada equipamento entra</h2>
        <span class="rule"></span>
        <span class="count">${GLOSSARIO.length} peças-chave</span>
      </div>
      <div class="grid-gloss">
${gloss}
      </div>
    </div>
  </section>

  <section id="prompt" style="padding-top:0">
    <div class="wrap">
      <div class="sec-head">
        <h2>Como usar com a IA</h2>
        <span class="rule"></span>
      </div>
      <div class="triagem">
        <div class="triagem-head">
          <span class="ic" aria-hidden="true">${IC.doc}</span>
          <div>
            <h3>Um prompt, três formatos</h3>
            <p>O mesmo prompt introdutório serve para tudo. Dentro de cada formato, a triagem monta o pacote completo — prompt, descritivo, artefato e o seu relato — na ordem que a IA espera.</p>
          </div>
        </div>
        <div class="triagem-body" style="grid-template-columns:1fr">
          <div>
            <ol style="padding-left:20px;color:var(--c-muted);font-size:14px;display:grid;gap:6px">
              <li>Abra a página do formato em que você está.</li>
              <li>Preencha a triagem: configuração, ponto da cadeia, sintoma e o que já tentou.</li>
              <li>Copie o pacote e cole numa conversa nova.</li>
            </ol>
            <div class="copias" style="margin-top:16px;max-width:280px">
              <button class="btn btn-outline" data-copiar="raw-prompt" data-ok="Prompt copiado" type="button">${IC.copia} <span class="rotulo">Copiar só o prompt</span></button>
            </div>
          </div>
        </div>
      </div>
      <details class="doc" style="margin-top:14px">
        <summary>
          <span class="ic" aria-hidden="true">${IC.doc}</span>
          <span><span class="t">Ler o prompt introdutório</span><span class="arq">prompt-introdutorio.md</span></span>
          ${IC.chev}
        </summary>
        <div class="md">${md2html(PROMPT).html}</div>
      </details>
    </div>
  </section>
</main>
${bruto('raw-prompt', PROMPT_CHAT)}`;

  return pagina({
    titulo: 'Suporte AV · Agroadvance',
    desc: 'Cadeia técnica dos formatos de evento e aula da Agroadvance, com o pacote pronto para colar num chat de IA.',
    atual: null,
    corpo,
    base: './',
    indiceJson: indicePara('./'),
  });
}

/* ==================================================================== *
 * 10. Pagina de formato
 * ==================================================================== */
function corpoFormato(f) {
  const artefato = leia(join(f.pasta, f.arquivos.artefato));
  const descritivo = leia(join(f.pasta, f.arquivos.descritivo));
  const cfgs = CADEIAS[f.cadeias];

  const rails = cfgs.map((c, i) => railHTML(c, `cfg-${i}`)).join('\n');
  const optCfg = cfgs.map((c) => `<option value="${esc(c.nome)}">${esc(c.nome)}</option>`).join('');
  const etapas = [...new Set(cfgs.flatMap((c) => c.estagios.map(([r]) => r)))];
  const optEtapa = etapas.map((e) => `<option value="${esc(e)}">${esc(e)}</option>`).join('');

  const mdArtefato = md2html(artefato, { semTitulo: true, prefixoId: 'a-' });
  const mdDescritivo = md2html(descritivo, { semTitulo: true, prefixoId: 'd-' });

  // as secoes dos documentos entram na busca
  [...mdArtefato.secoes.map((s) => ({ ...s, doc: 'Artefato' })),
   ...mdDescritivo.secoes.map((s) => ({ ...s, doc: 'Descritivo' }))]
    .forEach((s) => indexa({
      t: s.texto, s: `${s.doc} · ${f.titulo}`, h: `{B}${f.slug}/#${s.id}`, g: '§', o: f.nav,
    }));

  return `<main>
  <div class="hero">
    <div class="wrap">
      <div class="hero-top">
        <span class="eyebrow">Formato ${esc(f.num)}</span>
        <span class="rule"></span>
        <span class="eyebrow">${cfgs.length} ${cfgs.length > 1 ? 'configurações técnicas' : 'configuração'}</span>
      </div>
      <h1>${esc(f.h1[0])}<br><span class="dim">${esc(f.h1[1])}</span></h1>
      <p class="lead">${esc(f.resumo)}</p>
    </div>
  </div>

  <section>
    <div class="wrap">
      <div class="sec-head">
        <h2>${cfgs.length > 1 ? 'Cadeias de sinal' : 'Cadeia de sinal'}</h2>
        <span class="rule"></span>
        <div class="seg" data-seg="vista" role="tablist" aria-label="Vista da cadeia">
          <span class="ind" aria-hidden="true"></span>
          <button type="button" data-v="plano" role="tab" aria-selected="true">${IC.grade} Plano</button>
          <button type="button" data-v="3d" role="tab" aria-selected="false">${IC.cubo} 3D</button>
        </div>
      </div>
      <p class="sec-sub">${esc(f.destaque)} <strong style="color:var(--c-text)">Clique num equipamento</strong> para acendê-lo nas outras configurações.</p>
      ${LEGENDA}
      <div id="cadeias">
        <div class="foco-barra" id="focoBarra" hidden>
          <span class="nome"></span>
          <span class="conta"></span>
          <span class="acoes">
            <a href="../comparar/">ver na matriz completa</a>
            <button type="button">limpar</button>
          </span>
        </div>
${rails}
      </div>
      <p class="dica3d" style="display:none">${IC.cubo} A altura do card mostra o quanto o equipamento está em jogo: quanto mais em uso, mais ele flutua.</p>
      <p class="dica-rolar">${IC.seta} Arraste a cadeia para o lado para ver todos os estágios.</p>
    </div>
  </section>

  <section style="padding-top:0">
    <div class="wrap">
      <div class="sec-head">
        <h2>Levar para o chat</h2>
        <span class="rule"></span>
      </div>
      <div class="triagem" id="triagem" data-formato="${esc(f.titulo)}">
        <div class="triagem-head">
          <span class="ic" aria-hidden="true">${IC.alerta}</span>
          <div>
            <h3>Triagem do problema</h3>
            <p>O prompt pede formato, sintoma exato e o que já foi tentado — sem isso a IA vai perguntar antes de ajudar. Preencha aqui e o botão copia tudo junto, já formatado.</p>
          </div>
        </div>
        <div class="triagem-body">
          <div class="campos">
            <div class="campo">
              <label for="tCfg">Configuração técnica em uso</label>
              <select id="tCfg">
                <option value="">Não sei / não se aplica</option>
                ${optCfg}
              </select>
            </div>
            <div class="campo">
              <label for="tEtapa">Onde parece estar</label>
              <select id="tEtapa">
                <option value="">Não sei</option>
                ${optEtapa}
              </select>
              <span class="ajuda">Se não souber, deixe em branco — a cadeia acima ajuda a isolar.</span>
            </div>
            <div class="campo">
              <label for="tSintoma">Sintoma exato</label>
              <textarea id="tSintoma" placeholder="O que aconteceu, e em que ponto da aula ou do evento."></textarea>
            </div>
            <div class="campo">
              <label for="tTentou">O que já tentou</label>
              <textarea id="tTentou" placeholder="Mesmo que não tenha funcionado. Se não tentou nada, deixe em branco." style="min-height:56px"></textarea>
            </div>
          </div>
          <div class="triagem-lado">
            <div class="resumo">
              <b>No pacote</b>
              <ul id="tResumo"></ul>
            </div>
            <span class="contagem" id="tContagem"></span>
            <button class="btn btn-green btn-block" id="tCopiar" type="button">${IC.copia} <span class="rotulo">Copiar o pacote</span></button>
            <button class="btn btn-ghost btn-block" id="tCopiarRelato" type="button"><span class="rotulo">Só o meu relato</span></button>
          </div>
        </div>
      </div>

      <div class="copias" style="margin-top:14px">
        <button class="btn btn-outline" data-copiar="raw-prompt,raw-descritivo,raw-artefato" data-ok="Pacote copiado" type="button">${IC.copia} <span class="rotulo">Pacote sem relato</span></button>
        <button class="btn btn-outline" data-copiar="raw-artefato" data-ok="Artefato copiado" type="button">${IC.copia} <span class="rotulo">Só o artefato</span></button>
        <button class="btn btn-outline" data-copiar="raw-descritivo" data-ok="Descritivo copiado" type="button">${IC.copia} <span class="rotulo">Só o descritivo</span></button>
        <button class="btn btn-outline" data-copiar="raw-prompt" data-ok="Prompt copiado" type="button">${IC.copia} <span class="rotulo">Só o prompt</span></button>
      </div>
    </div>
  </section>

  <section style="padding-top:0">
    <div class="wrap">
      <div class="sec-head">
        <h2>Documentos completos</h2>
        <span class="rule"></span>
        <span class="count">2 arquivos</span>
      </div>
      <details class="doc" open>
        <summary>
          <span class="ic" aria-hidden="true">${IC.doc}</span>
          <span><span class="t">Artefato de operação</span><span class="arq">${esc(f.arquivos.artefato)}</span></span>
          ${IC.chev}
        </summary>
        <div class="md">${mdArtefato.html}</div>
      </details>
      <details class="doc">
        <summary>
          <span class="ic" aria-hidden="true">${IC.doc}</span>
          <span><span class="t">Descritivo técnico</span><span class="arq">${esc(f.arquivos.descritivo)}</span></span>
          ${IC.chev}
        </summary>
        <div class="md">${mdDescritivo.html}</div>
      </details>
    </div>
  </section>
</main>
${bruto('raw-prompt', PROMPT_CHAT)}
${bruto('raw-artefato', artefato)}
${bruto('raw-descritivo', descritivo)}`;
}

/* ==================================================================== *
 * 11. Pagina de comparacao
 * ==================================================================== */
function corpoComparar() {
  return `<main>
  <div class="hero">
    <div class="wrap">
      <div class="hero-top">
        <span class="eyebrow">Comparação</span>
        <span class="rule"></span>
        <span class="eyebrow">${COLUNAS.length} configurações · ${LINHAS_MATRIZ.length} itens</span>
      </div>
      <h1>Quem usa <span class="mark-green">o quê</span>,<br><span class="dim">e quem não usa.</span></h1>
      <p class="lead">A pergunta que o diagnóstico faz toda hora: <b>este equipamento está em jogo neste formato?</b> Aqui a resposta sai das ${COLUNAS.length} configurações de uma vez.</p>
    </div>
  </div>

  <section>
    <div class="wrap">
      ${LEGENDA}
      ${matrizHTML()}
      <p class="sec-sub" style="margin:16px 0 0">
        <strong style="color:var(--c-text)">—</strong> quer dizer que o equipamento não aparece no descritivo daquele formato.
        <strong style="color:var(--c-text)">Não usa</strong> é diferente: o documento diz explicitamente que ele fica de fora, e é esse "fica de fora" que evita diagnóstico perdido.
      </p>
    </div>
  </section>

  <section style="padding-top:0">
    <div class="wrap">
      <div class="sec-head"><h2>Ir para o formato</h2><span class="rule"></span></div>
      <div class="grid-formats">
${FORMATOS.map((f) => `        <a class="fcard" href="../${f.slug}/">
          <span class="num">${esc(f.num)}</span>
          <h3>${esc(f.titulo)}</h3>
          <p>${esc(f.destaque)}</p>
          <span class="go">Abrir a cadeia ${IC.seta}</span>
        </a>`).join('\n')}
      </div>
    </div>
  </section>
</main>`;
}

/* ==================================================================== *
 * 12. Escrita
 * ==================================================================== */
rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'assets'), { recursive: true });
for (const a of ['site.css', 'site.js']) {
  copyFileSync(join(RAIZ, 'assets', a), join(OUT, 'assets', a));
}
copyFileSync(join(RAIZ, 'assets', 'favicon.svg'), join(OUT, 'favicon.svg'));

mkdirSync(join(OUT, 'conteudo'), { recursive: true });
copyFileSync(join(CONT, 'prompt-introdutorio.md'), join(OUT, 'conteudo', 'prompt-introdutorio.md'));
copyFileSync(join(CONT, 'LEIA-ME.md'), join(OUT, 'conteudo', 'LEIA-ME.md'));
for (const f of FORMATOS) {
  mkdirSync(join(OUT, 'conteudo', f.pasta), { recursive: true });
  for (const a of Object.values(f.arquivos)) {
    copyFileSync(join(CONT, f.pasta, a), join(OUT, 'conteudo', f.pasta, a));
  }
}
writeFileSync(join(OUT, '.nojekyll'), '');

// os corpos primeiro: renderizar formato alimenta o indice com as secoes dos
// documentos, e a casca precisa do indice ja completo.
const corpos = FORMATOS.map((f) => ({ f, corpo: corpoFormato(f) }));
const corpoCmp = corpoComparar();

indexa({ t: 'Comparar os formatos', s: 'Matriz de equipamento por configuração técnica', h: '{B}comparar/', g: '⇄', o: 'Página' });
indexa({ t: 'Prompt introdutório', s: 'O texto que abre a conversa com a IA', h: '{B}#prompt', g: '¶', o: 'Início' });

writeFileSync(join(OUT, 'index.html'), home());

for (const { f, corpo } of corpos) {
  mkdirSync(join(OUT, f.slug), { recursive: true });
  writeFileSync(join(OUT, f.slug, 'index.html'), pagina({
    titulo: `${f.titulo} · Suporte AV Agroadvance`,
    desc: f.resumo,
    atual: f.slug,
    corpo,
    base: '../',
    indiceJson: indicePara('../'),
  }));
}

mkdirSync(join(OUT, 'comparar'), { recursive: true });
writeFileSync(join(OUT, 'comparar', 'index.html'), pagina({
  titulo: 'Comparar os formatos · Suporte AV Agroadvance',
  desc: 'Matriz de equipamento por configuração técnica nos formatos de evento e aula da Agroadvance.',
  atual: 'comparar',
  corpo: corpoCmp,
  base: '../',
  indiceJson: indicePara('../'),
}));

console.log(`ok — ${FORMATOS.length + 2} páginas, ${INDICE.length} itens no índice de busca`);
