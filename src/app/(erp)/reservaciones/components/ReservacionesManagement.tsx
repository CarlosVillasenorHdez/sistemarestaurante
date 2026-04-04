'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  Calendar, Plus, ChevronLeft, ChevronRight, Clock, Users,
  X, Check, Phone, Mail, Edit2, AlertCircle, List, CalendarDays
} from 'lucide-react';

interface Reservation {
  id: string;
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  partySize: number;
  reservationDate: string;
  reservationTime: string;
  tableId: string | null;
  status: 'confirmada' | 'pendiente' | 'cancelada' | 'completada' | 'lista_espera';
  notes: string;
  confirmationSent: boolean;
}

interface RestaurantTable {
  id: string;
  name: string;
  capacity: number;
}

const STATUS_COLORS: Record<string, string> = {
  confirmada: '#10b981',
  pendiente: '#f59e0b',
  cancelada: '#ef4444',
  completada: '#6b7280',
  lista_espera: '#8b5cf6',
};

const STATUS_LABELS: Record<string, string> = {
  confirmada: 'Confirmada',
  pendiente: 'Pendiente',
  cancelada: 'Cancelada',
  completada: 'Completada',
  lista_espera: 'Lista de Espera',
};

const TIME_SLOTS = [
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '18:00', '18:30', '19:00',
  '19:30', '20:00', '20:30', '21:00', '21:30', '22:00',
];

const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const emptyForm = {
  guestName: '', guestPhone: '', guestEmail: '', partySize: 2,
  reservationDate: new Date().toISOString().split('T')[0],
  reservationTime: '13:00', tableId: '', status: 'confirmada' as Reservation['status'], notes: '',
};

