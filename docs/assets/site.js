/* Suporte AV — Agroadvance
   Tema, busca, vista da cadeia, foco por equipamento, triagem e cópia. */
(function () {
  'use strict';

  var paradoQuietoPor = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduzMovimento = paradoQuietoPor.matches;

  /* ================================================================ *
   * Aviso (toast)
   * ================================================================ */
  var toast = document.getElementById('toast');
  var toastTimer = null;

  function aviso(msg) {
    if (!toast) return;
    var alvo = toast.querySelector('.msg');
    if (alvo) alvo.textContent = msg; else toast.textContent = msg;
    toast.setAttribute('data-show', '1');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.removeAttribute('data-show'); }, 2400);
  }

  /* ================================================================ *
   * Tema — segue o sistema até a pessoa escolher, aí grava
   * ================================================================ */
  var TEMA_KEY = 'av-tema';
  var btnTema = document.getElementById('btnTema');

  if (btnTema) {
    btnTema.addEventListener('click', function () {
      var novo = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', novo);
      try { localStorage.setItem(TEMA_KEY, novo); } catch (e) {}
      aviso(novo === 'dark' ? 'Tema escuro' : 'Tema claro');
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
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(str);
    }
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
   * Onda no clique dos botões
   * ================================================================ */
  if (!reduzMovimento) {
    document.addEventListener('pointerdown', function (ev) {
      var btn = ev.target.closest('.btn');
      if (!btn) return;
      var r = btn.getBoundingClientRect();
      var d = Math.max(r.width, r.height);
      var onda = document.createElement('span');
      onda.className = 'onda';
      onda.style.width = onda.style.height = d + 'px';
      onda.style.left = (ev.clientX - r.left - d / 2) + 'px';
      onda.style.top = (ev.clientY - r.top - d / 2) + 'px';
      btn.appendChild(onda);
      setTimeout(function () { onda.remove(); }, 600);
    });
  }

  /* ================================================================ *
   * Vista da cadeia: plana ou 3D (o fundo não se move; os cards flutuam)
   * ================================================================ */
  var VISTA_KEY = 'av-vista';
  var segVista = document.querySelector('.seg[data-seg="vista"]');

  function moveIndicador(seg) {
    var ind = seg.querySelector('.ind');
    var ativo = seg.querySelector('button[aria-selected="true"]');
    if (!ind || !ativo) return;
    ind.style.width = ativo.offsetWidth + 'px';
    ind.style.transform = 'translateX(' + (ativo.offsetLeft - 3) + 'px)';
  }

  function defineVista(v) {
    document.querySelectorAll('.scene').forEach(function (s) { s.setAttribute('data-vista', v); });
    if (segVista) {
      segVista.querySelectorAll('button').forEach(function (b) {
        b.setAttribute('aria-selected', String(b.getAttribute('data-v') === v));
      });
      moveIndicador(segVista);
    }
    document.querySelectorAll('.dica3d').forEach(function (d) {
      d.style.display = v === '3d' ? 'flex' : 'none';
    });
  }

  if (segVista) {
    var inicial = 'plano';
    try { inicial = localStorage.getItem(VISTA_KEY) || 'plano'; } catch (e) {}
    defineVista(inicial);
    // o indicador precisa das fontes carregadas para medir certo
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { moveIndicador(segVista); });
    }
    window.addEventListener('resize', function () { moveIndicador(segVista); });

    segVista.addEventListener('click', function (ev) {
      var b = ev.target.closest('button[data-v]');
      if (!b) return;
      var v = b.getAttribute('data-v');
      defineVista(v);
      try { localStorage.setItem(VISTA_KEY, v); } catch (e) {}
    });
  }

  /* ================================================================ *
   * Foco por equipamento — clicar num módulo acende o mesmo
   * equipamento em todas as configurações da página
   * ================================================================ */
  var cadeias = document.getElementById('cadeias');
  var barraFoco = document.getElementById('focoBarra');
  var CHAVES = window.AV_CHAVES || {};

  function limpaFoco() {
    if (!cadeias) return;
    cadeias.removeAttribute('data-foco');
    cadeias.querySelectorAll('.mod[data-alvo]').forEach(function (m) { m.removeAttribute('data-alvo'); });
    cadeias.querySelectorAll('.mod').forEach(function (m) { m.setAttribute('aria-pressed', 'false'); });
    if (barraFoco) barraFoco.hidden = true;
  }

  function aplicaFoco(chave, nomeClicado) {
    if (!cadeias) return;
    var info = CHAVES[chave];
    var achou = 0;

    cadeias.querySelectorAll('.mod').forEach(function (m) {
      var suas = (m.getAttribute('data-k') || '').split(/\s+/);
      var bate = suas.indexOf(chave) >= 0;
      bate ? m.setAttribute('data-alvo', '1') : m.removeAttribute('data-alvo');
      m.setAttribute('aria-pressed', String(bate));
      if (bate) achou++;
    });

    cadeias.setAttribute('data-foco', chave);

    if (barraFoco && info) {
      barraFoco.querySelector('.nome').textContent = info.rotulo || nomeClicado;
      var usa = info.usa || 0, fora = info.fora || 0, total = info.total || 0;
      var partes = ['em <b>' + usa + '</b> de <b>' + total + '</b> configurações'];
      if (fora) partes.push('fora de <b>' + fora + '</b>');
      barraFoco.querySelector('.conta').innerHTML = partes.join(' · ');
      barraFoco.hidden = false;
    }
    aviso('Aceso em ' + achou + (achou === 1 ? ' ponto' : ' pontos') + ' desta página');
  }

  if (cadeias) {
    cadeias.addEventListener('click', function (ev) {
      var mod = ev.target.closest('.mod');
      if (!mod) return;
      var chave = (mod.getAttribute('data-k') || '').split(/\s+/)[0];
      if (!chave) return;
      if (cadeias.getAttribute('data-foco') === chave) { limpaFoco(); return; }
      aplicaFoco(chave, mod.querySelector('.nome').textContent);
    });

    if (barraFoco) {
      var btnLimpa = barraFoco.querySelector('button');
      if (btnLimpa) btnLimpa.addEventListener('click', limpaFoco);
    }

    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && cadeias.getAttribute('data-foco')) limpaFoco();
    });
  }

  /* ================================================================ *
   * Brilho que segue o ponteiro nos cards
   * ================================================================ */
  if (!reduzMovimento) {
    document.querySelectorAll('.fcard').forEach(function (card) {
      card.addEventListener('pointermove', function (ev) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', ((ev.clientX - r.left) / r.width * 100).toFixed(1) + '%');
        card.style.setProperty('--my', ((ev.clientY - r.top) / r.height * 100).toFixed(1) + '%');
      });
    });
  }

  /* ================================================================ *
   * Cruz na matriz do comparador: acende a linha e a coluna do cursor
   * ================================================================ */
  var matriz = document.querySelector('.matriz');
  if (matriz) {
    var cabecas = matriz.querySelectorAll('thead th');

    function limpaCruz() {
      matriz.querySelectorAll('.cruz').forEach(function (e) { e.classList.remove('cruz'); });
    }

    matriz.addEventListener('pointermove', function (ev) {
      var cel = ev.target.closest('td,th');
      if (!cel || !cel.parentElement || cel.parentElement.parentElement.tagName === 'THEAD') return;
      limpaCruz();
      var linha = cel.parentElement;
      if (linha.classList.contains('grupo-linha')) return;
      linha.querySelectorAll('td,th').forEach(function (c) { c.classList.add('cruz'); });
      var i = Array.prototype.indexOf.call(linha.children, cel);
      if (cabecas[i]) cabecas[i].classList.add('cruz');
    });

    matriz.addEventListener('pointerleave', limpaCruz);
  }

  /* ================================================================ *
   * Triagem — monta o pacote com o sintoma já descrito
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

    var pacoteCompleto = function () {
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
      if (contagem) {
        contagem.textContent = pacoteCompleto().length.toLocaleString('pt-BR') + ' caracteres no pacote';
      }
    };

    [selCfg, selEtapa, txtSintoma, txtTentou].forEach(function (el) {
      if (!el) return;
      el.addEventListener('input', atualiza);
      el.addEventListener('change', atualiza);
    });
    atualiza();

    if (btnPacote) {
      btnPacote.addEventListener('click', function () {
        entrega(btnPacote, pacoteCompleto(), 'Pacote com o seu relato');
      });
    }
    var btnSoRelato = document.getElementById('tCopiarRelato');
    if (btnSoRelato) {
      btnSoRelato.addEventListener('click', function () {
        entrega(btnSoRelato, montaTexto(), 'Relato copiado');
      });
    }
  }

  /* ================================================================ *
   * Paleta de comando (Ctrl/Cmd + K, ou "/")
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

    campo.addEventListener('input', function () {
      atuais = busca(campo.value); sel = 0; pinta();
    });
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
        if (k === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
          ev.preventDefault(); abre();
        }
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
   * Progresso de leitura e voltar ao topo
   * ================================================================ */
  var barra = document.getElementById('progress');
  var aoTopo = document.getElementById('aoTopo');

  function noScroll() {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    var y = window.scrollY;
    if (barra) barra.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
    if (aoTopo) {
      y > 600 ? aoTopo.setAttribute('data-show', '1') : aoTopo.removeAttribute('data-show');
    }
  }
  window.addEventListener('scroll', noScroll, { passive: true });
  window.addEventListener('resize', noScroll);
  noScroll();

  if (aoTopo) {
    aoTopo.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduzMovimento ? 'auto' : 'smooth' });
    });
  }

  /* ================================================================ *
   * Entrada em cena, escalonada
   * ================================================================ */
  if (!reduzMovimento && 'IntersectionObserver' in window) {
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.querySelectorAll('[data-anima]').forEach(function (a, i) {
          a.style.setProperty('--d', i);
          a.classList.add('anima');
        });
        obs.unobserve(e.target);
      });
    }, { rootMargin: '-40px 0px -60px 0px' });
    document.querySelectorAll('[data-anima-grupo]').forEach(function (g) { obs.observe(g); });
  }
})();
