# ComfortStudy — refinamento visual 26/11/2026

Esta atualização altera somente a apresentação visual.

- Nova camada `visual-system-v3.css` no painel: sidebar, navegação ativa, superfícies, foco, hover e acabamento responsivo.
- Nova camada `auth-visual.css` compartilhada pelo login, cadastro e recuperação de senha.
- Mantidos os textos, IDs, formulários, links, navegação, scripts, Firebase, sincronização e recursos existentes.
- Atualizada a versão do cache do Service Worker para evitar que o navegador mantenha a folha visual antiga.

Não foram feitas alterações de funcionalidades ou estrutura de dados. A conferência final de aparência deve ser feita no navegador em desktop e celular, pois autenticação e serviços remotos dependem do Firebase publicado.
