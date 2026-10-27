export type MedicationOrderSnapshot = {
  catalogItemId: string;
  code: string;
  name: string;
  strength: string;
  dosageForm: string;
  unit: string;
  quantity: number;
  directions: string;
  indication?: string;
  unitPriceSatang: number;
  lineTotalSatang: number;
};

export function parseMedicationOrderSnapshots(raw: string | null | undefined): MedicationOrderSnapshot[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is MedicationOrderSnapshot => Boolean(item && typeof item === "object" && typeof item.catalogItemId === "string" && typeof item.name === "string" && typeof item.quantity === "number" && typeof item.directions === "string" && typeof item.unitPriceSatang === "number" && typeof item.lineTotalSatang === "number"));
  } catch {
    return [];
  }
}

export function medicationOrderDisplayLines(raw: string | null | undefined): string[] {
  const structured = parseMedicationOrderSnapshots(raw);
  if (structured.length) return structured.map(item => `${item.name} ${item.strength} · ${item.quantity} ${item.unit} · ${item.directions}`);
  return raw?.split("\n").map(line => line.trim()).filter(Boolean) || [];
}
