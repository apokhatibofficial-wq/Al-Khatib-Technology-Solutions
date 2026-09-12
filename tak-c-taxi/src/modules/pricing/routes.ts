import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { createQuote, NoCityError, NoPricingError } from "./quote.js";
import { GeoNotConfiguredError, GeoProviderError } from "../geo/provider.js";

const pointSchema = z.object({ lat: z.coerce.number().min(-90).max(90), lng: z.coerce.number().min(-180).max(180) });

const quoteBodySchema = z.object({
  pickup: pointSchema,
  dest: pointSchema,
  pickupLabel: z.string().min(1),
  destLabel: z.string().min(1),
});

export async function registerPricingRoutes(app: FastifyInstance): Promise<void> {
  // §4: POST /rides/quote → { distance_m, duration_s, fare, currency, quote_id, expires_at }
  app.post("/rides/quote", async (request, reply) => {
    const body = quoteBodySchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues[0]?.message });

    try {
      const quote = await createQuote(body.data);
      return reply.send({
        distance_m: quote.distanceM,
        duration_s: quote.durationS,
        fare: quote.fareCents,
        currency: quote.currency,
        quote_id: quote.quoteId,
        expires_at: quote.expiresAt.toISOString(),
      });
    } catch (err) {
      if (err instanceof NoCityError) return reply.code(422).send({ error: err.message });
      if (err instanceof NoPricingError) return reply.code(422).send({ error: err.message });
      if (err instanceof GeoNotConfiguredError) return reply.code(503).send({ error: err.message });
      if (err instanceof GeoProviderError) return reply.code(502).send({ error: err.message });
      throw err;
    }
  });
}
