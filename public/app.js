const $=(s)=>document.querySelector(s), $$=(s)=>[...document.querySelectorAll(s)];
const state={
  view:"atlas", live:false, timeline:3, playing:true, timer:null, event:null, europe:null, brussels:null, alerts:null,
  tasksDone:new Set(), message:"operations", scenario:{hall:false,water:0,shade:0,medical:0,kids:false,budget:2000}, plan:null, applied:false, audit:[]
};
const viewMeta={
  atlas:["EUROPE CLIMATE COMMAND","Climate Atlas"],watch:["EARLY WARNING & OPERATIONS","Climate Watch"],
  event:["FORGE SUMMER FESTIVAL","Event Digital Twin"],actioncast:["CONSTRAINED AI PLANNING","ActionCast AI"],
  scenarios:["COUNTERFACTUAL OPERATIONS","Scenario Lab"],response:["EXECUTION & COMMUNICATIONS","Response Hub"],
  reports:["POST-EVENT INTELLIGENCE","Reports"],evidence:["TRUST & TRACEABILITY","Evidence Center"]
};
const timeline=[
 {time:"12:00",score:42,temp:33.2,risk:54,feels:35.1,msg:"Heat begins building over Iberia",heat:[[285,455,118,70,.26],[392,394,122,76,.18],[540,338,96,60,.06],[690,278,80,48,.02]],cols:[28,22,18,40]},
 {time:"13:00",score:49,temp:35.4,risk:61,feels:36.9,msg:"Heat corridor enters southern France",heat:[[300,444,130,76,.34],[418,382,136,84,.26],[564,326,98,64,.10],[702,276,82,50,.03]],cols:[36,30,22,46]},
 {time:"14:00",score:58,temp:37.8,risk:71,feels:39.1,msg:"Brussels enters early warning range",heat:[[310,436,138,78,.39],[438,372,152,88,.36],[584,314,108,68,.18],[706,270,84,52,.08]],cols:[52,38,28,50]},
 {time:"15:00",score:68,temp:39.1,risk:82,feels:40.7,msg:"Heat corridor moving north-east",heat:[[315,428,144,82,.44],[448,362,164,98,.42],[587,304,116,72,.34],[688,272,88,54,.24]],cols:[74,44,36,46]},
 {time:"16:00",score:73,temp:40.3,risk:87,feels:41.5,msg:"Brussels critical threshold exceeded",heat:[[324,424,156,90,.48],[460,356,168,102,.46],[602,300,122,76,.40],[700,268,96,58,.29]],cols:[84,48,40,42]},
 {time:"17:00",score:70,temp:39.8,risk:85,feels:41.0,msg:"Peak heat persists over Belgium",heat:[[332,418,152,88,.44],[470,352,162,98,.44],[612,298,118,74,.38],[704,266,88,54,.26]],cols:[80,46,39,39]},
 {time:"18:00",score:64,temp:38.6,risk:78,feels:39.6,msg:"Corridor weakens; event risk remains high",heat:[[340,412,144,84,.38],[478,348,148,92,.38],[620,294,112,70,.28],[706,264,80,50,.18]],cols:[68,38,31,34]},
 {time:"19:00",score:56,temp:36.9,risk:67,feels:37.8,msg:"Operational pressure begins to ease",heat:[[340,410,126,76,.28],[486,342,134,82,.28],[626,290,98,62,.16],[710,260,68,44,.10]],cols:[48,28,22,28]},
 {time:"20:00",score:47,temp:34.8,risk:58,feels:35.7,msg:"Heat retracts after sunset",heat:[[344,404,112,70,.20],[492,338,116,74,.20],[632,286,82,52,.08],[716,258,54,34,.04]],cols:[30,18,14,22]}
];
const messages={
 operations:{label:"Operations",channel:"OPERATIONS",title:"Peak-heat operations briefing",body:`15:00 operational update — risk HIGH (82/100).

Immediate priorities:
1. Open Hall C as an indoor cooling zone.
2. Add two temporary water stations near Main Stage.
3. Move the children’s 15:00 activity to 18:00.
4. Add one mobile response team during the critical window.
5. Re-check Main Stage density at 15:20.

Current drivers: feels-like 40.7°C, crowd exposure 76/100, cooling gap 830 people/hour.`},
 staff:{label:"Staff",channel:"STAFF",title:"Shift instructions",body:`Peak heat is expected from 14:00–17:30.

• Direct guests toward Hall C and marked cooling areas.
• Redirect hydration queues toward Water B and temporary stations.
• Keep routes to medical stations unobstructed.
• Rotate outdoor staff through shaded/cool areas.
• Report any blocked resource point immediately.`},
 visitors:{label:"Visitors",channel:"VISITORS",title:"Heat advisory",body:`High heat is expected this afternoon.

Please use marked water stations regularly and take breaks in Hall C, our indoor cooling zone. The children’s 15:00 outdoor activity has moved to 18:00.

If you need assistance, ask a staff member or visit a medical point.`},
 parents:{label:"Parents",channel:"PARENTS",title:"Children’s program update",body:`To reduce heat exposure during the hottest part of the afternoon, the 15:00 children’s outdoor activity has moved to 18:00.

Hall C is open as an indoor cooling zone. Water and staff support remain available across the venue.`},
 sms:{label:"SMS",channel:"SMS",title:"Short alert",body:`High heat 14:00–17:30. Use water stations + Hall C cooling zone. Kids activity moved to 18:00. Ask staff for help if needed.`}
};
const tasks=[
 ["Open Hall C as cooling zone","Operations","Before 14:30"],["Deploy two temporary water points","Logistics","Before 14:45"],
 ["Move Kids Program to 18:00","Programming","Now"],["Stage one extra response team","Safety","14:00–17:30"],["Send visitor heat advisory","Communications","Now"]
];
const zoneData={
 main:["Main Stage","2,140","92","12%","140 m","Main Stage becomes the highest-risk zone after 14:40 as crowd density overlaps with the cooling deficit."],
 "stage-b":["Stage B","920","74","31%","80 m","Stage B remains manageable but shade should be expanded near the queue."],
 kids:["Kids Zone","310","84","44%","95 m","The 15:00 children’s activity overlaps the peak heat window; shifting it later gives the largest no-cost exposure reduction."],
 "hall-c":["Hall C","0","18","100%","35 m","Hall C is underused indoor capacity. Opening it adds 830 people/hour of cooling throughput."]
};
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));
function toast(msg){const e=$("#toast");e.textContent=msg;e.classList.add("show");clearTimeout(e.t);e.t=setTimeout(()=>e.classList.remove("show"),1800)}
async function api(url,opts){const r=await fetch(url,opts);if(!r.ok)throw new Error(`${r.status} ${r.statusText}`);return r.json()}
function audit(action,status="OK"){state.audit.unshift({time:new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}),actor:"Operations Manager",action,status});renderAudit()}
function switchView(v){state.view=v;$$(".view").forEach(x=>x.classList.toggle("active",x.id===`view-${v}`));$$(".nav-item").forEach(x=>x.classList.toggle("active",x.dataset.view===v));$("#viewKicker").textContent=viewMeta[v][0];$("#viewTitle").textContent=viewMeta[v][1];document.querySelector("main").scrollTop=0;if(v==="reports")loadReport()}
function updateTimeline(){
 const s=timeline[state.timeline];$("#timelineRange").value=state.timeline;$("#timelineTime").textContent=s.time;$("#atlasEventRisk").textContent=state.applied&&state.timeline>=3?Math.max(49,s.risk-13):s.risk;$("#heroRisk").textContent=state.applied&&state.timeline>=3?Math.max(49,s.risk-13):s.risk;$("#heroFeels").textContent=`${s.feels.toFixed(1)}°C`;$("#atlasSignalTitle").textContent=s.msg;
 const heatIds=["heatA","heatB","heatC","heatD"];s.heat.forEach((h,i)=>{const n=document.getElementById(heatIds[i]);["cx","cy","rx","ry","opacity"].forEach((a,j)=>n.setAttribute(a,h[j]))});
 ["colBrussels","colParis","colBerlin","colMadrid"].forEach((id,i)=>{let h=s.cols[i];if(i===0&&state.applied&&state.timeline>=3)h=Math.max(26,h-18);const n=document.getElementById(id);n.setAttribute("y",-10-h);n.setAttribute("height",h)});
}
function playTimeline(){clearInterval(state.timer);state.playing=true;$("#timelinePlay").textContent="❚❚";state.timer=setInterval(()=>{state.timeline=(state.timeline+1)%timeline.length;updateTimeline()},2200)}
function pauseTimeline(){state.playing=false;clearInterval(state.timer);$("#timelinePlay").textContent="▶"}
function initMapHover(){
 const tip=$("#mapTooltip"), svg=$("#europeMap");
 $$("[data-name]").forEach(x=>{x.addEventListener("mouseenter",()=>{tip.innerHTML=`<b>${esc(x.dataset.name)}</b>${esc(x.dataset.copy)}`;tip.classList.add("show")});x.addEventListener("mousemove",e=>{const r=svg.getBoundingClientRect();tip.style.left=Math.min(r.width-230,e.clientX-r.left+15)+"px";tip.style.top=Math.min(r.height-80,e.clientY-r.top+12)+"px"});x.addEventListener("mouseleave",()=>tip.classList.remove("show"))});
 $$(".city").forEach(x=>x.addEventListener("click",()=>toast(`${x.dataset.city} climate node selected`)));
}
async function health(){
 try{const h=await api("/api/health");$("#systemLed").classList.add("ok");$("#systemStatus").textContent="Systems operational";$("#systemDetail").textContent=h.aiConfigured?`Featherless LIVE · ${h.model}`:"Live data ready · AI fallback";$("#aiStatusBadge").classList.toggle("live",h.aiConfigured);$("#aiStatusBadge").innerHTML=`<i></i>${h.aiConfigured?"Featherless · LIVE":"Deterministic fallback"}`;return h}catch(e){$("#systemStatus").textContent="Backend unavailable";$("#systemDetail").textContent="Run npm start"}}
