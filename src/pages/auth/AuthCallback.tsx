import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase/client";
import { Spinner } from "@/components/ui/spinner";

export function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate("/", { replace: true });
      }
    });

    // Also check immediately in case the session is already established
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        setError(error.message);
      } else if (session) {
        navigate("/", { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (error) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-background px-4">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive max-w-md w-full text-center">
          <p className="font-medium mb-2">Authentication Error</p>
          <p>{error}</p>
          <button 
            onClick={() => navigate("/login", { replace: true })}
            className="mt-4 underline underline-offset-4 hover:text-destructive/80"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Spinner className="size-8 text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">Authenticating...</p>
      </div>
    </div>
  );
}
