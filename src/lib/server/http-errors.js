export function isTransientErrorCode(err) {
  const code = String(err?.code || "");
  return code === "" || code.includes("unavailable") || code.includes("deadline-exceeded");
}

const GRPC_TO_HTTP = {
  3: 400,
  5: 404,
  6: 409,
  7: 403,
  9: 403,
  10: 409,
  16: 401,
  13: 429,
  14: 503,
  4: 408,
};

export function httpStatusFor(err) {
  if (typeof err?.code === "number" && Number.isInteger(err.code)) {
    if (err.code >= 400 && err.code <= 599) return err.code;
    if (GRPC_TO_HTTP[err.code]) return GRPC_TO_HTTP[err.code];
    return 500;
  }
  const code = String(err?.code || "");
  if (code.includes("not-found")) return 404;
  if (code.includes("already-exists")) return 409;
  if (code.includes("permission-denied") || code.includes("aborted")) return 403;
  if (code.includes("unauthenticated")) return 401;
  if (code.includes("invalid-argument") || code.includes("failed-precondition")) return 400;
  if (code.includes("resource-exhausted") || code.includes("quota")) return 429;
  if (code.includes("unavailable") || code.includes("deadline-exceeded")) return 503;
  return 500;
}
