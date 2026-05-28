import React, { lazy, Suspense } from "react";
import LazyScreenFallback from "@/components/LazyScreenFallback";

const CreateAccountScreen = lazy(() => import("@/features/admin/CreateAccountScreen"));

export default function CreateAccountRoute() {
  return (
    <Suspense fallback={<LazyScreenFallback />}>
      <CreateAccountScreen />
    </Suspense>
  );
}
