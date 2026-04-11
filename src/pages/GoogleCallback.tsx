import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useExchangeGoogleCode } from "@/hooks/useGoogleAnalytics";
import { getGoogleOAuthRedirectUri } from "@/lib/googleOAuth";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function GoogleCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const exchangeCode = useExchangeGoogleCode();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const code = searchParams.get("code");
    const clientId = searchParams.get("state");

    if (!code || !clientId) {
      setStatus("error");
      return;
    }

    const redirectUri = getGoogleOAuthRedirectUri();

    exchangeCode.mutate(
      { clientId, code, redirectUri },
      {
        onSuccess: () => {
          setStatus("success");
          setTimeout(() => navigate(`/dashboard/${clientId}`), 2000);
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
            <p className="text-muted-foreground">Conectando com o Google...</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto" />
            <p className="text-foreground font-medium">Google Analytics conectado com sucesso!</p>
            <p className="text-sm text-muted-foreground">Redirecionando...</p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="h-10 w-10 text-destructive mx-auto" />
            <p className="text-foreground font-medium">Erro ao conectar</p>
            <p className="text-sm text-muted-foreground">Tente novamente a partir do dashboard do cliente.</p>
            <button
              onClick={() => navigate("/")}
              className="text-primary underline text-sm"
            >
              Voltar ao início
            </button>
          </>
        )}
      </div>
    </div>
  );
}
