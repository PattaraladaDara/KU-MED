export function text(value: unknown, max = 255) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function optionalText(value: unknown, max = 2000) {
  const result = text(value, max);
  return result || null;
}

export function score(value: unknown) {
  const result = Number(value);
  return Number.isInteger(result) && result >= 1 && result <= 5 ? result : null;
}

export function isUniqueError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}
