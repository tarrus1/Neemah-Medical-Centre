import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

/**
 * Compute a shallow diff between two objects.
 * Only returns keys that changed. Skips noisy fields.
 */
const IGNORE_KEYS = new Set([
  "updatedAt",
  "createdAt",
  "deletedAt",
]);

function shallowDiff(before, after) {
  if (!before || !after) return null;
  const changed = {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const k of keys) {
    if (IGNORE_KEYS.has(k)) continue;
    const a = before[k];
    const b = after[k];
    // Loose equality — JSON-safe comparison
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      changed[k] = { from: a, to: b };
    }
  }
  return Object.keys(changed).length > 0 ? changed : null;
}

/**
 * Resolve the current staff user from Clerk session.
 * Returns null if not signed in (audit still records the action).
 */
async function resolveActor() {
  try {
    const { userId } = await auth();
    if (!userId) return null;
    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
      select: { id: true, name: true, email: true, role: true },
    });
    if (!user) return null;
    return {
      actorId: user.id,
      actorName: user.name || user.email,
      actorRole: user.role,
    };
  } catch {
    return null;
  }
}

/**
 * Record an audit entry. Non-throwing — logging must never break
 * the action that triggered it.
 *
 * Usage:
 *   await auditLog({
 *     action: "UPDATE",
 *     entity: "PatientVisit",
 *     entityId: visit.id,
 *     before,
 *     after,
 *     reason: "Corrected phone number",
 *   });
 */
export async function auditLog({
  action,
  entity,
  entityId,
  before,
  after,
  reason,
  ipAddress,
  userAgent,
  actor: explicitActor,
}) {
  try {
    const actor = explicitActor || (await resolveActor());
    const diff = before && after ? shallowDiff(before, after) : null;

    await db.auditLog.create({
      data: {
        actorId: actor?.actorId || null,
        actorName: actor?.actorName || "system",
        actorRole: actor?.actorRole || null,
        action,
        entity,
        entityId: String(entityId),
        before: before || null,
        after: after || null,
        diff,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        reason: reason || null,
      },
    });
  } catch (err) {
    // Never let an audit failure break the business action.
    console.error("[audit] failed to write entry:", err);
  }
}

/**
 * Small helper to fetch a "before" snapshot for update flows.
 * Returns the raw row or null.
 */
export async function snapshot(model, id) {
  try {
    return await db[model].findUnique({ where: { id } });
  } catch {
    return null;
  }
}