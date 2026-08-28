# Descritivo Técnico — Aulas ao Vivo (Agroadvance)

> Este documento descreve o funcionamento e a estrutura técnica das aulas ao vivo da Agroadvance, cobrindo os três formatos de transmissão existentes. Destinado a servir de base de contexto para qualquer assistente de IA que for auxiliar na operação, diagnóstico de problemas ou sugestão de melhorias desses formatos.

---

## 1. Formatos de condução de aula

Existem dois modelos de condução de aula, independentes do formato técnico de transmissão:

**Aula convencional:**
- Abertura feita pelo host: apresentação do professor e recados gerais (ex: pesquisa de satisfação, instruções sobre dúvidas via chat).
- Professor discorre conteúdo por aproximadamente 1 hora.
- Intervalo de 10 minutos.
- Professor discorre mais conteúdo por aproximadamente 1 hora.
- Segundo intervalo de 10 minutos.
- Tempo restante dedicado à resolução de dúvidas dos alunos.

**Aula de cases (exclusiva do formato só-Zoom):**
- Todos os alunos e o professor entram na sala.
- Professor apresenta estudos de caso.
- Alunos são divididos em grupos, usando as salas de grupo (breakout rooms) do Zoom, para discutir e resolver o problema/situação proposta.
- Ao final, cada grupo apresenta a solução encontrada.

---

## 2. Formato técnico 1 — Presencial em estúdio

- Duas câmeras Sony Alpha 7 III: uma focada no host, uma focada no professor.
- Um notebook com PowerPoint conectado via HDMI, para exibição dos slides.
- As duas câmeras e o sinal de slides entram na ATEM.
- A ATEM devolve um retorno visual (geralmente só dos slides) para uma TV dentro do estúdio, para que professor e host consigam se localizar.
- Áudio: dois microfones lapela sem fio Sony (modelo específico ainda a confirmar).
- A ATEM grava localmente em SSD, através de sua própria entrada USB-C.
- Da ATEM, o sinal sai via USB para um notebook na ilha de operação, que alimenta o vMix.
- Do vMix saem: uma transmissão ao vivo, uma gravação backup, além da gravação SSD feita pela própria ATEM.
- Segue para o Vimeo, e do Vimeo para a plataforma de ensino da Agroadvance (sistema LW).

---

## 3. Formato técnico 2 — Híbrido (Zoom + vMix)

- Aula remota: o professor não vai ao estúdio.
- Participam da sala de Zoom: o professor, o host, e o responsável pelo audiovisual (geralmente pessoas diferentes entre host e audiovisual, embora ocasionalmente possam coincidir).
- Usa-se o plugin do Zoom para vMix, trazendo as câmeras do professor e do host como inputs diretamente dentro do vMix.
- Dentro do vMix, aplica-se o mockup/padrão visual da Agroadvance para combinar a imagem do professor com os slides.
- Não há ATEM neste formato, portanto não há gravação SSD equivalente.
- O restante do fluxo é igual ao presencial: vMix → Vimeo → plataforma (via LW).

---

## 4. Formato técnico 3 — Somente Zoom

Este formato tem dois usos:

**3a. Contingência do híbrido:**
- Usado em casos de exceção: internet instável (professor, host ou audiovisual), problemas no vMix, ou limite de lives simultâneas atingido no Vimeo.
- Não passa por vMix nem Vimeo — é embedado diretamente do Zoom na plataforma da Agroadvance (via LW).
- Não é o formato padrão para aulas convencionais — só usado quando o híbrido não é viável.

**3b. Aulas de cases:**
- Formato usado especificamente para aulas de estudo de caso com divisão em grupos (ver seção 1).
- Também embedado direto do Zoom na plataforma, sem vMix nem Vimeo.

---

## 5. Acesso dos alunos

- Em todos os três formatos, os alunos normalmente acessam a aula através da plataforma de ensino da Agroadvance (sistema LW), e não diretamente pelo aplicativo ou navegador do Zoom.
- Na plataforma, o acesso ocorre via player que recebe a transmissão do Vimeo (formatos presencial e híbrido) ou via embed direto do Zoom (formato somente Zoom, tanto contingência quanto cases).
- Exceção pontual: se um aluno específico tiver problema individual com a plataforma (navegador, etc.), pode-se enviar diretamente o link do Vimeo (para assistir a live direto) ou, em casos de resolução de problemas, o link direto da sala do Zoom.

---

## 6. Resumo comparativo rápido

| Aspecto | Presencial estúdio | Híbrido | Somente Zoom |
|---|---|---|---|
| Local do professor | Estúdio | Remoto | Remoto |
| ATEM envolvida | Sim | Não | Não |
| vMix envolvido | Sim | Sim | Não |
| Vimeo envolvido | Sim | Sim | Não |
| Gravação SSD própria | Sim (via ATEM) | Não | Não |
| Acesso do aluno | Plataforma -> Vimeo | Plataforma -> Vimeo | Plataforma -> embed Zoom |
| Uso típico | Padrão quando professor está fisicamente no estúdio | Padrão para aulas remotas | Contingência do híbrido, ou cases |
