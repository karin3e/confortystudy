# ComfortStudy — configuração para uso real

Esta versão mantém o GitHub Pages como hospedagem estática e usa Firebase Authentication + Cloud Firestore para contas e dados por usuário. **Ela não fica pronta para produção apenas enviando os arquivos ao GitHub**: é necessário configurar o projeto Firebase abaixo.

## 1. Criar projeto Firebase
1. Acesse https://console.firebase.google.com/ e crie um projeto.
2. Adicione um aplicativo Web (`</>`), copie a configuração do SDK.
3. Abra `firebase-config-v2.js` e substitua todos os valores `COLOQUE_...` pelos valores reais fornecidos pelo Firebase.
4. Não publique senhas, chaves privadas de service account ou arquivos de credenciais administrativas. A configuração web `apiKey` é pública; a proteção dos dados depende das regras e dos provedores habilitados.

## 2. Ativar autenticação
No Firebase Console → Authentication → Sign-in method:
- Ative **E-mail/senha**.
- Para login Google, ative **Google** e configure o e-mail de suporte.
- Em Authentication → Settings → Authorized domains, adicione o domínio do GitHub Pages, por exemplo `SEU-USUARIO.github.io` (sem `https://` e sem caminho do repositório).
- Em Authentication → Templates, personalize o e-mail de redefinição de senha e o nome do remetente.

O login Google usa o provedor Firebase. Não use o antigo fluxo de apenas decodificar um token Google no navegador como prova de autenticação.
Se o e-mail Google já tiver uma conta de e-mail/senha, o app pede a senha existente para conectar os provedores ao mesmo UID e manter os dados naquela conta.

## 3. Configurar Firestore
1. Firebase Console → Firestore Database → Create database.
2. Publique o conteúdo de `firestore.rules` na aba Rules (ou use Firebase CLI).
3. Regras previstas: cada conta só pode ler/gravar documentos dentro de `/users/{seu-uid}/data/`. O app associa as informações ao UID do Firebase, não ao nome de exibição.
4. Nunca publique regras abertas como `allow read, write: if true`.

## 4. Ativar sincronização de fotos e PDFs
1. Firebase Console → Storage → Get started/Primeiros passos e crie o bucket no mesmo projeto usado pelo app.
2. Confira se `storageBucket` em `firebase-config-v2.js` corresponde ao bucket exibido no Firebase.
3. Publique `storage.rules` na aba Storage → Rules. As regras permitem que cada conta acesse somente seus próprios anexos em `users/{uid}/attachments/` e limitam cada arquivo a 10 MB.
4. O app envia anexos novos ao Storage quando a conta está conectada e migra anexos locais pequenos ao sincronizar. Em aparelhos diferentes, a conta precisa ser a mesma. O modo local e os backups continuam disponíveis.
5. Configure alertas de orçamento no Firebase e confira os custos do Storage antes de compartilhar o app amplamente.

Ao sair do app, as alterações pendentes precisam ser sincronizadas antes de a sessão ser encerrada; em seguida, o cache local da conta é removido deste navegador. Se a sincronização falhar, o app mantém a sessão e os dados locais para evitar perda. As regras do Firebase são a proteção que impede uma conta de ler ou alterar dados de outra; nunca publique regras abertas.

## 5. Publicar no GitHub Pages
Inclua todos os arquivos da pasta do projeto, inclusive firebase-config-v2.js, firebase-init.js, auth.js, cloud-sync.js, extras.js, extras.css, service-worker.js, firestore.rules, storage.rules e os ícones. Em Settings → Pages, selecione a branch e a pasta correta. Acesse sempre por HTTPS.

## 6. Dados locais existentes
Os dados do protótipo ficam no navegador. Na primeira entrada no Firebase, `cloud-sync.js` tenta importar dados locais de uma conta Firebase existente somente quando o UID corresponde; para contas antigas sem UID, a migração exige o mesmo e-mail autenticado. Mesmo assim, faça backup antes de atualizar. Contas locais antigas precisam ser recriadas no Firebase; senhas antigas não são migradas.

## 7. Testes obrigatórios antes de divulgar
- Criar conta com e-mail novo e verificar o tratamento de e-mail duplicado.
- Entrar e sair; redefinir senha pelo e-mail recebido.
- Ativar Google e testar login no domínio publicado, se desejar esse método.
- Criar tarefas, provas e conteúdos; abrir a mesma conta em outro navegador/dispositivo e verificar sincronização.
- Anexar uma imagem e um PDF, entrar na mesma conta em outro aparelho e confirmar que ambos abrem; testar também permissões e limites do Storage.
- Errar uma questão em um simulado e confirmar que ela aparece nos flashcards; conferir busca geral, plano rápido, lembretes e a remoção do aviso depois de marcá-lo como lido.
- Criar duas contas e confirmar que uma não consegue ver os dados da outra.
- Testar em iPhone, Android e computador; testar instalação PWA e atualização do service worker.
- Testar notificações. Avisos programados com o site completamente fechado ainda exigem Web Push e um serviço de envio no servidor; notificações locais não garantem entrega fechadas.

## Limitações conhecidas
- O app continua sendo um frontend estático; não há painel administrativo, cobrança Premium, envio de Web Push no servidor ou política de privacidade/termos publicados incluídos nesta entrega.
- Os dados de estudo são sincronizados como documentos por usuário, mas é necessário validar com testes reais e dados representativos antes de anunciar disponibilidade pública.
- As notificações internas são atualizadas enquanto o app está aberto. O aviso nativo depende da permissão do navegador; entrega com o app fechado exige Web Push e um serviço no servidor.
- Configure limites/alertas de orçamento e monitore uso no Firebase. Nunca coloque credenciais administrativas no repositório.
