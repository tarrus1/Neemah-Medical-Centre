"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

async function getCurrentStaff() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");
  return user;
}

export async function createPatientVisit(formData) {
  const staff = await getCurrentStaff();

  if (!["RECEPTIONIST", "ADMIN", "DOCTOR"].includes(staff.role)) {
    throw new Error("Only Reception can register patients");
  }

  const firstName = formData.get("firstName")?.toString().trim() || "";
  const middleName = formData.get("middleName")?.toString().trim() || "";
  const lastName = formData.get("lastName")?.toString().trim() || "";
  const idNumber = formData.get("idNumber") || null;
  const phoneNumber = formData.get("phoneNumber") || null;
  const gender = formData.get("gender") || null;
  const medicalHistory = formData.get("medicalHistory") || null;
  const birthInput = formData.get("birthInput")?.toString().trim() || "";

  if (!firstName || !lastName) {
    throw new Error("First name and last name are required");
  }

  const fullName = [firstName, middleName, lastName].filter(Boolean).join(" ");

  let birthYear = null;
  let dateOfBirth = null;

  if (birthInput) {
    if (/^\d{4}$/.test(birthInput)) {
      birthYear = parseInt(birthInput, 10);
    } else {
      const parsed = new Date(birthInput);
      if (!isNaN(parsed.getTime())) {
        dateOfBirth = parsed;
        birthYear = parsed.getFullYear();
      } else {
        const parts = birthInput.split(/[\/\-]/);
        if (parts.length === 3) {
          const [d, m, y] = parts.map((p) => parseInt(p, 10));
          if (y && m && d) {
            const dt = new Date(y, m - 1, d);
            if (!isNaN(dt.getTime())) {
              dateOfBirth = dt;
              birthYear = y;
            }
          }
        }
      }
    }
  }

  const visit = await db.patientVisit.create({
    data: {
      firstName,
      middleName: middleName || null,
      lastName,
      fullName,
      idNumber,
      phoneNumber,
      gender,
      medicalHistory,
      birthYear,
      dateOfBirth,
      doctorId: staff.role === "DOCTOR" ? staff.id : null,
      status: "REGISTERED",
    },
  });

  revalidatePath("/staff");
  revalidatePath("/doctor");
  return { success: true, visit };
}

/**
 * Update notes / price / treatment / medicines / status
 */
export async function updatePatientVisit(formData) {
  await getCurrentStaff();

  const visitId = formData.get("visitId");
  const triageNotes = formData.get("triageNotes");
  const doctorNotes = formData.get("doctorNotes");
  const laboratoryNotes = formData.get("laboratoryNotes");
  const pharmacyNotes = formData.get("pharmacyNotes");
  const totalPrice = formData.get("totalPrice");
  const status = formData.get("status");
  const treatmentText = formData.get("treatmentText");
  const medicinesJson = formData.get("medicinesJson");

  const bpSystolic = formData.get("bpSystolic");
  const bpDiastolic = formData.get("bpDiastolic");
  const heartRate = formData.get("heartRate");
  const respiratoryRate = formData.get("respiratoryRate");
  const temperature = formData.get("temperature");
  const spo2 = formData.get("spo2");

  if (!visitId) throw new Error("Visit ID is required");

  const data = {};

  if (triageNotes !== null && triageNotes !== undefined) data.triageNotes = triageNotes;
  if (doctorNotes !== null && doctorNotes !== undefined) data.doctorNotes = doctorNotes;
  if (laboratoryNotes !== null && laboratoryNotes !== undefined)
    data.laboratoryNotes = laboratoryNotes;
  if (pharmacyNotes !== null && pharmacyNotes !== undefined) data.pharmacyNotes = pharmacyNotes;
  if (totalPrice) data.totalPrice = parseFloat(totalPrice);
  if (status) data.status = status;
  if (treatmentText !== null && treatmentText !== undefined) data.treatmentText = treatmentText;
  if (medicinesJson !== null && medicinesJson !== undefined) data.medicinesJson = medicinesJson;

  if (bpSystolic) data.bpSystolic = parseInt(bpSystolic, 10);
  if (bpDiastolic) data.bpDiastolic = parseInt(bpDiastolic, 10);
  if (heartRate) data.heartRate = parseInt(heartRate, 10);
  if (respiratoryRate) data.respiratoryRate = parseInt(respiratoryRate, 10);
  if (temperature) data.temperature = parseFloat(temperature);
  if (spo2) data.spo2 = parseInt(spo2, 10);

  const visit = await db.patientVisit.update({
    where: { id: visitId },
    data,
  });

  revalidatePath("/staff");
  revalidatePath("/doctor");
  return { success: true, visit };
}

