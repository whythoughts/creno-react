import { describe, expect, it, vi } from "vitest";
import {
  createApiClient,
  BookingApiError,
  CrenoAuthenticationError,
  CrenoForbiddenError,
  CrenoNotFoundError,
  CrenoValidationError,
  CrenoConflictError,
  CrenoPlanLimitError,
  CrenoRateLimitError,
} from "../src/api.js";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("createApiClient", () => {
  it("sends the API key and client-library headers", async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const headers = init.headers as Record<string, string>;
      expect(headers["X-API-Key"]).toBe("pk_live_test");
      expect(headers["X-Client-Library"]).toBe("react");
      return jsonResponse(200, []);
    });
    vi.stubGlobal("fetch", fetchMock);
    await createApiClient("https://api.test", "pk_live_test").fetchServiceTypes();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it.each([
    [401, CrenoAuthenticationError],
    [403, CrenoForbiddenError],
    [404, CrenoNotFoundError],
    [400, CrenoValidationError],
    [409, CrenoConflictError],
    [429, CrenoRateLimitError],
    [500, BookingApiError],
  ])("maps %i responses to the right exception class", async (status, ExpectedError) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(status, { error: "nope" })),
    );
    await expect(createApiClient("https://api.test", "pk_live_test").fetchServiceTypes()).rejects.toBeInstanceOf(
      ExpectedError,
    );
    vi.unstubAllGlobals();
  });

  it("carries limitType and plan on a plan-limit error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(402, { error: "limit reached", limitType: "bookingsPerMonth", plan: "starter" })),
    );
    try {
      await createApiClient("https://api.test", "pk_live_test").fetchServiceTypes();
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(CrenoPlanLimitError);
      expect((err as CrenoPlanLimitError).limitType).toBe("bookingsPerMonth");
      expect((err as CrenoPlanLimitError).plan).toBe("starter");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("maps createBooking failures to the same taxonomy", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(409, { error: "slot taken" })),
    );
    await expect(
      createApiClient("https://api.test", "pk_live_test").createBooking({
        startAt: "2026-08-03T13:00:00.000Z",
        customerName: "Jane Doe",
        customerEmail: "jane@example.com",
      }),
    ).rejects.toBeInstanceOf(CrenoConflictError);
    vi.unstubAllGlobals();
  });
});
