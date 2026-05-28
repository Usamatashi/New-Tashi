import React, { lazy, Suspense } from "react";
import LazyScreenFallback from "@/components/LazyScreenFallback";

const UserPaymentsScreen = lazy(() => import("@/features/payments/UserPaymentsScreen"));

export default function UserPaymentsRoute() {
  return (
    <Suspense fallback={<LazyScreenFallback />}>
      <UserPaymentsScreen />
    </Suspense>
  );
}
