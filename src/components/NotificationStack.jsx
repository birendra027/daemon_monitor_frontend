import React from 'react';

const NotificationStack = ({ notifications, onClose }) => (
  <div className="notify-stack" aria-live="polite" aria-atomic="true">
    {notifications.map(n => (
      <div key={n.id} className={`notify-item ${n.type}`} role="alert">
        <div className="notify-content">{n.message}</div>
        <button
          className="notify-close"
          aria-label="Dismiss notification"
          onClick={() => onClose(n.id)}
        >×</button>
      </div>
    ))}
  </div>
);

export default NotificationStack;
