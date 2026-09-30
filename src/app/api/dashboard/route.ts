import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const timeZone="Asia/Bangkok";
function monthKey(value:Date){return new Intl.DateTimeFormat("en-CA",{timeZone,year:"numeric",month:"2-digit"}).format(value);}
function dateKey(value:Date){return new Intl.DateTimeFormat("en-CA",{timeZone,year:"numeric",month:"2-digit",day:"2-digit"}).format(value);}
function bangkokMonthRange(key:string){const match=/^(\d{4})-(\d{2})$/.exec(key);const now=new Date();const fallback=monthKey(now);const parts=/^(\d{4})-(\d{2})$/.exec(fallback)!;const year=Number(match?.[1]||parts[1]),month=Number(match?.[2]||parts[2]);return{key:`${year}-${String(month).padStart(2,"0")}`,start:new Date(Date.UTC(year,month-1,1,-7)),end:new Date(Date.UTC(year,month,1,-7))};}
function average(values:number[]){return values.length?values.reduce((sum,value)=>sum+value,0)/values.length:0;}

export async function GET(request:NextRequest){
  const requestedMonth=request.nextUrl.searchParams.get("month")||monthKey(new Date());const unit=request.nextUrl.searchParams.get("unit")||"all";const range=bangkokMonthRange(requestedMonth);
  try{
    const db=getDb();
    const [allDates,allUnits,treatments,appointments,evaluations]=await Promise.all([
      db.treatmentRecord.findMany({select:{visitedAt:true},orderBy:{visitedAt:"desc"}}),
      db.treatmentRecord.findMany({select:{department:true},distinct:["department"],orderBy:{department:"asc"}}),
      db.treatmentRecord.findMany({where:{visitedAt:{gte:range.start,lt:range.end},...(unit!=="all"?{department:unit}:{})},select:{patientId:true,visitedAt:true,createdAt:true,department:true}}),
      db.appointment.findMany({where:{scheduledAt:{gte:range.start,lt:range.end},...(unit!=="all"?{department:unit}:{})},select:{patientId:true,scheduledAt:true,status:true}}),
      db.evaluation.findMany({where:{createdAt:{gte:range.start,lt:range.end}},select:{qualityScore:true,responsibilityScore:true,serviceScore:true}}),
    ]);
    const availableMonths=[...new Set([monthKey(new Date()),...allDates.map(item=>monthKey(item.visitedAt))])].sort().reverse();
    const departmentMap=new Map<string,{patients:Set<string>;durations:number[]}>();const hourly=Array.from({length:12},()=>0);const serviceDurations:number[]=[];const waits:number[]=[];
    for(const record of treatments){const duration=Math.max(0,(record.createdAt.getTime()-record.visitedAt.getTime())/60000);const bounded=duration<=480?duration:0;if(bounded)serviceDurations.push(bounded);const entry=departmentMap.get(record.department)||{patients:new Set<string>(),durations:[]};entry.patients.add(record.patientId);if(bounded)entry.durations.push(bounded);departmentMap.set(record.department,entry);const hour=Number(new Intl.DateTimeFormat("en-GB",{timeZone,hour:"2-digit",hourCycle:"h23"}).format(record.visitedAt));if(hour>=8&&hour<=19)hourly[hour-8]++;}
    for(const appointment of appointments){const sameDay=treatments.filter(record=>record.patientId===appointment.patientId&&dateKey(record.visitedAt)===dateKey(appointment.scheduledAt));if(!sameDay.length)continue;const visited=sameDay.sort((a,b)=>Math.abs(a.visitedAt.getTime()-appointment.scheduledAt.getTime())-Math.abs(b.visitedAt.getTime()-appointment.scheduledAt.getTime()))[0];const wait=(visited.visitedAt.getTime()-appointment.scheduledAt.getTime())/60000;if(wait>=0&&wait<=360)waits.push(wait);}
    const maxHour=Math.max(1,...hourly);const satisfactionScores=evaluations.flatMap(item=>[item.qualityScore,item.responsibilityScore,item.serviceScore]);const chart=[...departmentMap].map(([id,value])=>({id,name:id,english:"Service Unit",patients:value.patients.size,minutes:Math.round(average(value.durations)*10)/10})).sort((a,b)=>b.patients-a.patients);
    return NextResponse.json({month:range.key,availableMonths,units:allUnits.map(item=>({id:item.department,name:item.department})),metrics:{total:new Set(treatments.map(item=>item.patientId)).size,visits:treatments.length,wait:Math.round(average(waits)*10)/10,service:Math.round(average(serviceDurations)*10)/10,satisfaction:Math.round((average(satisfactionScores)/5*100)*10)/10},chart,capacity:hourly.map(value=>Math.round(value/maxHour*100)),hourlyCounts:hourly,updatedAt:new Date().toISOString()});
  }catch{return NextResponse.json({error:"ไม่สามารถดึงข้อมูลแดชบอร์ดจากฐานข้อมูลได้"},{status:503});}
}
