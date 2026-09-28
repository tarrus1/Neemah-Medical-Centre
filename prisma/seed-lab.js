// actions/lab-pharmacy.js
"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

async function getStaff() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const user = await db.user.findUnique({ where: { clerkUserId: userId } });
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

export async function seedLabTests() {
  await getStaff();
  for (const name of DEFAULT_LAB_TESTS) {
    const exists = await db.labTest.findFirst({ where: { name } });
    if (!exists) {
      await db.labTest.create({ data: { name, price: 0 } });
    }
  }
  revalidatePath("/staff/laboratory");
  return { success: true };
}

// ——— LAB CATALOG ———
export async function getLabTests() {
  await getStaff();
  const tests = await db.labTest.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
  return { tests };
}

export async function createLabTest(formData) {
  await getStaff();
  const name = formData.get("name")?.toString().trim();
  const price = parseFloat(formData.get("price") || "0");
  if (!name) throw new Error("Test name is required");
  await db.labTest.create({ data: { name, price: isNaN(price) ? 0 : price } });
  revalidatePath("/staff/laboratory");
  return { success: true };
}

export async function updateLabTest(formData) {
  await getStaff();
  const id = formData.get("id");
  const name = formData.get("name")?.toString().trim();
  const price = parseFloat(formData.get("price") || "0");
  if (!id) throw new Error("ID required");
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

export async function saveLabResultsForVisit(formData) {
  await getStaff();
  const visitId = formData.get("visitId");
  const resultsJson = formData.get("resultsJson"); // [{ labTestId, testName, result, price }]
  if (!visitId || !resultsJson) throw new Error("Visit and results required");

  const rows = JSON.parse(resultsJson);
  for (const row of rows) {
    if (!row.testName) continue;
    await db.labTestResult.create({
      data: {
        visitId,
        labTestId: row.labTestId || null,
        testName: row.testName,
        result: row.result || null,
        price: parseFloat(row.price) || 0,
      },
    });
  }

  // Optional: append summary to laboratoryNotes
  const summary = rows
    .filter((r) => r.testName)
    .map(
      (r) =>
        `${r.testName}: ${r.result || "—"} (KES ${r.price || 0})`
    )
    .join("\n");
  if (summary) {
    const visit = await db.patientVisit.findUnique({ where: { id: visitId } });
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

// ——— PHARMACY CATALOG ———
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

/** Record received stock (adds to inventory) */
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