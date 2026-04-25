import { useState, useRef, useEffect, useCallback, useReducer, useMemo } from "react";

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────

const initCams = DEFAULT_CAMERAS.map((c, i) => ({
  ...c,
  active: i === 0
}));

const initState = {
  cameras: initCams,
  sections: SECTIONS.map(s => ({ ...s })),
  presets: buildPresets(initCams),
  activeCamId: 1,
  targetSection: null,
  nextShotOpen: false,
  highlightedCam: null,
  recentlyUsed: [],
  showFov: true,
  showLabels: true,
};

const CAM_COLORS = ["#FF3D5A","#00E5A0","#3DA9FF","#FFB800","#C44DFF"];

// W=800, H=580
// Layout: publiek at TOP (y~30-60), cameras 1&2 deep in zaal (top corners)
// Stage in middle, dirigent centered at x=400
// Klarinetten RIGHT of dirigent, Sax/Euph/Bas LEFT (mirrored)
// Lower block: woodwinds + brass below stage
// Percussion at bottom

const SECTIONS = [
  // ── Solist & Dirigent (center) ──
  { id:"solist",       label:"Solist",          short:"SOL", color:"#FFE47A", x:368,y:148,w:64, h:36  },
  { id:"dirigent",     label:"Dirigent",        short:"DIR", color:"#f0f0f0", x:356,y:192,w:88, h:52  },

  // ── LEFT of dirigent: Sax, Euph, Bas (mirroring klarinetten) ──
  // Altsax column
  { id:"altsax1",      label:"Alt Sax",         short:"ASX", color:"#FF9999", x:256,y:192,w:62, h:26  },
  { id:"altsax2",      label:"Alt Sax",         short:"ASX", color:"#FF9999", x:256,y:220,w:62, h:26  },
  { id:"tsax1",        label:"Tenor Sax",       short:"TSX", color:"#f5d5b0", x:256,y:248,w:62, h:26  },
  { id:"tsax2",        label:"Tenor Sax",       short:"TSX", color:"#f5d5b0", x:256,y:276,w:62, h:26  },
  { id:"bsax",         label:"Bari Sax",        short:"BSX", color:"#f5d5b0", x:256,y:304,w:62, h:26  },
  // Euph column
  { id:"euph1",        label:"Euphonium",       short:"EUP", color:"#FFD47A", x:186,y:192,w:68, h:26  },
  { id:"euph2",        label:"Euphonium",       short:"EUP", color:"#FFD47A", x:186,y:220,w:68, h:26  },
  { id:"euph3",        label:"Euphonium",       short:"EUP", color:"#FFD47A", x:186,y:248,w:68, h:26  },
  { id:"euph4",        label:"Euphonium",       short:"EUP", color:"#FFD47A", x:186,y:276,w:68, h:26  },
  // Bas column
  { id:"bas1",         label:"Bas",             short:"BAS", color:"#FFD47A", x:112,y:192,w:52, h:26  },
  { id:"bas2",         label:"Bas",             short:"BAS", color:"#FFD47A", x:112,y:220,w:52, h:26  },
  { id:"bas3",         label:"Bas",             short:"BAS", color:"#FFD47A", x:112,y:248,w:52, h:26  },
  { id:"bas4",         label:"Bas",             short:"BAS", color:"#FFD47A", x:112,y:276,w:52, h:26  },
  // Bottom row left
  { id:"contrabas",    label:"Contrabas",       short:"CBA", color:"#e8e8e8", x:112,y:304,w:80, h:26  },
  { id:"basklarinet",  label:"Basklarinet",     short:"BKL", color:"#e8e8e8", x:256,y:336,w:76, h:24  },
  { id:"cbasklarinet", label:"C-Basklarinet",   short:"CBK", color:"#e8e8e8", x:338,y:336,w:90, h:24  },

  // ── RIGHT of dirigent: Klarinetten (mirror of left) ──
  // Klarinet 1 column (closest to dirigent)
  { id:"klar1a",       label:"Klarinet 1",      short:"KL1", color:"#A8D8A0", x:446,y:192,w:68, h:26  },
  { id:"klar1b",       label:"Klarinet 1",      short:"KL1", color:"#A8D8A0", x:446,y:220,w:68, h:26  },
  { id:"klar2a",       label:"Klarinet 2",      short:"KL2", color:"#A8D8A0", x:446,y:248,w:68, h:26  },
  { id:"klar2b",       label:"Klarinet 2",      short:"KL2", color:"#A8D8A0", x:446,y:276,w:68, h:26  },
  { id:"klar3a",       label:"Klarinet 3",      short:"KL3", color:"#A8D8A0", x:446,y:304,w:68, h:26  },
  // Klarinet 1 col 2
  { id:"klar1c",       label:"Klarinet 1",      short:"KL1", color:"#A8D8A0", x:516,y:192,w:68, h:26  },
  { id:"klar1d",       label:"Klarinet 1",      short:"KL1", color:"#A8D8A0", x:516,y:220,w:68, h:26  },
  { id:"klar2c",       label:"Klarinet 2",      short:"KL2", color:"#A8D8A0", x:516,y:248,w:68, h:26  },
  { id:"klar2d",       label:"Klarinet 2",      short:"KL2", color:"#A8D8A0", x:516,y:276,w:68, h:26  },
  { id:"klar3b",       label:"Klarinet 3",      short:"KL3", color:"#A8D8A0", x:516,y:304,w:68, h:26  },
  // Klarinet col 3 (Es)
  { id:"klar1e",       label:"Klarinet 1",      short:"KL1", color:"#A8D8A0", x:586,y:192,w:72, h:26  },
  { id:"esklarinet1",  label:"Es Klarinet",     short:"ESK", color:"#c8eac0", x:586,y:220,w:72, h:26  },
  { id:"esklarinet2",  label:"Es Klarinet",     short:"ESK", color:"#c8eac0", x:586,y:248,w:72, h:26  },
  { id:"klar3c",       label:"Klarinet 3",      short:"KL3", color:"#A8D8A0", x:586,y:276,w:72, h:26  },
  { id:"klar3d",       label:"Klarinet 3",      short:"KL3", color:"#A8D8A0", x:586,y:304,w:72, h:26  },

  // ── Lower block row 1: woodwinds ──
  { id:"enghn",        label:"Eng. HN",         short:"EHN", color:"#e0e0e0", x:192,y:382,w:52, h:26  },
  { id:"hobo1",        label:"Hobo",            short:"HOB", color:"#e0e0e0", x:248,y:382,w:44, h:26  },
  { id:"hobo2",        label:"Hobo",            short:"HOB", color:"#e0e0e0", x:296,y:382,w:44, h:26  },
  { id:"fluit1",       label:"Fluit",           short:"FLU", color:"#e0e0e0", x:344,y:382,w:40, h:26  },
  { id:"fluit2",       label:"Fluit",           short:"FLU", color:"#e0e0e0", x:388,y:382,w:40, h:26  },
  { id:"piccolo",      label:"Piccolo",         short:"PIC", color:"#e0e0e0", x:432,y:382,w:50, h:26  },
  { id:"hoorn1",       label:"Hoorn",           short:"HOR", color:"#e0e0e0", x:500,y:382,w:48, h:26  },
  { id:"hoorn2",       label:"Hoorn",           short:"HOR", color:"#e0e0e0", x:552,y:382,w:48, h:26  },
  { id:"hoorn3",       label:"Hoorn",           short:"HOR", color:"#e0e0e0", x:604,y:382,w:48, h:26  },

  // ── Lower block row 2 ──
  { id:"cfagot",       label:"C Fagot",         short:"CFG", color:"#C0AEE8", x:192,y:412,w:58, h:26  },
  { id:"fagot1",       label:"Fagot",           short:"FAG", color:"#C0AEE8", x:254,y:412,w:50, h:26  },
  { id:"fagot2",       label:"Fagot",           short:"FAG", color:"#C0AEE8", x:308,y:412,w:50, h:26  },
  { id:"sklar1",       label:"Solo Klarinet",   short:"SKL", color:"#e0e0e0", x:362,y:412,w:48, h:26  },
  { id:"sklar2",       label:"Solo Klarinet",   short:"SKL", color:"#e0e0e0", x:414,y:412,w:48, h:26  },
  { id:"hoorn4",       label:"Hoorn",           short:"HOR", color:"#e0e0e0", x:552,y:412,w:48, h:26  },
  { id:"hoorn5",       label:"Hoorn",           short:"HOR", color:"#e0e0e0", x:604,y:412,w:48, h:26  },

  // ── Lower block row 3: brass ──
  { id:"bastrombone",  label:"Bas Trombone",    short:"BTB", color:"#e0e0e0", x:152,y:442,w:80, h:26  },
  { id:"trombone1",    label:"Trombone",        short:"TRB", color:"#e0e0e0", x:236,y:442,w:62, h:26  },
  { id:"trombone2",    label:"Trombone",        short:"TRB", color:"#e0e0e0", x:302,y:442,w:62, h:26  },
  { id:"trompet1",     label:"Trompet",         short:"TRP", color:"#e0e0e0", x:368,y:442,w:55, h:26  },
  { id:"trompet2",     label:"Trompet",         short:"TRP", color:"#e0e0e0", x:427,y:442,w:55, h:26  },
  { id:"trompet3",     label:"Trompet",         short:"TRP", color:"#e0e0e0", x:486,y:442,w:55, h:26  },
  { id:"cornet1",      label:"Cornet",          short:"COR", color:"#e0e0e0", x:545,y:442,w:50, h:26  },
  { id:"cornet2",      label:"Cornet",          short:"COR", color:"#e0e0e0", x:599,y:442,w:50, h:26  },
  { id:"bugel",        label:"Bugel",           short:"BGL", color:"#e0e0e0", x:653,y:442,w:50, h:26  },

  // ── Percussion ──
  { id:"rimslagwerk",  label:"Ritmisch Slagwerk",short:"RSL",color:"#D4E8C0", x:118,y:480,w:190,h:46  },
  { id:"pauk",         label:"Pauk",            short:"PAU", color:"#D4E8C0", x:322,y:480,w:156,h:46  },
  { id:"melslagwerk",  label:"Melodisch Slagwerk",short:"MSL",color:"#D4E8C0",x:492,y:480,w:190,h:46  },
];

