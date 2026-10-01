export function maskCitizenId(value:string){const digits=value.replace(/\D/g,"");if(digits.length<6)return "••••••";return `${digits.slice(0,2)}${"•".repeat(Math.max(1,digits.length-6))}${digits.slice(-4)}`;}
export function maskPhone(value:string){const digits=value.replace(/\D/g,"");return digits.length>4?`${"•".repeat(digits.length-4)}${digits.slice(-4)}`:digits;}
