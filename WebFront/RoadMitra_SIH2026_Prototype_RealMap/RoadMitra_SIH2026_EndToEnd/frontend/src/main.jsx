import React, {useEffect, useRef, useState} from "react";
import {createRoot} from "react-dom/client";
import {MapContainer, TileLayer, Marker, Popup, useMap} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  AlertTriangle, BarChart3, BusFront, Camera, CheckCircle2, ChevronRight,
  CircleDot, Clock3, FileCheck2, Home, MapPin, Menu, Play, RefreshCw,
  Search, ShieldCheck, Sparkles, Upload, Wifi, Wrench, X, Zap, FlaskConical,
  ExternalLink, Maximize2
} from "lucide-react";
import "./styles.css";

const API = "http://127.0.0.1:8000";

const demoIncidents = [
  {id:"RM-1042",type:"Pothole",kind:"POTHOLE",severity:"HIGH",confidence:94.2,ward:"Ward 12",bus:"BUS-17",lat:17.3856,lng:78.4867,time:"10:24:18",status:"VERIFIED",snapshot:"",verification:{verifier:"stub",reason:"Demo record"}},
  {id:"RM-1041",type:"Longitudinal Crack",kind:"POTHOLE",severity:"MEDIUM",confidence:91.0,ward:"Ward 8",bus:"BUS-09",lat:17.3921,lng:78.4781,time:"10:23:44",status:"VERIFIED",snapshot:"",verification:{verifier:"stub",reason:"Demo record"}},
  {id:"RM-1040",type:"Pothole",kind:"POTHOLE",severity:"HIGH",confidence:92.0,ward:"Ward 5",bus:"BUS-21",lat:17.3712,lng:78.4922,time:"10:22:51",status:"VERIFIED",snapshot:"",verification:{verifier:"stub",reason:"Demo record"}},
];

function Badge({children,tone="blue"}){return <span className={`badge ${tone}`}>{children}</span>}

