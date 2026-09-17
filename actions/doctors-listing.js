"use server";

import { db } from "@/lib/prisma";

/**
 * Get doctors by specialty
 */
export async function getDoctorsBySpecialty(specialty) {
  try {
    const decodedSpecialty = specialty.split("%20").join(" ");
    
    const doctors = await db.user.findMany({
      where: {
        role: "DOCTOR",
        verificationStatus: "VERIFIED",
        specialties: {
          has: decodedSpecialty, // Check if array contains this specialty
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return { doctors };
  } catch (error) {
    console.error("Failed to fetch doctors by specialty:", error);
    return { error: "Failed to fetch doctors" };
  }
}