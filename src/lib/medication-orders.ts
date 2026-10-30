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
    return parsed.flatMap((value): MedicationOrderSnapshot[] => {
      if (!value || typeof value !== "object") return [];
      const item = value as Record<string, unknown>;
      const quantity = Number(item.quantity), unitPriceSatang = Number(item.unitPriceSatang), lineTotalSatang = Number(item.lineTotalSatang);
      if (typeof item.name !== "string" || !Number.isFinite(quantity) || !Number.isFinite(unitPriceSatang) || !Number.isFinite(lineTotalSatang)) return [];
      return [{
        catalogItemId: typeof item.catalogItemId === "string" ? item.catalogItemId : "",
        code: typeof item.code === "string" ? item.code : "",
        name: item.name,
        strength: typeof item.strength === "string" ? item.strength : "",
        dosageForm: typeof item.dosageForm === "string" ? item.dosageForm : "",
        unit: typeof item.unit === "string" ? item.unit : "",
        quantity,
        indication: typeof item.indication === "string" ? item.indication : "",
        directions: typeof item.directions === "string" ? item.directions : "",
        unitPriceSatang,
        lineTotalSatang,
      }];
    });
  } catch {
    return [];
  }
}

export function medicationOrderDisplayLines(raw: string | null | undefined): string[] {
  const structured = parseMedicationOrderSnapshots(raw);
  if (structured.length) return structured.map(item => `${item.name} ${item.strength} · ${item.quantity} ${item.unit} · ${item.directions}`);
  return raw?.split("\n").map(line => line.trim()).filter(Boolean) || [];
}
