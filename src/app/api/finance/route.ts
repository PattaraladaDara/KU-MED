import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getDb } from "@/lib/db";
import { optionalText, text } from "@/lib/api-validation";
import { requirePermission } from "@/lib/auth-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const transitions: Record<string, readonly string[]> = {
  pending: ["approved", "rejected"],
  approved: ["paid"],
  paid: [],
  rejected: [],
};
const satang = (value: unknown) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 && amount * 100 <= 2_147_483_647 ? Math.round(amount * 100) : null;
};
class ExpenseTransitionError extends Error {}

async function actorFor(username: string) {
  const account = await getDb().staffAccount.findUnique({ where: { username }, select: { firstName: true, lastName: true } });
  if (!account) return null;
  return { username, name: `${account.firstName} ${account.lastName}`.trim() || username };
}

export async function GET(request: NextRequest) {
  const auth = requirePermission(request, ["finance:manage", "reports:view"]);
  if (auth.response) return auth.response;
  try {
    const now = new Date();
    const bangkokMonth = Number(new Intl.DateTimeFormat("en-US", { month: "numeric", timeZone: "Asia/Bangkok" }).format(now));
    const bangkokYear = Number(new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone: "Asia/Bangkok" }).format(now));
    const fiscalYear = Number(request.nextUrl.searchParams.get("fiscalYear")) || (bangkokMonth >= 10 ? bangkokYear + 1 : bangkokYear);
    const start = new Date(Date.UTC(fiscalYear - 1, 9, 1) - 7 * 3600000), end = new Date(Date.UTC(fiscalYear, 9, 1) - 7 * 3600000);
    const [budgets, expenses, payments] = await Promise.all([
      getDb().financialBudget.findMany({ where: { fiscalYear }, orderBy: { category: "asc" } }),
      getDb().financialExpense.findMany({ where: { expenseDate: { gte: start, lt: end } }, orderBy: { expenseDate: "desc" }, include: { statusHistory: { orderBy: { createdAt: "desc" } } } }),
      getDb().payment.findMany({ where: { paidAt: { gte: start, lt: end } }, select: { amountSatang: true, method: true, status: true } }),
    ]);
    const committed = expenses.filter(item => item.status === "approved" || item.status === "paid").reduce((sum, item) => sum + item.amountSatang, 0);
    const allocated = budgets.reduce((sum, item) => sum + item.allocatedSatang, 0), confirmedPayments = payments.filter(item => item.status === "paid");
    const paymentMethods = Object.entries(confirmedPayments.reduce<Record<string, number>>((result, item) => { result[item.method] = (result[item.method] || 0) + item.amountSatang; return result; }, {})).map(([label, value]) => ({ label, value }));
    return NextResponse.json({ fiscalYear, budgets, expenses, paymentMethods, summary: {
      allocatedSatang: allocated, committedSatang: committed,
      paidSatang: expenses.filter(item => item.status === "paid").reduce((sum, item) => sum + item.amountSatang, 0),
      pendingSatang: expenses.filter(item => item.status === "pending").reduce((sum, item) => sum + item.amountSatang, 0),
      remainingSatang: allocated - committed, billedSatang: payments.reduce((sum, item) => sum + item.amountSatang, 0),
      receivedSatang: confirmedPayments.reduce((sum, item) => sum + item.amountSatang, 0),
      outstandingSatang: payments.filter(item => item.status !== "paid").reduce((sum, item) => sum + item.amountSatang, 0),
    } });
  } catch {
    return NextResponse.json({ error: "ไม่สามารถโหลดข้อมูลงบประมาณและรายจ่ายได้" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const auth = requirePermission(request, "finance:manage");
  if (auth.response) return auth.response;
  try {
    const body = await request.json() as Record<string, unknown>, kind = text(body.kind), actor = await actorFor(auth.session!.username);
    if (!actor) return NextResponse.json({ error: "ไม่พบบัญชีผู้ปฏิบัติงาน" }, { status: 401 });
    if (kind === "budget") {
      const fiscalYear = Number(body.fiscalYear), category = text(body.category), allocatedSatang = satang(body.amount);
      if (!Number.isInteger(fiscalYear) || !category || allocatedSatang === null) return NextResponse.json({ error: "กรอกข้อมูลงบประมาณให้ครบถ้วน" }, { status: 400 });
      const budget = await getDb().financialBudget.upsert({ where: { fiscalYear_category: { fiscalYear, category } }, create: { fiscalYear, category, allocatedSatang, notes: optionalText(body.notes), createdBy: actor.username }, update: { allocatedSatang, notes: optionalText(body.notes), createdBy: actor.username } });
      return NextResponse.json({ budget }, { status: 201 });
    }
    if (kind === "expense") {
      const category = text(body.category), description = text(body.description), payee = text(body.payee), amountSatang = satang(body.amount), expenseDate = new Date(text(body.expenseDate));
      if (!category || !description || !payee || amountSatang === null || Number.isNaN(expenseDate.getTime())) return NextResponse.json({ error: "กรอกข้อมูลการเบิกจ่ายให้ครบถ้วน" }, { status: 400 });
      const expense = await getDb().financialExpense.create({ data: {
        expenseDate, referenceCode: `EXP-${Date.now()}-${randomBytes(3).toString("hex").toUpperCase()}`, category, description, payee, amountSatang, notes: optionalText(body.notes), createdBy: actor.username,
        statusHistory: { create: { fromStatus: "new", toStatus: "pending", actorUsername: actor.username, actorName: actor.name, note: "สร้างรายการเบิกจ่าย" } },
      } });
      return NextResponse.json({ expense }, { status: 201 });
    }
    return NextResponse.json({ error: "ประเภทรายการไม่ถูกต้อง" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "ไม่สามารถบันทึกข้อมูลการเงินได้" }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = requirePermission(request, "finance:manage");
  if (auth.response) return auth.response;
  try {
    const body = await request.json() as Record<string, unknown>, id = text(body.id), status = text(body.status), note = optionalText(body.notes);
    if (!id || !Object.hasOwn(transitions, status)) return NextResponse.json({ error: "ข้อมูลการเปลี่ยนสถานะไม่ถูกต้อง" }, { status: 400 });
    if (status === "rejected" && !note) return NextResponse.json({ error: "กรุณาระบุเหตุผลที่ไม่อนุมัติ" }, { status: 400 });
    const actor = await actorFor(auth.session!.username);
    if (!actor) return NextResponse.json({ error: "ไม่พบบัญชีผู้ปฏิบัติงาน" }, { status: 401 });
    const expense = await getDb().$transaction(async tx => {
      const current = await tx.financialExpense.findUnique({ where: { id } });
      if (!current) throw new Error("EXPENSE_NOT_FOUND");
      if (!transitions[current.status]?.includes(status)) throw new ExpenseTransitionError("เปลี่ยนสถานะรายการนี้ตามลำดับที่กำหนดไม่ได้");
      const updated = await tx.financialExpense.updateMany({ where: { id, status: current.status }, data: { status, ...(note ? { notes: note } : {}) } });
      if (updated.count !== 1) throw new ExpenseTransitionError("รายการนี้ถูกเปลี่ยนสถานะไปแล้ว กรุณาโหลดข้อมูลใหม่");
      await tx.financialExpenseStatusHistory.create({ data: { expenseId: id, fromStatus: current.status, toStatus: status, actorUsername: actor.username, actorName: actor.name, note } });
      return tx.financialExpense.findUniqueOrThrow({ where: { id } });
    });
    return NextResponse.json({ expense });
  } catch (error) {
    if (error instanceof ExpenseTransitionError) return NextResponse.json({ error: error.message }, { status: 409 });
    if (error instanceof Error && error.message === "EXPENSE_NOT_FOUND") return NextResponse.json({ error: "ไม่พบรายการเบิกจ่าย" }, { status: 404 });
    return NextResponse.json({ error: "ไม่สามารถเปลี่ยนสถานะรายการเบิกจ่ายได้" }, { status: 503 });
  }
}