/**
 * Legacy simple handoff. Kept for compatibility — no longer creates a
 * "Patient moved from X to Y" message when none was typed.
 */
export async function sendToNextStage(formData) {
  const staff = await getCurrentStaff();

  const visitId = formData.get("visitId");
  const nextStatus = formData.get("nextStatus");
  const message = formData.get("message")?.toString().trim() || "";

  if (!visitId || !nextStatus) {
    throw new Error("Visit ID and next status are required");
  }

  const visit = await db.patientVisit.findUnique({
    where: { id: visitId },
  });
  if (!visit) throw new Error("Patient not found");

  const fromStatus = visit.status;

  await db.patientVisit.update({
    where: { id: visitId },
    data: { status: nextStatus },
  });

  // Movement always records the handoff (audit trail).
  // message is null when empty — the UI renders "—" instead of noise.
  await db.patientMovement.create({
    data: {
      visitId,
      fromStatus,
      toStatus: nextStatus,
      message: message || null,
      createdBy: staff.name || staff.email,
    },
  });

  // Only create a notification when there's actual content to deliver
  if (message) {
    await db.notification.create({
      data: {
        visitId,
        toStatus: nextStatus,
        message,
      },
    });
  }

  revalidatePath("/staff");
  revalidatePath("/doctor");
  return { success: true };
}