export default function ReservacionesManagement() {
  const supabase = createClient();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: resData }, { data: tablesData }] = await Promise.all([
        supabase.from('reservations').select('*').order('reservation_date').order('reservation_time'),
        supabase.from('restaurant_tables').select('id, name, capacity').order('name'),
      ]);
      setReservations((resData || []).map((r: any) => ({
        id: r.id,
        guestName: r.guest_name,
        guestPhone: r.guest_phone,
        guestEmail: r.guest_email,
        partySize: r.party_size,
        reservationDate: r.reservation_date,
        reservationTime: r.reservation_time,
        tableId: r.table_id,
        status: r.status,
        notes: r.notes,
        confirmationSent: r.confirmation_sent,
      })));
      setTables((tablesData || []).map((t: any) => ({ id: t.id, name: t.name, capacity: t.capacity })));
    } catch (err: any) {
      toast.error('Error al cargar reservaciones: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  // Realtime: auto-refresh reservations when any reservation or table changes
  useEffect(() => {
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let retryCount = 0;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let destroyed = false;

    const connect = () => {
      if (destroyed) return;
      channel = supabase
        .channel(`reservaciones-rt-${Date.now()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, () => {
          loadData();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables' }, () => {
          loadData();
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            retryCount = 0;
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            if (channel) { supabase.removeChannel(channel); channel = null; }
            const delay = Math.min(3000 * Math.pow(2, retryCount), 30000);
            retryCount += 1;
            if (!destroyed) retryTimeout = setTimeout(connect, delay);
          }
        });
    };

    connect();
    return () => {
      destroyed = true;
      if (retryTimeout) clearTimeout(retryTimeout);
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabase, loadData]);

  // Calendar helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarDays: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const getDateStr = (day: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const getReservationsForDate = (dateStr: string) =>
    reservations.filter((r) => r.reservationDate === dateStr);

  const handleSave = async () => {
    if (!form.guestName.trim()) { toast.error('El nombre del cliente es obligatorio'); return; }
    setSaving(true);
    try {
      const payload = {
        guest_name: form.guestName.trim(),
        guest_phone: form.guestPhone,
        guest_email: form.guestEmail,
        party_size: form.partySize,
        reservation_date: form.reservationDate,
        reservation_time: form.reservationTime,
        table_id: form.tableId || null,
        status: form.status,
        notes: form.notes,
        updated_at: new Date().toISOString(),
      };
      if (editingId) {
        const { error } = await supabase.from('reservations').update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success('Reservación actualizada');
      } else {
        const { data, error } = await supabase.from('reservations').insert(payload).select().single();
        if (error) throw error;
        // Send confirmation email if email provided
        if (form.guestEmail && form.status === 'confirmada') {
          setSendingEmail(true);
          try {
            await supabase.functions.invoke('send-email', {
              body: {
                type: 'reservation_confirmation',
                to: form.guestEmail,
                data: {
                  restaurantName: 'Aldente',
                  guestName: form.guestName,
                  date: new Date(form.reservationDate + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
                  time: form.reservationTime,
                  partySize: form.partySize,
                  tableName: tables.find(t => t.id === form.tableId)?.name,
                  notes: form.notes,
                  phone: '',
                },
              },
            });
            await supabase.from('reservations').update({ confirmation_sent: true }).eq('id', data.id);
            toast.success('Confirmación enviada por correo');
          } catch {
            toast.warning('Reservación creada, pero no se pudo enviar el correo');
          } finally {
            setSendingEmail(false);
          }
        } else {
          toast.success('Reservación creada');
        }
      }
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      loadData();
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    const { error } = await supabase.from('reservations').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error('Error: ' + error.message); return; }
    toast.success('Estado actualizado');
    loadData();
  };

  const handleEdit = (r: Reservation) => {
    setForm({
      guestName: r.guestName, guestPhone: r.guestPhone, guestEmail: r.guestEmail,
      partySize: r.partySize, reservationDate: r.reservationDate, reservationTime: r.reservationTime,
      tableId: r.tableId || '', status: r.status, notes: r.notes,
    });
    setEditingId(r.id);
    setShowForm(true);
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const todayReservations = reservations.filter(r => r.reservationDate === todayStr && r.status !== 'cancelada');
  const waitlist = reservations.filter(r => r.status === 'lista_espera');

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#f59e0b' }} /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2">
          <button onClick={() => setView('calendar')} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'calendar' ? 'text-white' : 'text-gray-600 bg-white border border-gray-200'}`} style={view === 'calendar' ? { backgroundColor: '#1B3A6B' } : {}}>
            <CalendarDays size={16} /> Calendario
          </button>
          <button onClick={() => setView('list')} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'list' ? 'text-white' : 'text-gray-600 bg-white border border-gray-200'}`} style={view === 'list' ? { backgroundColor: '#1B3A6B' } : {}}>
            <List size={16} /> Lista
          </button>
        </div>
        <button
          onClick={() => { setForm({ ...emptyForm, reservationDate: selectedDate || todayStr }); setEditingId(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ backgroundColor: '#f59e0b' }}
        >
          <Plus size={16} /> Nueva Reservación
        </button>
      </div>

      {/* Today summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Hoy', value: todayReservations.length, color: '#1B3A6B', icon: Calendar },
          { label: 'Confirmadas', value: reservations.filter(r => r.status === 'confirmada').length, color: '#10b981', icon: Check },
          { label: 'Lista de Espera', value: waitlist.length, color: '#8b5cf6', icon: AlertCircle },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: s.color + '15' }}>
              <s.icon size={20} style={{ color: s.color }} />
            </div>
            <div>
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="text-xl font-bold text-gray-800">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">{editingId ? 'Editar Reservación' : 'Nueva Reservación'}</h3>
              <button onClick={() => { setShowForm(false); setEditingId(null); }} className="p-2 rounded-lg hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nombre del Cliente *</label>
                  <input type="text" value={form.guestName} onChange={e => setForm({ ...form, guestName: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" placeholder="Juan García" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
                  <input type="tel" value={form.guestPhone} onChange={e => setForm({ ...form, guestPhone: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" placeholder="555-0001" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email (para confirmación)</label>
                  <input type="email" value={form.guestEmail} onChange={e => setForm({ ...form, guestEmail: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" placeholder="cliente@email.com" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Fecha</label>
                  <input type="date" value={form.reservationDate} onChange={e => setForm({ ...form, reservationDate: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Hora</label>
                  <select value={form.reservationTime} onChange={e => setForm({ ...form, reservationTime: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
                    {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Personas</label>
                  <input type="number" min={1} max={20} value={form.partySize} onChange={e => setForm({ ...form, partySize: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Mesa</label>
                  <select value={form.tableId} onChange={e => setForm({ ...form, tableId: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
                    <option value="">Sin asignar</option>
                    {tables.filter(t => t.capacity >= form.partySize).map(t => (
                      <option key={t.id} value={t.id}>{t.name} (cap. {t.capacity})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as any })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
                    {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Notas</label>
                  <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" placeholder="Alergias, preferencias, ocasión especial..." />
                </div>
              </div>
              {form.guestEmail && !editingId && (
                <p className="text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
                  📧 Se enviará confirmación automática al correo del cliente
                </p>
              )}
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button onClick={handleSave} disabled={saving || sendingEmail} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: '#1B3A6B' }}>
                <Check size={16} /> {saving ? 'Guardando...' : sendingEmail ? 'Enviando correo...' : 'Guardar'}
              </button>
              <button onClick={() => { setShowForm(false); setEditingId(null); }} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calendar View */}
      {view === 'calendar' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Month nav */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-2 rounded-lg hover:bg-gray-100">
              <ChevronLeft size={18} />
            </button>
            <h3 className="font-semibold text-gray-800">{MONTHS_ES[month]} {year}</h3>
            <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-2 rounded-lg hover:bg-gray-100">
              <ChevronRight size={18} />
            </button>
          </div>
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {DAYS_ES.map(d => (
              <div key={d} className="py-2 text-center text-xs font-medium text-gray-500">{d}</div>
            ))}
          </div>
          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} className="h-24 border-b border-r border-gray-50" />;
              const dateStr = getDateStr(day);
              const dayReservations = getReservationsForDate(dateStr);
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              return (
                <div
                  key={dateStr}
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  className={`h-24 border-b border-r border-gray-50 p-1.5 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium mb-1 ${isToday ? 'text-white' : 'text-gray-700'}`} style={isToday ? { backgroundColor: '#f59e0b' } : {}}>
                    {day}
                  </div>
                  <div className="space-y-0.5 overflow-hidden">
                    {dayReservations.slice(0, 3).map(r => (
                      <div key={r.id} className="text-xs px-1 py-0.5 rounded truncate" style={{ backgroundColor: STATUS_COLORS[r.status] + '20', color: STATUS_COLORS[r.status] }}>
                        {r.reservationTime} {r.guestName.split(' ')[0]}
                      </div>
                    ))}
                    {dayReservations.length > 3 && (
                      <div className="text-xs text-gray-400 px-1">+{dayReservations.length - 3} más</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Selected date detail */}
          {selectedDate && (
            <div className="border-t border-gray-100 p-4">
              <h4 className="font-medium text-gray-800 mb-3">
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h4>
              {getReservationsForDate(selectedDate).length === 0 ? (
                <p className="text-sm text-gray-400">Sin reservaciones para este día</p>
              ) : (
                <div className="space-y-2">
                  {getReservationsForDate(selectedDate).map(r => (
                    <ReservationCard key={r.id} reservation={r} tables={tables} onEdit={handleEdit} onStatusChange={handleStatusChange} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="space-y-3">
          {reservations.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center text-gray-400 shadow-sm border border-gray-100">
              <Calendar size={40} className="mx-auto mb-3 opacity-30" />
              <p>Sin reservaciones registradas</p>
            </div>
          ) : (
            reservations.map(r => (
              <ReservationCard key={r.id} reservation={r} tables={tables} onEdit={handleEdit} onStatusChange={handleStatusChange} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function ReservationCard({ reservation: r, tables, onEdit, onStatusChange }: {
  reservation: Reservation;
  tables: RestaurantTable[];
  onEdit: (r: Reservation) => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  const table = tables.find(t => t.id === r.tableId);
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-start gap-4">
      <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0" style={{ backgroundColor: STATUS_COLORS[r.status] + '15' }}>
        <Clock size={14} style={{ color: STATUS_COLORS[r.status] }} />
        <span className="text-xs font-bold mt-0.5" style={{ color: STATUS_COLORS[r.status] }}>{r.reservationTime}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-gray-800">{r.guestName}</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: STATUS_COLORS[r.status] + '20', color: STATUS_COLORS[r.status] }}>
            {STATUS_LABELS[r.status]}
          </span>
          {r.confirmationSent && <span className="text-xs text-green-600">✉ Confirmado</span>}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
          <span className="flex items-center gap-1"><Users size={11} /> {r.partySize} personas</span>
          {table && <span>🪑 {table.name}</span>}
          {r.guestPhone && <span className="flex items-center gap-1"><Phone size={11} /> {r.guestPhone}</span>}
          {r.guestEmail && <span className="flex items-center gap-1"><Mail size={11} /> {r.guestEmail}</span>}
        </div>
        {r.notes && <p className="text-xs text-gray-400 mt-1 truncate">{r.notes}</p>}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <select
          value={r.status}
          onChange={e => onStatusChange(r.id, e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none"
        >
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button onClick={() => onEdit(r)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
          <Edit2 size={14} />
        </button>
      </div>
    </div>
  );
}