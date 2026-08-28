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
   * GUIA DE DIAGNÓSTICO — árvore de decisão, sem IA.
   * Percorre a cadeia de sinal um equipamento por vez, que é como se
   * isola problema de AV. Tudo o que ele afirma sai dos documentos.
   * ================================================================ */
  var MANUAL = window.AV_MANUAL || null;
  var AREAS = window.AV_AREAS || {};
  var BOT = window.AV_BOT || null;
  var fluxo = document.getElementById('botFluxo');

  if (MANUAL && BOT && fluxo) {
    var btnReset = document.getElementById('botReset');
    var st = null;

    function zera() {
      st = { fmt: null, cfg: null, area: null, i: 0, caminho: [], atalhoFeito: false };
      fluxo.innerHTML = '';
      if (btnReset) btnReset.hidden = true;
      perguntaCfg();
    }

    /* ---------- montagem das mensagens ---------- */
    function bolha(html, classe) {
      var d = document.createElement('div');
      d.className = 'msg ' + (classe || 'msg-bot');
      d.innerHTML = html;
      fluxo.appendChild(d);
      return d;
    }

    function eu(texto) {
      bolha('<span class="msg-corpo">' + texto + '</span>', 'msg-eu');
    }

    // desativa os botões da rodada anterior: o histórico não deve ser clicável
    function congela() {
      fluxo.querySelectorAll('.opts').forEach(function (o) {
        if (o.dataset.viva === '1') {
          o.dataset.viva = '0';
          o.querySelectorAll('button').forEach(function (b) { b.disabled = true; });
        }
      });
    }

    function opcoes(itens) {
      var box = document.createElement('div');
      box.className = 'opts';
      box.dataset.viva = '1';
      itens.forEach(function (it) {
        if (it.grupo) {
          var g = document.createElement('span');
          g.className = 'opts-grupo';
          g.textContent = it.grupo;
          box.appendChild(g);
          return;
        }
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'opt-bot' + (it.tom ? ' tom-' + it.tom : '');
        b.innerHTML = it.sub
          ? '<b>' + it.rotulo + '</b><small>' + it.sub + '</small>'
          : it.rotulo;
        b.addEventListener('click', function () {
          congela();
          eu(it.eco || it.rotulo);
          it.acao();
          desce();
        });
        box.appendChild(b);
      });
      fluxo.appendChild(box);
      desce();
      return box;
    }

    function desce() {
      if (reduzMovimento) return;
      var ultimo = fluxo.lastElementChild;
      if (ultimo) ultimo.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function achaCfg() {
      var f = MANUAL.filter(function (x) { return x.slug === st.fmt; })[0];
      return f ? { formato: f, cfg: f.cfgs[st.cfg] } : null;
    }

    /* ---------- 1. configuração ---------- */
    function perguntaCfg() {
      bolha('<span class="msg-corpo">Vamos achar o ponto. <b>Em que configuração a aula ou o evento está rodando?</b></span>');
      var itens = [];
      MANUAL.forEach(function (f) {
        itens.push({ grupo: f.nav });
        f.cfgs.forEach(function (c, i) {
          itens.push({
            rotulo: c.nome,
            acao: function () {
              st.fmt = f.slug; st.cfg = i;
              if (btnReset) btnReset.hidden = false;
              perguntaArea();
            },
          });
        });
      });
      opcoes(itens);
    }

    /* ---------- 2. área do sintoma ---------- */
    function perguntaArea() {
      var c = achaCfg();
      bolha('<span class="msg-corpo"><b>Onde está o problema?</b> Escolha pelo que a pessoa está sentindo, não pelo equipamento.</span>');
      var vistas = [];
      c.cfg.etapas.forEach(function (e) { if (vistas.indexOf(e.area) < 0) vistas.push(e.area); });
      opcoes(vistas.map(function (a) {
        var meta = AREAS[a] || { rotulo: a, desc: '' };
        return {
          rotulo: meta.rotulo, sub: meta.desc, eco: meta.rotulo,
          acao: function () { st.area = a; st.i = 0; st.caminho = []; atalhoOuCadeia(); },
        };
      }));
    }

    /* ---------- 3. atalho documentado, se houver ---------- */
    function atalhoOuCadeia() {
      var at = BOT.atalhos.filter(function (a) {
        if (a.fmt !== st.fmt || a.area !== st.area) return false;
        // o atalho vale só nas configurações que ele declara
        return !a.cfgs || a.cfgs.indexOf(st.cfg) >= 0;
      })[0];

      if (at && st.atalhoFeito !== st.area) {
        st.atalhoFeito = st.area;
        bolha('<span class="msg-corpo">' + at.pergunta + '</span>');
        opcoes([
          {
            rotulo: 'Sim', tom: 'sim', eco: 'Sim',
            acao: function () {
              if (at.simTipo === 'resolvido') mostraResolvido(at.simRef);
              else if (at.simTipo === 'gatilhos') mostraGatilhos();
            },
          },
          {
            rotulo: 'Não', tom: 'nao', eco: 'Não',
            acao: function () {
              if (at.naoNota) bolha('<span class="msg-corpo">' + at.naoNota + '</span>');
              andaCadeia();
            },
          },
        ]);
        return;
      }
      andaCadeia();
    }

    /* ---------- suspeitos da área, na ordem do sinal ---------- */
    function suspeitosDaArea() {
      var c = achaCfg();
      var lista = [];
      c.cfg.etapas.filter(function (e) { return e.area === st.area; }).forEach(function (e) {
        e.mods.forEach(function (m) {
          if (m.estado !== 'off') lista.push({ etapa: e.rotulo, mod: m });
        });
      });
      return lista;
    }

    function foraDaArea() {
      var c = achaCfg();
      var f = [];
      c.cfg.etapas.filter(function (e) { return e.area === st.area; }).forEach(function (e) {
        e.mods.forEach(function (m) { if (m.estado === 'off') f.push(m.nome); });
      });
      return f;
    }

    /* ---------- 4. caminhada pela cadeia ---------- */
    function andaCadeia() {
      var lista = suspeitosDaArea();
      var fora = foraDaArea();

      if (!lista.length) {
        var meta = AREAS[st.area] || { rotulo: st.area };
        bolha('<span class="msg-corpo"><b>Nesta configuração não existe essa etapa.</b> ' +
          'Não há o que investigar em ' + meta.rotulo.toLowerCase() + ' aqui' +
          (fora.length ? ' — e o que apareceria (' + fora.join(', ') + ') está fora do formato' : '') +
          '. Se o sintoma é real, ele está em outra área.</span>', 'msg-bot msg-beco');
        ofereceOutraArea();
        return;
      }

      if (st.i === 0 && fora.length) {
        bolha('<span class="msg-corpo">Antes: nesta área <b>não investigue</b> ' + fora.join(', ') +
          ' — não entra nesta configuração.</span>', 'msg-bot msg-nota');
      }

      if (st.i >= lista.length) { fimDaCadeia(); return; }

      var passo = lista[st.i];
      bolha('<span class="msg-corpo"><span class="passo-de">Ponto ' + (st.i + 1) + ' de ' + lista.length +
        ' · ' + passo.etapa + '</span><b>' + passo.mod.nome + '</b>' +
        (passo.mod.papel ? '<span class="passo-papel">' + passo.mod.papel + '</span>' : '') +
        '<span class="passo-q">Este ponto está respondendo?</span></span>');

      opcoes([
        {
          rotulo: 'Está OK', tom: 'sim', eco: passo.mod.nome + ': OK',
          acao: function () {
            st.caminho.push({ nome: passo.mod.nome, r: 'ok' });
            st.i++;
            andaCadeia();
          },
        },
        {
          rotulo: 'O problema é aqui', tom: 'nao', eco: 'O problema é no ' + passo.mod.nome,
          acao: function () {
            st.caminho.push({ nome: passo.mod.nome, r: 'falhou' });
            achou(passo);
          },
        },
        {
          rotulo: 'Não sei verificar', tom: 'neutro', eco: 'Não sei verificar',
          acao: function () {
            st.caminho.push({ nome: passo.mod.nome, r: 'nao verificado' });
            var c = achaCfg();
            bolha('<span class="msg-corpo">O documento diz sobre ele: <b>' +
              (passo.mod.papel || 'nada além do nome') + '</b>. ' +
              'O descritivo do formato tem o contexto completo — está no fim da página do formato. Sigo para o próximo ponto.</span>',
              'msg-bot msg-nota');
            st.i++;
            andaCadeia();
          },
        },
      ]);
    }

    /* ---------- 5. achou o ponto ---------- */
    function achou(passo) {
      var c = achaCfg();
      var resolvidos = BOT.resolvidos[st.fmt] || [];
      // cruza pela chave que o proprio caso declara: nada de adivinhar por
      // semelhanca de nome, que faria o guia afirmar errado
      var minhas = passo.mod.k || [];
      var caso = resolvidos.filter(function (r) {
        return (r.chaves || []).some(function (k) { return minhas.indexOf(k) >= 0; });
      })[0];

      var html = '<span class="msg-corpo"><span class="passo-de">Ponto provável</span><b>' +
        passo.mod.nome + '</b>' +
        (passo.mod.papel ? '<span class="passo-papel">' + passo.mod.papel + '</span>' : '') +
        '<span class="achou-nota">O manual chega até aqui: ele descreve o que este ponto faz, ' +
        'mas <b>não traz procedimento de conserto</b> — isso não está nos documentos do time.</span></span>';
      bolha(html, 'msg-bot msg-achou');

      if (caso) {
        bolha('<span class="msg-corpo"><b>Existe um caso encerrado sobre este ponto:</b> ' + caso.titulo +
          '. Resolveu: ' + caso.solucao + '</span>', 'msg-bot msg-nota');
      }

      fim();
    }

    /* ---------- 6. cadeia inteira OK ---------- */
    function fimDaCadeia() {
      bolha('<span class="msg-corpo"><b>Todos os pontos desta área respondem.</b> ' +
        'Então o sintoma não está nesta parte da cadeia. Vale checar outra área — ou levar o caso para a IA, ' +
        'já com o caminho que você percorreu.</span>', 'msg-bot msg-beco');
      ofereceOutraArea();
    }

    function ofereceOutraArea() {
      opcoes([
        { rotulo: 'Checar outra área', tom: 'neutro', eco: 'Checar outra área',
          acao: function () { st.i = 0; st.caminho = []; perguntaArea(); } },
        { rotulo: 'Levar para a IA', tom: 'sim', eco: 'Levar para a IA',
          acao: function () { paraIA(); } },
      ]);
    }

    /* ---------- saídas ---------- */
    function mostraResolvido(ref) {
      var r = (BOT.resolvidos[st.fmt] || [])[ref || 0];
      if (!r) { andaCadeia(); return; }
      bolha('<span class="msg-corpo"><span class="passo-de">Caso já encerrado</span><b>' + r.titulo + '</b>' +
        '<span class="passo-papel"><b>Era:</b> ' + r.causa + '</span>' +
        '<span class="passo-papel"><b>Resolveu:</b> ' + r.solucao + '</span>' +
        '<span class="achou-nota">' + r.estado + '</span></span>', 'msg-bot msg-achou');
      st.caminho.push({ nome: r.titulo, r: 'caso encerrado, confere com o sintoma' });
      fim();
    }

    function mostraGatilhos() {
      var g = BOT.gatilhos[st.fmt];
      if (!g) { andaCadeia(); return; }
      bolha('<span class="msg-corpo"><span class="passo-de">' + g.titulo + '</span>' +
        g.intro + '<ul class="msg-ul"><li>' + g.itens.join('</li><li>') + '</li></ul>' +
        '<span class="achou-nota">' + g.nota + '</span></span>', 'msg-bot msg-achou');
      bolha('<span class="msg-corpo">Se nenhum desses três bate com o que está acontecendo, o problema é outro — vamos percorrer a cadeia.</span>', 'msg-bot msg-nota');
      opcoes([
        { rotulo: 'Bate com um deles', tom: 'sim', eco: 'Bate com um deles',
          acao: function () {
            st.caminho.push({ nome: 'gatilho de contingência', r: 'confere' });
            bolha('<span class="msg-corpo">Então o caminho documentado é <b>cair para Somente Zoom</b>: ' +
              'o aluno passa a receber o embed do Zoom direto na plataforma, sem vMix e sem Vimeo.</span>', 'msg-bot msg-achou');
            fim();
          } },
        { rotulo: 'Não bate', tom: 'nao', eco: 'Não bate',
          acao: function () { andaCadeia(); } },
      ]);
    }

    function textoCaminho() {
      var c = achaCfg();
      var meta = AREAS[st.area] || { rotulo: st.area };
      var l = ['Percorri o guia do manual:'];
      l.push('- Configuração: ' + c.cfg.nome);
      l.push('- Área: ' + meta.rotulo);
      st.caminho.forEach(function (x) { l.push('- ' + x.nome + ': ' + x.r); });
      return l.join('\n');
    }

    function fim() {
      var c = achaCfg();
      opcoes([
        { rotulo: 'Abrir o manual do formato', tom: 'neutro', eco: 'Abrir o manual do formato',
          acao: function () { window.location.href = './' + c.cfg.ancora; } },
        { rotulo: 'Levar para a IA com este caminho', tom: 'sim', eco: 'Levar para a IA',
          acao: function () { paraIA(); } },
        { rotulo: 'Começar de novo', tom: 'neutro', eco: 'Começar de novo', acao: zera },
      ]);
    }

    // entrega o caminho na URL: sobrevive a qualquer navegação e dá para
    // colar num chamado, diferente de sessionStorage
    function paraIA() {
      var c = achaCfg();
      var meta = AREAS[st.area] || { rotulo: st.area };
      var q = 'cfg=' + encodeURIComponent(c.cfg.nome) +
              '&area=' + encodeURIComponent(meta.rotulo) +
              '&trilha=' + encodeURIComponent(textoCaminho());
      window.location.href = './' + c.formato.slug + '/?' + q + '#ia';
    }

    if (btnReset) btnReset.addEventListener('click', zera);
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
