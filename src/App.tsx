import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { KitchenRoute } from "@/components/auth/KitchenRoute";
import { RoleRedirect } from "@/components/auth/RoleRedirect";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { KitchenLayout } from "@/components/layout/KitchenLayout";
import { LoginPage } from "@/pages/auth/Login";
import { KitchenLoginPage } from "@/pages/auth/KitchenLogin";
import { SignUpPage } from "@/pages/auth/SignUp";
import { OnboardingPage } from "@/pages/auth/Onboarding";
import { MenuManagementPage } from "@/pages/admin/MenuManagement";
import { KitchenDashboardPage } from "@/pages/kitchen/KitchenDashboard";
import { TableManagementPage } from "@/pages/admin/TableManagement";
import { QRMenuPage } from "@/pages/public/QRMenu";
import { AuthCallback } from "@/pages/auth/AuthCallback";
import { Toaster } from "@/components/ui/sonner";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public auth routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/kitchen-login" element={<KitchenLoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Public QR menu route */}
        <Route path="/menu/:slug/:tableSlug" element={<QRMenuPage />} />

        {/* Admin routes — owner/manager only */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <DashboardLayout />
            </AdminRoute>
          }
        >
          <Route index element={<Navigate to="/admin/menu" replace />} />
          <Route path="menu" element={<MenuManagementPage />} />
          <Route path="tables" element={<TableManagementPage />} />
        </Route>

        {/* Kitchen routes — all authenticated members */}
        <Route
          path="/kitchen"
          element={
            <KitchenRoute>
              <KitchenLayout />
            </KitchenRoute>
          }
        >
          <Route index element={<Navigate to="/kitchen/orders" replace />} />
          <Route path="orders" element={<KitchenDashboardPage />} />
        </Route>



        {/* Role-based catch-all redirect */}
        <Route path="*" element={<RoleRedirect />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;
