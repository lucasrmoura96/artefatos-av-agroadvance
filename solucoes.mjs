// Base de soluções por equipamento.
//
// As chaves batem com as `chaves` dos módulos das cadeias em build.mjs.
// Cada sintoma declara a ORIGEM, e isso aparece na tela:
//   interno    — está nos documentos do time (descritivo/artefato)
//   fabricante — documentação ou fórum oficial do fabricante
//   campo      — prática corrente de operação de AV, não específica da casa
//
// Regra ao editar: passo curto, verbo no início, no máximo 6 passos.
// Se um diagnóstico da casa fechar, mova o achado para origem "interno"
// e escreva também no .md do formato.

export const ORIGENS = {
  interno:    { rotulo: 'Documento do time',    tom: 'verde' },
  fabricante: { rotulo: 'Fabricante',           tom: 'azul' },
  campo:      { rotulo: 'Prática de operação',  tom: 'neutro' },
};

export const SOLUCOES = {
  /* ------------------------------------------------------------------ */
  atem: {
    nome: 'ATEM Extreme ISO',
    resumo: 'Mesa de cortes. 8 entradas de vídeo, 2 canais de áudio independentes.',
    sintomas: [
      {
        s: 'Entrada sem imagem (No Signal)',
        passos: [
          'Troque o cabo HDMI por um que você sabe que funciona.',
          'Teste a mesma fonte em outra entrada da ATEM — isola entrada com defeito de fonte com defeito.',
          'Desconecte e reconecte o HDMI na fonte para forçar o reconhecimento (handshake EDID).',
          'Se a fonte é notebook, force 1080p 60 Hz nas configurações de tela.',
          'Reinicie a fonte já com o cabo conectado.',
        ],
        nota: 'Cada entrada da ATEM converte 1080p, 1080i e 720p sozinha — resolução diferente não é a causa mais provável. Falha de handshake é.',
        origem: 'fabricante',
        fonte: 'Blackmagic Design — especificações e fórum oficial',
      },
      {
        s: 'Imagem entra, mas pisca ou cai de vez em quando',
        passos: [
          'Troque por um cabo mais curto — cabo longo é a causa mais comum.',
          'Elimine adaptadores em série (micro HDMI → HDMI → extensor).',
          'Se o sinal passa por splitter, use um splitter com fonte de alimentação própria.',
          'Reassente o conector nas duas pontas.',
        ],
        origem: 'campo',
        fonte: 'Prática de instalação AV',
      },
      {
        s: 'Áudio fora de sincronia com a imagem',
        passos: [
          'Abra o ATEM Software Control, aba Audio, e ajuste o delay do canal.',
          'Confira se a mesma fonte não está entrando por HDMI e pela entrada analógica ao mesmo tempo.',
          'Escolha uma só via de áudio por fonte.',
        ],
        origem: 'fabricante',
        fonte: 'Blackmagic Design — ATEM Software Control',
      },
      {
        s: 'A ATEM não aparece no ATEM Software Control',
        passos: [
          'Confira alimentação e o cabo USB ou de rede.',
          'Feche outras instâncias do software abertas na máquina.',
          'Atualize o firmware pelo próprio ATEM Software Control.',
        ],
        origem: 'fabricante',
        fonte: 'Blackmagic Design',
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  'atem-ssd': {
    nome: 'Gravação em SSD pela ATEM',
    resumo: 'Gravação direta em .mp4 pela USB-C da própria mesa.',
    sintomas: [
      {
        s: 'A gravação não inicia ou o disco não é reconhecido',
        passos: [
          'Use SSD. Pen drive e HD mecânico não sustentam a escrita.',
          'Formate em exFAT (ou HFS+ se o disco só for usado em Mac).',
          'Rode o teste de velocidade do disco no ATEM Software Control antes do evento.',
          'Troque o cabo USB-C pelo cabo original.',
        ],
        nota: 'Há incompatibilidade relatada com algumas unidades Samsung T5 e T7: o disco é reconhecido e a gravação não acontece. Teste antes.',
        origem: 'fabricante',
        fonte: 'Blackmagic Design + relatos do fórum oficial',
      },
      {
        s: 'A gravação para no meio do evento',
        passos: [
          'Confira espaço livre no disco antes de começar.',
          'No modo ISO a mesa grava várias trilhas ao mesmo tempo: disco lento não dá conta.',
          'Reassente o cabo USB-C — mau contato interrompe sem avisar.',
          'Como a operação tem vMix e Vimeo em paralelo, confirme se um dos backups pegou o trecho.',
        ],
        origem: 'fabricante',
        fonte: 'Blackmagic Design; o trecho dos backups vem do descritivo do time',
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  vmix: {
    nome: 'vMix',
    resumo: 'Software de produção: recebe da ATEM ou do Zoom, aplica o mockup, grava e transmite.',
    sintomas: [
      {
        s: 'Imagem travando, frames caindo',
        passos: [
          'Olhe o Render Time no canto inferior: acima de ~20 ms a placa de vídeo está no limite.',
          'CPU acima de 70% também derruba o render — feche o que não é necessário.',
          'Ative "Use Hardware Encoder" nas configurações de stream.',
          'Settings → Performance → ligue "High Input Performance Mode" (placa com 3 GB ou mais).',
          'Atualize o driver da placa de vídeo.',
        ],
        origem: 'fabricante',
        fonte: 'vMix Knowledge Base — Diagnosing High Render Times',
      },
      {
        s: 'A câmera do Zoom não aparece no vMix',
        passos: [
          'Confirme que Zoom e vMix estão na mesma máquina, ou que o NDI está ativo.',
          'Remova e adicione o input de novo — o vínculo se perde quando a sala do Zoom é recriada.',
          'Como plano B, use NDI Desktop Capture da janela do Zoom.',
        ],
        origem: 'fabricante',
        fonte: 'vMix Knowledge Base — Adding Zoom calls to vMix',
      },
      {
        s: 'Áudio não passa entre vMix e Zoom',
        passos: [
          'No vMix, Audio Outputs: habilite o Bus A.',
          'Ative o botão Bus A nos inputs que devem ir para o Zoom.',
          'No Zoom, "Microfone" é o som que vem do vMix; "Alto-falante" é o som que vai para o vMix.',
          'Desmarque "Ajustar volume do microfone automaticamente" no Zoom.',
          'Ligue "Som original" no Zoom para cortar o processamento.',
        ],
        origem: 'fabricante',
        fonte: 'vMix Knowledge Base + comunidade Zoom',
      },
      {
        s: 'A gravação do vMix saiu sem áudio',
        passos: [
          'Confira se o bus de gravação inclui o master.',
          'Verifique se algum input ficou em mute ou solo.',
          'Teste 10 segundos e ouça antes de começar de verdade.',
        ],
        origem: 'campo',
        fonte: 'Prática de operação',
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  vimeo: {
    nome: 'Vimeo',
    resumo: 'Veículo da transmissão ao vivo. Não entra em aula gravada.',
    sintomas: [
      {
        s: 'A live não sobe — erro de RTMP',
        passos: [
          'Confira a URL RTMPS e a chave no painel Stream do evento.',
          'Se der erro de RTMP, acrescente a porta 443 na URL: rtmps://rtmp-global.cloud.vimeo.com:443/live',
          'Gere uma chave nova e cole de novo no vMix.',
        ],
        origem: 'fabricante',
        fonte: 'Vimeo Help Center — How to stream over RTMP/RTMPS',
      },
      {
        s: 'Limite de lives simultâneas atingido',
        passos: [
          'Veja quantos eventos estão no ar na conta agora.',
          'Encerre eventos antigos que ficaram abertos — é a causa mais comum.',
          'No plano Advanced são 2 lives simultâneas; no Enterprise, até 3.',
          'Se não liberar, caia para Somente Zoom: é a contingência documentada.',
        ],
        nota: 'Este é um dos três gatilhos de contingência que o descritivo do time lista.',
        origem: 'fabricante',
        fonte: 'Vimeo Help Center — FAQ Live events; a contingência vem do descritivo do time',
      },
      {
        s: 'A live está instável ou travando para o aluno',
        passos: [
          'Abra o indicador de saúde do stream (ícone de stream, canto superior direito do evento).',
          '"Unstable connection" significa queda acima de 15% no frame rate ou no bitrate.',
          'Reduza o bitrate de saída no vMix.',
          'Use cabo em vez de Wi-Fi na máquina que transmite.',
        ],
        origem: 'fabricante',
        fonte: 'Vimeo Help Center — How to monitor the health of your stream',
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  'zoom-audio': {
    nome: 'Áudio do Zoom',
    resumo: 'Áudio nativo da sala, usado nos formatos remotos.',
    sintomas: [
      {
        s: 'Eco ou microfonia na sala',
        passos: [
          'Procure quem está com dois áudios abertos (computador e telefone) e saia de um.',
          'Duas máquinas com áudio ativo na mesma sala física: silencie uma.',
          'Peça fone — caixa perto do microfone realimenta.',
          'Confirme que "Som original" está desligado em todos, salvo necessidade.',
        ],
        origem: 'fabricante',
        fonte: 'Zoom — Troubleshoot Audio Echo or Feedback',
      },
      {
        s: 'Professor sem áudio ou áudio baixo',
        passos: [
          'Confirme o dispositivo de entrada selecionado no Zoom, não no sistema.',
          'Peça para testar em Configurações → Áudio → Testar microfone.',
          'Desmarque "Ajustar volume do microfone automaticamente".',
          'Se usa fone Bluetooth, troque por fone com cabo — é a troca que mais resolve.',
        ],
        origem: 'campo',
        fonte: 'Prática de operação',
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  'zoom-cam': {
    nome: 'Câmeras pelo Zoom',
    resumo: 'Imagem dos participantes nos formatos remotos.',
    sintomas: [
      {
        s: 'Compartilhamento de tela travando',
        passos: [
          'Troque Wi-Fi por cabo na máquina que compartilha.',
          'Feche abas e aplicativos pesados.',
          'Compartilhe a janela, não a tela inteira.',
        ],
        origem: 'fabricante',
        fonte: 'Zoom — problemas comuns',
      },
      {
        s: 'Salas de grupo (breakout) não abrem',
        passos: [
          'Só o host abre as salas: confirme quem está como host.',
          'Ative Breakout Rooms nas configurações da conta antes da aula.',
          'Se o host caiu, reatribua o host antes de tentar de novo.',
        ],
        nota: 'Aula de cases depende das salas de grupo, e por isso roda em Somente Zoom.',
        origem: 'fabricante',
        fonte: 'Zoom; o vínculo com a aula de cases vem do descritivo do time',
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  yamaha: {
    nome: 'Mesa Yamaha MG10XU',
    resumo: '4 entradas XLR. Primeiro estágio do áudio no evento presencial.',
    sintomas: [
      {
        s: 'Sem som, ou som muito baixo',
        passos: [
          'Confira cabo e conexão do canal.',
          'GAIN do canal e LEVEL do master em posição de trabalho.',
          'Microfone condensador precisa do PHANTOM +48V ligado.',
          'Confira se o fader do canal não está em zero.',
        ],
        origem: 'fabricante',
        fonte: 'Manual Yamaha MG10XU — Troubleshooting',
      },
      {
        s: 'Chiado ou zumbido constante',
        passos: [
          'Baixe o GAIN e compense no LEVEL.',
          'Se o zumbido é de terra, o isolador de sinal entre a Scarlett e a ATEM já resolveu isso aqui.',
          'Afaste cabo de áudio de cabo de energia.',
        ],
        nota: 'O caso do ruído está encerrado nos documentos do time — não reabra o diagnóstico sem sintoma novo.',
        origem: 'interno',
        fonte: 'Descritivo do evento presencial, seção 9',
      },
      {
        s: 'Realimentação quando o computador está ligado por USB',
        passos: [
          'A chave de retorno do USB em "TO ST" fecha um laço com o computador.',
          'Mude a posição da chave e teste de novo.',
        ],
        origem: 'fabricante',
        fonte: 'Manual Yamaha MG10XU',
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  scarlett: {
    nome: 'Focusrite Scarlett 16i16',
    resumo: 'Camada de ganho e volume entre a mesa e a ATEM.',
    sintomas: [
      {
        s: 'Sem áudio pela Scarlett',
        passos: [
          'Confirme que a Scarlett é o dispositivo de entrada e saída selecionado.',
          'Ligue o 48V se o microfone é condensador.',
          'Ajuste o ganho até o LED ficar verde — nunca vermelho.',
        ],
        origem: 'fabricante',
        fonte: 'Focusrite Support',
      },
      {
        s: 'Estalos e cortes no áudio',
        passos: [
          'Use a mesma taxa de amostragem em tudo — 48 kHz para vídeo.',
          'Aumente o buffer para 128–256 amostras no painel ASIO.',
          'Troque a porta USB e evite hub.',
        ],
        origem: 'fabricante',
        fonte: 'Focusrite Support — sample rate e buffer size no Windows',
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  isolador: {
    nome: 'Isolador de sinal',
    resumo: 'Instalado entre a Scarlett e a ATEM.',
    sintomas: [
      {
        s: 'Voltou ruído no caminho da ATEM',
        passos: [
          'Confirme que o isolador continua no caminho, entre a Scarlett e a ATEM.',
          'Reassente as duas pontas.',
          'Se o ruído tem característica diferente da anterior, aí é sintoma novo: registre.',
        ],
        nota: 'Ele foi instalado justamente para isso e o caso está encerrado. Além da diferença de sinal e impedância, reduz estática e interferência eletrônica.',
        origem: 'interno',
        fonte: 'Descritivo do evento presencial, seção 9',
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  'mic-dylan': {
    nome: 'Microfones sem fio Dylan',
    resumo: '2 lapela Pertinence + 2 bastão, nas 4 entradas XLR da mesa.',
    sintomas: [
      {
        s: 'Microfone corta ou chia no meio da fala',
        passos: [
          'Troque a bateria — não use meia carga.',
          'Faça a varredura de frequência antes do evento.',
          'Afaste o receptor de roteador Wi-Fi, metal e concreto.',
          'Deixe receptor e transmissor em linha de visada e reduza a distância.',
        ],
        origem: 'campo',
        fonte: 'Prática de campo (orientação Shure e DJI para sistemas sem fio)',
      },
      {
        s: 'Um microfone funciona e o outro não',
        passos: [
          'Troque os canais entre si — isola microfone com defeito de canal com defeito.',
          'Confira se dois transmissores não estão na mesma frequência.',
          'Confira a bateria do que não funciona antes de trocar o cabo.',
        ],
        origem: 'campo',
        fonte: 'Prática de campo',
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  'lapela-sony': {
    nome: 'Lapela sem fio Sony',
    resumo: 'Duas unidades, no host e no professor, nos formatos de estúdio.',
    sintomas: [
      {
        s: 'Lapela cortando ou com chiado',
        passos: [
          'Troque a bateria.',
          'Refaça a varredura de frequência.',
          'Afaste o receptor de Wi-Fi e de superfície metálica.',
          'Confira o encaixe do cabo da cápsula no transmissor — é onde mais falha.',
        ],
        nota: 'O modelo exato está marcado como "a confirmar" no descritivo do time. Confirmar ajuda a achar o manual certo.',
        origem: 'campo',
        fonte: 'Prática de campo',
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  'sony-a7': {
    nome: 'Câmera Sony A7 III',
    resumo: 'Entra por HDMI. No estúdio são duas: host e professor.',
    sintomas: [
      {
        s: 'Informações da câmera aparecem na imagem',
        passos: [
          'Menu → Setup → HDMI Settings → HDMI Info. Display → Off.',
          'Confirme na TV de retorno antes de começar.',
        ],
        origem: 'fabricante',
        fonte: 'Sony Help Guide ILCE-7M3 — HDMI Info. Display',
      },
      {
        s: 'A câmera desliga sozinha durante a aula',
        passos: [
          'Setup → Auto Power OFF Temp. → High (seguro com a câmera em tripé).',
          'Desligue o início automático de economia de energia.',
          'Alimente por USB em vez de bateria: esquenta menos e não acaba no meio.',
        ],
        origem: 'fabricante',
        fonte: 'Sony — Auto Pwr OFF Temp.; alimentação USB é prática de campo',
      },
      {
        s: 'A imagem some e volta',
        passos: [
          'Reassente o micro HDMI na câmera — é o conector mais frágil da cadeia.',
          'Desative o desligamento automático.',
          'Prenda o cabo com alívio de tração para o peso não puxar o conector.',
        ],
        origem: 'campo',
        fonte: 'Prática de campo',
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  ptz: {
    nome: 'Câmera PTZ 4K',
    resumo: 'Exclusiva do professor, com presets de enquadramento no controlador.',
    sintomas: [
      {
        s: 'A PTZ não responde ao controle',
        passos: [
          'Confira alimentação e o cabo de controle ou de rede.',
          'Verifique se duas câmeras não estão no mesmo endereço RS-485.',
          'Desligue tour, patrulha e auto-cruise — eles assumem o controle.',
          'Confira a configuração de comunicação no controlador.',
        ],
        origem: 'fabricante',
        fonte: 'PTZOptics — Camera Troubleshooting',
      },
      {
        s: 'Os presets sumiram',
        passos: [
          'Reset de fábrica apaga presets: se houve reset, regrave todos.',
          'Regrave e confirme salvando no controlador, não só na câmera.',
          'Anote os presets em papel — recuperar sem referência é lento no meio do evento.',
        ],
        origem: 'fabricante',
        fonte: 'PTZOptics; a nota de anotar é prática de campo',
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  slides: {
    nome: 'Slides por HDMI',
    resumo: 'Splitter com duas saídas: uma no telão, outra na entrada da ATEM.',
    sintomas: [
      {
        s: 'O telão mostra e a ATEM não (ou o contrário)',
        passos: [
          'Duas telas de capacidade diferente no splitter: a fonte pode cair para a menor, ou não sair nada.',
          'Use splitter com alimentação própria e gerenciamento de EDID.',
          'Force 1080p 60 Hz na saída do notebook.',
          'Deixe o cabo entre notebook e splitter curto — a qualidade ali afeta as duas saídas.',
        ],
        origem: 'campo',
        fonte: 'Prática de instalação AV (gerenciamento de EDID em splitters)',
      },
      {
        s: 'O professor não consegue avançar o slide',
        passos: [
          'Na configuração A o notebook é o do operador: o professor não avança sozinho — quem avança é o operador.',
          'Na configuração B o professor opera o próprio notebook na segunda mesa.',
          'Se o combinado era B, mude a fonte do splitter para o notebook do professor.',
        ],
        origem: 'interno',
        fonte: 'Descritivo do evento presencial, seção 6',
      },
      {
        s: 'O vídeo dentro do slide está sem som',
        passos: [
          'Libere um dos 4 canais de microfone da mesa.',
          'Ligue nele a entrada XLR-P2 vinda do notebook da apresentação.',
          'Confira o volume do próprio notebook antes de mexer na mesa.',
        ],
        origem: 'interno',
        fonte: 'Descritivo do evento presencial, seção 3',
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  'slides-zoom': {
    nome: 'Slides compartilhados no Zoom',
    resumo: 'Nos formatos remotos o slide vem pelo compartilhamento de tela do Zoom.',
    sintomas: [
      {
        s: 'O slide chega travado ou picado',
        passos: [
          'Troque Wi-Fi por cabo na máquina que compartilha.',
          'Compartilhe a janela do PowerPoint, não a tela inteira.',
          'Feche abas e aplicativos pesados na máquina do professor.',
          'Peça para desligar a câmera por um instante e veja se o slide destrava — isola banda.',
        ],
        origem: 'fabricante',
        fonte: 'Zoom — desempenho de compartilhamento de tela',
      },
      {
        s: 'O mockup do vMix não combina slide e professor',
        passos: [
          'Confira se o input do compartilhamento está no lugar certo do layout no vMix.',
          'Se a sala do Zoom foi recriada, os inputs perdem o vínculo: refaça.',
        ],
        origem: 'campo',
        fonte: 'Prática de operação; o mockup está descrito nos documentos do time',
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  lw: {
    nome: 'Plataforma da Agroadvance (LW)',
    resumo: 'Onde o aluno assiste: player do Vimeo, ou embed do Zoom na contingência.',
    sintomas: [
      {
        s: 'Aluno com tela preta ou vídeo que não roda',
        passos: [
          'Recarregar a página e aceitar o aviso de cookies — o player precisa deles.',
          'Testar em janela anônima: é o teste que isola configuração do navegador.',
          'Permitir cookies de terceiros no Chrome ou Edge.',
          'No Firefox, deixar a proteção contra rastreamento em Padrão; no Safari, desmarcar "Impedir rastreamento entre sites".',
          'Desativar extensão de antivírus ou bloqueador no navegador.',
          'Rede corporativa pode bloquear vídeo: testar em 4G.',
        ],
        origem: 'fabricante',
        fonte: 'Vimeo Help Center + LearnWorlds Help Center',
      },
      {
        s: 'Um aluno específico não entra de jeito nenhum',
        passos: [
          'Passe os testes de navegador acima primeiro.',
          'Se persistir, envie o link direto do Vimeo para ele assistir a live.',
          'Em último caso, envie o link da sala do Zoom.',
        ],
        nota: 'Esta é a exceção pontual prevista nos documentos do time — não é o caminho padrão.',
        origem: 'interno',
        fonte: 'Descritivo das aulas ao vivo, seção 5',
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  sala: {
    nome: 'Telão e PA do auditório',
    resumo: 'Telão de LED 2 x 1,5 m e PA em duas zonas com volume independente.',
    sintomas: [
      {
        s: 'Parte do auditório não ouve',
        passos: [
          'O PA tem duas zonas, frontal e traseira, com volume independente: confira a traseira.',
          'Confirme que a mesa está enviando para as duas zonas.',
        ],
        origem: 'interno',
        fonte: 'Descritivo do evento presencial, seção 1',
      },
      {
        s: 'Telão apagado ou sem imagem',
        passos: [
          'Confira a saída do splitter dedicada ao telão.',
          'Confira a entrada selecionada no painel do telão.',
          'Teste trocando as duas saídas do splitter entre si.',
        ],
        origem: 'campo',
        fonte: 'Prática de operação',
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  'zoom-embed': {
    nome: 'Embed do Zoom na plataforma',
    resumo: 'Usado na contingência: o aluno entra pelo Zoom embutido na plataforma.',
    sintomas: [
      {
        s: 'O embed não carrega para o aluno',
        passos: [
          'Aceitar cookies e recarregar.',
          'Testar em janela anônima.',
          'Se não carregar, enviar o link da sala do Zoom direto.',
          'Confirmar se a sala não está com sala de espera ativada.',
        ],
        origem: 'campo',
        fonte: 'Prática de operação; o envio do link direto está previsto no descritivo do time',
      },
    ],
  },
};

// símbolos usados na busca e nos rótulos
export const CHAVES_COM_SOLUCAO = Object.keys(SOLUCOES);
