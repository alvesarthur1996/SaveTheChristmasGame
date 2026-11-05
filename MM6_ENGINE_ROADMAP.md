# Roadmap — Engine de plataforma inspirada em Mega Man

## Visão

Evoluir o **Save the Christmas Game** para uma base de plataforma 2D mais previsível, fácil de testar e de expandir, mantendo Phaser como framework de apresentação.

**Princípio da arquitetura:** Phaser desenha o jogo e integra cenas, câmera, áudio e entrada. Uma camada própria de gameplay decide movimento, colisão, estados e regras de combate.

O objetivo é alcançar uma jogabilidade com sensação de Mega Man. Este projeto **não pretende emular o NES nem reproduzir exatamente Mega Man 6**.

## Ponto de partida

- O projeto já usa Phaser 3, TypeScript e Vite.
- Há cenas de menu e fases, controladores de jogo e personagem, uma máquina de estados e plugins de Matter e tiles animados.
- A configuração atual usa Matter como física padrão.
- Não encontramos testes automatizados no repositório durante o levantamento inicial.
- A página geral de recursos de Rockman da TASVideos reúne tópicos de vários jogos, inclusive observações marcadas como MM6. Já a seção **Rockman technical data** descreve coordenadas e valores de Rockman 1 e 2, com comparações de movimento para Rockman 3 e 4; esses números não devem ser usados como constantes do MM6.

> A primeira etapa é mapear o comportamento atual. Não vamos remover Matter, reorganizar todas as cenas ou substituir sistemas sem confirmar suas dependências.

## Roadmap por etapas

### 0. Levantamento e linha de base

**Objetivo:** entender o jogo que já existe e definir o que não pode regredir.

- Mapear cenas, fases, entrada, jogador, colisões, inimigos, eventos e dependências de física.
- Registrar como iniciar, construir e testar o projeto.
- Escolher uma fase ou trecho curto para servir de cenário de validação.
- Gravar referências de comportamento: velocidade, altura e duração do pulo, resposta ao dano e limites da câmera.

**Entregável:** mapa dos sistemas atuais e checklist de comportamentos a preservar.

**Concluído quando:** a equipe consegue identificar onde cada comportamento é implementado e reproduzir o trecho escolhido.

### 1. Base testável da simulação

**Objetivo:** separar regras de gameplay da dependência direta de sprites e cenas Phaser.

- Definir contratos TypeScript para entrada, estado do jogador, mundo e resultado de cada atualização.
- Criar uma atualização de gameplay com passo fixo de 60 quadros por segundo, coordenada pelo ciclo de atualização do Phaser.
- Definir uma política explícita para pausas, troca de aba e limite de atualizações acumuladas.
- Adicionar a infraestrutura de testes adequada ao projeto e testar a simulação sem abrir o navegador.

**Entregável:** núcleo mínimo de simulação e testes reproduzíveis.

**Concluído quando:** a mesma sequência de entradas, aplicada ao mesmo estado inicial, produz o mesmo resultado nos testes.

### 2. Movimento e estados do jogador

**Objetivo:** tornar o controle do personagem explícito e ajustável.

- Modelar estados necessários, começando por parado, andando, subindo, caindo, recebendo dano e morto.
- Centralizar velocidades e parâmetros de movimento em configuração, sem espalhar constantes pelo código.
- Implementar movimento horizontal, pulo, gravidade e limites de velocidade no núcleo da simulação.
- Manter a leitura do teclado/controle e a reprodução das animações no adaptador Phaser.

**Entregável:** jogador controlável com regras independentes da animação.

**Concluído quando:** testes cobrem transições importantes e os parâmetros podem ser ajustados sem alterar cenas ou sprites.

### 3. Colisão do cenário

**Objetivo:** obter colisões consistentes e fáceis de depurar.

- Definir hitbox do jogador independente do tamanho do sprite.
- Separar a colisão lógica da camada visual do mapa.
- Resolver deslocamentos horizontal e vertical separadamente.
- Cobrir chão, teto, paredes e detecção de contato com o chão.
- Adicionar plataformas unidirecionais, escadas e perigos somente quando a fase de validação exigir.

**Entregável:** colisão por tiles integrada ao trecho escolhido.

**Concluído quando:** o personagem não atravessa tiles sólidos, encosta nos limites esperados e não apresenta oscilações ao permanecer no chão.

