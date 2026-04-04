'use client';

import React from 'react';
import { X, Clock, User, MapPin, CreditCard, Banknote, Printer, XCircle, Receipt } from 'lucide-react';
import { OrderRecord } from './OrdersTable';
import Icon from '@/components/ui/AppIcon';


interface OrderDetailModalProps {
  order: OrderRecord;
  onClose: () => void;
  onCancel: (order: OrderRecord) => void;
}

const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
  abierta: { label: 'Abierta', bg: '#dbeafe', color: '#1e40af' },
  preparacion: { label: 'En Preparación', bg: '#fef3c7', color: '#92400e' },
  lista: { label: 'Lista para Servir', bg: '#fef3c7', color: '#92400e' },
  cerrada: { label: 'Cerrada', bg: '#dcfce7', color: '#166534' },
  cancelada: { label: 'Cancelada', bg: '#f3f4f6', color: '#6b7280' },
};

export default function OrderDetailModal({ order, onClose, onCancel }: OrderDetailModalProps) {
  const sc = statusConfig[order.status] || statusConfig.abierta;
  const isOpen = ['abierta', 'preparacion', 'lista'].includes(order.status);

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '540px' }}>
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 rounded-t-2xl"
          style={{ backgroundColor: '#1B3A6B' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'rgba(245,158,11,0.2)' }}
            >
              <Receipt size={18} style={{ color: '#f59e0b' }} />
            </div>
            <div>
              <h2 className="font-700 text-white text-base" style={{ fontWeight: 700 }}>
                Detalle de Orden
              </h2>
              <p className="font-mono text-sm" style={{ color: '#f59e0b' }}>{order.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="text-xs px-3 py-1 rounded-full font-600"
              style={{ backgroundColor: sc.bg, color: sc.color, fontWeight: 600 }}
            >
              {sc.label}
            </span>
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-colors"
              style={{ color: 'rgba(255,255,255,0.5)' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto scrollbar-thin">
          {/* Meta info */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: MapPin, label: 'Mesa', value: order.mesa },
              { icon: User, label: 'Mesero', value: order.mesero },
              { icon: Clock, label: 'Hora apertura', value: order.openedAt },
              {
                icon: Clock,
                label: order.closedAt ? 'Hora cierre' : 'Duración',
                value: order.closedAt || (isOpen ? 'En curso' : '—'),
              },
            ].map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="flex items-start gap-3 p-3 rounded-xl"
                style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: '#e0e7ff' }}
                >
                  <Icon size={13} style={{ color: '#4338ca' }} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                  <p className="text-sm font-600 text-gray-800" style={{ fontWeight: 600 }}>{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Branch */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Sucursal</span>
            <span className="font-600 text-gray-700" style={{ fontWeight: 600 }}>{order.branch}</span>
          </div>

          {/* Items list */}
          <div>
            <p className="text-xs font-600 text-gray-500 uppercase tracking-wide mb-3" style={{ fontWeight: 600 }}>
              Platillos Ordenados
            </p>
            <div
              className="rounded-xl overflow-hidden border"
              style={{ borderColor: '#e5e7eb' }}
            >
              {order.items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0"
                  style={{ borderColor: '#f3f4f6' }}
                >
                  <span className="text-xl">{item.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-500 text-gray-800 truncate" style={{ fontWeight: 500 }}>
                      {item.name}
                    </p>
                    <p className="text-xs text-gray-400 font-mono">${item.price} c/u</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-400 mb-0.5">×{item.qty}</p>
                    <p className="font-mono font-700 text-sm text-gray-900" style={{ fontWeight: 700 }}>
                      ${(item.price * item.qty).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div
            className="rounded-xl p-4 space-y-2"
            style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}
          >
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span>
              <span className="font-mono">${order.subtotal.toFixed(2)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Descuento aplicado</span>
                <span className="font-mono">−${order.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-gray-500">
              <span>IVA (16%)</span>
              <span className="font-mono">${order.iva.toFixed(2)}</span>
            </div>
            <div
              className="flex justify-between text-base font-700 pt-2 border-t"
              style={{ borderColor: '#e2e8f0', fontWeight: 700 }}
            >
              <span className="text-gray-900">Total</span>
              <span className="font-mono text-lg" style={{ color: '#1B3A6B' }}>
                ${order.total.toFixed(2)}
              </span>
            </div>
            {order.payMethod && (
              <div className="flex items-center gap-2 pt-1">
                {order.payMethod === 'efectivo' ? (
                  <Banknote size={14} className="text-green-600" />
                ) : (
                  <CreditCard size={14} className="text-blue-600" />
                )}
                <span className="text-sm text-gray-600 capitalize">
                  Pagado con {order.payMethod === 'efectivo' ? 'Efectivo' : 'Tarjeta'}
                </span>
              </div>
            )}
          </div>

          {/* Notes / cancellation reason */}
          {order.notes && (
            <div
              className="rounded-xl px-4 py-3 flex items-start gap-2"
              style={{
                backgroundColor: order.status === 'cancelada' ? '#fef2f2' : '#fffbeb',
                border: `1px solid ${order.status === 'cancelada' ? '#fca5a5' : '#fde68a'}`,
              }}
            >
              <span className="text-base mt-0.5">{order.status === 'cancelada' ? '🚫' : '📝'}</span>
              <div>
                <p className="text-xs font-600 mb-0.5" style={{ fontWeight: 600, color: order.status === 'cancelada' ? '#991b1b' : '#92400e' }}>
                  {order.status === 'cancelada' ? 'Motivo de cancelación' : 'Notas'}
                </p>
                <p className="text-sm" style={{ color: order.status === 'cancelada' ? '#dc2626' : '#92400e' }}>
                  {order.notes}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center gap-3 px-6 py-4 border-t"
          style={{ borderColor: '#f3f4f6' }}
        >
          <button className="btn-secondary flex items-center gap-2 text-xs">
            <Printer size={14} />
            Imprimir ticket
          </button>
          <div className="flex-1" />
          {isOpen && (
            <button
              onClick={() => onCancel(order)}
              className="btn-danger flex items-center gap-2 text-sm"
            >
              <XCircle size={15} />
              Cancelar Orden
            </button>
          )}
          <button onClick={onClose} className="btn-secondary">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}