# Plano de evolução do ComfortStudy

Este plano acompanha as oito etapas combinadas. Os recursos existentes foram preservados e as atualizações desta rodada foram feitas na pasta oficial do projeto.

## Etapa 1 — Responsividade e rolagem

**Implementada; validação estática concluída.** Modais de tarefas, provas, matérias e revisões rolam dentro da tela, respeitam as áreas seguras, bloqueiam a rolagem do fundo e ficam acima do menu do celular. Campos, caixas de seleção, botões e anexos se ajustam a telas estreitas. Cadastro e recuperação de senha também se adaptam a telas baixas.

## Etapa 2 — Estabilidade e preservação

**Revisão de código concluída; fluxo autenticado aguardando validação manual.** Login, cadastro, recuperação, Firebase, calendário, tarefas, provas, avisos, cronômetro, desempenho e perfil foram conferidos. A sincronização agora mantém uma fila local de alterações feitas sem conexão e tenta enviá-las quando a rede volta. Anexos aceitam apenas PDF e formatos de imagem permitidos; links restaurados de backup são validados antes de abrir.

## Etapa 3 — Caderno digital

**Implementada.** Anotações continuam organizadas por matéria e podem ter tópico, título, texto, marcador de importância e arquivos PDF/foto. A busca geral inclui matérias e anotações, além das buscas específicas. Anotações podem ser editadas, revistas e anexadas.

## Etapa 4 — Revisão e prática

**Implementada.** Flashcards e revisão espaçada existentes foram mantidos. O banco de questões aceita perguntas objetivas com quatro alternativas, monta simulados aleatórios, corrige respostas, mostra os assuntos abaixo de 70% e guarda o histórico sincronizado. Respostas erradas viram flashcards com a alternativa correta e entram nos intervalos de revisão.

## Etapa 5 — Planejamento inteligente

**Implementada.** Grade de aulas, agenda, plano baseado em provas, metas e sugestões de horários existentes foram mantidos. O plano rápido monta blocos de estudo conforme o tempo escolhido, priorizando prazos, provas, revisões e matérias a reforçar. Os lembretes de tarefas, provas e revisões podem ser ajustados por antecedência.

## Etapa 6 — Desempenho e motivação

**Implementada.** Relatórios e sequência de estudo existentes foram mantidos. O painel mostra tempo por matéria, média dos simulados, progresso semanal e conquistas pessoais sem ranking.

## Etapa 7 — Sincronização e modo offline

**Código integrado; ativação e teste remoto pendentes.** Dados e referências de anexos são sincronizados por conta. Fotos e PDFs podem ser enviados ao Firebase Storage e acessados em outros aparelhos; é preciso ativar o bucket e publicar `storage.rules` no Firebase. O app shell continua disponível pelo service worker e as alterações compatíveis feitas offline entram na fila quando a rede volta. Marcações e observações do leitor de PDF permanecem locais e entram no backup.

## Etapa 8 — Validação e publicação

**Validação estática concluída; validação manual pendente.** A sintaxe dos scripts, 168 IDs, 14 formulários, referências locais, regras do Storage e diff foram conferidos. O fluxo autenticado do Firebase, as permissões reais do Storage e a aparência em aparelhos precisam ser validados com a conta e os dispositivos disponíveis. O envio ao GitHub fica a cargo da pessoa responsável pelo repositório.

## Preservação

- As alterações foram feitas diretamente em `confortystudy`, a pasta oficial indicada pelo usuário; a pasta aninhada de mesmo nome não foi alterada.
- Foi criada uma cópia ZIP de segurança antes desta rodada de atualizações.
- Nenhum dado local, conta Firebase ou conteúdo existente foi apagado.