async function loadCore(){
 try{state.event=await api("/api/event")}catch{}
 try{const [eu,br,al]=await Promise.all([api("/api/live/europe"),api("/api/live/brussels"),api("/api/alerts")]);state.europe=eu;state.brussels=br;state.alerts=al;window.__CROWDSHIFT_LIVE_EUROPE__=eu;window.__CROWDSHIFT_LIVE_BRUSSELS__=br;renderOfficialAlerts();renderSources()}catch(e){console.warn(e)}
 try{const g=await api("/api/guidance");renderGuidanceLibrary(g.items||[])}catch{}
}
function switchDataMode(live){state.live=live;$("#liveMode").classList.toggle("active",live);$("#scenarioMode").classList.toggle("active",!live);$("#cityStrip").classList.toggle("show",live);$("#dataModeTag").innerHTML=live?`<i style="background:var(--green)"></i> LIVE OPEN-METEO`:`<i></i> HEATWAVE SCENARIO`;$("#atlasUpdated").textContent=live?`API refreshed ${new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}`:`${timeline[state.timeline].time} simulation`;if(live)renderLiveAtlas();else updateTimeline()}
function renderLiveAtlas(){
 if(!state.europe)return toast("Live data still loading");
 const cities=[...(state.europe.cities||[])].sort((a,b)=>(b.apparent||0)-(a.apparent||0));$("#cityStrip").innerHTML=cities.slice(0,8).map(c=>`<span>${esc(c.name)} · ${Number(c.apparent).toFixed(1)}° · R${c.risk}</span>`).join("");
 const b=cities.find(x=>x.name==="Brussels");if(b){$("#heroRisk").textContent=b.risk;$("#atlasEventRisk").textContent=b.risk;$("#heroFeels").textContent=`${b.apparent.toFixed(1)}°C`;}
 $("#atlasSignalTitle").textContent="Live European climate feed";$("#atlasSignalText").textContent=`Current Open-Meteo data loaded for ${cities.length} European cities. ${state.europe.summary.hottestCity} has the highest apparent temperature in this sample.`;
 const ids={Brussels:"colBrussels",Paris:"colParis",Berlin:"colBerlin",Madrid:"colMadrid"};Object.entries(ids).forEach(([name,id])=>{const c=cities.find(x=>x.name===name);if(c){const h=Math.max(12,Math.round(c.risk*.7)),n=document.getElementById(id);n.setAttribute("y",-10-h);n.setAttribute("height",h)}});
}
function renderSignals(){
 const signals=[
  ["red","CRITICAL","Cooling capacity exceeded","Required 1,450 ppl/h vs 620 available during peak exposure.","18 min to threshold"],
  ["orange","HIGH","Heat corridor moving north-east","Northern France → Belgium; event exposure is increasing.","94% confidence"],
  ["yellow","WATCH","Water A projected overload","118% utilization and 7 minute queue near Main Stage.","24 min horizon"],
  ["blue","INFO","Forecast model refreshed","Weather and air-quality context updated for Brussels.","Open-Meteo + CAMS"]
 ];
 $("#signalGrid").innerHTML=signals.map(s=>`<div class="signal-box"><span class="sev ${s[0]}">${s[1]}</span><h3>${s[2]}</h3><p>${s[3]}</p><small>${s[4]}</small></div>`).join("");
}
function renderOfficialAlerts(){
 const box=$("#officialAlerts");const a=state.alerts?.alerts||[];$("#warningApiBadge").textContent=state.alerts?.degraded?"DEMO CONTEXT":"LIVE ATOM";
 box.innerHTML=a.length?a.slice(0,4).map(x=>`<div class="official-alert"><b>${esc(x.title)}</b><p>${esc(x.summary||"Official warning context.")}</p><small>${esc(x.source||"MeteoAlarm")} ${x.updated?`· ${esc(x.updated)}`:""}</small></div>`).join(""):`<div class="official-alert"><b>No active Belgium alert returned</b><p>CrowdShift still calculates event-specific exposure and resource risk independently.</p></div>`;
}
function zoneSelect(id){const z=zoneData[id];if(!z)return;$("#zoneInspector").innerHTML=`<span class="eyebrow">SELECTED ZONE</span><h3>${z[0]}</h3><div class="zone-metrics"><div><small>PEOPLE</small><b>${z[1]}</b></div><div><small>HEAT</small><b>${z[2]}</b></div><div><small>SHADE</small><b>${z[3]}</b></div><div><small>WATER</small><b>${z[4]}</b></div></div><p>${z[5]}</p>`}
async function generatePlan(){
 const btn=$("#generatePlanBtn");btn.disabled=true;btn.textContent="✦ ActionCast is reasoning…";$("#planHeadline").textContent="Retrieving guidance…";
 try{
  const cur=state.brussels?.current||{};
  const ctx={userPrompt:$("#aiPrompt").value,location:"Brussels, Belgium",event:"Forge Summer Festival",attendees:4800,operationalRisk:82,criticalWindow:"14:00–17:30",budgetEur:2000,resources:state.event?.resources||{},environmentalInputs:{temperatureC:cur.temperature??39.1,apparentTemperatureC:cur.apparent??40.7,humidityPct:cur.humidity??48,windKmh:cur.wind??9,europeanAQI:cur.europeanAqi??31},constraints:{noCancellation:true,keepStartTime:true,budgetEur:2000}};
  const plan=await api("/api/ai/plan",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(ctx)});state.plan=plan;renderPlan(plan);audit(`ActionCast generated ${plan.actions?.length||0} interventions`,plan.mode==="live-ai"?"LIVE AI":"FALLBACK");toast("ActionCast plan ready");
 }catch(e){toast("Plan request failed");$("#planHeadline").textContent="Planning failed"}finally{btn.disabled=false;btn.textContent="✦ Generate ActionCast Plan"}
}
function renderPlan(p){
 $("#planHeadline").textContent="Feasible response plan";$("#planMode").textContent=p.mode==="live-ai"?`FEATHERLESS · ${p.model}`:p.mode.toUpperCase();$("#planSummary").textContent=p.summary||"Plan generated.";
 $("#planList").innerHTML=(p.actions||[]).map(a=>`<div class="plan-action"><div class="plan-rank">0${a.priority}</div><div><h3>${esc(a.title)}</h3><p>${esc(a.why)}</p></div><div class="plan-numbers"><div><small>COST</small><b>€${a.cost_eur}</b></div><div><small>RISK ↓</small><b>−${a.risk_reduction_points}</b></div><div><small>CONF</small><b>${Math.round(Number(a.confidence||0)*100)}%</b></div><div><small>EVIDENCE</small><b>${(a.evidence||[]).length||1}</b></div></div></div>`).join("");
 const spend=p.spend??(p.actions||[]).reduce((s,a)=>s+(+a.cost_eur||0),0),proj=p.projectedRisk??49;$("#planFooter").innerHTML=`<div>TOTAL SPEND<b>€${spend}</b></div><div>PROJECTED RISK<b>82 → ${proj}</b></div><div>UNUSED BUDGET<b>€${Math.max(0,2000-spend)}</b></div>`;
 $("#retrievedGuidance").innerHTML=(p.retrievedGuidance||[]).map(g=>`<div class="guidance-item"><span class="src">${esc(g.source)}</span><b>${esc(g.title)}</b><p>${esc(g.summary)}</p></div>`).join("")||"<p>No retrieved guidance.</p>";
}
async function scenarioRecalc(){
 const body={hall:$("#scHall").checked,water:+$("#scWater").textContent,shade:+$("#scShade").textContent,medical:+$("#scMedical").textContent,kids:$("#scKids").checked,budget:+$("#scBudget").value};state.scenario=body;
 try{const r=await api("/api/scenario",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});renderScenario(r)}catch(e){}
}
function renderScenario(r){$("#scenarioAfterRisk").textContent=r.afterRisk;$("#scenarioLevel").textContent=r.afterRisk>=70?"HIGH":r.afterRisk>=45?"MODERATE":"LOW";$("#scenarioReduction").textContent=`−${r.reduction} pts`;$("#scenarioSpend").textContent=`€${r.spend}`;$("#scenarioResilience").textContent=`${r.resilienceBefore} → ${r.resilienceAfter}`;$("#scenarioBudgetState").textContent=r.withinBudget?`€${Math.max(0,state.scenario.budget-r.spend)} left`:"OVER BUDGET";$("#scenarioDeltas").innerHTML=`Cooling: <b>${r.resources.cooling.current.toLocaleString()} / ${r.resources.cooling.required.toLocaleString()} people/h</b><br>Water: <b>${r.resources.water.current.toLocaleString()} / ${r.resources.water.required.toLocaleString()} L/h</b><br>Medical: <b>${r.resources.medical.current} / ${r.resources.medical.required} teams</b>`;$("#applyScenarioBtn").disabled=r.reduction===0||!r.withinBudget}
function applyScenario(){state.applied=true;$("#hallStatus").textContent=state.scenario.hall?"Open · cooling active":"Closed";if(state.scenario.hall){$("#coolingAvailable").textContent="1,450 ppl/h";$("#coolingGap").textContent="0";}$("#riskGraphScore").textContent=$("#scenarioAfterRisk").textContent;audit(`Scenario applied: risk 82 → ${$("#scenarioAfterRisk").textContent}`);toast("Scenario applied to operations");switchView("response")}
function renderTasks(){$("#taskList").innerHTML=tasks.map((t,i)=>`<div class="task ${state.tasksDone.has(i)?"done":""}"><div class="task-no">0${i+1}</div><div><b>${t[0]}</b><span>${t[1]} · ${t[2]}</span></div><button data-task="${i}">${state.tasksDone.has(i)?"✓ ACK":"Acknowledge"}</button></div>`).join("");$("#taskCount").textContent=state.tasksDone.size;$("#taskNavCount").textContent=Math.max(0,5-state.tasksDone.size);$$("[data-task]").forEach(b=>b.onclick=()=>{const i=+b.dataset.task;if(!state.tasksDone.has(i)){state.tasksDone.add(i);audit(`Task acknowledged: ${tasks[i][0]}`)}renderTasks()})}
function renderMessages(){const keys=Object.keys(messages);$("#messageTabs").innerHTML=keys.map(k=>`<button data-msg="${k}" class="${k===state.message?"active":""}">${messages[k].label}</button>`).join("");const m=messages[state.message];$("#messageChannel").textContent=m.channel;$("#messageTitle").textContent=m.title;$("#messageBody").textContent=m.body;$$("[data-msg]").forEach(b=>b.onclick=()=>{state.message=b.dataset.msg;renderMessages()})}
async function loadReport(){try{const r=await api("/api/report");$("#reportKpis").innerHTML=[["Peak risk",r.peakRisk],["High-risk duration",r.durationHigh],["Actions taken",r.actionsTaken],["Avg response",r.averageResponse],["Modeled risk ↓",r.modeledRiskReduction]].map(x=>`<div class="report-kpi"><small>${x[0]}</small><b>${x[1]}</b></div>`).join("");$("#reportSummary").textContent=r.summary;$("#reportRecommendations").innerHTML=r.recommendations.map(x=>`<div>${esc(x)}</div>`).join("");const before=[54,61,71,82,87,85,78,67,58],after=[54,61,71,69,72,70,63,55,49];$("#reportChart").innerHTML=before.map((v,i)=>`<div class="chart-col"><i class="beforebar" style="height:${v*2}px"></i><i class="afterbar" style="height:${after[i]*2}px"></i><span>${timeline[i].time.slice(0,2)}</span></div>`).join("")}catch{}}
function renderSources(){const h=state.europe;$("#sourceList").innerHTML=[["Open-Meteo Forecast API",h?.degraded?"Fallback loaded":"Connected","Weather + apparent temperature + wind"],["CAMS via Open-Meteo",state.brussels?.degraded?"Fallback loaded":"Connected","European AQI + PM2.5 + UV"],["MeteoAlarm Atom",state.alerts?.degraded?"Historical demo context":"Connected","Official Belgium warning context"],["Featherless AI","See system status","ActionCast planning"]].map(x=>`<div class="source-row"><div><b>${x[0]}</b><small>${x[2]}</small></div><span>${x[1]}</span></div>`).join("")}
function renderGuidanceLibrary(items){$("#guidanceLibrary").innerHTML=(items||[]).slice(0,7).map(x=>`<div class="lib-row"><b>${esc(x.source)} · ${esc(x.title)}</b><small>${esc(x.summary)}</small></div>`).join("")}
function renderAudit(){const fallback=[{time:"14:30",actor:"RiskGraph","action":"Operational risk recalculated 71 → 82",status:"AUTO"},{time:"14:31",actor:"ActionCast","action":"2 optional interventions escalated to recommended",status:"AI"},{time:"14:32",actor:"Climate API","action":"Weather / AQI state refreshed",status:"LIVE"}];const arr=[...state.audit,...fallback].slice(0,8);$("#auditList").innerHTML=arr.map(x=>`<div class="audit-row"><small>${x.time}</small><b>${x.actor}</b><span>${x.action}</span><em>${x.status}</em></div>`).join("")}
function copyMessage(){navigator.clipboard?.writeText($("#messageBody").textContent).then(()=>toast("Message copied")).catch(()=>toast("Copy unavailable"))}
function modal(id,open=true){$("#"+id).classList.toggle("open",open)}
const tour=[
 ["atlas","1. Climate signal becomes operational risk","Europe shows the 2026 heatwave corridor moving toward Belgium. CrowdShift identifies the event, not just the weather."],
 ["watch","2. Early warning with official context","Climate Watch merges environmental change, venue capacity conflicts and official warning context."],
 ["event","3. Digital Twin explains why risk is high","Climate × crowd × resources create RiskGraph 82/100. The indoor Hall C capacity is currently unused."],
 ["actioncast","4. AI plans within real constraints","ActionCast retrieves guidance, then ranks feasible actions under the €2,000 budget."],
 ["scenarios","5. Simulate before acting","The operator tests Hall C, water, shade and schedule changes before committing resources."],
 ["response","6. Recommendations become accountable action","Tasks are acknowledged and one verified state becomes tailored communications for staff, visitors and parents."],
 ["evidence","7. The architecture is auditable","Weather APIs → RiskGraph → guidance retrieval → ActionCast AI → scenario engine → human decision."]
];let tourIndex=0;
function showTour(i){tourIndex=i;const t=tour[i];switchView(t[0]);$("#tourTitle").textContent=t[1];$("#tourText").textContent=t[2];$("#tourToast").classList.add("show");$("#tourNext").textContent=i===tour.length-1?"Finish":"Next →"}
function bind(){
 $$(".nav-item").forEach(b=>b.onclick=()=>switchView(b.dataset.view));$$("[data-jump]").forEach(b=>b.onclick=()=>switchView(b.dataset.jump));
 $("#architectureBtn").onclick=()=>modal("architectureModal");$("#why82Btn").onclick=()=>modal("riskModal");$$("[data-close-modal]").forEach(b=>b.onclick=()=>b.closest(".modal-backdrop").classList.remove("open"));$$(".modal-backdrop").forEach(m=>m.onclick=e=>{if(e.target===m)m.classList.remove("open")});
 $("#scenarioMode").onclick=()=>switchDataMode(false);$("#liveMode").onclick=()=>switchDataMode(true);$("#timelineRange").oninput=e=>{pauseTimeline();state.timeline=+e.target.value;updateTimeline()};$("#timelinePlay").onclick=()=>state.playing?pauseTimeline():playTimeline();
 $$(".zone").forEach(z=>z.onclick=()=>zoneSelect(z.dataset.zone));$("#refreshAlertsBtn").onclick=async()=>{state.alerts=await api("/api/alerts");renderOfficialAlerts();toast("Official warning feed refreshed")};
 $("#generatePlanBtn").onclick=generatePlan;$$(".constraint").forEach(b=>b.onclick=()=>b.classList.toggle("active"));
 ["#scHall","#scKids","#scBudget"].forEach(s=>$(s).oninput=scenarioRecalc);$$("[data-step]").forEach(b=>b.onclick=()=>{const id={water:"#scWater",shade:"#scShade",medical:"#scMedical"}[b.dataset.step],e=$(id);e.textContent=Math.max(0,Math.min(5,+e.textContent+(+b.dataset.dir)));scenarioRecalc()});$("#optimizeScenarioBtn").onclick=()=>{$("#scHall").checked=true;$("#scKids").checked=true;$("#scWater").textContent=2;$("#scShade").textContent=1;$("#scMedical").textContent=1;scenarioRecalc()};$("#applyScenarioBtn").onclick=applyScenario;
 $("#compileCommsBtn").onclick=()=>{renderMessages();toast("Audience updates recompiled")};$("#copyMessageBtn").onclick=copyMessage;
 $("#judgeTourBtn").onclick=()=>showTour(0);$("#tourStop").onclick=()=>$("#tourToast").classList.remove("show");$("#tourNext").onclick=()=>{if(tourIndex>=tour.length-1){$("#tourToast").classList.remove("show");switchView("atlas")}else showTour(tourIndex+1)};
 const enterBtn=$("#enterPlatformBtn"), tourBtn=$("#startJudgeTour");
 if(enterBtn) enterBtn.onclick=()=>modal("introModal",false);
 if(tourBtn) tourBtn.onclick=()=>{modal("introModal",false);showTour(0)};
}
async function init(){bind();initMapHover();renderSignals();renderTasks();renderMessages();renderAudit();updateTimeline();playTimeline();await health();await loadCore();scenarioRecalc()}
document.addEventListener("DOMContentLoaded",init);
