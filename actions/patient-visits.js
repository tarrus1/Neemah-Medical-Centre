"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function createPatientVisit(formData) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const doctor = await db.user.findUnique({
    where: { clerkUserId: userId, role: "DOCTOR" },
  });
  if (!doctor) throw new Error("Doctor not found");

  const fullName = formData.get("fullName");
  const idNumber = formData.get("idNumber") || null;
  const phoneNumber = formData.get("phoneNumber") || null;

  if (!fullName) throw new Error("Patient full name is required");

  const visit = await db.patientVisit.create({
    data: {
      fullName,
      idNumber,
      phoneNumber,
      doctorId: doctor.id,
      status: "REGISTERED",
    },
  });

  revalidatePath("/doctor");
  return { success: true, visit };
}

export async function updatePatientVisit(formData) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const doctor = await db.user.findUnique({
    where: { clerkUserId: userId, role: "DOCTOR" },
  });
  if (!doctor) throw new Error("Doctor not found");

  const visitId = formData.get("visitId");
  const triageNotes = formData.get("triageNotes");
  const doctorNotes = formData.get("doctorNotes");
  const laboratoryNotes = formData.get("laboratoryNotes");
  const pharmacyNotes = formData.get("pharmacyNotes");
  const status = formData.get("status");

  if (!visitId) throw new Error("Visit ID is required");

  const visit = await db.patientVisit.update({
    where: { id: visitId },
    data: {
      triageNotes: triageNotes || undefined,
      doctorNotes: doctorNotes || undefined,
      laboratoryNotes: laboratoryNotes || undefined,
      pharmacyNotes: pharmacyNotes || undefined,
      status: status || undefined,
    },
  });

  revalidatePath("/doctor");
  return { success: true, visit };
}

export async function deletePatientVisit(formData) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const doctor = await db.user.findUnique({
    where: { clerkUserId: userId, role: "DOCTOR" },
  });
  if (!doctor) throw new Error("Doctor not found");

  const visitId = formData.get("visitId");
  if (!visitId) throw new Error("Visit ID is required");

  await db.patientVisit.delete({
    where: { id: visitId },
  });

  revalidatePath("/doctor");
  return { success: true };
}

export async function getPatientVisits(search = "") {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const doctor = await db.user.findUnique({
    where: { clerkUserId: userId, role: "DOCTOR" },
  });
  if (!doctor) throw new Error("Doctor not found");

  const visits = await db.patientVisit.findMany({
    where: {
      doctorId: doctor.id,
      OR: search
        ? [
            { fullName: { contains: search, mode: "insensitive" } },
            { idNumber: { contains: search, mode: "insensitive" } },
            { phoneNumber: { contains: search, mode: "insensitive" } },
          ]
        : undefined,
    },
    orderBy: { createdAt: "desc" },
  });

  return { visits };
}