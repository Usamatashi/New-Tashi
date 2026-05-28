import React, { lazy, Suspense } from "react";
import LazyScreenFallback from "@/components/LazyScreenFallback";

const AdminProductsScreen = lazy(() => import("@/features/products/AdminProductsScreen"));

export default function AdminProductsRoute() {
  return (
    <Suspense fallback={<LazyScreenFallback />}>
      <AdminProductsScreen />
    </Suspense>
  );
}
