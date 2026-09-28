"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";


async function getStaff() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");
  return user;
}

const DEFAULT_LAB_TESTS = [
  "Fhg",
  "Pregnancy test",
  "Bs for malaria",
  "H.pylori",
  "HIV",
  "Syphilis",
  "Urinalysis",
  "Blood sugar",
  "Typhoid",
];

export async function getLabTests() {
  await getStaff();

  let extra = [];
  try {
    extra = await db.labTest.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
  } catch (e) {
    console.error("LabTest error – run: npx prisma db push && npx prisma generate", e);
  }

  const defaults = DEFAULT_LAB_TESTS.map((name) => {
    const fromDb = extra.find(
      (t) => t.name.toLowerCase() === name.toLowerCase()
    );
    return {
      id: fromDb?.id || `default-${name}`,
      name,
      price: fromDb?.price ?? 0,
      isDefault: true,
      fromDb: !!fromDb,
    };
  });

  const custom = extra
    .filter(
      (t) =>
        !DEFAULT_LAB_TESTS.some(
          (d) => d.toLowerCase() === t.name.toLowerCase()
        )
    )
    .map((t) => ({
      id: t.id,
      name: t.name,
      price: t.price,
      isDefault: false,
      fromDb: true,
    }));

  return { tests: [...defaults, ...custom] };
}

export async function createLabTest(formData) {
  await getStaff();

  const name = formData.get("name")?.toString().trim();
  const price = parseFloat(formData.get("price") || "0");

  if (!name) throw new Error("Test name is required");

  const existing = await db.labTest.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });

  if (existing) {
    await db.labTest.update({
      where: { id: existing.id },
      data: { price: isNaN(price) ? existing.price : price, isActive: true },
    });
  } else {
    await db.labTest.create({
      data: {
        name,
        price: isNaN(price) ? 0 : price,
      },
    });
  }

  revalidatePath("/staff/laboratory");
  return { success: true };
}

export async function updateLabTest(formData) {
  await getStaff();

  const id = formData.get("id");
  const name = formData.get("name")?.toString().trim();
  const price = parseFloat(formData.get("price") || "0");

  if (!id) throw new Error("ID required");
  if (String(id).startsWith("default-")) {
    throw new Error("Save this test first with Create");
  }

  await db.labTest.update({
    where: { id },
    data: {
      ...(name ? { name } : {}),
      price: isNaN(price) ? 0 : price,
    },
  });

  revalidatePath("/staff/laboratory");
  return { success: true };
}

/**
 * Soft-delete a lab test (sets isActive = false).
 * Default (virtual) tests can't be deleted — they always render.
 * Only DB-backed tests can be archived.
 */
export async function deleteLabTest(formData) {
  await getStaff();

  const id = formData.get("id");
  if (!id) throw new Error("Lab test ID required");

  if (String(id).startsWith("default-")) {
    throw new Error("Default tests cannot be deleted");
  }

  await db.labTest.update({
    where: { id },
    data: { isActive: false },
  });

  revalidatePath("/staff/laboratory");
  return { success: true };
}

/**
 * Optional: restore an archived lab test.
 */
export async function restoreLabTest(formData) {
  await getStaff();

  const id = formData.get("id");
  if (!id) throw new Error("Lab test ID required");

  await db.labTest.update({
    where: { id },
    data: { isActive: true },
  });

  revalidatePath("/staff/laboratory");
  return { success: true };
}

export async function saveLabResultsForVisit(formData) {
  await getStaff();

  const visitId = formData.get("visitId");
  const resultsJson = formData.get("resultsJson");

  if (!visitId || !resultsJson) {
    throw new Error("Visit and results required");
  }

  const rows = JSON.parse(resultsJson);

  for (const row of rows) {
    if (!row.testName) continue;

    await db.labTestResult.create({
      data: {
        visitId,
        labTestId:
          row.labTestId && !String(row.labTestId).startsWith("default-")
            ? row.labTestId
            : null,
        testName: row.testName,
        result: row.result || null,
        price: parseFloat(row.price) || 0,
      },
    });
  }

  const summary = rows
    .filter((r) => r.testName && (r.result || r.price))
    .map((r) => `${r.testName}: ${r.result || "—"} (KES ${r.price || 0})`)
    .join("\n");

  if (summary) {
    const visit = await db.patientVisit.findUnique({
      where: { id: visitId },
    });

    await db.patientVisit.update({
      where: { id: visitId },
      data: {
        laboratoryNotes: [visit?.laboratoryNotes, summary]
          .filter(Boolean)
          .join("\n\n"),
      },
    });
  }

  revalidatePath("/staff");
  revalidatePath("/staff/laboratory");
  return { success: true };
}

