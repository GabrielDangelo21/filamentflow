import React, { useState, useEffect, useRef } from 'react';

const CustomSelect = ({ value, onChange, options, fullWidth = false }) => {
  const [open,        setOpen]        = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const containerRef = useRef(null);
  const listRef      = useRef(null);
  const btnRef       = useRef(null);

  const selected = options.find(o => o.value === value) || options[0];

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Scroll highlighted option into view
  useEffect(() => {
    if (!open || highlighted < 0 || !listRef.current) return;
    const item = listRef.current.children[highlighted];
    item?.scrollIntoView({ block: 'nearest' });
  }, [highlighted, open]);

  const openWithHighlight = () => {
    const idx = options.findIndex(o => o.value === value);
    setHighlighted(idx >= 0 ? idx : 0);
    setOpen(true);
  };

  const select = (val) => {
    onChange(val);
    setOpen(false);
    setHighlighted(-1);
    btnRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        openWithHighlight();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(h => Math.min(h + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (highlighted >= 0 && highlighted < options.length) {
        select(options[highlighted].value);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      btnRef.current?.focus();
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', userSelect: 'none', width: fullWidth ? '100%' : undefined }}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => open ? setOpen(false) : openWithHighlight()}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          width: fullWidth ? '100%' : undefined,
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: '8px',
          padding: '0.5rem 0.85rem',
          color: 'var(--text)',
          fontSize: '0.85rem',
          fontFamily: 'var(--font-family)',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          textAlign: 'left',
          outline: 'none',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,240,255,0.5)'; }}
        onBlur={e  => { e.currentTarget.style.borderColor = 'var(--card-border)'; if (!open) return; }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{selected?.label}</span>
        <span style={{
          fontSize: '0.65rem', color: 'var(--text-muted)', flexShrink: 0,
          transition: 'transform 0.15s',
          transform: open ? 'rotate(180deg)' : 'rotate(0)',
        }}>▾</span>
      </button>

      {open && (
        <div
          ref={listRef}
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            zIndex: 200,
            background: '#1a1f2e',
            border: '1px solid var(--card-border)',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            minWidth: '100%',
            maxHeight: '280px',
            overflowY: 'auto',
          }}
        >
          {options.map((opt, i) => {
            const isSelected = opt.value === value;
            const isHigh     = i === highlighted;
            return (
              <div
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => select(opt.value)}
                onMouseEnter={() => setHighlighted(i)}
                style={{
                  padding: '0.55rem 1rem',
                  fontSize: '0.85rem',
                  color: isSelected ? 'var(--primary)' : 'var(--text)',
                  background: isHigh
                    ? 'rgba(0,240,255,0.12)'
                    : isSelected
                      ? 'rgba(0,240,255,0.08)'
                      : 'transparent',
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                {isSelected && (
                  <span style={{ fontSize: '0.6rem', color: 'var(--primary)', flexShrink: 0 }}>✓</span>
                )}
                {opt.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