export async function sendPatientMessage(formData) {
  const staff = await getCurrentStaff();

  const visitId = formData.get("visitId");
  const receiverRole = formData.get("receiverRole");
  const notesField = formData.get("notesField");
  const notes = formData.get("notes") || "";
  const totalPrice = formData.get("totalPrice");
  const treatmentText = formData.get("treatmentText");
  const medicinesJson = formData.get("medicinesJson");
  const referralsJson = formData.get("referralsJson");
  const billItemsJson = formData.get("billItemsJson");

  const bpSystolic = formData.get("bpSystolic");
  const bpDiastolic = formData.get("bpDiastolic");
  const heartRate = formData.get("heartRate");
  const respiratoryRate = formData.get("respiratoryRate");
  const temperature = formData.get("temperature");
  const spo2 = formData.get("spo2");

  let message = formData.get("message");
  let finalMessage = message ? String(message).trim() : "";

  // Build message from vitals when Triage sends (no free-text required)
  if (
    !finalMessage &&
    (bpSystolic || heartRate || temperature || spo2 || respiratoryRate)
  ) {
    finalMessage = [
      bpSystolic && bpDiastolic && `BP: ${bpSystolic}/${bpDiastolic} mmHg`,
      heartRate && `Pulse: ${heartRate} bpm`,
      respiratoryRate && `RR: ${respiratoryRate} /min`,
      temperature && `Temp: ${temperature} °C`,
      spo2 && `SpO2: ${spo2}%`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (!visitId) throw new Error("Visit ID is required");
  if (!receiverRole) throw new Error("Please select where to send");

  const visit = await db.patientVisit.findUnique({
    where: { id: visitId },
  });
  if (!visit) throw new Error("Patient not found");

  const senderRole = visit.status;

  // Note: no fallback "Patient moved from..." message.
  // If nothing was typed and there are no vitals, finalMessage stays "".

  // ── Parse + validate referrals ──
  const REFERRAL_AWARE_ROLES = ["TRIAGE", "LABORATORY", "PHARMACY"];

  let referrals = null;
  if (referralsJson && REFERRAL_AWARE_ROLES.includes(receiverRole)) {
    try {
      const parsed = JSON.parse(referralsJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        referrals = Array.from(
          new Set(
            parsed
              .filter((r) => typeof r === "string" && r.trim().length > 0)
              .map((r) => r.trim())
          )
        );
      }
    } catch {
      referrals = null;
    }
  }

  // ── Parse + append bill items ──
  let incomingBillItems = [];
  if (billItemsJson) {
    try {
      const parsed = JSON.parse(billItemsJson);
      if (Array.isArray(parsed)) {
        incomingBillItems = parsed
          .filter(
            (it) =>
              it &&
              typeof it.label === "string" &&
              it.label.trim().length > 0
          )
          .map((it) => ({
            label: it.label.trim(),
            amount: parseFloat(it.amount) || 0,
            dept: senderRole,
            at: new Date().toISOString(),
            by: staff.name || staff.email,
          }));
      }
    } catch {
      incomingBillItems = [];
    }
  }

  const data = {};
  if (notesField && notes !== undefined) data[notesField] = notes;
  if (treatmentText !== null && treatmentText !== undefined) {
    data.treatmentText = treatmentText;
  }
  if (medicinesJson !== null && medicinesJson !== undefined) {
    data.medicinesJson = medicinesJson;
  }

  if (bpSystolic) data.bpSystolic = parseInt(bpSystolic, 10);
  if (bpDiastolic) data.bpDiastolic = parseInt(bpDiastolic, 10);
  if (heartRate) data.heartRate = parseInt(heartRate, 10);
  if (respiratoryRate) data.respiratoryRate = parseInt(respiratoryRate, 10);
  if (temperature) data.temperature = parseFloat(temperature);
  if (spo2) data.spo2 = parseInt(spo2, 10);

  // Store referrals on the visit
  data.referrals = referrals;

  // Append bill items to running bill
  if (incomingBillItems.length > 0) {
    const existingItems = Array.isArray(visit.billItems)
      ? visit.billItems
      : [];

    const updatedItems = [...existingItems, ...incomingBillItems];
    const subtotal = updatedItems.reduce(
      (sum, it) => sum + (parseFloat(it.amount) || 0),
      0
    );

    data.billItems = updatedItems;
    data.billSubtotal = subtotal;
    data.totalPrice = subtotal;
  } else if (totalPrice) {
    data.totalPrice = parseFloat(totalPrice);
  }

  // Store vitals summary in triageNotes when Triage sends
  if (senderRole === "TRIAGE" && finalMessage) {
    data.triageNotes = finalMessage;
  }

  data.status = receiverRole;

  await db.patientVisit.update({
    where: { id: visitId },
    data,
  });

  // Only create a PatientMessage row when there's real content
  if (finalMessage && finalMessage.trim().length > 0) {
    await db.patientMessage.create({
      data: {
        visitId,
        senderRole,
        receiverRole,
        message: finalMessage,
      },
    });
  }

  // Movement always records the handoff (audit trail).
  await db.patientMovement.create({
    data: {
      visitId,
      fromStatus: senderRole,
      toStatus: receiverRole,
      message: finalMessage || null,
      createdBy: staff.name || staff.email,
    },
  });

  // Notification only when there's real content
  if (finalMessage && finalMessage.trim().length > 0) {
    await db.notification.create({
      data: {
        visitId,
        toStatus: receiverRole,
        message: `Update from ${senderRole}: ${finalMessage.slice(0, 80)}`,
      },
    });
  }

  revalidatePath("/staff");
  revalidatePath("/doctor");
  return { success: true };
}

export async function getPatientMessages(visitId) {
  await getCurrentStaff();
  if (!visitId) return { messages: [] };

  const messages = await db.patientMessage.findMany({
    where: { visitId },
    orderBy: { createdAt: "asc" },
  });

  return { messages };
}

export async function deletePatientVisit(formData) {
  const staff = await getCurrentStaff();

  if (!["RECEPTIONIST", "ADMIN", "DOCTOR"].includes(staff.role)) {
    throw new Error("Not authorized to delete");
  }

  const visitId = formData.get("visitId");
  if (!visitId) throw new Error("Visit ID is required");

  await db.patientVisit.delete({
    where: { id: visitId },
  });

  revalidatePath("/staff");
  revalidatePath("/doctor");
  return { success: true };
}

export async function getPatientVisitsByStatus(status, search = "") {
  await getCurrentStaff();

  const visits = await db.patientVisit.findMany({
    where: {
      status: { not: "COMPLETED" },
      AND: [
        {
          OR: [
            { status: status },
            { movements: { some: { fromStatus: status } } },
            { movements: { some: { toStatus: status } } },
          ],
        },
        search
          ? {
              OR: [
                { fullName: { contains: search, mode: "insensitive" } },
                { idNumber: { contains: search, mode: "insensitive" } },
                { phoneNumber: { contains: search, mode: "insensitive" } },
              ],
            }
          : {},
      ],
    },
    include: {
      movements: { orderBy: { createdAt: "desc" }, take: 10 },
      messages: { orderBy: { createdAt: "desc" }, take: 5 },
    },
    orderBy: { updatedAt: "desc" },
  });

  return { visits };
}

export async function getPatientVisits(search = "") {
  await getCurrentStaff();

  const visits = await db.patientVisit.findMany({
    where: search
      ? {
          OR: [
            { fullName: { contains: search, mode: "insensitive" } },
            { idNumber: { contains: search, mode: "insensitive" } },
            { phoneNumber: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: {
      movements: { orderBy: { createdAt: "desc" }, take: 10 },
      messages: { orderBy: { createdAt: "desc" }, take: 5 },
    },
    orderBy: { createdAt: "desc" },
  });

  return { visits };
}

export async function getNotifications(status) {
  await getCurrentStaff();

  if (!status) return { notifications: [] };

  const notifications = await db.notification.findMany({
    where: {
      toStatus: { equals: status, mode: "insensitive" },
      isRead: false,
    },
    include: { visit: true },
    orderBy: { createdAt: "desc" },
  });

  return { notifications };
}

export async function markNotificationRead(formData) {
  await getCurrentStaff();
  const id = formData.get("id");
  if (!id) throw new Error("Notification ID required");

  await db.notification.update({
    where: { id },
    data: { isRead: true },
  });

  revalidatePath("/staff");
  return { success: true };
}

export async function getDepartmentHistory(status, search = "") {
  await getCurrentStaff();

  const movements = await db.patientMovement.findMany({
    where: { fromStatus: status },
    include: { visit: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const visitsMap = new Map();
  movements.forEach((m) => {
    if (m.visit) {
      visitsMap.set(m.visit.id, {
        ...m.visit,
        lastSentTo: m.toStatus,
        sentAt: m.createdAt,
        sendMessage: m.message,
      });
    }
  });

  let visits = Array.from(visitsMap.values());

  if (search) {
    const s = search.toLowerCase();
    visits = visits.filter(
      (v) =>
        v.fullName?.toLowerCase().includes(s) ||
        v.idNumber?.toLowerCase().includes(s) ||
        v.phoneNumber?.toLowerCase().includes(s)
    );
  }

  return { visits };
}

export async function editPatientVisitDetails(formData) {
  const staff = await getCurrentStaff();

  if (!["RECEPTIONIST", "ADMIN", "DOCTOR"].includes(staff.role)) {
    throw new Error("Not authorized to edit patient details");
  }

  const visitId = formData.get("visitId");
  const fullName = formData.get("fullName");
  const idNumber = formData.get("idNumber") || null;
  const phoneNumber = formData.get("phoneNumber") || null;

  if (!visitId) throw new Error("Visit ID is required");
  if (!fullName) throw new Error("Full name is required");

  const visit = await db.patientVisit.update({
    where: { id: visitId },
    data: { fullName, idNumber, phoneNumber },
  });

  revalidatePath("/staff");
  revalidatePath("/doctor");
  return { success: true, visit };
}

export async function generateReceipt(formData) {
  const staff = await getCurrentStaff();

  const visitId = formData.get("visitId");
  const receiptNotesFromClient = formData.get("receiptNotes") || "";

  if (!visitId) throw new Error("Visit ID is required");

  const visit = await db.patientVisit.findUnique({
    where: { id: visitId },
  });
  if (!visit) throw new Error("Patient not found");

  let medsText = "";
  try {
    const meds = visit.medicinesJson ? JSON.parse(visit.medicinesJson) : [];
    if (Array.isArray(meds) && meds.length) {
      medsText = meds
        .filter((m) => m?.name)
        .map(
          (m, i) =>
            `${i + 1}. ${m.name}${m.dose ? ` — ${m.dose}` : ""} [${
              m.available === false ? "NOT AVAILABLE" : "Available"
            }]`
        )
        .join("\n");
    }
  } catch (_) {}

  const autoNotes = [
    visit.treatmentText && `TREATMENT:\n${visit.treatmentText}`,
    visit.triageNotes && `Triage:\n${visit.triageNotes}`,
    visit.doctorNotes && `Doctor / Treatment:\n${visit.doctorNotes}`,
    visit.laboratoryNotes && `Laboratory:\n${visit.laboratoryNotes}`,
    medsText && `MEDICINE GIVEN:\n${medsText}`,
    visit.pharmacyNotes && `Pharmacy notes:\n${visit.pharmacyNotes}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const finalNotes =
    receiptNotesFromClient || autoNotes || "No treatment details recorded.";

  const updated = await db.patientVisit.update({
    where: { id: visitId },
    data: {
      receiptNotes: finalNotes,
      receiptReady: true,
      receiptPrinted: false,
    },
  });

  await db.notification.create({
    data: {
      visitId,
      toStatus: "REGISTERED",
      message: `Receipt ready for ${visit.fullName} – please print`,
    },
  });

  await db.patientMovement.create({
    data: {
      visitId,
      fromStatus: visit.status,
      toStatus: "REGISTERED",
      message: "Receipt sent to Reception for printing",
      createdBy: staff.name || staff.email,
    },
  });

  revalidatePath("/staff");
  return { success: true, visit: updated };
}

export async function markReceiptPrinted(formData) {
  await getCurrentStaff();
  const visitId = formData.get("visitId");
  if (!visitId) throw new Error("Visit ID is required");

  await db.patientVisit.update({
    where: { id: visitId },
    data: { receiptPrinted: true },
  });

  revalidatePath("/staff");
  return { success: true };
}

export async function getReadyReceipts() {
  await getCurrentStaff();

  const visits = await db.patientVisit.findMany({
    where: {
      receiptReady: true,
      receiptPrinted: false,
    },
    orderBy: { updatedAt: "desc" },
  });

  return { visits };
}

export async function getReceptionStats() {
  await getCurrentStaff();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  weekStart.setHours(0, 0, 0, 0);

  const [todayCount, weekCount, waiting, readyReceipts] = await Promise.all([
    db.patientVisit.count({ where: { createdAt: { gte: todayStart } } }),
    db.patientVisit.count({ where: { createdAt: { gte: weekStart } } }),
    db.patientVisit.count({ where: { status: "REGISTERED" } }),
    db.patientVisit.count({
      where: { receiptReady: true, receiptPrinted: false },
    }),
  ]);

  return {
    stats: {
      today: todayCount,
      week: weekCount,
      waiting,
      readyReceipts,
    },
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   CASHIER / BILLING
   ═══════════════════════════════════════════════════════════════════════ */

export async function addBillItem(formData) {
  const staff = await getCurrentStaff();

  const visitId = formData.get("visitId");
  const label = formData.get("label");
  const amount = formData.get("amount");
  const dept = formData.get("dept");

  if (!visitId || !label) throw new Error("Visit ID and label required");

  const visit = await db.patientVisit.findUnique({ where: { id: visitId } });
  if (!visit) throw new Error("Patient not found");

  const existing = Array.isArray(visit.billItems) ? visit.billItems : [];
  const parsedAmount = parseFloat(amount) || 0;

  const updatedItems = [
    ...existing,
    {
      label: String(label).trim(),
      amount: parsedAmount,
      dept: dept || visit.status,
      at: new Date().toISOString(),
      by: staff.name || staff.email,
    },
  ];

  const subtotal = updatedItems.reduce(
    (sum, it) => sum + (parseFloat(it.amount) || 0),
    0
  );

  await db.patientVisit.update({
    where: { id: visitId },
    data: {
      billItems: updatedItems,
      billSubtotal: subtotal,
      totalPrice: subtotal,
    },
  });

  revalidatePath("/staff");
  return { success: true, subtotal, items: updatedItems };
}

export async function confirmBillPaid(formData) {
  const staff = await getCurrentStaff();

  const visitId = formData.get("visitId");
  const billRef = formData.get("billRef") || null;
  const cashierNotes = formData.get("cashierNotes") || null;
  const waive = formData.get("waive") === "true";

  if (!visitId) throw new Error("Visit ID is required");

  const visit = await db.patientVisit.findUnique({ where: { id: visitId } });
  if (!visit) throw new Error("Patient not found");

  const updated = await db.patientVisit.update({
    where: { id: visitId },
    data: {
      billPaid: waive ? false : true,
      billPaidAt: new Date(),
      billPaidBy: staff.name || staff.email,
      billRef: billRef || (waive ? "WAIVED" : null),
      cashierNotes,
      status: "COMPLETED",
      receiptReady: true,
      receiptPrinted: false,
    },
  });

  await db.patientMovement.create({
    data: {
      visitId,
      fromStatus: "CASHIER",
      toStatus: "COMPLETED",
      message: waive
        ? `Bill waived — KES ${visit.billSubtotal || 0}`
        : `Paid — KES ${visit.billSubtotal || 0}${
            billRef ? ` (${billRef})` : ""
          }`,
      createdBy: staff.name || staff.email,
    },
  });

  revalidatePath("/staff");
  return { success: true, visit: updated };
}

export async function getCashierStats() {
  await getCurrentStaff();

  const now = new Date();

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);
  weekStart.setHours(0, 0, 0, 0);

  const monthStart = new Date(now);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [todayAgg, weekAgg, monthAgg, waiting, unpaid] = await Promise.all([
    db.patientVisit.aggregate({
      where: { billPaidAt: { gte: todayStart }, billPaid: true },
      _sum: { billSubtotal: true },
      _count: true,
    }),
    db.patientVisit.aggregate({
      where: { billPaidAt: { gte: weekStart }, billPaid: true },
      _sum: { billSubtotal: true },
      _count: true,
    }),
    db.patientVisit.aggregate({
      where: { billPaidAt: { gte: monthStart }, billPaid: true },
      _sum: { billSubtotal: true },
      _count: true,
    }),
    db.patientVisit.count({ where: { status: "CASHIER" } }),
    db.patientVisit.count({
      where: { status: "CASHIER", billPaid: false },
    }),
  ]);

  return {
    stats: {
      todayRevenue: todayAgg._sum.billSubtotal || 0,
      todayTxns: todayAgg._count || 0,
      weekRevenue: weekAgg._sum.billSubtotal || 0,
      weekTxns: weekAgg._count || 0,
      monthRevenue: monthAgg._sum.billSubtotal || 0,
      monthTxns: monthAgg._count || 0,
      waiting: waiting || 0,
      unpaid: unpaid || 0,
    },
  };
}

export async function getCashierHistory({ limit = 100, search = "" } = {}) {
  await getCurrentStaff();

  const visits = await db.patientVisit.findMany({
    where: {
      billPaid: true,
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: "insensitive" } },
              { idNumber: { contains: search, mode: "insensitive" } },
              { billRef: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { billPaidAt: "desc" },
    take: limit,
  });

  return { visits };
}

/* ═══════════════════════════════════════════════════════════════════════
   NOTIFICATIONS (header bell)
   ═══════════════════════════════════════════════════════════════════════ */

export async function getNotificationCount(status) {
  await getCurrentStaff();

  if (!status) return { count: 0 };

  const count = await db.notification.count({
    where: {
      toStatus: { equals: status, mode: "insensitive" },
      isRead: false,
    },
  });

  return { count };
}

export async function getLatestNotifications(status, limit = 8) {
  await getCurrentStaff();

  if (!status) return { notifications: [] };

  const notifications = await db.notification.findMany({
    where: {
      toStatus: { equals: status, mode: "insensitive" },
      isRead: false,
    },
    include: {
      visit: {
        select: {
          id: true,
          fullName: true,
          idNumber: true,
          phoneNumber: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return { notifications };
}

export async function markAllNotificationsRead(status) {
  await getCurrentStaff();

  if (!status) return { success: false };

  await db.notification.updateMany({
    where: {
      toStatus: { equals: status, mode: "insensitive" },
      isRead: false,
    },
    data: { isRead: true },
  });

  revalidatePath("/staff");
  return { success: true };
}