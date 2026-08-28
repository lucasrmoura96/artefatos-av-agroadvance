// Gera o manual a partir dos .md em /conteudo. Node puro, sem dependencias.
// Uso: node build.mjs
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

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

// Titulos descem um nivel (# -> h2). As secoes (##) recebem id para a busca
// apontar direto. Devolve { html, secoes }.
function md2html(src, { semTitulo = false, prefixoId = '' } = {}) {
  const linhas = String(src).replace(/\r\n/g, '\n').split('\n');
  const out = [];
  const secoes = [];
  let i = 0;

  const eTabela = (n) =>
    linhas[n] != null && linhas[n].trim().startsWith('|') &&
    linhas[n + 1] != null && /^\|[\s|:-]+\|$/.test(linhas[n + 1].trim());

  const celulas = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());

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
 * 2. Areas de problema — como a pessoa descreve o sintoma
 * ==================================================================== */
const AREAS = {
  audio:       { rotulo: 'Áudio',            desc: 'som da voz, microfone, chiado, volume' },
  imagem:      { rotulo: 'Imagem',           desc: 'câmera, enquadramento, corte, imagem travada' },
  slides:      { rotulo: 'Slides',           desc: 'apresentação, telão, compartilhamento de tela' },
  gravacao:    { rotulo: 'Gravação',         desc: 'o arquivo do evento, backup, SSD' },
  transmissao: { rotulo: 'Transmissão',      desc: 'a live caiu, travou, não subiu' },
  aluno:       { rotulo: 'Acesso do aluno',  desc: 'aluno não vê, não entra, player travado' },
  sala:        { rotulo: 'Som e telão da sala', desc: 'quem está presente não ouve ou não vê' },
};

/* ==================================================================== *
 * 3. Cadeias — [rotulo do estagio, area, modulos]
 *    modulo: [nome, papel, estado, chaves]
 *    estado: on = em uso | bkp = backup/eventual | live = ao vivo | off = fora
 *    Tudo sai dos descritivos em /conteudo. Nao inventar.
 * ==================================================================== */
