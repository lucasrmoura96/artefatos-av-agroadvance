/* Manual de AV — Agroadvance
   Triagem rápida, abas de configuração, busca, tema e cópia do pacote. */
(function () {
  'use strict';

  var reduzMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ================================================================ *
   * Aviso
   * ================================================================ */
  var toast = document.getElementById('toast');
  var toastTimer = null;

  function aviso(msg) {
    if (!toast) return;
    var alvo = toast.querySelector('.msg');
    if (alvo) alvo.textContent = msg; else toast.textContent = msg;
    toast.setAttribute('data-show', '1');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.removeAttribute('data-show'); }, 2600);
  }

  /* ================================================================ *
   * Tema
   * ================================================================ */
  var btnTema = document.getElementById('btnTema');
  if (btnTema) {
    btnTema.addEventListener('click', function () {
      var novo = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', novo);
      try { localStorage.setItem('av-tema', novo); } catch (e) {}
    });
  }

  /* ================================================================ *
   * Cópia
   * ================================================================ */
  function bruto(id) {
    var el = document.getElementById(id);
    return el ? el.textContent.trim() : '';
  }

  function copiar(str) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(str);
    return new Promise(function (ok, falha) {
      var ta = document.createElement('textarea');
      ta.value = str;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      var deu = false;
      try { deu = document.execCommand('copy'); } catch (e) { deu = false; }
      document.body.removeChild(ta);
      deu ? ok() : falha(new Error('bloqueado'));
    });
  }

  function entrega(btn, texto, rotulo) {
    if (!texto) { aviso('Nada para copiar'); return; }
    copiar(texto).then(function () {
      aviso(rotulo + ' · ' + texto.length.toLocaleString('pt-BR') + ' caracteres');
      var span = btn.querySelector('.rotulo');
      var antes = span ? span.textContent : null;
      btn.setAttribute('data-done', '1');
      if (span) span.textContent = 'Copiado';
      setTimeout(function () {
        btn.removeAttribute('data-done');
        if (span && antes !== null) span.textContent = antes;
      }, 2100);
    }).catch(function () {
      aviso('O navegador bloqueou a cópia');
    });
  }

  document.querySelectorAll('[data-copiar]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var ids = btn.getAttribute('data-copiar').split(',').map(function (s) { return s.trim(); });
      entrega(btn, ids.map(bruto).filter(Boolean).join('\n\n---\n\n'),
              btn.getAttribute('data-ok') || 'Copiado');
    });
  });

  /* ================================================================ *
   * GUIA — uma pergunta por vez. A trilha no topo carrega o histórico,
   * então a tela nunca acumula. Árvore de decisão, sem IA.
   * ================================================================ */
  var MANUAL = window.AV_MANUAL || null;
  var AREAS = window.AV_AREAS || {};
  var BOT = window.AV_BOT || null;
  var palco = document.getElementById('guiaPalco');

  if (MANUAL && BOT && palco) {
    var trilhaEl = document.getElementById('guiaTrilha');
    var btnVoltar = document.getElementById('guiaVoltar');
    var st, pilha;

    /* ---------------- estado ---------------- */
    function zera() {
      st = { fmt: null, cfg: null, area: null, i: 0, verificado: [], atalhoDe: null };
      pilha = [];
      render();
    }

    function guarda() {
      pilha.push(JSON.parse(JSON.stringify(st)));
    }

    function voltar() {
      if (!pilha.length) return;
      st = pilha.pop();
      render();
    }

    function cfgAtual() {
      var f = MANUAL.filter(function (x) { return x.slug === st.fmt; })[0];
      return f ? { formato: f, cfg: f.cfgs[st.cfg] } : null;
    }

    /* ---------------- dados da cadeia ---------------- */
    function pontos() {
      var c = cfgAtual();
      var l = [];
      c.cfg.etapas.filter(function (e) { return e.area === st.area; }).forEach(function (e) {
        e.mods.forEach(function (m) { if (m.estado !== 'off') l.push({ etapa: e.rotulo, mod: m }); });
      });
      return l;
    }

    function foraDaConfig() {
      var c = cfgAtual();
      var f = [];
      c.cfg.etapas.forEach(function (e) {
        e.mods.forEach(function (m) { if (m.estado === 'off' && f.indexOf(m.nome) < 0) f.push(m.nome); });
      });
      return f;
    }

    function atalhoDaVez() {
      return BOT.atalhos.filter(function (a) {
        if (a.fmt !== st.fmt || a.area !== st.area) return false;
        return !a.cfgs || a.cfgs.indexOf(st.cfg) >= 0;
      })[0];
    }

    /* ---------------- trilha ---------------- */
    function pintaTrilha() {
      var partes = [];
      if (st.fmt !== null) {
        var c = cfgAtual();
        partes.push({ txt: c.cfg.nome, ate: 1 });
      }
      if (st.area) {
        partes.push({ txt: (AREAS[st.area] || {}).rotulo || st.area, ate: 2 });
      }
      trilhaEl.innerHTML = partes.length
        ? partes.map(function (p, i) {
            return (i ? '<span class="tri-sep" aria-hidden="true">/</span>' : '') +
              '<span class="tri-item">' + p.txt + '</span>';
          }).join('')
        : '<span class="tri-item tri-vazio">Começo</span>';
      btnVoltar.hidden = pilha.length === 0;
    }

    /* ---------------- render ---------------- */
    function render() {
      pintaTrilha();

      if (st.fmt === null) return telaConfig();
      if (!st.area) return telaArea();

      var at = atalhoDaVez();
      if (at && st.atalhoDe !== st.area) return telaAtalho(at);

      var lista = pontos();
      if (!lista.length) return telaSemEtapa();
      if (st.i >= lista.length) return telaCadeiaLimpa();
      return telaPonto(lista);
    }

    function troca(html) {
      palco.innerHTML = html;
      palco.querySelectorAll('[data-vai]').forEach(function (b) {
        b.addEventListener('click', function () {
          var fn = acoes[b.getAttribute('data-vai')];
          if (fn) fn(b);
        });
      });
      if (!reduzMovimento) {
        var alvo = palco.querySelector('.cartao');
        if (alvo) alvo.animate(
          [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }],
          { duration: 260, easing: 'cubic-bezier(.22,.9,.24,1)' }
        );
      }
    }

    var acoes = {};

    /* ---------------- 1. configuração ---------------- */
    function telaConfig() {
      var grupos = MANUAL.map(function (f, fi) {
        return '<div class="grupo">' +
          '<span class="grupo-rot">' + f.nav + '</span>' +
          '<div class="escolhas">' + f.cfgs.map(function (c, ci) {
            return '<button class="escolha" type="button" data-vai="cfg" data-f="' + fi + '" data-c="' + ci + '">' +
              c.nome + '</button>';
          }).join('') + '</div></div>';
      }).join('');

      troca('<div class="cartao">' +
        '<span class="cartao-eyebrow">Passo 1 de 3</span>' +
        '<h2 class="cartao-titulo">Em que configuração você está?</h2>' +
        '<div class="grupos">' + grupos + '</div>' +
        '</div>');
    }

    acoes.cfg = function (b) {
      guarda();
      st.fmt = MANUAL[Number(b.getAttribute('data-f'))].slug;
      st.cfg = Number(b.getAttribute('data-c'));
      st.area = null; st.i = 0; st.verificado = []; st.atalhoDe = null;
      render();
    };

    /* ---------------- 2. área ---------------- */
    function telaArea() {
      var c = cfgAtual();
      var vistas = [];
      c.cfg.etapas.forEach(function (e) { if (vistas.indexOf(e.area) < 0) vistas.push(e.area); });

      var opts = vistas.map(function (a) {
        var m = AREAS[a] || { rotulo: a, desc: '' };
        return '<button class="escolha escolha-area" type="button" data-vai="area" data-a="' + a + '">' +
          '<b>' + m.rotulo + '</b><small>' + m.desc + '</small></button>';
      }).join('');

      troca('<div class="cartao">' +
        '<span class="cartao-eyebrow">Passo 2 de 3</span>' +
        '<h2 class="cartao-titulo">Onde está o problema?</h2>' +
        '<p class="cartao-ajuda">Escolha pelo que a pessoa está sentindo, não pelo equipamento.</p>' +
        '<div class="escolhas escolhas-grade">' + opts + '</div>' +
        '</div>');
    }

    acoes.area = function (b) {
      guarda();
      st.area = b.getAttribute('data-a');
      st.i = 0; st.verificado = [];
      render();
    };

    /* ---------------- 3. atalho documentado ---------------- */
    function telaAtalho(at) {
      troca('<div class="cartao">' +
        '<span class="cartao-eyebrow">Passo 3 de 3</span>' +
        '<h2 class="cartao-titulo">' + at.pergunta + '</h2>' +
        '<div class="escolhas">' +
          '<button class="escolha escolha-sim" type="button" data-vai="atalhoSim">Sim</button>' +
          '<button class="escolha" type="button" data-vai="atalhoNao">Não</button>' +
        '</div></div>');
    }

    acoes.atalhoSim = function () {
      var at = atalhoDaVez();
      guarda();
      st.atalhoDe = st.area;
      if (at.simTipo === 'resolvido') telaResolvido(at.simRef || 0);
      else telaGatilhos();
    };

    acoes.atalhoNao = function () {
      guarda();
      st.atalhoDe = st.area;
      render();
    };

    /* ---------------- caminhada pela cadeia ---------------- */
    function telaPonto(lista) {
      var p = lista[st.i];
      var fora = foraDaConfig();
      var jaVi = st.verificado.length
        ? '<div class="checados">' + st.verificado.map(function (v) {
            return '<span class="checado c-' + v.r + '">' + v.nome + '</span>';
          }).join('') + '</div>'
        : '';

      troca('<div class="cartao">' +
        '<span class="cartao-eyebrow">Ponto ' + (st.i + 1) + ' de ' + lista.length + ' · ' + p.etapa + '</span>' +
        '<h2 class="cartao-titulo">' + p.mod.nome + '</h2>' +
        (p.mod.papel ? '<p class="cartao-ajuda">' + p.mod.papel + '</p>' : '') +
        '<p class="cartao-q">Este ponto está respondendo?</p>' +
        '<div class="escolhas">' +
          '<button class="escolha escolha-sim" type="button" data-vai="ok">Está OK</button>' +
          '<button class="escolha escolha-nao" type="button" data-vai="aqui">O problema é aqui</button>' +
          '<button class="escolha escolha-fraca" type="button" data-vai="naosei">Não sei verificar</button>' +
        '</div>' +
        jaVi +
        (st.i === 0 && fora.length
          ? '<p class="cartao-fora"><b>Nem investigue:</b> ' + fora.join(', ') + ' — não entra nesta configuração.</p>'
          : '') +
        '</div>');
    }

    acoes.ok = function () {
      var p = pontos()[st.i];
      guarda();
      st.verificado.push({ nome: p.mod.nome, r: 'ok' });
      st.i++;
      render();
    };

    acoes.naosei = function () {
      var p = pontos()[st.i];
      guarda();
      st.verificado.push({ nome: p.mod.nome, r: 'pulou' });
      st.i++;
      render();
    };

    acoes.aqui = function () {
      var p = pontos()[st.i];
      guarda();
      st.verificado.push({ nome: p.mod.nome, r: 'falhou' });
      telaAchou(p);
    };

    /* ---------------- saídas ---------------- */
    function rodape(extra) {
      var c = cfgAtual();
      return '<div class="cartao-pe">' +
        '<a class="btn btn-primary" href="./' + c.cfg.ancora + '">Abrir o manual</a>' +
        '<button class="btn btn-outline" type="button" data-vai="paraIA">Levar para a IA</button>' +
        (extra || '') +
        '<button class="btn btn-ghost" type="button" data-vai="reiniciar">Começar de novo</button>' +
        '</div>';
    }

    function checados() {
      if (!st.verificado.length) return '';
      return '<div class="checados">' + st.verificado.map(function (v) {
        return '<span class="checado c-' + v.r + '">' + v.nome + '</span>';
      }).join('') + '</div>';
    }

    function telaAchou(p) {
      var caso = (BOT.resolvidos[st.fmt] || []).filter(function (r) {
        return (r.chaves || []).some(function (k) { return (p.mod.k || []).indexOf(k) >= 0; });
      })[0];

      troca('<div class="cartao cartao-ok">' +
        '<span class="cartao-eyebrow">Ponto provável</span>' +
        '<h2 class="cartao-titulo">' + p.mod.nome + '</h2>' +
        (p.mod.papel ? '<p class="cartao-ajuda">' + p.mod.papel + '</p>' : '') +
        (caso
          ? '<div class="caso"><span class="caso-rot">Caso já encerrado sobre este ponto</span>' +
            '<b>' + caso.titulo + '</b><p>' + caso.solucao + '</p></div>'
          : '<p class="cartao-nota">O manual descreve o que este ponto faz, mas não traz o conserto — ' +
            'isso não está nos documentos do time.</p>') +
        checados() +
        rodape() +
        '</div>');
    }

    function telaResolvido(ref) {
      var r = (BOT.resolvidos[st.fmt] || [])[ref];
      if (!r) { st.atalhoDe = st.area; render(); return; }
      st.verificado = [{ nome: 'sintoma bate com caso encerrado', r: 'ok' }];

      troca('<div class="cartao cartao-ok">' +
        '<span class="cartao-eyebrow">Já resolvido antes</span>' +
        '<h2 class="cartao-titulo">' + r.titulo + '</h2>' +
        '<div class="caso"><span class="caso-rot">Resolveu</span><p>' + r.solucao + '</p></div>' +
        '<p class="cartao-nota">' + r.estado + '</p>' +
        rodape() +
        '</div>');
    }

    function telaGatilhos() {
      var g = BOT.gatilhos[st.fmt];
      if (!g) { st.atalhoDe = st.area; render(); return; }

      troca('<div class="cartao cartao-aviso">' +
        '<span class="cartao-eyebrow">' + g.titulo + '</span>' +
        '<h2 class="cartao-titulo">Algum destes três está acontecendo?</h2>' +
        '<ul class="lista-check">' + g.itens.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>' +
        '<div class="escolhas">' +
          '<button class="escolha escolha-sim" type="button" data-vai="gatilhoSim">Sim, um deles</button>' +
          '<button class="escolha" type="button" data-vai="gatilhoNao">Nenhum</button>' +
        '</div></div>');
    }

    acoes.gatilhoSim = function () {
      guarda();
      st.verificado = [{ nome: 'gatilho de contingência', r: 'falhou' }];
      troca('<div class="cartao cartao-ok">' +
        '<span class="cartao-eyebrow">O que fazer</span>' +
        '<h2 class="cartao-titulo">Cair para Somente Zoom</h2>' +
        '<p class="cartao-ajuda">O aluno passa a receber o embed do Zoom direto na plataforma, sem vMix e sem Vimeo. ' +
        'É o caminho documentado para os três gatilhos.</p>' +
        rodape() +
        '</div>');
    };

    acoes.gatilhoNao = function () {
      guarda();
      st.atalhoDe = st.area;
      render();
    };

    function telaSemEtapa() {
      var fora = foraDaConfig();
      var m = AREAS[st.area] || { rotulo: st.area };
      troca('<div class="cartao cartao-aviso">' +
        '<span class="cartao-eyebrow">Nada a investigar aqui</span>' +
        '<h2 class="cartao-titulo">' + m.rotulo + ' não existe nesta configuração</h2>' +
        '<p class="cartao-ajuda">' +
        (fora.length ? 'O que apareceria — ' + fora.join(', ') + ' — está fora deste formato. ' : '') +
        'Se o sintoma é real, ele está em outra área.</p>' +
        '<div class="escolhas"><button class="escolha escolha-sim" type="button" data-vai="outraArea">Escolher outra área</button></div>' +
        rodape() +
        '</div>');
    }

    function telaCadeiaLimpa() {
      troca('<div class="cartao cartao-aviso">' +
        '<span class="cartao-eyebrow">Cadeia percorrida</span>' +
        '<h2 class="cartao-titulo">Todos os pontos desta área respondem</h2>' +
        '<p class="cartao-ajuda">Então o sintoma não está nesta parte da cadeia.</p>' +
        checados() +
        '<div class="escolhas"><button class="escolha escolha-sim" type="button" data-vai="outraArea">Checar outra área</button></div>' +
        rodape() +
        '</div>');
    }

    acoes.outraArea = function () {
      guarda();
      st.area = null; st.i = 0; st.verificado = []; st.atalhoDe = null;
      render();
    };

    acoes.reiniciar = zera;

    // o caminho percorrido vai na URL: sobrevive à navegação e dá para colar
    acoes.paraIA = function () {
      var c = cfgAtual();
      var m = AREAS[st.area] || { rotulo: st.area };
      var l = ['Percorri o guia do manual:', '- Configuração: ' + c.cfg.nome, '- Área: ' + m.rotulo];
      st.verificado.forEach(function (v) {
        l.push('- ' + v.nome + ': ' + (v.r === 'ok' ? 'ok' : v.r === 'falhou' ? 'é aqui' : 'não verificado'));
      });
      window.location.href = './' + c.formato.slug + '/?cfg=' + encodeURIComponent(c.cfg.nome) +
        '&area=' + encodeURIComponent(m.rotulo) + '&trilha=' + encodeURIComponent(l.join('\n')) + '#ia';
    };

    btnVoltar.addEventListener('click', voltar);
    zera();
  }

  /* ================================================================ *
   * Abas de configuração (página de formato)
   * ================================================================ */
  var abas = document.querySelector('.abas');
  if (abas) {
    var corpos = document.querySelectorAll('.cfgs-corpo .cfg');

    function mostra(id) {
      corpos.forEach(function (c) { c.hidden = c.id !== id; });
      abas.querySelectorAll('button').forEach(function (b) {
        b.setAttribute('aria-selected', String(b.getAttribute('data-aba') === id));
      });
    }

    // se a URL aponta para uma configuração, abre aquela
    var alvo = (location.hash || '').replace('#', '');
    mostra(/^cfg-\d+$/.test(alvo) ? alvo : 'cfg-0');

    abas.addEventListener('click', function (ev) {
      var b = ev.target.closest('button[data-aba]');
      if (!b) return;
      mostra(b.getAttribute('data-aba'));
    });

    window.addEventListener('hashchange', function () {
      var h = (location.hash || '').replace('#', '');
      if (/^cfg-\d+$/.test(h)) mostra(h);
    });
  }

  /* ================================================================ *
   * Triagem para a IA
   * ================================================================ */
  var triagem = document.getElementById('triagem');
  if (triagem) {
    var selCfg = document.getElementById('tCfg');
    var selEtapa = document.getElementById('tEtapa');
    var txtSintoma = document.getElementById('tSintoma');
    var txtTentou = document.getElementById('tTentou');
    var btnPacote = document.getElementById('tCopiar');
    var listaResumo = document.getElementById('tResumo');
    var contagem = document.getElementById('tContagem');
    var nomeFormato = triagem.getAttribute('data-formato') || '';

    var montaTexto = function () {
      var l = ['## Situação relatada', ''];
      l.push('- **Formato:** ' + nomeFormato);
      if (selCfg && selCfg.value) l.push('- **Configuração técnica:** ' + selCfg.value);
      if (selEtapa && selEtapa.value) l.push('- **Ponto da cadeia:** ' + selEtapa.value);
      var s = txtSintoma && txtSintoma.value.trim();
      l.push('- **Sintoma:** ' + (s || '(não descrito)'));
      var t = txtTentou && txtTentou.value.trim();
      l.push('- **Já tentei:** ' + (t || 'nada ainda'));
      return l.join('\n');
    };

    var pacote = function () {
      return [bruto('raw-prompt'), bruto('raw-descritivo'), bruto('raw-artefato'), montaTexto()]
        .filter(Boolean).join('\n\n---\n\n');
    };

    var atualiza = function () {
      var itens = [
        { ok: true, txt: 'Formato: ' + nomeFormato },
        { ok: !!(selCfg && selCfg.value), txt: (selCfg && selCfg.value) || 'Configuração técnica' },
        { ok: !!(selEtapa && selEtapa.value), txt: (selEtapa && selEtapa.value) || 'Ponto da cadeia' },
        { ok: !!(txtSintoma && txtSintoma.value.trim()), txt: 'Sintoma descrito' },
        { ok: !!(txtTentou && txtTentou.value.trim()), txt: 'O que já tentou' }
      ];
      if (listaResumo) {
        listaResumo.innerHTML = itens.map(function (i) {
          return '<li class="' + (i.ok ? '' : 'pendente') + '"><span class="mk">' +
            (i.ok ? '&#10003;' : '&#9675;') + '</span><span>' + i.txt + '</span></li>';
        }).join('');
      }
      if (contagem) contagem.textContent = pacote().length.toLocaleString('pt-BR') + ' caracteres';
    };

    [selCfg, selEtapa, txtSintoma, txtTentou].forEach(function (el) {
      if (!el) return;
      el.addEventListener('input', atualiza);
      el.addEventListener('change', atualiza);
    });

    // o guia da home manda o caminho percorrido na querystring
    (function preencheDoGuia() {
      if (!location.search) return;
      var q = {};
      location.search.replace(/^\?/, '').split('&').forEach(function (par) {
        var i = par.indexOf('=');
        if (i < 0) return;
        try { q[par.slice(0, i)] = decodeURIComponent(par.slice(i + 1).replace(/\+/g, ' ')); } catch (e) {}
      });
      if (!q.cfg && !q.trilha) return;

      if (q.cfg && selCfg) {
        [].forEach.call(selCfg.options, function (o) { if (o.value === q.cfg) selCfg.value = q.cfg; });
      }
      if (q.trilha && txtTentou && !txtTentou.value.trim()) txtTentou.value = q.trilha;

      var av = document.createElement('p');
      av.className = 'guia-veio';
      av.innerHTML = 'Veio do guia: <b>' + (q.area || '?') + '</b> em <b>' + (q.cfg || '?') +
        '</b>, e o caminho percorrido já está em “o que já tentou”. Falta descrever o sintoma.';
      var corpo = triagem.querySelector('.triagem-body');
      if (corpo) corpo.parentNode.insertBefore(av, corpo);
    })();

    atualiza();

    if (btnPacote) {
      btnPacote.addEventListener('click', function () { entrega(btnPacote, pacote(), 'Pacote'); });
    }
    var btnRelato = document.getElementById('tCopiarRelato');
    if (btnRelato) {
      btnRelato.addEventListener('click', function () { entrega(btnRelato, montaTexto(), 'Relato'); });
    }
  }

  /* ================================================================ *
   * Busca
   * ================================================================ */
  var paleta = document.getElementById('paleta');
  var idx = window.AV_INDICE || [];

  if (paleta) {
    var campo = document.getElementById('paletaCampo');
    var lista = document.getElementById('paletaLista');
    var sel = 0;
    var atuais = [];

    var normaliza = function (s) {
      return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    };

    var busca = function (q) {
      var n = normaliza(q).trim();
      if (!n) return idx.slice(0, 12);
      var termos = n.split(/\s+/);
      return idx.map(function (it) {
        var alvo = normaliza(it.t + ' ' + it.s + ' ' + (it.k || ''));
        var titulo = normaliza(it.t);
        var pontos = 0;
        for (var i = 0; i < termos.length; i++) {
          if (alvo.indexOf(termos[i]) < 0) return null;
          if (titulo.indexOf(termos[i]) === 0) pontos += 5;
          else if (titulo.indexOf(termos[i]) > 0) pontos += 3;
          else pontos += 1;
        }
        return { it: it, pontos: pontos };
      }).filter(Boolean)
        .sort(function (a, b) { return b.pontos - a.pontos; })
        .slice(0, 14)
        .map(function (x) { return x.it; });
    };

    var pinta = function () {
      if (!atuais.length) {
        lista.innerHTML = '<div class="paleta-vazio">Nada encontrado. Tente “ATEM”, “Zoom”, “ruído” ou “cases”.</div>';
        return;
      }
      lista.innerHTML = atuais.map(function (it, i) {
        return '<a class="paleta-item" role="option" aria-selected="' + (i === sel) + '" href="' + it.h + '">' +
          '<span class="ic">' + (it.g || '#') + '</span>' +
          '<span class="tt"><b>' + it.t + '</b><small>' + it.s + '</small></span>' +
          '<span class="onde">' + (it.o || '') + '</span></a>';
      }).join('');
    };

    var abre = function () {
      paleta.setAttribute('data-abre', '1');
      campo.value = '';
      atuais = busca('');
      sel = 0;
      pinta();
      setTimeout(function () { campo.focus(); }, 20);
    };
    var fecha = function () { paleta.removeAttribute('data-abre'); };

    document.querySelectorAll('[data-abre-paleta]').forEach(function (b) {
      b.addEventListener('click', abre);
    });
    campo.addEventListener('input', function () { atuais = busca(campo.value); sel = 0; pinta(); });
    paleta.addEventListener('click', function (ev) { if (ev.target === paleta) fecha(); });

    document.addEventListener('keydown', function (ev) {
      var k = ev.key.toLowerCase();
      if ((ev.ctrlKey || ev.metaKey) && k === 'k') {
        ev.preventDefault();
        paleta.getAttribute('data-abre') ? fecha() : abre();
        return;
      }
      if (!paleta.getAttribute('data-abre')) {
        var tag = ev.target.tagName;
        if (k === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') { ev.preventDefault(); abre(); }
        return;
      }
      if (k === 'escape') { ev.preventDefault(); fecha(); return; }
      if (k === 'arrowdown' || k === 'arrowup') {
        ev.preventDefault();
        if (!atuais.length) return;
        sel = (sel + (k === 'arrowdown' ? 1 : -1) + atuais.length) % atuais.length;
        pinta();
        var ativo = lista.querySelector('[aria-selected="true"]');
        if (ativo) ativo.scrollIntoView({ block: 'nearest' });
        return;
      }
      if (k === 'enter') {
        var it = atuais[sel];
        if (it) { ev.preventDefault(); window.location.href = it.h; }
      }
    });
  }

  /* ================================================================ *
   * Âncora dentro de <details> fechado: abre antes de rolar
   * ================================================================ */
  function revela(hash) {
    if (!hash || hash.length < 2) return;
    var alvo;
    try { alvo = document.querySelector(hash); } catch (e) { return; }
    if (!alvo) return;
    var pai = alvo.closest('details');
    while (pai) {
      pai.open = true;
      pai = pai.parentElement ? pai.parentElement.closest('details') : null;
    }
    setTimeout(function () {
      alvo.scrollIntoView({ behavior: reduzMovimento ? 'auto' : 'smooth', block: 'start' });
    }, 40);
  }
  if (location.hash) revela(location.hash);
  window.addEventListener('hashchange', function () { revela(location.hash); });

  /* ================================================================ *
   * Voltar ao topo
   * ================================================================ */
  var aoTopo = document.getElementById('aoTopo');
  if (aoTopo) {
    window.addEventListener('scroll', function () {
      window.scrollY > 700 ? aoTopo.setAttribute('data-show', '1') : aoTopo.removeAttribute('data-show');
    }, { passive: true });
    aoTopo.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduzMovimento ? 'auto' : 'smooth' });
    });
  }
})();
