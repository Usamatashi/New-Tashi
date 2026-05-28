import React, { lazy, Suspense } from "react";
import LazyScreenFallback from "@/components/LazyScreenFallback";

const AdminOrdersScreen = lazy(() => import("@/features/orders/AdminOrdersScreen"));

export default function AdminOrdersRoute() {
  return (
    <Suspense fallback={<LazyScreenFallback />}>
      <AdminOrdersScreen />
    </Suspense>
  );
}