const CADEIAS = {
  evento: [{
    nome: 'Configuração única',
    nota: 'Montagem e operação: 1 pessoa',
    estagios: [
      ['Captação de voz', 'audio', [
        ['4x mic s/fio Dylan', '2 lapela Pertinence + 2 bastão', 'on', 'mic-dylan'],
        ['XLR P2 do notebook', 'ocupa 1 canal quando o slide tem áudio', 'bkp', 'xlr-p2'],
      ]],
      ['Roteamento de áudio', 'audio', [
        ['Yamaha MG10XU', '4 entradas XLR', 'on', 'yamaha'],
        ['Scarlett 16i16', 'ganho e volume', 'on', 'scarlett'],
        ['Isolador de sinal', 'entre a Scarlett e a ATEM', 'on', 'isolador'],
      ]],
      ['Câmeras', 'imagem', [
        ['PTZ 4K + controladora', 'só o professor, com presets', 'on', 'ptz'],
        ['Sony A7 III', 'audiência', 'on', 'sony-a7'],
        ['Sony extra', 'só em exceção; ocupa uma das 4 entradas livres da ATEM', 'bkp', 'sony-extra'],
      ]],
      ['Slides', 'slides', [
        ['Splitter HDMI', 'uma saída no telão, outra na ATEM', 'on', 'slides'],
        ['Notebook do operador', 'configuração A: professor não mexe no computador', 'on', 'nb-operador'],
        ['Notebook do professor', 'configuração B: segunda mesa no meio do auditório', 'bkp', 'nb-professor'],
      ]],
      ['Corte', 'imagem', [
        ['ATEM Extreme ISO', '4 das 8 entradas em uso', 'on', 'atem'],
      ]],
      ['Registro', 'gravacao', [
        ['ATEM', 'captura principal', 'on', 'atem-ssd'],
        ['vMix', 'gravação backup', 'bkp', 'vmix'],
        ['Vimeo live', '2º backup', 'bkp', 'vimeo'],
      ]],
      ['Sala', 'sala', [
        ['Telão LED 2 x 1,5 m', 'na frente do auditório', 'on', 'sala'],
        ['PA — 2 zonas', 'frontal e traseira, volumes independentes', 'on', 'sala'],
      ]],
    ],
  }],

  aovivo: [
    {
      nome: 'Presencial em estúdio',
      nota: 'Padrão quando o professor está no estúdio',
      estagios: [
        ['Câmeras', 'imagem', [['2x Sony A7 III', 'uma no host, uma no professor', 'on', 'sony-a7']]],
        ['Áudio', 'audio', [['2x lapela s/fio Sony', 'modelo a confirmar', 'on', 'lapela-sony']]],
        ['Slides', 'slides', [['Notebook por HDMI', 'a ATEM devolve o retorno na TV do estúdio', 'on', 'slides']]],
        ['Corte', 'imagem', [['ATEM', 'grava SSD via USB-C', 'on', 'atem atem-ssd']]],
        ['Encode', 'transmissao', [
          ['vMix', 'recebe da ATEM via USB', 'on', 'vmix'],
          ['Gravação backup', 'no vMix, além do SSD da ATEM', 'bkp', 'vmix-rec'],
        ]],
        ['Transmissão', 'transmissao', [['Vimeo', 'live', 'live', 'vimeo']]],
        ['Acesso do aluno', 'aluno', [['Plataforma LW', 'player recebendo o Vimeo', 'on', 'lw']]],
      ],
    },
    {
      nome: 'Híbrido (Zoom + vMix)',
      nota: 'Padrão para aula remota convencional',
      estagios: [
        ['Câmeras', 'imagem', [['Câmeras via Zoom', 'professor, host e AV na sala', 'on', 'zoom-cam']]],
        ['Áudio', 'audio', [['Áudio nativo do Zoom', 'sem mesa, sem lapela', 'on', 'zoom-audio']]],
        ['Slides', 'slides', [['Compartilhados no Zoom', 'o mockup do vMix combina slide e professor', 'on', 'slides']]],
        ['Corte', 'imagem', [['ATEM', 'não entra neste formato', 'off', 'atem atem-ssd']]],
        ['Encode', 'transmissao', [
          ['vMix + plugin Zoom', 'mockup visual da Agroadvance', 'on', 'vmix'],
          ['Gravação backup', 'no vMix', 'bkp', 'vmix-rec'],
        ]],
        ['Transmissão', 'transmissao', [['Vimeo', 'live', 'live', 'vimeo']]],
        ['Acesso do aluno', 'aluno', [['Plataforma LW', 'player recebendo o Vimeo', 'on', 'lw']]],
      ],
    },
    {
      nome: 'Somente Zoom',
      nota: 'Contingência do híbrido, ou aula de cases',
      estagios: [
        ['Câmeras', 'imagem', [['Câmeras nativas do Zoom', '', 'on', 'zoom-cam']]],
        ['Áudio', 'audio', [['Áudio nativo do Zoom', '', 'on', 'zoom-audio']]],
        ['Slides', 'slides', [['Compartilhados no Zoom', '', 'on', 'slides']]],
        ['Corte', 'imagem', [['ATEM', 'não entra neste formato', 'off', 'atem atem-ssd']]],
        ['Encode', 'transmissao', [['vMix', 'não entra neste formato', 'off', 'vmix']]],
        ['Transmissão', 'transmissao', [['Vimeo', 'não entra neste formato', 'off', 'vimeo']]],
        ['Acesso do aluno', 'aluno', [['Embed do Zoom na LW', 'direto, sem vMix e sem Vimeo', 'on', 'lw zoom-embed']]],
      ],
    },
  ],

  gravadas: [
    {
      nome: 'Presencial em estúdio (gravado)',
      nota: 'Mesma estrutura do estúdio ao vivo, sem transmissão',
      estagios: [
        ['Câmeras', 'imagem', [['2x Sony A7 III', 'uma no host, uma no professor', 'on', 'sony-a7']]],
        ['Áudio', 'audio', [['2x lapela s/fio Sony', 'modelo a confirmar', 'on', 'lapela-sony']]],
        ['Slides', 'slides', [['Notebook por HDMI', 'retorno na TV do estúdio', 'on', 'slides']]],
        ['Corte', 'imagem', [['ATEM', '', 'on', 'atem']]],
        ['Registro', 'gravacao', [
          ['ATEM — SSD via USB-C', 'fonte principal', 'on', 'atem-ssd'],
          ['vMix', 'gravação backup', 'bkp', 'vmix'],
          ['Vimeo', 'não existe em aula gravada', 'off', 'vimeo'],
        ]],
        ['Entrega', 'aluno', [
          ['Edição', 'antes de publicar', 'on', 'edicao'],
          ['Upload na plataforma', '', 'on', 'lw'],
        ]],
      ],
    },
    {
      nome: 'Remoto (gravado)',
      nota: 'Professor e AV na sala do Zoom, sem alunos',
      estagios: [
        ['Câmeras', 'imagem', [['Câmeras via Zoom', 'professor e AV', 'on', 'zoom-cam']]],
        ['Áudio', 'audio', [['Áudio nativo do Zoom', '', 'on', 'zoom-audio']]],
        ['Slides', 'slides', [['Compartilhados no Zoom', 'inputs organizados no vMix', 'on', 'slides']]],
        ['Corte', 'imagem', [['ATEM', 'não entra neste formato', 'off', 'atem atem-ssd']]],
        ['Registro', 'gravacao', [
          ['vMix', 'gravação principal, inputs no padrão visual', 'on', 'vmix'],
          ['Vimeo', 'não existe em aula gravada', 'off', 'vimeo'],
        ]],
        ['Entrega', 'aluno', [
          ['Edição', 'facilitada pela programação de inputs', 'on', 'edicao'],
          ['Upload na plataforma', 'material já editado', 'on', 'lw'],
        ]],
      ],
    },
  ],
};

/* ==================================================================== *
 * 4. Conteudo de manual que os documentos REALMENTE trazem.
 *    Nada aqui e' invencao: cada item aponta para a fonte.
 * ==================================================================== */