export async function getLabResultsForVisit(visitId) {
  await getStaff();
  if (!visitId) return { results: [] };

  const results = await db.labTestResult.findMany({
    where: { visitId },
    orderBy: { createdAt: "asc" },
  });

  return { results };
}

export async function getMedicines() {
  await getStaff();

  const medicines = await db.medicine.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  return { medicines };
}

export async function createMedicine(formData) {
  await getStaff();

  const name = formData.get("name")?.toString().trim();
  const price = parseFloat(formData.get("price") || "0");
  const stock = parseInt(formData.get("stock") || "0", 10);

  if (!name) throw new Error("Medicine name is required");

  await db.medicine.create({
    data: {
      name,
      price: isNaN(price) ? 0 : price,
      stock: isNaN(stock) ? 0 : stock,
    },
  });

  revalidatePath("/staff/pharmacy");
  return { success: true };
}

export async function updateMedicine(formData) {
  await getStaff();

  const id = formData.get("id");
  const name = formData.get("name")?.toString().trim();
  const price = formData.get("price");

  if (!id) throw new Error("ID required");

  const data = {};
  if (name) data.name = name;
  if (price !== null && price !== undefined && price !== "") {
    data.price = parseFloat(price) || 0;
  }

  await db.medicine.update({ where: { id }, data });
  revalidatePath("/staff/pharmacy");
  return { success: true };
}

export async function receiveMedicineStock(formData) {
  const staff = await getStaff();

  const medicineId = formData.get("medicineId");
  const quantity = parseInt(formData.get("quantity") || "0", 10);
  const note = formData.get("note") || null;

  if (!medicineId || !quantity || quantity <= 0) {
    throw new Error("Medicine and positive quantity required");
  }

  await db.$transaction([
    db.medicine.update({
      where: { id: medicineId },
      data: { stock: { increment: quantity } },
    }),
    db.medicineStockLog.create({
      data: {
        medicineId,
        quantity,
        note,
        createdBy: staff.name || staff.email,
      },
    }),
  ]);

  revalidatePath("/staff/pharmacy");
  return { success: true };
}

/**
 * Sales ledger — every sale recorded via sellMedicine().
 * A sale is a MedicineStockLog row with negative quantity.
 */
