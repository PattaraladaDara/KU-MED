export function validProfilePhoto(value: unknown): value is string {
  return typeof value === "string" && value.length <= 180000 && /^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]*={0,2}$/.test(value);
}