function App(){
  const [page,setPage]=useState("Dashboard"), [sidebar,setSidebar]=useState(true);
  const [incidents,setIncidents]=useState(demoIncidents), [selected,setSelected]=useState(demoIncidents[0]);
  const [toast,setToast]=useState(""), [apiInfo,setApiInfo]=useState({status:"checking"});
  const [stubMode,setStubMode]=useState(false);
  const notify=m=>{setToast(m);setTimeout(()=>setToast(""),3000)};

  useEffect(()=>{
    fetch(`${API}/api/health`)
      .then(r=>r.json())
      .then(d=>setApiInfo({...d,status:"online"}))
      .catch(()=>setApiInfo({status:"offline"}));
  },[]);

  const apiOnline = apiInfo.status==="online";

  const nav=[
    ["Dashboard",Home],["Live Scanner",Camera],["Live Map",MapPin],
    ["Detections",AlertTriangle],["Bus Fleet",BusFront],["Work Orders",Wrench],
    ["Evidence",FileCheck2],["Analytics",BarChart3],
  ];

  return <div className="app">
    <aside className={`sidebar ${sidebar?"open":""}`}>
      <div className="brand">
        <div className="logo"><ShieldCheck/></div>
        <div><b>RoadMitra</b><small>SIH 2026 · Integrated AI</small></div>
      </div>
      <div className="sideTitle">CONTROL CENTER</div>
      <nav>{nav.map(([n,I])=><button key={n} className={page===n?"active":""} onClick={()=>setPage(n)}>
        <I size={18}/><span>{n}</span>{n==="Detections"&&<em>{incidents.length}</em>}
      </button>)}</nav>

      {/* Stub/Real toggle */}
      <div className="sideCard" style={{marginTop:10}}>
        <div className="sideTop"><FlaskConical size={15}/><b>Pipeline mode</b></div>
        <div style={{marginTop:8,display:"flex",gap:6,alignItems:"center"}}>
          <button
            onClick={()=>setStubMode(false)}
            style={{flex:1,border:0,borderRadius:6,padding:"5px 0",fontSize:9,fontWeight:800,
              background:!stubMode?"#1c79b8":"#0d426c",color:"#fff",cursor:"pointer"}}>
            Real VLM
          </button>
          <button
            onClick={()=>setStubMode(true)}
            style={{flex:1,border:0,borderRadius:6,padding:"5px 0",fontSize:9,fontWeight:800,
              background:stubMode?"#d27a1c":"#0d426c",color:"#fff",cursor:"pointer"}}>
            Stub demo
          </button>
        </div>
        <p style={{marginTop:6,fontSize:8,color:"#9eb8cd",lineHeight:1.5}}>
          {stubMode?"Deterministic results — no GPU, no VLM endpoint needed.":"Runs real YOLOv8 + VLM inspector. Requires models + endpoint."}
        </p>
      </div>

      <div className="sideCard">
        <div className="sideTop"><Zap size={16}/><b>RoadFix pipeline</b></div>
        <p>ingest → detect → track_flag → verify_event → gate → publish</p>
      </div>
      <div className="sideBottom">
        <div className={`statusDot ${apiOnline?"online":""}`}/>
        <div>
          <b>Backend {apiInfo.status}</b>
          <small>{apiOnline&&apiInfo.stub_mode?"stub mode active":"FastAPI + LangGraph"}</small>
        </div>
      </div>
    </aside>

    <main className="main">
      <header className="topbar">
        <div className="topTitle">
          <button className="hamb" onClick={()=>setSidebar(!sidebar)}><Menu size={20}/></button>
          <div><small>SMART CITY OPERATIONS</small><h1>{page}</h1></div>
        </div>
        <div className="topRight">
          <div className="backend">
            <span className={apiOnline?"liveDot":""}/>
            {apiOnline?"AI backend online":"Backend offline"}
          </div>
          <button className="outline" onClick={()=>notify("Dashboard refreshed.")}><RefreshCw size={15}/>Refresh</button>
        </div>
      </header>
      <section className="content">
        {page==="Dashboard"&&<Dashboard incidents={incidents} selected={selected} setSelected={setSelected} setPage={setPage} notify={notify}/>}
        {page==="Live Scanner"&&<Scanner stubMode={stubMode} onIncident={i=>{setIncidents(x=>[i,...x]);setSelected(i);notify(`Verified: ${i.id}`)}} notify={notify}/>}
        {page==="Live Map"&&<MapPage incidents={incidents} selected={selected} setSelected={setSelected}/>}
        {page==="Detections"&&<Detections incidents={incidents} selected={selected} setSelected={setSelected}/>}
        {page==="Bus Fleet"&&<Fleet notify={notify}/>}
        {page==="Work Orders"&&<WorkOrders notify={notify}/>}
        {page==="Evidence"&&<Evidence incidents={incidents} selected={selected} setSelected={setSelected}/>}
        {page==="Analytics"&&<Analytics incidents={incidents}/>}
      </section>
      {toast&&<div className="toast"><CheckCircle2 size={17}/>{toast}</div>}
    </main>
  </div>
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────────────────────────────────────
function Dashboard({incidents,selected,setSelected,setPage,notify}){
 return <div className="page">
   <div className="hero">
     <div>
       <Badge tone="blue">ROADMITRA · SIH 2026 INTEGRATED</Badge>
       <h2>Every bus becomes a mobile road scanner.</h2>
       <p>Turn existing public-transport CCTV + GPS into verified, geo-tagged road intelligence.<br/>
          Powered by the full RoadFix LangGraph pipeline: YOLO detection → ByteTrack → VLM verification → gate → publish.</p>
       <div className="heroBtns">
         <button className="primary" onClick={()=>setPage("Live Scanner")}><Camera size={16}/> Start live scan</button>
         <button className="ghost" onClick={()=>setPage("Live Map")}><MapPin size={16}/> Open ward map</button>
       </div>
     </div>
     <div className="heroBadge"><span>PIPELINE</span><b>LIVE</b><small>LangGraph + VLM gate</small></div>
   </div>

   <div className="metrics">
     <Metric icon={AlertTriangle} label="Verified incidents" value={incidents.length} sub="+real-time" tone="red"/>
     <Metric icon={BusFront} label="Buses online" value="20 / 20" sub="100% pilot fleet" tone="blue"/>
     <Metric icon={ShieldCheck} label="Pipeline stages" value="6" sub="ingest→publish" tone="green"/>
     <Metric icon={Clock3} label="Target latency" value="< 5s" sub="camera to alert" tone="purple"/>
   </div>

   <div className="two">
     <section className="panel">
       <Head title="RoadFix LangGraph pipeline" sub="Six-node graph — integrated with this dashboard"/>
       <div className="steps">
         {[
           ["INGEST","OpenCV frame sampling + GPS sync"],
           ["DETECT","YOLOv8 street eye + pothole eye"],
           ["TRACK & FLAG","ByteTrack IDs + 3 deterministic rules"],
           ["VERIFY EVENT","VLM inspector — parallel fan-out per event"],
           ["GATE","Confidence threshold: publish / recheck / drop"],
           ["PUBLISH","Geo-tagged evidence + map + report"],
         ].map(([s,d],i)=><div className="step" key={s}>
           <div className="num">{i+1}</div>
           <div><b>{s}</b><small>{d}</small></div>
           {i<5&&<div className="connector"/>}
         </div>)}
       </div>
     </section>
     <section className="panel">
       <Head title="Latest verified alerts" sub="Evidence-backed incidents" action="All detections" onClick={()=>setPage("Detections")}/>
       {incidents.slice(0,5).map(d=><button className="incident" key={d.id} onClick={()=>setSelected(d)}>
         <div className={`incIcon ${d.severity.toLowerCase()}`}><AlertTriangle size={15}/></div>
         <div><b>{d.type}</b><small>{d.id} · {d.bus} · {d.ward}</small></div>
         <Badge tone={d.severity==="HIGH"?"red":"orange"}>{d.confidence}%</Badge>
         <ChevronRight size={15}/>
       </button>)}
     </section>
   </div>

   <div className="two">
     <section className="panel">
       <Head title="Ward heat-map" sub="Click an incident to inspect"/>
       <HeatMap incidents={incidents} selected={selected} setSelected={setSelected}/>
     </section>
     <section className="panel">
       <Head title="Selected evidence" sub={`${selected.id} · ${selected.time}`}/>
       <EvidenceVisual d={selected}/>
       <div className="evidenceFacts">
         <span><MapPin/> {selected.lat}, {selected.lng}</span>
         <span><BusFront/> {selected.bus}</span>
         <span><ShieldCheck/> {selected.confidence}%</span>
       </div>
       <div style={{padding:"0 17px 4px",fontSize:9,color:"#607488"}}>
         Verifier: <b>{selected.verification?.verifier||"—"}</b>
       </div>
       <button className="primary wide" onClick={()=>notify(`Work order created for ${selected.id}`)}>
         <Wrench size={15}/> Create work order
       </button>
     </section>
   </div>
 </div>
}

function Metric({icon:I,label,value,sub,tone}){return <div className="metric panel"><div className={`metricIcon ${tone}`}><I size={19}/></div><div><small>{label}</small><b>{value}</b><span>{sub}</span></div></div>}
function Head({title,sub,action,onClick}){return <div className="head"><div><h3>{title}</h3><small>{sub}</small></div>{action&&<button className="linkBtn" onClick={onClick}>{action}<ChevronRight size={13}/></button>}</div>}

// ─────────────────────────────────────────────────────────────────────────────
// Map helpers
// ─────────────────────────────────────────────────────────────────────────────
function RoadMarkerIcon({severity="MEDIUM",bus=false}){
  const bg = bus?"#2563eb":severity==="HIGH"?"#dc2626":severity==="MEDIUM"?"#f59e0b":"#16a34a";
  const html = bus
    ? `<div style="width:34px;height:34px;border-radius:50%;background:${bg};border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;color:white;font-size:17px">🚌</div>`
    : `<div style="width:22px;height:22px;border-radius:50%;background:${bg};border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,.35)"></div>`;
  return L.divIcon({className:"roadmitra-marker",html,iconSize:bus?[34,34]:[22,22],iconAnchor:bus?[17,17]:[11,11],popupAnchor:[0,-12]});
}

function FitIncidents({incidents,selected}){
  const map=useMap();
  useEffect(()=>{
    if(selected?.lat&&selected?.lng){map.setView([Number(selected.lat),Number(selected.lng)],15,{animate:true});return;}
    const valid=incidents.filter(d=>Number.isFinite(Number(d.lat))&&Number.isFinite(Number(d.lng)));
    if(valid.length) map.fitBounds(valid.map(d=>[Number(d.lat),Number(d.lng)]),{padding:[30,30],maxZoom:15});
  },[map,selected]);
  return null;
}

function RealMap({incidents,selected,setSelected,compact=false}){
  const fallback=[17.3856,78.4867];
  const valid=incidents.filter(d=>Number.isFinite(Number(d.lat))&&Number.isFinite(Number(d.lng)));
  const center=selected?.lat&&selected?.lng?[Number(selected.lat),Number(selected.lng)]:valid.length?[Number(valid[0].lat),Number(valid[0].lng)]:fallback;
  return <div style={{height:compact?320:520,width:"100%",borderRadius:16,overflow:"hidden"}}>
    <MapContainer center={center} zoom={14} scrollWheelZoom style={{height:"100%",width:"100%"}}>
      <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
      <FitIncidents incidents={incidents} selected={selected}/>
      {valid.map(d=><Marker key={d.id} position={[Number(d.lat),Number(d.lng)]} icon={RoadMarkerIcon({severity:d.severity})} eventHandlers={{click:()=>setSelected(d)}}>
        <Popup>
          <div style={{minWidth:190,fontFamily:"Inter,Arial,sans-serif"}}>
            <strong style={{fontSize:15}}>{d.id} · {d.type}</strong>
            <div style={{marginTop:6}}>Severity: <b>{d.severity}</b></div>
            <div>Confidence: <b>{d.confidence}%</b></div>
            <div>Bus: <b>{d.bus}</b></div>
            <div>Ward: <b>{d.ward}</b></div>
            <div>GPS: {d.lat!=null?Number(d.lat).toFixed(5):"N/A"}, {d.lng!=null?Number(d.lng).toFixed(5):"N/A"}</div>
            <div>Time: {d.time}</div>
            <div style={{marginTop:6,fontSize:9,color:"#607488"}}>Verifier: {d.verification?.verifier||"—"}</div>
            <div style={{marginTop:4,color:"#15803d",fontWeight:700}}>● {d.status}</div>
          </div>
        </Popup>
      </Marker>)}
      {valid.length>0&&<Marker position={[Number(valid[0].lat)+0.003,Number(valid[0].lng)+0.002]} icon={RoadMarkerIcon({bus:true})}>
        <Popup><strong>BUS-17</strong><br/>Camera + GPS online<br/>RoadMitra scanner</Popup>
      </Marker>}
    </MapContainer>
  </div>
}

function HeatMap({incidents,selected,setSelected}){return <RealMap incidents={incidents} selected={selected} setSelected={setSelected} compact/>}

// ─────────────────────────────────────────────────────────────────────────────
// Virtual Window / Image Expansion Modal
// ─────────────────────────────────────────────────────────────────────────────
function VirtualWindowModal({item, onClose}){
  useEffect(()=>{
    const handleKey = (e) => { if(e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  if(!item) return null;
  const isReal = Boolean(item.snapshot);
  const src = isReal ? `${API}${item.snapshot}` : "";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(5, 18, 32, 0.88)",
        backdropFilter: "blur(8px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px"
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: 16,
          boxShadow: "0 25px 65px rgba(0, 0, 0, 0.55)",
          width: "100%",
          maxWidth: 920,
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          border: "1px solid #1c5b88"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Virtual Window Titlebar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 20px",
            background: "linear-gradient(90deg, #072f50, #0f4b7a)",
            color: "#ffffff"
          }}
        >
          <div style={{display: "flex", alignItems: "center", gap: 10}}>
            <div style={{display: "flex", gap: 6}}>
              <span
                style={{width: 11, height: 11, borderRadius: "50%", background: "#ef4444", display: "inline-block", cursor: "pointer"}}
                onClick={onClose}
                title="Close window"
              />
              <span style={{width: 11, height: 11, borderRadius: "50%", background: "#f59e0b", display: "inline-block"}}/>
              <span style={{width: 11, height: 11, borderRadius: "50%", background: "#10b981", display: "inline-block"}}/>
            </div>
            <b style={{fontSize: 13, marginLeft: 8, letterSpacing: 0.3}}>
              Evidence Inspection · {item.id} ({item.type})
            </b>
            <Badge tone={item.severity === "HIGH" ? "red" : "orange"}>{item.severity}</Badge>
            <Badge tone="green">{item.confidence}% AI Verified</Badge>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.18)",
              border: 0,
              color: "#fff",
              borderRadius: 8,
              padding: "6px 12px",
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: 11,
              fontWeight: 700
            }}
          >
            <X size={15}/> Close Window
          </button>
        </div>

        {/* Image Display Canvas */}
        <div
          style={{
            flex: 1,
            background: "#08131e",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "auto",
            padding: 20,
            minHeight: 400
          }}
        >
          {isReal ? (
            <img
              src={src}
              alt={item.type}
              style={{
                maxWidth: "100%",
                maxHeight: "68vh",
                objectFit: "contain",
                borderRadius: 8,
                boxShadow: "0 10px 35px rgba(0,0,0,0.6)",
                border: "1px solid #1c3d5a"
              }}
            />
          ) : (
            <div style={{color: "#94a3b8", textAlign: "center", padding: 50}}>
              <AlertTriangle size={42} style={{marginBottom: 10, color: "#f59e0b"}}/>
              <p style={{margin: "4px 0", fontSize: 13, fontWeight: 600}}>Synthetic Evidence Placeholder</p>
              <small>No physical snapshot JPEG saved on server for this record.</small>
            </div>
          )}
        </div>

        {/* Metadata Status Bar */}
        <div
          style={{
            padding: "12px 20px",
            background: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            fontSize: 11,
            color: "#334155"
          }}
        >
          <div style={{display: "flex", gap: 18, flexWrap: "wrap"}}>
            <span><b>Bus:</b> {item.bus}</span>
            <span><b>Ward:</b> {item.ward}</span>
            <span><b>Timestamp:</b> {item.time}</span>
            {item.lat && <span><b>Coordinates:</b> {Number(item.lat).toFixed(5)}, {Number(item.lng).toFixed(5)}</span>}
            <span><b>Verifier:</b> {item.verification?.verifier || "YOLOv8 + ByteTrack"}</span>
          </div>
          {isReal && (
            <a
              href={src}
              target="_blank"
              rel="noreferrer"
              style={{
                color: "#0f67a8",
                fontWeight: 700,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 5
              }}
            >
              Open raw JPEG <ExternalLink size={13}/>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Evidence visual (real snapshot or CSS placeholder)
// ─────────────────────────────────────────────────────────────────────────────
function EvidenceVisual({d, onExpand}){
  if(d.snapshot){
    return <div className="evidenceVisual" style={{cursor: onExpand ? "pointer" : "default"}} onClick={()=>onExpand?.(d)}>
      <img src={`${API}${d.snapshot}`} alt={d.type}
        style={{width:"100%",height:158,objectFit:"cover",display:"block"}}
        onError={e=>{e.target.style.display="none"}}/>
      <div className="verified"><CheckCircle2 size={13}/> AI VERIFIED</div>
      {onExpand && <div style={{
        position:"absolute",left:8,bottom:8,background:"rgba(7,47,80,.82)",
        color:"#fff",borderRadius:5,padding:"3px 8px",fontSize:9,fontWeight:750,
        display:"flex",alignItems:"center",gap:4,backdropFilter:"blur(3px)"
      }}><Maximize2 size={11}/> Click to inspect</div>}
    </div>
  }
  return <div className="evidenceVisual" style={{cursor: onExpand ? "pointer" : "default"}} onClick={()=>onExpand?.(d)}>
    <div className="scene"><div className="sky"/><div className="tree"/><div className="road"/><div className="mark m1"/><div className="damage"/><div className="bbox"><span>YOLOv8 {d.confidence}%</span></div></div>
    <div className="verified"><CheckCircle2 size={13}/> AI VERIFIED</div>
  </div>
}

// ─────────────────────────────────────────────────────────────────────────────
// Live Scanner  — integrated with SSE progress + stub toggle
// ─────────────────────────────────────────────────────────────────────────────
const PIPELINE_STAGES = [
  {key:"upload",    label:"Video ingest",              desc:"Receive uploaded bus-camera clip"},
  {key:"ingest",    label:"OpenCV frame sampling",     desc:"Decode frames + sync GPS track"},
  {key:"detect",    label:"YOLOv8 detection",          desc:"Street eye + pothole eye (dual-model)"},
  {key:"track_flag",label:"ByteTrack & rule engine",   desc:"Track IDs + pothole / kids / jam rules"},
  {key:"verify",    label:"VLM verification",          desc:"Parallel vision-LLM inspector per event"},
  {key:"gate",      label:"Confidence gate",           desc:"Publish / recheck / drop decisions"},
  {key:"publish",   label:"Verified incident output",  desc:"Geo-tagged evidence + report"},
];

function Scanner({stubMode,onIncident,notify}){
  const [file,setFile]=useState(null), [preview,setPreview]=useState("");
  const [scan,setScan]=useState(null), [progress,setProgress]=useState([]);
  const [result,setResult]=useState(null);
  const [expandedItem,setExpandedItem]=useState(null);
  const input=useRef(), esRef=useRef(null);

  const choose=e=>{
    const f=e.target.files?.[0];
    if(!f)return;
    setFile(f);setPreview(URL.createObjectURL(f));setResult(null);setProgress([]);setScan(null);
  };

  const process=async()=>{
    if(!file){notify("Choose an MP4/AVI/MOV road video first.");return}
    setScan("processing");setProgress([]);setResult(null);

    const fd=new FormData();
    fd.append("video",file);
    fd.append("bus_id","BUS-17");
    fd.append("ward","Ward 12");
    fd.append("stub",stubMode?"1":"");

    try{
      const res=await fetch(`${API}/api/process-video`,{method:"POST",body:fd});
      if(!res.ok) throw new Error(await res.text());
      const data=await res.json();
      setResult(data);
      setScan("done");
      if(data.incidents?.length) data.incidents.forEach(onIncident);
      notify(`Pipeline complete: ${data.incidents?.length||0} verified incident(s)`);
    }catch(e){
      setScan("error");
      notify("Pipeline failed. Start FastAPI and try again.");
    }
  };

  // SSE progress subscription — fires when scan starts
  useEffect(()=>{
    if(scan!=="processing") return;
    // wait a tick for job_id to be issued; poll /api/run-status once we have a job_id
    // We use a simple polling approach on the result object; SSE fires once API responds
  },[scan]);

  const doneStages=new Set(progress.map(p=>p.stage));
  const lastPct=progress.length?progress[progress.length-1].pct:0;

  return <div className="page">
    <div className="intro">
      <div>
        <Badge tone="blue">LIVE BUS SCANNER</Badge>
        <h2>Process a real road video</h2>
        <p>Upload a bus-camera clip. The RoadFix LangGraph pipeline runs end-to-end and returns geo-tagged, VLM-verified incidents.</p>
      </div>
      <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
        <Badge tone={scan==="done"?"green":scan==="processing"?"orange":"blue"}>
          {scan==="processing"?"PROCESSING…":scan==="done"?"SCAN COMPLETE":scan==="error"?"ERROR":"READY"}
        </Badge>
        <Badge tone={stubMode?"orange":"blue"}>{stubMode?"STUB MODE":"REAL VLM"}</Badge>
      </div>
    </div>

    <div className="scannerGrid">
      <section className="panel scannerVideo">
        <div className="videoTop">
          <span><CircleDot size={14}/> BUS-17 CAMERA</span>
          <Badge tone="green">GPS ONLINE</Badge>
        </div>
        {preview
          ?<video src={preview} controls className="video"/>
          :<div className="drop" onClick={()=>input.current?.click()}>
            <Upload size={30}/><b>Drop road video here</b>
            <small>MP4, AVI or MOV · 10–60 seconds recommended</small>
            <button className="outline">Choose video</button>
          </div>
        }
        <input ref={input} type="file" accept="video/*" hidden onChange={choose}/>
        <div className="scanControls">
          <button className="primary" onClick={process}><Play size={15}/> Run AI road scan</button>
          {file&&<span>{file.name}</span>}
        </div>
        {scan==="processing"&&<div className="progress"><span style={{width:`${lastPct}%`,transition:"width .4s"}}/></div>}
      </section>

      <section className="panel pipelineCard">
        <Head title="RoadFix pipeline stages" sub={stubMode?"Stub mode — deterministic results":"Real LangGraph + VLM execution"}/>
        {PIPELINE_STAGES.map((s,i)=>{
          const done=scan==="done"||(scan==="processing"&&doneStages.has(s.key));
          const detail=progress.find(p=>p.stage===s.key)?.detail||"";
          return <div className={`pStage ${done?"done":""}`} key={s.key}>
            <span>{i+1}</span>
            <div><b>{s.label}</b><small>{detail||s.desc}</small></div>
            {done&&<CheckCircle2 size={16}/>}
          </div>
        })}
        {result&&<div className="resultBox">
          <b>Run complete</b>
          <span>{result.frames_processed} frames · {result.events_flagged||0} events · {result.incidents?.length||0} verified</span>
          <small>Pipeline: {result.pipeline||"RoadFix LangGraph"}</small>
          <small style={{marginTop:4}}>Stub mode: {result.stub_mode?"YES":"NO"} · Run ID: {result.run_id}</small>
        </div>}
      </section>
    </div>

    {/* Incident cards from this scan */}
    {result?.incidents?.length>0&&<div style={{marginTop:18}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <h3 style={{fontSize:13,margin:0}}>Verified incidents from this scan</h3>
        <small style={{color:"#0f67a8",fontWeight:700,display:"flex",alignItems:"center",gap:4}}>
          <Maximize2 size={12}/> Click any photo to open inspection window
        </small>
      </div>
      <div className="evidenceGrid">
        {result.incidents.map(d=><div
          className="panel eCard"
          key={d.id}
          style={{cursor:"pointer",transition:"transform .15s ease, box-shadow .15s ease"}}
          onClick={()=>setExpandedItem(d)}
          title="Click to expand virtual inspection window"
        >
          <EvidenceVisual d={d} onExpand={setExpandedItem}/>
          <div className="eBody">
            <div><b>{d.id}</b><Badge tone={d.severity==="HIGH"?"red":"orange"}>{d.confidence}%</Badge></div>
            <h3>{d.type}</h3>
            <small><MapPin size={12}/>{d.ward} · {d.time}</small>
            <small style={{marginTop:4,color:"#607488"}}>Verifier: {d.verification?.verifier||"—"}</small>
            <div style={{marginTop:6,display:"flex",alignItems:"center",gap:4,color:"#0f67a8",fontSize:9,fontWeight:750}}>
              <Maximize2 size={11}/> Click to inspect picture
            </div>
          </div>
        </div>)}
      </div>
    </div>}

    {expandedItem && <VirtualWindowModal item={expandedItem} onClose={()=>setExpandedItem(null)}/>}
  </div>
}

// ─────────────────────────────────────────────────────────────────────────────
// Detections table
// ─────────────────────────────────────────────────────────────────────────────
function Detections({incidents,selected,setSelected}){return <div className="page">
  <div className="intro">
    <div><Badge tone="blue">VERIFIED DETECTIONS</Badge><h2>Evidence-backed road incidents</h2><p>Every record carries detection confidence, bus identity, timestamp and coordinates.</p></div>
    <div className="search"><Search size={15}/><input placeholder="Search incident..."/></div>
  </div>
  <section className="panel tablePanel">
    <table>
      <thead><tr><th>ID</th><th>TYPE</th><th>BUS</th><th>WARD</th><th>CONFIDENCE</th><th>VERIFIER</th><th>STATUS</th></tr></thead>
      <tbody>{incidents.map(d=><tr key={d.id} className={selected.id===d.id?"selRow":""} onClick={()=>setSelected(d)}>
        <td><b>{d.id}</b><small>{d.time}</small></td>
        <td>{d.type}<small>{d.severity} severity</small></td>
        <td>{d.bus}</td>
        <td>{d.ward}<small>{d.lat!=null?`${d.lat}, ${d.lng}`:"no GPS"}</small></td>
        <td><div className="bar"><span style={{width:`${d.confidence}%`}}/></div>{d.confidence}%</td>
        <td><small>{d.verification?.verifier||"—"}</small></td>
        <td><Badge tone={d.status==="VERIFIED"?"green":"orange"}>{d.status}</Badge></td>
      </tr>)}</tbody>
    </table>
  </section>
</div>}

// ─────────────────────────────────────────────────────────────────────────────
// Live Map
// ─────────────────────────────────────────────────────────────────────────────
function MapPage({incidents,selected,setSelected}){
  return <div className="page">
    <div className="intro">
      <div><Badge tone="blue">LIVE WARD MAP</Badge><h2>Road-risk intelligence</h2>
        <p>Real geographic map (OpenStreetMap). Detection coordinates are plotted directly from RoadFix incident records.</p>
      </div>
      <Badge tone="green">LIVE GPS</Badge>
    </div>
    <section className="panel fullMap" style={{padding:16}}>
      <RealMap incidents={incidents} selected={selected} setSelected={setSelected}/>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:12,alignItems:"center"}}>
        <span style={{fontSize:12,fontWeight:700,color:"#dc2626"}}>● HIGH</span>
        <span style={{fontSize:12,fontWeight:700,color:"#f59e0b"}}>● MEDIUM</span>
        <span style={{fontSize:12,fontWeight:700,color:"#16a34a"}}>● LOW</span>
        <span style={{fontSize:12,fontWeight:700,color:"#2563eb"}}>🚌 BUS-17</span>
        <span style={{fontSize:12,color:"#64748b",marginLeft:"auto"}}>{incidents.length} mapped incident(s)</span>
      </div>
      <div className="mapList" style={{marginTop:14}}>
        {incidents.map(d=><button className={selected.id===d.id?"selected":""} key={d.id} onClick={()=>setSelected(d)}>
          <span className={`mapDot ${d.severity.toLowerCase()}`}/><b>{d.id}</b><span>{d.type}</span>
          <small>{d.ward} · {d.lat!=null?`${d.lat}, ${d.lng}`:"no GPS"}</small>
        </button>)}
      </div>
    </section>
  </div>
}

// ─────────────────────────────────────────────────────────────────────────────
// Fleet / Work Orders / Evidence / Analytics
// ─────────────────────────────────────────────────────────────────────────────
function Fleet({notify}){
  const bs=["BUS-17","BUS-09","BUS-21","BUS-04","BUS-12","BUS-25"];
  return <div className="page">
    <div className="intro">
      <div><Badge tone="blue">BUS FLEET</Badge><h2>Distributed road scanners</h2><p>Existing bus cameras and GPS form the RoadMitra monitoring layer.</p></div>
      <button className="primary" onClick={()=>notify("Fleet telemetry synchronized.")}><RefreshCw size={15}/> Sync fleet</button>
    </div>
    <div className="fleet">{bs.map((b,i)=><section className="panel bus" key={b}>
      <div className="busHead"><div className="busIcon"><BusFront/></div><Badge tone="green">ONLINE</Badge></div>
      <h3>{b}</h3><p>Route R-{i+4} · Ward {i+3}</p>
      <div className="busStats">
        <span>GPS<b>{31-i*2} km/h</b></span>
        <span>CAMERA<b>ONLINE</b></span>
        <span>ALERTS<b>{5+i}</b></span>
      </div>
      <div className="signal"><Wifi size={14}/> Telemetry streaming</div>
    </section>)}</div>
  </div>
}

function WorkOrders({notify}){
  const o=[["WO-204","RM-1042","Pothole repair","HIGH","Assigned"],["WO-203","RM-1041","Crack treatment","MEDIUM","In progress"],["WO-202","RM-1040","Pothole repair","HIGH","Pending"]];
  return <div className="page">
    <div className="intro">
      <div><Badge tone="blue">REPAIR OPERATIONS</Badge><h2>From alert to action</h2><p>One-click work orders turn evidence into accountable municipal repair tasks.</p></div>
      <button className="primary" onClick={()=>notify("New work order form opened.")}><Wrench size={15}/> New work order</button>
    </div>
    <section className="panel tablePanel">
      <table>
        <thead><tr><th>ORDER</th><th>INCIDENT</th><th>ACTION</th><th>PRIORITY</th><th>STATUS</th></tr></thead>
        <tbody>{o.map(x=><tr key={x[0]}>
          <td><b>{x[0]}</b></td><td>{x[1]}</td><td>{x[2]}</td>
          <td><Badge tone={x[3]==="HIGH"?"red":"orange"}>{x[3]}</Badge></td>
          <td><Badge tone="blue">{x[4]}</Badge></td>
        </tr>)}</tbody>
      </table>
    </section>
  </div>
}

function Evidence({incidents,selected,setSelected}){
  const [modalItem, setModalItem] = useState(null);
  return <div className="page">
    <div className="intro">
      <div><Badge tone="blue">EVIDENCE LIBRARY</Badge><h2>Geo-tagged proof</h2><p>Real snapshot photos from track_flag, plus GPS, timestamp and VLM confidence. Click any photo to expand.</p></div>
    </div>
    <div className="evidenceGrid">{incidents.map(d=><div className={`panel eCard ${selected.id===d.id?"sel":""}`} key={d.id} style={{cursor:"pointer"}} onClick={()=>{setSelected(d); setModalItem(d);}}>
      <EvidenceVisual d={d} onExpand={setModalItem}/>
      <div className="eBody">
        <div><b>{d.id}</b><Badge tone="green">{d.confidence}%</Badge></div>
        <h3>{d.type}</h3>
        <small><MapPin size={12}/>{d.ward} · {d.time}</small>
        <small style={{color:"#607488",marginTop:4}}>Verifier: {d.verification?.verifier||"—"}</small>
        <div style={{marginTop:6,display:"flex",alignItems:"center",gap:4,color:"#0f67a8",fontSize:9,fontWeight:750}}>
          <Maximize2 size={11}/> Click to inspect picture
        </div>
      </div>
    </div>)}</div>
    {modalItem && <VirtualWindowModal item={modalItem} onClose={()=>setModalItem(null)}/>}
  </div>
}

function Analytics({incidents}){
  const high=incidents.filter(x=>x.severity==="HIGH").length;
  const med=incidents.filter(x=>x.severity==="MEDIUM").length;
  const avgConf=incidents.length?Math.round(incidents.reduce((s,x)=>s+x.confidence,0)/incidents.length*10)/10:0;
  const verifiers=[...new Set(incidents.map(x=>x.verification?.verifier||"—"))].join(", ");
  return <div className="page">
    <div className="intro">
      <div><Badge tone="blue">ANALYTICS</Badge><h2>Road-risk performance</h2><p>Live metrics from the RoadFix pipeline output.</p></div>
    </div>
    <div className="analytics">
      {[["Verified incidents",incidents.length],["High severity",high],["Medium severity",med],["Avg confidence",`${avgConf}%`]].map(x=><div className="panel aCard" key={x[0]}>
        <small>{x[0]}</small><b>{x[1]}</b>
        <div className="fakeChart"><i/><i/><i/><i/><i/></div>
      </div>)}
    </div>
    {incidents.length>0&&<section className="panel" style={{marginTop:16,padding:16}}>
      <Head title="VLM verifier breakdown" sub="Verifiers used across all incidents"/>
      <div style={{padding:"8px 0 4px",fontSize:10,color:"#486075"}}>{verifiers||"—"}</div>
    </section>}
  </div>
}

createRoot(document.getElementById("root")).render(<App/>);