export async function getSalesLog({ limit = 200 } = {}) {
  await getStaff();

  const sales = await db.medicineStockLog.findMany({
    where: { quantity: { lt: 0 } }, // negative = sold
    include: {
      medicine: {
        select: { id: true, name: true, price: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return {
    sales: sales.map((s) => ({
      id: s.id,
      medicineId: s.medicineId,
      medicineName: s.medicine?.name || "—",
      unitPrice: s.medicine?.price ?? 0,
      quantitySold: Math.abs(s.quantity),
      total: Math.abs(s.quantity) * (s.medicine?.price ?? 0),
      note: s.note || "",
      soldBy: s.createdBy || "—",
      createdAt: s.createdAt,
    })),
  };
}

/**
 * Delete a sales record.
 *
 * options.restoreStock:
 *   true  → also increments medicine.stock back by the sold quantity
 *           (undo a sale entirely)
 *   false → only removes the log entry (audit cleanup; stock unchanged)
 */
export async function deleteSale(formData) {
  await getStaff();

  const id = formData.get("id");
  const restoreStock = formData.get("restoreStock") === "true";

  if (!id) throw new Error("Sale ID required");

  const log = await db.medicineStockLog.findUnique({
    where: { id },
  });

  if (!log) throw new Error("Sale record not found");

  // Only sales (negative quantity) can be removed via this action —
  // receipts are handled by receiveMedicineStock and should not be
  // deletable here.
  if (log.quantity >= 0) {
    throw new Error("Only sales records can be deleted here");
  }

  const unitsSold = Math.abs(log.quantity);

  if (restoreStock) {
    await db.$transaction([
      db.medicine.update({
        where: { id: log.medicineId },
        data: { stock: { increment: unitsSold } },
      }),
      db.medicineStockLog.delete({ where: { id } }),
    ]);
  } else {
    await db.medicineStockLog.delete({ where: { id } });
  }

  revalidatePath("/staff/pharmacy");
  return { success: true, restored: restoreStock, unitsSold };
}

/**
 * Sales summary — daily totals for the last N days.
 */
export async function getSalesSummary({ days = 30 } = {}) {
  await getStaff();

  const since = new Date();
  since.setDate(since.getDate() - days);

  const sales = await db.medicineStockLog.findMany({
    where: {
      quantity: { lt: 0 },
      createdAt: { gte: since },
    },
    include: {
      medicine: { select: { price: true } },
    },
  });

  const byDay = {};
  let totalRevenue = 0;
  let totalUnits = 0;

  for (const s of sales) {
    const units = Math.abs(s.quantity);
    const revenue = units * (s.medicine?.price ?? 0);
    totalRevenue += revenue;
    totalUnits += units;

    const day = s.createdAt.toISOString().slice(0, 10);
    byDay[day] = byDay[day] || { date: day, units: 0, revenue: 0 };
    byDay[day].units += units;
    byDay[day].revenue += revenue;
  }

  return {
    summary: {
      totalRevenue,
      totalUnits,
      salesCount: sales.length,
      days: Object.values(byDay).sort((a, b) =>
        a.date < b.date ? 1 : -1
      ),
    },
  };
}


/**
 * Sell / dispense medicine — deducts from stock and logs the movement.
 * Logs a negative quantity so receiveMedicineStock + sellMedicine share
 * the same audit table.
 */
export async function sellMedicine(formData) {
  const staff = await getStaff();

  const medicineId = formData.get("medicineId");
  const quantity = parseInt(formData.get("quantity") || "0", 10);
  const note = formData.get("note") || null;

  if (!medicineId || !quantity || quantity <= 0) {
    throw new Error("Medicine and positive quantity required");
  }

  const medicine = await db.medicine.findUnique({
    where: { id: medicineId },
  });

  if (!medicine) throw new Error("Medicine not found");

  if (medicine.stock < quantity) {
    throw new Error(
      `Not enough stock. Available: ${medicine.stock}, requested: ${quantity}`
    );
  }

  await db.$transaction([
    db.medicine.update({
      where: { id: medicineId },
      data: { stock: { decrement: quantity } },
    }),
    db.medicineStockLog.create({
      data: {
        medicineId,
        quantity: -quantity, // negative = sold/dispensed
        note: note || `Sold ${quantity} unit(s)`,
        createdBy: staff.name || staff.email,
      },
    }),
  ]);

  revalidatePath("/staff/pharmacy");
  return { success: true, sold: quantity };
}



/**
 * Soft-delete a medicine (sets isActive = false).
 * Keeps historical MedicineStockLog / prescription references intact.
 */
export async function deleteMedicine(formData) {
  await getStaff();

  const id = formData.get("id");
  if (!id) throw new Error("Medicine ID required");

  // Only allow archive — do NOT hard delete, because past visits may
  // reference this medicine by name / id in medicinesJson.
  await db.medicine.update({
    where: { id },
    data: { isActive: false },
  });

  revalidatePath("/staff/pharmacy");
  return { success: true };
}

/**
 * Optional: restore an archived medicine.
 */
export async function restoreMedicine(formData) {
  await getStaff();

  const id = formData.get("id");
  if (!id) throw new Error("Medicine ID required");

  await db.medicine.update({
    where: { id },
    data: { isActive: true },
  });

  revalidatePath("/staff/pharmacy");
  return { success: true };
}