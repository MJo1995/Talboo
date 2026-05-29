import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/lib/supabase/client";
import { useRestaurantStore } from "@/store/useRestaurantStore";
import { Spinner } from "@/components/ui/spinner";
import type { Session } from "@supabase/supabase-js";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [hasMembership, setHasMembership] = useState<boolean | null>(null);

  const { currentRestaurant, setRestaurant, setMemberRole, setIsLoading } =
    useRestaurantStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setAuthChecked(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, updatedSession) => {
      setSession(updatedSession);
      setAuthChecked(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setHasMembership(null);
      return;
    }

    if (currentRestaurant) {
      setHasMembership(true);
      return;
    }

    setIsLoading(true);

    supabase
      .from("restaurant_members")
      .select("restaurant_id, role, restaurants(*)")
      .eq("user_id", session.user.id)
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          setHasMembership(false);
          setIsLoading(false);
          return;
        }

        const restaurant = data.restaurants as unknown as {
          id: string;
          owner_id: string;
          name: string;
          slug: string;
          created_at: string;
          kitchen_reset_at: string;
          kitchen_access_code: string | null;
          logo_url: string | null;
          cover_image_url: string | null;
        };

        setRestaurant(restaurant);
        setMemberRole(data.role as "owner" | "manager" | "staff");
        setHasMembership(true);
        setIsLoading(false);
      });
  }, [session, currentRestaurant, setRestaurant, setMemberRole, setIsLoading]);

  if (!authChecked || (session && hasMembership === null)) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Spinner className="size-8 text-primary" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (hasMembership === false) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
