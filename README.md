# ComfortStudy

Organizador de estudos para tarefas, provas, matérias e rotina semanal.

## Funcionalidades
- Login e cadastro por e-mail/senha e Google, com sincronização de dados por conta.
- Tarefas com instruções, checklist, anexos PDF/imagem e repetição diária ou semanal.
- Caderno por matéria, com anotações, marcação de conteúdo importante e revisão a partir do texto.
- Calendário, cronômetro, avisos e acompanhamento de desempenho.
- Painel "Seu Hoje" com três tarefas prioritárias e provas próximas; agenda semanal de aulas, tarefas, provas e sessões de estudo.
- Sugestões de horários livres usando a grade de aulas e avisos de aula, prazo e revisão enquanto o app estiver aberto.
- Diário de estudos, revisão espaçada de anotações importantes e flashcards, cálculo de nota necessária e relatório mensal/semanal.
- Leitor de PDF com páginas favoritas e observações, além de temas, avatar e cartões personalizáveis no painel.
- Perfil ajustável com nome, e-mail, escola, curso, biografia e foto, com opções para salvar ou cancelar alterações.
- Layout adaptável para celulares, tablets e computadores, com rolagem interna nos formulários e modais.
- Metas semanais, plano de estudo para provas e registro de notas.
- Simulados com questões objetivas próprias, correção automática, histórico de resultados e conquistas de estudo.
- Questões erradas em simulados viram flashcards com revisão espaçada.
- Busca geral por tarefas, provas, matérias e anotações; plano rápido conforme o tempo disponível.
- Lembretes configuráveis para tarefas, provas e revisões; avisos lidos saem da caixa principal e ficam no histórico.
- Fotos e PDFs sincronizados entre dispositivos pelo Firebase Storage depois de ativar o bucket e publicar `storage.rules`.
- Exportação e restauração de backup. As marcações e observações do leitor de PDF continuam locais e entram no backup.

Consulte [PLANO_DE_EVOLUCAO.md](PLANO_DE_EVOLUCAO.md) para acompanhar as etapas de responsividade, estabilidade e melhorias do projeto.

## Publicação
Use CONFIGURAR_FIREBASE.md e COMO_INSTALAR.txt. As páginas carregam firebase-config-v2.js. Inclua extras.js, extras.css e os ícones na publicação.

Os cadastros permanecem abertos para que outras pessoas também possam usar o app. Cada conta tem seus próprios dados. O Premium está marcado como "Em breve"; os recursos atuais são gratuitos. Os avisos do navegador funcionam enquanto o app está aberto. Notificações com o app fechado exigem Web Push e um serviço de envio no servidor.
