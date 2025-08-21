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

const Search = () => {
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
        <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
            <header className="bg-sky-900/90 backdrop-blur border-b border-sky-800 sticky top-0 z-10 shadow">
                <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col sm:flex-row gap-3 sm:items-center">
                    <div className="relative w-full sm:w-96">
                        <input
                            type="text"
                            className="w-full bg-gray-800/60 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 px-4 py-2 text-sm placeholder-gray-400"
                            placeholder="Search daemon name..."
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            aria-label="Search daemons"
                            autoComplete="off"
                        />
                        {query && suggestions.length > 0 && (
                            <ul className="absolute left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-56 overflow-auto text-sm">
                                {suggestions.map(s => (
                                    <li key={s.daemon_id} className="px-3 py-2 hover:bg-gray-700 cursor-pointer flex justify-between"
                                            onClick={() => { setQuery(s.daemon_name); }}>
                                        <span>{highlightMatch(s.daemon_name, query)}</span>
                                        <span className={s.daemon_status === 'UP' ? 'text-lime-300 text-xs' : 'text-red-300 text-xs'}>{s.daemon_status}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    {hasChanges && (
                        <button onClick={save} className="self-start sm:self-auto bg-indigo-600 hover:bg-indigo-500 transition-colors text-white text-sm font-medium px-4 py-2 rounded-lg shadow">Save Changes</button>
                    )}
                </div>
            </header>
            <main className="max-w-6xl mx-auto px-4 py-10">
                {loading && <p className="text-center text-sm opacity-80">Loading data...</p>}
                {error && <p className="text-center text-sm text-red-400">{error}</p>}
                {!loading && !error && filtered.length === 0 && <p className="text-center text-sm opacity-70">No daemons match your search.</p>}
                <div className="grid gap-5 mt-6 sm:grid-cols-2 lg:grid-cols-3">
                    {filtered.map(d => {
                        const up = d.daemon_status === 'UP';
                        return (
                            <div key={d.daemon_id} className={`relative rounded-xl p-5 border transition-colors duration-200 ${up ? 'border-lime-400/40 bg-lime-600/20' : 'border-red-400/40 bg-red-600/20'} shadow hover:shadow-lg`}>
                                <h2 className="text-lg font-semibold mb-1 break-all">{highlightMatch(d.daemon_name, query)}</h2>
                                <p className="text-xs mb-1 opacity-80">ID: {d.daemon_id}</p>
                                <p className="text-xs mb-2">Status: <span className={up ? 'text-lime-300 font-medium' : 'text-red-300 font-medium'}>{d.daemon_status}</span></p>
                                <p className="text-xs mb-3">Instances: {d.instance}</p>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        value={instanceEdits[d.daemon_id] ?? ''}
                                                        onChange={e => setInstanceEdits(prev => ({ ...prev, [d.daemon_id]: e.target.value }))}
                                                        placeholder="Set"
                                                        className="w-20 bg-gray-800/70 border border-gray-700 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                                                    />
                                                    <button onClick={() => applyInstance(d)} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1 rounded shadow">Apply</button>
                                                </div>
                                <button onClick={() => toggleStatus(d.daemon_id)} className="bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium px-3 py-1 rounded">Toggle {up ? 'Down' : 'Up'}</button>
                            </div>
                        );
                    })}
                </div>
            </main>
        </div>
    );
};

export default Search;
