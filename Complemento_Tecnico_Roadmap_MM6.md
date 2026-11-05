# Complemento técnico ao roadmap — Engine MM6

## Objetivo

Este documento complementa o roadmap apresentado para evoluir o **Save the Christmas Game**. Não substitui o plano principal nem propõe uma reescrita geral. Reúne decisões técnicas que podem reduzir ambiguidades, bugs e retrabalho durante a migração incremental.

**Princípio:** primeiro entender e registrar o comportamento atual; depois extrair as regras de gameplay para uma simulação própria; por fim, integrar essa simulação ao Phaser gradualmente.

---

## 1. Ajuste sobre a referência da TASVideos

A página [TASVideos — GameResources/NES/Rockman](https://tasvideos.org/GameResources/NES/Rockman) não é exclusivamente sobre Rockman 1. Ela reúne materiais de vários jogos da série, incluindo **Mega Man 6**. Há tópicos explicitamente identificados como MM6, por exemplo:

- *Landing on an invisible platform (MM6)*
- *Walking on air (MM6)*
- *Invisible platforms (MM6)*

Entretanto, a seção de dados técnicos chamada **Rockman technical data** apresenta coordenadas de Rockman 1 e Rockman 2 e compara valores de movimento também para Rockman 3 e 4. Esses números não devem ser tratados como parâmetros de Mega Man 6.

Sugiro classificar as informações pesquisadas em três grupos:

1. **Específicas de MM6:** observações identificadas explicitamente como Mega Man 6.
2. **Conceitos gerais:** atualização por quadro, subpixel, colisões e princípios de movimento.
3. **Dados de outros jogos:** valores identificados como Rockman 1, Rockman 2 ou outros títulos. Não reutilizar como constantes de MM6.

Mesmo quando uma observação é específica de MM6, ela pode documentar um glitch ou peculiaridade de TAS, e não necessariamente um comportamento que queremos reproduzir.

Referências:
- [TASVideos — Game Resources: Rockman](https://tasvideos.org/GameResources/NES/Rockman)
- [TASVideos — Mega Man 6](https://tasvideos.org/Games/72)
- [TASVideos — Rockman technical data](https://tasvideos.org/GameResources/NES/Rockman/Data)

---

## 2. Entrada por quadro: criar `MM6InputFrame`

A simulação deve receber uma representação clara dos controles para cada quadro. É importante distinguir:

- **Pressed:** o botão começou a ser pressionado neste quadro.
- **Held:** o botão continua pressionado.
- **Released:** o botão foi solto neste quadro.

Exemplo conceitual:

```ts
type MM6Button = 'left' | 'right' | 'up' | 'down' | 'jump' | 'attack';

interface MM6InputEvent {
  button: MM6Button;
  type: 'pressed' | 'released';
}

interface MM6InputFrame {
  held: Readonly<Record<MM6Button, boolean>>;
  events: readonly MM6InputEvent[];
}
```

O contrato real deve refletir os controles do jogo. A distinção importa porque algumas ações dependem do instante em que o botão foi pressionado, não apenas de ele continuar pressionado.

**Recomendação:** o adaptador Phaser coleta os eventos físicos e prepara a entrada para o próximo quadro da simulação. A simulação recebe esse estado sem consultar diretamente teclado, mouse ou controles do Phaser.

### Buffer de eventos entre passos da simulação

Um toque pode começar e terminar entre dois passos fixos. Se o adaptador apenas consultar o estado atual do botão no instante do passo, esse toque desaparece. Para evitar isso:

- Manter o estado `Held` atualizado separadamente.
- Enfileirar transições `Pressed` e `Released` ocorridas entre passos.
- No próximo passo, entregar à simulação os eventos pendentes na ordem em que ocorreram, junto com o estado `Held` atual.
- Esvaziar os eventos consumidos; definir explicitamente como pausa e perda de foco tratam entradas pendentes, para que ações antigas não sejam disparadas ao retomar.

Assim, um toque curto continua observável mesmo que pressão e soltura ocorram antes do próximo passo, e múltiplas transições do mesmo botão mantêm sua ordem. O estado `Held` representa a situação atual do controle quando o passo é executado.

---

## 3. Determinismo: ordem de atualização e aleatoriedade

A condição “mesmo estado inicial + mesma sequência de entradas = mesmo resultado” está correta. Para torná-la confiável, também precisamos definir:

### Ordem fixa de atualização

Uma ordem inicial possível:

1. Consumir o `MM6InputFrame`.
2. Atualizar estado e intenção de movimento do jogador.
3. Aplicar movimento e resolver colisões com o cenário.
4. Atualizar inimigos.
5. Atualizar projéteis.
6. Detectar contatos e ataques.
7. Resolver dano, recuo e temporizadores.
8. Atualizar eventos e gatilhos da fase.
9. Publicar o estado final para renderização.

Essa ordem é uma proposta, não uma regra universal. O importante é ser deliberada, documentada e coberta por testes.

### Aleatoriedade reproduzível

Se inimigos ou eventos usarem aleatoriedade, utilizar um gerador pseudoaleatório com seed definida, em vez de depender de chamadas aleatórias sem controle. Isso permite repetir uma sequência durante testes e depuração.

---

## 4. Passo fixo sem acoplar simulação ao render

A proposta de 60 atualizações por segundo é um bom ponto de partida.

- **Simulação:** avança em passos fixos.
- **Renderização:** desenha o estado mais recente e pode acontecer em outra frequência.

A implementação precisa definir o que ocorre quando a aba fica em segundo plano, o usuário retorna após uma pausa longa, o jogo é pausado ou o navegador sofre uma queda de desempenho. Não basta limitar o `delta` ou descartar passos acumulados sem decidir o efeito disso sobre a simulação.

Se houver interpolação entre estados para suavizar a renderização, ela deve afetar apenas a apresentação. O valor interpolado não deve voltar à simulação nem alterar posições usadas em colisões.

---

## 5. Fixed Point: opção técnica, não requisito inicial

A proposta anterior mencionava coordenadas em **8.8 Fixed Point**, com 256 unidades internas equivalendo a um pixel. Isso pode ajudar a controlar subpixel e arredondamento, mas eu não tornaria essa representação obrigatória antes de termos uma simulação funcionando.

Sequência sugerida:

1. Implementar o passo fixo.
2. Definir unidade e precisão de posição, velocidade e aceleração.
3. Testar movimento e colisão.
4. Verificar se há problemas reais de precisão ou arredondamento.
5. Só então decidir se vale adotar Fixed Point.

Podemos começar com `number` no TypeScript, desde que os cálculos sejam consistentes e os arredondamentos aconteçam em pontos definidos. Se Fixed Point for adotado depois, encapsular as conversões em utilitários.

**Importante:** 8.8 é uma opção proposta para este projeto; não é uma afirmação sobre o formato numérico interno de Mega Man 6.

---

## 6. Colisão: uma autoridade para o jogador

O roadmap corretamente alerta para não deixar Matter e a nova simulação controlarem o jogador ao mesmo tempo.

> Para cada entidade, deve existir uma única autoridade sobre sua posição e seu movimento em cada momento da simulação.

Se o jogador passar a usar colisão própria, Matter não deve também alterar sua posição ou velocidade. Isso pode causar correções duplicadas, oscilações e resultados difíceis de reproduzir.

É possível manter Matter para sistemas existentes, desde que a fronteira seja clara:

- A simulação MM6 controla posição e movimento do jogador.
- Matter continua atendendo sistemas que ainda dependem dele.
- Um adaptador ou contrato comunica os contatos relevantes entre os dois sistemas.
- Nenhum dos sistemas sobrescreve silenciosamente a posição do jogador.

Antes de remover qualquer plugin, mapear todos os seus consumidores.

### Resolução por eixo

Uma sequência recomendada:

1. Calcular o deslocamento horizontal pretendido.
2. Verificar tiles próximos e resolver contato com paredes.
3. Aplicar o deslocamento horizontal válido.
4. Calcular o deslocamento vertical pretendido.
5. Verificar tiles acima e abaixo.
6. Resolver teto e chão, atualizando a velocidade vertical.
7. Atualizar o estado de contato com o chão.

A implementação precisa considerar hitbox, limites dos tiles e direção do movimento. Uma verificação simples de “posição bloqueada” não resolve todos os casos de canto e sobreposição.

---

## 7. Separar sprite, hitbox e colisão do cenário

Três conceitos devem permanecer independentes:

- **Sprite:** imagem e animação apresentadas na tela.
- **Hitbox:** área usada para contatos entre entidades, ataques e dano.
- **Colisão do cenário:** área usada para resolver contato com tiles sólidos.

Essas dimensões podem coincidir, mas não devem ser acopladas automaticamente. A arte pode mudar sem alterar a física; a hitbox de dano pode ser diferente da caixa usada para impedir o jogador de atravessar paredes.

A camada visual do mapa também não deve ser a única fonte implícita das regras de colisão. Os dados podem ser compartilhados, mas o significado de cada tile deve estar explícito.

---

## 8. Adaptador Phaser: fronteira entre apresentação e simulação

A pasta `adapters/` do roadmap é importante. Ela deve concentrar a comunicação entre Phaser e simulação.

Responsabilidades sugeridas:

- Converter entrada do Phaser em `MM6InputFrame`.
- Chamar a atualização da simulação.
- Enviar o estado resultante para sprites e animações.
- Atualizar câmera e elementos visuais com base no estado publicado.
- Encaminhar sons, partículas e efeitos visuais gerados por eventos de gameplay.

A simulação não deve precisar conhecer `Phaser.Scene`, `Phaser.GameObjects.Sprite` ou APIs de teclado para decidir uma regra de movimento.

Uma animação também não deve ser a autoridade de uma regra crítica. Por exemplo, a animação de aterrissagem pode solicitar uma transição, mas a colisão com o chão deve determinar se o personagem realmente aterrissou.

---

## 9. Testes adicionais

Além dos testes previstos no roadmap, incluiria:

### Entrada
- Um toque curto de pulo gera um único evento `Pressed`.
- Manter o botão pressionado não gera novos eventos `Pressed`.
- Soltar o botão gera `Released`.
- Uma pressão e soltura ocorridas entre dois passos são entregues, em ordem, no próximo passo.
- Múltiplas transições antes de um passo não são perdidas nem reordenadas.
- Pausa e perda de foco seguem a política definida para entradas pendentes.

### Simulação
- A ordem de atualização é estável.
- A mesma seed e sequência de entrada reproduzem o mesmo resultado.
- Pausar e retomar segue a política definida.
- A simulação não depende da frequência de renderização.

### Colisão
- O jogador não atravessa paredes ou chão.
- A posição final respeita os limites dos tiles.
- Permanecer no chão não provoca oscilações.
- Colisão de teto não deixa velocidade vertical incorreta.
- A hitbox permanece independente do tamanho do sprite.

### Regressão
- A fase escolhida na etapa 0 continua jogável.
- Câmera, transições, áudio e eventos existentes continuam funcionando.
- Comportamentos da linha de base não são perdidos sem uma decisão explícita.

---

## 10. Organização sugerida

A estrutura principal do roadmap pode ser detalhada aos poucos:

```text
src/
├── mm6/
│   ├── core/
│   │   ├── MM6GameLoop.ts
│   │   └── MM6Simulation.ts
│   ├── engine/
│   │   ├── input/
│   │   │   └── MM6InputFrame.ts
│   │   ├── physics/
│   │   ├── collision/
│   │   └── math/
│   ├── entities/
│   │   ├── player/
│   │   ├── enemies/
│   │   └── projectiles/
│   ├── systems/
│   │   ├── MM6CombatSystem.ts
│   │   └── MM6DamageSystem.ts
│   └── adapters/
│       └── Phaser/
└── ...
tests/
└── mm6/
    ├── input/
    ├── simulation/
    ├── physics/
    ├── collision/
    └── gameplay/
```

Os nomes são ilustrativos. Não é necessário criar todas as pastas na primeira etapa. A estrutura deve crescer quando houver responsabilidades reais para separar.

O prefixo `MM6` identifica o domínio da engine inspirada em Mega Man 6; não afirma que o código reproduz a implementação original do NES.

---

## 11. O que eu não faria agora

Para evitar trabalho prematuro, não começaria por:

- Reescrever todas as cenas.
- Remover Matter antes de mapear suas dependências.
- Introduzir ECS ou outra arquitetura complexa sem necessidade comprovada.
- Converter todo o projeto para Fixed Point antes de medir a necessidade.
- Implementar glitches de TAS só porque estão documentados.
- Ajustar velocidade, gravidade ou pulo com números de Rockman 1.
- Migrar todas as fases antes de validar uma fase curta de ponta a ponta.

---

## 12. Como complementar cada etapa do roadmap

| Etapa do roadmap | Complemento sugerido |
|---|---|
| 0. Levantamento | Registrar entrada, movimento, hitboxes, ordem atual dos sistemas e comportamento de uma fase de referência |
| 1. Simulação | Criar `MM6InputFrame`, definir ordem de atualização e política de pausa/retomada |
| 2. Movimento | Garantir que os estados dependam das regras de gameplay, não das animações |
| 3. Colisão | Definir hitboxes, colisão por eixo e autoridade única sobre o jogador |
| 4. Integração | Criar adaptador Phaser e desenhar claramente a fronteira com Matter |
| 5. Combate | Definir ordem de atualização de entidades e resolução de acertos |
| 6. Expansão | Usar testes de regressão e migrar uma fase por vez |

### Próximo passo prático

Antes de implementar a nova física, criar uma pequena linha de base da fase escolhida, registrando:

- Controles aceitos e resposta observada.
- Velocidade horizontal observada.
- Altura e duração aproximadas do pulo.
- Comportamento ao soltar o botão de pulo, se aplicável.
- Resposta a chão, teto e paredes.
- Resposta ao dano e ao recuo.
- Dimensões aproximadas das hitboxes.
- Comportamento da câmera.

Identificar cada informação como **observada no projeto atual**, **medida em referência externa** ou **valor provisório de design**. Não misturar essas categorias.

---

## Conclusão

O roadmap principal já oferece uma boa sequência de implementação. Estas sugestões procuram reduzir ambiguidades técnicas antes que elas se transformem em bugs ou retrabalho.

As decisões mais importantes são:

1. Representar entrada por quadro de forma explícita.
2. Manter uma ordem de simulação estável e aleatoriedade reproduzível.
3. Tratar Fixed Point como uma decisão baseada em necessidade, não como requisito inicial.
4. Garantir uma única autoridade sobre o movimento e a posição do jogador.
5. Criar uma fronteira clara entre a simulação própria e o Phaser.
6. Validar tudo em uma fase curta antes de expandir.

**Recomendação:** adotar o roadmap do seu amigo como plano principal e usar este documento como complemento técnico, especialmente para as etapas 0 a 4.

---

**Confiança:** alta nas recomendações de arquitetura e engenharia de software. A página geral de recursos da TASVideos contém tópicos explicitamente identificados como MM6, enquanto a seção de dados técnicos consultada não fornece os valores apresentados como constantes específicas de MM6. Parâmetros numéricos do jogo ainda precisam ser verificados em fontes próprias antes de serem adotados.
