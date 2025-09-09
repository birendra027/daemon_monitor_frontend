import React, { useState, useEffect, useMemo, useRef } from 'react';
import useDebounce from '../hooks/useDebounce';
import ChartPanel from './ChartPanel';
import NotificationStack from './NotificationStack';
import DaemonCard from './DaemonCard';

// Runtime-configured API base: prefer env injected at build, then global window config map (for future), then default
const API_BASE = process.env.REACT_APP_API_BASE_URL || (typeof window !== 'undefined' && window.__APP_CONFIG__?.API_BASE_URL) || 'http://127.0.0.1:5000';

const highlightMatch = (text = '', query) => {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + query.length);
  const after = text.slice(idx + query.length);
  return (<>{before}<span className="bg-yellow-400/70 text-gray-900 font-semibold px-0.5 rounded">{match}</span>{after}</>);
};

const Search = ({ theme, onToggleTheme }) => {
    const [query, setQuery] = useState('');
    const [data, setData] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
        // Per-daemon temporary instance edits keyed by daemon_id
        const [instanceEdits, setInstanceEdits] = useState({});
  // Removed batch save functionality; changes now apply immediately
  const [notifications, setNotifications] = useState([]); // {id,message,type,daemonId}

  const addNotification = (message, type='warning', daemonId=null) => {
    // Prevent duplicate for same daemon while active
    if (daemonId && notifications.some(n => n.daemonId === String(daemonId))) return;
    const id = Math.random().toString(36).slice(2);
    setNotifications(ns => [...ns, { id, message, type, daemonId: daemonId ? String(daemonId) : null }]);
  };

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
    };

        const applyInstance = (daemon) => {
            const raw = instanceEdits[daemon.daemon_id];
            const num = Number(raw);
            if (raw === undefined || raw === '' || Number.isNaN(num) || num < 0) return;
            setData(prev => prev.map(d => d.daemon_id === daemon.daemon_id ? { ...d, instance: num, daemon_status: num < 1 ? 'DOWN' : 'UP' } : d));
            setInstanceEdits(prev => ({ ...prev, [daemon.daemon_id]: '' }));
      if (num === 0) {
        addNotification(`${daemon.daemon_name} instances set to 0 — status marked DOWN`, 'warning', daemon.daemon_id);
      }
        };

  // save() removed (no batching) – edits persist instantly in local state

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

  // Recurrent reminder every 2 minutes for any daemon with instance == 0 (until value > 0)
  useEffect(() => {
    const interval = setInterval(() => {
      // Build set of active notification daemonIds to avoid duplicates
      setNotifications(prev => {
        const activeIds = new Set(prev.filter(n => n.daemonId).map(n => n.daemonId));
        const additions = [];
                data.forEach(d => {
          const inst = Number(d.instance)||0;
      if (inst === 0) {
            const idStr = String(d.daemon_id);
            if (!activeIds.has(idStr)) {
              const id = Math.random().toString(36).slice(2);
        additions.push({ id, message: `${d.daemon_name} has 0 running instances (DOWN). Increase above 0 to stop alerts`, type:'warning', daemonId: idStr });
            }
          }
        });
        if (!additions.length) return prev;
        return [...prev, ...additions];
      });
    }, 120000); // 2 minutes
    return () => clearInterval(interval);
  }, [data]);

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
                  {/* Save Changes button removed */}
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
                    {filtered.map(d => (
                      <DaemonCard
                        key={d.daemon_id}
                        daemon={d}
                        query={query}
                        instanceEdits={instanceEdits}
                        setInstanceEdits={setInstanceEdits}
                        applyInstance={applyInstance}
                        toggleStatus={toggleStatus}
                      />
                    ))}
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
      <NotificationStack notifications={notifications} onClose={(id)=> setNotifications(ns => ns.filter(n => n.id !== id))} />
        </div>
    );
};

export default Search;
