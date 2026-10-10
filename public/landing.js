document.addEventListener('DOMContentLoaded',()=>{
  const el=document.getElementById('globeViz');
  const fallback=document.getElementById('globeFallback');
  if(!el) return;
  if(typeof Globe!=='function'){
    fallback?.classList.add('visible');
    return;
  }
  try{
    const points=[
      {lat:50.8503,lng:4.3517,size:.55,color:'#ff9d4d',name:'Brussels · Priority Event'},
      {lat:48.8566,lng:2.3522,size:.25,color:'#74f2c3',name:'Paris'},
      {lat:40.4168,lng:-3.7038,size:.22,color:'#ffd86d',name:'Madrid'},
      {lat:52.52,lng:13.405,size:.22,color:'#74f2c3',name:'Berlin'},
      {lat:41.9028,lng:12.4964,size:.20,color:'#74f2c3',name:'Rome'}
    ];
    const arcs=[
      {startLat:40.4168,startLng:-3.7038,endLat:48.8566,endLng:2.3522,color:['#ffd86d','#ff9d4d']},
      {startLat:48.8566,startLng:2.3522,endLat:50.8503,endLng:4.3517,color:['#ff9d4d','#ff6d62']},
      {startLat:50.8503,startLng:4.3517,endLat:52.52,endLng:13.405,color:['#ff6d62','#74f2c3']}
    ];
    const globe=Globe()(el)
      .backgroundColor('rgba(0,0,0,0)')
      .showAtmosphere(true)
      .atmosphereColor('#6ff2c2')
      .atmosphereAltitude(.18)
      .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-night.jpg')
      .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
      .pointsData(points)
      .pointLat(d=>d.lat).pointLng(d=>d.lng).pointColor(d=>d.color)
      .pointAltitude(d=>d.name.startsWith('Brussels')?.08:.025)
      .pointRadius(d=>d.size)
      .pointLabel(d=>`<b>${d.name}</b>`)
      .ringsData([points[0]])
      .ringLat(d=>d.lat).ringLng(d=>d.lng).ringColor(()=>t=>`rgba(255,157,77,${1-t})`)
      .ringMaxRadius(5).ringPropagationSpeed(2.2).ringRepeatPeriod(900)
      .arcsData(arcs).arcStartLat(d=>d.startLat).arcStartLng(d=>d.startLng)
      .arcEndLat(d=>d.endLat).arcEndLng(d=>d.endLng).arcColor(d=>d.color)
      .arcAltitude(.12).arcStroke(.65).arcDashLength(.5).arcDashGap(.2).arcDashAnimateTime(2600)
      .labelsData([{lat:50.8503,lng:4.3517,text:'BRUSSELS · CROWDSHIFT'}])
      .labelLat(d=>d.lat).labelLng(d=>d.lng).labelText(d=>d.text).labelColor(()=> '#dffff4')
      .labelSize(.65).labelDotRadius(.25).labelAltitude(.11);
    const size=()=>{const r=el.getBoundingClientRect();globe.width(Math.max(360,r.width)).height(Math.max(400,r.height));};
    size(); window.addEventListener('resize',size);
    globe.pointOfView({lat:49,lng:7,altitude:1.7},1600);
    const controls=globe.controls(); controls.autoRotate=true;controls.autoRotateSpeed=.28;controls.enablePan=false;
    fallback?.classList.remove('visible');
  }catch(e){console.warn('Globe renderer fallback',e);fallback?.classList.add('visible');}
});
