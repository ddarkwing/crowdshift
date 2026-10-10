const http = require("http");
const fs = require("fs");
const path = require("path");
const {URL} = require("url");

const ROOT = __dirname;
const PUBLIC = path.join(ROOT,"public");
const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || "0.0.0.0";

const guidance = JSON.parse(fs.readFileSync(path.join(ROOT,"data","guidance.json"),"utf8"));
const eventData = JSON.parse(fs.readFileSync(path.join(ROOT,"data","event.json"),"utf8"));

const CITIES = [
  ["London","UK",51.5074,-0.1278],["Paris","France",48.8566,2.3522],
  ["Brussels","Belgium",50.8503,4.3517],["Amsterdam","Netherlands",52.3676,4.9041],
  ["Berlin","Germany",52.52,13.405],["Madrid","Spain",40.4168,-3.7038],
  ["Barcelona","Spain",41.3874,2.1686],["Lisbon","Portugal",38.7223,-9.1393],
  ["Rome","Italy",41.9028,12.4964],["Milan","Italy",45.4642,9.19],
  ["Vienna","Austria",48.2082,16.3738],["Prague","Czechia",50.0755,14.4378],
  ["Warsaw","Poland",52.2297,21.0122],["Copenhagen","Denmark",55.6761,12.5683],
  ["Stockholm","Sweden",59.3293,18.0686],["Athens","Greece",37.9838,23.7275]
].map(([name,country,lat,lon])=>({name,country,lat,lon}));

const cache = new Map();
const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,n));
const cacheGet=(k,ttl)=>{const x=cache.get(k);if(!x||Date.now()-x.at>ttl)return null;return x.value};
const cacheSet=(k,v)=>cache.set(k,{at:Date.now(),value:v});