// Casos encerrados. Reabrir so' se o sintoma mudar.
const RESOLVIDOS = {
  evento: [{
    titulo: 'Ruído alto ao rotear áudio para a ATEM',
    causa: 'Diferença de sinal e impedância ao mandar áudio direto da Yamaha ou da Scarlett para a entrada analógica P2 da ATEM.',
    solucao: 'Conversor/isolador de sinal instalado entre a Scarlett e a ATEM. Além da diferença de sinal, ele reduz estática e interferência eletrônica.',
    estado: 'Encerrado. Não reabrir a menos que o ruído volte em condições diferentes das anteriores.',
    fonte: 'descritivo, seção 9',
    // a que pontos da cadeia este caso se refere — explicito, para o guia
    // nao ter de adivinhar por semelhanca de nome
    chaves: ['yamaha', 'scarlett', 'isolador', 'atem', 'atem-ssd'],
  }],
  aovivo: [],
  gravadas: [],
};

// Gatilhos documentados de troca de formato.
const GATILHOS = {
  aovivo: {
    titulo: 'Quando cair para Somente Zoom',
    intro: 'O descritivo lista três gatilhos de exceção para abandonar o híbrido. Nos três, o caminho passa a ser o embed do Zoom direto na plataforma.',
    itens: [
      'Internet instável — do professor, do host ou do audiovisual.',
      'Problema no vMix.',
      'Limite de lives simultâneas atingido no Vimeo.',
    ],
    nota: 'Aula de cases é caso à parte: ela já nasce em Somente Zoom, porque precisa das salas de grupo do Zoom.',
    fonte: 'descritivo, seção 4',
  },
};

// Fatos que evitam diagnostico perdido.
const NAO_PROCURE = {
  evento: [],
  aovivo: [
    'A ATEM só existe no presencial em estúdio. Nos dois formatos remotos ela não entra — e sem ela não há gravação em SSD.',
    'No Somente Zoom não passa nem vMix nem Vimeo: o aluno recebe o embed do Zoom direto na plataforma.',
  ],
  gravadas: [
    'Vimeo não entra em aula gravada, em nenhum dos dois formatos. Ele é exclusivo do fluxo ao vivo.',
    'A fonte principal de gravação troca de lugar: ATEM no estúdio, vMix no remoto.',
  ],
};

/* ==================================================================== *
 * 4b. Atalhos do guia — perguntas que os documentos sustentam.
 *     Cada um aponta para conteudo real, nao para palpite.
 * ==================================================================== */
const ATALHOS = [
  {
    // descritivo do evento, secao 9
    fmt: 'evento-presencial-sede',
    cfgs: [0],
    area: 'audio',
    pergunta: 'O som está com ruído, chiado ou estática?',
    simTipo: 'resolvido',
    simRef: 0,
    naoNota: 'Então não é o caso já encerrado. Vamos percorrer a cadeia de áudio.',
  },
  {
    // descritivo das aulas ao vivo, secao 4. So' no hibrido: o documento diz
    // "contingencia do hibrido", e em Somente Zoom a pessoa JA esta no
    // destino da contingencia — perguntar ali seria absurdo.
    fmt: 'aulas-ao-vivo',
    cfgs: [1],
    area: 'transmissao',
    pergunta: 'A transmissão caiu, travou ou não subiu?',
    simTipo: 'gatilhos',
    naoNota: 'Então vamos percorrer a cadeia de transmissão ponto a ponto.',
  },
];

/* ==================================================================== *
 * 5. Formatos
 * ==================================================================== */
const FORMATOS = [
  {
    slug: 'evento-presencial-sede',
    num: '01',
    nav: 'Evento presencial',
    titulo: 'Evento presencial na sede',
    cadeias: 'evento',
    resumo: 'Auditório da sede, 40 a 50 pessoas. Quatro microfones sem fio passando por Yamaha, Scarlett e isolador antes da ATEM. Três registros do mesmo evento, e a operação inteira com uma só pessoa.',
    pasta: '01-evento-presencial-sede',
    arquivos: { artefato: 'artefato-evento-presencial-sede.md', descritivo: 'descritivo-evento-presencial-sede.md' },
  },
  {
    slug: 'aulas-ao-vivo',
    num: '02',
    nav: 'Aulas ao vivo',
    titulo: 'Aulas ao vivo',
    cadeias: 'aovivo',
    resumo: 'Três formatos técnicos: presencial em estúdio, híbrido pelo Zoom com vMix, e somente Zoom como contingência ou aula de cases. O aluno chega pela plataforma nos três, mas o caminho até ela muda por completo.',
    pasta: '02-aulas-ao-vivo',
    arquivos: { artefato: 'artefato-aulas-ao-vivo.md', descritivo: 'descritivo-aulas-ao-vivo.md' },
  },
  {
    slug: 'aulas-gravadas',
    num: '03',
    nav: 'Aulas gravadas',
    titulo: 'Aulas gravadas',
    cadeias: 'gravadas',
    resumo: 'Sem transmissão ao vivo: grava, edita e só então sobe para a plataforma. Vimeo não entra em nenhum dos dois formatos.',
    pasta: '03-aulas-gravadas',
    arquivos: { artefato: 'artefato-aulas-gravadas.md', descritivo: 'descritivo-aulas-gravadas.md' },
  },
];

