import {
  RailsrError,
  isRailsrError,
  classifyStatus,
  isRetryableStatus,
} from "../types/errors.js";

describe("RailsrError", () => {
  it("is an instance of Error", () => {
    const err = new RailsrError({ type: "not_found", message: "Gone" });
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(RailsrError);
  });

  it("sets all fields correctly", () => {
    const err = new RailsrError({
      type: "server_error",
      message: "Boom",
      statusCode: 500,
      code: "ERR_BANG",
      requestId: "req-1",
      details: { raw: true },
      retryable: true,
    });
    expect(err.type).toBe("server_error");
    expect(err.message).toBe("Boom");
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe("ERR_BANG");
    expect(err.requestId).toBe("req-1");
    expect(err.details).toEqual({ raw: true });
    expect(err.retryable).toBe(true);
    expect(err.name).toBe("RailsrError");
  });

  it("toString includes type, code, and status", () => {
    const err = new RailsrError({ type: "not_found", message: "Missing", statusCode: 404, code: "E404" });
    expect(err.toString()).toContain("not_found");
    expect(err.toString()).toContain("E404");
    expect(err.toString()).toContain("404");
  });

  describe("static factories", () => {
    test("unauthorized", () => {
      const e = RailsrError.unauthorized();
      expect(e.type).toBe("unauthorized");
      expect(e.statusCode).toBe(401);
    });
    test("notFound", () => {
      expect(RailsrError.notFound().type).toBe("not_found");
    });
    test("rateLimited is retryable", () => {
      expect(RailsrError.rateLimited().retryable).toBe(true);
    });
    test("circuitOpen", () => {
      expect(RailsrError.circuitOpen().type).toBe("circuit_open");
    });
    test("invalidSignature", () => {
      expect(RailsrError.invalidSignature().type).toBe("invalid_signature");
    });
  });
});

describe("isRailsrError", () => {
  it("returns true for RailsrError", () => {
    expect(isRailsrError(new RailsrError({ type: "not_found", message: "x" }))).toBe(true);
  });
  it("returns false for plain Error", () => {
    expect(isRailsrError(new Error("x"))).toBe(false);
  });
  it("matches by type", () => {
    const err = RailsrError.notFound();
    expect(isRailsrError(err, "not_found")).toBe(true);
    expect(isRailsrError(err, "unauthorized")).toBe(false);
  });
});

describe("classifyStatus", () => {
  it.each([
    [401, "unauthorized"],
    [403, "forbidden"],
    [404, "not_found"],
    [409, "conflict"],
    [422, "unprocessable"],
    [429, "rate_limited"],
    [500, "server_error"],
    [503, "server_error"],
    [200, "unknown"],
  ])("maps %i → %s", (status, type) => {
    expect(classifyStatus(status)).toBe(type);
  });
});

describe("isRetryableStatus", () => {
  it.each([429, 500, 502, 503, 504])("marks %i as retryable", (s) => {
    expect(isRetryableStatus(s)).toBe(true);
  });
  it.each([200, 404, 422])("does not mark %i as retryable", (s) => {
    expect(isRetryableStatus(s)).toBe(false);
  });
});
