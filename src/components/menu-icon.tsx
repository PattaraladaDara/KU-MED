type IconName="dashboard"|"search"|"registration"|"reports"|"evaluation"|"accounts"|"settings";

export function MenuIcon({name}:{name:IconName}){
  const common={width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:1.8,strokeLinecap:"round" as const,strokeLinejoin:"round" as const,"aria-hidden":true};
  if(name==="dashboard")return <svg {...common}>{[5,12,19].flatMap(y=>[5,12,19].map(x=><circle key={`${x}-${y}`} cx={x} cy={y} r={1.8} fill="currentColor" stroke="none"/>))}</svg>;
  if(name==="search")return <svg {...common}><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>;
  if(name==="registration")return <svg {...common}><path d="M13 21H3V3h18v8M6 7h12M6 11h5M6 15h3"/><circle cx="17" cy="15" r="3"/><path d="M12 22v-1a5 5 0 0 1 10 0v1M6 18h3"/></svg>;
  if(name==="reports")return <svg {...common}><path d="M8 5H4v17h16V5h-4M8 3h8v4H8zM8 11h8M8 15h8M8 19h5"/></svg>;
  if(name==="evaluation")return <svg {...common}><path d="M8 5H4v17h16V5h-4M8 3h8v4H8zM12 10v5"/><circle cx="12" cy="18" r=".8" fill="currentColor" stroke="none"/></svg>;
  if(name==="accounts")return <svg {...common}><circle cx="9" cy="8" r="3"/><path d="M3.5 20v-1.5A4.5 4.5 0 0 1 8 14h2a4.5 4.5 0 0 1 4.5 4.5V20M15 5.5a3 3 0 0 1 0 5.8M16.5 14a4.5 4.5 0 0 1 4 4.5V20"/></svg>;
  return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.86 2.86-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.1A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.86-2.86.06-.06A1.7 1.7 0 0 0 4.2 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H2.4v-4h.1A1.7 1.7 0 0 0 4.2 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06L6.66 3.8l.06.06A1.7 1.7 0 0 0 8.6 4.2a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1v-.1h4v.1a1.7 1.7 0 0 0 1 1.7 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.86 2.86-.06.06A1.7 1.7 0 0 0 19.4 8.6a1.7 1.7 0 0 0 .6 1 1.7 1.7 0 0 0 1.1.4h.1v4h-.1a1.7 1.7 0 0 0-1.7 1Z"/></svg>;
}
