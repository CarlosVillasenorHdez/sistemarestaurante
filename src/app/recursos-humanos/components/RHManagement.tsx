'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Umbrella, Clock, FileText, Plus, X, Check, XCircle, Search, ChevronDown, Users, TrendingUp, AlertCircle,  } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Icon from '@/components/ui/AppIcon';


// ─── Types ────────────────────────────────────────────────────────────────────

type Estado = 'pendiente' | 'aprobado' | 'rechazado';
type PermTipo = 'personal' | 'medico' | 'familiar' | 'otro';
type IncapTipo = 'enfermedad_general' | 'accidente_trabajo' | 'maternidad' | 'paternidad' | 'covid' | 'otro';

interface Incapacidad {
  id: string;
  employee_id: string;
  employeeName?: string;
  employeeRole?: string;
  tipo: IncapTipo;
  fecha_inicio: string;
  fecha_fin: string;
  dias: number;
  folio_imss: string;
  porcentaje_salario: number;
  estado: Estado;
  notas: string | null;
  created_at: string;
}
type ActiveTab = 'vacaciones' | 'permisos' | 'tiempos_extras' | 'incapacidades' | 'resumen';

interface Employee {
  id: string;
  name: string;
  role: string;
  salary: number;
  salary_frequency: string;
}

interface Vacacion {
  id: string;
  employee_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  dias_solicitados: number;
  estado: Estado;
  notas: string | null;
  created_at: string;
  employees?: { name: string; role: string };
}

interface Permiso {
  id: string;
  employee_id: string;
  tipo: PermTipo;
  fecha: string;
  horas: number;
  con_goce: boolean;
  estado: Estado;
  motivo: string | null;
  created_at: string;
  employees?: { name: string; role: string };
}

