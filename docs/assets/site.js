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
   * Triagem rápida (home): configuração -> área -> suspeitos
   * ================================================================ */
  var MANUAL = window.AV_MANUAL || null;
  var AREAS = window.AV_AREAS || {};
  var optCfg = document.getElementById('optCfg');

  if (MANUAL && optCfg) {
    var passo2 = document.getElementById('passo2');
    var optArea = document.getElementById('optArea');
    var saida = document.getElementById('triSaida');
    var escolha = { fmt: null, cfg: null, area: null };

    function achaCfg() {
      var f = MANUAL.filter(function (x) { return x.slug === escolha.fmt; })[0];
      return f ? { formato: f, cfg: f.cfgs[escolha.cfg] } : null;
    }

    function pintaAreas() {
      var c = achaCfg();
      if (!c) return;
      // só as áreas que existem nessa configuração, na ordem da cadeia
      var vistas = [];
      c.cfg.etapas.forEach(function (e) {
        if (vistas.indexOf(e.area) < 0) vistas.push(e.area);
      });
      optArea.innerHTML = vistas.map(function (a) {
        var meta = AREAS[a] || { rotulo: a, desc: '' };
        return '<button type="button" class="opt opt-area" data-area="' + a + '"' +
          (escolha.area === a ? ' aria-pressed="true"' : '') + '>' +
          '<b>' + meta.rotulo + '</b><small>' + meta.desc + '</small></button>';
      }).join('');
      passo2.hidden = false;
    }

    function pintaSaida() {
      var c = achaCfg();
      if (!c || !escolha.area) { saida.hidden = true; return; }

      var etapas = c.cfg.etapas.filter(function (e) { return e.area === escolha.area; });
      var ativos = [];
      var fora = [];
      etapas.forEach(function (e) {
        e.mods.forEach(function (m) {
          (m.estado === 'off' ? fora : ativos).push({ etapa: e.rotulo, mod: m });
        });
      });

      // o que não entra na configuração toda, não só nesta área
      var foraGeral = [];
      c.cfg.etapas.forEach(function (e) {
        e.mods.forEach(function (m) {
          if (m.estado === 'off' && foraGeral.indexOf(m.nome) < 0) foraGeral.push(m.nome);
        });
      });

      var meta = AREAS[escolha.area] || { rotulo: escolha.area };
      var n = 0;
      var listaAtivos = ativos.map(function (x) {
        n++;
        var tag = x.mod.estado === 'live' ? 'Ao vivo' : (x.mod.estado === 'bkp' ? 'Eventual' : 'Em uso');
        return '<li class="susp" data-s="' + x.mod.estado + '">' +
          '<span class="ord">' + n + '</span>' +
          '<span class="susp-txt"><span class="susp-nome">' + x.mod.nome + '</span>' +
          '<span class="susp-papel">' + x.etapa + (x.mod.papel ? ' · ' + x.mod.papel : '') + '</span></span>' +
          '<span class="susp-tag t-' + x.mod.estado + '">' + tag + '</span></li>';
      }).join('');

      saida.innerHTML =
        '<div class="tri-res">' +
          '<div class="tri-res-cab">' +
            '<span class="eyebrow">' + meta.rotulo + ' · ' + c.cfg.nome + '</span>' +
            '<h3>' + (ativos.length ? 'Verifique nesta ordem' : 'Nada em uso nesta área') + '</h3>' +
          '</div>' +
          (ativos.length
            ? '<ol class="susps">' + listaAtivos + '</ol>'
            : '<p class="tri-nada">Nesta configuração esta etapa não existe — não há o que investigar aqui. ' +
              'Se o sintoma é real, ele está em outra área da cadeia.</p>') +
          (fora.length ? '<p class="tri-fora"><b>Nesta área, não investigue:</b> ' +
            fora.map(function (x) { return x.mod.nome; }).join(', ') + '.</p>' : '') +
          (foraGeral.length ? '<p class="tri-fora tri-fora-geral"><b>Fora desta configuração como um todo:</b> ' +
            foraGeral.join(', ') + '.</p>' : '') +
          '<div class="tri-res-pe">' +
            '<a class="btn btn-primary" href="./' + c.cfg.ancora + '">Abrir o manual completo</a>' +
            '<a class="btn btn-ghost" href="./' + c.formato.slug + '/#ia">Não é nada disso · levar para a IA</a>' +
          '</div>' +
        '</div>';
      saida.hidden = false;
    }

    optCfg.addEventListener('click', function (ev) {
      var b = ev.target.closest('button[data-cfg]');
      if (!b) return;
      optCfg.querySelectorAll('button').forEach(function (x) { x.removeAttribute('aria-pressed'); });
      b.setAttribute('aria-pressed', 'true');
      escolha.fmt = b.getAttribute('data-fmt');
      escolha.cfg = Number(b.getAttribute('data-cfg'));
      escolha.area = null;
      pintaAreas();
      saida.hidden = true;
      if (!reduzMovimento) passo2.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    optArea.addEventListener('click', function (ev) {
      var b = ev.target.closest('button[data-area]');
      if (!b) return;
      optArea.querySelectorAll('button').forEach(function (x) { x.removeAttribute('aria-pressed'); });
      b.setAttribute('aria-pressed', 'true');
      escolha.area = b.getAttribute('data-area');
      pintaSaida();
      if (!reduzMovimento) {
        setTimeout(function () { saida.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 60);
      }
    });
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
