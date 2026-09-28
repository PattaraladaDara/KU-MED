export const THAI_TIME_ZONE = "Asia/Bangkok";
export const THAI_BUDDHIST_LOCALE = "th-TH-u-ca-buddhist";

export function parseBangkokDate(value: string) {
  return new Date(`${value}T00:00:00+07:00`);
}

export function parseBangkokDateTime(value: string) {
  if (!value) return new Date(Number.NaN);
  if (/Z$|[+-]\d{2}:\d{2}$/.test(value)) return new Date(value);
  return new Date(`${value.length === 16 ? `${value}:00` : value}+07:00`);
}