interface TiempoExtra {
  id: string;
  employee_id: string;
  fecha: string;
  horas: number;
  factor_pago: number;
  estado: Estado;
  descripcion: string | null;
  created_at: string;
  employees?: { name: string; role: string; salary: number; salary_frequency: string };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ESTADO_COLORS: Record<Estado, string> = {
  pendiente: 'bg-amber-900/40 text-amber-300 border border-amber-700/40',
  aprobado: 'bg-green-900/40 text-green-300 border border-green-700/40',
  rechazado: 'bg-red-900/40 text-red-300 border border-red-700/40',
};

const ESTADO_LABELS: Record<Estado, string> = {
  pendiente: 'Pendiente',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
};

const PERM_TIPO_LABELS: Record<PermTipo, string> = {
  personal: 'Personal',
  medico: 'Médico',
  familiar: 'Familiar',
  otro: 'Otro',
};

function formatDate(iso: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function toMonthlySalary(salary: number, freq: string): number {
  if (freq === 'mensual') return salary;
  if (freq === 'quincenal') return salary * 2;
  if (freq === 'semanal') return salary * 4.33;
  return salary;
}

function dailyRate(salary: number, freq: string): number {
  return toMonthlySalary(salary, freq) / 30;
}

function hourlyRate(salary: number, freq: string): number {
  return toMonthlySalary(salary, freq) / (30 * 8);
}

// ─── Modal base ───────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="w-full max-w-lg rounded-xl shadow-2xl" style={{ backgroundColor: '#1e2d4a', border: '1px solid #243f72' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#243f72' }}>
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
            <X size={18} className="text-gray-400" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RHManagement() {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<ActiveTab>('vacaciones');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [vacaciones, setVacaciones] = useState<Vacacion[]>([]);
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [incapacidades, setIncapacidades] = useState<Incapacidad[]>([]);
  const [tiemposExtras, setTiemposExtras] = useState<TiempoExtra[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState<'Todos' | Estado>('Todos');
  const [showModal, setShowModal] = useState<null | 'vacacion' | 'permiso' | 'tiempo_extra' | 'incapacidad'>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [vacForm, setVacForm] = useState({ employee_id: '', fecha_inicio: '', fecha_fin: '', notas: '' });
  const [permForm, setPermForm] = useState({ employee_id: '', tipo: 'personal' as PermTipo, fecha: '', horas: '1', con_goce: true, motivo: '' });
  const [incapForm, setIncapForm] = useState({ employee_id: '', tipo: 'enfermedad_general' as IncapTipo, fecha_inicio: '', fecha_fin: '', folio_imss: '', porcentaje_salario: 60, notas: '' });
  const [teForm, setTeForm] = useState({ employee_id: '', fecha: '', horas: '1', factor_pago: '1.5', descripcion: '' });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, vacRes, permRes, teRes] = await Promise.all([
        supabase.from('employees').select('id, name, role, salary, salary_frequency').eq('status', 'activo').order('name'),
        supabase.from('rh_vacaciones').select('*, employees(name, role)').order('created_at', { ascending: false }),
        supabase.from('rh_incapacidades').select('*, employees(name, role)').order('created_at', { ascending: false }),
        supabase.from('rh_permisos').select('*, employees(name, role)').order('created_at', { ascending: false }),
        supabase.from('rh_tiempos_extras').select('*, employees(name, role, salary, salary_frequency)').order('created_at', { ascending: false }),
      ]);
      if (empRes.data) setEmployees(empRes.data as Employee[]);
      if (vacRes.data) setVacaciones(vacRes.data as Vacacion[]);
      if (permRes.data) setPermisos(permRes.data as Permiso[]);
      // incapacidades — puede que la tabla no exista aún
      try {
        const incapRes = await supabase.from('rh_incapacidades').select('*, employees(name, role)').order('created_at', { ascending: false });
        if (incapRes.data) setIncapacidades(incapRes.data.map((i: any) => ({ ...i, employeeName: i.employees?.name, employeeRole: i.employees?.role })));
      } catch { /* tabla no existe aún */ }
      if (teRes.data) setTiemposExtras(teRes.data as TiempoExtra[]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── CRUD helpers ────────────────────────────────────────────────────────────

  const [attendanceSummary, setAttendanceSummary] = React.useState<Record<string, number>>({});

  React.useEffect(() => {
    if (activeTab !== 'resumen') return;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    createClient().from('employee_attendance')
      .select('employee_id, hours_worked')
      .gte('date', startOfMonth)
      .then(({ data }) => {
        const summary: Record<string, number> = {};
        (data || []).forEach((r: any) => {
          if (r.hours_worked) summary[r.employee_id] = (summary[r.employee_id] || 0) + Number(r.hours_worked);
        });
        setAttendanceSummary(summary);
      });
  }, [activeTab]);

  async function updateEstado(table: string, id: string, estado: Estado) {
    const { error } = await supabase.from(table).update({ estado, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { setError('Error al actualizar estado: ' + error.message); return; }
    loadData();
  }

  async function deleteRecord(table: string, id: string) {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) { setError('Error al eliminar registro: ' + error.message); return; }
    loadData();
  }

  async function saveVacacion() {
    if (!vacForm.employee_id || !vacForm.fecha_inicio || !vacForm.fecha_fin) return;
    setSaving(true);
    const start = new Date(vacForm.fecha_inicio);
    const end = new Date(vacForm.fecha_fin);
    const dias = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
    const { error: e } = await supabase.from('rh_vacaciones').insert({
      employee_id: vacForm.employee_id,
      fecha_inicio: vacForm.fecha_inicio,
      fecha_fin: vacForm.fecha_fin,
      dias_solicitados: dias,
      notas: vacForm.notas || null,
      estado: 'pendiente',
    });
    setSaving(false);
    if (e) { setError(e.message); return; }
    setShowModal(null);
    setVacForm({ employee_id: '', fecha_inicio: '', fecha_fin: '', notas: '' });
    loadData();
  }

  async function savePermiso() {
    if (!permForm.employee_id || !permForm.fecha) return;
    setSaving(true);
    const { error: e } = await supabase.from('rh_permisos').insert({
      employee_id: permForm.employee_id,
      tipo: permForm.tipo,
      fecha: permForm.fecha,
      horas: parseFloat(permForm.horas) || 1,
      con_goce: permForm.con_goce,
      motivo: permForm.motivo || null,
      estado: 'pendiente',
    });
    setSaving(false);
    if (e) { setError(e.message); return; }
    setShowModal(null);
    setPermForm({ employee_id: '', tipo: 'personal', fecha: '', horas: '1', con_goce: true, motivo: '' });
    loadData();
  }

  async function saveTiempoExtra() {
    if (!teForm.employee_id || !teForm.fecha) return;
    setSaving(true);
    const { error: e } = await supabase.from('rh_tiempos_extras').insert({
      employee_id: teForm.employee_id,
      fecha: teForm.fecha,
      horas: parseFloat(teForm.horas) || 1,
      factor_pago: parseFloat(teForm.factor_pago) || 1.5,
      descripcion: teForm.descripcion || null,
      estado: 'pendiente',
    });
    setSaving(false);
    if (e) { setError(e.message); return; }
    setShowModal(null);
    setTeForm({ employee_id: '', fecha: '', horas: '1', factor_pago: '1.5', descripcion: '' });
    loadData();
  }

  // ─── Filters ─────────────────────────────────────────────────────────────────

  function filterList<T extends { estado: Estado; employees?: { name: string } }>(list: T[]): T[] {
    return list.filter((r) => {
      const matchSearch = !search || r.employees?.name?.toLowerCase().includes(search.toLowerCase());
      const matchEstado = filterEstado === 'Todos' || r.estado === filterEstado;
      return matchSearch && matchEstado;
    });
  }

  // ─── Summary calcs ────────────────────────────────────────────────────────────

  const resumen = employees.map((emp) => {
    const vacs = vacaciones.filter((v) => v.employee_id === emp.id && v.estado === 'aprobado');
    const perms = permisos.filter((p) => p.employee_id === emp.id && p.estado === 'aprobado');
    const tes = tiemposExtras.filter((t) => t.employee_id === emp.id && t.estado === 'aprobado');

    const diasVac = vacs.reduce((s, v) => s + v.dias_solicitados, 0);
    const horasPermSinGoce = perms.filter((p) => !p.con_goce).reduce((s, p) => s + Number(p.horas), 0);
    const horasTE = tes.reduce((s, t) => s + Number(t.horas), 0);

    const dr = dailyRate(emp.salary, emp.salary_frequency);
    const hr = hourlyRate(emp.salary, emp.salary_frequency);

    const descuentoPermisos = horasPermSinGoce * hr;
    const bonusTE = tes.reduce((s, t) => s + Number(t.horas) * hr * Number(t.factor_pago), 0);
    const salarioBase = toMonthlySalary(emp.salary, emp.salary_frequency);
    const salarioNeto = salarioBase - descuentoPermisos + bonusTE;

    const horasEsteMes = attendanceSummary[emp.id] ?? null;
    return { emp, diasVac, horasPermSinGoce, horasTE, descuentoPermisos, bonusTE, salarioBase, salarioNeto, horasEsteMes };
  });

  const tabs: { key: ActiveTab; label: string; icon: React.ElementType }[] = [
    { key: 'vacaciones', label: 'Vacaciones', icon: Umbrella },
    { key: 'permisos', label: 'Permisos', icon: FileText },
    { key: 'tiempos_extras', label: 'Tiempos Extras', icon: Clock },
    { key: 'incapacidades', label: 'Incapacidades', icon: AlertCircle },
    { key: 'resumen', label: 'Resumen Nómina', icon: TrendingUp },
  ];

  async function saveIncapacidad() {
    if (!incapForm.employee_id || !incapForm.fecha_inicio || !incapForm.fecha_fin) {
      alert('Completa los campos obligatorios'); return;
    }
    setSaving(true);
    const dias = Math.ceil((new Date(incapForm.fecha_fin).getTime() - new Date(incapForm.fecha_inicio).getTime()) / 86400000) + 1;
    try {
      const { error } = await supabase.from('rh_incapacidades').insert({
        employee_id: incapForm.employee_id,
        tipo: incapForm.tipo,
        fecha_inicio: incapForm.fecha_inicio,
        fecha_fin: incapForm.fecha_fin,
        dias,
        folio_imss: incapForm.folio_imss,
        porcentaje_salario: incapForm.porcentaje_salario,
        notas: incapForm.notas,
        estado: 'pendiente',
      });
      if (error) throw error;
      setShowModal(null);
      // Reload
      const res = await supabase.from('rh_incapacidades').select('*, employees(name, role)').order('created_at', { ascending: false });
      if (res.data) setIncapacidades(res.data.map((i: any) => ({ ...i, employeeName: i.employees?.name, employeeRole: i.employees?.role })));
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500';
  const inputStyle = { backgroundColor: '#0f1e35', border: '1px solid #243f72' };
  const labelCls = 'block text-xs text-gray-400 mb-1';

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#0f1e35' }}>
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-5 border-b" style={{ borderColor: '#243f72' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Recursos Humanos</h1>
            <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Gestión de vacaciones, permisos y tiempos extras
            </p>
          </div>
          <div className="flex gap-2">
            {activeTab === 'vacaciones' && (
              <button onClick={() => setShowModal('vacacion')} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors" style={{ backgroundColor: '#1B3A6B', color: '#f59e0b', border: '1px solid #243f72' }}>
                <Plus size={16} /> Nueva Vacación
              </button>
            )}
            {activeTab === 'permisos' && (
              <button onClick={() => setShowModal('permiso')} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors" style={{ backgroundColor: '#1B3A6B', color: '#f59e0b', border: '1px solid #243f72' }}>
                <Plus size={16} /> Nuevo Permiso
              </button>
            )}
            {activeTab === 'tiempos_extras' && (
              <button onClick={() => setShowModal('tiempo_extra')} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors" style={{ backgroundColor: '#1B3A6B', color: '#f59e0b', border: '1px solid #243f72' }}>
                <Plus size={16} /> Nuevo Tiempo Extra
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  backgroundColor: active ? '#1B3A6B' : 'transparent',
                  color: active ? '#f59e0b' : 'rgba(255,255,255,0.5)',
                  border: active ? '1px solid #243f72' : '1px solid transparent',
                }}
              >
                <Icon size={15} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters (not on resumen) */}
      {activeTab !== 'resumen' && (
        <div className="flex-shrink-0 px-6 py-3 flex gap-3 border-b" style={{ borderColor: '#243f72' }}>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar empleado..."
              className="w-full pl-9 pr-3 py-2 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none"
              style={{ backgroundColor: '#1e2d4a', border: '1px solid #243f72' }}
            />
          </div>
          <div className="relative">
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value as any)}
              className="appearance-none pl-3 pr-8 py-2 rounded-lg text-sm text-white focus:outline-none"
              style={{ backgroundColor: '#1e2d4a', border: '1px solid #243f72' }}
            >
              <option value="Todos">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="aprobado">Aprobado</option>
              <option value="rechazado">Rechazado</option>
            </select>
            <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mx-6 mt-3 flex items-center gap-2 px-4 py-2 rounded-lg bg-red-900/30 border border-red-700/40 text-red-300 text-sm">
          <AlertCircle size={14} /> {error}
          <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* ── VACACIONES ── */}
            {activeTab === 'vacaciones' && (
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #243f72' }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ backgroundColor: '#1e2d4a' }}>
                      {['Empleado', 'Fecha Inicio', 'Fecha Fin', 'Días', 'Estado', 'Notas', 'Acciones'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filterList(vacaciones).length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No hay registros</td></tr>
                    ) : filterList(vacaciones).map((v) => (
                      <tr key={v.id} className="border-t hover:bg-white/5 transition-colors" style={{ borderColor: '#243f72' }}>
                        <td className="px-4 py-3 text-white font-medium">{v.employees?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-300">{formatDate(v.fecha_inicio)}</td>
                        <td className="px-4 py-3 text-gray-300">{formatDate(v.fecha_fin)}</td>
                        <td className="px-4 py-3 text-gray-300">{v.dias_solicitados}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_COLORS[v.estado]}`}>{ESTADO_LABELS[v.estado]}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 max-w-[160px] truncate">{v.notas ?? '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {v.estado === 'pendiente' && (
                              <>
                                <button onClick={() => updateEstado('rh_vacaciones', v.id, 'aprobado')} className="p-1.5 rounded-lg hover:bg-green-900/40 text-green-400 transition-colors" title="Aprobar"><Check size={14} /></button>
                                <button onClick={() => updateEstado('rh_vacaciones', v.id, 'rechazado')} className="p-1.5 rounded-lg hover:bg-red-900/40 text-red-400 transition-colors" title="Rechazar"><XCircle size={14} /></button>
                              </>
                            )}
                            <button onClick={() => deleteRecord('rh_vacaciones', v.id)} className="p-1.5 rounded-lg hover:bg-red-900/40 text-gray-500 hover:text-red-400 transition-colors" title="Eliminar"><X size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── PERMISOS ── */}
            {activeTab === 'permisos' && (
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #243f72' }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ backgroundColor: '#1e2d4a' }}>
                      {['Empleado', 'Tipo', 'Fecha', 'Horas', 'Con Goce', 'Estado', 'Motivo', 'Acciones'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filterList(permisos).length === 0 ? (
                      <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">No hay registros</td></tr>
                    ) : filterList(permisos).map((p) => (
                      <tr key={p.id} className="border-t hover:bg-white/5 transition-colors" style={{ borderColor: '#243f72' }}>
                        <td className="px-4 py-3 text-white font-medium">{p.employees?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-300">{PERM_TIPO_LABELS[p.tipo]}</td>
                        <td className="px-4 py-3 text-gray-300">{formatDate(p.fecha)}</td>
                        <td className="px-4 py-3 text-gray-300">{p.horas}h</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.con_goce ? 'bg-green-900/40 text-green-300' : 'bg-red-900/40 text-red-300'}`}>
                            {p.con_goce ? 'Sí' : 'No'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_COLORS[p.estado]}`}>{ESTADO_LABELS[p.estado]}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 max-w-[140px] truncate">{p.motivo ?? '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {p.estado === 'pendiente' && (
                              <>
                                <button onClick={() => updateEstado('rh_permisos', p.id, 'aprobado')} className="p-1.5 rounded-lg hover:bg-green-900/40 text-green-400 transition-colors" title="Aprobar"><Check size={14} /></button>
                                <button onClick={() => updateEstado('rh_permisos', p.id, 'rechazado')} className="p-1.5 rounded-lg hover:bg-red-900/40 text-red-400 transition-colors" title="Rechazar"><XCircle size={14} /></button>
                              </>
                            )}
                            <button onClick={() => deleteRecord('rh_permisos', p.id)} className="p-1.5 rounded-lg hover:bg-red-900/40 text-gray-500 hover:text-red-400 transition-colors" title="Eliminar"><X size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── TIEMPOS EXTRAS ── */}
            {activeTab === 'tiempos_extras' && (
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #243f72' }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ backgroundColor: '#1e2d4a' }}>
                      {['Empleado', 'Fecha', 'Horas', 'Factor', 'Costo Extra', 'Estado', 'Descripción', 'Acciones'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filterList(tiemposExtras).length === 0 ? (
                      <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">No hay registros</td></tr>
                    ) : filterList(tiemposExtras).map((t) => {
                      const hr = t.employees ? hourlyRate(t.employees.salary, t.employees.salary_frequency) : 0;
                      const costoExtra = Number(t.horas) * hr * Number(t.factor_pago);
                      return (
                        <tr key={t.id} className="border-t hover:bg-white/5 transition-colors" style={{ borderColor: '#243f72' }}>
                          <td className="px-4 py-3 text-white font-medium">{t.employees?.name ?? '—'}</td>
                          <td className="px-4 py-3 text-gray-300">{formatDate(t.fecha)}</td>
                          <td className="px-4 py-3 text-gray-300">{t.horas}h</td>
                          <td className="px-4 py-3 text-gray-300">x{t.factor_pago}</td>
                          <td className="px-4 py-3 text-amber-300 font-medium">
                            {hr > 0 ? `$${costoExtra.toFixed(2)}` : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_COLORS[t.estado]}`}>{ESTADO_LABELS[t.estado]}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-400 max-w-[140px] truncate">{t.descripcion ?? '—'}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              {t.estado === 'pendiente' && (
                                <>
                                  <button onClick={() => updateEstado('rh_tiempos_extras', t.id, 'aprobado')} className="p-1.5 rounded-lg hover:bg-green-900/40 text-green-400 transition-colors" title="Aprobar"><Check size={14} /></button>
                                  <button onClick={() => updateEstado('rh_tiempos_extras', t.id, 'rechazado')} className="p-1.5 rounded-lg hover:bg-red-900/40 text-red-400 transition-colors" title="Rechazar"><XCircle size={14} /></button>
                                </>
                              )}
                              <button onClick={() => deleteRecord('rh_tiempos_extras', t.id)} className="p-1.5 rounded-lg hover:bg-red-900/40 text-gray-500 hover:text-red-400 transition-colors" title="Eliminar"><X size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── INCAPACIDADES ── */}
            {activeTab === 'incapacidades' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {incapacidades.length} incapacidad{incapacidades.length !== 1 ? 'es' : ''} registrada{incapacidades.length !== 1 ? 's' : ''}
                  </p>
                  <button
                    onClick={() => { setIncapForm({ employee_id: '', tipo: 'enfermedad_general', fecha_inicio: '', fecha_fin: '', folio_imss: '', porcentaje_salario: 60, notas: '' }); setShowModal('incapacidad'); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
                    style={{ backgroundColor: '#f59e0b', color: '#1B3A6B' }}
                  >
                    <Plus size={14} /> Registrar incapacidad
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid #243f72' }}>
                        {['Empleado', 'Tipo', 'Inicio', 'Fin', 'Días', 'Folio IMSS', '% Salario', 'Estado'].map(h => (
                          <th key={h} className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.4)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {incapacidades.length === 0 ? (
                        <tr><td colSpan={8} className="px-3 py-8 text-center text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                          Sin incapacidades registradas
                        </td></tr>
                      ) : incapacidades.map((inc) => {
                        const dias = inc.fecha_inicio && inc.fecha_fin
                          ? Math.ceil((new Date(inc.fecha_fin).getTime() - new Date(inc.fecha_inicio).getTime()) / 86400000) + 1
                          : inc.dias || 0;
                        const tipoLabels: Record<IncapTipo, string> = {
                          enfermedad_general: 'Enfermedad general',
                          accidente_trabajo: 'Accidente de trabajo',
                          maternidad: 'Maternidad',
                          paternidad: 'Paternidad',
                          covid: 'COVID-19',
                          otro: 'Otro',
                        };
                        const estadoColors: Record<Estado, { bg: string; color: string }> = {
                          pendiente: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
                          aprobado:  { bg: 'rgba(34,197,94,0.15)',  color: '#22c55e' },
                          rechazado: { bg: 'rgba(239,68,68,0.15)',  color: '#ef4444' },
                        };
                        const ec = estadoColors[inc.estado];
                        return (
                          <tr key={inc.id} className="border-b" style={{ borderColor: '#1e2d45' }}>
                            <td className="px-3 py-3">
                              <p className="font-semibold text-white text-xs">{inc.employeeName}</p>
                              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{inc.employeeRole}</p>
                            </td>
                            <td className="px-3 py-3 text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>{tipoLabels[inc.tipo]}</td>
                            <td className="px-3 py-3 text-xs font-mono" style={{ color: 'rgba(255,255,255,0.6)' }}>{inc.fecha_inicio}</td>
                            <td className="px-3 py-3 text-xs font-mono" style={{ color: 'rgba(255,255,255,0.6)' }}>{inc.fecha_fin}</td>
                            <td className="px-3 py-3 text-xs font-bold text-white">{dias}d</td>
                            <td className="px-3 py-3 text-xs font-mono" style={{ color: 'rgba(255,255,255,0.5)' }}>{inc.folio_imss || '—'}</td>
                            <td className="px-3 py-3 text-xs font-bold" style={{ color: '#f59e0b' }}>{inc.porcentaje_salario}%</td>
                            <td className="px-3 py-3">
                              <span className="text-xs px-2 py-0.5 rounded-full font-semibold capitalize"
                                style={{ backgroundColor: ec.bg, color: ec.color }}>
                                {inc.estado}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── RESUMEN NÓMINA ── */}
            {activeTab === 'resumen' && (
              <div className="space-y-4">
                {/* KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: 'Empleados Activos', value: employees.length, color: '#3b82f6', icon: Users },
                    { label: 'Vacaciones Aprobadas', value: vacaciones.filter((v) => v.estado === 'aprobado').length, color: '#10b981', icon: Umbrella },
                    { label: 'Permisos Sin Goce', value: permisos.filter((p) => p.estado === 'aprobado' && !p.con_goce).length, color: '#ef4444', icon: FileText },
                    { label: 'Tiempos Extras Aprobados', value: tiemposExtras.filter((t) => t.estado === 'aprobado').length, color: '#f59e0b', icon: Clock },
                  ].map((kpi) => {
                    const Icon = kpi.icon;
                    return (
                      <div key={kpi.label} className="rounded-xl p-4" style={{ backgroundColor: '#1e2d4a', border: '1px solid #243f72' }}>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${kpi.color}20` }}>
                            <Icon size={18} style={{ color: kpi.color }} />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-white">{kpi.value}</p>
                            <p className="text-xs text-gray-400">{kpi.label}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Tabla resumen por empleado */}
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #243f72' }}>
                  <div className="px-4 py-3 border-b" style={{ backgroundColor: '#1e2d4a', borderColor: '#243f72' }}>
                    <h3 className="text-sm font-semibold text-white">Impacto en Nómina por Empleado (mes actual)</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Basado en eventos aprobados. Descuentos por permisos sin goce, bonos por tiempos extras.</p>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ backgroundColor: '#162236' }}>
                        {['Empleado', 'Puesto', 'Salario Base', 'Hrs Mes', 'Días Vac.', 'Hrs Perm. S/G', 'Descuento', 'Bonus TE', 'Salario Neto Est.'].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {resumen.length === 0 ? (
                        <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500">No hay empleados activos</td></tr>
                      ) : resumen.map(({ emp, diasVac, horasPermSinGoce, horasTE, descuentoPermisos, bonusTE, salarioBase, salarioNeto, horasEsteMes }) => (
                        <tr key={emp.id} className="border-t hover:bg-white/5 transition-colors" style={{ borderColor: '#243f72' }}>
                          <td className="px-4 py-3 text-white font-medium">{emp.name}</td>
                          <td className="px-4 py-3 text-gray-400 text-xs">{emp.role}</td>
                          <td className="px-4 py-3 text-gray-300">${salarioBase.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                          <td className="px-4 py-3" style={{ color: horasEsteMes !== null ? (horasEsteMes >= 40 ? '#34d399' : '#fbbf24') : '#6b7280' }}>{horasEsteMes !== null ? `${horasEsteMes}h` : '—'}</td>
                          <td className="px-4 py-3 text-blue-300">{diasVac > 0 ? diasVac : '—'}</td>
                          <td className="px-4 py-3 text-orange-300">{horasPermSinGoce > 0 ? `${horasPermSinGoce}h` : '—'}</td>
                          <td className="px-4 py-3 text-red-400">{descuentoPermisos > 0 ? `-$${descuentoPermisos.toFixed(2)}` : '—'}</td>
                          <td className="px-4 py-3 text-green-400">{bonusTE > 0 ? `+$${bonusTE.toFixed(2)}` : '—'}</td>
                          <td className="px-4 py-3 font-semibold" style={{ color: salarioNeto >= salarioBase ? '#34d399' : '#f87171' }}>
                            ${salarioNeto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── MODALS ── */}

      {showModal === 'vacacion' && (
        <Modal title="Nueva Solicitud de Vacaciones" onClose={() => setShowModal(null)}>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Empleado *</label>
              <select value={vacForm.employee_id} onChange={(e) => setVacForm({ ...vacForm, employee_id: e.target.value })} className={inputCls} style={inputStyle}>
                <option value="">Seleccionar empleado</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.name} — {e.role}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Fecha Inicio *</label>
                <input type="date" value={vacForm.fecha_inicio} onChange={(e) => setVacForm({ ...vacForm, fecha_inicio: e.target.value })} className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className={labelCls}>Fecha Fin *</label>
                <input type="date" value={vacForm.fecha_fin} onChange={(e) => setVacForm({ ...vacForm, fecha_fin: e.target.value })} className={inputCls} style={inputStyle} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Notas</label>
              <textarea value={vacForm.notas} onChange={(e) => setVacForm({ ...vacForm, notas: e.target.value })} rows={2} className={inputCls} style={inputStyle} placeholder="Motivo o comentarios..." />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(null)} className="flex-1 py-2 rounded-lg text-sm text-gray-400 hover:bg-white/10 transition-colors" style={{ border: '1px solid #243f72' }}>Cancelar</button>
              <button onClick={saveVacacion} disabled={saving || !vacForm.employee_id || !vacForm.fecha_inicio || !vacForm.fecha_fin} className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50" style={{ backgroundColor: '#1B3A6B', color: '#f59e0b', border: '1px solid #243f72' }}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showModal === 'permiso' && (
        <Modal title="Nuevo Permiso" onClose={() => setShowModal(null)}>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Empleado *</label>
              <select value={permForm.employee_id} onChange={(e) => setPermForm({ ...permForm, employee_id: e.target.value })} className={inputCls} style={inputStyle}>
                <option value="">Seleccionar empleado</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.name} — {e.role}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Tipo de Permiso</label>
                <select value={permForm.tipo} onChange={(e) => setPermForm({ ...permForm, tipo: e.target.value as PermTipo })} className={inputCls} style={inputStyle}>
                  {Object.entries(PERM_TIPO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Fecha *</label>
                <input type="date" value={permForm.fecha} onChange={(e) => setPermForm({ ...permForm, fecha: e.target.value })} className={inputCls} style={inputStyle} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Horas</label>
                <input type="number" min="0.5" max="24" step="0.5" value={permForm.horas} onChange={(e) => setPermForm({ ...permForm, horas: e.target.value })} className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className={labelCls}>¿Con goce de sueldo?</label>
                <select value={permForm.con_goce ? 'si' : 'no'} onChange={(e) => setPermForm({ ...permForm, con_goce: e.target.value === 'si' })} className={inputCls} style={inputStyle}>
                  <option value="si">Sí</option>
                  <option value="no">No</option>
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>Motivo</label>
              <textarea value={permForm.motivo} onChange={(e) => setPermForm({ ...permForm, motivo: e.target.value })} rows={2} className={inputCls} style={inputStyle} placeholder="Descripción del permiso..." />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(null)} className="flex-1 py-2 rounded-lg text-sm text-gray-400 hover:bg-white/10 transition-colors" style={{ border: '1px solid #243f72' }}>Cancelar</button>
              <button onClick={savePermiso} disabled={saving || !permForm.employee_id || !permForm.fecha} className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50" style={{ backgroundColor: '#1B3A6B', color: '#f59e0b', border: '1px solid #243f72' }}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showModal === 'tiempo_extra' && (
        <Modal title="Nuevo Tiempo Extra" onClose={() => setShowModal(null)}>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Empleado *</label>
              <select value={teForm.employee_id} onChange={(e) => setTeForm({ ...teForm, employee_id: e.target.value })} className={inputCls} style={inputStyle}>
                <option value="">Seleccionar empleado</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.name} — {e.role}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Fecha *</label>
                <input type="date" value={teForm.fecha} onChange={(e) => setTeForm({ ...teForm, fecha: e.target.value })} className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className={labelCls}>Horas</label>
                <input type="number" min="0.5" max="24" step="0.5" value={teForm.horas} onChange={(e) => setTeForm({ ...teForm, horas: e.target.value })} className={inputCls} style={inputStyle} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Factor de Pago</label>
              <select value={teForm.factor_pago} onChange={(e) => setTeForm({ ...teForm, factor_pago: e.target.value })} className={inputCls} style={inputStyle}>
                <option value="1.5">1.5x — Tiempo extra normal</option>
                <option value="2.0">2.0x — Día festivo</option>
                <option value="3.0">3.0x — Día festivo doble</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Descripción</label>
              <textarea value={teForm.descripcion} onChange={(e) => setTeForm({ ...teForm, descripcion: e.target.value })} rows={2} className={inputCls} style={inputStyle} placeholder="Motivo del tiempo extra..." />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(null)} className="flex-1 py-2 rounded-lg text-sm text-gray-400 hover:bg-white/10 transition-colors" style={{ border: '1px solid #243f72' }}>Cancelar</button>
              <button onClick={saveTiempoExtra} disabled={saving || !teForm.employee_id || !teForm.fecha} className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50" style={{ backgroundColor: '#1B3A6B', color: '#f59e0b', border: '1px solid #243f72' }}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL: Incapacidad ── */}
      {showModal === 'incapacidad' && (
        <Modal title="Registrar Incapacidad" onClose={() => setShowModal(null)}>
          <div className="space-y-3">
            <div>
              <label className={labelCls}>Empleado *</label>
              <select value={incapForm.employee_id} onChange={(e) => setIncapForm({ ...incapForm, employee_id: e.target.value })} className={inputCls} style={inputStyle}>
                <option value="">Seleccionar empleado...</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.name} — {e.role}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Tipo de incapacidad *</label>
              <select value={incapForm.tipo} onChange={(e) => setIncapForm({ ...incapForm, tipo: e.target.value as IncapTipo })} className={inputCls} style={inputStyle}>
                <option value="enfermedad_general">Enfermedad general</option>
                <option value="accidente_trabajo">Accidente de trabajo</option>
                <option value="maternidad">Maternidad</option>
                <option value="paternidad">Paternidad</option>
                <option value="covid">COVID-19</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Fecha inicio *</label>
                <input type="date" value={incapForm.fecha_inicio} onChange={(e) => setIncapForm({ ...incapForm, fecha_inicio: e.target.value })} className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className={labelCls}>Fecha fin *</label>
                <input type="date" value={incapForm.fecha_fin} onChange={(e) => setIncapForm({ ...incapForm, fecha_fin: e.target.value })} className={inputCls} style={inputStyle} />
              </div>
            </div>
            {incapForm.fecha_inicio && incapForm.fecha_fin && (
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Días: {Math.max(0, Math.ceil((new Date(incapForm.fecha_fin).getTime() - new Date(incapForm.fecha_inicio).getTime()) / 86400000) + 1)}
              </p>
            )}
            <div>
              <label className={labelCls}>Folio IMSS</label>
              <input value={incapForm.folio_imss} onChange={(e) => setIncapForm({ ...incapForm, folio_imss: e.target.value })} className={inputCls} style={inputStyle} placeholder="Número de folio del certificado" />
            </div>
            <div>
              <label className={labelCls}>% de salario a pagar ({incapForm.porcentaje_salario}%)</label>
              <input type="range" min={0} max={100} step={5} value={incapForm.porcentaje_salario}
                onChange={(e) => setIncapForm({ ...incapForm, porcentaje_salario: Number(e.target.value) })}
                className="w-full" />
              <div className="flex justify-between text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                <span>0% (sin goce)</span><span>60% (IMSS)</span><span>100% (goce completo)</span>
              </div>
            </div>
            <div>
              <label className={labelCls}>Notas / Diagnóstico</label>
              <textarea value={incapForm.notas} onChange={(e) => setIncapForm({ ...incapForm, notas: e.target.value })} rows={2} className={inputCls} style={inputStyle} placeholder="Descripción del diagnóstico, observaciones..." />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(null)} className="flex-1 py-2 rounded-lg text-sm text-gray-400 hover:bg-white/10 transition-colors" style={{ border: '1px solid #243f72' }}>Cancelar</button>
              <button onClick={saveIncapacidad} disabled={saving || !incapForm.employee_id || !incapForm.fecha_inicio || !incapForm.fecha_fin} className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50" style={{ backgroundColor: '#1B3A6B', color: '#f59e0b', border: '1px solid #243f72' }}>
                {saving ? 'Guardando...' : 'Registrar'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}