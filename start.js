const fs=require("fs");const path=require("path");
const p=path.join(__dirname,".env");
if(fs.existsSync(p)){
  for(const line of fs.readFileSync(p,"utf8").split(/\r?\n/)){
    const s=line.trim();if(!s||s.startsWith("#"))continue;
    const i=s.indexOf("=");if(i<1)continue;
    const k=s.slice(0,i).trim(),v=s.slice(i+1).trim().replace(/^["']|["']$/g,"");
    if(!(k in process.env))process.env[k]=v;
  }
}
require("./server.js");
