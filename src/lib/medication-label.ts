import { THAI_BUDDHIST_LOCALE, THAI_TIME_ZONE } from "@/lib/thai-date";

export type MedicationLabelItem = {
  name: string;
  strength?: string;
  quantity?: number;
  unit?: string;
  indication?: string;
  directions?: string;
};

const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);

/** Use the same 80 × 58 mm print layout wherever a medication label is printed. */
export function printMedicationLabels(patientName: string, visitedAt: string, items: MedicationLabelItem[]) {
  if (!items.length) return false;

  const date = new Intl.DateTimeFormat(THAI_BUDDHIST_LOCALE, { dateStyle: "medium", timeStyle: "short", timeZone: THAI_TIME_ZONE }).format(new Date(visitedAt));
  const emblemUrl = new URL("/appointment-emblem.png", window.location.origin).href;
  const regularFontUrl = new URL("/fonts/THSarabunNew.ttf", window.location.origin).href;
  const boldFontUrl = new URL("/fonts/THSarabunNew-Bold.ttf", window.location.origin).href;
  const medicineHtml = items.map((item, index) => {
    const quantity = item.quantity == null ? "" : `${item.quantity} ${item.unit || ""}`.trim();
    const amount = [item.strength, quantity].filter(Boolean).join(" · ");
    return `<article class="label${index === items.length - 1 ? " last-label" : ""}"><header class="heading"><img class="emblem" src="${emblemUrl}" alt="ตรามหาวิทยาลัยเกษตรศาสตร์"><div class="clinic">สถานพยาบาลมหาวิทยาลัยเกษตรศาสตร์<br>วิทยาเขตกำแพงแสน</div><div class="address">เลขที่ 1 หมู่ 6 ตำบลกำแพงแสน<br>อำเภอกำแพงแสน จังหวัดนครปฐม 73140</div></header><div class="patient">${escapeHtml(patientName)}</div><section class="medicine"><strong class="medicine-name">${escapeHtml(item.name)}${amount ? ` / ${escapeHtml(amount)}` : ""}</strong><div class="detail"><b>สรรพคุณ</b><span>${escapeHtml(item.indication || "–")}</span></div><div class="detail"><b>คำแนะนำ</b><span>${escapeHtml(item.directions || "ใช้ยาตามคำแนะนำของเจ้าหน้าที่")}</span></div></section><footer class="date">${escapeHtml(date)} น.</footer></article>`;
  }).join("");

  const html = `<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>ฉลากยา</title><style>
    @font-face{font-family:"TH Sarabun New";src:url("${regularFontUrl}") format("truetype");font-style:normal;font-weight:400}
    @font-face{font-family:"TH Sarabun New";src:url("${boldFontUrl}") format("truetype");font-style:normal;font-weight:700}
    @page{size:80mm 58mm;margin:0}
    *{box-sizing:border-box}html,body{margin:0;padding:0;width:80mm;color:#263546;font-family:"TH Sarabun New",sans-serif;font-size:11pt;line-height:1.2}
    .label{width:80mm;height:58mm;min-height:58mm;padding:3mm 3mm 2mm;page-break-after:always;break-after:page;overflow:hidden;background:#fff;display:flex;flex-direction:column}
    .heading{display:grid;grid-template-columns:11mm minmax(0,1fr) 25mm;align-items:center;gap:2mm;padding-bottom:2mm;border-bottom:.25mm solid #444}
    .emblem{width:10mm;height:10mm;object-fit:contain}.clinic{font-size:11pt;font-weight:700;line-height:1.15}.address{font-size:7.5pt;line-height:1.2;color:#485568}
    .patient{padding:2mm 3mm 1mm;font-size:13pt;font-weight:700}.patient:before{content:"ชื่อ-สกุล: ";font-weight:400}.medicine-name:before{content:"ชื่อยา / ปริมาณ: ";font-weight:400}.date:before{content:"วันที่ ";font-weight:400}.medicine{padding:1mm 3mm 1.5mm}.medicine-name{display:block;font-size:12pt;font-weight:700}.detail{display:grid;grid-template-columns:14mm 1fr;gap:1mm;margin-top:.6mm;font-size:10pt}.detail b{font-weight:700}.detail span{white-space:pre-wrap;overflow-wrap:anywhere}
    .date{margin-top:auto;padding-top:1mm;border-top:.25mm solid #444;text-align:right;font-size:9pt;white-space:nowrap}.label.last-label{page-break-after:auto;break-after:auto}
    @media screen{body{padding:8px;background:#eee}.label{min-height:58mm;box-shadow:0 1px 5px #0003}}
  </style></head><body>${medicineHtml}</body></html>`;

  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.title = "ฉลากยาสำหรับพิมพ์";
  frame.style.cssText = "position:fixed;left:-10000px;bottom:0;width:1px;height:1px;border:0";
  frame.onload = async () => {
    const view = frame.contentWindow;
    const doc = frame.contentDocument;
    if (!view || !doc) return;
    try {
      if (doc.fonts) await doc.fonts.ready;
      await Promise.all(Array.from(doc.images).map(image => image.complete ? Promise.resolve() : new Promise(resolve => {
        image.addEventListener("load", resolve, { once: true });
        image.addEventListener("error", resolve, { once: true });
      })));
    } finally {
      requestAnimationFrame(() => requestAnimationFrame(() => { view.focus(); view.print(); }));
    }
    view.addEventListener("afterprint", () => frame.remove(), { once: true });
  };
  frame.srcdoc = html;
  document.body.appendChild(frame);
  return true;
}
