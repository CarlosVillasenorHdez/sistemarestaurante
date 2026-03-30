'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { usePrinter } from '@/hooks/usePrinter';
import { createClient } from '@/lib/supabase/client';
import { useFeatures } from '@/hooks/useFeatures';
import { X, CreditCard, Banknote, Check, Printer, Receipt, Split, Plus, Minus, Users, ChevronRight, ArrowLeft, Star, Search, UserCheck, XCircle } from 'lucide-react';

interface OrderItemRef {
  id: string;           // menuItem.id
  name: string;
  emoji?: string;
  price: number;
  quantity: number;     // total quantity ordered
  notes?: string;
}

interface PaymentModalProps {
  total: number;
  subtotal?: number;
  iva?: number;
  discount?: number;
  items?: OrderItemRef[];
  orderNumber?: string;
  mesa?: string;
  mesero?: string;
  restaurantName?: string;
  branchName?: string;
  printerConfig?: {
    headerLine1?: string; headerLine2?: string; footerText?: string;
    separatorChar?: string; paperWidth?: 58 | 80; autoCut?: boolean;
    showOrderNumber?: boolean; showDate?: boolean; showMesa?: boolean;
    showMesero?: boolean; showSubtotal?: boolean; showIva?: boolean;
    showDiscount?: boolean; showUnitPrice?: boolean;
  };
  onClose: () => void;
  onComplete: (method: 'efectivo' | 'tarjeta', amountPaid: number, loyaltyCustomerId?: string | null) => void;
}

// ─── Sub-types ────────────────────────────────────────────────────────────────