### 4. Integração gradual com Phaser e fases existentes

**Objetivo:** conectar o núcleo à apresentação sem uma reescrita geral.

- Criar um adaptador para enviar entrada à simulação e aplicar o estado resultante aos sprites.
- Integrar primeiro uma fase curta, mantendo cenas, assets, câmera e eventos que já funcionam.
- Evitar que Matter e a nova simulação controlem simultaneamente o jogador.
- Manter Matter para sistemas que ainda dependam dele, após verificar cada uso.
- Adicionar ferramentas visuais de depuração para hitbox, tiles e estado do personagem.

**Entregável:** trecho jogável com a nova base e apresentação Phaser.

**Concluído quando:** o trecho continua iniciando e funcionando, sem regressões nos comportamentos definidos na etapa 0.

### 5. Combate e entidades

**Objetivo:** expandir a arquitetura além do movimento do jogador.

- Extrair projéteis, inimigos e dano para regras testáveis.
- Definir ordem explícita para atualizar entidades e resolver acertos.
- Implementar, conforme necessário, recuo, invulnerabilidade temporária, vida e derrota.
- Integrar HUD, eventos e animações sem tornar a apresentação responsável pelas regras.

**Entregável:** combate funcional na fase de validação.

**Concluído quando:** testes verificam disparos, acertos, dano e temporizadores principais; a fase permanece jogável.

### 6. Expansão, ajuste e estabilização

**Objetivo:** aplicar a base às demais fases e aproximar a sensação desejada.

- Migrar uma fase por vez, mantendo o jogo executável entre migrações.
- Ajustar movimento e colisões com playtests e referências confiáveis.
- Distinguir claramente valores medidos de valores provisórios.
- Remover sistemas antigos apenas depois de confirmar que não há consumidores restantes.
- Documentar decisões e convenções da engine para facilitar novas contribuições.

**Entregável:** fases migradas e parâmetros de gameplay documentados.

**Concluído quando:** os trechos migrados passam pelos testes e pelo checklist de regressão.

## Organização sugerida

Introduzir a nova estrutura aos poucos, sem mover tudo na primeira etapa:

```text
src/
  mm6/
    core/         # ciclo e coordenação da simulação
    engine/       # entrada, movimento e colisão
    entities/     # jogador, inimigos e projéteis
    systems/      # combate, dano e regras de fase
    adapters/     # integração entre simulação e Phaser
tests/
  mm6/            # testes de movimento, colisão e gameplay
```

Os nomes são uma proposta de organização. O prefixo `MM6` indica o domínio inspirado em Mega Man 6; não afirma que a implementação reproduz o código original.

## Critérios de sucesso do projeto

- O jogo continua compilando e executável durante a migração.
- A simulação produz resultados repetíveis para a mesma entrada por quadro.
- Movimento e colisão principais têm testes automatizados.
- A física do jogador tem uma única autoridade.
- É possível ajustar parâmetros sem reescrever cenas ou animações.
- Cada fase é migrada e validada individualmente.

## Riscos e como reduzir

| Risco | Como reduzir |
|---|---|
| Reescrita grande interromper o desenvolvimento | Migrar primeiro um trecho curto e manter uma versão jogável a cada etapa |
| Matter e a nova física entrarem em conflito | Definir um único sistema responsável pelo jogador e mapear os usos atuais antes de remover qualquer plugin |
| Parâmetros serem tratados como dados originais do MM6 | Marcar valores iniciais como provisórios e validá-los com referências específicas |
| A arquitetura ficar maior que o jogo | Começar com classes e sistemas pequenos; adicionar abstrações apenas quando houver necessidade real |
| Mudanças quebrarem fases existentes | Usar checklist de regressão e integrar uma fase por vez |

## Próximo passo recomendado

Fazer o levantamento da etapa 0 e escolher **um trecho pequeno de uma fase existente**. Em seguida, implementar um protótipo vertical com entrada, movimento, pulo e colisão — antes de migrar combate, inimigos ou todas as cenas.

## Referências

- Proposta técnica do repositório: [MM6_Engine_Proposal.md](./MM6_Engine_Proposal.md)
- Dados técnicos de Rockman 1 na TASVideos: https://tasvideos.org/GameResources/NES/Rockman/Data
