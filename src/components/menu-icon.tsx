type IconName="dashboard"|"search"|"registration"|"reports"|"evaluation"|"settings";

export function MenuIcon({name}:{name:IconName}){
  const common={width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:1.8,strokeLinecap:"round" as const,strokeLinejoin:"round" as const,"aria-hidden":true};
  if(name==="dashboard")return <svg {...common}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>;
  if(name==="search")return <svg {...common}><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>;
  if(name==="registration")return <svg {...common}><circle cx="9" cy="7" r="4"/><path d="M2.5 21v-2a6.5 6.5 0 0 1 13 0v2M19 8v6M16 11h6"/></svg>;
  if(name==="reports")return <svg {...common}><path d="M6 2.5h9l4 4V21.5H6z"/><path d="M15 2.5v4h4M9 16v2M12.5 12v6M16 9v9"/></svg>;
  if(name==="evaluation")return <svg {...common}><path d="M9 4h6M9.5 2.5h5a1 1 0 0 1 1 1v2h-7v-2a1 1 0 0 1 1-1Z"/><path d="M7 4.5H5v17h14v-17h-2M8.5 11.5l2 2 4-4M8.5 17h7"/></svg>;
  return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.86 2.86-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.1A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.86-2.86.06-.06A1.7 1.7 0 0 0 4.2 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H2.4v-4h.1A1.7 1.7 0 0 0 4.2 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06L6.66 3.8l.06.06A1.7 1.7 0 0 0 8.6 4.2a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1v-.1h4v.1a1.7 1.7 0 0 0 1 1.7 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.86 2.86-.06.06A1.7 1.7 0 0 0 19.4 8.6a1.7 1.7 0 0 0 .6 1 1.7 1.7 0 0 0 1.1.4h.1v4h-.1a1.7 1.7 0 0 0-1.7 1Z"/></svg>;
}
