# ComfortStudy — substituição do armazenamento de anexos

Esta alteração mantém Firebase Authentication e Cloud Firestore. Apenas os arquivos anexados passam a usar Supabase Storage privado.

## Configuração obrigatória no Supabase

1. Abra o projeto `comfortstudy` no Supabase.
2. Vá em **Storage** e crie um bucket chamado `comfortstudy-attachments`.
3. Deixe o bucket **Private** (não público). Não crie políticas públicas de leitura ou escrita.
4. No terminal, instale/abra a Supabase CLI e entre na conta:
   `supabase login`
5. Na pasta raiz deste projeto, vincule o projeto:
   `supabase link --project-ref qcferdvpdtiernawkojm`
6. No Supabase, abra **Project Settings → API Keys → Secret keys** e copie a chave `sb_secret_...` localmente. NÃO a coloque no código, GitHub, conversa ou navegador.
7. Configure a chave como segredo da Edge Function:
   `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=COLE_A_CHAVE_SECRETA_AQUI`
   (Se o painel mostrar a chave legada `service_role`, também serve; nunca a compartilhe.)
8. Publique a função:
   `supabase functions deploy comfort-attachments --no-verify-jwt`

A função valida o token de identidade emitido pelo Firebase Auth (`confortstudy-9ab7d`) e só permite que o usuário acesse caminhos `users/SEU_UID/attachments/...` pertencentes ao próprio UID. A chave privilegiada fica somente no ambiente da Edge Function.

## Importante

- Não altere nem remova Firebase Authentication ou Firestore.
- Não torne o bucket público.
- Não use a Secret key no frontend.
- Depois de publicar a função, teste com uma conta de estudante: enviar PDF, abrir em outro aparelho e excluir.
- Os anexos antigos que já estavam no Firebase Storage não são migrados automaticamente. Mantenha o Firebase Storage e os arquivos antigos intactos até confirmar a migração e validar os novos anexos.
- O plano gratuito do Supabase tem limites de armazenamento e transferência; monitore o uso no painel.
