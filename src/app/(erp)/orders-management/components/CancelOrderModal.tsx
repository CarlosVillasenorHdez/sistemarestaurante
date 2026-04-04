'use client';

import React, { useState } from 'react';
import { X, AlertTriangle, XCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { OrderRecord } from './OrdersTable';

interface CancelOrderModalProps {
  order: OrderRecord & { kitchenStatus?: string };
  onClose: () => void;
  onConfirm: (orderId: string, reason: string, cancelType: 'sin_costo' | 'con_costo') => void;
}

interface FormValues {
  reason: string;
  customReason: string;
}

const cancelReasons = [
  'Cliente se retiró antes de ser atendido',
  'Error al registrar la orden',
  'Platillo no disponible en cocina',
  'Solicitud del cliente',
  'Error de cobro o duplicado',
  'Otro motivo',
];

export default function CancelOrderModal({ order, onClose, onConfirm }: CancelOrderModalProps) {
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: { reason: '', customReason: '' } });

  const selectedReason = watch('reason');
  const isOther = selectedReason === 'Otro motivo';

  // Determine cancel type based on kitchen status
  // pendiente/en_edicion = no ingredients used yet = sin_costo
  // preparacion/lista = ingredients already used = con_costo (merma por atención)
  const kitchenStatus = order.kitchenStatus ?? 'en_edicion';
  const cancelType: 'sin_costo' | 'con_costo' =
    kitchenStatus === 'preparacion' || kitchenStatus === 'lista'
      ? 'con_costo'
      : 'sin_costo';

  const onSubmit = async (data: FormValues) => {
    const finalReason = isOther ? data.customReason : data.reason;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 300));
    setLoading(false);
    onConfirm(order.id, finalReason, cancelType);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '460px' }}>
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 rounded-t-2xl border-b"
          style={{ borderColor: '#f3f4f6' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: '#fee2e2' }}
            >
              <AlertTriangle size={18} className="text-red-500" />
            </div>
            <div>
              <h2 className="font-700 text-gray-900 text-base" style={{ fontWeight: 700 }}>
                Cancelar Orden
              </h2>
              <p className="text-xs text-gray-500 font-mono">{order.id} · {order.mesa}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="p-6 space-y-4">
            {/* Warning */}
            <div
              className="rounded-xl px-4 py-3 flex items-start gap-3"
              style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5' }}
            >
              <AlertTriangle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">
                Esta acción cancelará la orden <strong>{order.id}</strong> de{' '}
                <strong>{order.mesa}</strong> ({order.mesero}). La mesa quedará disponible y
                los platillos no serán cobrados. <strong>Esta acción no se puede deshacer.</strong>
              </p>
            </div>

            {/* Merma warning — only shown when order is in preparation */}
            {cancelType === 'con_costo' && (
              <div
                className="rounded-xl px-4 py-3 flex items-start gap-3"
                style={{ backgroundColor: '#fff7ed', border: '1px solid #fb923c' }}
              >
                <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" style={{ color: '#ea580c' }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#c2410c' }}>
                    ⚠️ Merma por Atención
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#9a3412' }}>
                    Esta orden ya está en preparación o lista. Los ingredientes ya se utilizaron
                    y no se pueden recuperar. La cancelación generará un costo de{' '}
                    <strong>${order.subtotal.toFixed(2)}</strong> registrado como merma.
                  </p>
                </div>
              </div>
            )}

            {/* Order summary mini */}
            <div
              className="rounded-xl p-3 flex items-center justify-between"
              style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}
            >
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Orden a cancelar</p>
                <p className="text-sm font-600 text-gray-800" style={{ fontWeight: 600 }}>
                  {order.items.reduce((s, i) => s + i.qty, 0)} platillos · {order.items.length} tipos
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 mb-0.5">Total que se anulará</p>
                <p className="font-mono font-700 text-red-600 text-base" style={{ fontWeight: 700 }}>
                  ${order.total.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Reason selector */}
            <div>
              <label className="block text-sm font-600 text-gray-700 mb-1.5" style={{ fontWeight: 600 }}>
                Motivo de cancelación <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-400 mb-2">
                Selecciona el motivo principal para el registro interno
              </p>
              <div className="space-y-2">
                {cancelReasons.map((reason) => (
                  <label
                    key={reason}
                    className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-100"
                    style={{
                      borderColor: selectedReason === reason ? '#fca5a5' : '#e5e7eb',
                      backgroundColor: selectedReason === reason ? '#fef2f2' : 'white',
                    }}
                  >
                    <input
                      type="radio"
                      value={reason}
                      {...register('reason', { required: 'Selecciona un motivo de cancelación' })}
                      className="flex-shrink-0"
                      style={{ accentColor: '#ef4444' }}
                    />
                    <span className="text-sm text-gray-700">{reason}</span>
                  </label>
                ))}
              </div>
              {errors.reason && (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                  <AlertTriangle size={11} />
                  {errors.reason.message}
                </p>
              )}
            </div>

            {/* Custom reason */}
            {isOther && (
              <div className="animate-fade-in">
                <label className="block text-sm font-600 text-gray-700 mb-1.5" style={{ fontWeight: 600 }}>
                  Describe el motivo <span className="text-red-500">*</span>
                </label>
                <textarea
                  {...register('customReason', {
                    required: isOther ? 'Por favor describe el motivo de cancelación' : false,
                    minLength: { value: 10, message: 'El motivo debe tener al menos 10 caracteres' },
                  })}
                  placeholder="Escribe el motivo específico de la cancelación..."
                  rows={3}
                  className="input-field resize-none text-sm"
                />
                {errors.customReason && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertTriangle size={11} />
                    {errors.customReason.message}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="flex items-center gap-3 px-6 py-4 border-t"
            style={{ borderColor: '#f3f4f6' }}
          >
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
              Volver
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-danger flex-1 justify-center flex items-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Cancelando...
                </>
              ) : (
                <>
                  <XCircle size={15} />
                  Confirmar Cancelación
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}