# Descritivo Técnico — Evento Presencial na Sede (Agroadvance)

> Este documento descreve a estrutura física e o fluxo técnico de áudio, vídeo e slides usado nos eventos presenciais realizados no auditório da sede. Destinado a servir de base de contexto para qualquer assistente de IA que for auxiliar na operação, diagnóstico de problemas ou sugestão de melhorias desse formato.

---

## 1. Espaço físico

- Auditório interno com capacidade para aproximadamente 40 a 50 pessoas.
- Telão de LED instalado na frente do auditório, com dimensões aproximadas de 2 metros de largura por 1,5 metro de altura.
- Sistema de PA (som ambiente) dividido em duas zonas com controle de volume independente: zona frontal e zona traseira do auditório.
- Uma segunda mesa posicionada no meio do auditório, de frente para os alunos, disponível para o professor operar seu próprio notebook quando necessário.

## 2. Captação de áudio (voz)

- Dois hubs de microfone sem fio, marca Dylan (potência com aspecto físico similar, possivelmente da mesma marca — a confirmar).
- Quatro microfones no total: dois lapela estilo headset (modelo Pertinence) e dois de bastão (handheld) padrão.
- Os quatro microfones ocupam as quatro entradas XLR disponíveis na mesa de som Yamaha MG10XU.

## 3. Áudio de apresentação (quando aplicável)

- Quando o professor utiliza vídeos ou qualquer conteúdo com áudio embutido na apresentação, um dos quatro canais de microfone da mesa é temporariamente liberado.
- Nesse canal liberado, é conectada uma entrada XLR P2, vinda do notebook que está fazendo a apresentação/compartilhamento de tela.

## 4. Roteamento e controle de áudio

- Da mesa Yamaha MG10XU, o áudio é enviado à interface Focusrite Scarlett 16i16, usada como camada adicional de controle de ganho e volume.
- Da Scarlett, o áudio é enviado à mesa de cortes ATEM Extreme ISO (modelo com 8 entradas de vídeo e 2 canais de áudio independentes).
- Entre a Scarlett e a ATEM há um conversor/isolador de sinal instalado, que resolveu um problema histórico de ruído (ver seção 8).

## 5. Câmeras

- **Câmera PTZ 4K com controladora dedicada:** capta exclusivamente o professor. A controladora possui presets de enquadramento pré-configurados. Entra na ATEM via HDMI.
- **Sony Alpha 7 III:** capta a audiência. Entra na ATEM via HDMI.
- Em situações de exceção, pode-se adicionar uma câmera Sony extra em uma entrada disponível da ATEM — não é parte do fluxo padrão.

## 6. Fluxo de slides e apresentação

Existem duas configurações possíveis, dependendo do professor. Em ambas, o sinal de vídeo do notebook é dividido (duplicador/splitter HDMI) e um dos dois caminhos vai direto, por cabo, a uma das entradas HDMI da ATEM — não é uma placa/ponto de captura separado.

**Configuração A — professor não opera o próprio notebook:**
- Um notebook fica ligado ao lado da mesa de operações, com o PowerPoint/apresentação aberta.
- O duplicador HDMI divide essa saída em dois caminhos: um vai para o telão (visualização dos alunos), o outro vai direto para uma entrada da ATEM, garantindo que os slides apareçam sincronizados no material gravado no momento exato em que o professor os avança.

**Configuração B — professor opera o próprio notebook:**
- O professor senta na segunda mesa, no meio do auditório, de frente para os alunos, e opera seu próprio notebook.
- Um splitter HDMI é usado da mesma forma: uma saída para o telão, outra saída direto para uma entrada da ATEM, mantendo a mesma sincronização de slides com o material gravado.

## 7. Configuração padrão de entradas na ATEM

Das 8 entradas de vídeo disponíveis na ATEM, o uso padrão ocupa 4:
- 1 entrada: slide via Configuração A (notebook do operador)
- 1 entrada: slide via Configuração B (notebook do professor)
- 1 entrada: câmera PTZ 4K (professor)
- 1 entrada: Sony Alpha 7 III (audiência)

A quinta câmera Sony extra (situação de exceção) ocuparia uma das 4 entradas restantes, quando usada.

## 8. Vídeo e backups de gravação

- A captura principal (imagem com áudio sincronizado) é feita através da ATEM Extreme ISO.
- Como backup, o sinal da ATEM também é enviado ao vMix, onde é feita uma gravação adicional.
- Simultaneamente, é realizada uma transmissão ao vivo (live) para o Vimeo, servindo como segundo backup de emergência.
- Ou seja, existem três registros do evento: a gravação principal via ATEM, a gravação backup via vMix, e a live no Vimeo.

## 9. Histórico técnico resolvido

- Havia um problema recorrente de ruído alto ao rotear áudio direto (da mesa Yamaha ou da Scarlett) para a entrada analógica P2 da ATEM.
- O problema foi resolvido com a instalação de um conversor/isolador de sinal entre a Scarlett e a ATEM. Esse equipamento, além de resolver a diferença de sinal/impedância, também reduz estática e interferência eletrônica.
- Esse problema está considerado resolvido — não é necessário reabrir o diagnóstico caso o ruído não reapareça nas mesmas condições anteriores.

## 10. Contexto operacional relevante

- Toda a montagem e operação do evento é feita por uma única pessoa (operador de audiovisual), sem apoio técnico adicional.
- O operador é responsável simultaneamente por: gestão de áudio (mesa, microfones, ganho), gestão de slides/apresentação dos professores, e produção de imagem (cortes, ATEM, gravação, transmissão, incluindo troca entre presets da PTZ e a câmera de audiência).
- Esse acúmulo de funções por uma única pessoa é um ponto relevante para sugestões de simplificação ou automação do processo.
