'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Building2, Plus, TrendingUp, ShoppingCart, Users, Edit2, Trash2, X, Check, AlertTriangle, BarChart3, MapPin, Phone, Mail } from 'lucide-react';

interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  managerName: string;
  isActive: boolean;
}

interface BranchStats {
  branchId: string;
  branchName: string;
  totalOrders: number;
  totalRevenue: number;
  avgTicket: number;
  lowStockItems: number;
}

const emptyBranch: Omit<Branch, 'id'> = {
  name: '', address: '', phone: '', email: '', managerName: '', isActive: true,
};

export default function SucursalesManagement() {
  const supabase = createClient();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [stats, setStats] = useState<BranchStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Branch, 'id'>>(emptyBranch);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'branches'>('overview');

  const loadBranches = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .order('name');
      if (error) throw error;
      const mapped: Branch[] = (data || []).map((b: any) => ({
        id: b.id,
        name: b.name,
        address: b.address,
        phone: b.phone,
        email: b.email,
        managerName: b.manager_name,
        isActive: b.is_active,
      }));
      setBranches(mapped);

      // Load consolidated stats from orders
      const { data: orders } = await supabase
        .from('orders')
        .select('branch, total, status')
        .eq('status', 'cerrada');

      const { data: ingredients } = await supabase
        .from('ingredients')
        .select('name, stock, min_stock');

      const lowStock = (ingredients || []).filter((i: any) => Number(i.stock) <= Number(i.min_stock)).length;

      // Group orders by branch
      const branchMap: Record<string, { total: number; count: number }> = {};
      (orders || []).forEach((o: any) => {
        const b = o.branch || 'Sin sucursal';
        if (!branchMap[b]) branchMap[b] = { total: 0, count: 0 };
        branchMap[b].total += Number(o.total);
        branchMap[b].count += 1;
      });

      const branchStats: BranchStats[] = mapped.map((b) => {
        const s = branchMap[b.name] || { total: 0, count: 0 };
        return {
          branchId: b.id,
          branchName: b.name,
          totalOrders: s.count,
          totalRevenue: s.total,
          avgTicket: s.count > 0 ? s.total / s.count : 0,
          lowStockItems: lowStock,
        };
      });
      setStats(branchStats);
    } catch (err: any) {
      toast.error('Error al cargar sucursales: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { loadBranches(); }, [loadBranches]);

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('El nombre es obligatorio'); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        address: form.address,
        phone: form.phone,
        email: form.email,
        manager_name: form.managerName,
        is_active: form.isActive,
        updated_at: new Date().toISOString(),
      };
      if (editingId) {
        const { error } = await supabase.from('branches').update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success('Sucursal actualizada');
      } else {
        const { error } = await supabase.from('branches').insert(payload);
        if (error) throw error;
        toast.success('Sucursal creada');
      }
      setShowForm(false);
      setEditingId(null);
      setForm(emptyBranch);
      loadBranches();
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (b: Branch) => {
    setForm({ name: b.name, address: b.address, phone: b.phone, email: b.email, managerName: b.managerName, isActive: b.isActive });
    setEditingId(b.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta sucursal?')) return;
    const { error } = await supabase.from('branches').delete().eq('id', id);
    if (error) { toast.error('Error: ' + error.message); return; }
    toast.success('Sucursal eliminada');
    loadBranches();
  };

  const totalRevenue = stats.reduce((s, b) => s + b.totalRevenue, 0);
  const totalOrders = stats.reduce((s, b) => s + b.totalOrders, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#f59e0b' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b" style={{ borderColor: '#e5e7eb' }}>
        {(['overview', 'branches'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {tab === 'overview' ? '📊 Vista Consolidada' : '🏢 Sucursales'}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Sucursales Activas', value: branches.filter(b => b.isActive).length, icon: Building2, color: '#1B3A6B' },
              { label: 'Órdenes Totales', value: totalOrders, icon: ShoppingCart, color: '#10b981' },
              { label: 'Ingresos Totales', value: `$${totalRevenue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: '#f59e0b' },
              { label: 'Ticket Promedio', value: totalOrders > 0 ? `$${(totalRevenue / totalOrders).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '$0.00', icon: BarChart3, color: '#8b5cf6' },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: kpi.color + '15' }}>
                    <kpi.icon size={20} style={{ color: kpi.color }} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{kpi.label}</p>
                    <p className="text-lg font-bold text-gray-800">{kpi.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Per-branch breakdown */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">Rendimiento por Sucursal</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Sucursal</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Órdenes</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Ingresos</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Ticket Prom.</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Inventario Bajo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {stats.map((s) => (
                    <tr key={s.branchId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Building2 size={16} style={{ color: '#1B3A6B' }} />
                          <span className="font-medium text-gray-800">{s.branchName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-gray-700">{s.totalOrders}</td>
                      <td className="px-6 py-4 text-right font-medium text-gray-800">
                        ${s.totalRevenue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-700">
                        ${s.avgTicket.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {s.lowStockItems > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600">
                            <AlertTriangle size={12} /> {s.lowStockItems}
                          </span>
                        ) : (
                          <span className="text-green-600 text-xs">✓ OK</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {stats.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-400">Sin datos de sucursales</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'branches' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">{branches.length} sucursal(es) registrada(s)</p>
            <button
              onClick={() => { setForm(emptyBranch); setEditingId(null); setShowForm(true); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: '#1B3A6B' }}
            >
              <Plus size={16} /> Nueva Sucursal
            </button>
          </div>

          {/* Form */}
          {showForm && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-800 mb-4">{editingId ? 'Editar Sucursal' : 'Nueva Sucursal'}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'name', label: 'Nombre *', placeholder: 'Sucursal Centro' },
                  { key: 'address', label: 'Dirección', placeholder: 'Calle Principal #1' },
                  { key: 'phone', label: 'Teléfono', placeholder: '555-0001' },
                  { key: 'email', label: 'Email', placeholder: 'sucursal@restaurante.com' },
                  { key: 'managerName', label: 'Gerente', placeholder: 'Nombre del gerente' },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                    <input
                      type="text"
                      value={(form as any)[f.key]}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                      placeholder={f.placeholder}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                ))}
                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="rounded"
                  />
                  <label htmlFor="isActive" className="text-sm text-gray-700">Sucursal activa</label>
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                  style={{ backgroundColor: '#1B3A6B' }}
                >
                  <Check size={16} /> {saving ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyBranch); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200"
                >
                  <X size={16} /> Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Branch cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {branches.map((b) => (
              <div key={b.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#1B3A6B15' }}>
                      <Building2 size={20} style={{ color: '#1B3A6B' }} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">{b.name}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${b.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                        {b.isActive ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(b)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDelete(b.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5 text-sm text-gray-600">
                  {b.address && <div className="flex items-center gap-2"><MapPin size={13} className="text-gray-400" />{b.address}</div>}
                  {b.phone && <div className="flex items-center gap-2"><Phone size={13} className="text-gray-400" />{b.phone}</div>}
                  {b.email && <div className="flex items-center gap-2"><Mail size={13} className="text-gray-400" />{b.email}</div>}
                  {b.managerName && <div className="flex items-center gap-2"><Users size={13} className="text-gray-400" />{b.managerName}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
