"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

// Each appointment costs 0 credits (free)
const APPOINTMENT_CREDIT_COST = 0;

/**
 * No-op function since credits are no longer used for subscriptions
 */
export async function checkAndAllocateCredits(user) {
  // Credits are no longer allocated - everything is free
  return user;
}

/**
 * No deduction needed since appointments are free
 */
export async function deductCreditsForAppointment(userId, doctorId) {
  // No credits to deduct - appointments are free
  return { success: true };
}