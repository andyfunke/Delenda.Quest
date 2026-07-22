export const openWikiApplet=(article:string)=>{
  if(typeof window!=="undefined")window.dispatchEvent(new CustomEvent("open-wiki-applet",{detail:article}));
};

