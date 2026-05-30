import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useExchangeMetaCode } from "@/hooks/useMetaAds";
import { getMetaOAuthRedirectUri } from "@/lib/metaOAuth";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function MetaCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const exchangeCode = useExchangeMetaCode();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // clientId or 'global'

    if (!code || !state) {
      setStatus("error");
      return;
    }

    const redirectUri = getMetaOAuthRedirectUri();

    exchangeCode.mutate(
      { clientId: state, code, redirectUri },
      {
        onSuccess: () => {
          setStatus("success");
          // If state is global, redirect to /settings, otherwise to dashboard/clientId
          const dest = state === "global" ? "/settings" : `/dashboard/${state}`;
          setTimeout(() => navigate(dest), 2000);
        },
        onError: () => setStatus("error"),
      }
    );
  }, [exchangeCode, navigate, searchParams]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        {status === "loading" && (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Conectando com a Meta (Facebook)...</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto" />
            <p className="text-foreground font-medium">Meta Ads conectado com sucesso!</p>
            <p className="text-sm text-muted-foreground">Redirecionando...</p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="h-10 w-10 text-destructive mx-auto" />
            <p className="text-foreground font-medium">Erro ao conectar</p>
            <p className="text-sm text-muted-foreground">Tente novamente a partir das configurações.</p>
            <button
              onClick={() => navigate("/settings")}
              className="text-primary underline text-sm"
            >
              Voltar às configurações
            </button>
          </>
        )}
      </div>
    </div>
  );
}