async function fetchText(url,options={}){
  const ctl=new AbortController(); const t=setTimeout(()=>ctl.abort(),8000);
  try{
    const r=await fetch(url,{...options,signal:ctl.signal});
    if(!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.text();
  }finally{clearTimeout(t)}
}
async function fetchJson(url,options={}){return JSON.parse(await fetchText(url,options))}

function envRisk({apparent=0,humidity=0,wind=0,aqi=0}){
  let score=8 + Math.max(0,apparent-22)*4.2 + Math.max(0,humidity-55)*.22 + Math.max(0,8-wind)*.8 + Math.max(0,aqi-40)*.10;
  return Math.round(clamp(score));
}
function operationalRisk({environmental,exposure,resources,warning}){
  return Math.round(clamp(environmental*.40 + exposure*.25 + resources*.25 + warning*.10));
}
function resilience(resources,communications=91){
  const cooling=clamp(resources.cooling.current/resources.cooling.required*100);
  const water=clamp(resources.water.current/resources.water.required*100);
  const shade=clamp(resources.shade.current/resources.shade.required*100);
  const medical=clamp(resources.medical.current/resources.medical.required*100);
  return Math.round(cooling*.30+water*.25+shade*.15+medical*.20+communications*.10);
}

function offlineEurope(){
  const sample={London:[15.2,14.8,72,16],Paris:[16.6,16.4,68,12],Brussels:[15.8,15.5,71,13],Amsterdam:[15.1,14.5,74,18],Berlin:[14.2,13.6,70,15],Madrid:[24,24.3,39,11],Barcelona:[22.3,22.8,58,13],Lisbon:[23.2,23.6,52,14],Rome:[22.7,23,60,9],Milan:[18.4,18.5,66,8],Vienna:[16.3,16,64,9],Prague:[14.8,14.2,69,12],Warsaw:[13.9,13.1,73,14],Copenhagen:[13.2,12.2,75,20],Stockholm:[10.9,9.8,78,18],Athens:[25.1,25.5,47,12]};
  const cities=CITIES.map(c=>{const [temperature,apparent,humidity,wind]=sample[c.name];return {...c,temperature,apparent,humidity,wind,risk:envRisk({apparent,humidity,wind})}});
  return summarizeEurope(cities,true);
}
function summarizeEurope(cities,degraded=false){
  const valid=cities.filter(x=>Number.isFinite(x.apparent));
  const hot=[...valid].sort((a,b)=>b.apparent-a.apparent);
  return {degraded,source:degraded?"Resilient fallback":"Open-Meteo Forecast API",fetchedAt:new Date().toISOString(),cities,summary:{
    avgRisk:Math.round(valid.reduce((a,b)=>a+b.risk,0)/Math.max(1,valid.length)),
    hottestCity:hot[0]?.name||null,peakApparent:hot[0]?.apparent??null,criticalCities:valid.filter(x=>x.risk>=60).length
  }};
}
async function getEurope(){
  const c=cacheGet("europe",5*60e3); if(c)return c;
  try{
    const lats=CITIES.map(x=>x.lat).join(","),lons=CITIES.map(x=>x.lon).join(",");
    const url=`https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lats)}&longitude=${encodeURIComponent(lons)}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,wind_direction_10m,weather_code&timezone=auto`;
    const data=await fetchJson(url), rows=Array.isArray(data)?data:[data];
    const cities=CITIES.map((c,i)=>{const x=rows[i]?.current||{};const row={...c,temperature:+x.temperature_2m,humidity:+x.relative_humidity_2m,apparent:+x.apparent_temperature,wind:+x.wind_speed_10m,windDirection:+x.wind_direction_10m,weatherCode:x.weather_code,time:x.time||null};row.risk=envRisk(row);return row});
    const out=summarizeEurope(cities,false);cacheSet("europe",out);return out;
  }catch(e){const out=offlineEurope();cacheSet("europe",out);return out}
}
async function getBrussels(){
  const c=cacheGet("brussels",5*60e3);if(c)return c;
  try{
    const lat=50.8503,lon=4.3517;
    const weather=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,wind_direction_10m,weather_code&hourly=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m&forecast_hours=12&timezone=Europe%2FBrussels`;
    const air=`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi,pm2_5,uv_index&timezone=Europe%2FBrussels`;
    const [w,a]=await Promise.all([fetchJson(weather),fetchJson(air).catch(()=>({current:{}}))]);
    const x=w.current||{},q=a.current||{};
    const current={temperature:+x.temperature_2m,humidity:+x.relative_humidity_2m,apparent:+x.apparent_temperature,wind:+x.wind_speed_10m,windDirection:+x.wind_direction_10m,weatherCode:x.weather_code,europeanAqi:+q.european_aqi,pm25:+q.pm2_5,uvIndex:+q.uv_index,time:x.time||null};
    current.environmentRisk=envRisk({...current,aqi:current.europeanAqi});
    const out={degraded:false,source:{weather:"Open-Meteo",airQuality:"CAMS via Open-Meteo"},fetchedAt:new Date().toISOString(),current,hourly:w.hourly||null};
    cacheSet("brussels",out);return out;
  }catch(e){
    const current={temperature:15.8,humidity:71,apparent:15.5,wind:13,windDirection:220,weatherCode:1,europeanAqi:28,pm25:7.8,uvIndex:1.4,time:null};
    current.environmentRisk=envRisk({...current,aqi:current.europeanAqi});
    const out={degraded:true,source:{weather:"Resilient fallback",airQuality:"Resilient fallback"},fetchedAt:new Date().toISOString(),current,hourly:null};
    cacheSet("brussels",out);return out;
  }
}

function stripXml(s){return String(s||"").replace(/<!\[CDATA\[|\]\]>/g,"").replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim()}
function parseAtom(xml){
  const entries=[...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)].map(m=>m[0]);
  return entries.slice(0,12).map((e,i)=>{
    const get=t=>stripXml((e.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)<\\/${t}>`,"i"))||[])[1]);
    return {id:get("id")||`alert-${i}`,title:get("title")||"Official weather warning",updated:get("updated"),summary:get("summary")||get("content"),source:"MeteoAlarm"};
  });
}
async function getAlerts(){
  const c=cacheGet("alerts",5*60e3);if(c)return c;
  try{
    const xml=await fetchText("https://feeds.meteoalarm.org/feeds/meteoalarm-legacy-atom-belgium");
    const alerts=parseAtom(xml);
    const out={degraded:false,source:"MeteoAlarm Belgium Atom Feed",fetchedAt:new Date().toISOString(),alerts};
    cacheSet("alerts",out);return out;
  }catch(e){
    const out={degraded:true,source:"Resilient demo warning",fetchedAt:new Date().toISOString(),alerts:[
      {id:"demo-heat-orange",title:"High temperature · Orange awareness",updated:"2026-07-15T12:00:00+02:00",summary:"Demo historical warning context for the 2026 heatwave scenario. Official live feed was unavailable.",source:"MeteoAlarm context"}
    ]};
    cacheSet("alerts",out);return out;
  }
}

function tokenize(s){return new Set(String(s||"").toLowerCase().match(/[a-z0-9]+/g)||[])}
function retrieveGuidance(query,limit=4){
  const q=tokenize(query);
  return guidance.map(g=>{
    const hay=tokenize([g.title,g.summary,...g.tags].join(" "));
    let score=0;q.forEach(w=>{if(hay.has(w))score+=2;});
    g.tags.forEach(t=>{if(String(query).toLowerCase().includes(t))score+=3;});
    return {...g,_score:score};
  }).sort((a,b)=>b._score-a._score).slice(0,limit).map(({_score,...g})=>g);
}