const leia = (p) => readFileSync(join(CONT, p), 'utf8').replace(/\r\n/g, '\n').trim();
const PROMPT = leia('prompt-introdutorio.md');
const PROMPT_CHAT = PROMPT.split(/\n---\n/).slice(1).join('\n---\n').trim() || PROMPT;

// O Pages serve os assets com max-age=600. Sem versao no endereco, depois de
// um push o time pode ficar minutos com o manual velho em cache — e' o tipo de
// coisa que faz parecer que a correcao nao subiu.
const versao = (arquivo) =>
  createHash('sha1').update(readFileSync(join(RAIZ, 'assets', arquivo))).digest('hex').slice(0, 8);
const V_CSS = versao('site.css');
const V_JS = versao('site.js');

const bruto = (id, texto) =>
  `<script type="text/plain" id="${id}">${String(texto).replace(/<\/script/gi, '<\\/script')}</script>`;

/* ==================================================================== *
 * 6. Icones
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
  doc: '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M9 1.8H4.6A1.6 1.6 0 003 3.4v9.2a1.6 1.6 0 001.6 1.6h6.8a1.6 1.6 0 001.6-1.6V6l-4-4.2z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M9 2v4h4" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
  ok: '<svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true"><circle cx="9" cy="9" r="7" stroke="currentColor" stroke-width="1.5"/><path d="M5.8 9.2l2.1 2.1 4.3-4.3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  aviso: '<svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M9 6.4v3.8M9 12.5v.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M7.6 2.6L1.4 13.4a1.6 1.6 0 001.4 2.4h12.4a1.6 1.6 0 001.4-2.4L10.4 2.6a1.6 1.6 0 00-2.8 0z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
  proibido: '<svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true"><circle cx="9" cy="9" r="7" stroke="currentColor" stroke-width="1.5"/><path d="M4.4 13.6L13.6 4.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  raio: '<svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M10 1.6L4 10h3.6l-1 6.4L13 8h-3.6l.6-6.4z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
};

/* ==================================================================== *
 * 7. Lista de suspeitos — a peca central do manual
 * ==================================================================== */
const ROTULO_ESTADO = { on: 'Em uso', bkp: 'Eventual', live: 'Ao vivo', off: 'Fora' };

function suspeitosHTML(cadeia, idCfg) {
  let n = 0;
  const etapas = cadeia.estagios.map(([rotulo, area, mods]) => {
    const ativos = mods.filter((m) => m[2] !== 'off');
    const fora = mods.filter((m) => m[2] === 'off');

    const linhas = ativos.map(([nome, papel, estado]) => {
      n++;
      return `<li class="susp" data-s="${estado}">
              <span class="ord">${n}</span>
              <span class="susp-txt">
                <span class="susp-nome">${esc(nome)}</span>
                ${papel ? `<span class="susp-papel">${esc(papel)}</span>` : ''}
              </span>
              <span class="susp-tag t-${estado}">${ROTULO_ESTADO[estado]}</span>
            </li>`;
    }).join('');

    const linhasFora = fora.map(([nome, papel]) => `<li class="susp fora">
              <span class="ord">—</span>
              <span class="susp-txt">
                <span class="susp-nome">${esc(nome)}</span>
                ${papel ? `<span class="susp-papel">${esc(papel)}</span>` : ''}
              </span>
              <span class="susp-tag t-off">Não investigar</span>
            </li>`).join('');

    return `<div class="etapa" data-area="${area}">
            <div class="etapa-cab">
              <h4>${esc(rotulo)}</h4>
              <span class="etapa-area">${esc(AREAS[area].rotulo)}</span>
            </div>
            <ol class="susps">${linhas}${linhasFora}</ol>
          </div>`;
  }).join('');

  return `<div class="cfg" id="${idCfg}">
        <div class="cfg-cab">
          <h3>${esc(cadeia.nome)}</h3>
          <span class="cfg-nota">${esc(cadeia.nota)}</span>
        </div>
        <div class="etapas">${etapas}</div>
      </div>`;
}

/* ==================================================================== *
 * 8. Dados para a triagem rapida da home
 * ==================================================================== */
const BOT = {
  atalhos: ATALHOS,
  resolvidos: Object.fromEntries(FORMATOS.map((f) => [f.slug, RESOLVIDOS[f.cadeias] || []])),
  gatilhos: Object.fromEntries(FORMATOS.map((f) => [f.slug, GATILHOS[f.cadeias] || null])),
  naoProcure: Object.fromEntries(FORMATOS.map((f) => [f.slug, NAO_PROCURE[f.cadeias] || []])),
};

const MANUAL = FORMATOS.map((f) => ({
  slug: f.slug,
  nav: f.nav,
  titulo: f.titulo,
  cfgs: CADEIAS[f.cadeias].map((c, i) => ({
    nome: c.nome,
    ancora: `${f.slug}/#cfg-${i}`,
    etapas: c.estagios.map(([rotulo, area, mods]) => ({
      rotulo, area,
      mods: mods.map(([nome, papel, estado, chaves]) => ({
        nome, papel, estado, k: String(chaves || '').split(/\s+/).filter(Boolean),
      })),
    })),
  })),
  resolvidos: (RESOLVIDOS[f.cadeias] || []).length,
}));

