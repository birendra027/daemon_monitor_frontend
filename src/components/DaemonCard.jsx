import React from 'react';

const highlightMatch = (text = '', query) => {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + query.length);
  const after = text.slice(idx + query.length);
  return (<>{before}<span className="bg-yellow-400/70 text-gray-900 font-semibold px-0.5 rounded">{match}</span>{after}</>);
};

const DaemonCard = ({ daemon, query, instanceEdits, setInstanceEdits, applyInstance, toggleStatus }) => {
  const up = daemon.daemon_status === 'UP';
  return (
    <div
      className="card-generic slider-card"
      style={{ borderColor: up ? 'var(--success)' : 'var(--danger)', scrollSnapAlign: 'start' }}
    >
      <h2 style={{ fontSize: 'clamp(.85rem, .8rem + .35vw, 1.05rem)', margin: '0 0 4px', wordBreak: 'break-word' }}>
        {highlightMatch(daemon.daemon_name, query)}
      </h2>
      <p style={{ margin: '0 0 4px', fontSize: '0.6rem', opacity: 0.75 }}>ID: {daemon.daemon_id}</p>
      <p style={{ margin: '0 0 6px', fontSize: '0.65rem' }}>Status: <span className={up ? 'badge-up' : 'badge-down'}>{daemon.daemon_status}</span></p>
      <p style={{ margin: '0 0 10px', fontSize: '0.65rem' }}>Instances: {daemon.instance}</p>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '10px' }}>
        <input
          type="number"
          min={0}
          value={instanceEdits[daemon.daemon_id] ?? ''}
          onChange={e => setInstanceEdits(prev => ({ ...prev, [daemon.daemon_id]: e.target.value }))}
          placeholder="Set"
          className="input-basic"
          style={{ width: '64px', padding: '4px 6px', fontSize: '0.6rem' }}
        />
        <button onClick={() => applyInstance(daemon)} className="accent-action" style={{ fontSize: '0.55rem', padding: '4px 8px' }}>Apply</button>
      </div>
      <button onClick={() => toggleStatus(daemon.daemon_id)} className="btn-small" style={{ fontSize: '0.55rem' }}>Toggle {up ? 'Down' : 'Up'}</button>
    </div>
  );
};

export default DaemonCard;
