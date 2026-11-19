# ComfortStudy

Plataforma de organização de estudos com interface responsiva e instalação como PWA.

## Funcionalidades
- Cadastro, login por e-mail/senha, login Google e recuperação de senha.
- Dashboard, matérias, calendário, tarefas, provas, cronômetro, avisos e desempenho.
- Planejamento de estudos, metas, grade semanal, diário e revisão espaçada.
- Flashcards, banco de questões, simulados e histórico.
- Caderno digital por matéria, com editor formatado, favoritos, edição, duplicação, exclusão e anexos.
- Boletim com médias ponderadas e simulador de nota necessária.
- Grupos de estudo com convite por código e compartilhamento de links.
- Perfil, preferências de aparência, backup local e central de suporte.
- Área institucional protegida por permissões concedidas no servidor.
- Interface adaptável a computadores, tablets e celulares.

## Arquitetura
- GitHub Pages: hospedagem estática do frontend.
- Firebase Authentication: autenticação e identidade dos estudantes.
- Cloud Firestore: dados de cada conta, sincronização e grupos.
- Supabase Storage privado: arquivos anexados, acessados exclusivamente pela Edge Function `comfort-attachments`, que valida o token do Firebase.
- Service Worker: cache do aplicativo e suporte offline da estrutura principal.

O Firebase Storage não é usado para novos anexos nesta arquitetura. Não é necessário ativá-lo para a integração atual de anexos.

## Custos e limites
O app usa Firebase Authentication e Cloud Firestore. O uso depende das cotas e condições do plano Firebase da conta. Grupos usam Firestore diretamente e não precisam de Cloud Functions para criar ou entrar por código nesta versão. O envio automático de e-mails do suporte por Cloud Functions está desativado até que exista um plano compatível e configuração de SMTP. Notificações com o app completamente fechado também exigem serviço de envio push no servidor e não estão ativadas.

O Supabase Storage/Edge Function possui limites próprios de armazenamento e transferência. Mantenha o bucket `comfortstudy-attachments` privado e nunca coloque a chave secreta do Supabase no frontend.

## Publicação
1. Consulte `CONFIGURAR_FIREBASE.md`.
2. Consulte `SUPABASE-ANEXOS-SETUP.md` para anexos.
3. Publique as regras de `firestore.rules` no projeto Firebase correto.
4. Publique a pasta do frontend no GitHub Pages, mantendo a estrutura de arquivos.
5. Faça testes de login, sincronização, grupos e anexos antes de divulgar atualizações.

## Segurança
Nunca publique credenciais administrativas, senhas SMTP ou a chave secreta do Supabase. A chave publicável do Supabase pode aparecer no frontend; a proteção real é feita pela Edge Function, que valida o token Firebase e limita cada UID à própria pasta de anexos. Não abra as regras do Firestore para leitura e escrita públicas.

## Limitações conhecidas
- Backup disponível no perfil é exportação/restauração local em JSON; não substitui backup automático do Firestore.
- Avisos locais funcionam com o app aberto. Push confiável com o app fechado ainda não está ativado.
- A área institucional só libera acesso a usuários com permissões institucionais atribuídas por administrador.
- Premium permanece como apresentação, sem cobrança ativa.
- Recursos de IA foram retirados temporariamente e não exigem chave paga.

## Documentação
- `PLANO_DE_EVOLUCAO.md`: escopo e etapas de evolução.
- `CONFIGURAR_FIREBASE.md`: autenticação e Firestore.
- `SUPABASE-ANEXOS-SETUP.md`: armazenamento privado de anexos.
- `SUPORTE-SETUP.md`: central de suporte e envio opcional de e-mail.
