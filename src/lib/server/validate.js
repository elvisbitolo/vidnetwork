export function clean(value, max) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

export function limitStr(value, max) {
  if (typeof value !== "string") return "";
  return value.slice(0, max);
}

export function strField(body, key, max) {
  return clean(body?.[key], max);
}
