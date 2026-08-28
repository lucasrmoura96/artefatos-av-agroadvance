// Copia de pacotes para colar no chat da IA.
(function () {
  var toast = document.getElementById('toast');
  var timer = null;

  function aviso(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.setAttribute('data-show', '1');
    clearTimeout(timer);
    timer = setTimeout(function () { toast.removeAttribute('data-show'); }, 2200);
  }

  function texto(ids) {
    var partes = [];
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) partes.push(el.textContent.trim());
    });
    return partes.join('\n\n---\n\n');
  }

  function copiar(str) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(str);
    }
    // fallback para http/file
    return new Promise(function (ok, falha) {
      var ta = document.createElement('textarea');
      ta.value = str;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      document.body.appendChild(ta);
      ta.select();
      var deu = false;
      try { deu = document.execCommand('copy'); } catch (e) { deu = false; }
      document.body.removeChild(ta);
      deu ? ok() : falha(new Error('sem permissao'));
    });
  }

  document.querySelectorAll('[data-copiar]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var ids = btn.getAttribute('data-copiar').split(',').map(function (s) { return s.trim(); });
      var str = texto(ids);
      if (!str) { aviso('nada para copiar'); return; }
      var rotulo = btn.getAttribute('data-ok') || 'copiado';
      copiar(str).then(function () {
        aviso(rotulo + ' · ' + str.length.toLocaleString('pt-BR') + ' caracteres');
        var k = btn.querySelector('.k');
        var antes = k ? k.textContent : null;
        btn.setAttribute('data-done', '1');
        if (k) k.textContent = 'ok';
        setTimeout(function () {
          btn.removeAttribute('data-done');
          if (k && antes !== null) k.textContent = antes;
        }, 2000);
      }).catch(function () {
        aviso('o navegador bloqueou a copia');
      });
    });
  });
})();
