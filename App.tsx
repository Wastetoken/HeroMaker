import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ShaderParams, Layer, TabType, DragState, GlobalSettings } from './types';
import { DEFAULT_SHADER_PARAMS, BLEND_MODES, SYSTEM_FONTS, VERTEX_SHADER, FRAGMENT_SHADER } from './constants';

const WebGLRenderer: React.FC<{ params: ShaderParams }> = ({ params }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGL2RenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const requestRef = useRef<number | null>(null);

  const initGL = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", { antialias: true });
    if (!gl) return;
    glRef.current = gl;

    const createShader = (type: number, source: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
      }
      return shader;
    };

    const program = gl.createProgram()!;
    gl.attachShader(program, createShader(gl.VERTEX_SHADER, VERTEX_SHADER));
    gl.attachShader(program, createShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
    gl.linkProgram(program);
    gl.useProgram(program);
    programRef.current = program;

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
  }, []);

  useEffect(() => {
    initGL();
    const hex2Rgb = (h: string) => {
      const match = h.match(/[A-Za-z0-9]{2}/g);
      if (!match) return [0, 0, 0];
      return match.map(v => parseInt(v, 16) / 255);
    };

    const render = (time: number) => {
      const gl = glRef.current;
      const program = programRef.current;
      const canvas = canvasRef.current;
      if (!gl || !program || !canvas) return;

      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);

      const locs = {
        r: gl.getUniformLocation(program, "r"),
        t: gl.getUniformLocation(program, "t"),
        c: [1, 2, 3, 4, 5].map(i => gl.getUniformLocation(program, `u_c${i}`)),
        z: gl.getUniformLocation(program, "u_zoom"),
        cp: gl.getUniformLocation(program, "u_complexity"),
        s: gl.getUniformLocation(program, "u_speed"),
        d: gl.getUniformLocation(program, "u_distortion"),
        it: gl.getUniformLocation(program, "u_iterations"),
        n: gl.getUniformLocation(program, "u_noise"),
        hr: gl.getUniformLocation(program, "u_hueRotation")
      };

      gl.uniform2f(locs.r, canvas.width, canvas.height);
      gl.uniform1f(locs.t, time * 0.001);
      params.colors.forEach((c, i) => gl.uniform3fv(locs.c[i], hex2Rgb(c)));
      gl.uniform1f(locs.z, params.zoom);
      gl.uniform1f(locs.cp, params.complexity);
      gl.uniform1f(locs.s, params.speed);
      gl.uniform1f(locs.d, params.distortion);
      gl.uniform1f(locs.it, params.iterations);
      gl.uniform1f(locs.n, params.noise);
      gl.uniform1f(locs.hr, params.hueRotation);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      requestRef.current = requestAnimationFrame(render);
    };

    requestRef.current = requestAnimationFrame(render);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [params, initGL]);

  return <canvas ref={canvasRef} className="shader-canvas" />;
};

