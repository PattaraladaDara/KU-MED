// Deterministic frontend fixtures. These are not patient or live hospital data.
export const months = [
  { value: "2024-06", label: "มิถุนายน 2567", factor: 1 },
  { value: "2024-05", label: "พฤษภาคม 2567", factor: 0.9225 },
  { value: "2024-04", label: "เมษายน 2567", factor: 0.84 },
] as const;

export const stations = [
  { id: "records", name: "เวชระเบียน", english: "Medical Records", patients: 8420, minutes: 12 },
  { id: "screening", name: "คัดกรอง", english: "Triage / Screening", patients: 8420, minutes: 15 },
  { id: "doctor", name: "พบแพทย์", english: "Doctor Consult", patients: 9300, minutes: 23.5 },
  { id: "treatment", name: "ทำแผล", english: "Treatment / Wound", patients: 6450, minutes: 16.2 },
  { id: "pharmacy", name: "จ่ายยา", english: "Pharmacy", patients: 7180, minutes: 8.8 },
] as const;

export const hourlyCapacity = [38, 65, 89, 82, 70, 62, 74, 95, 98, 80, 52, 32];

export function getDashboardDemo(month: string, unit: string) {
  const period = months.find(item => item.value === month) ?? months[0];
  const selected = stations.find(item => item.id === unit);
  const factor = period.factor;
  return {
    total: Math.round((selected?.patients ?? 12387) * factor),
    wait: Math.round((selected ? selected.minutes * 0.62 : 15) * (2 - factor)),
    service: selected ? Math.round(selected.minutes * 10) / 10 : Math.round(28 * (2 - factor)),
    satisfaction: Math.round((96.8 - (1 - factor) * 8 - (selected ? 0.4 : 0)) * 10) / 10,
    chart: (selected ? [selected] : stations).map(station => ({ ...station, patients: Math.round(station.patients * factor), minutes: Math.round(station.minutes * (2 - factor) * 10) / 10 })),
    capacity: hourlyCapacity.map(value => Math.min(100, Math.round(value * factor * (selected ? 0.85 : 1)))),
  };
}
