import { Navigate } from "react-router-dom";
import { useRestaurantStore } from "@/store/useRestaurantStore";
import { canAccessAdmin } from "@/types/roles";

/**
 * Catch-all redirect that sends users to the correct surface
 * based on their role:
 *   - owner / manager → /admin
 *   - staff → /kitchen
 *
 * If the store isn't populated yet (e.g., user navigated directly
 * to an unknown URL without being authenticated), defaults to /admin.
 * AdminRoute → ProtectedRoute will then handle the auth flow.
 */
export function RoleRedirect() {
  const { activeMemberRole, currentRestaurant } = useRestaurantStore();

  if (!currentRestaurant || !activeMemberRole) {
    return <Navigate to="/admin" replace />;
  }

  if (canAccessAdmin(activeMemberRole)) {
    return <Navigate to="/admin" replace />;
  }

  return <Navigate to="/kitchen" replace />;
}
