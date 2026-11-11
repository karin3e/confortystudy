# ComfortStudy — ajustes visuais e organização geral

## O que foi ajustado nesta rodada
- Padronização visual dos módulos Boletim, Grupos, Caderno avançado e Área institucional.
- Campos, cartões, botões, editor e listas com dimensões, espaçamento, bordas e estados de foco consistentes.
- Perfil reorganizado para não inserir um segundo cartão de Aparência nem repetir escola, curso, bio e foto.
- Campo Série/Turma incorporado ao formulário de perfil existente.
- Preferência de tema claro/escuro/automático integrada ao seletor existente, sem criar um segundo controle.
- Separação entre paleta de cor (`data-theme`) e modo claro/escuro (`data-mode`), evitando que uma preferência sobrescreva a outra.
- Atualização da versão do cache do service worker.
- Conferência de IDs HTML sem duplicações e sintaxe dos scripts JavaScript.

## Observação
Estas são correções de código e apresentação. O comportamento visual precisa ser conferido no navegador após publicar e limpar o cache. Grupos que dependem de Cloud Functions continuam limitados enquanto o projeto Firebase não tiver faturamento habilitado; esta atualização não altera essa exigência.
