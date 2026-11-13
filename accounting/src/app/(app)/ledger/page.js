
import React, { Suspense } from "react";
import Ledger from "@/features/ledger/ledger"

export const metadata = {
  title: "Ledger",
};

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 p-4">
          <div className="h-10 w-48 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-32 animate-pulse rounded-2xl bg-gray-200" />
          <div className="h-64 animate-pulse rounded-2xl bg-gray-200" />
        </div>
      }
    >
      <Ledger />
    </Suspense>
  );
}
