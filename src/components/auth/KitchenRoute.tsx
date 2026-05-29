import { ProtectedRoute } from "./ProtectedRoute";

interface KitchenRouteProps {
  children: React.ReactNode;
}

/**
 * Route guard for the Kitchen surface (/kitchen/*).
 * Wraps ProtectedRoute (session + membership).
 * All authenticated restaurant members can access the kitchen —
 * no additional role check needed.
 */
export function KitchenRoute({ children }: KitchenRouteProps) {
  return (
    <ProtectedRoute>
      {children}
    </ProtectedRoute>
  );
}
