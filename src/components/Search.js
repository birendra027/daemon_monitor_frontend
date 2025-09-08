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
            </main>
        </div>
    );
};

export default Search;
