// Provider markup is converted to plain text, never rendered as HTML.
export function cardInstructionText(html:string){
  const entities:Record<string,string>={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',rsquo:'’',lsquo:'‘',rdquo:'”',ldquo:'“',ndash:'–',mdash:'—',bull:'•',copy:'©',reg:'®'};
  return html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'')
    .replace(/<br\s*\/?\s*>/gi,'\n').replace(/<\/(p|div|h[1-6]|ul|ol)\s*>/gi,'\n\n')
    .replace(/<li\b[^>]*>/gi,'\n• ').replace(/<\/li\s*>/gi,'\n').replace(/<[^>]*>/g,'')
    .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi,(original,entity:string)=>{
      if(entity[0]!=='#')return entities[entity.toLowerCase()]??original;
      const value=entity[1].toLowerCase()==='x'?parseInt(entity.slice(2),16):parseInt(entity.slice(1),10);
      return value>0&&value<=0x10ffff?String.fromCodePoint(value):'';
    }).replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
}
