import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createRemoteJWKSet, jwtVerify } from "https://deno.land/x/jose@v5.9.6/index.ts";

const PROJECT_ID = "confortstudy-9ab7d";
const BUCKET = "comfortstudy-attachments";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return response({ error: "Método não permitido." }, 405);

  try {
    const authorization = req.headers.get("Authorization") || "";
    const token = authorization.replace(/^Bearer\s+/i, "");
    if (!token) return response({ error: "Autenticação necessária." }, 401);

    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${PROJECT_ID}`,
      audience: PROJECT_ID,
    });
    const uid = String(payload.sub || "");
    if (!uid) return response({ error: "Conta inválida." }, 401);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let action = "";
    let path = "";
    let file: File | null = null;
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      action = String(form.get("action") || "");
      path = String(form.get("path") || "");
      const value = form.get("file");
      if (value instanceof File) file = value;
    } else {
      const body = await req.json();
      action = String(body.action || "");
      path = String(body.path || "");
    }

    const prefix = `users/${uid}/attachments/`;
    if (!path.startsWith(prefix) || path.includes("..")) {
      return response({ error: "Acesso negado ao arquivo." }, 403);
    }

    if (action === "upload") {
      if (!file) return response({ error: "Arquivo não recebido." }, 400);
      if (file.size <= 0 || file.size > 10 * 1024 * 1024) {
        return response({ error: "O arquivo deve ter até 10 MB." }, 400);
      }
      const allowed = ["application/pdf", "image/png", "image/jpeg", "image/webp", "image/gif"];
      if (!allowed.includes(file.type)) return response({ error: "Tipo de arquivo não permitido." }, 415);
      const { error } = await admin.storage.from(BUCKET).upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (error) return response({ error: error.message }, 400);
      const { data, error: signError } = await admin.storage.from(BUCKET).createSignedUrl(path, 3600);
      if (signError) return response({ error: signError.message }, 400);
      return response({ signedUrl: data.signedUrl });
    }

    if (action === "signed-url") {
      const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(path, 3600);
      if (error) return response({ error: error.message }, 404);
      return response({ signedUrl: data.signedUrl });
    }

    if (action === "delete") {
      const { error } = await admin.storage.from(BUCKET).remove([path]);
      if (error) return response({ error: error.message }, 400);
      return response({ deleted: true });
    }

    return response({ error: "Ação inválida." }, 400);
  } catch (error) {
    console.error("comfort-attachments:", error);
    return response({ error: "Não foi possível validar a conta ou processar o anexo." }, 401);
  }
});
