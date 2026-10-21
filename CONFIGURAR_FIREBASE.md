# ComfortStudy — configuração para uso real

Esta versão mantém o GitHub Pages como hospedagem estática e usa Firebase Authentication + Cloud Firestore para contas e dados por usuário. **Ela não fica pronta para produção apenas enviando os arquivos ao GitHub**: é necessário configurar o projeto Firebase abaixo.

## 1. Criar projeto Firebase
1. Acesse https://console.firebase.google.com/ e crie um projeto.
2. Adicione um aplicativo Web (`</>`), copie a configuração do SDK.
3. Abra `firebase-config.js` e substitua todos os valores `COLOQUE_...` pelos valores reais fornecidos pelo Firebase.
4. Não publique senhas, chaves privadas de service account ou arquivos de credenciais administrativas. A configuração web `apiKey` é pública; a proteção dos dados depende das regras e dos provedores habilitados.

## 2. Ativar autenticação
No Firebase Console → Authentication → Sign-in method:
- Ative **E-mail/senha**.
- Para login Google, ative **Google** e configure o e-mail de suporte.
- Em Authentication → Settings → Authorized domains, adicione o domínio do GitHub Pages, por exemplo `SEU-USUARIO.github.io` (sem `https://` e sem caminho do repositório).
- Em Authentication → Templates, personalize o e-mail de redefinição de senha e o nome do remetente.

O login Google usa o provedor Firebase. Não use o antigo fluxo de apenas decodificar um token Google no navegador como prova de autenticação.

## 3. Configurar Firestore
1. Firebase Console → Firestore Database → Create database.
2. Publique o conteúdo de `firestore.rules` na aba Rules (ou use Firebase CLI).
3. Regras previstas: cada conta só pode ler/gravar documentos dentro de `/users/{seu-uid}/data/`.
4. Nunca publique regras abertas como `allow read, write: if true`.

## 4. Publicar no GitHub Pages
Inclua todos os arquivos da pasta do projeto, inclusive `firebase-config.js`, `firebase-init.js`, `auth.js`, `cloud-sync.js`, `firestore.rules` e os ícones. Em Settings → Pages, selecione a branch e a pasta correta. Acesse sempre por HTTPS.

## 5. Dados locais existentes
Os dados do protótipo ficam no navegador. Na primeira entrada no Firebase, `cloud-sync.js` tenta importar os dados locais apenas quando o e-mail da antiga conta local corresponde ao e-mail autenticado. Mesmo assim, faça backup antes de atualizar. Contas locais antigas precisam ser recriadas no Firebase; senhas antigas não são migradas.

## 6. Testes obrigatórios antes de divulgar
- Criar conta com e-mail novo e verificar o tratamento de e-mail duplicado.
- Entrar e sair; redefinir senha pelo e-mail recebido.
- Ativar Google e testar login no domínio publicado, se desejar esse método.
- Criar tarefas, provas e conteúdos; abrir a mesma conta em outro navegador/dispositivo e verificar sincronização.
- Criar duas contas e confirmar que uma não consegue ver os dados da outra.
- Testar em iPhone, Android e computador; testar instalação PWA e atualização do service worker.
- Testar notificações. Avisos programados com o site completamente fechado ainda exigem Web Push e um serviço de envio no servidor; notificações locais não garantem entrega fechadas.

## Limitações conhecidas
- O app continua sendo um frontend estático; não há painel administrativo, cobrança Premium, envio de Web Push no servidor ou política de privacidade/termos publicados incluídos nesta entrega.
- Os dados de estudo são sincronizados como documentos por usuário, mas é necessário validar com testes reais e dados representativos antes de anunciar disponibilidade pública.
- Configure limites/alertas de orçamento e monitore uso no Firebase. Nunca coloque credenciais administrativas no repositório.
