import React, { useState, useEffect, useRef } from 'react';

const toRaw = (v) => Math.round((parseFloat(String(v).replace(',', '.')) || 0) * 100);

const MaskedNumberInput = ({ value, onChange, prefix, className, style }) => {
  const [raw, setRaw] = useState(() => toRaw(value));
  const lastExternal = useRef(value);

  useEffect(() => {
    if (value !== lastExternal.current) {
      lastExternal.current = value;
      setRaw(toRaw(value));
    }
  }, [value]);

  const display = (raw / 100).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const commit = (newRaw) => {
    const newValue = newRaw / 100;
    lastExternal.current = newValue;
    setRaw(newRaw);
    onChange(newValue);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      commit(Math.floor(raw / 10));
    } else if (/^\d$/.test(e.key)) {
      e.preventDefault();
      commit(raw * 10 + parseInt(e.key));
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      {prefix && (
        <span style={{
          position: 'absolute', left: '1rem', top: '50%',
          transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none'
        }}>{prefix}</span>
      )}
      <input
        type="text"
        className={className}
        style={{ paddingLeft: prefix ? '2rem' : undefined, ...style }}
        value={display}
        onChange={() => {}}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
};

export default MaskedNumberInput;
