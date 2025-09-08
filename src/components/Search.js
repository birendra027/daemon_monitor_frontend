import React, { useState, useEffect, useMemo, useRef } from 'react';

// Runtime-configured API base: prefer env injected at build, then global window config map (for future), then default
const API_BASE = process.env.REACT_APP_API_BASE_URL || (typeof window !== 'undefined' && window.__APP_CONFIG__?.API_BASE_URL) || 'http://127.0.0.1:5000';

function useDebounce(value, delay = 200) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const id = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(id);
    }, [value, delay]);
    return debounced;
}

const highlightMatch = (text = '', query) => {
    if (!query) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    const before = text.slice(0, idx);
    const match = text.slice(idx, idx + query.length);
    const after = text.slice(idx + query.length);
    return (<>{before}<span className="bg-yellow-400/70 text-gray-900 font-semibold px-0.5 rounded">{match}</span>{after}</>);
};

// Responsive lightweight line chart component (theme-aware)
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
  const points = useMemo(() => (data || []).map((d,i)=>({x:i,y:Number(d.instance)||0})), [data]);
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
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
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
      <div className="chart-wrapper">
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
          {points.map(p => <circle key={p.x} cx={sx(p.x)} cy={sy(p.y)} r={5} fill={palette.point} stroke={palette.pointStroke} strokeWidth={1.2} opacity={isLight ? 0.95 : 0.9} />)}
        </svg>
      </div>
    </section>
  );
};

