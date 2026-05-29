import { Navigate } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { useRestaurantStore } from "@/store/useRestaurantStore";
import { canAccessAdmin } from "@/types/roles";

interface AdminRouteProps {
  children: React.ReactNode;
}

/**
 * Route guard for the Admin surface (/admin/*).
 * Wraps ProtectedRoute (session + membership) and additionally
 * checks that the user has an admin-level role (owner or manager).
 * Staff users are redirected to the kitchen surface.
 */
export function AdminRoute({ children }: AdminRouteProps) {
  return (
    <ProtectedRoute>
      <AdminGuard>{children}</AdminGuard>
    </ProtectedRoute>
  );
}

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { activeMemberRole } = useRestaurantStore();

  if (!canAccessAdmin(activeMemberRole)) {
    return <Navigate to="/kitchen" replace />;
  }

  return <>{children}</>;
}
