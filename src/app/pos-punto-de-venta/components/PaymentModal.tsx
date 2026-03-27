'use client';

import React, { useState } from 'react';
import { X, CreditCard, Banknote, Check, Printer, Receipt, Split } from 'lucide-react';

interface PaymentModalProps {
  total: number;
  onClose: () => void;
  onComplete: (method: 'efectivo' | 'tarjeta', amountPaid: number) => void;
}

interface SplitPart {
  amount: string;
  method: 'efectivo' | 'tarjeta';
}

export default function PaymentModal({ total, onClose, onComplete }: PaymentModalProps) {
  const [mode, setMode] = useState<'single' | 'split'>('single');
  const [method, setMethod] = useState<'efectivo' | 'tarjeta'>('efectivo');
  const [cashInput, setCashInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Split mode
  const [parts, setParts] = useState<SplitPart[]>([
    { amount: '', method: 'efectivo' },
    { amount: '', method: 'efectivo' },
  ]);

  const cashAmount = parseFloat(cashInput) || 0;
  const change = method === 'efectivo' ? cashAmount - total : 0;

  const splitTotal = parts.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const splitRemaining = total - splitTotal;
  const splitValid = Math.abs(splitRemaining) < 0.01 &&
    parts.every(p => parseFloat(p.amount) > 0);

  const updatePart = (i: number, key: keyof SplitPart, val: string) => {
    setParts(prev => prev.map((p, idx) => idx === i ? { ...p, [key]: val } : p));
  };

  const handleConfirm = async () => {
    if (mode === 'single') {
      if (method === 'efectivo' && cashAmount < total) return;
      setLoading(true);
      await new Promise(r => setTimeout(r, 600));
      setLoading(false);
      onComplete(method, method === 'efectivo' ? cashAmount : total);
    } else {
      if (!splitValid) return;
      setLoading(true);
      await new Promise(r => setTimeout(r, 600));
      setLoading(false);
      // Use the first part's method as primary; caller closes the order
      onComplete(parts[0].method, total);
    }
  };

  const quickAmounts = [
    Math.ceil(total / 100) * 100,
    Math.ceil(total / 50) * 50,
    Math.ceil(total / 200) * 200,
    Math.ceil(total / 500) * 500,
  ].filter((v, i, arr) => arr.indexOf(v) === i && v >= total).slice(0, 4);

  const now = new Date();
  const orderDate = now.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const orderTime = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-lg" style={{ maxWidth: '540px' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b rounded-t-2xl"
          style={{ borderColor: '#f3f4f6', backgroundColor: '#1B3A6B' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'rgba(245,158,11,0.2)' }}>
              <Receipt size={18} style={{ color: '#f59e0b' }} />
            </div>
            <div>
              <h2 className="font-bold text-white text-base">Procesar Pago</h2>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{orderDate} · {orderTime}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Total */}
          <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Total a cobrar</p>
            <p className="font-mono font-bold text-3xl" style={{ color: '#1B3A6B' }}>${total.toFixed(2)}</p>
          </div>

          {/* Mode toggle */}
          <div className="flex gap-2">
            <button onClick={() => setMode('single')}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold border-2 transition-all"
              style={{ borderColor: mode === 'single' ? '#f59e0b' : '#e5e7eb', backgroundColor: mode === 'single' ? '#fffbeb' : 'white', color: mode === 'single' ? '#92400e' : '#6b7280' }}>
              <Banknote size={15} /> Pago completo
            </button>
            <button onClick={() => setMode('split')}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold border-2 transition-all"
              style={{ borderColor: mode === 'split' ? '#f59e0b' : '#e5e7eb', backgroundColor: mode === 'split' ? '#fffbeb' : 'white', color: mode === 'split' ? '#92400e' : '#6b7280' }}>
              <Split size={15} /> Dividir cuenta
            </button>
          </div>

          {/* ── Single payment ── */}
          {mode === 'single' && (
            <>
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Método de Pago</p>
                <div className="grid grid-cols-2 gap-3">
                  {(['efectivo', 'tarjeta'] as const).map((m) => (
                    <button key={m} onClick={() => setMethod(m)}
                      className="flex items-center gap-3 p-4 rounded-xl border-2 transition-all"
                      style={{ borderColor: method === m ? '#f59e0b' : '#e5e7eb', backgroundColor: method === m ? '#fffbeb' : 'white' }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: method === m ? '#f59e0b' : '#f3f4f6' }}>
                        {m === 'efectivo'
                          ? <Banknote size={20} style={{ color: method === m ? '#1B3A6B' : '#9ca3af' }} />
                          : <CreditCard size={20} style={{ color: method === m ? '#1B3A6B' : '#9ca3af' }} />}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold" style={{ color: method === m ? '#92400e' : '#374151' }}>
                          {m === 'efectivo' ? 'Efectivo' : 'Tarjeta'}
                        </p>
                        <p className="text-xs text-gray-400">{m === 'efectivo' ? 'Pago en mano' : 'Débito / Crédito'}</p>
                      </div>
                      {method === m && (
                        <div className="ml-auto w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: '#f59e0b' }}>
                          <Check size={11} style={{ color: '#1B3A6B' }} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {method === 'efectivo' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Efectivo recibido</label>
                  <input type="number" placeholder={`Mínimo $${total.toFixed(2)}`}
                    value={cashInput} onChange={(e) => setCashInput(e.target.value)}
                    className="input-field text-lg font-mono font-bold text-center py-3" min={total} />
                  <div className="flex gap-2 mt-2">
                    {quickAmounts.map((amt) => (
                      <button key={amt} onClick={() => setCashInput(String(amt))}
                        className="flex-1 py-2 rounded-lg text-xs font-semibold transition-colors"
                        style={{ backgroundColor: cashInput === String(amt) ? '#fef3c7' : '#f3f4f6', color: cashInput === String(amt) ? '#92400e' : '#6b7280' }}>
                        ${amt}
                      </button>
                    ))}
                  </div>
                  {cashAmount >= total && (
                    <div className="mt-3 px-4 py-3 rounded-xl flex items-center justify-between"
                      style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac' }}>
                      <span className="text-sm font-semibold text-green-700">Cambio a devolver</span>
                      <span className="font-mono font-bold text-green-700 text-lg">${change.toFixed(2)}</span>
                    </div>
                  )}
                  {cashInput && cashAmount < total && (
                    <div className="mt-3 px-4 py-2.5 rounded-xl flex items-center gap-2"
                      style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5' }}>
                      <span className="text-xs text-red-600">Faltan ${(total - cashAmount).toFixed(2)} para completar el pago</span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── Split payment ── */}
          {mode === 'split' && (
            <div className="space-y-3">
              {parts.map((part, i) => (
                <div key={i} className="p-3 rounded-xl border" style={{ borderColor: '#e5e7eb', backgroundColor: '#f9fafb' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-gray-500">Persona {i + 1}</span>
                    {parts.length > 2 && (
                      <button onClick={() => setParts(prev => prev.filter((_, idx) => idx !== i))}
                        className="ml-auto text-xs text-red-400 hover:text-red-600">Quitar</button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input type="number" placeholder="$0.00" value={part.amount}
                      onChange={e => updatePart(i, 'amount', e.target.value)}
                      className="input-field flex-1 font-mono font-bold text-sm py-2" min={0} />
                    <div className="flex gap-1">
                      {(['efectivo', 'tarjeta'] as const).map(m => (
                        <button key={m} onClick={() => updatePart(i, 'method', m)}
                          className="w-9 h-9 rounded-lg flex items-center justify-center border-2 transition-all"
                          style={{ borderColor: part.method === m ? '#f59e0b' : '#e5e7eb', backgroundColor: part.method === m ? '#fffbeb' : 'white' }}
                          title={m === 'efectivo' ? 'Efectivo' : 'Tarjeta'}>
                          {m === 'efectivo'
                            ? <Banknote size={14} style={{ color: part.method === m ? '#d97706' : '#9ca3af' }} />
                            : <CreditCard size={14} style={{ color: part.method === m ? '#d97706' : '#9ca3af' }} />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              <button onClick={() => setParts(prev => [...prev, { amount: '', method: 'efectivo' }])}
                className="w-full py-2 rounded-xl text-xs font-semibold border-2 border-dashed transition-all"
                style={{ borderColor: '#d1d5db', color: '#6b7280' }}>
                + Agregar persona
              </button>

              {/* Split summary */}
              <div className="flex items-center justify-between px-3 py-2 rounded-xl"
                style={{ backgroundColor: splitRemaining === 0 ? '#f0fdf4' : splitRemaining < 0 ? '#fef2f2' : '#fefce8', border: `1px solid ${splitRemaining === 0 ? '#86efac' : splitRemaining < 0 ? '#fca5a5' : '#fde68a'}` }}>
                <span className="text-xs font-semibold" style={{ color: splitRemaining === 0 ? '#15803d' : splitRemaining < 0 ? '#dc2626' : '#92400e' }}>
                  {splitRemaining === 0 ? '✓ Total cubierto' : splitRemaining > 0 ? `Falta $${splitRemaining.toFixed(2)}` : `Excede $${Math.abs(splitRemaining).toFixed(2)}`}
                </span>
                <span className="font-mono text-xs font-bold" style={{ color: '#1B3A6B' }}>
                  ${splitTotal.toFixed(2)} / ${total.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 border-t" style={{ borderColor: '#f3f4f6' }}>
          <button className="btn-secondary flex items-center gap-2 text-xs">
            <Printer size={14} />
            Imprimir ticket
          </button>
          <div className="flex-1" />
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button
            onClick={handleConfirm}
            disabled={loading || (mode === 'single' && method === 'efectivo' && cashAmount < total) || (mode === 'split' && !splitValid)}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            {loading
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Check size={16} />}
            {loading ? 'Procesando...' : 'Confirmar Pago'}
          </button>
        </div>
      </div>
    </div>
  );
}