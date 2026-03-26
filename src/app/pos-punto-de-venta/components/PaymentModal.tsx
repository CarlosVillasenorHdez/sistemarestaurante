'use client';

import React, { useState } from 'react';
import { X, CreditCard, Banknote, Check, Printer, Receipt } from 'lucide-react';

interface PaymentModalProps {
  total: number;
  onClose: () => void;
  onComplete: (method: 'efectivo' | 'tarjeta', amountPaid: number) => void;
}

export default function PaymentModal({ total, onClose, onComplete }: PaymentModalProps) {
  const [method, setMethod] = useState<'efectivo' | 'tarjeta'>('efectivo');
  const [cashInput, setCashInput] = useState('');
  const [loading, setLoading] = useState(false);

  const cashAmount = parseFloat(cashInput) || 0;
  const change = method === 'efectivo' ? cashAmount - total : 0;

  const handleConfirm = async () => {
    if (method === 'efectivo' && cashAmount < total) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    onComplete(method, method === 'efectivo' ? cashAmount : total);
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
      <div className="modal-content max-w-lg" style={{ maxWidth: '520px' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b rounded-t-2xl" style={{ borderColor: '#f3f4f6', backgroundColor: '#1B3A6B' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(245,158,11,0.2)' }}>
              <Receipt size={18} style={{ color: '#f59e0b' }} />
            </div>
            <div>
              <h2 className="font-bold text-white text-base">Procesar Pago</h2>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{orderDate} · {orderTime}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg transition-colors" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Total */}
          <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Total a cobrar</p>
            <p className="font-mono font-bold text-3xl" style={{ color: '#1B3A6B' }}>${total.toFixed(2)}</p>
          </div>

          {/* Payment method */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Método de Pago</p>
            <div className="grid grid-cols-2 gap-3">
              {(['efectivo', 'tarjeta'] as const).map((m) => (
                <button key={m} onClick={() => setMethod(m)} className="flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-150" style={{ borderColor: method === m ? '#f59e0b' : '#e5e7eb', backgroundColor: method === m ? '#fffbeb' : 'white' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: method === m ? '#f59e0b' : '#f3f4f6' }}>
                    {m === 'efectivo' ? <Banknote size={20} style={{ color: method === m ? '#1B3A6B' : '#9ca3af' }} /> : <CreditCard size={20} style={{ color: method === m ? '#1B3A6B' : '#9ca3af' }} />}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold capitalize" style={{ color: method === m ? '#92400e' : '#374151' }}>{m === 'efectivo' ? 'Efectivo' : 'Tarjeta'}</p>
                    <p className="text-xs text-gray-400">{m === 'efectivo' ? 'Pago en mano' : 'Débito / Crédito'}</p>
                  </div>
                  {method === m && (
                    <div className="ml-auto w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: '#f59e0b' }}>
                      <Check size={11} style={{ color: '#1B3A6B' }} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Cash input */}
          {method === 'efectivo' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Efectivo recibido</label>
              <input type="number" placeholder={`Mínimo $${total.toFixed(2)}`} value={cashInput} onChange={(e) => setCashInput(e.target.value)} className="input-field text-lg font-mono font-bold text-center py-3" min={total} />
              <div className="flex gap-2 mt-2">
                {quickAmounts.map((amt) => (
                  <button key={amt} onClick={() => setCashInput(String(amt))} className="flex-1 py-2 rounded-lg text-xs font-semibold transition-colors" style={{ backgroundColor: cashInput === String(amt) ? '#fef3c7' : '#f3f4f6', color: cashInput === String(amt) ? '#92400e' : '#6b7280' }}>
                    ${amt}
                  </button>
                ))}
              </div>
              {cashAmount >= total && (
                <div className="mt-3 px-4 py-3 rounded-xl flex items-center justify-between" style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac' }}>
                  <span className="text-sm font-semibold text-green-700">Cambio a devolver</span>
                  <span className="font-mono font-bold text-green-700 text-lg">${change.toFixed(2)}</span>
                </div>
              )}
              {cashInput && cashAmount < total && (
                <div className="mt-3 px-4 py-2.5 rounded-xl flex items-center gap-2" style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5' }}>
                  <span className="text-xs text-red-600">Faltan ${(total - cashAmount).toFixed(2)} para completar el pago</span>
                </div>
              )}
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
            disabled={loading || (method === 'efectivo' && cashAmount < total)}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Check size={16} />
            )}
            {loading ? 'Procesando...' : 'Confirmar Pago'}
          </button>
        </div>
      </div>
    </div>
  );
}