// Cameras: 1&2 are "deep in zaal" = high up (small y), at top corners
// Cam 5 is podium/floor camera
const DEFAULT_CAMERAS = [
  { id:1, label:"Cam 1",  sub:"Balkon L",  x:42,  y:42,  angle:52,  fov:42, color:CAM_COLORS[0], presetId:null, recentlyUsed:false },
  { id:2, label:"Cam 2",  sub:"Balkon R",  x:758, y:42,  angle:128, fov:42, color:CAM_COLORS[1], presetId:null, recentlyUsed:false },
  { id:3, label:"Cam 3",  sub:"Zaal L",    x:52,  y:310, angle:28,  fov:36, color:CAM_COLORS[2], presetId:null, recentlyUsed:false },
  { id:4, label:"Cam 4",  sub:"Zaal R",    x:748, y:310, angle:152, fov:36, color:CAM_COLORS[3], presetId:null, recentlyUsed:false },
  { id:5, label:"Cam 5",  sub:"Podium",    x:400, y:540, angle:354, fov:50, color:CAM_COLORS[4], presetId:null, recentlyUsed:false },
];

function buildPresets(cameras) {
  const p = {};
  cameras.forEach(cam => {
    p[cam.id] = SECTIONS.map((sec, i) => ({
      id: `${cam.id}.${i+1}`, short: `${cam.id}.${i+1}`,
      label: `${cam.id}.${i+1} ${sec.label}`, sectionId: sec.id,
    }));
  });
  return p;
}

const secCenter = s => ({ x: s.x + s.w/2, y: s.y + s.h/2 });
const dist      = (a,b) => Math.sqrt((a.x-b.x)**2+(a.y-b.y)**2);
const angleTo   = (from,to) => (Math.atan2(to.y-from.y, to.x-from.x)*180/Math.PI+360)%360;
const angDiff   = (a,b) => { let d=Math.abs(a-b)%360; return d>180?360-d:d; };