interface Person {
  id: number;
  name: string;
  method: 'efectivo' | 'tarjeta';
  cashInput: string;
  // itemSplit[itemId] = qty assigned to this person
  itemSplit: Record<string, number>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function personSubtotal(person: Person, items: OrderItemRef[], ivaRate: number): number {
  const base = Object.entries(person.itemSplit).reduce((s, [id, qty]) => {
    const item = items.find(i => i.id === id);
    return s + (item ? item.price * qty : 0);
  }, 0);
  return base * (1 + ivaRate);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PaymentModal({
  total, onClose, onComplete, orderNumber, mesa, mesero, items, subtotal, iva, discount,
  restaurantName, branchName, printerConfig,
}: PaymentModalProps) {

  const supabase = createClient();
  const { features } = useFeatures();
  const ivaRate = subtotal && subtotal > 0 ? (iva ?? 0) / subtotal : 0.16;

  // ── Load loyalty config from DB ───────────────────────────────────────────
  const [loyaltyConfig, setLoyaltyConfig] = React.useState({ pesosPerPoint: 10, pointValue: 0.50, minRedeem: 50, maxRedeemPct: 30 });
  React.useEffect(() => {
    if (!features.lealtad) return;
    supabase.from('system_config').select('config_key, config_value').like('config_key', 'loyalty_%')
      .then(({ data }) => {
        const m: Record<string, string> = {};
        (data || []).forEach((r: any) => { m[r.config_key] = r.config_value; });
        setLoyaltyConfig({
          pesosPerPoint: m['loyalty_pesos_per_point'] ? Number(m['loyalty_pesos_per_point']) : 10,
          pointValue:    m['loyalty_point_value']     ? Number(m['loyalty_point_value'])     : 0.50,
          minRedeem:     m['loyalty_min_redeem']      ? Number(m['loyalty_min_redeem'])      : 50,
          maxRedeemPct:  m['loyalty_max_redeem_pct']  ? Number(m['loyalty_max_redeem_pct'])  : 30,
        });
      });
  }, [features.lealtad]);

  // ── Loyalty customer search ──
  const [loyaltySearch, setLoyaltySearch] = useState('');
  const [loyaltyResults, setLoyaltyResults] = useState<{ id: string; name: string; phone: string; points: number }[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; name: string; phone: string; points: number } | null>(null);
  const [loyaltySearching, setLoyaltySearching] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (loyaltySearch.trim().length < 2) { setLoyaltyResults([]); return; }
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      setLoyaltySearching(true);
      const { data } = await supabase
        .from('loyalty_customers')
        .select('id, name, phone, points')
        .or(`name.ilike.%${loyaltySearch}%,phone.ilike.%${loyaltySearch}%`)
        .eq('is_active', true)
        .limit(5);
      setLoyaltyResults(data || []);
      setLoyaltySearching(false);
    }, 300);
  }, [loyaltySearch]);

  const POINTS_VALUE = loyaltyConfig.pointValue;
  const pointsToEarn = selectedCustomer ? Math.floor(total / 10) : 0;
  const [redeemPoints, setRedeemPoints] = useState(false);
  const maxRedeemPoints = Math.floor(total * loyaltyConfig.maxRedeemPct / 100 / POINTS_VALUE);
  const maxRedeemablePoints = selectedCustomer
    ? Math.min(selectedCustomer.points, maxRedeemPoints)
    : 0;
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const pointsDiscount = redeemPoints ? pointsToRedeem * POINTS_VALUE : 0;
  const effectiveTotal = Math.max(0, total - pointsDiscount);

  React.useEffect(() => { setRedeemPoints(false); setPointsToRedeem(0); }, [selectedCustomer]);
  // Modes: 'single' | 'split_amount' | 'split_items'
  const [mode, setMode] = useState<'single' | 'split_amount' | 'split_items'>('single');

  // ── Single payment ──
  const [method, setMethod] = useState<'efectivo' | 'tarjeta'>('efectivo');
  const [cashInput, setCashInput] = useState('');
  const [loading, setLoading] = useState(false);

  const printer = usePrinter();
  const [printing, setPrinting] = useState(false);

  const handlePrint = useCallback(async () => {
    if (!printer.supported) {
      alert('Impresión USB requiere Chrome o Edge. Conecta la impresora en Configuración → Impresora.');
      return;
    }
    if (printer.status !== 'connected') {
      const ok = await printer.connect();
      if (!ok) return;
    }
    setPrinting(true);
    const cashPaid = parseFloat(cashInput) || total;
    const ok = await printer.printTicket({
      restaurantName: restaurantName || 'Restaurante',
      branchName,
      headerLine1:  printerConfig?.headerLine1,
      headerLine2:  printerConfig?.headerLine2,
      orderNumber:  orderNumber || 'S/N',
      mesa:         mesa || '—',
      mesero:       mesero || '—',
      items:        (items ?? []).map(i => ({ name: i.name, qty: i.quantity, price: i.price, emoji: i.emoji })),
      subtotal:     subtotal ?? total,
      iva:          iva      ?? 0,
      discount:     discount ?? 0,
      total,
      payMethod:    method,
      amountPaid:   method === 'efectivo' ? cashPaid : undefined,
      change:       method === 'efectivo' && cashPaid > total ? cashPaid - total : undefined,
      footer:       printerConfig?.footerText,
      paperWidth:   printerConfig?.paperWidth ?? 80,
      autoCut:      printerConfig?.autoCut    ?? true,
      separatorChar:   printerConfig?.separatorChar,
      showOrderNumber: printerConfig?.showOrderNumber,
      showDate:        printerConfig?.showDate,
      showMesa:        printerConfig?.showMesa,
      showMesero:      printerConfig?.showMesero,
      showSubtotal:    printerConfig?.showSubtotal,
      showIva:         printerConfig?.showIva,
      showDiscount:    printerConfig?.showDiscount,
      showUnitPrice:   printerConfig?.showUnitPrice,
      copies: 1,
    });
    setPrinting(false);
    if (!ok && printer.error) alert('Error al imprimir: ' + printer.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [printer, cashInput, total, method, restaurantName, branchName, orderNumber,
      mesa, mesero, items, subtotal, iva, discount, printerConfig]);

  // ── Split by amount ──
  interface AmountPart { amount: string; method: 'efectivo' | 'tarjeta' }
  const [amountParts, setAmountParts] = useState<AmountPart[]>([
    { amount: '', method: 'efectivo' },
    { amount: '', method: 'efectivo' },
  ]);

  // ── Split by items ──
  const [persons, setPersons] = useState<Person[]>([
    { id: 1, name: 'Persona 1', method: 'efectivo', cashInput: '', itemSplit: {} },
    { id: 2, name: 'Persona 2', method: 'efectivo', cashInput: '', itemSplit: {} },
  ]);
  const [activePerson, setActivePerson] = useState<number>(1); // person id
  const [itemsStep, setItemsStep] = useState<'assign' | 'pay'>('assign');

  // Computed
  const cashAmount = parseFloat(cashInput) || 0;
  const change = method === 'efectivo' ? cashAmount - effectiveTotal : 0;

  const splitAmountTotal = amountParts.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const splitAmountRemaining = effectiveTotal - splitAmountTotal;
  const splitAmountValid = Math.abs(splitAmountRemaining) < 0.01 &&
    amountParts.every(p => parseFloat(p.amount) > 0);

  // Items assigned totals
  const personTotals = useMemo(() =>
    persons.map(p => ({ id: p.id, total: personSubtotal(p, items ?? [], ivaRate) })),
    [persons, items, ivaRate]
  );

  // Remaining qty per item (not yet assigned to anyone)
  const remainingQty = useMemo(() => {
    const rem: Record<string, number> = {};
    (items ?? []).forEach(item => { rem[item.id] = item.quantity; });
    persons.forEach(p => {
      Object.entries(p.itemSplit).forEach(([id, qty]) => {
        rem[id] = (rem[id] ?? 0) - qty;
      });
    });
    return rem;
  }, [persons, items]);

  const allItemsAssigned = useMemo(() =>
    (items ?? []).every(item => (remainingQty[item.id] ?? 0) === 0),
    [items, remainingQty]
  );

  const itemsGrandTotal = useMemo(() =>
    personTotals.reduce((s, p) => s + p.total, 0),
    [personTotals]
  );

  // ── Handlers ──

  const doRedeemIfNeeded = async () => {
    if (!redeemPoints || !selectedCustomer || pointsToRedeem <= 0) return;
    await supabase.from('loyalty_transactions').insert({
      customer_id: selectedCustomer.id,
      type: 'canje',
      points: pointsToRedeem,
      amount: pointsDiscount,
      notes: `Canje en cobro — descuento $${pointsDiscount.toFixed(2)}`,
    });
    await supabase.from('loyalty_customers')
      .update({ points: selectedCustomer.points - pointsToRedeem, updated_at: new Date().toISOString() })
      .eq('id', selectedCustomer.id);
  };

  const handleConfirmSingle = async () => {
    if (method === 'efectivo' && cashAmount < effectiveTotal) return;
    setLoading(true);
    await doRedeemIfNeeded();
    await new Promise(r => setTimeout(r, 300));
    setLoading(false);
    onComplete(method, method === 'efectivo' ? cashAmount : effectiveTotal, selectedCustomer?.id ?? null);
  };

  const handleConfirmSplitAmount = async () => {
    if (!splitAmountValid) return;
    setLoading(true);
    await doRedeemIfNeeded();
    await new Promise(r => setTimeout(r, 300));
    setLoading(false);
    onComplete(amountParts[0].method, effectiveTotal, selectedCustomer?.id ?? null);
  };

  const handleConfirmSplitItems = async () => {
    setLoading(true);
    await doRedeemIfNeeded();
    await new Promise(r => setTimeout(r, 300));
    setLoading(false);
    onComplete('efectivo', effectiveTotal, selectedCustomer?.id ?? null);
  };

  // Assign / remove qty from active person
  const assignItem = (itemId: string, delta: number) => {
    const item = (items ?? []).find(i => i.id === itemId);
    if (!item) return;
    setPersons(prev => prev.map(p => {
      if (p.id !== activePerson) return p;
      const current = p.itemSplit[itemId] ?? 0;
      const newQty = Math.max(0, Math.min(item.quantity, current + delta));
      // Check against remaining (available = remaining + current for this person)
      const available = (remainingQty[itemId] ?? 0) + current;
      const capped = Math.min(newQty, available);
      if (capped === 0) {
        const { [itemId]: _, ...rest } = p.itemSplit;
        return { ...p, itemSplit: rest };
      }
      return { ...p, itemSplit: { ...p.itemSplit, [itemId]: capped } };
    }));
  };

  const addPerson = () => {
    const newId = Math.max(0, ...persons.map(p => p.id)) + 1;
    setPersons(prev => [...prev, {
      id: newId, name: `Persona ${newId}`,
      method: 'efectivo', cashInput: '', itemSplit: {},
    }]);
  };

  const removePerson = (id: number) => {
    if (persons.length <= 2) return;
    setPersons(prev => prev.filter(p => p.id !== id));
    if (activePerson === id) setActivePerson(persons[0].id);
  };

  const now = new Date();
  const dateStr = now.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  const quickAmounts = [
    Math.ceil(effectiveTotal / 100) * 100,
    Math.ceil(effectiveTotal / 50) * 50,
    Math.ceil(effectiveTotal / 200) * 200,
    Math.ceil(effectiveTotal / 500) * 500,
  ].filter((v, i, arr) => arr.indexOf(v) === i && v >= effectiveTotal).slice(0, 4);

  // ── Method pill ──
  const MethodPill = ({ value, onChange }: { value: 'efectivo' | 'tarjeta'; onChange: (m: 'efectivo' | 'tarjeta') => void }) => (
    <div className="flex gap-1">
      {(['efectivo', 'tarjeta'] as const).map(m => (
        <button key={m} onClick={() => onChange(m)}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border transition-all"
          style={{ borderColor: value === m ? '#f59e0b' : '#e5e7eb', backgroundColor: value === m ? '#fffbeb' : 'white', color: value === m ? '#92400e' : '#9ca3af' }}>
          {m === 'efectivo' ? <Banknote size={11} /> : <CreditCard size={11} />}
          {m === 'efectivo' ? 'Efectivo' : 'Tarjeta'}
        </button>
      ))}
    </div>
  );

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '560px' }}>

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
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {mesa && `${mesa} · `}{dateStr} · {timeStr}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">

          {/* Total */}
          <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Total a cobrar</p>
            {pointsDiscount > 0 ? (
              <>
                <p className="font-mono text-lg line-through text-gray-400">${total.toFixed(2)}</p>
                <p className="font-mono font-bold text-3xl" style={{ color: '#15803d' }}>${effectiveTotal.toFixed(2)}</p>
                <p className="text-xs font-semibold text-green-600 mt-0.5">− ${pointsDiscount.toFixed(2)} en puntos canjeados</p>
              </>
            ) : (
              <p className="font-mono font-bold text-3xl" style={{ color: '#1B3A6B' }}>${total.toFixed(2)}</p>
            )}
          </div>

          {/* ── LEALTAD ── */}
          {features.lealtad && (
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: selectedCustomer ? '#fde68a' : '#e5e7eb', backgroundColor: selectedCustomer ? '#fffdf5' : 'white' }}>
            <div className="flex items-center gap-2 px-3 py-2.5" style={{ borderBottom: '1px solid', borderColor: selectedCustomer ? '#fde68a' : '#f3f4f6' }}>
              <Star size={14} style={{ color: '#d97706' }} />
              <span className="text-xs font-semibold text-amber-800">Programa de Lealtad</span>
              {selectedCustomer && (
                <button onClick={() => { setSelectedCustomer(null); setLoyaltySearch(''); setLoyaltyResults([]); }}
                  className="ml-auto text-gray-400 hover:text-gray-600">
                  <XCircle size={14} />
                </button>
              )}
            </div>

            {selectedCustomer ? (
              <div className="px-3 pb-3 space-y-2.5">
                <div className="flex items-center gap-3 pt-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ backgroundColor: '#f59e0b', color: '#1B3A6B' }}>
                    {selectedCustomer.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{selectedCustomer.name}</p>
                    <p className="text-xs text-gray-500">
                      {selectedCustomer.points} pts disponibles
                      {!redeemPoints && pointsToEarn > 0 && <span className="text-green-600"> · +{pointsToEarn} pts esta compra</span>}
                    </p>
                  </div>
                  <UserCheck size={16} style={{ color: '#10b981' }} />
                </div>

                {selectedCustomer.points >= loyaltyConfig.minRedeem && (
                  <div className="rounded-lg border overflow-hidden" style={{ borderColor: redeemPoints ? '#fde68a' : '#e5e7eb' }}>
                    <button
                      onClick={() => { setRedeemPoints(r => !r); setPointsToRedeem(0); }}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold transition-colors"
                      style={{ backgroundColor: redeemPoints ? '#fffbeb' : '#f9fafb' }}
                    >
                      <span style={{ color: redeemPoints ? '#92400e' : '#6b7280' }}>🎁 Canjear puntos como descuento</span>
                      <div className="w-9 h-5 rounded-full flex items-center px-0.5 transition-all"
                        style={{ backgroundColor: redeemPoints ? '#f59e0b' : '#d1d5db' }}>
                        <div className="w-4 h-4 rounded-full bg-white shadow transition-transform"
                          style={{ transform: redeemPoints ? 'translateX(16px)' : 'translateX(0)' }} />
                      </div>
                    </button>

                    {redeemPoints && (
                      <div className="px-3 pb-3 pt-2 space-y-2" style={{ backgroundColor: '#fffbeb' }}>
                        <div className="flex items-center justify-between text-xs text-amber-700">
                          <span>Puntos a canjear: <strong>{pointsToRedeem}</strong></span>
                          <span>Descuento: <strong className="text-green-700">${pointsDiscount.toFixed(2)}</strong></span>
                        </div>
                        <input
                          type="range" min={0} max={maxRedeemablePoints} value={pointsToRedeem}
                          onChange={e => setPointsToRedeem(Number(e.target.value))}
                          className="w-full accent-amber-500"
                        />
                        <div className="flex justify-between text-xs text-amber-600">
                          <span>0 pts</span>
                          <span>{maxRedeemablePoints} pts máx (${(maxRedeemablePoints * POINTS_VALUE).toFixed(2)})</span>
                        </div>
                        {pointsToRedeem > 0 && (
                          <div className="flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-semibold"
                            style={{ backgroundColor: '#dcfce7', color: '#15803d' }}>
                            <span>Total con descuento</span>
                            <span className="font-mono">${effectiveTotal.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="px-3 py-2.5">
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text" value={loyaltySearch} onChange={e => setLoyaltySearch(e.target.value)}
                    placeholder="Buscar cliente por nombre o teléfono…"
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-amber-300"
                    style={{ borderColor: '#e5e7eb' }}
                  />
                  {loyaltySearching && (
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 animate-spin"
                      style={{ borderColor: 'rgba(0,0,0,0.1)', borderTopColor: '#f59e0b' }} />
                  )}
                </div>
                {loyaltyResults.length > 0 && (
                  <div className="mt-1.5 rounded-lg border overflow-hidden" style={{ borderColor: '#e5e7eb' }}>
                    {loyaltyResults.map(c => (
                      <button key={c.id}
                        onClick={() => { setSelectedCustomer(c); setLoyaltySearch(''); setLoyaltyResults([]); }}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-amber-50 transition-colors"
                        style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <span className="font-medium text-gray-800">{c.name}</span>
                        <span className="text-gray-400">{c.phone} · <span className="text-amber-600 font-semibold">{c.points} pts</span></span>
                      </button>
                    ))}
                  </div>
                )}
                {loyaltySearch.trim().length >= 2 && !loyaltySearching && loyaltyResults.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1.5 text-center">Sin resultados.</p>
                )}
              </div>
            )}
          </div>
          )}

          {/* Mode selector */}
          <div className="flex gap-2">
            {[
              { key: 'single', label: 'Pago completo', icon: <Check size={13} /> },
              { key: 'split_amount', label: 'Dividir monto', icon: <Split size={13} /> },
              { key: 'split_items', label: 'Por platillos', icon: <Users size={13} /> },
            ].map(({ key, label, icon }) => (
              <button key={key} onClick={() => setMode(key as any)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border-2 transition-all"
                style={{
                  borderColor: mode === key ? '#f59e0b' : '#e5e7eb',
                  backgroundColor: mode === key ? '#fffbeb' : 'white',
                  color: mode === key ? '#92400e' : '#6b7280',
                }}>
                {icon} {label}
              </button>
            ))}
          </div>

          {/* ══ PAGO COMPLETO ══ */}
          {mode === 'single' && (
            <>
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Método de pago</p>
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
                        <p className="text-sm font-semibold capitalize" style={{ color: method === m ? '#92400e' : '#374151' }}>
                          {m === 'efectivo' ? 'Efectivo' : 'Tarjeta'}
                        </p>
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
              {method === 'efectivo' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Efectivo recibido</label>
                  <input type="number" placeholder={`Mínimo $${effectiveTotal.toFixed(2)}`}
                    value={cashInput} onChange={e => setCashInput(e.target.value)}
                    className="input-field text-lg font-mono font-bold text-center py-3" min={effectiveTotal} />
                  <div className="flex gap-2 mt-2">
                    {quickAmounts.map(amt => (
                      <button key={amt} onClick={() => setCashInput(String(amt))}
                        className="flex-1 py-2 rounded-lg text-xs font-semibold transition-colors"
                        style={{ backgroundColor: cashInput === String(amt) ? '#fef3c7' : '#f3f4f6', color: cashInput === String(amt) ? '#92400e' : '#6b7280' }}>
                        ${amt}
                      </button>
                    ))}
                  </div>
                  {cashAmount >= effectiveTotal && (
                    <div className="mt-3 px-4 py-3 rounded-xl flex items-center justify-between"
                      style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac' }}>
                      <span className="text-sm font-semibold text-green-700">Cambio</span>
                      <span className="font-mono font-bold text-green-700 text-lg">${change.toFixed(2)}</span>
                    </div>
                  )}
                  {cashInput && cashAmount < effectiveTotal && (
                    <div className="mt-3 px-4 py-2.5 rounded-xl"
                      style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5' }}>
                      <span className="text-xs text-red-600">Faltan ${(effectiveTotal - cashAmount).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ══ DIVIDIR POR MONTO ══ */}
          {mode === 'split_amount' && (
            <div className="space-y-3">
              {amountParts.map((part, i) => (
                <div key={i} className="p-3 rounded-xl border" style={{ borderColor: '#e5e7eb', backgroundColor: '#f9fafb' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-gray-500">Persona {i + 1}</span>
                    {amountParts.length > 2 && (
                      <button onClick={() => setAmountParts(p => p.filter((_, idx) => idx !== i))}
                        className="ml-auto text-xs text-red-400 hover:text-red-600">Quitar</button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input type="number" placeholder="$0.00" value={part.amount}
                      onChange={e => setAmountParts(prev => prev.map((p, idx) => idx === i ? { ...p, amount: e.target.value } : p))}
                      className="input-field flex-1 font-mono font-bold text-sm py-2" min={0} />
                    <MethodPill value={part.method} onChange={m => setAmountParts(prev => prev.map((p, idx) => idx === i ? { ...p, method: m } : p))} />
                  </div>
                </div>
              ))}
              <button onClick={() => setAmountParts(p => [...p, { amount: '', method: 'efectivo' }])}
                className="w-full py-2 rounded-xl text-xs font-semibold border-2 border-dashed transition-all"
                style={{ borderColor: '#d1d5db', color: '#6b7280' }}>
                + Agregar persona
              </button>
              <div className="flex items-center justify-between px-3 py-2 rounded-xl"
                style={{
                  backgroundColor: splitAmountRemaining === 0 ? '#f0fdf4' : splitAmountRemaining < 0 ? '#fef2f2' : '#fefce8',
                  border: `1px solid ${splitAmountRemaining === 0 ? '#86efac' : splitAmountRemaining < 0 ? '#fca5a5' : '#fde68a'}`,
                }}>
                <span className="text-xs font-semibold" style={{ color: splitAmountRemaining === 0 ? '#15803d' : splitAmountRemaining < 0 ? '#dc2626' : '#92400e' }}>
                  {splitAmountRemaining === 0 ? '✓ Total cubierto' : splitAmountRemaining > 0 ? `Falta $${splitAmountRemaining.toFixed(2)}` : `Excede $${Math.abs(splitAmountRemaining).toFixed(2)}`}
                </span>
                <span className="font-mono text-xs font-bold" style={{ color: '#1B3A6B' }}>
                  ${splitAmountTotal.toFixed(2)} / ${effectiveTotal.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* ══ DIVIDIR POR PLATILLOS ══ */}
          {mode === 'split_items' && (
            <>
              {itemsStep === 'assign' && (
                <div className="space-y-3">
                  {/* Personas tabs */}
                  <div className="flex gap-2 flex-wrap">
                    {persons.map(p => {
                      const pt = personTotals.find(t => t.id === p.id);
                      const isActive = activePerson === p.id;
                      return (
                        <button key={p.id} onClick={() => setActivePerson(p.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all"
                          style={{ borderColor: isActive ? '#f59e0b' : '#e5e7eb', backgroundColor: isActive ? '#fffbeb' : 'white', color: isActive ? '#92400e' : '#6b7280' }}>
                          <span>{p.name}</span>
                          {pt && pt.total > 0 && (
                            <span className="font-mono" style={{ color: isActive ? '#d97706' : '#9ca3af' }}>
                              ${pt.total.toFixed(0)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                    <button onClick={addPerson}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold border-2 border-dashed"
                      style={{ borderColor: '#d1d5db', color: '#6b7280' }}>
                      + Persona
                    </button>
                    {persons.length > 2 && (
                      <button onClick={() => removePerson(activePerson)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold"
                        style={{ backgroundColor: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5' }}>
                        Quitar
                      </button>
                    )}
                  </div>

                  {/* Edit name */}
                  <div>
                    <input
                      className="input-field text-sm w-full"
                      value={persons.find(p => p.id === activePerson)?.name ?? ''}
                      onChange={e => setPersons(prev => prev.map(p => p.id === activePerson ? { ...p, name: e.target.value } : p))}
                      placeholder="Nombre (ej: Carlos, Mesa del fondo...)"
                    />
                  </div>

                  {/* Items list */}
                  {(items ?? []).length === 0 ? (
                    <p className="text-xs text-center text-gray-400 py-4">Sin platillos en la orden</p>
                  ) : (
                    <div className="space-y-2">
                      {(items ?? []).map(item => {
                        const activePersonData = persons.find(p => p.id === activePerson)!;
                        const assignedToActive = activePersonData?.itemSplit[item.id] ?? 0;
                        const remaining = remainingQty[item.id] ?? 0;
                        const canAdd = remaining > 0;
                        const canRemove = assignedToActive > 0;

                        return (
                          <div key={item.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                            style={{
                              backgroundColor: assignedToActive > 0 ? '#fffbeb' : '#f9fafb',
                              border: `1px solid ${assignedToActive > 0 ? '#fde68a' : '#f3f4f6'}`,
                            }}>
                            <span className="text-lg w-7 text-center flex-shrink-0">{item.emoji || '🍽️'}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-800 truncate">{item.name}</p>
                              <p className="text-xs text-gray-400">
                                ${item.price.toFixed(2)} c/u ·{' '}
                                <span style={{ color: remaining === 0 ? '#22c55e' : '#f59e0b' }}>
                                  {remaining === 0 ? '✓ asignado' : `${remaining} sin asignar`}
                                </span>
                              </p>
                            </div>
                            {/* Counter */}
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button onClick={() => assignItem(item.id, -1)} disabled={!canRemove}
                                className="w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-30 transition-all"
                                style={{ backgroundColor: canRemove ? '#fee2e2' : '#f3f4f6', color: canRemove ? '#ef4444' : '#9ca3af' }}>
                                <Minus size={13} />
                              </button>
                              <span className="w-6 text-center text-sm font-bold" style={{ color: assignedToActive > 0 ? '#d97706' : '#9ca3af' }}>
                                {assignedToActive}
                              </span>
                              <button onClick={() => assignItem(item.id, 1)} disabled={!canAdd}
                                className="w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-30 transition-all"
                                style={{ backgroundColor: canAdd ? '#dcfce7' : '#f3f4f6', color: canAdd ? '#22c55e' : '#9ca3af' }}>
                                <Plus size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Summary bar */}
                  <div className="rounded-xl px-4 py-3 space-y-1.5" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500">Resumen de asignaciones</span>
                      <span className={`text-xs font-bold ${allItemsAssigned ? 'text-green-600' : 'text-amber-600'}`}>
                        {allItemsAssigned ? '✓ Todo asignado' : 'Pendiente de asignar'}
                      </span>
                    </div>
                    {persons.map(p => {
                      const pt = personTotals.find(t => t.id === p.id);
                      const itemCount = Object.values(p.itemSplit).reduce((s, q) => s + q, 0);
                      if (itemCount === 0) return null;
                      return (
                        <div key={p.id} className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">{p.name} ({itemCount} plato{itemCount !== 1 ? 's' : ''})</span>
                          <span className="text-xs font-bold font-mono" style={{ color: '#1B3A6B' }}>
                            ${(pt?.total ?? 0).toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                    <div className="flex items-center justify-between pt-1 border-t" style={{ borderColor: '#e2e8f0' }}>
                      <span className="text-xs font-semibold text-gray-700">Total asignado</span>
                      <span className="text-xs font-bold font-mono" style={{ color: '#1B3A6B' }}>
                        ${itemsGrandTotal.toFixed(2)} / ${total.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Proceed to payment step */}
                  <button
                    onClick={() => setItemsStep('pay')}
                    disabled={!allItemsAssigned}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ backgroundColor: allItemsAssigned ? '#1B3A6B' : '#e5e7eb', color: allItemsAssigned ? 'white' : '#9ca3af' }}>
                    Continuar al cobro <ChevronRight size={15} />
                  </button>
                </div>
              )}

              {itemsStep === 'pay' && (
                <div className="space-y-3">
                  <button onClick={() => setItemsStep('assign')}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors">
                    <ArrowLeft size={13} /> Volver a asignar platillos
                  </button>

                  <p className="text-sm font-semibold text-gray-700">Cobrar por persona</p>

                  {persons.map(p => {
                    const pt = personTotals.find(t => t.id === p.id);
                    const myTotal = pt?.total ?? 0;
                    if (myTotal === 0) return null;
                    const cashVal = parseFloat(p.cashInput) || 0;
                    const myChange = p.method === 'efectivo' ? cashVal - myTotal : 0;
                    const itemCount = Object.values(p.itemSplit).reduce((s, q) => s + q, 0);
                    return (
                      <div key={p.id} className="rounded-xl border overflow-hidden" style={{ borderColor: '#e5e7eb' }}>
                        <div className="flex items-center justify-between px-4 py-2.5"
                          style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                          <div>
                            <p className="text-sm font-bold text-gray-800">{p.name}</p>
                            <p className="text-xs text-gray-400">{itemCount} plato{itemCount !== 1 ? 's' : ''}</p>
                          </div>
                          <p className="font-mono font-bold text-lg" style={{ color: '#1B3A6B' }}>${myTotal.toFixed(2)}</p>
                        </div>
                        <div className="p-3 space-y-2">
                          <MethodPill
                            value={p.method}
                            onChange={m => setPersons(prev => prev.map(pp => pp.id === p.id ? { ...pp, method: m } : pp))}
                          />
                          {p.method === 'efectivo' && (
                            <>
                              <input type="number" placeholder={`Mínimo $${myTotal.toFixed(2)}`}
                                value={p.cashInput}
                                onChange={e => setPersons(prev => prev.map(pp => pp.id === p.id ? { ...pp, cashInput: e.target.value } : pp))}
                                className="input-field w-full font-mono text-sm py-2 text-center" />
                              {cashVal >= myTotal && (
                                <div className="flex items-center justify-between px-3 py-1.5 rounded-lg"
                                  style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac' }}>
                                  <span className="text-xs text-green-700">Cambio</span>
                                  <span className="text-xs font-bold font-mono text-green-700">${myChange.toFixed(2)}</span>
                                </div>
                              )}
                              {p.cashInput && cashVal < myTotal && (
                                <p className="text-xs text-red-500 text-center">Faltan ${(myTotal - cashVal).toFixed(2)}</p>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 border-t" style={{ borderColor: '#f3f4f6' }}>
          <button
            onClick={handlePrint}
            disabled={printing || printer.status === 'printing'}
            className="btn-secondary flex items-center gap-2 text-xs disabled:opacity-50"
            title={printer.status === 'connected' ? `Impresora: ${printer.device?.name}` : 'Clic para conectar impresora'}
          >
            {printing || printer.status === 'printing'
              ? <div className="w-3 h-3 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(0,0,0,0.15)', borderTopColor: '#374151' }} />
              : <Printer size={14} />}
            {printing ? 'Imprimiendo...' : printer.status === 'connected' ? 'Imprimir ticket' : 'Imprimir ticket'}
          </button>
          <div className="flex-1" />
          <button onClick={onClose} className="btn-secondary">Cancelar</button>

          {mode === 'single' && (
            <button onClick={handleConfirmSingle}
              disabled={loading || (method === 'efectivo' && cashAmount < effectiveTotal)}
              className="btn-primary flex items-center gap-2 disabled:opacity-50">
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={16} />}
              {loading ? 'Procesando...' : 'Confirmar pago'}
            </button>
          )}
          {mode === 'split_amount' && (
            <button onClick={handleConfirmSplitAmount}
              disabled={loading || !splitAmountValid}
              className="btn-primary flex items-center gap-2 disabled:opacity-50">
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={16} />}
              {loading ? 'Procesando...' : 'Confirmar pago'}
            </button>
          )}
          {mode === 'split_items' && (
            <button onClick={handleConfirmSplitItems}
              disabled={loading || !allItemsAssigned || ((items?.length ?? 0) > 0 && itemsStep === 'assign')}
              className="btn-primary flex items-center gap-2 disabled:opacity-50">
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={16} />}
              {loading ? 'Procesando...' : 'Confirmar cobro'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}