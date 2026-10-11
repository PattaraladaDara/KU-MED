export const APPOINTMENT_ROOMS = [
  "ห้องตรวจ1",
  "ห้องตรวจ2",
  "ห้องตรวจพิเศษ",
  "ห้องตรวจ7 (ห้องหัตการ) ห้องสำหรับทำแผล",
] as const;

export const APPOINTMENT_REASONS = ["ติดตามอาการ", "ทำหัตถการ", "ติดตามอาการและทำหัตถการ"] as const;

export const APPOINTMENT_TIMES = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "13:00", "13:30", "14:00", "14:30", "15:00",
] as const;

export function isAppointmentTime(value: string) {
  return (APPOINTMENT_TIMES as readonly string[]).includes(value);
}