/* ==================================================================== *
 * 9. Indice de busca
 * ==================================================================== */
const INDICE = [];
const indexa = (it) => INDICE.push(it);

FORMATOS.forEach((f) => {
  indexa({ t: f.titulo, s: f.resumo.slice(0, 100), h: `{B}${f.slug}/`, g: f.num, o: 'Formato', k: f.nav });
  CADEIAS[f.cadeias].forEach((c, i) => {
    indexa({ t: c.nome, s: `${c.nota} · ${f.titulo}`, h: `{B}${f.slug}/#cfg-${i}`, g: f.num, o: 'Configuração' });
    c.estagios.forEach(([rotulo, area, mods]) => {
      mods.forEach(([nome, papel, estado]) => {
        indexa({
          t: nome,
          s: `${rotulo} · ${estado === 'off' ? 'não entra' : ROTULO_ESTADO[estado].toLowerCase()} em ${c.nome}${papel ? ' · ' + papel : ''}`,
          h: `{B}${f.slug}/#cfg-${i}`,
          g: estado === 'off' ? '×' : '•',
          o: f.nav,
          k: `${rotulo} ${AREAS[area].rotulo} ${AREAS[area].desc} ${papel}`,
        });
      });
    });
  });
  (RESOLVIDOS[f.cadeias] || []).forEach((r) => {
    indexa({ t: r.titulo, s: 'Já resolvido · ' + r.solucao.slice(0, 74), h: `{B}${f.slug}/#resolvidos`, g: '✓', o: f.nav, k: 'ruido resolvido historico isolador' });
  });
});
if (GATILHOS.aovivo) {
  indexa({ t: GATILHOS.aovivo.titulo, s: GATILHOS.aovivo.itens.join(' · '), h: '{B}aulas-ao-vivo/#gatilhos', g: '⚡', o: 'Aulas ao vivo', k: 'contingencia internet instavel limite lives vimeo vmix' });
}

/* ==================================================================== *
 * 10. Casca
 * ==================================================================== */