const Search = ({ theme, onToggleTheme }) => {
    const [query, setQuery] = useState('');
    const [data, setData] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
        // Per-daemon temporary instance edits keyed by daemon_id
        const [instanceEdits, setInstanceEdits] = useState({});
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        let active = true;
        (async () => {
            setLoading(true); setError(null);
            try {
                const res = await fetch(`${API_BASE}/api/show`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = await res.json();
                const list = Array.isArray(json) ? json : Object.values(json).flat();
                if (active) { setData(list); setFiltered(list); }
            } catch (e) { if (active) setError(e.message || 'Failed loading data'); }
            finally { if (active) setLoading(false); }
        })();
        return () => { active = false; };
    }, []);

    const debouncedQuery = useDebounce(query, 150);
    useEffect(() => {
        if (!debouncedQuery) { setFiltered(data); return; }
        const q = debouncedQuery.toLowerCase();
        setFiltered(data.filter(d => d.daemon_name?.toLowerCase().includes(q)));
    }, [debouncedQuery, data]);

    const suggestions = useMemo(() => {
        if (!query) return [];
        const q = query.toLowerCase();
        return data.filter(d => d.daemon_name?.toLowerCase().includes(q)).slice(0, 5);
    }, [query, data]);

    const toggleStatus = (id) => {
        setData(prev => prev.map(d => String(d.daemon_id) === String(id) ? { ...d, daemon_status: d.daemon_status === 'UP' ? 'DOWN' : 'UP' } : d));
        setHasChanges(true);
    };

        const applyInstance = (daemon) => {
            const raw = instanceEdits[daemon.daemon_id];
            const num = Number(raw);
            if (raw === undefined || raw === '' || Number.isNaN(num) || num < 0) return;
            setData(prev => prev.map(d => d.daemon_id === daemon.daemon_id ? { ...d, instance: num, daemon_status: num < 1 ? 'DOWN' : 'UP' } : d));
            setInstanceEdits(prev => ({ ...prev, [daemon.daemon_id]: '' }));
            setHasChanges(true);
        };

    const save = async () => { setHasChanges(false); };

    // === Slider logic injection START ===
    // (Placed just before the return; dedupe guard: only add if not existing)
    // eslint-disable-next-line no-unused-vars
    const sliderTrackRef = useRef(null);
    const [canSlideLeft, setCanSlideLeft] = useState(false);
    const [canSlideRight, setCanSlideRight] = useState(true);

    const updateSlideButtons = () => {
      const el = sliderTrackRef.current; if(!el) return;
      setCanSlideLeft(el.scrollLeft > 10);
      setCanSlideRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
    };

    useEffect(() => { updateSlideButtons(); }, [filtered]);

    const slideBy = (dir) => {
      const el = sliderTrackRef.current; if(!el) return;
      // Determine one “page” = width / 1 (show all 4 new) or card width * 2 for partial; we use width * 0.9 for smoothness
      const page = el.clientWidth * 0.9;
      el.scrollBy({ left: dir * page, behavior: 'smooth' });
      // Post-update after animation; minor timeout
      setTimeout(updateSlideButtons, 450);
    };

    const onSliderScroll = () => { updateSlideButtons(); updateEdgeScales(); };

    // Remove drag logic (was here) – keeping only arrow navigation
    // Clean edge scale function retained
    const updateEdgeScales = () => {
      const track = sliderTrackRef.current; if(!track) return;
      const cards = Array.from(track.querySelectorAll('.slider-card'));
      if(!cards.length) return;
      // Clear existing markers
      cards.forEach(c=>c.removeAttribute('data-edge'));
      // Mark absolute first & last only
      const first = cards[0];
      const last = cards[cards.length-1];
      first?.setAttribute('data-edge','left');
      if(last && last!==first) last.setAttribute('data-edge','right');
    };

    useEffect(()=>{ updateEdgeScales(); }, [filtered]);
    useEffect(()=>{
      const ro = new ResizeObserver(()=>{ updateEdgeScales(); });
      if(sliderTrackRef.current) ro.observe(sliderTrackRef.current);
      return ()=> ro.disconnect();
    }, []);
    // === Slider logic injection END ===

    return (
        <div className="app-shell">
            <header className="collapsible-header theme-surface">
                <div className="left-zone">
                  {/* Search icon (visible collapsed) */}
                  <button className="icon-btn search-icon-only" aria-label="Show search">
                    🔍
                  </button>
                  {/* Expanded search input */}
                  <div className="search-input-wrapper expanded-only">
                                                <div className="search-bar-group">
                                                    <input
                                                            type="text"
                                                            className="input-basic"
                                                            placeholder="Search daemon name..."
                                                            value={query}
                                                            onChange={e => setQuery(e.target.value)}
                                                            aria-label="Search daemons"
                                                            autoComplete="off"
                                                    />
                                                    <button
                                                            type="button"
                                                            className="btn-search"
                                                            aria-label="Execute search"
                                                            onClick={() => setQuery(q => q.trim())}
                                                    >🔍</button>
                                                </div>
                        {query && suggestions.length > 0 && (
                            <ul className="suggestions-pop">
                                {suggestions.map(s => (
                                    <li key={s.daemon_id}
                                        onClick={() => { setQuery(s.daemon_name); }}
                                        onKeyDown={(e)=> { if(e.key==='Enter'){ setQuery(s.daemon_name);} }}
                                        tabIndex={0}
                                    >
                                        <span>{highlightMatch(s.daemon_name, query)}</span>
                                        <span className={s.daemon_status === 'UP' ? 'badge-up' : 'badge-down'} style={{fontSize:'0.65rem'}}>{s.daemon_status}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                  </div>
                  {hasChanges && (
                        <button onClick={save} className="accent-action expanded-only" style={{whiteSpace:'nowrap'}}>Save Changes</button>
                  )}
                </div>
                <button type="button" onClick={onToggleTheme} className="btn-theme-toggle" aria-label="Toggle color theme">
                  <span className="theme-icon" role="img" aria-hidden="true">{theme === 'theme-dark' ? '🌙' : '☀️'}</span>
                  <span className="theme-label" style={{marginLeft:'6px'}}>{theme === 'theme-dark' ? 'Dark Mode' : 'Light Mode'}</span>
                </button>
            </header>
            <main style={{maxWidth:'1200px', margin:'0 auto', padding:'2.5rem 1rem'}}>
                {loading && <p style={{textAlign:'center', fontSize:'0.8rem', opacity:0.8}}>Loading data...</p>}
                {error && <p style={{textAlign:'center', fontSize:'0.8rem'}} className="badge-down">{error}</p>}
                {!loading && !error && filtered.length === 0 && <p style={{textAlign:'center', fontSize:'0.8rem', opacity:0.7}}>No daemons match your search.</p>}
                {/* SLIDER START */}
                <div className="card-slider transparent-slider" aria-label="Daemon cards horizontal slider">
                  {filtered.length > 4 && (
                    <button
                      type="button"
                      className="slider-btn slider-btn-left"
                      aria-label="Scroll left"
                      disabled={!canSlideLeft}
                      onClick={() => slideBy(-1)}
                    >‹</button>
                  )}
                  <div
                    className="card-track"
                    ref={sliderTrackRef}
                    onScroll={onSliderScroll}
                    role="group"
                    style={{scrollSnapType:'x mandatory'}}
                  >
                    {filtered.map((d, idx) => {
                      const up = d.daemon_status === 'UP';
                      return (
                        <div
                          key={d.daemon_id}
                          className="card-generic slider-card" 
                          style={{borderColor: up ? 'var(--success)' : 'var(--danger)', scrollSnapAlign:'start'}}
                        >
                          <h2 style={{fontSize:'clamp(.85rem, .8rem + .35vw, 1.05rem)', margin:'0 0 4px', wordBreak:'break-word'}}>{highlightMatch(d.daemon_name, query)}</h2>
                          <p style={{margin:'0 0 4px', fontSize:'0.6rem', opacity:0.75}}>ID: {d.daemon_id}</p>
                          <p style={{margin:'0 0 6px', fontSize:'0.65rem'}}>Status: <span className={up ? 'badge-up' : 'badge-down'}>{d.daemon_status}</span></p>
                          <p style={{margin:'0 0 10px', fontSize:'0.65rem'}}>Instances: {d.instance}</p>
                          <div style={{display:'flex', gap:'6px', alignItems:'center', marginBottom:'10px'}}>
                            <input
                              type="number"
                              min={0}
                              value={instanceEdits[d.daemon_id] ?? ''}
                              onChange={e => setInstanceEdits(prev => ({ ...prev, [d.daemon_id]: e.target.value }))}
                              placeholder="Set"
                              className="input-basic"
                              style={{width:'64px', padding:'4px 6px', fontSize:'0.6rem'}}
                            />
                            <button onClick={() => applyInstance(d)} className="accent-action" style={{fontSize:'0.55rem', padding:'4px 8px'}}>Apply</button>
                          </div>
                          <button onClick={() => toggleStatus(d.daemon_id)} className="btn-small" style={{fontSize:'0.55rem'}}>Toggle {up ? 'Down' : 'Up'}</button>
                        </div>
                      );
                    })}
                  </div>
                  {filtered.length > 4 && (
                    <button
                      type="button"
                      className="slider-btn slider-btn-right"
                      aria-label="Scroll right"
                      disabled={!canSlideRight}
                      onClick={() => slideBy(1)}
                    >›</button>
                  )}
                  {/* Drag handles removed */}
                </div>
                {/* SLIDER END */}
                <ChartPanel data={filtered} theme={theme} />
            </main>
        </div>
    );
};

export default Search;