const App: React.FC = () => {
  const [params, setParams] = useState<ShaderParams>(DEFAULT_SHADER_PARAMS);
  const [global, setGlobal] = useState<GlobalSettings>({ showGrid: false, gridOpacity: 0.15 });
  const [layers, setLayers] = useState<Layer[]>([
    {
      id: '1',
      type: 'text',
      text: "G L I T C H",
      x: window.innerWidth / 2,
      y: window.innerHeight / 2 - 80,
      size: 100,
      font: 'Clash Display',
      weight: 700,
      opacity: 1,
      rotation: 0,
      letterSpacing: 2,
      mixBlendMode: 'normal',
      color: '#FFFFFF',
      italic: false
    },
    {
      id: '2',
      type: 'button',
      text: "EXPLORE THE VOID",
      x: window.innerWidth / 2,
      y: window.innerHeight / 2 + 100,
      size: 14,
      font: 'Space Mono',
      weight: 700,
      opacity: 1,
      rotation: 0,
      letterSpacing: 4,
      mixBlendMode: 'normal',
      color: '#000000',
      italic: false,
      paddingX: 44,
      paddingY: 20,
      borderRadius: 0,
      backgroundColor: '#CCFF00',
      borderWidth: 0,
      borderColor: '#CCFF00'
    }
  ]);
  const [selectedId, setSelectedId] = useState<string>('1');
  const [activeTab, setActiveTab] = useState<TabType>('Visuals');
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [showUI, setShowUI] = useState(true);

  const activeLayer = layers.find(l => l.id === selectedId);

  const updateLayer = (key: keyof Layer, val: any) => {
    setLayers(prev => prev.map(l => l.id === selectedId ? { ...l, [key]: val } : l));
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!dragging) return;
    const clientX = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
    setLayers(prev => prev.map(l => l.id === dragging.id ? { ...l, x: clientX - dragging.offsetX, y: clientY - dragging.offsetY } : l));
  };

  const downloadBuild = () => {
    const build = `<!DOCTYPE html><html><head><title>FORGE_PRODUCTION</title><style>
      body{margin:0;overflow:hidden;background:#000;font-family:sans-serif;}
      canvas{display:block;width:100vw;height:100vh;}
      .l{position:absolute;white-space:nowrap;transform:translate(-50%,-50%);cursor:pointer;text-decoration:none;display:flex;align-items:center;justify-content:center;}
      button.l{border:none;outline:none;}
    </style></head><body><canvas id="c"></canvas>
    ${layers.map(l => {
      const s = `left:${l.x}px;top:${l.y}px;font-size:${l.size}px;opacity:${l.opacity};transform:translate(-50%,-50%) rotate(${l.rotation}deg);font-family:'${l.font}';letter-spacing:${l.letterSpacing}px;mix-blend-mode:${l.mixBlendMode};color:${l.color};font-weight:${l.weight};font-style:${l.italic ? 'italic' : 'normal'}`;
      if(l.type === 'text') {
        return `<div class="l" style="${s}">${l.text}</div>`;
      } else {
        const btnS = `;background:${l.backgroundColor};padding:${l.paddingY}px ${l.paddingX}px;border-radius:${l.borderRadius}px;border:${l.borderWidth}px solid ${l.borderColor}`;
        return `<button class="l" style="${s}${btnS}">${l.text}</button>`;
      }
    }).join('')}
    <script>
      const c=document.getElementById('c'),gl=c.getContext('webgl2'),P=${JSON.stringify(params)},VS=\`${VERTEX_SHADER}\`,FS=\`${FRAGMENT_SHADER}\`;
      function s(t,x){const h=gl.createShader(t);gl.shaderSource(h,x);gl.compileShader(h);return h;}
      const p=gl.createProgram();gl.attachShader(p,s(gl.VERTEX_SHADER,VS));gl.attachShader(p,s(gl.FRAGMENT_SHADER,FS));gl.linkProgram(p);gl.useProgram(p);
      gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
      const pos=gl.getAttribLocation(p,"a_position");gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
      const loc={r:gl.getUniformLocation(p,"r"),t:gl.getUniformLocation(p,"t"),c:[1,2,3,4,5].map(i=>gl.getUniformLocation(p,"u_c"+i)),z:gl.getUniformLocation(p,"u_zoom"),cp:gl.getUniformLocation(p,"u_complexity"),s:gl.getUniformLocation(p,"u_speed"),d:gl.getUniformLocation(p,"u_distortion"),it:gl.getUniformLocation(p,"u_iterations"),n:gl.getUniformLocation(p,"u_noise"),hr:gl.getUniformLocation(p,"u_hueRotation")};
      const h2r=h=>h.match(/[A-Za-z0-9]{2}/g).map(v=>parseInt(v,16)/255);
      function L(t){c.width=window.innerWidth;c.height=window.innerHeight;gl.viewport(0,0,c.width,c.height);gl.uniform2f(loc.r,c.width,c.height);gl.uniform1f(loc.t,t*0.001);P.colors.forEach((col,i)=>gl.uniform3fv(loc.c[i],h2r(col)));gl.uniform1f(loc.z,P.zoom);gl.uniform1f(loc.cp,P.complexity);gl.uniform1f(loc.s,P.speed);gl.uniform1f(loc.d,P.distortion);gl.uniform1f(loc.it,P.iterations);gl.uniform1f(loc.n,P.noise);gl.uniform1f(loc.hr,P.hueRotation);gl.drawArrays(gl.TRIANGLES,0,6);requestAnimationFrame(L);}requestAnimationFrame(L);
    </script></body></html>`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([build], { type: 'text/html' }));
    a.download = 'forge-deploy.html';
    a.click();
  };

  return (
    <div 
      className="w-full h-screen relative overflow-hidden bg-black" 
      onMouseMove={handleMouseMove} 
      onTouchMove={handleMouseMove}
      onMouseUp={() => setDragging(null)}
      onTouchEnd={() => setDragging(null)}
    >
      <WebGLRenderer params={params} />

      {/* Grid Overlay System */}
      {global.showGrid && (
        <div className="dev-grid" style={{ opacity: global.gridOpacity }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="dev-grid-col"></div>
          ))}
        </div>
      )}

      {/* Toggle Interface */}
      <button 
        onClick={() => setShowUI(!showUI)} 
        className="fixed top-6 right-6 z-[100] w-12 h-12 rounded-2xl glass-panel flex items-center justify-center hover:bg-[#CCFF00] hover:text-black transition-all active:scale-95"
      >
        <i className={`ph ${showUI ? 'ph-eye-slash' : 'ph-eye'} text-2xl`}></i>
      </button>

      {showUI && (
        <>
          <div className="fixed top-6 left-6 z-50 glass-panel w-full max-w-[340px] md:w-80 rounded-[28px] overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-7 border-b border-white/5 bg-black/40">
              <h1 className="text-[#CCFF00] font-black tracking-tighter text-2xl italic leading-none">FORGE.PRO</h1>
              <p className="text-[10px] text-gray-500 font-mono mt-1 uppercase tracking-[0.2em]">Deployment_Engine_v2</p>
            </div>

            <div className="flex bg-white/5 p-1.5 mx-7 mt-6 rounded-2xl border border-white/5">
              {(['Visuals', 'Palette', 'Layout', 'Layers'] as TabType[]).map(t => (
                <button 
                  key={t} 
                  onClick={() => setActiveTab(t)} 
                  className={`flex-1 py-2 text-[9px] uppercase font-black rounded-xl transition-all ${activeTab === t ? 'bg-white/10 text-[#CCFF00]' : 'text-gray-500 hover:text-white'}`}
                >
                  {String(t)}
                </button>
              ))}
            </div>

            <div className="p-7 overflow-y-auto flex-1 space-y-8">
              {activeTab === 'Visuals' && (
                <div className="space-y-6">
                  <ControlItem label="COMPLEXITY" value={params.complexity} min={10} max={300} onChange={v => setParams({ ...params, complexity: v })} />
                  <ControlItem label="ZOOM" value={params.zoom} min={0.1} max={8} step={0.1} onChange={v => setParams({ ...params, zoom: v })} />
                  <ControlItem label="DISTORTION" value={params.distortion} min={-20} max={20} step={0.1} onChange={v => setParams({ ...params, distortion: v })} />
                  <ControlItem label="SPEED" value={params.speed} min={0.1} max={5} step={0.1} onChange={v => setParams({ ...params, speed: v })} />
                </div>
              )}

              {activeTab === 'Palette' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-5 gap-3">
                    {params.colors.map((c, i) => (
                      <input key={i} type="color" value={c} onChange={e => {
                        const n = [...params.colors];
                        n[i] = e.target.value;
                        setParams({ ...params, colors: n });
                      }} className="w-full h-10 cursor-pointer rounded-lg hover:scale-110 transition-transform" />
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'Layout' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-5 rounded-[20px] bg-white/5 border border-white/5">
                    <div>
                      <p className="text-[10px] font-black text-[#CCFF00] tracking-widest">12-COL OVERLAY</p>
                      <p className="text-[8px] text-gray-500 font-mono mt-0.5 uppercase">Reference Grid</p>
                    </div>
                    <button 
                      onClick={() => setGlobal({ ...global, showGrid: !global.showGrid })}
                      className={`w-12 h-6 rounded-full relative transition-all ${global.showGrid ? 'bg-[#CCFF00]' : 'bg-white/10'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${global.showGrid ? 'left-7' : 'left-1'}`}></div>
                    </button>
                  </div>
                  <ControlItem label="GRID OPACITY" value={global.gridOpacity} min={0} max={1} step={0.01} onChange={v => setGlobal({ ...global, gridOpacity: v })} />
                </div>
              )}

              {activeTab === 'Layers' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-3">
                    <LayerAction icon="ph-text-t" label="TEXT" onClick={() => {
                      const id = Math.random().toString(36).substr(2, 9);
                      setLayers([...layers, { ...layers[0], id, type: 'text', text: "NEW_STRING", x: window.innerWidth/2, y: window.innerHeight/2 }]);
                      setSelectedId(id);
                    }} />
                    <LayerAction icon="ph-cursor-click" label="CTA" onClick={() => {
                      const id = Math.random().toString(36).substr(2, 9);
                      setLayers([...layers, { 
                        id, type: 'button', text: "CLICK_HERE", x: window.innerWidth/2, y: window.innerHeight/2,
                        size: 14, font: 'Space Mono', weight: 700, opacity: 1, rotation: 0, letterSpacing: 2, mixBlendMode: 'normal', color: '#000000', italic: false,
                        paddingX: 32, paddingY: 16, borderRadius: 4, backgroundColor: '#CCFF00', borderWidth: 0, borderColor: '#CCFF00'
                      }]);
                      setSelectedId(id);
                    }} />
                  </div>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                    {layers.map(l => (
                      <button 
                        key={l.id} 
                        onClick={() => setSelectedId(l.id)}
                        className={`w-full text-left px-5 py-4 rounded-2xl text-[11px] font-black tracking-widest transition-all border ${selectedId === l.id ? 'bg-[#CCFF00] text-black border-transparent shadow-[0_0_30px_rgba(204,255,0,0.2)]' : 'bg-white/5 text-gray-400 border-white/5 hover:text-white'}`}
                      >
                        {String(l.type).toUpperCase()}: {String(l.text).substring(0, 12)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-7 border-t border-white/5 bg-black/40">
              <button onClick={downloadBuild} className="w-full py-5 rounded-2xl bg-[#CCFF00] text-black font-black text-xs tracking-[0.2em] uppercase hover:scale-[1.02] active:scale-95 transition-all shadow-[0_10px_40px_rgba(204,255,0,0.2)]">
                MASTER_DEPLOY
              </button>
            </div>
          </div>

          {activeLayer && (
            <div className="fixed bottom-6 left-6 z-50 glass-panel w-full max-w-[340px] md:w-80 rounded-[28px] p-7 md:max-h-[55vh] overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                <span className="text-[10px] font-black text-[#CCFF00] uppercase tracking-[0.2em]">Configuration</span>
                <button onClick={() => { if(layers.length > 1) { setLayers(layers.filter(l => l.id !== selectedId)); setSelectedId(layers[0].id); } }} className="text-red-500/40 hover:text-red-500 transition-colors"><i className="ph ph-trash-simple text-xl"></i></button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] text-gray-500 font-mono tracking-widest uppercase">Content Value</label>
                  <input type="text" value={activeLayer.text} onChange={e => updateLayer('text', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white focus:border-[#CCFF00] outline-none transition-all" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                   <ControlItem label="SIZE" value={activeLayer.size} min={5} max={400} onChange={v => updateLayer('size', v)} compact />
                   <ControlItem label="OPACITY" value={activeLayer.opacity} min={0} max={1} step={0.1} onChange={v => updateLayer('opacity', v)} compact />
                </div>

                {activeLayer.type === 'button' && (
                  <div className="space-y-5 p-5 rounded-2xl bg-[#CCFF00]/5 border border-[#CCFF00]/10">
                    <p className="text-[9px] font-black text-[#CCFF00] tracking-[0.2em] uppercase mb-1 italic">Interaction_Styling</p>
                    <div className="grid grid-cols-2 gap-4">
                      <ControlItem label="PAD X" value={activeLayer.paddingX || 0} min={0} max={150} onChange={v => updateLayer('paddingX', v)} compact />
                      <ControlItem label="PAD Y" value={activeLayer.paddingY || 0} min={0} max={150} onChange={v => updateLayer('paddingY', v)} compact />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <ControlItem label="RADIUS" value={activeLayer.borderRadius || 0} min={0} max={100} onChange={v => updateLayer('borderRadius', v)} compact />
                      <div className="space-y-1.5">
                        <label className="text-[9px] text-gray-500 font-black uppercase">Fill</label>
                        <input type="color" value={activeLayer.backgroundColor} onChange={e => updateLayer('backgroundColor', e.target.value)} className="!w-full !h-10 rounded-xl cursor-pointer" />
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Typeface</label>
                    <select value={activeLayer.font} onChange={e => updateLayer('font', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-[10px] text-white focus:border-[#CCFF00] outline-none appearance-none">
                      {SYSTEM_FONTS.map(f => <option key={String(f)} value={String(f)} className="bg-black text-white">{String(f)}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Blending</label>
                    <select value={activeLayer.mixBlendMode} onChange={e => updateLayer('mixBlendMode', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-[10px] text-white focus:border-[#CCFF00] outline-none appearance-none">
                      {BLEND_MODES.map(m => <option key={String(m)} value={String(m)} className="bg-black text-white">{String(m)}</option>)}
                    </select>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="flex-1 space-y-2">
                    <label className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Foreground</label>
                    <input type="color" value={activeLayer.color} onChange={e => updateLayer('color', e.target.value)} className="!w-full h-10 rounded-xl cursor-pointer" />
                  </div>
                  <button onClick={() => updateLayer('italic', !activeLayer.italic)} className={`flex-1 mt-6 rounded-xl text-[10px] font-black border transition-all ${activeLayer.italic ? 'bg-[#CCFF00] text-black border-transparent shadow-lg' : 'border-white/10 text-gray-400 hover:bg-white/5'}`}>ITALIC</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Rendering Environment */}
      <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
        {layers.map(layer => {
          const commonStyle: React.CSSProperties = {
            left: layer.x, 
            top: layer.y, 
            fontSize: `${layer.size}px`, 
            fontFamily: `'${layer.font}'`, 
            fontWeight: layer.weight,
            fontStyle: layer.italic ? 'italic' : 'normal',
            transform: `translate(-50%, -50%) rotate(${layer.rotation}deg)`,
            opacity: layer.opacity,
            letterSpacing: `${layer.letterSpacing}px`,
            mixBlendMode: layer.mixBlendMode as any,
            color: layer.color
          };

          const handleLayerDragStart = (e: React.MouseEvent | React.TouchEvent) => {
            e.stopPropagation();
            setSelectedId(layer.id);
            const clientX = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
            const clientY = 'touches' in e ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
            setDragging({ id: layer.id, offsetX: clientX - layer.x, offsetY: clientY - layer.y });
          };

          if (layer.type === 'text') {
            return (
              <div 
                key={layer.id} 
                onMouseDown={handleLayerDragStart}
                onTouchStart={handleLayerDragStart}
                className={`absolute whitespace-nowrap text-outline-shadow pointer-events-auto cursor-grab select-none text-glow transition-[transform] duration-75 ${selectedId === layer.id && showUI ? 'layer-active' : ''}`}
                style={commonStyle}
              >
                {String(layer.text)}
              </div>
            );
          } else {
            return (
              <button 
                key={layer.id} 
                onMouseDown={handleLayerDragStart}
                onTouchStart={handleLayerDragStart}
                className={`absolute pointer-events-auto cursor-grab select-none border-0 transition-transform duration-75 ${selectedId === layer.id && showUI ? 'layer-active' : ''}`}
                style={{ 
                  ...commonStyle,
                  background: layer.backgroundColor,
                  padding: `${layer.paddingY}px ${layer.paddingX}px`,
                  borderRadius: `${layer.borderRadius}px`,
                  border: `${layer.borderWidth}px solid ${layer.borderColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {String(layer.text)}
              </button>
            );
          }
        })}
      </div>
    </div>
  );
};

const LayerAction: React.FC<{ icon: string, label: string, onClick: () => void }> = ({ icon, label, onClick }) => (
  <button 
    onClick={onClick}
    className="bg-white/5 p-5 rounded-[24px] flex flex-col items-center justify-center gap-2 hover:bg-[#CCFF00] hover:text-black border border-white/5 transition-all active:scale-95 group"
  >
    <i className={`ph ${icon} text-2xl opacity-60 group-hover:opacity-100`}></i>
    <span className="text-[9px] font-black tracking-[0.2em] uppercase">{String(label)}</span>
  </button>
);

interface ControlItemProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  compact?: boolean;
}

const ControlItem: React.FC<ControlItemProps> = ({ label, value, min, max, step = 1, onChange, compact }) => (
  <div className={`${compact ? 'space-y-1.5' : 'space-y-3'}`}>
    <div className="flex justify-between items-center px-1">
      <label className="text-[9px] text-gray-500 font-black tracking-widest uppercase italic">{String(label)}</label>
      <span className="text-[10px] text-white font-mono font-bold bg-white/5 px-2 py-0.5 rounded">{Number(value)}</span>
    </div>
    <input 
      type="range" 
      className="range-input" 
      min={min} 
      max={max} 
      step={step} 
      value={value} 
      onChange={e => onChange(parseFloat(e.target.value))} 
    />
  </div>
);

export default App;