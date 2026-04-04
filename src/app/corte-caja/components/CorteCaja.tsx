'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAudit } from '@/hooks/useAudit';
import { useSysConfig } from '@/hooks/useSysConfig';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { CreditCard, Banknote, TrendingUp, Plus, Minus, ChevronDown, ChevronUp, Printer, Lock, Unlock, Receipt, Users, ShoppingBag,  } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CorteCajaRecord {
  id: string;
  aperturaAt: string;
  cierreAt: string | null;
  fondoInicial: number;
  aperturaPor: string;
  cierrePor: string | null;
  ventasEfectivo: number | null;
  ventasTarjeta: number | null;
  ventasTotal: number | null;
  ordenesCount: number | null;
  descuentosTotal: number | null;
  ivaTotal: number | null;
  efectivoContado: number | null;
  diferencia: number | null;
  denominaciones: { valor: number; cantidad: number }[] | null;
  notas: string | null;
  status: 'abierto' | 'cerrado';
}

interface OrderSummary {
  ventas_efectivo: number;
  ventas_tarjeta: number;
  ventas_total: number;
  ordenes_count: number;
  descuentos_total: number;
  iva_total: number;
  por_mesero: { nombre: string; total: number; ordenes: number }[];
  por_hora: { hora: string; total: number }[];
  merma_total: number;
  ordenes_canceladas: { id: string; mesa: string; mesero: string; subtotal: number; notes: string | null }[];
}

// Denominations vary by currency — configured per tenant
const DENOMINACIONES_BY_CURRENCY: Record<string, { valor: number; label: string }[]> = {
  MXN: [
    { valor: 1000, label: '$1,000' }, { valor: 500,  label: '$500' },
    { valor: 200,  label: '$200' },  { valor: 100,  label: '$100' },
    { valor: 50,   label: '$50' },   { valor: 20,   label: '$20' },
    { valor: 10,   label: '$10' },   { valor: 5,    label: '$5' },
    { valor: 2,    label: '$2' },    { valor: 1,    label: '$1' },
    { valor: 0.50, label: '$0.50' },
  ],
  EUR: [
    { valor: 500, label: '€500' },   { valor: 200,  label: '€200' },
    { valor: 100, label: '€100' },   { valor: 50,   label: '€50' },
    { valor: 20,  label: '€20' },    { valor: 10,   label: '€10' },
    { valor: 5,   label: '€5' },     { valor: 2,    label: '€2' },
    { valor: 1,   label: '€1' },     { valor: 0.50, label: '€0.50' },
    { valor: 0.20,label: '€0.20' },  { valor: 0.10, label: '€0.10' },
  ],
  USD: [
    { valor: 100, label: '$100' },   { valor: 50,   label: '$50' },
    { valor: 20,  label: '$20' },    { valor: 10,   label: '$10' },
    { valor: 5,   label: '$5' },     { valor: 1,    label: '$1' },
    { valor: 0.25,label: '¢25' },    { valor: 0.10, label: '¢10' },
    { valor: 0.05,label: '¢5' },
  ],
};
const DENOMINACIONES_MXN = DENOMINACIONES_BY_CURRENCY.MXN; // fallback alias

