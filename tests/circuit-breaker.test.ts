import { CircuitBreaker } from "../internal/circuit-breaker.js";
import { RailsrError } from "../types/errors.js";

describe("CircuitBreaker", () => {
  it("starts CLOSED", () => {
    expect(new CircuitBreaker().currentState).toBe("CLOSED");
  });

  it("opens after threshold failures", () => {
    const cb = new CircuitBreaker({ threshold: 3 });
    cb.check(); // fine
    cb.recordFailure();
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.currentState).toBe("OPEN");
    expect(() => cb.check()).toThrow(RailsrError);
  });

  it("transitions OPEN → HALF_OPEN after resetTimeout", () => {
    const cb = new CircuitBreaker({ threshold: 1, resetTimeoutMs: 50 });
    cb.recordFailure();
    expect(cb.currentState).toBe("OPEN");

    // Fake time passage by manipulating lastFailureTime
    // Instead, just wait 60ms
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        cb.check(); // should NOT throw — moves to HALF_OPEN
        expect(cb.currentState).toBe("HALF_OPEN");
        resolve();
      }, 60);
    });
  });

  it("resets to CLOSED on success", () => {
    const cb = new CircuitBreaker({ threshold: 2 });
    cb.recordFailure();
    cb.recordSuccess();
    expect(cb.currentState).toBe("CLOSED");
    expect(cb["failureCount"]).toBe(0);
  });

  it("reset() clears state", () => {
    const cb = new CircuitBreaker({ threshold: 1 });
    cb.recordFailure();
    cb.reset();
    expect(cb.currentState).toBe("CLOSED");
    expect(() => cb.check()).not.toThrow();
  });
});
