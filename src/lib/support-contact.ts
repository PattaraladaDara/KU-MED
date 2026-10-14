import "server-only";

const clean=(value?:string)=>value?.trim()||"";

export function getSupportContact(){
  return{
    name:clean(process.env.SUPPORT_NAME)||"งานบริการผู้ใช้งาน สถานพยาบาลมหาวิทยาลัยเกษตรศาสตร์ วิทยาเขตกำแพงแสน",
    phone:clean(process.env.SUPPORT_PHONE)||"034-351611",
    email:clean(process.env.SUPPORT_EMAIL)||null,
    hours:clean(process.env.SUPPORT_HOURS)||"วันจันทร์–ศุกร์ เวลา 08:30–16:30 น. (ยกเว้นวันหยุดราชการ)",
  };
}