function deterministicPlan(ctx={}){
  const risk=Number(ctx.operationalRisk||82);
  const actions=[
    {priority:1,id:"hall-c",title:"Open Hall C as an indoor cooling zone",why:"Largest feasible cooling-capacity increase with no schedule change.",cost_eur:420,risk_reduction_points:13,confidence:.94,evidence:["who-cooling","ops-capacity"]},
    {priority:2,id:"water",title:"Add two temporary water points near Main Stage",why:"Reduces hydration queue pressure and walking distance in the highest-density zone.",cost_eur:500,risk_reduction_points:9,confidence:.91,evidence:["who-hydration","ops-capacity"]},
    {priority:3,id:"kids",title:"Move the children’s 15:00 program to 18:00",why:"Moves a more heat-sensitive activity outside the peak environmental window.",cost_eur:0,risk_reduction_points:7,confidence:.96,evidence:["ops-kids","wmo-action"]},
    {priority:4,id:"shade",title:"Add one shade canopy to the east queue lane",why:"Cuts direct-sun exposure where standing density is highest.",cost_eur:400,risk_reduction_points:3,confidence:.87,evidence:["who-cooling"]},
    {priority:5,id:"medical",title:"Add one mobile response team for peak hours",why:"Improves response coverage while crowd and environmental risk overlap.",cost_eur:300,risk_reduction_points:4,confidence:.89,evidence:["ops-med"]}
  ];
  return {mode:"deterministic-fallback",model:null,summary:"ActionCast ranked feasible interventions using venue capacity gaps, event constraints and retrieved guidance.",actions,projectedRisk:Math.max(0,risk-36),spend:1620,caveat:"Operational decision support only. Final actions remain with event operators and local authorities."};
}

