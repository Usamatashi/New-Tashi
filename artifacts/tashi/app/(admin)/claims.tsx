import React, { lazy, Suspense } from "react";
import LazyScreenFallback from "@/components/LazyScreenFallback";

const AdminClaimsScreen = lazy(() => import("@/features/claims/AdminClaimsScreen"));

export default function AdminClaimsRoute() {
  return (
    <Suspense fallback={<LazyScreenFallback />}>
      <AdminClaimsScreen />
    </Suspense>
  );
}
