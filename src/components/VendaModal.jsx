import { useState } from 'react';
import MaskedNumberInput from './MaskedNumberInput';
import { saveSale } from '../services/storage';

const fmtEur = (v) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(v || 0);

const hoje = () => new Date().toISOString().split('T')[0];
const arred = (v) => Math.round((Number(v) || 0) * 100) / 100;

// Modal para registrar ou editar uma venda.
// venda: venda existente (edição) ou dados iniciais vindos do Orçamento
export default function VendaModal({ venda, onClose, onSaved }) {
  const editando = Boolean(venda?.id);
  const [form, setForm] = useState({
    date:        (venda?.date || hoje()).split('T')[0],
    client:      venda?.client || '',
    description: venda?.description || '',
    costTotal:   arred(venda?.costTotal),
    finalPrice:  arred(venda?.finalPrice ?? venda?.suggestedPrice),
    vatPct:      venda?.vatPct ?? 21,
    notes:       venda?.notes || '',
  });
  const [erro, setErro] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const semIva = (Number(form.finalPrice) || 0) / (1 + (Number(form.vatPct) || 0) / 100);
  const lucro  = semIva - (Number(form.costTotal) || 0);
  const temImpressoes = (venda?.printIds || []).length > 0;

  const salvar = (e) => {
    e.preventDefault();
    if (!form.description.trim()) { setErro('Informe a descrição da venda.'); return; }
    if (!(Number(form.finalPrice) > 0)) { setErro('Informe o preço final cobrado.'); return; }
    saveSale({
      ...venda,
      ...form,
      description: form.description.trim(),
      client:      form.client.trim(),
      costTotal:   Number(form.costTotal) || 0,
      finalPrice:  Number(form.finalPrice) || 0,
      vatPct:      Number(form.vatPct) || 0,
      printIds:    venda?.printIds || [],
    });
    onSaved();
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content glass-panel" style={{ padding: '2rem', background: '#151B2D' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.3rem' }}>{editando ? 'Editar Venda' : 'Registrar Venda'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.4rem', cursor: 'pointer' }}>✕</button>
        </div>

        <form onSubmit={salvar}>
          <div className="grid-2" style={{ gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Data da venda</label>
              <input type="date" className="form-input" value={form.date} onChange={e => set('date', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Cliente (opcional)</label>
              <input className="form-input" value={form.client} placeholder="Ex: Maria, loja Popzu..." onChange={e => set('client', e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Descrição *</label>
            <input className="form-input" value={form.description} placeholder="Ex: Hermione Knitted" onChange={e => set('description', e.target.value)} />
            {temImpressoes && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                Ligada a {venda.printIds.length} placa{venda.printIds.length !== 1 ? 's' : ''} da aba Impressões.
              </div>
            )}
          </div>

          <div className="grid-2" style={{ gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Custo total</label>
              <MaskedNumberInput className="form-input" prefix="€" value={form.costTotal} onChange={v => set('costTotal', v)} />
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                {temImpressoes ? 'Calculado no Orçamento. Pode ajustar.' : 'Material, energia, mão de obra etc.'}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Preço final cobrado (com IVA) *</label>
              <MaskedNumberInput className="form-input" prefix="€" value={form.finalPrice} onChange={v => set('finalPrice', v)} />
              {venda?.suggestedPrice > 0 && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  Sugerido pelo Orçamento: {fmtEur(venda.suggestedPrice)}
                </div>
              )}
            </div>
          </div>

          <div className="grid-2" style={{ gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">IVA (%)</label>
              <input type="number" min="0" step="1" className="form-input" value={form.vatPct} onChange={e => set('vatPct', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Observações</label>
              <input className="form-input" value={form.notes} placeholder="Ex: entregue em mãos" onChange={e => set('notes', e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.9rem 1rem', borderRadius: '10px', background: lucro >= 0 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${lucro >= 0 ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.3)'}`, marginBottom: '1.25rem', fontSize: '0.9rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Sem IVA: <strong style={{ color: 'var(--text-main)' }}>{fmtEur(semIva)}</strong></span>
            <span style={{ color: lucro >= 0 ? '#10B981' : '#F87171', fontWeight: 700 }}>
              {lucro >= 0 ? 'Lucro' : 'Prejuízo'}: {fmtEur(Math.abs(lucro))}
            </span>
          </div>

          {erro && <div style={{ color: '#F87171', fontSize: '0.85rem', marginBottom: '1rem' }}>{erro}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary">{editando ? 'Salvar Alterações' : 'Registrar Venda'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
