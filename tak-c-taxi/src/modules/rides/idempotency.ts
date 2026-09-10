import { prisma } from "../../db/client.js";
import type { Prisma } from "../../generated/prisma/client.js";

interface Outcome {
  status: number;
  body: Record<string, unknown>;
}

/**
 * §4: "كل الطلبات الحساسة تحمل Idempotency-Key ليأمن التكرار عند ضعف
 * الشبكة" — a retry with the same key replays the stored response instead
 * of re-running fn()'s side effect. Opt-in: no header, no dedup (the
 * ride-state endpoints that use this always pass one; GET routes don't
 * need this at all).
 */
export async function withIdempotency(
  actorId: string,
  endpoint: string,
  key: string | undefined,
  fn: () => Promise<Outcome>,
): Promise<Outcome> {
  if (!key) return fn();

  const existing = await prisma.idempotencyKey.findUnique({
    where: { actorId_endpoint_key: { actorId, endpoint, key } },
  });
  if (existing) {
    return { status: existing.responseStatus, body: existing.responseBody as Record<string, unknown> };
  }

  const result = await fn();

  await prisma.idempotencyKey
    .create({
      data: {
        actorId,
        endpoint,
        key,
        responseStatus: result.status,
        responseBody: result.body as Prisma.InputJsonValue,
      },
    })
    // A concurrent identical retry can lose this race; that's fine — the
    // side effect already happened exactly once, only the cache-write lost.
    .catch(() => {});

  return result;
}
