import React, { lazy, Suspense } from "react";
import LazyScreenFallback from "@/components/LazyScreenFallback";

const UserOrdersScreen = lazy(() => import("@/features/orders/UserOrdersScreen"));

export default function OrdersRoute() {
  return (
    <Suspense fallback={<LazyScreenFallback />}>
      <UserOrdersScreen />
    </Suspense>
  );
}