function fmt(n: number, locale = 'es-MX') {
  return n.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CorteCaja() {
  const supabase = createClient();
  const { log: auditLog } = useAudit();
  const { currencyCode, currencyLocale, currencySymbol } = useSysConfig();
  const denominaciones_activas = DENOMINACIONES_BY_CURRENCY[currencyCode] ?? DENOMINACIONES_MXN;
  const { tenantId } = useAuth();
  const DEFAULT_TENANT = tenantId ?? '00000000-0000-0000-0000-000000000001';

  const [corteActivo, setCorteActivo] = useState<CorteCajaRecord | null>(null);
  const [historial, setHistorial] = useState<CorteCajaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<OrderSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Apertura form
  const [fondoInicial, setFondoInicial] = useState('');
  const [aperturaPor, setAperturaPor] = useState('');
  const [abriendo, setAbriendo] = useState(false);

  // Cierre form
  const [cierrePor, setCierrePor] = useState('');
  const [notas, setNotas] = useState('');
  const [denominaciones, setDenominaciones] = useState<Record<number, number>>(
    Object.fromEntries(denominaciones_activas.map(d => [d.valor, 0]))
  );
  const [cerrando, setCerrando] = useState(false);
  const [showHistorial, setShowHistorial] = useState(false);
  const [showDenominaciones, setShowDenominaciones] = useState(true);

  // ── Load corte activo ───────────────────────────────────────────────────────
  const loadCorte = useCallback(async () => {
    setLoading(true);
    const { data: activo } = await supabase
      .from('cortes_caja')
      .select('*')
      .eq('status', 'abierto')
      .order('apertura_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activo) {
      setCorteActivo(mapRow(activo));
    } else {
      setCorteActivo(null);
    }

    const { data: hist } = await supabase
      .from('cortes_caja')
      .select('*')
      .eq('status', 'cerrado')
      .order('cierre_at', { ascending: false })
      .limit(10);
    setHistorial((hist || []).map(mapRow));
    setLoading(false);
  }, [supabase]);

  function mapRow(r: any): CorteCajaRecord {
    return {
      id: r.id,
      aperturaAt: r.apertura_at,
      cierreAt: r.cierre_at,
      fondoInicial: Number(r.fondo_inicial),
      aperturaPor: r.apertura_por,
      cierrePor: r.cierre_por,
      ventasEfectivo: r.ventas_efectivo != null ? Number(r.ventas_efectivo) : null,
      ventasTarjeta: r.ventas_tarjeta != null ? Number(r.ventas_tarjeta) : null,
      ventasTotal: r.ventas_total != null ? Number(r.ventas_total) : null,
      ordenesCount: r.ordenes_count,
      descuentosTotal: r.descuentos_total != null ? Number(r.descuentos_total) : null,
      ivaTotal: r.iva_total != null ? Number(r.iva_total) : null,
      efectivoContado: r.efectivo_contado != null ? Number(r.efectivo_contado) : null,
      diferencia: r.diferencia != null ? Number(r.diferencia) : null,
      denominaciones: r.denominaciones ? JSON.parse(typeof r.denominaciones === 'string' ? r.denominaciones : JSON.stringify(r.denominaciones)) : null,
      notas: r.notas,
      status: r.status,
    };
  }

  useEffect(() => { loadCorte(); }, [loadCorte]);

  // ── Load order summary for active corte ────────────────────────────────────
  const loadSummary = useCallback(async (desde: string) => {
    setSummaryLoading(true);
    const [{ data: orders }, { data: mermaOrders }] = await Promise.all([
      supabase
        .from('orders')
        .select('total, subtotal, iva, discount, pay_method, mesero, closed_at')
        .eq('status', 'cerrada')
        .gte('closed_at', desde)
        .order('closed_at', { ascending: false }),
      supabase
        .from('orders')
        .select('id, mesa, mesero, subtotal, notes, closed_at')
        .eq('status', 'cancelada')
        .eq('cancel_type', 'con_costo')
        .gte('updated_at', desde)
        .order('updated_at', { ascending: false }),
    ]);

    if (!orders || orders.length === 0) {
      setSummary({ ventas_efectivo: 0, ventas_tarjeta: 0, ventas_total: 0, ordenes_count: 0, descuentos_total: 0, iva_total: 0, por_mesero: [], por_hora: [], merma_total: 0, ordenes_canceladas: [] });
      setSummaryLoading(false);
      return;
    }

    const ventas_efectivo = orders.filter(o => o.pay_method === 'efectivo').reduce((s, o) => s + Number(o.total), 0);
    const ventas_tarjeta  = orders.filter(o => o.pay_method === 'tarjeta').reduce((s, o) => s + Number(o.total), 0);
    const ventas_total    = orders.reduce((s, o) => s + Number(o.total), 0);
    const descuentos_total = orders.reduce((s, o) => s + Number(o.discount), 0);
    const iva_total       = orders.reduce((s, o) => s + Number(o.iva), 0);

    const meseroMap: Record<string, { total: number; ordenes: number }> = {};
    orders.forEach(o => {
      const m = o.mesero || 'Sin asignar';
      if (!meseroMap[m]) meseroMap[m] = { total: 0, ordenes: 0 };
      meseroMap[m].total += Number(o.total);
      meseroMap[m].ordenes += 1;
    });

    const hourMap: Record<string, number> = {};
    orders.forEach(o => {
      if (o.closed_at) {
        const h = o.closed_at.substring(11, 13) + ':00';
        hourMap[h] = (hourMap[h] || 0) + Number(o.total);
      }
    });

    setSummary({
      ventas_efectivo, ventas_tarjeta, ventas_total,
      ordenes_count: orders.length,
      descuentos_total, iva_total,
      por_mesero: Object.entries(meseroMap)
        .map(([nombre, v]) => ({ nombre, ...v }))
        .sort((a, b) => b.total - a.total),
      por_hora: Object.entries(hourMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([hora, total]) => ({ hora, total })),
      merma_total: (mermaOrders || []).reduce((s, o) => s + Number(o.subtotal), 0),
      ordenes_canceladas: (mermaOrders || []).map(o => ({
        id: o.id, mesa: o.mesa, mesero: o.mesero,
        subtotal: Number(o.subtotal), notes: o.notes,
      })),
    });
    setSummaryLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (corteActivo) loadSummary(corteActivo.aperturaAt);
  }, [corteActivo, loadSummary]);

  // ── Apertura de caja ────────────────────────────────────────────────────────
  const handleAbrirCaja = async () => {
    if (!aperturaPor.trim()) { toast.error('Ingresa el nombre del cajero'); return; }
    const fondo = parseFloat(fondoInicial) || 0;
    setAbriendo(true);
    const { error } = await supabase.from('cortes_caja').insert({
      fondo_inicial: fondo,
      apertura_por: aperturaPor.trim(),
      tenant_id: DEFAULT_TENANT,
      status: 'abierto',
    });
    if (error) { toast.error('Error al abrir caja: ' + error.message); setAbriendo(false); return; }
    toast.success('✅ Caja abierta correctamente');
    setFondoInicial('');
    setAperturaPor('');
    setAbriendo(false);
    await loadCorte();
  };

  // ── Efectivo contado (calculado desde denominaciones) ──────────────────────
  const efectivoContado = useMemo(() =>
    denominaciones_activas.reduce((s, d) => s + d.valor * (denominaciones[d.valor] || 0), 0),
    [denominaciones]
  );

  const expectedEfectivo = (corteActivo?.fondoInicial ?? 0) + (summary?.ventas_efectivo ?? 0);
  const diferencia = efectivoContado - expectedEfectivo;

  // ── Cierre de caja ──────────────────────────────────────────────────────────
  const handleCerrarCaja = async () => {
    if (!corteActivo) return;
    if (!cierrePor.trim()) { toast.error('Ingresa el nombre del cajero'); return; }
    setCerrando(true);

    const denomArr = DENOMINACIONES_MXN
      .filter(d => (denominaciones[d.valor] || 0) > 0)
      .map(d => ({ valor: d.valor, cantidad: denominaciones[d.valor] }));

    const { error } = await supabase.from('cortes_caja').update({
      cierre_at: new Date().toISOString(),
      cierre_por: cierrePor.trim(),
      ventas_efectivo: summary?.ventas_efectivo ?? 0,
      ventas_tarjeta: summary?.ventas_tarjeta ?? 0,
      ventas_total: summary?.ventas_total ?? 0,
      merma_total: summary?.merma_total ?? 0,
      ordenes_canceladas_count: summary?.ordenes_canceladas.length ?? 0,
      ordenes_count: summary?.ordenes_count ?? 0,
      descuentos_total: summary?.descuentos_total ?? 0,
      iva_total: summary?.iva_total ?? 0,
      efectivo_contado: efectivoContado,
      diferencia,
      denominaciones: JSON.stringify(denomArr),
      notas: notas.trim() || null,
      status: 'cerrado',
      updated_at: new Date().toISOString(),
    }).eq('id', corteActivo.id);

    if (error) { toast.error('Error al cerrar caja: ' + error.message); setCerrando(false); return; }
    toast.success('✅ Corte de caja completado');
    setCerrando(false);
    setDenominaciones(Object.fromEntries(denominaciones_activas.map(d => [d.valor, 0])));
    setCierrePor('');
    setNotas('');
    await loadCorte();
  };

  // ── Print corte ─────────────────────────────────────────────────────────────
  const handlePrint = () => { window.print(); };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#f59e0b' }} />
      </div>
    );
  }

  // ── CAJA CERRADA — mostrar apertura ────────────────────────────────────────
  if (!corteActivo) {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        {/* Status */}
        <div className="bg-white rounded-2xl border p-6 text-center" style={{ borderColor: '#e5e7eb' }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#fef3c7' }}>
            <Lock size={28} style={{ color: '#d97706' }} />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Caja Cerrada</h2>
          <p className="text-sm text-gray-500">No hay un turno activo. Abre la caja para comenzar a registrar ventas.</p>
        </div>

        {/* Apertura form */}
        <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
            <Unlock size={18} style={{ color: '#10b981' }} /> Apertura de Caja
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre del cajero *</label>
              <input type="text" value={aperturaPor} onChange={e => setAperturaPor(e.target.value)}
                className="w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                style={{ borderColor: '#e5e7eb' }} placeholder="Ej: María García" autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Fondo inicial (efectivo en caja)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input type="number" min={0} value={fondoInicial} onChange={e => setFondoInicial(e.target.value)}
                  className="w-full pl-7 pr-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 font-mono"
                  style={{ borderColor: '#e5e7eb' }} placeholder="0.00" />
              </div>
              <p className="text-xs text-gray-400 mt-1">Dinero físico con el que arranca el turno (billetes de cambio).</p>
            </div>
            <button onClick={handleAbrirCaja} disabled={abriendo || !aperturaPor.trim()}
              className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ backgroundColor: '#1B3A6B' }}>
              <Unlock size={16} />
              {abriendo ? 'Abriendo...' : 'Abrir Caja'}
            </button>
          </div>
        </div>

        {/* Historial */}
        {historial.length > 0 && (
          <div className="bg-white rounded-2xl border" style={{ borderColor: '#e5e7eb' }}>
            <button onClick={() => setShowHistorial(h => !h)}
              className="w-full flex items-center justify-between px-6 py-4 text-sm font-semibold text-gray-700">
              <span className="flex items-center gap-2"><Receipt size={16} /> Historial de cortes ({historial.length})</span>
              {showHistorial ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {showHistorial && (
              <div className="border-t divide-y" style={{ borderColor: '#f3f4f6' }}>
                {historial.map(h => (
                  <div key={h.id} className="px-6 py-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-800">
                        {new Date(h.aperturaAt).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })}
                        {' · '}{h.aperturaPor}
                      </span>
                      <span className="text-sm font-bold font-mono" style={{ color: '#1B3A6B' }}>${fmt(h.ventasTotal ?? 0)}</span>
                    </div>
                    <div className="flex gap-4 text-xs text-gray-500">
                      <span>💵 ${fmt(h.ventasEfectivo ?? 0)}</span>
                      <span>💳 ${fmt(h.ventasTarjeta ?? 0)}</span>
                      <span>🧾 {h.ordenesCount ?? 0} órdenes</span>
                      {h.diferencia != null && (
                        <span style={{ color: h.diferencia === 0 ? '#10b981' : h.diferencia > 0 ? '#3b82f6' : '#ef4444' }}>
                          {h.diferencia >= 0 ? '+' : ''}{fmt(h.diferencia)} diferencia
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── CAJA ABIERTA — mostrar resumen + cierre ────────────────────────────────
  const aperturaDate = new Date(corteActivo.aperturaAt);
  const horasActivo = Math.round((Date.now() - aperturaDate.getTime()) / 3600000 * 10) / 10;

  return (
    <div className="space-y-5 max-w-4xl mx-auto print:max-w-none">

      {/* ── Header status ── */}
      <div className="bg-white rounded-2xl border p-5 flex items-center justify-between" style={{ borderColor: '#fde68a', backgroundColor: '#fffdf5', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#fef3c7' }}>
            <Unlock size={22} style={{ color: '#d97706' }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-gray-900">Caja Abierta</span>
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            </div>
            <p className="text-xs text-gray-500">
              Apertura: {aperturaDate.toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              {' · '}{corteActivo.aperturaPor}{' · '}{horasActivo}h activo
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Fondo inicial</p>
          <p className="text-lg font-bold font-mono" style={{ color: '#1B3A6B' }}>${fmt(corteActivo.fondoInicial)}</p>
        </div>
      </div>

      {/* ── KPI cards ── */}
      {summaryLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ backgroundColor: '#f3f4f6' }} />)}
        </div>
      ) : summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Ventas Totales',  value: `$${fmt(summary.ventas_total)}`,   icon: TrendingUp,   color: '#f59e0b', bg: '#fffbeb' },
            { label: 'En Efectivo',     value: `$${fmt(summary.ventas_efectivo)}`, icon: Banknote,     color: '#10b981', bg: '#ecfdf5' },
            { label: 'En Tarjeta',      value: `$${fmt(summary.ventas_tarjeta)}`,  icon: CreditCard,   color: '#3b82f6', bg: '#eff6ff' },
            { label: 'Órdenes',         value: String(summary.ordenes_count),      icon: ShoppingBag,  color: '#8b5cf6', bg: '#f5f3ff' },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-2xl border p-4" style={{ borderColor: '#e5e7eb' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">{k.label}</span>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: k.bg }}>
                  <k.icon size={14} style={{ color: k.color }} />
                </div>
              </div>
              <p className="text-xl font-bold font-mono text-gray-900">{k.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ── Detalle por mesero ── */}
        {summary && summary.por_mesero.length > 0 && (
          <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#e5e7eb' }}>
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Users size={16} style={{ color: '#8b5cf6' }} /> Ventas por Mesero
            </h3>
            <div className="space-y-2">
              {summary.por_mesero.map(m => (
                <div key={m.nombre} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: '#f3f4f6' }}>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{m.nombre}</p>
                    <p className="text-xs text-gray-400">{m.ordenes} orden{m.ordenes !== 1 ? 'es' : ''}</p>
                  </div>
                  <span className="font-mono font-bold text-sm" style={{ color: '#1B3A6B' }}>${fmt(m.total)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Merma por Atención ── */}
        {summary && (
          <div className="rounded-2xl border p-5" style={{ borderColor: summary.merma_total > 0 ? '#fca5a5' : '#e5e7eb', backgroundColor: summary.merma_total > 0 ? '#fff5f5' : 'white' }}>
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: '#dc2626' }}>
              ⚠️ Merma por Atención del Turno
            </h3>
            {summary.merma_total === 0 ? (
              <p className="text-sm text-gray-400 text-center py-3">Sin mermas registradas en este turno ✓</p>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-3 border-b" style={{ borderColor: '#fca5a5' }}>
                  <span className="text-sm font-semibold text-red-700">{summary.ordenes_canceladas.length} órdenes con costo</span>
                  <span className="font-mono font-bold text-red-700 text-lg">${fmt(summary.merma_total)}</span>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {summary.ordenes_canceladas.map(o => (
                    <div key={o.id} className="flex justify-between items-center text-xs py-1.5">
                      <div>
                        <span className="font-semibold text-gray-700">{o.mesa}</span>
                        <span className="text-gray-400 ml-2">· {o.mesero}</span>
                        {o.notes && <span className="text-gray-400 ml-2 italic">{o.notes.slice(0, 40)}</span>}
                      </div>
                      <span className="font-mono text-red-600 font-semibold">${fmt(o.subtotal)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Detalle fiscal ── */}
        {summary && (
          <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#e5e7eb' }}>
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Receipt size={16} style={{ color: '#10b981' }} /> Resumen Fiscal del Turno
            </h3>
            <div className="space-y-2.5">
              {[
                { label: 'Subtotal (sin IVA)', value: summary.ventas_total - summary.iva_total, color: '#374151' },
                { label: 'IVA (16%)',           value: summary.iva_total,                        color: '#6b7280' },
                { label: 'Descuentos aplicados', value: -summary.descuentos_total,               color: '#ef4444' },
                { label: 'TOTAL VENTAS',         value: summary.ventas_total,                    color: '#1B3A6B', bold: true },
              ].map(row => (
                <div key={row.label} className={`flex justify-between items-center ${row.bold ? 'pt-2 border-t font-bold' : ''}`}
                  style={{ borderColor: '#f3f4f6' }}>
                  <span className="text-sm" style={{ color: row.bold ? '#1B3A6B' : '#6b7280' }}>{row.label}</span>
                  <span className="font-mono text-sm" style={{ color: row.color, fontWeight: row.bold ? 700 : 400 }}>
                    {row.value < 0 ? '-' : ''}${fmt(Math.abs(row.value))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Cierre de caja ── */}
      <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <h3 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
          <Lock size={18} style={{ color: '#ef4444' }} /> Cierre de Caja
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Denominaciones */}
          <div>
            <button onClick={() => setShowDenominaciones(d => !d)}
              className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3 w-full">
              <Banknote size={16} style={{ color: '#10b981' }} />
              Conteo de efectivo
              {showDenominaciones ? <ChevronUp size={14} className="ml-auto" /> : <ChevronDown size={14} className="ml-auto" />}
            </button>

            {showDenominaciones && (
              <div className="space-y-2">
                {denominaciones_activas.map(d => (
                  <div key={d.valor} className="flex items-center gap-3">
                    <span className="text-sm font-mono font-semibold w-16 text-right" style={{ color: '#374151' }}>{d.label}</span>
                    <div className="flex items-center gap-2 flex-1">
                      <button onClick={() => setDenominaciones(prev => ({ ...prev, [d.valor]: Math.max(0, (prev[d.valor] || 0) - 1) }))}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold"
                        style={{ backgroundColor: '#fef2f2', color: '#ef4444' }}>
                        <Minus size={12} />
                      </button>
                      <input type="number" min={0} value={denominaciones[d.valor] || 0}
                        onChange={e => setDenominaciones(prev => ({ ...prev, [d.valor]: Math.max(0, parseInt(e.target.value) || 0) }))}
                        className="w-16 text-center px-2 py-1.5 border rounded-lg text-sm font-mono focus:outline-none focus:ring-1 focus:ring-amber-300"
                        style={{ borderColor: '#e5e7eb' }} />
                      <button onClick={() => setDenominaciones(prev => ({ ...prev, [d.valor]: (prev[d.valor] || 0) + 1 }))}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold"
                        style={{ backgroundColor: '#ecfdf5', color: '#10b981' }}>
                        <Plus size={12} />
                      </button>
                      <span className="text-xs text-gray-400 font-mono ml-1">
                        = ${fmt(d.valor * (denominaciones[d.valor] || 0))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Totales */}
            <div className="mt-4 rounded-xl p-4 space-y-2" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Fondo inicial</span>
                <span className="font-mono">${fmt(corteActivo.fondoInicial)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Ventas en efectivo</span>
                <span className="font-mono text-green-600">+${fmt(summary?.ventas_efectivo ?? 0)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold border-t pt-2" style={{ borderColor: '#e2e8f0' }}>
                <span>Efectivo esperado</span>
                <span className="font-mono" style={{ color: '#1B3A6B' }}>${fmt(expectedEfectivo)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold">
                <span>Efectivo contado</span>
                <span className="font-mono">${fmt(efectivoContado)}</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-1 border-t" style={{ borderColor: '#e2e8f0' }}>
                <span>Diferencia</span>
                <span className="font-mono" style={{ color: diferencia === 0 ? '#10b981' : diferencia > 0 ? '#3b82f6' : '#ef4444' }}>
                  {diferencia >= 0 ? '+' : ''}${fmt(diferencia)}
                  {diferencia === 0 ? ' ✓' : diferencia > 0 ? ' (sobrante)' : ' (faltante)'}
                </span>
              </div>
            </div>
          </div>

          {/* Cierre form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Cajero que cierra *</label>
              <input type="text" value={cierrePor} onChange={e => setCierrePor(e.target.value)}
                className="w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                style={{ borderColor: '#e5e7eb' }} placeholder="Nombre del cajero o gerente" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Notas del corte</label>
              <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={3}
                className="w-full px-3 py-2.5 border rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-300"
                style={{ borderColor: '#e5e7eb' }}
                placeholder="Ej: Hubo problema con terminal de tarjeta a las 2pm, se rechazaron 2 cobros..." />
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all"
                style={{ borderColor: '#e5e7eb', color: '#374151' }}>
                <Printer size={15} /> Imprimir
              </button>
              <button onClick={handleCerrarCaja} disabled={cerrando || !cierrePor.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                style={{ backgroundColor: '#ef4444' }}>
                <Lock size={15} />
                {cerrando ? 'Cerrando...' : 'Cerrar Caja'}
              </button>
            </div>

            {diferencia !== 0 && efectivoContado > 0 && (
              <div className="rounded-xl px-4 py-3 text-xs" style={{
                backgroundColor: diferencia > 0 ? '#eff6ff' : '#fef2f2',
                borderLeft: `3px solid ${diferencia > 0 ? '#3b82f6' : '#ef4444'}`,
                color: diferencia > 0 ? '#1e40af' : '#991b1b',
              }}>
                {diferencia > 0
                  ? `💡 Hay un sobrante de $${fmt(diferencia)}. Verifica si falta registrar algún gasto.`
                  : `⚠️ Hay un faltante de $${fmt(Math.abs(diferencia))}. Verifica el conteo o busca la diferencia.`
                }
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body { background: white !important; }
          aside, header, .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}