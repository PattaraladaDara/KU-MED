const PATTERNS:Record<string,string>={"0":"nnnwwnwnn","1":"wnnwnnnnw","2":"nnwwnnnnw","3":"wnwwnnnnn","4":"nnnwwnnnw","5":"wnnwwnnnn","6":"nnwwwnnnn","7":"nnnwnnwnw","8":"wnnwnnwnn","9":"nnwwnnwnn","A":"wnnnnwnnw","B":"nnwnnwnnw","C":"wnwnnwnnn","D":"nnnnwwnnw","E":"wnnnwwnnn","F":"nnwnwwnnn","G":"nnnnnwwnw","H":"wnnnnwwnn","I":"nnwnnwwnn","J":"nnnnwwwnn","K":"wnnnnnnww","L":"nnwnnnnww","M":"wnwnnnnwn","N":"nnnnwnnww","O":"wnnnwnnwn","P":"nnwnwnnwn","Q":"nnnnnnwww","R":"wnnnnnwwn","S":"nnwnnnwwn","T":"nnnnwnwwn","U":"wwnnnnnnw","V":"nwwnnnnnw","W":"wwwnnnnnn","X":"nwnnwnnnw","Y":"wwnnwnnnn","Z":"nwwnwnnnn","-":"nwnnnnwnw",".":"wwnnnnwnn"," ":"nwwnnnwnn","*":"nwnnwnwnn"};

export function Barcode39({value}:{value:string}){
  const encoded=`*${value.toUpperCase()}*`;let x=0;const bars:React.ReactNode[]=[];
  for(const [characterIndex,character] of [...encoded].entries()){
    const pattern=PATTERNS[character]||PATTERNS["-"];
    for(const [index,widthType] of [...pattern].entries()){
      const width=widthType==="w"?3:1;if(index%2===0)bars.push(<rect key={`${characterIndex}-${index}`} x={x} y="0" width={width} height="30"/>);x+=width;
    }
    x+=1;
  }
  return <div className="ticket-barcode"><svg viewBox={`0 0 ${x} 30`} role="img" aria-label={`บาร์โค้ดผู้ป่วย ${value}`} preserveAspectRatio="none">{bars}</svg><span>{value}</span></div>;
}
