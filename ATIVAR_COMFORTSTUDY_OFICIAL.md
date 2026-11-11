# ComfortStudy Official — ativação dos módulos

## O que foi acrescentado
- Boletim com médias ponderadas por peso e simulador da nota necessária.
- Caderno rico com edição, favoritos e anexos pelo endpoint privado Supabase.
- Grupos compartilhados com código de entrada e materiais compartilhados.
- Assistente de IA via função segura Supabase + OpenAI Responses API.
- Plano de revisão inicial baseado em provas e tarefas já cadastradas.
- Complementos do perfil, seleção de tema claro/escuro/automático e backup JSON local.
- Estrutura inicial da área institucional protegida por custom claims.
- Novos módulos incluídos no cache do PWA.

## Serviços que precisam ser publicados para ativar tudo
A atualização do frontend não consegue publicar serviços externos na sua conta por conta própria. Para ativar a IA e a entrada por código nos grupos:

### Assistente de IA
Fora desta versão, conforme decisão do projeto. Nenhuma chave de API ou serviço pago é necessário para os demais módulos.

### Grupos
1. Na pasta `functions`, instale dependências com `npm install`.
2. Publique as Cloud Functions:
   `firebase deploy --only functions`
3. A função `joinStudyGroup` valida o usuário autenticado e adiciona a conta ao grupo por código, sem expor a lista de grupos.

### Firestore
Publique as regras atualizadas após revisar o projeto:
`firebase deploy --only firestore:rules`

### Anexos
O caderno utiliza a função `comfort-attachments` já existente e envia os arquivos por multipart/form-data. A função precisa continuar ativa, com bucket privado e secrets configurados.

## Observações importantes
- Login, cadastro e recuperação de senha existentes foram preservados.
- Firebase Auth e Firestore continuam como autenticação e banco principal. Supabase continua somente para anexos.
- O backup JSON é uma cópia exportada pelo navegador; não substitui backup automático/point-in-time do Firestore.
- O planejamento é uma primeira integração com datas de provas e tarefas. Não substitui ainda um otimizador que conheça disponibilidade semanal, carga de cada disciplina e metas.
- A área institucional fica bloqueada por padrão e depende de custom claims concedidas no servidor.
- Notificações push quando o navegador está fechado exigem configuração de FCM, VAPID e permissões no projeto; não foram ativadas automaticamente.
- Teste em ambiente de homologação antes de publicar sobre a Beta. Faça backup do Firestore antes de aplicar regras.


## Modo sem cobrança de Cloud Functions (Firebase Spark)
- O ingresso em grupos foi adaptado para usar somente Firestore: cada grupo usa um código de convite aleatório de 10 caracteres como ID do documento.
- Para esta versão, publique apenas as regras do Firestore: `firebase deploy --only firestore:rules`.
- **Não execute `firebase deploy --only functions`**: as funções de e-mail do suporte dependem de Cloud Functions e não fazem parte do fluxo gratuito.
- As solicitações de suporte continuam sendo registradas e consultáveis no Firestore; o envio automático de e-mails e notificações por servidor fica desativado.
- Firebase Authentication e Firestore continuam sendo usados. Os anexos continuam no Supabase Storage/Edge Function já configurado.
