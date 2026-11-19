# ComfortStudy — Redesign criativo

## Direção aplicada
A identidade azul e violeta foi mantida, mas cada módulo recebeu uma linguagem visual própria em vez de repetir o mesmo cartão genérico.

- Dashboard: hero editorial com grafismos sutis, atalhos de alto contraste e indicadores com cores semânticas.
- Matérias: biblioteca em cartões com variações de cor e estados de interação.
- Calendário: canvas de planejamento com hierarquia entre mês, dias e datas.
- Tarefas e provas: listas verticais mais escaneáveis, filtros compactos e destaque de prioridade.
- Cronômetro: ambiente de foco com mostrador central e presets em formato de pílula.
- Desempenho e boletim: cartões de indicadores e separação visual das áreas de avaliação.
- Caderno: editor com aparência de papel, barra de ferramentas e área de anotações.
- Planejamento: módulos com acentos visuais diferentes, preservando as ferramentas existentes.
- Perfil: cabeçalho pessoal, campos agrupados e preferências separadas.
- Sobre: hero narrativo e blocos editoriais.
- Suporte: separação clara entre formulário e histórico.
- Premium: apresentação de produto com recursos em superfícies translúcidas.

## Implementação
- Nova folha `creative-redesign.css`, carregada depois das folhas anteriores.
- Preservados os IDs e os formulários existentes para manter os handlers JavaScript.
- Service worker atualizado para `comfortstudy-v30` e nova folha adicionada ao app shell.

## Verificações
Os arquivos JavaScript, o CSS, a integridade do pacote e os destinos de navegação foram verificados após a alteração. Testes reais de autenticação, Firestore, Storage/Supabase, notificações e sincronização precisam ser feitos no ambiente conectado.
