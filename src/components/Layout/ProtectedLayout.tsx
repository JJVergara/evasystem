import { Outlet } from "react-router-dom";
import { MainLayout } from "./MainLayout";
import { ProtectedRoute } from "@/components/Auth/ProtectedRoute";

export function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <Outlet />
      </MainLayout>
    </ProtectedRoute>
  );
}
