import React, { useRef, useState, useEffect, useMemo } from 'react';

const ChartPanel = ({ data, theme }) => {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(800);
  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    const handle = () => setWidth(Math.max(320, el.clientWidth));
    handle();
    const ro = new ResizeObserver(handle); ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const points = useMemo(() => (data || []).map((d,i)=>({x:i,y:Number(d.instance)||0,label:d.daemon_name||`Item ${i+1}`})), [data]);
  const [hover, setHover] = useState(null); // {x,y,label,value}
  if (points.length < 2) return null;
  const isLight = theme === 'theme-light';
  const palette = {
    strokeStart: isLight ? '#8b5cf6' : '#c084fc',
    strokeMid:   isLight ? '#7c3aed' : '#8b5cf6',
    strokeEnd:   isLight ? '#4f46e5' : '#6366f1',
    fillTop:     isLight ? 'rgba(139,92,246,0.22)' : 'rgba(192,132,252,0.32)',
    fillMid:     isLight ? 'rgba(99,102,241,0.12)' : 'rgba(139,92,246,0.18)',
    fillBottom:  isLight ? 'rgba(79,70,229,0.05)' : 'rgba(99,102,241,0.04)',
    grid:        isLight ? 'rgba(0,0,0,0.09)' : 'rgba(255,255,255,0.06)',
    label:       isLight ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.30)',
    point:       isLight ? '#7c3aed' : '#c084fc',
    pointStroke: isLight ? '#ffffff' : '#fff'
  };
  const height = 300, padX = 40, padY = 28;
  const xs = points.map(p=>p.x), ys = points.map(p=>p.y);
  // Force Y-axis to always start at 0 for consistent baseline
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = 0;
  const rawMaxY = Math.max(...ys, 0);
  const maxY = rawMaxY === 0 ? 1 : rawMaxY; // ensure non-zero span when all data is zero
  const spanX = maxX - minX || 1, spanY = maxY - minY || 1;
  const sx = x => padX + (x-minX)/spanX * (width - padX*2);
  const sy = y => height - padY - (y-minY)/spanY * (height - padY*2);
  const path = (() => { if(points.length<2) return ''; const c = points.map(p=>({X:sx(p.x),Y:sy(p.y)})); let d = `M ${c[0].X} ${c[0].Y}`; for(let i=0;i<c.length-1;i++){ const p0=c[i-1]||c[i],p1=c[i],p2=c[i+1],p3=c[i+2]||p2; const cp1x=p1.X+(p2.X-p0.X)/6, cp1y=p1.Y+(p2.Y-p0.Y)/6; const cp2x=p2.X-(p3.X-p1.X)/6, cp2y=p2.Y-(p3.Y-p1.Y)/6; d+=` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.X} ${p2.Y}`;} return d; })();
  const grid = Array.from({length:5},(_,i)=>{const yVal=minY+(spanY/4)*i; return { y: sy(yVal), label: Math.round(yVal)};});
  return (
    <section ref={containerRef} className="chart-card theme-surface" style={{marginTop:'2.25rem', padding:'1.15rem 1.3rem'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'.65rem', flexWrap:'wrap', gap:'.5rem'}}>
        <h3 style={{margin:0, fontSize:'clamp(.8rem,.9rem + .2vw,1rem)'}}>Instance Distribution</h3>
        <span style={{fontSize:'0.6rem', opacity:.7}}>Daemons: {points.length}</span>
      </div>
      <div className="chart-wrapper" style={{position:'relative'}}>
        <svg className="chart-svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="Daemon instance counts trend">
          <defs>
            <linearGradient id="chartStroke" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={palette.strokeStart} />
              <stop offset="55%" stopColor={palette.strokeMid} />
              <stop offset="100%" stopColor={palette.strokeEnd} />
            </linearGradient>
            <linearGradient id="chartFill" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={palette.fillTop} />
              <stop offset="55%" stopColor={palette.fillMid} />
              <stop offset="100%" stopColor={palette.fillBottom} />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {grid.map(g => (
            <g key={g.y}>
              <line x1={padX} x2={width - padX} y1={g.y} y2={g.y} stroke={palette.grid} strokeWidth={1} />
              <text x={8} y={g.y + 4} fontSize={10} fill={palette.label} style={{fontFamily:'ui-monospace,monospace'}}>{g.label}</text>
            </g>
          ))}
          <path d={`${path} L ${sx(points[points.length-1].x)} ${sy(minY)} L ${sx(points[0].x)} ${sy(minY)} Z`} fill="url(#chartFill)" opacity={0.85} />
          <path d={path} fill="none" stroke="url(#chartStroke)" strokeWidth={4} strokeLinecap="round" filter="url(#glow)" />
          {points.map(p => {
            const cx = sx(p.x); const cy = sy(p.y);
            return (
              <g key={p.x} tabIndex={0}
                 onMouseEnter={()=> setHover({x:cx, y:cy, label:p.label, value:p.y})}
                 onMouseLeave={()=> setHover(null)}
                 onFocus={()=> setHover({x:cx, y:cy, label:p.label, value:p.y})}
                 onBlur={()=> setHover(null)}
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r={6}
                  fill={palette.point}
                  stroke={palette.pointStroke}
                  strokeWidth={1.4}
                  opacity={isLight ? 0.95 : 0.9}
                  style={{cursor:'pointer', filter:'drop-shadow(0 2px 4px rgba(0,0,0,0.25))'}}
                />
              </g>
            );
          })}
        </svg>
        {hover && (() => {
          // Dynamic edge-aware positioning to avoid clipping
          const tooltipWidth = 150; // px (approx; layout is stable)
          const tooltipHeight = 60; // px
          let leftPx = hover.x + 12; // default place to right
          if (leftPx + tooltipWidth > width - 4) {
            leftPx = hover.x - tooltipWidth - 12; // flip to left side
          }
          if (leftPx < 4) leftPx = 4; // clamp
          let topPx = hover.y - tooltipHeight - 12; // default above point
          if (topPx < 4) { // not enough room above – place below
            topPx = hover.y + 12;
          }
          return (
            <div
              className="chart-tooltip"
              role="tooltip"
              style={{
                left: leftPx,
                top: topPx,
                position:'absolute'
              }}
            >
              <div className="chart-tooltip-label">{hover.label}</div>
              <div className="chart-tooltip-value">Instances: {hover.value}</div>
            </div>
          );
        })()}
      </div>
    </section>
  );
};

export default ChartPanel;
