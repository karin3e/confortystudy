# Plano de evolução do ComfortStudy

Este plano reúne as oito etapas combinadas. Os recursos existentes foram mantidos e as melhorias novas foram adicionadas à cópia de trabalho do repositório.

## Etapa 1 — Responsividade e rolagem

**Implementada; validação estática concluída.** Modais de tarefas, provas, matérias e revisões rolam dentro da tela, respeitam as áreas seguras, bloqueiam a rolagem do fundo e ficam acima do menu do celular. Campos, caixas de seleção, botões e anexos se ajustam a telas estreitas. Cadastro e recuperação de senha também se adaptam a telas baixas.

## Etapa 2 — Estabilidade e preservação

**Revisão de código concluída; fluxo autenticado aguardando validação manual.** Login, cadastro, recuperação, Firebase, calendário, tarefas, provas, avisos, cronômetro, desempenho e perfil foram conferidos. A sincronização agora mantém uma fila local de alterações feitas sem conexão e tenta enviá-las quando a rede volta. Anexos aceitam apenas PDF e formatos de imagem permitidos; links restaurados de backup são validados antes de abrir.

## Etapa 3 — Caderno digital

**Implementada.** Anotações continuam organizadas por matéria e agora podem ter tópico, título, texto, marcador de importância e arquivos PDF/foto. Há busca global por matéria/tópico/conteúdo e busca dentro da matéria. Anotações podem ser editadas, revistas e anexadas. Os arquivos locais também aparecem no backup.

## Etapa 4 — Revisão e prática

**Implementada.** Flashcards e revisão espaçada existentes foram mantidos. O banco de questões aceita perguntas objetivas com quatro alternativas, monta simulados aleatórios, corrige respostas, mostra os assuntos abaixo de 70% e guarda o histórico sincronizado.

## Etapa 5 — Planejamento inteligente

**Implementada.** Grade de aulas, agenda, plano baseado em provas, meta semanal, avisos e sugestões de horários existentes foram mantidos. Agora há meta diária, seleção da matéria no cronômetro e registro de tempo por matéria. Sugestões priorizam prazos e matérias com menos tempo estudado na última semana.

## Etapa 6 — Desempenho e motivação

**Implementada.** Relatórios e sequência de estudo existentes foram mantidos. O painel mostra tempo por matéria, média dos simulados, progresso semanal e conquistas pessoais sem ranking.

## Etapa 7 — Sincronização e modo offline

**Parcialmente implementada.** O app shell é armazenado pelo service worker e alterações compatíveis feitas enquanto o app está aberto sem rede ficam salvas no dispositivo e entram numa fila para sincronização ao reconectar. Dados pequenos sincronizam pelo Firebase. Anexos de tarefas, PDF e marcações do leitor continuam locais e entram no backup; sincronizar arquivos maiores exige configurar Firebase Storage e suas regras de acesso.

## Etapa 8 — Validação e publicação

**Validação estática concluída; validação manual e publicação pendentes.** Sintaxe dos scripts, IDs únicos, formulários, referências locais, atributos ARIA, fila de sincronização offline e diff foram verificados. O pacote está em `outputs/comfortstudy-atualizado.zip` e as alterações estão salvas em um commit local. O fluxo autenticado do Firebase e a aparência em aparelhos reais ainda precisam de validação manual com a conta do projeto e os dispositivos disponíveis antes do envio ao GitHub.

## Preservação

- O repositório original foi preservado; alterações foram feitas em uma cópia de trabalho.
- O backup anterior está em `outputs/comfortstudy-backup-before-profile.zip`.
- O pacote final atualizado está em `outputs/comfortstudy-atualizado.zip`.
- Nenhum dado local, conta Firebase ou conteúdo existente foi apagado.
