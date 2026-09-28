"use client";

import { useState } from "react";
import { DepartmentQueue } from "../../_components/department-queue";
import { PharmacyCatalog } from "../../_components/pharmacy-catalog";
import { SalesLog } from "../../_components/sales-log";

export function PharmacyClient() {
  // Bumping this key tells SalesLog to refetch after a successful sale.
  const [salesRefreshKey, setSalesRefreshKey] = useState(0);

  return (
    <div className="space-y-6">
      {/* 1. Inventory — where sales happen */}
      <PharmacyCatalog onSale={() => setSalesRefreshKey((k) => k + 1)} />

      {/* 2. Sales record — auto-refreshes on new sale */}
      <SalesLog refreshKey={salesRefreshKey} />

      {/* 3. Patient queue */}
      <DepartmentQueue
        title="Pharmacy"
        currentStatus="PHARMACY"
        notesField="pharmacyNotes"
        showPrice={true}
        canSendAnywhere={true}
      />
    </div>
  );
}