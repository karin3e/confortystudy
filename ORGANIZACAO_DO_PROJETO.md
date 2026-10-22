# ComfortStudy — pacote organizado

Este pacote mantém os arquivos de primeiro nível do projeto, incluindo as páginas HTML, scripts, CSS, configurações Firebase, regras e ícones.

## Arquivos principais
- `index.html`, `login.html`, `cadastro.html`, `recuperar-senha.html`: páginas de acesso.
- `index_2.html`: painel principal do aluno.
- `script.js`: funções do painel.
- `style_dashboard.css`: estilos do painel.
- `auth.js`, `firebase-init.js`, `firebase-config.js`, `firebase-config-v2.js`, `cloud-sync.js`: autenticação e sincronização.
- `firestore.rules`: regras do Firestore.
- `manifest.json`, `service-worker.js`, `icons/`: recursos PWA.

## Organização
Foram retirados deste pacote os metadados internos do Git, cópias completas aninhadas do projeto, arquivos ZIP antigos dentro da pasta, logs e um backup antigo de configuração. Isso reduz duplicações e evita confusão sobre qual arquivo editar.

As páginas soltas e scripts da raiz foram mantidos. Nenhum código funcional foi reescrito nesta etapa de organização.

## Antes de publicar
1. Faça uma cópia de segurança do projeto atual.
2. Confira `firebase-config.js` e `firebase-config-v2.js`.
3. Teste login, cadastro, matérias, atividades e sincronização com Firebase.
4. Não coloque chaves privadas de serviços de IA no JavaScript público; chamadas de IA devem passar por um backend.
