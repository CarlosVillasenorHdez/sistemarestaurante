'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Search, Filter, Eye, XCircle, ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  Clock, CreditCard, Banknote, Download, RefreshCw, ClipboardList,
} from 'lucide-react';
import { toast } from 'sonner';
import OrderDetailModal from './OrderDetailModal';
import CancelOrderModal from './CancelOrderModal';
import { createClient } from '@/lib/supabase/client';

export type OrderStatus = 'abierta' | 'preparacion' | 'lista' | 'cerrada' | 'cancelada';
export type PaymentMethod = 'efectivo' | 'tarjeta' | null;

export interface OrderRecord {
  id: string;
  mesa: string;
  mesaNum: number;
  mesero: string;
  items: { name: string; qty: number; price: number; emoji: string }[];
  subtotal: number;
  iva: number;
  discount: number;
  total: number;
  status: OrderStatus;
  payMethod: PaymentMethod;
  openedAt: string;
  closedAt: string | null;
  durationMin: number | null;
  branch: string;
  notes?: string;
}

type SortField = 'id' | 'mesa' | 'mesero' | 'total' | 'openedAt' | 'status';
type SortDir = 'asc' | 'desc';

const statusConfig: Record<OrderStatus, { label: string; className: string; dotColor: string }> = {
  abierta: { label: 'Abierta', className: 'badge-abierta', dotColor: '#3b82f6' },
  preparacion: { label: 'En Preparación', className: 'badge-preparacion', dotColor: '#f59e0b' },
  lista: { label: 'Lista', className: 'badge-espera', dotColor: '#f59e0b' },
  cerrada: { label: 'Cerrada', className: 'badge-cerrada', dotColor: '#16a34a' },
  cancelada: { label: 'Cancelada', className: 'badge-cancelada', dotColor: '#9ca3af' },
};

const PAGE_SIZES = [10, 20, 50];

// ─── Skeleton ────────────────────────────────────────────────────────────────

function RowSkeleton() {
  return (
    <tr className="border-b animate-pulse" style={{ borderColor: '#f9fafb' }}>
      {Array.from({ length: 14 }).map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-4 rounded bg-gray-100" style={{ width: i === 0 ? '20px' : i === 1 ? '80px' : '60px' }} />
        </td>
      ))}
    </tr>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyOrders() {
  return (
    <tr>
      <td colSpan={14} className="py-16 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#f3f4f6' }}>
            <ClipboardList size={28} className="text-gray-300" />
          </div>
          <div>
            <p className="text-base font-semibold text-gray-700 mb-1">No hay órdenes registradas</p>
            <p className="text-sm text-gray-400">
              Las órdenes aparecerán aquí cuando se creen desde el Punto de Venta.
            </p>
          </div>
        </div>
      </td>
    </tr>
  );
}

