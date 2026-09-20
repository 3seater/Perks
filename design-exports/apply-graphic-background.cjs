const {defs,body}=require('./approved-background.json');
module.exports=function(svg){
  if(svg.includes('id="Atmospheric-background"')) return svg;
  return svg.replace('</defs>',defs+'</defs>').replace('<g id="Site-header-wordmark"',body+'<g id="Site-header-wordmark"');
};
