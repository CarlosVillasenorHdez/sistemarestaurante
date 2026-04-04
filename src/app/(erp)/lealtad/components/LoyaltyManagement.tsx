'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Star, Plus, Search, Gift, TrendingUp, Users, Award, X, ArrowUpCircle, ArrowDownCircle, History } from 'lucide-react';

interface LoyaltyCustomer {
  id: string;
  name: string;
  phone: string;
  email: string;
  points: number;
  totalSpent: number;
  totalVisits: number;
  isActive: boolean;
}

interface LoyaltyTransaction {
  id: string;
  customerId: string;
  type: 'acumulacion' | 'canje';
  points: number;
  amount: number;
  notes: string;
  createdAt: string;
}

// Config loaded dynamically from system_config — see loadLoyaltyConfig()
const DEFAULT_PESOS_PER_POINT = 10;
const DEFAULT_POINTS_VALUE = 0.5;

export default function LoyaltyManagement() {
  const supabase = createClient();

  // ── Loyalty config from system_config ────────────────────────────────────
  const [programName, setProgramName] = useState('Club de Puntos');
  const [pesosPerPoint, setPesosPerPoint] = useState(DEFAULT_PESOS_PER_POINT);
  const [pointValue, setPointValue] = useState(DEFAULT_POINTS_VALUE);
  const [minRedeem, setMinRedeem] = useState(50);
  const [levels, setLevels] = useState<{name:string;min:number;color:string;benefit:string}[]>([]);

  useEffect(() => {
    supabase.from('system_config')
      .select('config_key, config_value')
      .like('config_key', 'loyalty_%')
      .then(({ data }) => {
        const map: Record<string, string> = {};
        (data || []).forEach((r: any) => { map[r.config_key] = r.config_value; });
        if (map['loyalty_program_name'])    setProgramName(map['loyalty_program_name']);
        if (map['loyalty_pesos_per_point']) setPesosPerPoint(Number(map['loyalty_pesos_per_point']));
        if (map['loyalty_point_value'])     setPointValue(Number(map['loyalty_point_value']));
        if (map['loyalty_min_redeem'])      setMinRedeem(Number(map['loyalty_min_redeem']));
        if (map['loyalty_levels']) {
          try { setLevels(JSON.parse(map['loyalty_levels'])); } catch {}
        }
      });
  }, []);

  const [customers, setCustomers] = useState<LoyaltyCustomer[]>([]);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<LoyaltyCustomer | null>(null);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showTransaction, setShowTransaction] = useState<'acumulacion' | 'canje' | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [customerForm, setCustomerForm] = useState({ name: '', phone: '', email: '' });
  const [txForm, setTxForm] = useState({ amount: 0, notes: '' });
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('loyalty_customers').select('*').order('points', { ascending: false });
      if (error) throw error;
      setCustomers((data || []).map((c: any) => ({
        id: c.id, name: c.name, phone: c.phone, email: c.email,
        points: c.points, totalSpent: Number(c.total_spent), totalVisits: c.total_visits, isActive: c.is_active,
      })));
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  const loadTransactions = async (customerId: string) => {
    const { data } = await supabase
      .from('loyalty_transactions')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(20);
    setTransactions((data || []).map((t: any) => ({
      id: t.id, customerId: t.customer_id, type: t.type,
      points: t.points, amount: Number(t.amount), notes: t.notes, createdAt: t.created_at,
    })));
  };

  const handleAddCustomer = async () => {
    if (!customerForm.name.trim()) { toast.error('El nombre es obligatorio'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('loyalty_customers').insert({
        name: customerForm.name.trim(), phone: customerForm.phone, email: customerForm.email,
      });
      if (error) throw error;
      toast.success('Cliente registrado en programa de lealtad');
      setShowAddCustomer(false);
      setCustomerForm({ name: '', phone: '', email: '' });
      loadData();
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTransaction = async () => {
    if (!selectedCustomer || !showTransaction) return;
    if (txForm.amount <= 0) { toast.error('Ingresa un monto válido'); return; }

    let points = 0;
    if (showTransaction === 'acumulacion') {
      points = Math.floor(txForm.amount / pesosPerPoint);
    } else {
      points = Math.floor(txForm.amount / pointValue);
      if (points > selectedCustomer.points) {
        toast.error(`El cliente solo tiene ${selectedCustomer.points} puntos disponibles`);
        return;
      }
    }

    if (points === 0) { toast.error('El monto no genera puntos suficientes'); return; }

    setSaving(true);
    try {
      const newPoints = showTransaction === 'acumulacion'
        ? selectedCustomer.points + points
        : selectedCustomer.points - points;

      await supabase.from('loyalty_transactions').insert({
        customer_id: selectedCustomer.id,
        type: showTransaction,
        points,
        amount: txForm.amount,
        notes: txForm.notes,
      });

      await supabase.from('loyalty_customers').update({
        points: newPoints,
        total_spent: showTransaction === 'acumulacion' ? selectedCustomer.totalSpent + txForm.amount : selectedCustomer.totalSpent,
        total_visits: showTransaction === 'acumulacion' ? selectedCustomer.totalVisits + 1 : selectedCustomer.totalVisits,
        updated_at: new Date().toISOString(),
      }).eq('id', selectedCustomer.id);

      toast.success(showTransaction === 'acumulacion'
        ? `+${points} puntos acumulados`
        : `${points} puntos canjeados por $${(points * pointValue).toFixed(2)}`
      );
      setShowTransaction(null);
      setTxForm({ amount: 0, notes: '' });
      loadData();
      setSelectedCustomer({ ...selectedCustomer, points: newPoints });
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalPoints = customers.reduce((s, c) => s + c.points, 0);
  const totalMembers = customers.filter(c => c.isActive).length;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#f59e0b' }} /></div>;
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Miembros Activos', value: totalMembers, icon: Users, color: '#1B3A6B' },
          { label: 'Puntos en Circulación', value: totalPoints.toLocaleString(), icon: Star, color: '#f59e0b' },
          { label: 'Valor en Puntos', value: `$${(totalPoints * pointValue).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, icon: Gift, color: '#10b981' },
          { label: 'Visitas Totales', value: customers.reduce((s, c) => s + c.totalVisits, 0), icon: TrendingUp, color: '#8b5cf6' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: k.color + '15' }}>
              <k.icon size={20} style={{ color: k.color }} />
            </div>
            <div>
              <p className="text-xs text-gray-500">{k.label}</p>
              <p className="text-lg font-bold text-gray-800">{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Rules info */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Star size={16} className="text-amber-600" />
          <span className="text-sm font-medium text-amber-800">Reglas del Programa</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs text-amber-700">
          <span>• 1 punto por cada ${pesosPerPoint} pesos gastados</span>
          <span>• Cada punto vale $${pointValue.toFixed(2)} al canjear</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar cliente..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <button onClick={() => setShowAddCustomer(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#1B3A6B' }}>
          <Plus size={16} /> Nuevo Miembro
        </button>
      </div>

      {/* Add Customer Modal */}
      {showAddCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Nuevo Miembro</h3>
              <button onClick={() => setShowAddCustomer(false)} className="p-2 rounded-lg hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              {[
                { key: 'name', label: 'Nombre *', type: 'text', placeholder: 'Juan García' },
                { key: 'phone', label: 'Teléfono', type: 'tel', placeholder: '555-0001' },
                { key: 'email', label: 'Email', type: 'email', placeholder: 'cliente@email.com' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                  <input type={f.type} value={(customerForm as any)[f.key]} onChange={e => setCustomerForm({ ...customerForm, [f.key]: e.target.value })} placeholder={f.placeholder} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={handleAddCustomer} disabled={saving} className="flex-1 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: '#1B3A6B' }}>
                {saving ? 'Guardando...' : 'Registrar'}
              </button>
              <button onClick={() => setShowAddCustomer(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 bg-gray-100">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      {showTransaction && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">
                {showTransaction === 'acumulacion' ? '⭐ Acumular Puntos' : '🎁 Canjear Puntos'}
              </h3>
              <button onClick={() => setShowTransaction(null)} className="p-2 rounded-lg hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 mb-4">
              <p className="text-sm font-medium text-gray-800">{selectedCustomer.name}</p>
              <p className="text-xs text-gray-500">Puntos actuales: <span className="font-bold text-amber-600">{selectedCustomer.points.toLocaleString()}</span></p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {showTransaction === 'acumulacion' ? 'Monto de la compra ($)' : 'Monto a descontar ($)'}
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={txForm.amount || ''}
                  onChange={e => setTxForm({ ...txForm, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="0.00"
                />
                {txForm.amount > 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    {showTransaction === 'acumulacion'
                      ? `= ${Math.floor(txForm.amount / pesosPerPoint)} puntos a acumular`
                      : `= ${Math.floor(txForm.amount / pointValue)} puntos a canjear`
                    }
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notas (opcional)</label>
                <input type="text" value={txForm.notes} onChange={e => setTxForm({ ...txForm, notes: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" placeholder="Orden #123..." />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleTransaction}
                disabled={saving}
                className="flex-1 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: showTransaction === 'acumulacion' ? '#f59e0b' : '#10b981' }}
              >
                {saving ? 'Procesando...' : showTransaction === 'acumulacion' ? 'Acumular' : 'Canjear'}
              </button>
              <button onClick={() => setShowTransaction(null)} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 bg-gray-100">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">Historial — {selectedCustomer.name}</h3>
              <button onClick={() => setShowHistory(false)} className="p-2 rounded-lg hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="p-4 space-y-2">
              {transactions.length === 0 ? (
                <p className="text-center text-gray-400 py-8">Sin transacciones</p>
              ) : (
                transactions.map(t => (
                  <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                    {t.type === 'acumulacion'
                      ? <ArrowUpCircle size={18} className="text-amber-500 flex-shrink-0" />
                      : <ArrowDownCircle size={18} className="text-green-500 flex-shrink-0" />
                    }
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">
                        {t.type === 'acumulacion' ? '+' : '-'}{t.points} puntos
                      </p>
                      <p className="text-xs text-gray-500">{t.notes || (t.type === 'acumulacion' ? 'Compra' : 'Canje')}</p>
                    </div>
                    <span className="text-xs text-gray-400">{new Date(t.createdAt).toLocaleDateString('es-MX')}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Customer list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-400 shadow-sm border border-gray-100">
            <Award size={40} className="mx-auto mb-3 opacity-30" />
            <p>Sin miembros registrados</p>
          </div>
        ) : (
          filtered.map(customer => (
            <div key={customer.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold text-lg" style={{ backgroundColor: '#1B3A6B' }}>
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-800">{customer.name}</span>
                  {customer.points >= 500 && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">⭐ VIP</span>}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  {customer.phone && <span>{customer.phone}</span>}
                  <span>{customer.totalVisits} visitas</span>
                  <span>${customer.totalSpent.toLocaleString('es-MX', { minimumFractionDigits: 2 })} gastados</span>
                </div>
              </div>
              <div className="text-center flex-shrink-0">
                <div className="text-2xl font-bold" style={{ color: '#f59e0b' }}>{customer.points.toLocaleString()}</div>
                <div className="text-xs text-gray-400">puntos</div>
              </div>
              <div className="flex flex-col gap-1.5 flex-shrink-0">
                <button
                  onClick={() => { setSelectedCustomer(customer); setShowTransaction('acumulacion'); setTxForm({ amount: 0, notes: '' }); }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                  style={{ backgroundColor: '#f59e0b' }}
                >
                  <ArrowUpCircle size={12} /> Acumular
                </button>
                <button
                  onClick={() => { setSelectedCustomer(customer); setShowTransaction('canje'); setTxForm({ amount: 0, notes: '' }); }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                  style={{ backgroundColor: '#10b981' }}
                >
                  <Gift size={12} /> Canjear
                </button>
                <button
                  onClick={() => { setSelectedCustomer(customer); loadTransactions(customer.id); setShowHistory(true); }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200"
                >
                  <History size={12} /> Historial
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}