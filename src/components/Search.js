import React, { useState, useEffect, useMemo } from 'react';

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

// Lightweight line chart for daemon instances
const ChartPanel = ({ data }) => {
  const points = useMemo(() => (data || []).map((d, i) => ({ x: i, y: Number(d.instance) || 0 })), [data]);
  if (points.length < 2) return null;
  const width = 900, height = 300, padX = 40, padY = 28;
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const spanX = maxX - minX || 1, spanY = maxY - minY || 1;
  const sx = x => padX + (x - minX) / spanX * (width - padX * 2);
  const sy = y => height - padY - (y - minY) / spanY * (height - padY * 2);
  const path = (() => {
    if (points.length < 2) return '';
    const c = points.map(p => ({ X: sx(p.x), Y: sy(p.y) }));
    let d = `M ${c[0].X} ${c[0].Y}`;
    for (let i = 0; i < c.length - 1; i++) {
      const p0 = c[i - 1] || c[i], p1 = c[i], p2 = c[i + 1], p3 = c[i + 2] || p2;
      const cp1x = p1.X + (p2.X - p0.X) / 6, cp1y = p1.Y + (p2.Y - p0.Y) / 6;
      const cp2x = p2.X - (p3.X - p1.X) / 6, cp2y = p2.Y - (p3.Y - p1.Y) / 6;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.X} ${p2.Y}`;
    }
    return d;
  })();
  const grid = Array.from({ length: 5 }, (_, i) => {
    const yVal = minY + (spanY / 4) * i; return { y: sy(yVal), label: Math.round(yVal) };
  });
  return (
    <div className="chart-card theme-surface" style={{ marginTop: '2rem', padding: '1.1rem 1.25rem' }}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'.6rem'}}>
        <h3 style={{margin:0, fontSize:'0.9rem'}}>Instance Distribution</h3>
        <span style={{fontSize:'0.6rem', opacity:.7}}>Count: {points.length}</span>
      </div>
      <div className="chart-wrapper">
        <svg className="chart-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Daemon instance counts">
          <defs>
            <linearGradient id="instStroke" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="60%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
            <linearGradient id="instFill" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(192,132,252,0.32)" />
              <stop offset="55%" stopColor="rgba(139,92,246,0.18)" />
              <stop offset="100%" stopColor="rgba(99,102,241,0.04)" />
            </linearGradient>
            <filter id="instGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="g" />
              <feMerge>
                <feMergeNode in="g" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {grid.map(g => (
            <g key={g.y}>
              <line x1={padX} x2={width - padX} y1={g.y} y2={g.y} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
              <text x={8} y={g.y + 4} fontSize={10} fill="rgba(255,255,255,0.28)" style={{fontFamily:'ui-monospace,monospace'}}>{g.label}</text>
            </g>
          ))}
          <path d={`${path} L ${sx(points[points.length-1].x)} ${sy(minY)} L ${sx(points[0].x)} ${sy(minY)} Z`} fill="url(#instFill)" opacity={0.85} />
          <path d={path} fill="none" stroke="url(#instStroke)" strokeWidth={4} filter="url(#instGlow)" strokeLinecap="round" />
          {points.map(p => <circle key={p.x} cx={sx(p.x)} cy={sy(p.y)} r={5} fill="#c084fc" stroke="#fff" strokeWidth={1.1} opacity={0.9} />)}
        </svg>
      </div>
    </div>
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
                <div style={{display:'grid', gap:'1.25rem', marginTop:'1.5rem', gridTemplateColumns:'repeat(auto-fill, minmax(250px, 1fr))'}}>
                    {filtered.map(d => {
                        const up = d.daemon_status === 'UP';
                        return (
                            <div key={d.daemon_id} className="card-generic" style={{borderColor: up ? 'var(--success)' : 'var(--danger)'}}>
                                <h2 style={{fontSize:'1rem', margin:'0 0 4px', wordBreak:'break-word'}}>{highlightMatch(d.daemon_name, query)}</h2>
                                <p style={{margin:'0 0 4px', fontSize:'0.65rem', opacity:0.8}}>ID: {d.daemon_id}</p>
                                <p style={{margin:'0 0 6px', fontSize:'0.7rem'}}>Status: <span className={up ? 'badge-up' : 'badge-down'}>{d.daemon_status}</span></p>
                                <p style={{margin:'0 0 10px', fontSize:'0.7rem'}}>Instances: {d.instance}</p>
                                <div style={{display:'flex', gap:'6px', alignItems:'center', marginBottom:'10px'}}>
                                    <input
                                        type="number"
                                        min={0}
                                        value={instanceEdits[d.daemon_id] ?? ''}
                                        onChange={e => setInstanceEdits(prev => ({ ...prev, [d.daemon_id]: e.target.value }))}
                                        placeholder="Set"
                                        className="input-basic"
                                        style={{width:'70px', padding:'4px 6px', fontSize:'0.65rem'}}
                                    />
                                    <button onClick={() => applyInstance(d)} className="accent-action" style={{fontSize:'0.6rem', padding:'4px 8px'}}>Apply</button>
                                </div>
                                <button onClick={() => toggleStatus(d.daemon_id)} className="btn-small" style={{fontSize:'0.6rem'}}>Toggle {up ? 'Down' : 'Up'}</button>
                            </div>
                        );
                    })}
                </div>
                <ChartPanel data={filtered} />
            </main>
        </div>
    );
};

export default Search;
