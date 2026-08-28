# Artefato de Operação — Aulas ao Vivo (Agroadvance)

> Este artefato serve para três usos: (1) dar contexto rápido sobre os três formatos técnicos de aula ao vivo sem precisar reexplicar do zero, (2) apoiar diagnóstico de problemas novos, e (3) servir de espaço de brainstorm para simplificar a operação. Pode ser usado por Matheus ou por qualquer outro membro da equipe, conversando com uma IA a partir deste documento.

---

## 1. Estrutura fixa

**Modelos de condução de aula:**
- **Convencional:** host abre e apresenta o professor, bloco de conteúdo (~1h), intervalo (10min), segundo bloco de conteúdo (~1h), intervalo (10min), tempo restante para dúvidas.
- **Cases (só formato Zoom):** professor apresenta estudos de caso, alunos divididos em grupos via breakout rooms do Zoom, apresentação das soluções ao final.

**Três formatos técnicos de transmissão:**

| | Presencial estúdio | Híbrido | Somente Zoom |
|---|---|---|---|
| Professor | No estúdio | Remoto | Remoto |
| Câmeras | 2x Sony A7III (host + professor) | Câmeras via Zoom + plugin vMix | Câmeras nativas do Zoom |
| ATEM | Sim, com retorno visual para TV do estúdio e gravação SSD própria (USB-C) | Não usada | Não usada |
| vMix | Sim (recebe da ATEM via USB) | Sim (via plugin Zoom + mockup visual) | Não usado |
| Vimeo | Sim | Sim | Não usado |
| Saída para aluno | Plataforma Agroadvance (LW) recebendo Vimeo | Plataforma (LW) recebendo Vimeo | Embed direto do Zoom na plataforma (LW) |
| Áudio | 2x lapela sem fio Sony (modelo a confirmar) | Áudio nativo do Zoom | Áudio nativo do Zoom |
| Quando é usado | Padrão quando professor está fisicamente presente | Padrão para aula remota convencional | Contingência do híbrido (internet instável, limite de lives no Vimeo) OU aulas de cases |

**Acesso do aluno:** por padrão, todos os formatos são acessados via plataforma da Agroadvance (LW) — raramente direto pelo Zoom. Exceção pontual: problema individual de um aluno com a plataforma pode levar ao envio direto do link do Vimeo ou do link da sala do Zoom.

*(Descritivo completo com mais contexto disponível em documento separado: descritivo-aulas-ao-vivo)*

---

## 2. Histórico resolvido — não reabrir sem motivo novo

*(Seção reservada — nenhum problema recorrente documentado ainda para este conjunto de formatos. Preencher conforme diagnósticos forem confirmados/descartados na seção 3.)*

---

## 3. Diagnóstico de problema novo

Ao usar esta seção, descreva:
- Qual dos três formatos técnicos estava em uso (presencial estúdio / híbrido / somente Zoom)
- O sintoma exato (o que aconteceu, em que ponto da aula)
- Em qual parte da cadeia parece estar (câmera, áudio, ATEM, vMix, Vimeo, plataforma/LW, Zoom)
- O que já foi tentado, se algo

A IA deve usar a seção 1 (estrutura fixa) para identificar rapidamente qual formato está em jogo e isolar a causa dentro da cadeia específica daquele formato — evitando, por exemplo, investigar a ATEM num problema que ocorreu no formato híbrido, onde ela nem está em uso.

---

## 4. Simplificação operacional

Espaço para discutir formas de reduzir a carga operacional ou o risco de falha nos três formatos de aula ao vivo.

Pontos de partida para essa discussão:
- Onde há repetição de esforço manual entre os três formatos que poderia ser padronizada ou automatizada
- Se a decisão de qual formato usar (presencial vs. híbrido vs. contingência Zoom) poderia ter critérios mais claros e antecipados, reduzindo decisões de última hora
- Onde a limitação técnica (ex: limite de lives simultâneas no Vimeo) impõe reestruturação do fluxo, e se há alternativa
