import type { FastifyInstance } from "fastify";
import { createId } from "@paralleldrive/cuid2";
import { prisma } from "../../db/client.js";
import { requireAuth } from "../auth/guard.js";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 2 * 1024 * 1024; // 2MB — plenty for a compressed profile/vehicle photo.

/**
 * A real, working image store, not a stub: bytes live directly in Postgres
 * (see the UploadedFile model's comment in schema.prisma for why — same
 * "start simple" progression already used for geocoding/routing/tiles).
 * GET is deliberately unauthenticated: these are profile/vehicle photos
 * referenced by plain <img src> tags, addressed by an unguessable cuid —
 * the same trust model as an S3 object behind an opaque key.
 */
export async function registerUploadRoutes(app: FastifyInstance): Promise<void> {
  app.post("/uploads", { preHandler: requireAuth }, async (request, reply) => {
    const file = await request.file({ limits: { fileSize: MAX_BYTES } });
    if (!file) return reply.code(400).send({ error: "No file uploaded" });
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return reply.code(400).send({ error: "Only JPEG, PNG, or WebP images are allowed" });
    }

    const buffer = await file.toBuffer().catch(() => null);
    if (!buffer) return reply.code(400).send({ error: `File too large (max ${MAX_BYTES / 1024 / 1024}MB)` });
    // Buffer's type is Uint8Array<ArrayBufferLike> (SharedArrayBuffer
    // included); Prisma's Bytes field wants a plain Uint8Array<ArrayBuffer>.
    const data = new Uint8Array(buffer);

    const uploaded = await prisma.uploadedFile.create({
      data: { id: createId(), mimeType: file.mimetype, data },
    });
    return reply.code(201).send({ id: uploaded.id });
  });

  app.get("/uploads/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const file = await prisma.uploadedFile.findUnique({ where: { id } });
    if (!file) return reply.code(404).send({ error: "Not found" });

    return reply
      .header("content-type", file.mimeType)
      .header("cache-control", "public, max-age=86400, immutable")
      .send(file.data);
  });
}
