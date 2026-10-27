import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ApiError, ContractError, request, requestNoData } from "@/api/http";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const ok = (data: unknown) => json({ errors: [], data });
const fail = (code: string, metadata: Record<string, unknown> | null = null) => json({ errors: [{ code, metadata }], data: null });

const mockFetch = (response: Response) => {
  const fn = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fn);
  return fn;
};

/** The error a request fails with; fails the test if it succeeds. */
const failure = (promise: Promise<unknown>): Promise<ApiError> =>
  promise.then(
    () => expect.unreachable("Expected the request to fail"),
    (e: unknown) => e as ApiError,
  );

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("request", () => {
  it("sends JSON and returns the parsed data", async () => {
    const fetch = mockFetch(ok({ cardsSeeded: 78, extra: true }));

    const data = await request(z.object({ cardsSeeded: z.int() }), "/api/x", { method: "POST", body: { a: 1 } });

    expect(data).toEqual({ cardsSeeded: 78 });
    const [, init] = fetch.mock.calls[0];
    expect(init.body).toBe('{"a":1}');
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(init.headers.Accept).toBe("application/json");
  });

  it("fails loudly with a ContractError when the data breaks the contract", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch(ok({ cardsSeeded: "78" }));

    const promise = request(z.object({ cardsSeeded: z.int() }), "/api/x");

    await expect(promise).rejects.toBeInstanceOf(ContractError);
    await expect(promise).rejects.toThrow(/\/api\/x/);
  });

  it("fails with a ContractError when a 200 body is not an envelope", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch(json({ cardsSeeded: 78 }));

    await expect(request(z.object({ cardsSeeded: z.int() }), "/api/x")).rejects.toBeInstanceOf(ContractError);
  });

  // Bodies below are what Tarot.Admin.Api sends: every error is 200 OK with { errors: [{ code, metadata }], data: null }.

  it.each(["VALIDATION_ERROR", "UNAUTHORIZED", "NOT_FOUND", "RATE_LIMITED", "INTERNAL_ERROR"])(
    "throws ApiError with the code %s from the body",
    async (code) => {
      mockFetch(fail(code));

      const error = await failure(request(z.object({}), "/api/admin/cards"));

      expect(error).toBeInstanceOf(ApiError);
      expect(error.code).toBe(code);
      expect(error.metadata).toBeNull();
    },
  );

  it("keeps every error and the first one's metadata", async () => {
    mockFetch(
      json({
        errors: [
          { code: "VALIDATION_ERROR", metadata: { field: "reversedRatio" } },
          { code: "VALIDATION_ERROR", metadata: null },
        ],
        data: null,
      }),
    );

    const error = await failure(request(z.object({}), "/api/admin/settings/deck"));

    expect(error.metadata).toEqual({ field: "reversedRatio" });
    expect(error.errors).toHaveLength(2);
  });

  it("reports UNAVAILABLE when the proxy in front of the API answers 502 to 504", async () => {
    mockFetch(new Response("<html>Bad Gateway</html>", { status: 502 }));

    expect((await failure(request(z.object({}), "/api/admin/cards"))).code).toBe("UNAVAILABLE");
  });

  it("reports INTERNAL_ERROR for any other error status without an envelope", async () => {
    mockFetch(new Response("", { status: 500 }));

    expect((await failure(request(z.object({}), "/api/admin/cards"))).code).toBe("INTERNAL_ERROR");
  });

  it("reports UNAVAILABLE when no response arrives", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    const error = await failure(request(z.object({}), "/api/admin/cards"));

    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe("UNAVAILABLE");
  });
});

describe("requestNoData", () => {
  it("resolves when the data is null", async () => {
    mockFetch(ok(null));
    await expect(requestNoData("/api/x", { method: "DELETE" })).resolves.toBeUndefined();
  });

  it("throws on errors", async () => {
    mockFetch(fail("RATE_LIMITED"));

    const error = await failure(requestNoData("/api/admin/session", { method: "POST" }));

    expect(error.code).toBe("RATE_LIMITED");
  });
});