function pagina({ titulo, desc, atual, corpo, base, indiceJson, manualJson }) {
  const nav = FORMATOS
    .map((f) => `<a href="${base}${f.slug}/"${atual === f.slug ? ' aria-current="page"' : ''}>${esc(f.nav)}</a>`)
    .join('');

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
<link rel="stylesheet" href="${base}assets/site.css?v=${V_CSS}">
<script>/* evita piscar o tema errado antes do JS principal */(function(){try{var t=localStorage.getItem('av-tema');if(!t)t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.setAttribute('data-theme',t)}catch(e){}})();</script>

<header class="top">
  <div class="wrap">
    <a class="brand" href="${base}">
      <span class="mark" aria-hidden="true"><span></span></span>
      <span class="txt"><b>Manual de AV</b><small>Agroadvance</small></span>
    </a>
    <nav aria-label="Formatos">${nav}</nav>
    <div class="tools">
      <button class="searchbtn" data-abre-paleta type="button" aria-label="Buscar equipamento, sintoma ou formato">
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
    <p>Manual de suporte audiovisual · Agroadvance</p>
    <p>Fonte dos textos: os <a href="https://github.com/lucasrmoura96/artefatos-av-agroadvance/tree/main/conteudo">arquivos .md no GitHub</a></p>
  </div>
</footer>

<div id="paleta" role="dialog" aria-modal="true" aria-label="Buscar">
  <div class="paleta-box">
    <div class="paleta-input">
      ${IC.lupa}
      <input id="paletaCampo" type="text" placeholder="Equipamento, sintoma ou formato…" autocomplete="off" spellcheck="false" aria-label="Termo de busca">
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

<script>window.AV_INDICE=${indiceJson};${manualJson ? `window.AV_MANUAL=${manualJson};window.AV_AREAS=${JSON.stringify(AREAS)};window.AV_BOT=${JSON.stringify(BOT)};` : ''}</script>
<script src="${base}assets/site.js?v=${V_JS}"></script>
`;
}

const indicePara = (base) => JSON.stringify(INDICE.map((i) => ({ ...i, h: i.h.replace('{B}', base) })));

/* ==================================================================== *
 * 11. Home — a triagem rapida
 * ==================================================================== */
const GLOSSARIO = [
  ['ATEM Extreme ISO', 'Mesa de cortes. 8 entradas de vídeo e 2 canais de áudio independentes; grava em SSD pela própria USB-C. Está no evento presencial e no estúdio. Não está em nada que seja Zoom.'],
  ['vMix', 'Software de produção. Recebe da ATEM por USB no estúdio, ou as câmeras direto do Zoom pelo plugin. Aplica o mockup visual, grava e transmite.'],
  ['Vimeo', 'Veículo da transmissão ao vivo, e só dela: não aparece em aula gravada. Tem limite de lives simultâneas, e esse limite é um dos gatilhos da contingência.'],
  ['Plataforma (LW)', 'Onde o aluno assiste. Recebe o player do Vimeo, ou o embed direto do Zoom no formato de contingência.'],
  ['Zoom', 'Sala do professor nos formatos remotos. Nas aulas de cases, também divide os alunos em salas de grupo.'],
];

function home() {
  const totalCfg = FORMATOS.reduce((n, f) => n + CADEIAS[f.cadeias].length, 0);

  // passo 1: configuracao. Uma lista chapada das 6, agrupada por formato.
  const opcoesCfg = FORMATOS.map((f) => {
    const bts = CADEIAS[f.cadeias].map((c, i) =>
      `<button type="button" class="opt" data-fmt="${f.slug}" data-cfg="${i}">${esc(c.nome)}</button>`
    ).join('');
    return `<div class="opt-grupo">
            <span class="opt-grupo-rot">${esc(f.nav)}</span>
            <div class="opt-linha">${bts}</div>
          </div>`;
  }).join('');

  const cards = FORMATOS.map((f) => {
    const cfgs = CADEIAS[f.cadeias];
    const nResolvidos = (RESOLVIDOS[f.cadeias] || []).length;
    return `        <a class="fcard" href="./${f.slug}/">
          <span class="num">${esc(f.num)}</span>
          <h3>${esc(f.titulo)}</h3>
          <span class="cfgs">${cfgs.map((c) => `<span class="chip">${esc(c.nome)}</span>`).join('')}</span>
          <p>${esc(f.resumo)}</p>
          <span class="fcard-pe">
            <span class="go">Abrir o manual ${IC.seta}</span>
            <span class="fcard-res">${nResolvidos ? nResolvidos + ' caso já resolvido' : 'nenhum caso documentado'}</span>
          </span>
        </a>`;
  }).join('\n');

  const gloss = GLOSSARIO.map(([k, txt]) => `        <div class="gcard">
          <span class="k">${esc(k)}</span>
          <p>${esc(txt)}</p>
        </div>`).join('\n');

  // o caso resolvido aparece na home: e' o que mais evita retrabalho
  const resolvidosHome = FORMATOS.flatMap((f) =>
    (RESOLVIDOS[f.cadeias] || []).map((r) => `        <div class="res">
          <div class="res-cab">
            <span class="res-ic" aria-hidden="true">${IC.ok}</span>
            <div>
              <h3>${esc(r.titulo)}</h3>
              <span class="res-onde">${esc(f.titulo)} · ${esc(r.fonte)}</span>
            </div>
          </div>
          <dl class="res-dl">
            <dt>Era</dt><dd>${esc(r.causa)}</dd>
            <dt>Resolveu</dt><dd>${esc(r.solucao)}</dd>
            <dt>Estado</dt><dd>${esc(r.estado)}</dd>
          </dl>
        </div>`)).join('\n');

  const corpo = `<main>
  <div class="hero hero-curto">
    <div class="wrap">
      <span class="eyebrow">Manual de suporte · audiovisual</span>
      <h1>Deu problema<br><span class="dim">na aula?</span></h1>
      <p class="lead">Responda duas ou três perguntas e o guia leva até o ponto provável, percorrendo a cadeia <b>um equipamento por vez</b>. Ele também diz <b>o que não está em jogo</b> naquele formato — que é o que mais economiza tempo.</p>
    </div>
  </div>

  <section id="guia">
    <div class="wrap">
      <div class="bot" id="bot">
        <div class="bot-cab">
          <span class="bot-av" aria-hidden="true"></span>
          <div class="bot-quem">
            <b>Guia de diagnóstico</b>
            <small>Sem IA. Só o que está nos documentos do time.</small>
          </div>
          <button class="bot-reset" type="button" id="botReset" hidden>Começar de novo</button>
        </div>
        <div class="bot-fluxo" id="botFluxo" aria-live="polite"></div>
      </div>
      <noscript>
        <p class="sec-sub" style="margin-top:16px">O guia precisa de JavaScript. Sem ele, abra o formato direto na lista abaixo — a cadeia completa está lá.</p>
      </noscript>
    </div>
  </section>

  ${resolvidosHome ? `<section id="resolvidos">
    <div class="wrap">
      <div class="sec-head">
        <h2>Já resolvido — não reabrir</h2>
        <span class="rule"></span>
      </div>
      <p class="sec-sub">O que já foi diagnosticado e encerrado. Se o sintoma bater com um destes, a causa já é conhecida.</p>
${resolvidosHome}
      <p class="vazio-nota">${IC.aviso} Aulas ao vivo e aulas gravadas ainda não têm nenhum caso documentado. Cada diagnóstico que o time fechar deve entrar no artefato do formato, para não ser reinvestigado.</p>
    </div>
  </section>` : ''}

  <section>
    <div class="wrap">
      <div class="sec-head">
        <h2>Os ${FORMATOS.length} formatos</h2>
        <span class="rule"></span>
        <span class="count">${totalCfg} configurações</span>
      </div>
      <div class="grid-formats">
${cards}
      </div>
    </div>
  </section>

  <section>
    <div class="wrap">
      <div class="sec-head">
        <h2>O que é cada equipamento</h2>
        <span class="rule"></span>
      </div>
      <p class="sec-sub">Para quem apresenta e não opera: o que cada peça faz, e em que formato ela aparece.</p>
      <div class="grid-gloss">
${gloss}
      </div>
    </div>
  </section>

  <section id="prompt">
    <div class="wrap">
      <div class="sec-head">
        <h2>Se não estiver aqui</h2>
        <span class="rule"></span>
      </div>
      <div class="ia">
        <div>
          <p>Sintoma novo, que o manual não cobre? Aí vale levar para uma IA. Dentro de cada formato há um botão que monta o pacote — prompt, descritivo, artefato e o seu relato — na ordem que a IA espera.</p>
          <p class="ia-nota">Quando o diagnóstico fechar, escreva o resultado no artefato do formato. É assim que o manual para de mandar gente para a IA.</p>
        </div>
        <button class="btn btn-outline" data-copiar="raw-prompt" data-ok="Prompt copiado" type="button">${IC.copia} <span class="rotulo">Copiar só o prompt</span></button>
      </div>
    </div>
  </section>
</main>
${bruto('raw-prompt', PROMPT_CHAT)}`;

  return pagina({
    titulo: 'Manual de AV · Agroadvance',
    desc: 'Manual de consulta durante eventos e aulas: quem está na cadeia de sinal de cada formato, o que não está em jogo, e o que já foi resolvido.',
    atual: null,
    corpo,
    base: './',
    indiceJson: indicePara('./'),
    manualJson: JSON.stringify(MANUAL),
  });
}

/* ==================================================================== *
 * 12. Pagina de formato — o manual
 * ==================================================================== */
function corpoFormato(f) {
  const artefato = leia(join(f.pasta, f.arquivos.artefato));
  const descritivo = leia(join(f.pasta, f.arquivos.descritivo));
  const cfgs = CADEIAS[f.cadeias];
  const resolvidos = RESOLVIDOS[f.cadeias] || [];
  const gatilhos = GATILHOS[f.cadeias];
  const naoProcure = NAO_PROCURE[f.cadeias] || [];

  const mdArtefato = md2html(artefato, { semTitulo: true, prefixoId: 'a-' });
  const mdDescritivo = md2html(descritivo, { semTitulo: true, prefixoId: 'd-' });

  [...mdArtefato.secoes.map((s) => ({ ...s, doc: 'Artefato' })),
   ...mdDescritivo.secoes.map((s) => ({ ...s, doc: 'Descritivo' }))]
    .forEach((s) => indexa({
      t: s.texto, s: `${s.doc} · ${f.titulo}`, h: `{B}${f.slug}/#${s.id}`, g: '§', o: f.nav,
    }));

  // abas de configuracao quando ha mais de uma
  const abas = cfgs.length > 1
    ? `<div class="abas" role="tablist" aria-label="Configuração técnica">
        ${cfgs.map((c, i) => `<button type="button" role="tab" data-aba="cfg-${i}" aria-selected="${i === 0}">${esc(c.nome)}</button>`).join('')}
      </div>`
    : '';

  const listas = cfgs.map((c, i) => suspeitosHTML(c, `cfg-${i}`)).join('\n');

  const blocoNaoProcure = naoProcure.length ? `      <div class="alerta alerta-neg">
        <span class="alerta-ic" aria-hidden="true">${IC.proibido}</span>
        <div>
          <h3>Onde não procurar</h3>
          <ul>${naoProcure.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
        </div>
      </div>` : '';

  const blocoGatilhos = gatilhos ? `  <section id="gatilhos">
    <div class="wrap">
      <div class="sec-head"><h2>${esc(gatilhos.titulo)}</h2><span class="rule"></span></div>
      <div class="alerta alerta-aviso">
        <span class="alerta-ic" aria-hidden="true">${IC.raio}</span>
        <div>
          <p>${esc(gatilhos.intro)}</p>
          <ul>${gatilhos.itens.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
          <p class="alerta-nota">${esc(gatilhos.nota)} <span class="fonte">${esc(gatilhos.fonte)}</span></p>
        </div>
      </div>
    </div>
  </section>` : '';

  const blocoResolvidos = `  <section id="resolvidos">
    <div class="wrap">
      <div class="sec-head"><h2>Já resolvido — não reabrir</h2><span class="rule"></span></div>
${resolvidos.length ? resolvidos.map((r) => `      <div class="res">
        <div class="res-cab">
          <span class="res-ic" aria-hidden="true">${IC.ok}</span>
          <div><h3>${esc(r.titulo)}</h3><span class="res-onde">${esc(r.fonte)}</span></div>
        </div>
        <dl class="res-dl">
          <dt>Era</dt><dd>${esc(r.causa)}</dd>
          <dt>Resolveu</dt><dd>${esc(r.solucao)}</dd>
          <dt>Estado</dt><dd>${esc(r.estado)}</dd>
        </dl>
      </div>`).join('\n') : `      <div class="vazio">
        <p><strong>Nenhum caso documentado ainda para este formato.</strong></p>
        <p>O artefato reserva esta seção, mas ela está em branco. Quando o time fechar um diagnóstico aqui, escreva no artefato — é o que evita reinvestigar o mesmo problema.</p>
      </div>`}
    </div>
  </section>`;

  return `<main>
  <div class="hero hero-curto">
    <div class="wrap">
      <span class="eyebrow">Formato ${esc(f.num)} · ${cfgs.length} ${cfgs.length > 1 ? 'configurações' : 'configuração'}</span>
      <h1>${esc(f.titulo)}</h1>
      <p class="lead">${esc(f.resumo)}</p>
      <div class="atalhos">
        <a href="#suspeitos">Cadeia de sinal</a>
        <a href="#resolvidos">Já resolvido</a>
        ${gatilhos ? '<a href="#gatilhos">Contingência</a>' : ''}
        <a href="#documentos">Documentos</a>
        <a href="#ia">Levar para a IA</a>
      </div>
    </div>
  </div>

  <section id="suspeitos">
    <div class="wrap">
      <div class="sec-head"><h2>Quem está na cadeia</h2><span class="rule"></span></div>
      <p class="sec-sub">Na ordem do sinal. Comece pelo primeiro da etapa onde está o sintoma e vá descendo.</p>
      ${abas}
      <div class="cfgs-corpo">
${listas}
      </div>
${blocoNaoProcure}
    </div>
  </section>

${blocoResolvidos}

${blocoGatilhos}

  <section id="documentos">
    <div class="wrap">
      <div class="sec-head"><h2>Documentos completos</h2><span class="rule"></span><span class="count">2 arquivos</span></div>
      <p class="sec-sub">O texto integral, do jeito que está no pacote. É daqui que sai tudo acima.</p>
      <details class="doc">
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

  <section id="ia">
    <div class="wrap">
      <div class="sec-head"><h2>Se não estiver aqui</h2><span class="rule"></span></div>
      <div class="triagem" id="triagem" data-formato="${esc(f.titulo)}">
        <div class="triagem-head">
          <div>
            <h3>Montar o pacote para a IA</h3>
            <p>Só quando o manual não resolveu. Preencha e o botão copia prompt, descritivo, artefato e o seu relato — na ordem que a IA espera.</p>
          </div>
        </div>
        <div class="triagem-body">
          <div class="campos">
            <div class="campo">
              <label for="tCfg">Configuração em uso</label>
              <select id="tCfg">
                <option value="">Não sei</option>
                ${cfgs.map((c) => `<option value="${esc(c.nome)}">${esc(c.nome)}</option>`).join('')}
              </select>
            </div>
            <div class="campo">
              <label for="tEtapa">Onde parece estar</label>
              <select id="tEtapa">
                <option value="">Não sei</option>
                ${[...new Set(cfgs.flatMap((c) => c.estagios.map(([r]) => r)))].map((e) => `<option value="${esc(e)}">${esc(e)}</option>`).join('')}
              </select>
            </div>
            <div class="campo">
              <label for="tSintoma">Sintoma exato</label>
              <textarea id="tSintoma" placeholder="O que aconteceu, e em que ponto da aula ou do evento."></textarea>
            </div>
            <div class="campo">
              <label for="tTentou">O que já tentou</label>
              <textarea id="tTentou" placeholder="Mesmo que não tenha funcionado." style="min-height:56px"></textarea>
            </div>
          </div>
          <div class="triagem-lado">
            <div class="resumo"><b>No pacote</b><ul id="tResumo"></ul></div>
            <span class="contagem" id="tContagem"></span>
            <button class="btn btn-green btn-block" id="tCopiar" type="button">${IC.copia} <span class="rotulo">Copiar o pacote</span></button>
            <button class="btn btn-ghost btn-block" id="tCopiarRelato" type="button"><span class="rotulo">Só o meu relato</span></button>
          </div>
        </div>
      </div>
    </div>
  </section>
</main>
${bruto('raw-prompt', PROMPT_CHAT)}
${bruto('raw-artefato', artefato)}
${bruto('raw-descritivo', descritivo)}`;
}

/* ==================================================================== *
 * 13. Escrita
 * ==================================================================== */
rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'assets'), { recursive: true });
for (const a of ['site.css', 'site.js']) copyFileSync(join(RAIZ, 'assets', a), join(OUT, 'assets', a));
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

// os formatos primeiro: eles alimentam o indice com as secoes dos documentos
const corpos = FORMATOS.map((f) => ({ f, corpo: corpoFormato(f) }));

writeFileSync(join(OUT, 'index.html'), home());
for (const { f, corpo } of corpos) {
  mkdirSync(join(OUT, f.slug), { recursive: true });
  writeFileSync(join(OUT, f.slug, 'index.html'), pagina({
    titulo: `${f.titulo} · Manual de AV Agroadvance`,
    desc: f.resumo,
    atual: f.slug,
    corpo,
    base: '../',
    indiceJson: indicePara('../'),
  }));
}

console.log(`ok — ${FORMATOS.length + 1} páginas, ${INDICE.length} itens na busca`);
