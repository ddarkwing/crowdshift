(()=>{
  const $=s=>document.querySelector(s);
  const mapStage=()=>$('#mapStage');
  let map=null, overlay=null, loaded=false, nasa=false;
  let showHeat=true, showHex=true, showEvents=true;
  const cityCoords={London:[-0.1278,51.5074],Paris:[2.3522,48.8566],Brussels:[4.3517,50.8503],Berlin:[13.405,52.52],Madrid:[-3.7038,40.4168],Rome:[12.4964,41.9028],Amsterdam:[4.9041,52.3676],Athens:[23.7275,37.9838]};
  const scenarioCenters=[
    [[-3.5,40.5,72],[1.8,44.7,54],[4.4,50.7,22]],
    [[-2.0,42.0,76],[2.2,46.0,62],[4.4,50.7,34]],
    [[-1.0,43.0,78],[2.6,47.0,72],[4.4,50.7,55]],
    [[-0.5,43.8,79],[2.8,47.8,78],[4.35,50.85,88],[8.2,50.7,60]],
    [[0.2,44.2,82],[3.3,48.1,84],[4.35,50.85,96],[9.0,51.1,72]],
    [[0.5,44.4,78],[3.6,48.3,81],[4.35,50.85,92],[9.5,51.3,70]],
    [[1.0,45.0,70],[4.0,48.6,72],[4.35,50.85,78],[10.0,51.4,60]],
    [[1.5,45.4,60],[4.3,48.8,62],[4.35,50.85,62],[10.5,51.6,50]],
    [[2.0,45.8,48],[4.5,49.0,50],[4.35,50.85,46],[11.0,51.7,38]]
  ];
  function seededPoints(centers){
    const pts=[];
    centers.forEach((c,ci)=>{
      const [lng,lat,w]=c;
      for(let i=0;i<65;i++){
        const angle=(i*2.399963+ci*.7),rad=Math.sqrt((i+1)/65);
        const dx=Math.cos(angle)*rad*4.6,dy=Math.sin(angle)*rad*2.6;
        const weight=Math.max(1,w*(1-rad*.78));
        pts.push({position:[lng+dx,lat+dy],weight});
      }
    });
    return pts;
  }
  function livePoints(){
    const eu=window.__CROWDSHIFT_LIVE_EUROPE__;
    if(!eu?.cities?.length) return null;
    const pts=[];
    eu.cities.forEach((c,ci)=>{
      if(!Number.isFinite(c.lon)||!Number.isFinite(c.lat))return;
      const w=Math.max(5,c.risk||5);
      for(let i=0;i<24;i++){
        const a=i*2.399963+ci*.2,r=Math.sqrt((i+1)/24);
        pts.push({position:[c.lon+Math.cos(a)*r*2.0,c.lat+Math.sin(a)*r*1.25],weight:w*(1-r*.65)});
      }
    });
    return pts;
  }
  function scenarioIndex(){const e=$('#timelineRange');return e?+e.value:3}
  function eventData(){
    const idx=scenarioIndex(), risk=[54,61,71,82,87,85,78,67,58][idx];
    return [
      {position:cityCoords.Brussels,name:'Forge Summer Festival',city:'Brussels',risk,attendees:4800,priority:true},
      {position:cityCoords.Paris,name:'Paris Outdoor Expo',city:'Paris',risk:Math.max(28,risk-17),attendees:2600},
      {position:cityCoords.Madrid,name:'Madrid Urban Run',city:'Madrid',risk:Math.max(34,74-idx*3),attendees:1900},
      {position:cityCoords.Berlin,name:'Berlin Open Air',city:'Berlin',risk:Math.max(24,risk-26),attendees:3200}
    ];
  }
  function colorRange(){return [[32,151,111,60],[107,211,157,85],[242,218,96,110],[255,173,74,150],[255,111,75,190],[219,55,64,225]]}
  function layers(){
    if(typeof deck==='undefined') return [];
    const live=$('#liveMode')?.classList.contains('active');
    const pts=(live&&livePoints())||seededPoints(scenarioCenters[scenarioIndex()]||scenarioCenters[3]);
    const ev=eventData(), ls=[];
    if(showHeat) ls.push(new deck.HeatmapLayer({id:'climate-heat',data:pts,getPosition:d=>d.position,getWeight:d=>d.weight,radiusPixels:58,intensity:1.15,threshold:.03,colorRange:colorRange(),opacity:.78}));
    if(showHex) ls.push(new deck.HexagonLayer({id:'risk-hex',data:pts,getPosition:d=>d.position,getColorWeight:d=>d.weight,colorAggregation:'MEAN',getElevationWeight:d=>d.weight,elevationAggregation:'SUM',radius:85000,extruded:true,elevationScale:28,coverage:.72,opacity:.37,colorRange:colorRange(),material:{ambient:.45,diffuse:.55,shininess:32,specularColor:[120,240,190]}}));
    // Atmospheric corridor / directional flows
    ls.push(new deck.ArcLayer({id:'heat-corridor-arcs',data:[
      {s:[-3.7,40.4],t:[2.35,48.86],v:60},{s:[2.35,48.86],t:[4.35,50.85],v:90},{s:[4.35,50.85],t:[13.4,52.52],v:55}
    ],getSourcePosition:d=>d.s,getTargetPosition:d=>d.t,getSourceColor:d=>[255,210,104,55],getTargetColor:d=>[255,91,80,120],getWidth:d=>Math.max(1,d.v/26),greatCircle:true,pickable:false,opacity:.65}));
    if(showEvents){
      ls.push(new deck.ScatterplotLayer({id:'events',data:ev,getPosition:d=>d.position,getRadius:d=>d.priority?45000:26000,getFillColor:d=>d.priority?[255,141,78,220]:d.risk>=70?[255,100,83,190]:[104,240,190,180],getLineColor:[230,255,247,180],lineWidthMinPixels:1,stroked:true,radiusMinPixels:7,radiusMaxPixels:30,pickable:true,onClick:info=>{if(info.object)focusEvent(info.object)}}));
      ls.push(new deck.TextLayer({id:'event-labels',data:ev,getPosition:d=>d.position,getText:d=>d.priority?`BRUSSELS · ${d.risk}`:`${d.city} · ${d.risk}`,getSize:d=>d.priority?16:11,getColor:d=>d.priority?[255,238,217,255]:[205,238,226,210],getPixelOffset:[0,-22],fontFamily:'Inter, sans-serif',fontWeight:700,billboard:true,pickable:false}));
    }
    return ls;
  }
  function update(){if(overlay)overlay.setProps({layers:layers()})}
  function focusEvent(d){
    if(!map)return;
    map.flyTo({center:d.position,zoom:d.priority?8.1:6.2,pitch:58,bearing:d.priority?-18:0,duration:1900,essential:true});
    if(d.priority){
      new maplibregl.Popup({offset:18,closeButton:true}).setLngLat(d.position).setHTML(`<div class="map-popup"><small>Priority Event</small><b>${d.name}</b><span>${d.attendees.toLocaleString()} attendees · Risk ${d.risk}/100<br>Click “Open Event Twin” in the side panel to inspect local operations.</span></div>`).addTo(map);
    }
  }
  function reset(){map?.flyTo({center:[7.6,49.1],zoom:3.65,pitch:43,bearing:-7,duration:1600,essential:true})}
  function toggleNASA(){
    if(!map)return;
    nasa=!nasa;$('#nasaLayerBtn')?.classList.toggle('active',nasa);
    if(nasa){
      if(!map.getSource('nasa-gibs')){
        map.addSource('nasa-gibs',{type:'raster',tiles:['https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/2026-07-15/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg'],tileSize:256,maxzoom:9,attribution:'NASA EOSDIS GIBS'});
        // put over basemap but under deck canvas
        map.addLayer({id:'nasa-gibs-layer',type:'raster',source:'nasa-gibs',paint:{'raster-opacity':.46,'raster-saturation':-.18,'raster-contrast':.12}});
      }else map.setLayoutProperty('nasa-gibs-layer','visibility','visible');
    }else if(map.getLayer('nasa-gibs-layer'))map.setLayoutProperty('nasa-gibs-layer','visibility','none');
  }
  function status(msg,ok=false,fallback=false){const e=$('#mapRuntimeStatus');if(e)e.querySelector('span').textContent=msg;const s=mapStage();s?.classList.toggle('runtime-ok',ok);s?.classList.toggle('runtime-fallback',fallback)}
  function init(){
    const el=$('#realEuropeMap'); if(!el)return;
    if(typeof maplibregl==='undefined'||typeof deck==='undefined'||!deck.MapboxOverlay){status('CDN renderer unavailable · SVG fallback active',false,true);return;}
    try{
      map=new maplibregl.Map({container:'realEuropeMap',style:'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',center:[7.6,49.1],zoom:3.65,pitch:43,bearing:-7,antialias:true,maxPitch:72,attributionControl:true});
      map.addControl(new maplibregl.NavigationControl({showCompass:true,visualizePitch:true}),'bottom-right');
      map.on('load',()=>{
        overlay=new deck.MapboxOverlay({interleaved:false,layers:layers()});map.addControl(overlay);loaded=true;status('MapLibre + deck.gl · GPU climate layers',true,false);
        const badge=document.createElement('div');badge.className='library-badge';badge.innerHTML='<span>MapLibre 6.13</span><span>deck.gl 9.4</span>';mapStage()?.appendChild(badge);
        // watch UI changes that affect layers
        $('#timelineRange')?.addEventListener('input',()=>setTimeout(update,0));
        $('#scenarioMode')?.addEventListener('click',()=>setTimeout(update,80));
        $('#liveMode')?.addEventListener('click',()=>setTimeout(update,450));
        $('#heatLayerBtn')?.addEventListener('click',e=>{showHeat=!showHeat;e.currentTarget.classList.toggle('active',showHeat);update()});
        $('#hexLayerBtn')?.addEventListener('click',e=>{showHex=!showHex;e.currentTarget.classList.toggle('active',showHex);update()});
        $('#eventLayerBtn')?.addEventListener('click',e=>{showEvents=!showEvents;e.currentTarget.classList.toggle('active',showEvents);update()});
        $('#nasaLayerBtn')?.addEventListener('click',toggleNASA);$('#resetMapBtn')?.addEventListener('click',reset);
        // Cinematic first entry
        setTimeout(()=>map.flyTo({center:[4.35,50.85],zoom:4.35,pitch:48,bearing:-9,duration:1800}),650);
        setTimeout(reset,2900);
      });
      map.on('error',e=>{if(!loaded){console.warn('MapLibre style/runtime error',e.error);status('Map service unavailable · SVG fallback active',false,true)}});
    }catch(e){console.warn(e);status('Map renderer failed · SVG fallback active',false,true)}
  }
  // expose live data to map after existing app loads it. Poll lightweight reference every 1.5s.
  let last=null;setInterval(()=>{try{const txt=$('#cityStrip')?.textContent;if(txt&&txt!==last){last=txt;if($('#liveMode')?.classList.contains('active'))update()}}catch{}},1500);
  document.addEventListener('DOMContentLoaded',init);
  window.CrowdShiftMap={update,reset,focusBrussels:()=>focusEvent(eventData()[0])};
})();
