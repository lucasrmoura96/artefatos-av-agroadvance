# Artefato de Operação — Evento Presencial na Sede (Agroadvance)

> Este artefato serve para três usos: (1) dar contexto rápido sobre a estrutura técnica sem precisar reexplicar do zero, (2) apoiar diagnóstico de problemas novos que surgirem em evento, e (3) servir de espaço de brainstorm para simplificar a operação, hoje concentrada em uma única pessoa. Pode ser usado por Matheus ou por qualquer outro membro da equipe, conversando com uma IA a partir deste documento.

---

## 1. Estrutura fixa

**Espaço:** auditório interno, 40 a 50 pessoas, telão de LED (~2m x 1,5m), sistema de PA dividido em zona frontal e traseira com volumes independentes.

**Áudio (voz):** 2 hubs de microfone sem fio Dylan — 2 lapela (modelo Pertinence) + 2 bastão — ocupando as 4 entradas XLR da mesa Yamaha MG10XU. Quando a apresentação tem áudio embutido (vídeo), um canal de microfone é trocado por uma entrada XLR P2 vinda do notebook da apresentação.

**Roteamento de áudio:** Yamaha MG10XU → Focusrite Scarlett 16i16 (controle adicional de ganho/volume) → conversor/isolador de sinal → ATEM Extreme ISO (8 entradas de vídeo, 2 canais de áudio independentes).

**Câmeras:** PTZ 4K com controladora e presets (exclusiva do professor) + Sony Alpha 7 III (audiência), ambas via HDMI na ATEM. Câmera Sony extra apenas em situações de exceção.

**Slides:** duplicador/splitter HDMI sempre com duas saídas — uma para o telão, outra direto para uma entrada da ATEM. Duas configurações possíveis: (A) notebook do operador, para professores que não mexem no computador; (B) notebook do próprio professor, na segunda mesa no meio do auditório.

**Uso padrão das 8 entradas da ATEM:** 4 ocupadas (slide A, slide B, PTZ, Sony audiência) — 4 disponíveis para exceções.

**Gravação e backups:** captura principal via ATEM → backup de gravação no vMix → live simultânea no Vimeo como segundo backup.

**Operação:** montagem e operação inteiramente feitas por uma única pessoa — áudio, slides, câmeras e cortes simultaneamente.

*(Descritivo completo com mais contexto disponível em documento separado: descritivo-evento-presencial-sede)*

---

## 2. Histórico resolvido — não reabrir sem motivo novo

- **Ruído ao rotear áudio para a ATEM:** resolvido com instalação de conversor/isolador de sinal entre a Scarlett e a ATEM. Além de corrigir a diferença de sinal/impedância, também reduz estática e interferência eletrônica. Considerar este problema encerrado, a menos que o ruído volte em condições diferentes das anteriores.

---

## 3. Diagnóstico de problema novo

Ao usar esta seção, descreva:
- O sintoma exato (o que aconteceu, em que ponto do evento)
- Em qual parte da cadeia parece estar (áudio, vídeo/câmera, slides, transmissão)
- O que já foi tentado, se algo

A IA deve usar a seção 1 (estrutura fixa) e a seção 2 (histórico resolvido) como contexto para não repetir diagnósticos já descartados, e ajudar a isolar a causa mais provável dentro da cadeia descrita.

---

## 4. Simplificação operacional

Espaço para discutir formas de reduzir a carga de operar sozinho áudio, slides, câmeras e cortes ao mesmo tempo. Não é sobre estética de câmera ou enquadramento (a PTZ já resolve presets de enquadramento) — é sobre o processo e a forma de operacionalizar como um todo.

Pontos de partida para essa discussão:
- Onde há repetição de esforço manual que poderia ser automatizado ou pré-configurado
- Onde a dependência de decisões em tempo real (troca de canal, splitter, corte entre câmeras) poderia ser reduzida
- Se algum equipamento ou configuração adicional reduziria a carga cognitiva do operador durante o evento
