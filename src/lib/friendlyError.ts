/**
 * Converte erros técnicos (Supabase Edge Functions, Meta API, Google API)
 * em mensagens amigáveis para o usuário.
 */
export function friendlyError(err: unknown, fallback = "Algo deu errado. Tente novamente."): string {
  if (!err) return fallback;
  const raw =
    typeof err === "string"
      ? err
      : (err as any)?.message || (err as any)?.error?.message || JSON.stringify(err);
  const msg = String(raw).toLowerCase();

  // Edge function genérico
  if (msg.includes("edge function returned a non-2xx") || msg.includes("non-2xx status code")) {
    return "O serviço está temporariamente indisponível. Tente novamente em instantes.";
  }
  if (msg.includes("functionsfetcherror") || msg.includes("failed to fetch")) {
    return "Falha de conexão. Verifique sua internet e tente novamente.";
  }

  // Meta / Facebook
  if (msg.includes("oauthexception") || msg.includes("invalid oauth") || msg.includes("session has expired")) {
    return "O token da Meta expirou. Atualize o token do cliente nas configurações.";
  }
  if (msg.includes("permission") && msg.includes("ad")) {
    return "Sem permissão na conta de anúncios. Verifique se o token tem acesso a essa conta.";
  }
  if (msg.includes("rate limit") || msg.includes("user request limit") || msg.includes("(#17)")) {
    return "Limite de requisições da Meta atingido. Aguarde alguns minutos e tente novamente.";
  }
  if (msg.includes("ad account") && (msg.includes("not found") || msg.includes("invalid"))) {
    return "Conta de anúncios não encontrada ou inválida.";
  }

  // Google
  if (msg.includes("invalid_grant") || msg.includes("token has been expired") || msg.includes("refresh token")) {
    return "Sua conexão com o Google expirou. Reconecte o Google nas configurações do cliente.";
  }
  if (msg.includes("ga4") || msg.includes("analytics property")) {
    return "Não foi possível ler a propriedade do Google Analytics. Verifique a permissão e o ID configurado.";
  }

  // Auth / RLS
  if (msg.includes("jwt") || msg.includes("not authenticated")) {
    return "Sua sessão expirou. Faça login novamente.";
  }
  if (msg.includes("row-level security") || msg.includes("permission denied")) {
    return "Você não tem permissão para esta ação.";
  }

  // Mensagens curtas e em português provavelmente já são amigáveis
  const original = String(raw);
  if (original.length < 140 && !/[{[<]/.test(original)) return original;
  return fallback;
}