async function aiPlan(ctx={}){
  const query=`${ctx.userPrompt||""} heat event cooling water crowd schedule medical warning budget ${JSON.stringify(ctx.environmentalInputs||{})}`;
  const retrieved=retrieveGuidance(query,4);
  const base=deterministicPlan(ctx);
  const key=process.env.FEATHERLESS_API_KEY;
  if(!key)return {...base,retrievedGuidance:retrieved};

  const model=process.env.FEATHERLESS_MODEL||"Qwen/Qwen2.5-7B-Instruct";
  const system=`You are ActionCast, an AI climate-operations planner for mass gatherings.
You receive measured environmental inputs, a deterministic operational risk state, resource capacities, constraints and retrieved guidance.
Do not diagnose medical conditions and do not invent measurements.
Return STRICT JSON only with keys: summary, actions, projectedRisk, spend, caveat.
actions: 3-5 objects with priority,id,title,why,cost_eur,risk_reduction_points,confidence,evidence.
Use evidence IDs from the supplied retrieved guidance when relevant.`;
  try{
    const payload={context:ctx,retrievedGuidance:retrieved.map(g=>({id:g.id,source:g.source,title:g.title,summary:g.summary}))};
    const raw=await fetchJson("https://api.featherless.ai/v1/chat/completions",{
      method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${key}`,"HTTP-Referer":"http://localhost:8080","X-Title":"CrowdShift ForgeHacks 2026"},
      body:JSON.stringify({model,messages:[{role:"system",content:system},{role:"user",content:JSON.stringify(payload)}],temperature:.15,max_tokens:1300})
    });
    const content=raw?.choices?.[0]?.message?.content||"";
    const cleaned=content.replace(/^```json\s*/i,"").replace(/```$/,"").trim();
    const parsed=JSON.parse(cleaned);
    return {mode:"live-ai",model,retrievedGuidance:retrieved,...parsed};
  }catch(e){
    return {...base,mode:"ai-fallback",model,retrievedGuidance:retrieved,error:String(e.message||e)};
  }
}

function scenario(body={}){
  const base=eventData.risk.operational;
  const x={
    hall:Boolean(body.hall),water:Number(body.water||0),shade:Number(body.shade||0),medical:Number(body.medical||0),kids:Boolean(body.kids)
  };
  const spend=(x.hall?420:0)+x.water*250+x.shade*400+x.medical*300;
  const reduction=Math.min(46,Math.round((x.hall?13:0)+x.water*4.5+x.shade*3+x.medical*4+(x.kids?7:0)));
  const risk=Math.max(28,base-reduction);
  const resources=JSON.parse(JSON.stringify(eventData.resources));
  if(x.hall)resources.cooling.current+=830;
  resources.water.current+=x.water*620;
  resources.shade.current=Math.min(100,resources.shade.current+x.shade*6);
  resources.medical.current+=x.medical;
  return {input:x,beforeRisk:base,afterRisk:risk,reduction,spend,resources,resilienceBefore:eventData.risk.resilience,resilienceAfter:resilience(resources),withinBudget:spend<=Number(body.budget||2000)};
}

function report(){
  return {
    event:eventData.event.name,
    status:"Illustrative post-event report",
    peakRisk:87,
    durationHigh:"2h 40m",
    actionsTaken:4,
    averageResponse:"8m",
    incidents:2,
    modeledRiskReduction:"31%",
    resilienceBefore:62,
    resilienceAfter:84,
    summary:"The largest modeled risk reduction came from opening Hall C before peak exposure, followed by relieving hydration pressure around Main Stage.",
    recommendations:["Pre-stage Hall C as a cooling zone on high-heat days","Move one permanent water point closer to Main Stage","Increase fixed shade on the east queue lane"]
  };
}

function sendJson(res,status,obj){const b=JSON.stringify(obj);res.writeHead(status,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","Content-Length":Buffer.byteLength(b)});res.end(b)}
function type(file){return ({".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"application/javascript; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".jpg":"image/jpeg"})[path.extname(file).toLowerCase()]||"application/octet-stream"}
async function bodyJson(req){return await new Promise((resolve,reject)=>{let s="";req.on("data",c=>{s+=c;if(s.length>1e6){reject(new Error("Body too large"));req.destroy()}});req.on("end",()=>{try{resolve(s?JSON.parse(s):{})}catch(e){reject(e)}});req.on("error",reject)})}

const server=http.createServer(async(req,res)=>{
  try{
    const u=new URL(req.url,`http://${req.headers.host||"localhost"}`);
    if(u.pathname==="/api/health")return sendJson(res,200,{ok:true,app:"CrowdShift",version:"1.0.0",weather:"Open-Meteo",warnings:"MeteoAlarm Atom",airQuality:"CAMS via Open-Meteo",aiProvider:"Featherless",aiConfigured:Boolean(process.env.FEATHERLESS_API_KEY),model:process.env.FEATHERLESS_MODEL||"Qwen/Qwen2.5-7B-Instruct",time:new Date().toISOString()});
    if(u.pathname==="/api/event")return sendJson(res,200,eventData);
    if(u.pathname==="/api/live/europe")return sendJson(res,200,await getEurope());
    if(u.pathname==="/api/live/brussels")return sendJson(res,200,await getBrussels());
    if(u.pathname==="/api/alerts")return sendJson(res,200,await getAlerts());
    if(u.pathname==="/api/guidance")return sendJson(res,200,{items:guidance});
    if(u.pathname==="/api/guidance/retrieve")return sendJson(res,200,{items:retrieveGuidance(u.searchParams.get("q")||"",4)});
    if(u.pathname==="/api/scenario"&&req.method==="POST")return sendJson(res,200,scenario(await bodyJson(req)));
    if(u.pathname==="/api/ai/plan"&&req.method==="POST")return sendJson(res,200,await aiPlan(await bodyJson(req)));
    if(u.pathname==="/api/report")return sendJson(res,200,report());
    if(u.pathname==="/api/geocode"){
      const q=(u.searchParams.get("q")||"").trim(); if(!q)return sendJson(res,400,{error:"q required"});
      try{return sendJson(res,200,await fetchJson(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=en&format=json`))}
      catch(e){return sendJson(res,200,{results:[],degraded:true})}
    }

    let pathname=u.pathname;
    if(pathname==="/tool") pathname="/tool.html";
    if(pathname==="/tool/") pathname="/tool.html";
    let f=pathname==="/" ? path.join(PUBLIC,"index.html") : path.join(PUBLIC,decodeURIComponent(pathname));
    f=path.normalize(f); if(!f.startsWith(PUBLIC)){res.writeHead(403);return res.end("Forbidden")}
    fs.stat(f,(err,st)=>{if(err||!st.isFile()){res.writeHead(404);return res.end("Not found")}res.writeHead(200,{"Content-Type":type(f),"Cache-Control":"no-cache"});fs.createReadStream(f).pipe(res)});
  }catch(e){sendJson(res,500,{error:String(e.message||e)})}
});

server.listen(PORT,HOST,()=>{
  console.log("");
  console.log("╭──────────────────────────────────────────────────╮");
  console.log("│  CrowdShift — Climate Operations Intelligence   │");
  console.log("╰──────────────────────────────────────────────────╯");
  console.log(`  App:  http://${HOST}:${PORT}`);
  console.log(`  AI:   ${process.env.FEATHERLESS_API_KEY ? "Featherless LIVE" : "deterministic fallback (optional key in .env)"}`);
  console.log("  Run:  npm start");
  console.log("");
});
