import React, { useState } from 'react';

const fmtEur = (v) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(v || 0);

const fmtPct = (v) => v.toFixed(1).replace('.', ',') + '%';

// Painel "Resumo" com o detalhe do custo, preço de venda e configurações de preço.
// vazio: mostra emptyContent em vez dos valores; info/aviso: blocos opcionais no topo;
// subtotalMaterial: mostra a linha "Total material" (material + falhas + eletricidade + desgaste).
export default function ResumoPreco({ calc, settings, setSetting, vazio, emptyContent, info, aviso, subtotalMaterial }) {
  const [showSettings, setShowSettings] = useState(false);
  const { wastePct, vat, marginMode } = settings;

  const linha = ({ label, value }) => (
    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.55rem' }}>
      <span style={{ color: 'var(--text-muted)', fontSize: '0.87rem' }}>{label}</span>
      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{fmtEur(value)}</span>
    </div>
  );

  const settingsFields = [
    { key: 'wattage',      label: 'Potência (W)',                  step: '10'    },
    { key: 'kwh',          label: '€/kWh',                         step: '0.001' },
    { key: 'laborMinutes', label: 'Mão de obra (min/impressão)',   step: '5'     },
    { key: 'hourlyRate',   label: '€/hora',                        step: '0.5'   },
    { key: 'wearPerHour',  label: 'Desgaste da máquina (€/hora)',  step: '0.05'  },
    { key: 'packaging',    label: 'Embalagem (€/peça)',            step: '0.1'   },
    { key: 'wastePct',     label: 'Falhas / desperdício (%)',      step: '1'     },
    { key: 'margin',       label: marginMode === 'preco' ? 'Margem sobre o preço (%)' : 'Acréscimo sobre o custo (%)', step: '5' },
    { key: 'vat',          label: 'IVA (%)',                       step: '1'     },
  ];

  return (
    <div style={{ position: 'sticky', top: '2rem' }}>
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: '14px', padding: '1.5rem',
      }}>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 700, marginBottom: '1.25rem' }}>
          Resumo
        </div>

        {vazio ? emptyContent : (
          <>
            {info && (
              <div style={{ marginBottom: '1rem', padding: '0.6rem 0.85rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.25rem' }}>
                {info}
              </div>
            )}

            {aviso && (
              <div style={{ marginBottom: '1rem', padding: '0.6rem 0.85rem', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '8px', fontSize: '0.8rem', color: '#F59E0B' }}>
                {aviso}
              </div>
            )}

            {/* Breakdown */}
            {[
              { label: '🧵 Material',    value: calc.totalMaterial    },
              { label: `♻️ Falhas (${wastePct}%)`, value: calc.totalWaste },
              { label: '⚡ Eletricidade', value: calc.totalElectricity },
              { label: '🔧 Desgaste',    value: calc.totalWear        },
            ].map(linha)}

            {subtotalMaterial && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--card-border)', paddingTop: '0.55rem', marginBottom: '0.55rem' }}>
                <span style={{ fontSize: '0.87rem', fontWeight: 600 }}>Total material</span>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                  {fmtEur(calc.totalMaterial + calc.totalWaste + calc.totalElectricity + calc.totalWear)}
                </span>
              </div>
            )}

            {[
              { label: '🤝 Mão de obra', value: calc.totalLabor       },
              { label: '📦 Embalagem',   value: calc.totalPackaging   },
            ].map(linha)}

            <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '0.55rem', marginTop: '0.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.87rem' }}>Custo total</span>
                <span style={{ fontWeight: 700 }}>{fmtEur(calc.totalCost)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                <span style={{ color: '#10B981', fontSize: '0.87rem' }}>📈 Lucro</span>
                <span style={{ fontWeight: 600, color: '#10B981' }}>+ {fmtEur(calc.marginAmt)}</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
                {fmtPct(calc.realMarginPct)} do preço · {fmtPct(calc.markupPct)} sobre o custo
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.87rem' }}>Preço sem IVA</span>
                <span style={{ fontWeight: 700 }}>{fmtEur(calc.priceExVat)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.87rem' }}>🧾 IVA ({vat}%)</span>
                <span style={{ fontWeight: 600 }}>+ {fmtEur(calc.vatAmt)}</span>
              </div>
            </div>

            {/* Preço de venda */}
            <div style={{
              background: 'rgba(0,240,255,0.07)', border: '1px solid rgba(0,240,255,0.22)',
              borderRadius: '12px', padding: '1.1rem', textAlign: 'center', marginBottom: '0.75rem',
            }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.35rem' }}>
                Preço de venda (com IVA)
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1, letterSpacing: '-0.02em' }}>
                {fmtEur(calc.sellingPrice)}
              </div>
            </div>
          </>
        )}

        {/* Configurações */}
        <button
          onClick={() => setShowSettings(p => !p)}
          style={{
            width: '100%', padding: '0.5rem', background: 'transparent',
            border: '1px solid var(--card-border)', borderRadius: '8px',
            color: showSettings ? 'var(--primary)' : 'var(--text-muted)',
            fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit',
            transition: 'color 0.15s',
          }}>
          ⚙️ {showSettings ? 'Fechar configurações' : 'Configurações'}
        </button>

        {showSettings && (
          <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {settingsFields.map(({ key, label, step }) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', flex: 1 }}>{label}</span>
                <input
                  type="number" min="0" step={step} value={settings[key]}
                  onChange={e => setSetting(key, parseFloat(e.target.value) || 0)}
                  style={{ width: '70px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', borderRadius: '6px', padding: '0.4rem 0.5rem', color: 'var(--text-main)', fontFamily: 'var(--font-family)', fontSize: '0.85rem', outline: 'none', textAlign: 'center' }}
                />
              </div>
            ))}
            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.25rem' }}>
              {[['custo', 'Acréscimo sobre o custo'], ['preco', 'Margem sobre o preço']].map(([mode, label]) => (
                <button key={mode} onClick={() => setSetting('marginMode', mode)} style={{
                  flex: 1, padding: '0.4rem 0.3rem', borderRadius: '6px', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: '0.72rem',
                  background: marginMode === mode ? 'rgba(0,240,255,0.12)' : 'rgba(255,255,255,0.04)',
                  border: marginMode === mode ? '1px solid rgba(0,240,255,0.3)' : '1px solid var(--card-border)',
                  color: marginMode === mode ? 'var(--primary)' : 'var(--text-muted)',
                }}>{label}</button>
              ))}
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem', marginBottom: 0 }}>
              Partilhado entre o Orçamento de venda e a Estimativa de custo.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
