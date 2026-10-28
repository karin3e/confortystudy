# ComfortStudy — configuração da Central de Suporte

A interface e a gravação de solicitações foram adicionadas a `index_2.html`, `style_dashboard.css` e `support.js`. A identidade visual azul existente foi preservada.

## 1. Publicar regras do Firestore

Revise `firestore.rules` e publique as regras no Firebase Console (Firestore Database → Rules). Elas permitem que cada usuário autenticado crie e leia apenas os próprios pedidos e impedem alterações pelo cliente depois do envio.

## 2. Configurar o envio automático de e-mail

O site estático no GitHub Pages não pode guardar credenciais SMTP nem enviar e-mails diretamente com segurança. O backend em `functions/` envia aviso para `karinevitoriasousa6@gmail.com`, confirmação ao estudante e atualizações quando o status/mensagem do pedido mudar.

Pré-requisitos: Firebase CLI, plano Firebase que permita Cloud Functions, Node.js 20 e credenciais SMTP de um provedor confiável. Dentro da pasta do projeto:

```bash
firebase init functions
# Se já existir a pasta functions, preserve os arquivos deste pacote.
cd functions
npm install
cd ..
firebase functions:secrets:set SMTP_HOST
firebase functions:secrets:set SMTP_PORT
firebase functions:secrets:set SMTP_USER
firebase functions:secrets:set SMTP_PASS
firebase deploy --only firestore:rules,functions
```

Informe os valores solicitados no terminal. `SMTP_USER` deve ser um remetente autorizado pelo provedor. Nunca coloque a senha SMTP no HTML, JavaScript do navegador ou repositório público. Configure o projeto Firebase correto antes de publicar.

## 3. Como responder solicitações

O estudante pode consultar o protocolo e status no próprio app. Para enviar uma atualização, um operador autorizado deve atualizar o documento no Firestore com `status` (`received`, `in_review`, `answered` ou `closed`) e, se necessário, `latestMessage`. A Cloud Function envia a atualização por e-mail. O acesso administrativo ao console deve ser restrito à criadora/equipe autorizada.

## 4. Limitações atuais

- Upload de anexos não está habilitado nesta versão para evitar anexos sem regras de armazenamento e validação.
- O frontend e o arquivo da Cloud Function foram preparados, mas o envio automático só funcionará após instalar dependências, configurar segredos e publicar as funções.
- Teste login, criação de solicitação, regras e recebimento de e-mail com uma conta de teste antes de publicar para todos.