export default function OrdersTable() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'todas'>('todas');
  const [meseroFilter, setMeseroFilter] = useState('todos');
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);
  const [cancelOrder, setCancelOrder] = useState<OrderRecord | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const supabase = createClient();

  const ORDERS_LIMIT = 200;  // Hard cap — prevents loading months of history at once

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const { data: ordersData, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false })
      .limit(ORDERS_LIMIT);

    if (error) {
      toast.error('Error al cargar órdenes: ' + error.message);
      setLoading(false);
      return;
    }

    if (ordersData) {
      setOrders(ordersData.map((o) => ({
        id: o.id,
        mesa: o.mesa,
        mesaNum: o.mesa_num,
        mesero: o.mesero,
        items: (o.order_items || []).map((item: any) => ({
          name: item.name,
          qty: item.qty,
          price: Number(item.price),
          emoji: item.emoji,
        })),
        subtotal: Number(o.subtotal),
        iva: Number(o.iva),
        discount: Number(o.discount),
        total: Number(o.total),
        status: o.status as OrderStatus,
        payMethod: o.pay_method as PaymentMethod,
        openedAt: o.opened_at,
        closedAt: o.closed_at,
        durationMin: o.duration_min,
        branch: o.branch,
        notes: o.notes,
      })));
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const meseros = useMemo(() => {
    const set = new Set(orders.map((o) => o.mesero));
    return Array.from(set).sort();
  }, [orders]);

  const filtered = useMemo(() => {
    let result = orders.filter((o) => {
      const matchStatus = statusFilter === 'todas' || o.status === statusFilter;
      const matchMesero = meseroFilter === 'todos' || o.mesero === meseroFilter;
      const matchSearch = search === '' || o.id.toLowerCase().includes(search.toLowerCase()) || o.mesa.toLowerCase().includes(search.toLowerCase()) || o.mesero.toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchMesero && matchSearch;
    });

    result = [...result].sort((a, b) => {
      let av: any = a[sortField as keyof OrderRecord];
      let bv: any = b[sortField as keyof OrderRecord];
      if (sortField === 'id') { av = parseInt(a.id.replace('ORD-', '')); bv = parseInt(b.id.replace('ORD-', '')); }
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [orders, search, statusFilter, meseroFilter, sortField, sortDir]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (field: SortField) => {
    if (sortField === field) { setSortDir((d) => (d === 'asc' ? 'desc' : 'asc')); }
    else { setSortField(field); setSortDir('asc'); }
    setPage(1);
  };

  const handleCancelConfirm = async (orderId: string, reason: string) => {
    await supabase.from('orders').update({
      status: 'cancelada',
      closed_at: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
      notes: reason,
      updated_at: new Date().toISOString(),
    }).eq('id', orderId);
    setCancelOrder(null);
    toast.success(`Orden ${orderId} cancelada. Motivo: "${reason}"`);
    await fetchOrders();
  };

  const handleSelectRow = (id: string) => {
    setSelectedRows((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const handleSelectAll = () => {
    if (selectedRows.size === paginated.length) setSelectedRows(new Set());
    else setSelectedRows(new Set(paginated.map((o) => o.id)));
  };

  const handleRefresh = async () => {
    await fetchOrders();
    toast.success('Órdenes actualizadas');
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp size={12} className="text-gray-300" />;
    return sortDir === 'asc' ? <ChevronUp size={12} className="text-amber-500" /> : <ChevronDown size={12} className="text-amber-500" />;
  };

  const totalVentas = filtered.filter((o) => o.status === 'cerrada').reduce((s, o) => s + o.total, 0);
  const openCount = filtered.filter((o) => ['abierta', 'preparacion', 'lista'].includes(o.status)).length;
  const cancelCount = filtered.filter((o) => o.status === 'cancelada').length;

  return (
    <div className="flex flex-col gap-4">
      {/* Summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Órdenes', value: loading ? '…' : String(filtered.length), color: '#1B3A6B', bg: '#eff6ff' },
          { label: 'Abiertas Ahora', value: loading ? '…' : String(openCount), color: '#d97706', bg: '#fffbeb' },
          { label: 'Ventas Cerradas', value: loading ? '…' : `$${totalVentas.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, color: '#16a34a', bg: '#f0fdf4' },
          { label: 'Canceladas', value: loading ? '…' : String(cancelCount), color: '#dc2626', bg: '#fef2f2' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl p-4 border" style={{ backgroundColor: stat.bg, borderColor: stat.bg === '#eff6ff' ? '#bfdbfe' : stat.bg === '#fffbeb' ? '#fde68a' : stat.bg === '#f0fdf4' ? '#86efac' : '#fca5a5' }}>
            <p className="text-xs text-gray-500 mb-1 font-medium">{stat.label}</p>
            <p className="font-mono font-bold text-xl" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4 flex flex-wrap items-center gap-3" style={{ borderColor: '#e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Buscar por orden, mesa, mesero..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="input-field pl-8 py-2 text-sm" />
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 flex-shrink-0">
          {(['todas', 'abierta', 'preparacion', 'cerrada', 'cancelada'] as const).map((s) => {
            const labels: Record<string, string> = { todas: 'Todas', abierta: 'Abiertas', preparacion: 'En Prep.', cerrada: 'Cerradas', cancelada: 'Canceladas' };
            return (
              <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }} className="px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 whitespace-nowrap" style={{ backgroundColor: statusFilter === s ? 'white' : 'transparent', color: statusFilter === s ? '#1B3A6B' : '#6b7280', boxShadow: statusFilter === s ? '0 1px 2px rgba(0,0,0,0.08)' : 'none' }}>
                {labels[s]}
              </button>
            );
          })}
        </div>
        <select value={meseroFilter} onChange={(e) => { setMeseroFilter(e.target.value); setPage(1); }} className="input-field py-2 text-sm w-44 flex-shrink-0">
          <option value="todos">Todos los meseros</option>
          {meseros.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <div className="flex items-center gap-2 ml-auto">
          <button onClick={handleRefresh} className="btn-secondary py-2 px-3 flex items-center gap-1.5">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline text-xs">Actualizar</span>
          </button>
          <button className="btn-secondary py-2 px-3 flex items-center gap-1.5">
            <Download size={13} />
            <span className="hidden sm:inline text-xs">Exportar</span>
          </button>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedRows.size > 0 && (
        <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ backgroundColor: '#1B3A6B', border: '1px solid #243f72' }}>
          <span className="text-sm font-semibold text-white">{selectedRows.size} orden{selectedRows.size !== 1 ? 'es' : ''} seleccionada{selectedRows.size !== 1 ? 's' : ''}</span>
          <div className="flex items-center gap-2 ml-auto">
            <button className="text-xs px-3 py-1.5 rounded-lg font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)' }}>Exportar selección</button>
            <button onClick={() => setSelectedRows(new Set())} className="text-xs px-3 py-1.5 rounded-lg font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>Deseleccionar</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: '#e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" checked={selectedRows.size === paginated.length && paginated.length > 0} onChange={handleSelectAll} className="rounded" style={{ accentColor: '#f59e0b' }} />
                </th>
                {[
                  { label: '# Orden', field: 'id' as SortField }, { label: 'Mesa', field: 'mesa' as SortField },
                  { label: 'Mesero', field: 'mesero' as SortField }, { label: 'Platillos', field: null },
                  { label: 'Subtotal', field: null }, { label: 'IVA', field: null }, { label: 'Descuento', field: null },
                  { label: 'Total', field: 'total' as SortField }, { label: 'Pago', field: null },
                  { label: 'Abierta', field: 'openedAt' as SortField }, { label: 'Cerrada', field: null },
                  { label: 'Duración', field: null }, { label: 'Estado', field: 'status' as SortField }, { label: '', field: null },
                ].map((col, i) => (
                  <th key={i} className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap ${col.field ? 'cursor-pointer select-none hover:bg-gray-100 transition-colors' : ''}`} style={{ color: '#9ca3af', letterSpacing: '0.05em' }} onClick={() => col.field && handleSort(col.field)}>
                    <div className="flex items-center gap-1">{col.label}{col.field && <SortIcon field={col.field} />}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => <RowSkeleton key={i} />)
              ) : orders.length === 0 ? (
                <EmptyOrders />
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#f3f4f6' }}>
                        <Filter size={24} className="text-gray-300" />
                      </div>
                      <p className="text-sm font-semibold text-gray-600">No se encontraron órdenes</p>
                      <p className="text-xs text-gray-400">Ajusta los filtros o la búsqueda para ver resultados</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((order) => {
                  const sc = statusConfig[order.status];
                  const isSelected = selectedRows.has(order.id);
                  const isOpen = ['abierta', 'preparacion', 'lista'].includes(order.status);
                  return (
                    <tr key={order.id} className="table-row-hover border-b" style={{ borderColor: '#f9fafb', backgroundColor: isSelected ? '#fffbeb' : undefined }}>
                      <td className="px-4 py-3.5"><input type="checkbox" checked={isSelected} onChange={() => handleSelectRow(order.id)} className="rounded" style={{ accentColor: '#f59e0b' }} /></td>
                      <td className="px-4 py-3.5"><span className="font-mono text-sm font-semibold text-gray-800 whitespace-nowrap">{order.id}</span></td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: '#e0e7ff', color: '#3730a3', fontSize: '9px' }}>{order.mesaNum}</div>
                          <span className="text-sm font-medium text-gray-700 whitespace-nowrap">{order.mesa}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5"><span className="text-sm text-gray-600 whitespace-nowrap">{order.mesero}</span></td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1">
                          <div className="flex gap-0.5">{order.items.slice(0, 3).map((item, idx) => <span key={idx} title={item.name} className="text-sm">{item.emoji}</span>)}</div>
                          <span className="text-xs text-gray-400 ml-1">{order.items.reduce((s, i) => s + i.qty, 0)} items</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5"><span className="font-mono text-sm text-gray-700 whitespace-nowrap">${order.subtotal.toFixed(2)}</span></td>
                      <td className="px-4 py-3.5"><span className="font-mono text-sm text-gray-500 whitespace-nowrap">${order.iva.toFixed(2)}</span></td>
                      <td className="px-4 py-3.5">{order.discount > 0 ? <span className="font-mono text-sm whitespace-nowrap" style={{ color: '#16a34a' }}>−${order.discount.toFixed(2)}</span> : <span className="text-gray-300 text-sm">—</span>}</td>
                      <td className="px-4 py-3.5"><span className="font-mono font-bold text-sm whitespace-nowrap" style={{ color: '#1B3A6B' }}>${order.total.toFixed(2)}</span></td>
                      <td className="px-4 py-3.5">
                        {order.payMethod ? (
                          <div className="flex items-center gap-1.5">
                            {order.payMethod === 'efectivo' ? <Banknote size={13} className="text-green-600" /> : <CreditCard size={13} className="text-blue-600" />}
                            <span className="text-xs font-semibold capitalize whitespace-nowrap" style={{ color: order.payMethod === 'tarjeta' ? '#1d4ed8' : '#166534' }}>{order.payMethod === 'efectivo' ? 'Efectivo' : 'Tarjeta'}</span>
                          </div>
                        ) : <span className="text-gray-300 text-sm">—</span>}
                      </td>
                      <td className="px-4 py-3.5"><div className="flex items-center gap-1 text-sm text-gray-500 whitespace-nowrap"><Clock size={11} />{order.openedAt}</div></td>
                      <td className="px-4 py-3.5"><span className="text-sm text-gray-500 whitespace-nowrap font-mono">{order.closedAt || '—'}</span></td>
                      <td className="px-4 py-3.5">
                        {order.durationMin !== null ? (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ backgroundColor: order.durationMin > 45 ? '#fee2e2' : '#f3f4f6', color: order.durationMin > 45 ? '#dc2626' : '#6b7280' }}>{order.durationMin} min</span>
                        ) : isOpen ? (
                          <span className="text-xs px-2 py-0.5 rounded-full animate-pulse" style={{ backgroundColor: '#dbeafe', color: '#1d4ed8', fontWeight: 600 }}>En curso</span>
                        ) : <span className="text-gray-300 text-sm">—</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: sc.dotColor }} />
                          <span className={`status-badge ${sc.className} whitespace-nowrap`}>{sc.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setSelectedOrder(order)} className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors" title="Ver detalle"><Eye size={14} className="text-gray-400 hover:text-blue-600" /></button>
                          {['abierta', 'preparacion', 'lista'].includes(order.status) && (
                            <button onClick={() => setCancelOrder(order)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="Cancelar orden"><XCircle size={14} className="text-gray-400 hover:text-red-500" /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: '#f3f4f6' }}>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Mostrar</span>
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="input-field py-1 px-2 text-sm w-16">
              {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <span>de <strong>{filtered.length}</strong> órdenes</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"><ChevronLeft size={16} className="text-gray-600" /></button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) pageNum = i + 1;
              else if (page <= 3) pageNum = i + 1;
              else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
              else pageNum = page - 2 + i;
              return (
                <button key={pageNum} onClick={() => setPage(pageNum)} className="w-8 h-8 rounded-lg text-sm font-semibold transition-all duration-100" style={{ backgroundColor: page === pageNum ? '#1B3A6B' : 'transparent', color: page === pageNum ? 'white' : '#6b7280' }}>{pageNum}</button>
              );
            })}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight size={16} className="text-gray-600" /></button>
          </div>
        </div>
      </div>

      {selectedOrder && <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} onCancel={(order) => { setSelectedOrder(null); setCancelOrder(order); }} />}
      {cancelOrder && <CancelOrderModal order={cancelOrder} onClose={() => setCancelOrder(null)} onConfirm={handleCancelConfirm} />}
    </div>
  );
}