function scoreCamera(cam, sec, recentIds=[]) {
  const c = secCenter(sec);
  const d = dist(cam, c);
  const aDiff = angDiff(cam.angle, angleTo(cam, c));
  const distScore = Math.max(0, 100 - d/5.5);
  const angleScore = Math.max(0, 100 - aDiff*1.4);
  const recentPenalty = recentIds.includes(cam.id) ? 18 : 0;
  return { score: Math.max(0, Math.round(distScore*0.4+angleScore*0.6-recentPenalty)), inFov: aDiff<cam.fov/2, dist:Math.round(d), aDiff:Math.round(aDiff) };
}

function fovPoly(cam, len=230) {
  const la = (cam.angle-cam.fov/2)*Math.PI/180;
  const ra = (cam.angle+cam.fov/2)*Math.PI/180;
  const mid = cam.angle*Math.PI/180;
  return { cx:cam.x,cy:cam.y, lx:cam.x+Math.cos(la)*len,ly:cam.y+Math.sin(la)*len,
    rx:cam.x+Math.cos(ra)*len,ry:cam.y+Math.sin(ra)*len, mx:cam.x+Math.cos(mid)*(len*0.5),my:cam.y+Math.sin(mid)*(len*0.5) };
}

// ─────────────────────────────────────────────────────────────────
// REDUCER
// ─────────────────────────────────────────────────────────────────
function reducer(state, action) {
  switch (action.type) {

    case "SET_ACTIVE": {
      const prev = state.cameras.find(c => c.active);
      const recentlyUsed = prev
        ? [...new Set([prev.id, ...state.recentlyUsed])].slice(0, 3)
        : state.recentlyUsed;

      return {
        ...state,
        recentlyUsed,
        activeCamId: action.id,
        cameras: state.cameras.map(c => ({
          ...c,
          active: c.id === action.id
        }))
      };
    }

    case "APPLY_PRESET": {
      const preset = state.presets[action.camId]?.find(p => p.id === action.presetId);
      if (!preset) return state;

      const sec = state.sections.find(s => s.id === preset.sectionId);
      if (!sec) return state;

      const cam = state.cameras.find(c => c.id === action.camId);
      const newAngle = angleTo(cam, secCenter(sec));

      const prev = state.cameras.find(c => c.active);
      const recentlyUsed = prev
        ? [...new Set([prev.id, ...state.recentlyUsed])].slice(0, 3)
        : state.recentlyUsed;

      return {
        ...state,
        recentlyUsed,
        activeCamId: action.camId,
        cameras: state.cameras.map(c =>
          c.id === action.camId
            ? { ...c, angle: newAngle, presetId: action.presetId, active: true }
            : { ...c, active: false }
        )
      };
    }

    case "MOVE_CAM":
      return {
        ...state,
        cameras: state.cameras.map(c =>
          c.id === action.id ? { ...c, x: action.x, y: action.y } : c
        )
      };

    case "MOVE_SEC":
      return {
        ...state,
        sections: state.sections.map(s =>
          s.id === action.id ? { ...s, x: action.x, y: action.y } : s
        )
      };

    case "SET_TARGET_SEC":
      return { ...state, targetSection: action.id, nextShotOpen: true };

    case "CLEAR_TARGET":
      return { ...state, targetSection: null, nextShotOpen: false };

    case "TOGGLE_FOV":
      return { ...state, showFov: !state.showFov };

    case "TOGGLE_LABELS":
      return { ...state, showLabels: !state.showLabels };

    case "SET_HL_CAM":
      return { ...state, highlightedCam: action.id };

    case "CLEAR_HL_CAM":
      return { ...state, highlightedCam: null };

    case "LOAD_STATE": {
      const cams = action?.data?.cameras ?? state.cameras;

      const rebuiltCams = cams.map(c => ({
        ...c,
        active: c.id === action?.data?.activeCamId
      }));

      return {
        ...state,
        cameras: rebuiltCams,
        presets: buildPresets(rebuiltCams),
        activeCamId: action?.data?.activeCamId ?? state.activeCamId,
        recentlyUsed: []
      };
    }

    default:
      return state;
  }
}
// ─────────────────────────────────────────────────────────────────
// STAGE MAP  (dark theme like v1)
// ─────────────────────────────────────────────────────────────────
function StageMap({ state, dispatch, highlightSectionId }) {
  const svgRef = useRef(null);
  const dragging = useRef(null);
  const W=800, H=580;

  const camTargets = useMemo(()=>{
    const t={};
    state.cameras.forEach(cam=>{
      if(cam.presetId){const p=state.presets[cam.id]?.find(p=>p.id===cam.presetId);if(p)t[cam.id]=p.sectionId;}
    });
    return t;
  },[state.cameras,state.presets]);

  const onMM = useCallback(e=>{
    if(!dragging.current)return;
    const rect=svgRef.current.getBoundingClientRect();
    const sx=W/rect.width,sy=H/rect.height;
    const x=(e.clientX-rect.left)*sx,y=(e.clientY-rect.top)*sy;
    if(dragging.current.type==="cam")dispatch({type:"MOVE_CAM",id:dragging.current.id,x:Math.round(x),y:Math.round(y)});
  },[dispatch]);

  const onTM = useCallback(e=>{
    if(!dragging.current||!e.touches[0])return;
    e.preventDefault();
    const rect=svgRef.current.getBoundingClientRect();
    const x=(e.touches[0].clientX-rect.left)*(W/rect.width),y=(e.touches[0].clientY-rect.top)*(H/rect.height);
    if(dragging.current.type==="cam")dispatch({type:"MOVE_CAM",id:dragging.current.id,x:Math.round(x),y:Math.round(y)});
  },[dispatch]);

  const stop=()=>{dragging.current=null;};

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"100%",display:"block",touchAction:"none"}}
      onMouseMove={onMM} onMouseUp={stop} onMouseLeave={stop} onTouchMove={onTM} onTouchEnd={stop}>
      <defs>
        <radialGradient id="stageGrad" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#141830"/>
          <stop offset="100%" stopColor="#0a0c18"/>
        </radialGradient>
        <filter id="glow"><feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>

      {/* Background */}
      <rect width={W} height={H} fill="url(#stageGrad)"/>
      <rect x={8} y={8} width={W-16} height={H-16} rx={14} fill="none" stroke="#1e2140" strokeWidth="1.5"/>

      {/* Publiek — TOP (dirigent side) */}
      <rect x={106} y={8} width={588} height={56} rx={6} fill="#090b18" stroke="#141628" strokeWidth="1"/>
      <text x={400} y={40} textAnchor="middle" fontSize="8" fill="#1a1d38" fontFamily="monospace" letterSpacing="4">PUBLIEK</text>

      {/* Balcony / deep-zaal zones (corners, top) */}
      {[[8,8,118,98,"BALKON L"],[674,8,118,98,"BALKON R"]].map(([x,y,w,h,lbl])=>(
        <g key={lbl}>
          <rect x={x} y={y} width={w} height={h} rx={8} fill="#0e1025" stroke="#1e2140" strokeWidth="1"/>
          <text x={x+w/2} y={y+h/2+4} textAnchor="middle" fontSize="8" fill="#2a2d50" fontFamily="monospace">{lbl}</text>
        </g>
      ))}

      {/* Side zones mid */}
      {[[8,160,88,270,"ZAAL L"],[704,160,88,270,"ZAAL R"]].map(([x,y,w,h,lbl])=>(
        <g key={lbl}>
          <rect x={x} y={y} width={w} height={h} rx={6} fill="#0c0e20" stroke="#181b35" strokeWidth="1"/>
          <text x={x+w/2} y={y+h/2} textAnchor="middle" fontSize="7" fill="#252848" fontFamily="monospace"
            transform={`rotate(${lbl.includes("L")?-90:90},${x+w/2},${y+h/2})`}>{lbl}</text>
        </g>
      ))}

      {/* Stage platform */}
      <rect x={96} y={120} width={608} height={390} rx={12} fill="#111428" stroke="#252848" strokeWidth="1.5"/>
      <text x={400} y={137} textAnchor="middle" fontSize="8" fill="#252848" fontFamily="monospace" letterSpacing="5">PODIUM</text>

      {/* Cam 5 / audience area at bottom */}
      <rect x={96} y={520} width={608} height={50} rx={6} fill="#090b18" stroke="#141628" strokeWidth="1"/>
      <text x={400} y={549} textAnchor="middle" fontSize="8" fill="#1a1d38" fontFamily="monospace" letterSpacing="4">CAMERA PODIUM</text>

      {/* FOV cones */}
      {state.showFov && state.cameras.map(cam=>{
        const {cx,cy,lx,ly,rx,ry}=fovPoly(cam);
        const isA=cam.active,isHL=state.highlightedCam===cam.id;
        return (
          <g key={`fov${cam.id}`} style={{transition:"opacity 0.3s"}}>
            <path d={`M${cx},${cy} L${lx},${ly} A230,230 0 0,1 ${rx},${ry} Z`}
              fill={cam.color} opacity={isA?0.22:isHL?0.18:0.07} style={{transition:"opacity 0.35s"}}/>
            <line x1={cx} y1={cy} x2={lx} y2={ly} stroke={cam.color} strokeWidth="1" opacity={isA?0.5:0.2} strokeDasharray="5,4"/>
            <line x1={cx} y1={cy} x2={rx} y2={ry} stroke={cam.color} strokeWidth="1" opacity={isA?0.5:0.2} strokeDasharray="5,4"/>
          </g>
        );
      })}

      {/* Aim lines */}
      {state.cameras.map(cam=>{
        const tId=camTargets[cam.id]; if(!tId)return null;
        const sec=state.sections.find(s=>s.id===tId); if(!sec)return null;
        const c=secCenter(sec); const fov=fovPoly(cam);
        return <line key={`aim${cam.id}`} x1={fov.mx} y1={fov.my} x2={c.x} y2={c.y}
          stroke={cam.color} strokeWidth={cam.active?1.5:0.8} opacity={cam.active?0.7:0.25}
          strokeDasharray={cam.active?"none":"3,3"} style={{transition:"all 0.3s"}}/>;
      })}

      {/* Active cam target box */}
      {state.cameras.filter(c=>c.active).map(cam=>{
        const tId=camTargets[cam.id]; if(!tId)return null;
        const sec=state.sections.find(s=>s.id===tId); if(!sec)return null;
        return <rect key={`tgt${cam.id}`} x={sec.x-3} y={sec.y-3} width={sec.w+6} height={sec.h+6} rx={5}
          fill="none" stroke={cam.color} strokeWidth="1.5" opacity="0.6" strokeDasharray="4,3" style={{transition:"all 0.35s"}}/>;
      })}

      {/* Next-shot highlight */}
      {highlightSectionId&&(()=>{
        const sec=state.sections.find(s=>s.id===highlightSectionId); if(!sec)return null;
        return <rect x={sec.x-5} y={sec.y-5} width={sec.w+10} height={sec.h+10} rx={7}
          fill="#FFD44720" stroke="#FFD447" strokeWidth="2" opacity="0.9"/>;
      })()}

      {/* Orchestra sections */}
      {state.sections.map(sec=>{
        const isDir=sec.id==="dirigent";
        const isAimed=Object.values(camTargets).includes(sec.id);
        const isTgt=state.targetSection===sec.id;
        const bkgFill=isTgt?"#fff":sec.color;
        return (
          <g key={sec.id} style={{cursor:"pointer"}} onClick={()=>dispatch({type:"SET_TARGET_SEC",id:sec.id})}>
            {isDir?(
              <rect x={sec.x} y={sec.y} width={sec.w} height={sec.h} rx={5}
                fill={bkgFill} stroke={isAimed?"#fff":isTgt?"#FFD447":"#303360"} strokeWidth={isAimed||isTgt?1.5:1}/>
            ):(
              <rect x={sec.x} y={sec.y} width={sec.w} height={sec.h} rx={3}
                fill={bkgFill} stroke={isAimed?"#fff":isTgt?"#FFD447":"#303360"} strokeWidth={isAimed||isTgt?1.5:1} opacity="0.9"/>
            )}
            {state.showLabels&&(
              <text x={sec.x+sec.w/2} y={sec.y+sec.h/2+4} textAnchor="middle"
                fontSize={sec.w>150?9:sec.w>70?7.5:6.5}
                fill={isTgt?"#000":"#111"} fontFamily="monospace" fontWeight="700" pointerEvents="none">
                {state.showLabels&&sec.w>50?sec.short:sec.short}
              </text>
            )}
          </g>
        );
      })}

      {/* Camera markers */}
      {state.cameras.map(cam=>{
        const isA=cam.active,isHL=state.highlightedCam===cam.id;
        const r=isA?16:13;
        const ax=cam.x+Math.cos(cam.angle*Math.PI/180)*26;
        const ay=cam.y+Math.sin(cam.angle*Math.PI/180)*26;
        return (
          <g key={`cam${cam.id}`} style={{cursor:"grab"}}
            onMouseDown={e=>{e.stopPropagation();dragging.current={type:"cam",id:cam.id};}}
            onTouchStart={e=>{e.stopPropagation();dragging.current={type:"cam",id:cam.id};}}
            onClick={e=>{e.stopPropagation();dispatch({type:"SET_ACTIVE",id:cam.id});}}
            filter={isA?"url(#glow)":undefined}>
            {isHL&&<circle cx={cam.x} cy={cam.y} r={r+10} fill={cam.color} opacity="0.12"/>}
            {isA&&<circle cx={cam.x} cy={cam.y} r={r+6} fill="none" stroke={cam.color} strokeWidth="1.5" opacity="0.5" strokeDasharray="3,3"/>}
            <circle cx={cam.x} cy={cam.y} r={r} fill={isA?cam.color:"#0e1025"} stroke={cam.color} strokeWidth={isA?0:1.5} style={{transition:"all 0.25s"}}/>
            <text x={cam.x} y={cam.y+5} textAnchor="middle" fontSize="10"
              fill={isA?"#000":cam.color} fontFamily="monospace" fontWeight="700" pointerEvents="none">{cam.id}</text>
            <circle cx={ax} cy={ay} r={3.5} fill={cam.color} opacity={isA?1:0.6}/>
          </g>
        );
      })}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────
