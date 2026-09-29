export function addBusinessDays(value:string,amount:number){
  const date=new Date(`${value}T12:00:00Z`);const direction=amount<0?-1:1;let remaining=Math.abs(amount);
  while(remaining>0){date.setUTCDate(date.getUTCDate()+direction);const day=date.getUTCDay();if(day!==0&&day!==6)remaining--;}
  return date.toISOString().slice(0,10);
}

export function isWeekday(value:string){const day=new Date(`${value}T12:00:00Z`).getUTCDay();return day>=1&&day<=5;}

export function isClinicTime(value:string){const match=value.match(/^(\d{2}):(\d{2})$/);if(!match)return false;const minutes=Number(match[1])*60+Number(match[2]);return minutes>=9*60&&minutes<=15*60;}
