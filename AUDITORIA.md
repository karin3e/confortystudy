# Auditoria técnica — ComfortStudy

## Correções realizadas
- Removido o login antigo que comparava senha no `localStorage`.
- Removido o fluxo Google que apenas decodificava o token no navegador.
- Login e cadastro agora usam Firebase Authentication.
- Recuperação de senha agora solicita link oficial por e-mail via Firebase.
- O painel só carrega após autenticação Firebase e hidratação dos dados.
- Adicionada sincronização Firestore por usuário para tarefas, provas, avisos, tempo de estudo, conteúdos e perfil.
- Adicionada importação conservadora de dados locais antigos: tarefas e dados de estudo só são importados quando o e-mail local anterior corresponde ao e-mail autenticado; documentos já existentes na nuvem não são sobrescritos.
- Logout agora encerra a sessão Firebase.
- Reforçadas as regras Firestore para cada usuário acessar somente `/users/{uid}/data/{documentId}`.
- Atualizado o cache do service worker.
- Mantidos os arquivos visuais do painel e as funções existentes sempre que possível.

## Verificações executadas
- `node --check` passou para `auth.js`, `cloud-sync.js`, `firebase-init.js`, `script.js` e `service-worker.js`.
- Verificação estática de links locais HTML não encontrou arquivos ausentes.
- O pacote ainda não pôde ser testado contra um projeto Firebase real porque a configuração do seu projeto precisa ser criada/copieda no console.

## Configuração externa obrigatória
1. Criar projeto Firebase e app Web.
2. Preencher `firebase-config.js` com os valores do console.
3. Ativar Firebase Authentication (E-mail/senha; Google é opcional).
4. Criar Cloud Firestore e publicar `firestore.rules`.
5. Autorizar o domínio `SEU-USUARIO.github.io`.
6. Publicar todos os arquivos no GitHub Pages e executar os testes descritos em `CONFIGURAR_FIREBASE.md`.

## Ainda não incluído
- Push notifications garantidas quando o app estiver completamente fechado (precisa de Web Push e serviço servidor).
- Cobrança real do plano Premium.
- Política de privacidade/termos publicados e domínio próprio.
- Validação de produção em dispositivos e com duas contas reais.

**Conclusão:** os arquivos estão preparados para integração Firebase, mas não é correto chamar a instalação de produção até concluir a configuração e os testes reais.
