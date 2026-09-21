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

  const fullName = formData.get("fullName");
  const idNumber = formData.get("idNumber") || null;
  const phoneNumber = formData.get("phoneNumber") || null;

  if (!fullName) throw new Error("Patient full name is required");

  const visit = await db.patientVisit.create({
    data: {
      fullName,
      idNumber,
      phoneNumber,
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

  const visit = await db.patientVisit.update({
    where: { id: visitId },
    data,
  });

  revalidatePath("/staff");
  revalidatePath("/doctor");
  return { success: true, visit };
}

export async function sendToNextStage(formData) {
  const staff = await getCurrentStaff();

  const visitId = formData.get("visitId");
  const nextStatus = formData.get("nextStatus");
  const message = formData.get("message") || "";

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

  await db.patientMovement.create({
    data: {
      visitId,
      fromStatus,
      toStatus: nextStatus,
      message: message || `Sent from ${fromStatus} to ${nextStatus}`,
      createdBy: staff.name || staff.email,
    },
  });

  await db.notification.create({
    data: {
      visitId,
      toStatus: nextStatus,
      message:
        message ||
        `New patient: ${visit.fullName} has been sent to you from ${fromStatus}`,
    },
  });

  revalidatePath("/staff");
  revalidatePath("/doctor");
  return { success: true };
}

export async function sendPatientMessage(formData) {
  const staff = await getCurrentStaff();

  const visitId = formData.get("visitId");
  const receiverRole = formData.get("receiverRole");
  const message = formData.get("message");
  const notesField = formData.get("notesField");
  const notes = formData.get("notes") || "";
  const totalPrice = formData.get("totalPrice");
  const treatmentText = formData.get("treatmentText");
  const medicinesJson = formData.get("medicinesJson");

  if (!visitId) throw new Error("Visit ID is required");
  if (!receiverRole) throw new Error("Please select where to send the message");
  if (!message || !String(message).trim()) {
    throw new Error("Message is required");
  }

  const visit = await db.patientVisit.findUnique({
    where: { id: visitId },
  });
  if (!visit) throw new Error("Patient not found");

  const senderRole = visit.status;

  const data = {};
  if (notesField && notes !== undefined) data[notesField] = notes;
  if (totalPrice) data.totalPrice = parseFloat(totalPrice);
  if (treatmentText !== null && treatmentText !== undefined) data.treatmentText = treatmentText;
  if (medicinesJson !== null && medicinesJson !== undefined) data.medicinesJson = medicinesJson;
  data.status = receiverRole;

  await db.patientVisit.update({
    where: { id: visitId },
    data,
  });

  await db.patientMessage.create({
    data: {
      visitId,
      senderRole,
      receiverRole,
      message: String(message).trim(),
    },
  });

  await db.patientMovement.create({
    data: {
      visitId,
      fromStatus: senderRole,
      toStatus: receiverRole,
      message: String(message).trim(),
      createdBy: staff.name || staff.email,
    },
  });

  await db.notification.create({
    data: {
      visitId,
      toStatus: receiverRole,
      message: `New message from ${senderRole}: ${String(message).trim().slice(0, 80)}`,
    },
  });

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

  const notifications = await db.notification.findMany({
    where: { toStatus: status, isRead: false },
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

/**
 * Generate receipt (treatment + medicines, NO total price on receipt)
 */
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
            `${i + 1}. ${m.name}${m.dose ? ` — ${m.dose}` : ""} [${m.available === false ? "NOT AVAILABLE" : "Available"
            }]`
        )
        .join("\n");
    }
  } catch (_) { }

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

  // No total price on receipt
  const finalNotes = receiptNotesFromClient || autoNotes || "No treatment details recorded.";

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