// CAMERA CARD
// ─────────────────────────────────────────────────────────────────
function CameraCard({ cam, presets, state, dispatch, isMobile }) {
  const [open, setOpen] = useState(false);
  const currentPreset = presets?.find(p=>p.id===cam.presetId);
  const currentSec = currentPreset ? state.sections.find(s=>s.id===currentPreset.sectionId) : null;

  return (
    <div style={{border:`1.5px solid ${cam.active?cam.color:cam.color+"30"}`,borderRadius:"10px",
      background:cam.active?`${cam.color}12`:"#0c0e1e",overflow:"hidden",transition:"all 0.25s",flexShrink:0,
      ...(isMobile?{width:"160px"}:{marginBottom:"8px"})}}>
      <div style={{display:"flex",alignItems:"center",gap:"10px",padding:"10px 12px",cursor:"pointer",
        borderBottom:open?`1px solid ${cam.color}20`:"none"}}
        onClick={()=>{dispatch({type:"SET_ACTIVE",id:cam.id});setOpen(!open);}}>
        <div style={{width:"28px",height:"28px",borderRadius:"50%",background:cam.active?cam.color:"transparent",
          border:`2px solid ${cam.color}`,display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:"11px",fontWeight:"800",color:cam.active?"#000":cam.color,fontFamily:"monospace",flexShrink:0,transition:"all 0.2s"}}>
          {cam.id}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:"10px",color:cam.active?cam.color:"#7070a0",fontWeight:"700",fontFamily:"monospace"}}>{cam.label}</div>
          <div style={{fontSize:"9px",color:cam.active?cam.color+"99":"#3a3a60",fontFamily:"monospace",marginTop:"1px",
            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            {currentSec?`→ ${currentSec.label}`:cam.sub}
          </div>
        </div>
        {cam.active&&<div style={{width:"6px",height:"6px",borderRadius:"50%",background:cam.color,flexShrink:0,boxShadow:`0 0 6px ${cam.color}`}}/>}
      </div>
      {open&&(
        <div style={{padding:"8px",display:"flex",flexWrap:"wrap",gap:"4px",maxHeight:"150px",overflowY:"auto"}}>
          {presets?.map(p=>{
            const sec=state.sections.find(s=>s.id===p.sectionId);
            const isSel=cam.presetId===p.id;
            return (
              <button key={p.id}
                onClick={e=>{e.stopPropagation();dispatch({type:"APPLY_PRESET",camId:cam.id,presetId:p.id});}}
                onMouseEnter={()=>dispatch({type:"SET_HL_CAM",id:cam.id})}
                onMouseLeave={()=>dispatch({type:"CLEAR_HL_CAM"})}
                style={{padding:"4px 6px",borderRadius:"5px",border:"none",
                  background:isSel?cam.color:"#181b30",color:isSel?"#000":cam.color+"cc",
                  fontSize:"7.5px",fontFamily:"monospace",fontWeight:"700",cursor:"pointer",transition:"all 0.15s",lineHeight:"1.3"}}>
                <div>{p.short}</div>
                <div style={{fontSize:"7px",fontWeight:"400",opacity:0.8}}>{sec?.short}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// NEXT SHOT MODULE
// ─────────────────────────────────────────────────────────────────
function NextShotModule({ state, dispatch, isMobile }) {
  const [avoidRecent, setAvoidRecent] = useState(true);
  const targetSec = state.sections.find(s=>s.id===state.targetSection);

  const ranked = useMemo(()=>{
    if(!targetSec)return[];
    return state.cameras.map(cam=>({cam,...scoreCamera(cam,targetSec,avoidRecent?state.recentlyUsed:[])}))
      .sort((a,b)=>b.score-a.score);
  },[targetSec,state.cameras,state.recentlyUsed,avoidRecent]);

  if(!state.nextShotOpen) return (
    <div style={{padding:"12px 14px",color:"#2a2d50",fontFamily:"monospace",fontSize:"10px",textAlign:"center"}}>
      Tik op een sectie op de kaart →<br/>volgende shot suggesties
    </div>
  );

  return (
    <div style={{padding:"10px 14px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"10px"}}>
        <div>
          <div style={{fontSize:"8px",color:"#FFD447",fontFamily:"monospace",letterSpacing:"2px"}}>VOLGENDE SHOT</div>
          <div style={{fontSize:"13px",color:"#fff",fontFamily:"monospace",fontWeight:"700",marginTop:"2px"}}>{targetSec?.label}</div>
        </div>
        <button onClick={()=>dispatch({type:"CLEAR_TARGET"})} style={{background:"none",border:"none",color:"#3a3a60",cursor:"pointer",fontSize:"16px",padding:"4px"}}>✕</button>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"10px"}}>
        <button onClick={()=>setAvoidRecent(!avoidRecent)} style={{padding:"3px 8px",borderRadius:"4px",
          border:`1px solid ${avoidRecent?"#FF3D5A50":"#2a2d50"}`,background:avoidRecent?"#FF3D5A18":"transparent",
          color:avoidRecent?"#FF3D5A":"#3a3a60",fontSize:"8px",fontFamily:"monospace",cursor:"pointer"}}>
          {avoidRecent?"✓":"○"} Vermijd recent
        </button>
        {state.recentlyUsed.length>0&&(
          <div style={{display:"flex",gap:"4px"}}>
            {state.recentlyUsed.map(id=>{const c=state.cameras.find(c=>c.id===id);
              return <div key={id} style={{width:"6px",height:"6px",borderRadius:"50%",background:c?.color,opacity:0.5}}/>;
            })}
          </div>
        )}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
        {ranked.map(({cam,score,inFov,aDiff},i)=>{
          const preset=state.presets[cam.id]?.find(p=>state.sections.find(s=>s.id===p.sectionId&&s.id===targetSec?.id));
          return (
            <div key={cam.id}
              onMouseEnter={()=>dispatch({type:"SET_HL_CAM",id:cam.id})}
              onMouseLeave={()=>dispatch({type:"CLEAR_HL_CAM"})}
              onClick={()=>{
                if(preset)dispatch({type:"APPLY_PRESET",camId:cam.id,presetId:preset.id});
                else dispatch({type:"SET_ACTIVE",id:cam.id});
                dispatch({type:"CLEAR_TARGET"});
              }}
              style={{background:i===0?`${cam.color}18`:"#0c0e1e",border:`1px solid ${i===0?cam.color:cam.color+"28"}`,
                borderRadius:"8px",padding:"8px 10px",cursor:"pointer",transition:"all 0.2s",display:"flex",alignItems:"center",gap:"10px"}}>
              <div style={{fontSize:"11px",color:cam.color,fontFamily:"monospace",fontWeight:"800",minWidth:"22px"}}>{i===0?"★":i+1}</div>
              <div style={{width:"22px",height:"22px",borderRadius:"50%",background:cam.active?cam.color:"transparent",
                border:`2px solid ${cam.color}`,display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:"9px",fontWeight:"700",color:cam.active?"#000":cam.color,fontFamily:"monospace",flexShrink:0}}>{cam.id}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:"9px",color:cam.color,fontFamily:"monospace",fontWeight:"700"}}>{cam.label}</div>
                <div style={{display:"flex",gap:"6px",marginTop:"3px"}}>
                  <div style={{height:"3px",flex:1,background:"#1a1d30",borderRadius:"2px"}}>
                    <div style={{height:"100%",width:`${score}%`,background:cam.color,borderRadius:"2px",transition:"width 0.3s"}}/>
                  </div>
                  <span style={{fontSize:"8px",color:cam.color+"99",fontFamily:"monospace"}}>{score}%</span>
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:"2px",alignItems:"flex-end"}}>
                {inFov&&<span style={{fontSize:"7px",color:"#00E5A0",fontFamily:"monospace"}}>✓FOV</span>}
                <span style={{fontSize:"7px",color:"#2a2d50",fontFamily:"monospace"}}>{aDiff}°</span>
              </div>
            </div>
          );
        })}
      </div>
      {ranked[0]&&(
        <button onClick={()=>{
          const best=ranked[0].cam;
          const preset=state.presets[best.id]?.find(p=>state.sections.find(s=>s.id===p.sectionId&&s.id===targetSec?.id));
          if(preset)dispatch({type:"APPLY_PRESET",camId:best.id,presetId:preset.id});
          else dispatch({type:"SET_ACTIVE",id:best.id});
          dispatch({type:"CLEAR_TARGET"});
        }} style={{marginTop:"10px",width:"100%",padding:"10px",background:ranked[0].cam.color,border:"none",
          borderRadius:"8px",color:"#000",fontSize:"11px",fontFamily:"monospace",fontWeight:"800",cursor:"pointer",letterSpacing:"1px"}}>
          ▶ CAM {ranked[0].cam.id} INZETTEN
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// LIVE STATUS BAR
// ─────────────────────────────────────────────────────────────────
function LiveStatusBar({ state }) {
  const active=state.cameras.find(c=>c.active);
  const preset=active&&state.presets[active.id]?.find(p=>p.id===active.presetId);
  const sec=preset&&state.sections.find(s=>s.id===preset.sectionId);
  return (
    <div style={{display:"flex",alignItems:"center",gap:"12px",padding:"7px 14px",background:"#080a16",borderBottom:"1px solid #12142a",overflowX:"auto"}}>
      <div style={{display:"flex",alignItems:"center",gap:"5px",flexShrink:0}}>
        <div style={{width:"6px",height:"6px",borderRadius:"50%",background:"#FF3D5A",boxShadow:"0 0 6px #FF3D5A",animation:"pulse 1.5s infinite"}}/>
        <span style={{fontSize:"9px",color:"#FF3D5A",fontFamily:"monospace",fontWeight:"700",letterSpacing:"2px"}}>LIVE</span>
      </div>
      {active&&(
        <div style={{display:"flex",alignItems:"center",gap:"6px",flexShrink:0}}>
          <div style={{width:"10px",height:"10px",borderRadius:"50%",background:active.color}}/>
          <span style={{fontSize:"10px",color:active.color,fontFamily:"monospace",fontWeight:"700"}}>{active.label}</span>
          {sec&&<span style={{fontSize:"9px",color:active.color+"99",fontFamily:"monospace"}}>→ {sec.label}</span>}
        </div>
      )}
      <div style={{display:"flex",gap:"8px",marginLeft:"auto",flexShrink:0}}>
        {state.cameras.map(cam=>{
          const p=state.presets[cam.id]?.find(pr=>pr.id===cam.presetId);
          const s=p&&state.sections.find(s=>s.id===p.sectionId);
          return (
            <div key={cam.id} style={{display:"flex",alignItems:"center",gap:"3px"}}>
              <div style={{width:"8px",height:"8px",borderRadius:"50%",background:cam.active?cam.color:"transparent",
                border:`1.5px solid ${cam.color}`,boxShadow:cam.active?`0 0 5px ${cam.color}`:undefined}}/>
              <span style={{fontSize:"7px",color:s?cam.color:"#2a2d50",fontFamily:"monospace"}}>{s?.short||"—"}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// SUPABASE PANEL
// ─────────────────────────────────────────────────────────────────
const inp={padding:"6px 8px",borderRadius:"6px",border:"1px solid #1e2140",fontSize:"9px",fontFamily:"monospace",background:"#0c0e1e",color:"#aaa",width:"100%",outline:"none"};

function SupabasePanel({ state, dispatch }) {
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const [testing,setTesting]=useState(false);const [saving,setSaving]=useState(false);const [loading,setLoading]=useState(false);
  const [connected,setConnected]=useState(false);const [open,setOpen]=useState(false);const [msg,setMsg]=useState(null);

const testConn = async () => {
  if (!url || !key) {
    setMsg({ ok: false, text: "Env variables ontbreken" });
    return;
  }

  setTesting(true);
  setMsg(null);

  try {
    const res = await fetch(`${url}/rest/v1/camera_states?limit=1`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });

    if (res.ok || res.status === 406) {
      setConnected(true);
      setMsg({ ok: true, text: "Verbinding OK ✓" });
    } else {
      throw new Error(`HTTP ${res.status}`);
    }
  } catch (e) {
    setMsg({ ok: false, text: `Fout: ${e.message}` });
  }

  setTesting(false);
};

  const saveState=async()=>{
    if(!connected){setMsg({ok:false,text:"Eerst verbinding testen"});return;}
    setSaving(true);setMsg(null);
    try{
      await fetch(`${url}/rest/v1/camera_states`,{method:"POST",
        headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json",Prefer:"resolution=merge-duplicates"},
        body:JSON.stringify({id:"main",cameras:state.cameras,active_cam:state.activeCamId,updated_at:new Date().toISOString()})});
      setMsg({ok:true,text:"Opgeslagen ✓"});
    }catch(e){setMsg({ok:false,text:`Fout: ${e.message}`});}
    setSaving(false);
  };

  const loadState=async()=>{
    if(!connected){setMsg({ok:false,text:"Eerst verbinding testen"});return;}
    setLoading(true);setMsg(null);
    try{
      const res=await fetch(`${url}/rest/v1/camera_states?id=eq.main&limit=1`,{headers:{apikey:key,Authorization:`Bearer ${key}`}});
      const data=await res.json();
      if(data&&data[0]){dispatch({type:"LOAD_STATE",data:{cameras: data[0].cameras,activeCamId:data[0].active_cam}});setMsg({ok:true,text:"Geladen ✓"});}
      else setMsg({ok:false,text:"Geen data gevonden"});
    }catch(e){setMsg({ok:false,text:`Fout: ${e.message}`});}
    setLoading(false);
  };

  return (
    <div style={{borderTop:"1px solid #12142a",background:"#080a16"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 14px",cursor:"pointer"}} onClick={()=>setOpen(!open)}>
        <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
          <div style={{width:"7px",height:"7px",borderRadius:"50%",background:connected?"#22c55e":"#2a2d50",boxShadow:connected?"0 0 5px #22c55e":undefined}}/>
          <span style={{fontSize:"9px",fontFamily:"monospace",color:"#7070a0",fontWeight:"700",letterSpacing:"2px"}}>SUPABASE</span>
        </div>
        <span style={{fontSize:"11px",color:"#3a3a60"}}>{open?"▲":"▼"}</span>
      </div>
      {open&&(
        <div style={{padding:"0 14px 14px",display:"flex",flexDirection:"column",gap:"8px"}}>
          <div style={{display:"flex",gap:"6px"}}>
            {[["Test",testConn,testing,"#6366f1"],["Opslaan",saveState,saving,"#22c55e"],["Laden",loadState,loading,"#FFB800"]].map(([lbl,fn,busy,col])=>(
              <button key={lbl} onClick={fn} disabled={busy} style={{flex:1,padding:"6px",borderRadius:"6px",
                border:`1px solid ${col}40`,background:`${col}12`,color:col,fontSize:"9px",fontFamily:"monospace",fontWeight:"700",cursor:busy?"not-allowed":"pointer"}}>
                {busy?"…":lbl}
              </button>
            ))}
          </div>
          {msg&&<div style={{fontSize:"9px",fontFamily:"monospace",color:msg.ok?"#22c55e":"#FF3D5A",padding:"4px 8px",background:msg.ok?"#052010":"#200505",borderRadius:"4px"}}>{msg.text}</div>}
          <div style={{fontSize:"8px",color:"#3a3a60",fontFamily:"monospace",lineHeight:"1.5"}}>
            Tabel: <code style={{color:"#7070a0"}}>camera_states</code><br/>
            Kolommen: <code style={{color:"#7070a0"}}>id text PK, cameras jsonb, active_cam int, updated_at timestamptz</code>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// MAP TOOLBAR
// ─────────────────────────────────────────────────────────────────
function MapToolbar({ state, dispatch }) {
  return (
    <div style={{position:"absolute",top:"8px",right:"8px",display:"flex",flexDirection:"column",gap:"6px",zIndex:10}}>
      {[["FOV","TOGGLE_FOV",state.showFov,"#00E5A0"],["LBL","TOGGLE_LABELS",state.showLabels,"#3DA9FF"]].map(([lbl,act,on,col])=>(
        <button key={lbl} onClick={()=>dispatch({type:act})} style={{padding:"6px 8px",borderRadius:"6px",
          border:`1px solid ${on?col:col+"40"}`,background:on?`${col}18`:"#0a0c1e",
          color:on?col:col+"50",fontSize:"8px",fontFamily:"monospace",fontWeight:"700",cursor:"pointer",letterSpacing:"1px"}}>{lbl}</button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// APP
// ─────────────────────────────────────────────────────────────────
export default function App() {
  const [state, dispatch] = useReducer(reducer, initState);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const style = document.createElement("style");
    style.textContent = `...`;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 768);
    };

    check(); // initial check
    window.addEventListener("resize", check);

    return () => window.removeEventListener("resize", check);
  }, []);

  if(isMobile) return (
    <div style={{display:"flex",flexDirection:"column",height:"100dvh",background:"#080a16",overflow:"hidden"}}>
      <div style={{padding:"8px 14px",background:"#080a16",borderBottom:"1px solid #12142a",flexShrink:0}}>
        <div style={{fontFamily:"'Exo 2',sans-serif",fontSize:"12px",fontWeight:"900",color:"#FFD447",letterSpacing:"3px"}}>CAMERA PLANNER</div>
        <div style={{fontSize:"7px",color:"#2a2d50",letterSpacing:"2px"}}>MUZIEKKAPEL VAN DE GIDSEN</div>
      </div>
      <LiveStatusBar state={state}/>
      <div style={{flexShrink:0,height:"42dvh",position:"relative",background:"#0a0c18",borderBottom:"1px solid #12142a"}}>
        <StageMap state={state} dispatch={dispatch} highlightSectionId={state.targetSection}/>
        <MapToolbar state={state} dispatch={dispatch}/>
      </div>
      <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column"}}>
        <div style={{padding:"10px 10px 6px",borderBottom:"1px solid #12142a",flexShrink:0}}>
          <div style={{fontSize:"8px",color:"#2a2d50",fontFamily:"monospace",letterSpacing:"2px",marginBottom:"8px"}}>CAMERAS</div>
          <div style={{display:"flex",gap:"8px",overflowX:"auto",paddingBottom:"4px"}}>
            {state.cameras.map(cam=><CameraCard key={cam.id} cam={cam} presets={state.presets[cam.id]} state={state} dispatch={dispatch} isMobile={true}/>)}
          </div>
        </div>
        <div style={{flex:1}}>
          <div style={{padding:"10px 14px 4px",borderBottom:"1px solid #12142a"}}>
            <div style={{fontSize:"8px",color:"#2a2d50",fontFamily:"monospace",letterSpacing:"2px"}}>VOLGENDE SHOT</div>
          </div>
          <NextShotModule state={state} dispatch={dispatch} isMobile={true}/>
        </div>
        <SupabasePanel state={state} dispatch={dispatch}/>
      </div>
    </div>
  );

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh",background:"#080a16",overflow:"hidden"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 20px",background:"#080a16",borderBottom:"1px solid #12142a",flexShrink:0}}>
        <div>
          <div style={{fontFamily:"'Exo 2',sans-serif",fontSize:"15px",fontWeight:"900",color:"#FFD447",letterSpacing:"4px"}}>CAMERA PLANNER</div>
          <div style={{fontSize:"8px",color:"#2a2d50",letterSpacing:"3px",marginTop:"1px"}}>HENRY LE BŒUF HALL · MUZIEKKAPEL VAN DE GIDSEN</div>
        </div>
        <LiveStatusBar state={state}/>
      </div>
      <div style={{flex:1,display:"flex",overflow:"hidden",minHeight:0}}>
        <div style={{flex:1,position:"relative",background:"radial-gradient(ellipse at 50% 35%,#0e1030 0%,#080a16 100%)",
          display:"flex",alignItems:"center",justifyContent:"center",padding:"16px",minWidth:0}}>
          <div style={{width:"100%",maxWidth:"840px",aspectRatio:"800/580",border:"1px solid #1a1d35",borderRadius:"14px",
            overflow:"hidden",boxShadow:"0 0 80px #00001a",position:"relative"}}>
            <StageMap state={state} dispatch={dispatch} highlightSectionId={state.targetSection}/>
          </div>
          <MapToolbar state={state} dispatch={dispatch}/>
        </div>
        <div style={{width:"300px",minWidth:"270px",background:"#080a16",borderLeft:"1px solid #12142a",display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{flex:"0 0 auto",overflowY:"auto",padding:"12px",borderBottom:"1px solid #12142a",maxHeight:"50%"}}>
            <div style={{fontSize:"8px",color:"#2a2d50",fontFamily:"monospace",letterSpacing:"2px",marginBottom:"10px"}}>CAMERAS — {state.cameras.filter(c=>c.active).length} ACTIEF</div>
            {state.cameras.map(cam=><CameraCard key={cam.id} cam={cam} presets={state.presets[cam.id]} state={state} dispatch={dispatch} isMobile={false}/>)}
          </div>
          <div style={{flex:1,overflowY:"auto",borderBottom:"1px solid #12142a"}}>
            <div style={{padding:"10px 14px 6px",borderBottom:"1px solid #12142a"}}>
              <div style={{fontSize:"8px",color:"#2a2d50",fontFamily:"monospace",letterSpacing:"2px"}}>VOLGENDE SHOT</div>
            </div>
            <NextShotModule state={state} dispatch={dispatch} isMobile={false}/>
          </div>
          <SupabasePanel state={state} dispatch={dispatch}/>
        </div>
      </div>
    </div>
  );
}
