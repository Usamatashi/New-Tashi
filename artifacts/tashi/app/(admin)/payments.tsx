import React, { lazy, Suspense } from "react";
import LazyScreenFallback from "@/components/LazyScreenFallback";

const AdminPaymentsScreen = lazy(() => import("@/features/payments/AdminPaymentsScreen"));

export default function AdminPaymentsRoute() {
  return (
    <Suspense fallback={<LazyScreenFallback />}>
      <AdminPaymentsScreen />
    </Suspense>
  );
}
