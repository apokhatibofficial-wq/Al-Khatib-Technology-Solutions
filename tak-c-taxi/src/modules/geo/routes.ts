import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { geoProvider } from "./index.js";
import { GeoNotConfiguredError, GeoProviderError } from "./provider.js";

const pointSchema = z.object({ lat: z.coerce.number().min(-90).max(90), lng: z.coerce.number().min(-180).max(180) });

export async function registerGeoRoutes(app: FastifyInstance): Promise<void> {
  app.post("/geo/geocode", async (request, reply) => {
    const body = z.object({ query: z.string().min(1) }).safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues[0]?.message });

    try {
      const results = await geoProvider.geocode(body.data.query);
      return reply.send({ results });
    } catch (err) {
      if (err instanceof GeoNotConfiguredError) return reply.code(503).send({ error: err.message });
      request.log.warn(err, "geocode failed");
      return reply.code(502).send({ error: "Geocoding service failed" });
    }
  });

  app.post("/geo/reverse", async (request, reply) => {
    const body = pointSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues[0]?.message });

    try {
      const result = await geoProvider.reverseGeocode(body.data);
      return reply.send(result);
    } catch (err) {
      if (err instanceof GeoNotConfiguredError) return reply.code(503).send({ error: err.message });
      request.log.warn(err, "reverse geocode failed");
      return reply.code(502).send({ error: "Reverse geocoding service failed" });
    }
  });

  app.post("/geo/route", async (request, reply) => {
    const body = z.object({ from: pointSchema, to: pointSchema }).safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues[0]?.message });

    try {
      const route = await geoProvider.route(body.data.from, body.data.to);
      return reply.send(route);
    } catch (err) {
      if (err instanceof GeoNotConfiguredError) return reply.code(503).send({ error: err.message });
      if (err instanceof GeoProviderError) return reply.code(422).send({ error: err.message });
      request.log.warn(err, "routing failed");
      return reply.code(502).send({ error: "Routing service failed" });
    }
  });
}
