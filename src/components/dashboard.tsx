"use client";

import { useState } from "react";
import { getDashboardDemo, months, stations } from "@/lib/dashboard-demo";

const number = new Intl.NumberFormat("th-TH");

export function Dashboard() {
  const [month, setMonth] = useState("2024-06");
  const [unit, setUnit] = useState("all");
  const [updated, setUpdated] = useState("วันนี้ 15:30 น.");
  const [notice, setNotice] = useState("");
  const data = getDashboardDemo(month, unit);
  const selectedMonth = months.find(item => item.value === month)!;
  const selectedStation = stations.find(item => item.id === unit);
  const slowest = data.chart.reduce((a, b) => a.minutes > b.minutes ? a : b);
  const metrics = [
    { label: "จำนวนผู้เข้าใช้บริการ", value: number.format(data.total), unit: "คน", icon: "คน", theme: "patients", note: unit === "all" && month === "2024-06" ? "↑ +8.4% จากเดือนที่ผ่านมา" : `ข้อมูลตัวอย่าง ${selectedMonth.label}` },
    { label: "ระยะเวลารอเฉลี่ย", value: String(data.wait), unit: "นาที", icon: "◷", theme: "waiting", note: unit === "all" && month === "2024-06" ? "↓ ลดลง 3 นาที (เร็วขึ้น 16%)" : "ระยะเวลารอเฉลี่ยของชุดข้อมูลตัวอย่าง" },
    { label: "ระยะเวลาให้บริการเฉลี่ย", value: String(data.service), unit: "นาที", icon: "↔", theme: "service", note: "อยู่ในเกณฑ์มาตรฐานสถานพยาบาล" },
    { label: "ความพึงพอใจการบริการ", value: `${data.satisfaction}%`, unit: "", icon: "★", theme: "satisfaction", note: `คะแนนเฉลี่ย ${(data.satisfaction / 20).toFixed(2)} / 5.00 คะแนน` },
  ];

  function refresh() {
    const time = new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }).format(new Date());
    setUpdated(`วันนี้ ${time} น.`);
    setNotice(`อัปเดตข้อมูลตัวอย่างแล้ว ${time} น.`);
  }

  return <div className="dashboard-frame"><div className="dashboard-panel">
    <header className="dashboard-heading">
      <div><h1>แดชบอร์ดสรุปผลการให้บริการ</h1><p className="dashboard-subtitle"><span aria-hidden="true" />สถานพยาบาล มหาวิทยาลัยเกษตรศาสตร์ วิทยาเขตกำแพงแสน</p></div>
      <div className="dashboard-filters">
        <label className="sr-only" htmlFor="dashboard-month">เดือน</label><select id="dashboard-month" value={month} onChange={event => { setMonth(event.target.value); setNotice(""); }}>{months.map(item => <option key={item.value} value={item.value}>เดือน {item.label}</option>)}</select>
        <label className="sr-only" htmlFor="dashboard-unit">แผนกบริการ</label><select id="dashboard-unit" value={unit} onChange={event => { setUnit(event.target.value); setNotice(""); }}><option value="all">ทุกแผนกบริการ (All Units)</option>{stations.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <button type="button" className="dashboard-refresh" aria-label="รีเฟรชข้อมูลตัวอย่าง" title="รีเฟรชข้อมูลตัวอย่าง" onClick={refresh}>↻</button>
      </div>
    </header>
    <section className="dashboard-metrics" aria-label="สรุปผลการให้บริการ">
      {metrics.map(metric => <article key={metric.theme} className={`metric-card metric-${metric.theme}`}><div className="metric-top"><h2>{metric.label}</h2><span className="metric-icon" aria-hidden="true">{metric.icon}</span></div><p className="metric-value">{metric.value}<span>{metric.unit}</span></p><p className="metric-note">{metric.theme === "service" && <span className="metric-dot" aria-hidden="true" />}{metric.note}</p></article>)}
    </section>
    <div className="dashboard-charts">
      <section className="service-chart-card" aria-labelledby="service-chart-heading">
        <header className="service-chart-heading"><div><h2 id="service-chart-heading">ระยะเวลา และ ปริมาณผู้เข้าใช้บริการในแต่ละจุดบริการ</h2><p>วิเคราะห์เปรียบเทียบจำนวนผู้รับบริการและระยะเวลาเฉลี่ยแต่ละสถานี</p></div><div className="chart-legend"><span><i className="volume-key" />ผู้รับบริการ<br />(คน)</span><span><i className="time-key" />ระยะเวลา<br />(นาที)</span></div></header>
        <div className={`service-chart${data.chart.length === 1 ? " single-station" : ""}`} role="group" aria-label={`กราฟเปรียบเทียบ ${selectedMonth.label} ${selectedStation?.name ?? "ทุกแผนกบริการ"}`}>
          <div className="chart-guidelines" aria-hidden="true"><i /><i /><i /><i /><i /></div>
          <div className="chart-stations">{data.chart.map(station => <div className="chart-station" key={station.id}>
            <div className="chart-bars">
              <button type="button" className="chart-bar volume-bar" style={{ height: `${Math.min(100, station.patients / 12400 * 100)}%` }} aria-label={`${station.name}: ผู้รับบริการ ${number.format(station.patients)} คน`}><span className="bar-tooltip">{number.format(station.patients)} คน</span></button>
              <button type="button" className="chart-bar time-bar" style={{ height: `${Math.min(100, station.minutes / 25 * 100)}%` }} aria-label={`${station.name}: ระยะเวลา ${station.minutes} นาที`}><span className="bar-tooltip">{station.minutes} นาที</span></button>
            </div><p className="station-name">{station.name}</p><p className="station-english">{station.english}</p>
          </div>)}</div>
        </div>
        <div className="chart-summary"><p><span aria-hidden="true">◷</span> จุดบริการ{slowest.name}มีระยะเวลาเฉลี่ยสูงที่สุด{unit === "all" ? "เนื่องจากมีการวินิจฉัยอย่างละเอียด" : "ในแผนกที่เลือก"}</p><p className="updated-time">อัปเดตข้อมูลล่าสุด: {updated}</p></div>
      </section>
      <section className="capacity-card" aria-labelledby="capacity-heading"><h2 id="capacity-heading">ช่วงเวลาที่หนาแน่น</h2><p className="capacity-subtitle">ความหนาแน่นของผู้ป่วยต่อชั่วโมง</p>
        <div className="capacity-hours">{data.capacity.map((value, index) => {const hour = `${String(index + 8).padStart(2, "0")}:00`;return <div className={`capacity-row${value >= 80 ? " capacity-high" : ""}`} key={hour}><span className="capacity-hour">{hour}</span><div className="capacity-track" role="meter" aria-label={`ความหนาแน่นเวลา ${hour}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}><span style={{ width: `${value}%`, backgroundColor: value >= 95 ? "#065f46" : value >= 85 ? "#059669" : value >= 74 ? "#10b981" : value >= 60 ? "#34d399" : value >= 45 ? "#6ee7b7" : "#a7f3d0" }} /></div><span className="capacity-percent">{value}%</span></div>;})}</div>
        <aside className="capacity-tip"><strong>ข้อแนะนำ <span aria-hidden="true">ⓘ</span></strong><p>ในช่วงเวลา 17:00–19:00 เป็นเวลานอกเวลาทำการควรจัดเวรสนับสนุนรองรับเคสฉุกเฉิน</p></aside>
      </section>
    </div>
    <footer className="dashboard-demo-footer"><span>ข้อมูลตัวอย่างสำหรับแสดงผลหน้าจอ</span><span role="status" aria-live="polite">{notice}</span></footer>
  </div></div>;
}
