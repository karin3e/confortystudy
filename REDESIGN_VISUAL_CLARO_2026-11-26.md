# ComfortStudy — Redesign visual claro (26/11/2026)

Esta atualização adiciona `comfortstudy-light-redesign.css` ao painel principal (`index_2.html`).

- Identidade visual clara com base branca, lavanda e azul.
- Sidebar clara, navegação ativa em lilás, cartões suaves e botões em gradiente.
- Estilos globais para dashboard, matérias, tarefas, provas, calendário, boletim, caderno digital, cronômetro, grupos, avisos, desempenho, suporte, sobre, perfil e área institucional.
- Ajustes responsivos para desktop, tablet e celular.
- A folha é uma camada visual adicional; não altera IDs, conteúdo, formulários, eventos, scripts ou integrações.
- O tema escuro existente permanece fora do escopo da camada clara (`data-mode="dark"`).
- Service worker atualizado para `comfortstudy-v32` e inclui a nova folha no app shell.

## Validação

- `node --check` executado nos scripts principais e no service worker.
- Chaves de abertura/fechamento CSS conferidas.
- Testes reais de Firebase, Supabase, login, sincronização e comportamento em dispositivos ainda precisam ser feitos no ambiente publicado.
