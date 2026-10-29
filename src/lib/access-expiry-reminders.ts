import "server-only";
import { getDb } from "@/lib/db";
import { sendAccessExpiryReminderEmail } from "@/lib/email";

const dayMs = 24 * 60 * 60 * 1000;
const intervalMs = 60 * 60 * 1000;
const reminderAction = "access_expiry_reminder_sent";

function tomorrowInBangkok(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => Number(parts.find((item) => item.type === type)?.value);
  const year = part("year"), month = part("month"), day = part("day");
  const start = Date.UTC(year, month - 1, day + 1) - 7 * 60 * 60 * 1000;
  return {
    start: new Date(start),
    end: new Date(start + dayMs),
    dateKey: new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10),
  };
}

let runInProgress = false;

export async function sendTomorrowExpiryReminders(now = new Date()) {
  if (process.env.AUTH_EMAIL_MOCK !== "false" || runInProgress) return;
  runInProgress = true;
  try {
    const db = getDb(), range = tomorrowInBangkok(now);
    const accounts = await db.staffAccount.findMany({
      where: { active: true, applicationStatus: "approved", accessEndsAt: { gte: range.start, lt: range.end } },
      select: { id: true, username: true, firstName: true, lastName: true, role: true, email: true, accessEndsAt: true },
    });

    for (const account of accounts) {
      const note = `access-expiry-reminder:${range.dateKey}`;
      const alreadySent = await db.accountAuditLog.findFirst({ where: { accountId: account.id, action: reminderAction, note }, select: { id: true } });
      if (alreadySent || !account.accessEndsAt) continue;
      try {
        const settings = account.email ? null : await db.userSettings.findUnique({ where: { userKey: account.username }, select: { email: true } });
        const email = account.email || settings?.email;
        if (!email) {
          console.warn("Access expiry reminder skipped: account has no email address.");
          continue;
        }
        await sendAccessExpiryReminderEmail({ ...account, email, expiresAt: account.accessEndsAt });
        await db.accountAuditLog.create({ data: {
          accountId: account.id, actorKey: "system", action: reminderAction,
          fromStatus: "approved", toStatus: "approved", note,
        } });
      } catch (error) {
        console.error("Unable to send access expiry reminder.", error);
      }
    }
  } catch (error) {
    console.error("Unable to check upcoming access expirations.", error);
  } finally {
    runInProgress = false;
  }
}

export function startAccessExpiryReminderScheduler() {
  const globalState = globalThis as typeof globalThis & { __kuMedExpiryReminderTimer?: ReturnType<typeof setInterval> };
  if (globalState.__kuMedExpiryReminderTimer || process.env.AUTH_EMAIL_MOCK !== "false") return;
  void sendTomorrowExpiryReminders();
  globalState.__kuMedExpiryReminderTimer = setInterval(() => void sendTomorrowExpiryReminders(), intervalMs);
}
