'use client';

import React, { useState } from 'react';
import { Minus, Plus, Trash2, ShoppingCart, Tag, ChevronDown, Send, Printer, MessageSquare } from 'lucide-react';
import { Table, OrderItem } from './POSClient';

interface OrderPanelProps {
  selectedTable: Table | null;
  mergeGroupLabel?: string | null;
  orderItems: OrderItem[];
  onUpdateQty: (itemId: string, delta: number) => void;
  onRemoveItem: (itemId: string) => void;
  subtotal: number;
  discountAmount: number;
  iva: number;
  total: number;
  discount: { type: 'pct' | 'fixed'; value: number };
  onDiscountChange: (d: { type: 'pct' | 'fixed'; value: number }) => void;
  onCheckout: () => void;
  onSendToKitchen: () => void;
  onShowMenu: () => void;
  onUpdateNote: (itemId: string, note: string) => void;
  kitchenSent: boolean;
  sendingToKitchen: boolean;
  onSendKitchenNote?: (note: string) => void;
}

export default function OrderPanel({
  selectedTable,
  mergeGroupLabel,
  orderItems,
  onUpdateQty,
  onRemoveItem,
  subtotal,
  discountAmount,
  iva,
  total,
  discount,
  onDiscountChange,
  onCheckout,
  onSendToKitchen,
  onShowMenu,
  onUpdateNote,
  kitchenSent,
  sendingToKitchen,
  onSendKitchenNote,
}: OrderPanelProps) {
  const [showDiscount, setShowDiscount] = useState(false);
  const [discountInput, setDiscountInput] = useState('');
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [showKitchenNote, setShowKitchenNote] = useState(false);
  const [kitchenNoteText, setKitchenNoteText] = useState('');

  const tableLabel = mergeGroupLabel ?? (selectedTable ? selectedTable.name : 'Sin mesa');
  // Real piece count (not distinct dishes)
  const totalPieces = orderItems.reduce((s, i) => s + i.quantity, 0);

  const applyDiscount = () => {
    const val = parseFloat(discountInput);
    if (!isNaN(val) && val >= 0) {
      onDiscountChange({ type: discount.type, value: val });
    }
  };

  return (
    <div
      className="w-80 xl:w-96 flex-shrink-0 flex flex-col bg-white border-l"
      style={{ borderColor: '#e5e7eb' }}
    >
      {/* Header */}
      <div
        className="px-4 py-3.5 border-b flex items-center justify-between flex-shrink-0"
        style={{ borderColor: '#f3f4f6', backgroundColor: '#1B3A6B' }}
      >
        <div className="flex items-center gap-2">
          <ShoppingCart size={16} style={{ color: '#f59e0b' }} />
          <span className="font-700 text-white text-sm" style={{ fontWeight: 700 }}>
            {tableLabel}
          </span>
          {mergeGroupLabel && (
            <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold" style={{ backgroundColor: 'rgba(168,85,247,0.25)', color: '#c4b5fd' }}>
              Unidas
            </span>
          )}
        </div>
        {selectedTable && (
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
              {totalPieces} {totalPieces === 1 ? 'pieza' : 'piezas'}
            </span>
            {kitchenSent && (
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: 'rgba(34,197,94,0.2)', color: '#4ade80' }}>
                En cocina
              </span>
            )}
          </div>
        )}
      </div>

      {/* Order items */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {!selectedTable ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ backgroundColor: '#f3f4f6' }}
            >
              <ShoppingCart size={28} className="text-gray-300" />
            </div>
            <p className="text-sm font-600 text-gray-600 mb-1" style={{ fontWeight: 600 }}>
              Sin mesa seleccionada
            </p>
            <p className="text-xs text-gray-400 leading-relaxed">
              Selecciona una mesa del mapa para comenzar a registrar una orden
            </p>
          </div>
        ) : orderItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ backgroundColor: '#fffbeb' }}
            >
              <ShoppingCart size={28} style={{ color: '#f59e0b' }} />
            </div>
            <p className="text-sm font-600 text-gray-700 mb-1" style={{ fontWeight: 600 }}>
              Orden vacía
            </p>
            <p className="text-xs text-gray-400 mb-4 leading-relaxed">
              Agrega platillos desde el menú para {selectedTable.name}
            </p>
            <button onClick={onShowMenu} className="btn-primary text-xs py-2 px-4">
              Ver Menú
            </button>
          </div>
        ) : (
          <div>
            {orderItems.map((item) => (
              <div key={item.menuItem.id} className="border-b border-gray-50 last:border-0">
                <div className="px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors">
                  <span className="text-xl flex-shrink-0 mt-0.5">{item.menuItem.emoji}</span>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-600 text-gray-800 leading-tight truncate" style={{ fontWeight: 600 }}>
                      {item.menuItem.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 font-mono">
                      ${item.menuItem.price.toFixed(2)} c/u
                    </p>

                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => onUpdateQty(item.menuItem.id, -1)}
                        className="w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-100 active:scale-95"
                        style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}
                      >
                        <Minus size={10} />
                      </button>
                      <span className="font-mono font-700 text-sm w-5 text-center" style={{ fontWeight: 700 }}>
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQty(item.menuItem.id, 1)}
                        className="w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-100 active:scale-95"
                        style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}
                      >
                        <Plus size={10} />
                      </button>
                      <button
                        onClick={() => setExpandedNoteId(expandedNoteId === item.menuItem.id ? null : item.menuItem.id)}
                        className="ml-auto w-6 h-6 rounded-lg flex items-center justify-center transition-all"
                        style={{ backgroundColor: item.notes ? 'rgba(245,158,11,0.15)' : '#f3f4f6', color: item.notes ? '#d97706' : '#9ca3af' }}
                        title="Nota para cocina"
                      >
                        <MessageSquare size={10} />
                      </button>
                    </div>
                    {item.notes && expandedNoteId !== item.menuItem.id && (
                      <p className="text-xs mt-1 italic truncate" style={{ color: '#d97706' }}>
                        📝 {item.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span className="font-mono font-700 text-sm text-gray-900" style={{ fontWeight: 700 }}>
                      ${(item.menuItem.price * item.quantity).toFixed(2)}
                    </span>
                    <button
                      onClick={() => onRemoveItem(item.menuItem.id)}
                      className="p-1 rounded hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={12} className="text-gray-300 hover:text-red-400" />
                    </button>
                  </div>
                </div>

                {expandedNoteId === item.menuItem.id && (
                  <div className="px-4 pb-3">
                    <input
                      type="text"
                      value={item.notes ?? ''}
                      onChange={(e) => onUpdateNote(item.menuItem.id, e.target.value)}
                      placeholder="Sin cebolla, término medio, extra salsa..."
                      className="w-full px-3 py-1.5 text-xs rounded-lg border outline-none"
                      style={{ borderColor: '#fde68a', backgroundColor: '#fffbeb', color: '#92400e' }}
                      autoFocus
                      onBlur={() => setExpandedNoteId(null)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setExpandedNoteId(null); }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Totals + Actions */}
      {orderItems.length > 0 && selectedTable && (
        <div className="flex-shrink-0 border-t" style={{ borderColor: '#e5e7eb' }}>
          {/* Discount toggle */}
          <div className="px-4 pt-3">
            <button
              onClick={() => setShowDiscount(!showDiscount)}
              className="flex items-center gap-2 text-xs font-600 text-gray-500 hover:text-gray-700 transition-colors"
              style={{ fontWeight: 600 }}
            >
              <Tag size={12} />
              Aplicar descuento
              <ChevronDown
                size={12}
                className="transition-transform duration-150"
                style={{ transform: showDiscount ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </button>

            {showDiscount && (
              <div className="mt-2 flex items-center gap-2 animate-fade-in">
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                  {(['pct', 'fixed'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => onDiscountChange({ type: t, value: discount.value })}
                      className="px-2 py-1 rounded-md text-xs font-600 transition-all"
                      style={{
                        fontWeight: 600,
                        backgroundColor: discount.type === t ? 'white' : 'transparent',
                        color: discount.type === t ? '#1B3A6B' : '#6b7280',
                        boxShadow: discount.type === t ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                      }}
                    >
                      {t === 'pct' ? '%' : '$'}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  placeholder={discount.type === 'pct' ? '0–100' : '0.00'}
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value)}
                  onBlur={applyDiscount}
                  className="input-field py-1.5 text-sm w-20 text-center"
                  min={0}
                  max={discount.type === 'pct' ? 100 : undefined}
                />
                <button
                  onClick={applyDiscount}
                  className="text-xs px-3 py-1.5 rounded-lg font-600 transition-colors"
                  style={{ backgroundColor: '#f3f4f6', color: '#374151', fontWeight: 600 }}
                >
                  Aplicar
                </button>
              </div>
            )}
          </div>

          {/* Totals breakdown */}
          <div className="px-4 py-3 space-y-1.5">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span>
              <span className="font-mono">${subtotal.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm" style={{ color: '#16a34a' }}>
                <span>Descuento ({discount.type === 'pct' ? `${discount.value}%` : 'fijo'})</span>
                <span className="font-mono">−${discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-gray-500">
              <span>IVA (16%)</span>
              <span className="font-mono">${iva.toFixed(2)}</span>
            </div>
            <div
              className="flex justify-between text-base font-700 pt-1.5 border-t"
              style={{ borderColor: '#e5e7eb', fontWeight: 700 }}
            >
              <span className="text-gray-900">Total</span>
              <span className="font-mono text-lg" style={{ color: '#1B3A6B' }}>
                ${total.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="px-4 pb-4 flex flex-col gap-2">
            {/* Enviar a cocina — only show if not yet sent, or show re-send if already sent */}
            {!kitchenSent ? (
              <button
                onClick={onSendToKitchen}
                disabled={sendingToKitchen || orderItems.length === 0 || !selectedTable.currentOrderId}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                style={{ backgroundColor: '#059669', color: 'white' }}
              >
                <Send size={15} />
                {sendingToKitchen ? 'Enviando...' : 'Enviar a Cocina'}
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={onSendToKitchen}
                  disabled={sendingToKitchen}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                  style={{ backgroundColor: 'rgba(5,150,105,0.1)', color: '#059669', border: '1px solid rgba(5,150,105,0.25)' }}
                >
                  <Send size={12} />
                  {sendingToKitchen ? 'Enviando...' : 'Enviar comanda'}
                </button>
                {onSendKitchenNote && (
                  <button
                    onClick={() => setShowKitchenNote(true)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                    style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: '#d97706', border: '1px solid rgba(245,158,11,0.25)' }}
                    title="Enviar nota urgente a cocina"
                  >
                    <MessageSquare size={13} /> Nota
                  </button>
                )}
              </div>
            )}

            <button
              onClick={onCheckout}
              disabled={orderItems.length === 0}
              className="btn-primary w-full justify-center py-3 text-base"
            >
              Cobrar ${total.toFixed(2)}
            </button>

            <div className="flex gap-2">
              <button
                onClick={() => {}}
                className="btn-secondary flex-1 text-xs py-2 justify-center"
              >
                <Printer size={13} />
                Imprimir
              </button>
              <button
                onClick={onShowMenu}
                className="btn-secondary flex-1 text-xs py-2 justify-center"
              >
                <Plus size={13} />
                Agregar más
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nota a cocina */}
      {showKitchenNote && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-sm rounded-2xl p-5 space-y-3 bg-white shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} style={{ color: '#d97706' }} />
                <h3 className="font-bold text-gray-900 text-sm">Nota urgente a cocina</h3>
              </div>
              <button onClick={() => { setShowKitchenNote(false); setKitchenNoteText(''); }}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
            </div>
            <textarea
              value={kitchenNoteText}
              onChange={e => setKitchenNoteText(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-xl border text-sm resize-none outline-none focus:border-amber-400"
              style={{ borderColor: '#e5e7eb', backgroundColor: '#fefce8' }}
              placeholder="Ej: sin cebolla, alergia al gluten, cambiar guarnición..."
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={() => { setShowKitchenNote(false); setKitchenNoteText(''); }}
                className="flex-1 py-2 rounded-xl text-sm font-semibold bg-gray-100 text-gray-600">
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (kitchenNoteText.trim() && onSendKitchenNote) {
                    onSendKitchenNote(kitchenNoteText.trim());
                    setKitchenNoteText('');
                    setShowKitchenNote(false);
                  }
                }}
                disabled={!kitchenNoteText.trim()}
                className="flex-1 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
                style={{ backgroundColor: '#f59e0b', color: '#1B3A6B' }}>
                📝 Enviar a cocina
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}