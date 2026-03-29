'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Plus, Search, Pencil, Trash2, X, Users, Phone, Calendar, ChevronDown,
  UserCheck, UserX, DollarSign, TrendingUp, Clock,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = 'Administrador' | 'Gerente' | 'Cajero' | 'Mesero' | 'Cocinero' | 'Ayudante de Cocina' | 'Repartidor';
type Status = 'activo' | 'inactivo';
type FilterStatus = 'Todos' | 'Activos' | 'Inactivos';
type SalaryFrequency = 'mensual' | 'quincenal' | 'semanal';

interface Employee {
  id: string;
  name: string;
  role: Role;
  phone: string;
  hireDate: string;
  status: Status;
  salary: number;
  salaryFrequency: SalaryFrequency;
}

const ROLES: Role[] = ['Administrador', 'Gerente', 'Cajero', 'Mesero', 'Cocinero', 'Ayudante de Cocina', 'Repartidor'];
const FILTER_STATUSES: FilterStatus[] = ['Todos', 'Activos', 'Inactivos'];
const SALARY_FREQUENCIES: { value: SalaryFrequency; label: string }[] = [
  { value: 'mensual', label: 'Mensual' },
  { value: 'quincenal', label: 'Quincenal' },
  { value: 'semanal', label: 'Semanal' },
];

const ROLE_COLORS: Record<Role, string> = {
  Administrador: 'bg-amber-900/40 text-amber-300',
  Gerente: 'bg-blue-900/40 text-blue-300',
  Cajero: 'bg-purple-900/40 text-purple-300',
  Mesero: 'bg-green-900/40 text-green-300',
  Cocinero: 'bg-red-900/40 text-red-300',
  'Ayudante de Cocina': 'bg-orange-900/40 text-orange-300',
  Repartidor: 'bg-teal-900/40 text-teal-300',
};

function formatDate(iso: string): string {
  if (!iso) return '—';
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

const AVATAR_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];
function avatarColor(id: string): string {
  const idx = id.charCodeAt(id.length - 1) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

function toMonthlySalary(salary: number, freq: SalaryFrequency): number {
  if (freq === 'mensual') return salary;
  if (freq === 'quincenal') return salary * 2;
  if (freq === 'semanal') return salary * 4.33;
  return salary;
}

const emptyForm = (): Omit<Employee, 'id'> => ({
  name: '', role: 'Mesero', phone: '', hireDate: '', status: 'activo',
  salary: 0, salaryFrequency: 'mensual',
});

// ─── Shift Schedule Types ─────────────────────────────────────────────────────

type ShiftType = 'matutino' | 'vespertino' | 'nocturno' | 'descanso';

interface EmployeeShift {
  employeeId: string;
  day: string;
  shift: ShiftType;
}

const DAYS_OF_WEEK = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const SHIFT_CONFIG: Record<ShiftType, { label: string; color: string; bg: string }> = {
  matutino: { label: 'Matutino', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  vespertino: { label: 'Vespertino', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  nocturno: { label: 'Nocturno', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
  descanso: { label: 'Descanso', color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
};

// ─── Skeleton ────────────────────────────────────────────────────────────────

function RowSkeleton() {
  return (
    <tr className="border-b animate-pulse" style={{ borderColor: '#243f72' }}>
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-4 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.07)', width: i === 0 ? '160px' : '80px' }} />
        </td>
      ))}
    </tr>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <tr>
      <td colSpan={7} className="py-16 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'rgba(245,158,11,0.12)' }}>
            <Users size={28} style={{ color: '#f59e0b' }} />
          </div>
          <div>
            <p className="text-base font-semibold text-white mb-1">No hay empleados registrados</p>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Agrega a tu equipo de trabajo para gestionar el personal del restaurante.</p>
          </div>
          <button onClick={onAdd} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:brightness-110" style={{ backgroundColor: '#f59e0b', color: '#1B3A6B' }}>
            <Plus size={16} />Agregar primer empleado
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PersonalManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('Todos');
  const [filterRole, setFilterRole] = useState<Role | 'Todos'>('Todos');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Employee, 'id'>>(emptyForm());
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof Omit<Employee, 'id'>, string>>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'empleados' | 'turnos' | 'asistencia'>('empleados');
  const [shifts, setShifts] = useState<EmployeeShift[]>([]);
  const [shiftsLoading, setShiftsLoading] = useState(false);
  const [attendance, setAttendance] = useState<{id:string;employeeId:string;employeeName:string;date:string;checkIn:string|null;checkOut:string|null;hoursWorked:number|null}[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [savingShift, setSavingShift] = useState(false);

  const supabase = createClient();

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('employees').select('*').order('name');
    if (error) {
      toast.error('Error al cargar personal. Verifica tu conexión.');
      setLoading(false);
      return;
    }
    if (data) {
      setEmployees(data.map((e) => ({
        id: e.id,
        name: e.name,
        role: e.role as Role,
        phone: e.phone,
        hireDate: e.hire_date || '',
        status: e.status as Status,
        salary: Number(e.salary ?? 0),
        salaryFrequency: (e.salary_frequency ?? 'mensual') as SalaryFrequency,
      })));
    }
    setLoading(false);
  }, []);

  const fetchShifts = useCallback(async () => {
    setShiftsLoading(true);
    try {
      const { data, error } = await supabase
        .from('employee_shifts')
        .select('employee_id, day, shift');
      if (error) throw error;
      setShifts((data || []).map((s: any) => ({
        employeeId: s.employee_id,
        day: s.day,
        shift: s.shift as ShiftType,
      })));
    } catch {
      // Table may not exist yet — silently ignore
    }
    setShiftsLoading(false);
  }, []);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  useEffect(() => {
    if (activeTab === 'turnos') fetchShifts();
  }, [activeTab, fetchShifts]);

  const activeCount = useMemo(() => employees.filter((e) => e.status === 'activo').length, [employees]);
  const inactiveCount = useMemo(() => employees.filter((e) => e.status === 'inactivo').length, [employees]);

  // Payroll calculations
  const totalMonthlyPayroll = useMemo(() => {
    return employees
      .filter((e) => e.status === 'activo')
      .reduce((sum, e) => sum + toMonthlySalary(e.salary, e.salaryFrequency), 0);
  }, [employees]);

  const avgSalary = useMemo(() => {
    const active = employees.filter((e) => e.status === 'activo' && e.salary > 0);
    if (active.length === 0) return 0;
    return active.reduce((sum, e) => sum + toMonthlySalary(e.salary, e.salaryFrequency), 0) / active.length;
  }, [employees]);

  const filtered = useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch = emp.name.toLowerCase().includes(search.toLowerCase()) || emp.role.toLowerCase().includes(search.toLowerCase()) || emp.phone.includes(search);
      const matchesStatus = filterStatus === 'Todos' || (filterStatus === 'Activos' && emp.status === 'activo') || (filterStatus === 'Inactivos' && emp.status === 'inactivo');
      const matchesRole = filterRole === 'Todos' || emp.role === filterRole;
      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [employees, search, filterStatus, filterRole]);

  function openAdd() { setEditingId(null); setForm(emptyForm()); setFormErrors({}); setModalOpen(true); }
  function openEdit(emp: Employee) {
    setEditingId(emp.id);
    setForm({ name: emp.name, role: emp.role, phone: emp.phone, hireDate: emp.hireDate, status: emp.status, salary: emp.salary, salaryFrequency: emp.salaryFrequency });
    setFormErrors({});
    setModalOpen(true);
  }
  function closeModal() { setModalOpen(false); setEditingId(null); setForm(emptyForm()); setFormErrors({}); }

  function validate(): boolean {
    const errors: Partial<Record<keyof Omit<Employee, 'id'>, string>> = {};
    if (!form.name.trim()) errors.name = 'El nombre es requerido';
    if (!form.phone.trim()) errors.phone = 'El teléfono es requerido';
    if (!form.hireDate) errors.hireDate = 'La fecha de contratación es requerida';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    if (editingId) {
      const { error } = await supabase.from('employees').update({
        name: form.name, role: form.role, phone: form.phone,
        hire_date: form.hireDate || null, status: form.status,
        salary: form.salary, salary_frequency: form.salaryFrequency,
        updated_at: new Date().toISOString(),
      }).eq('id', editingId);
      if (error) { toast.error('Error al actualizar empleado.'); return; }
    } else {
      const { error } = await supabase.from('employees').insert({
        name: form.name, role: form.role, phone: form.phone,
        hire_date: form.hireDate || null, status: form.status,
        salary: form.salary, salary_frequency: form.salaryFrequency,
      });
      if (error) { toast.error('Error al agregar empleado.'); return; }
    }
    closeModal();
    await fetchEmployees();
  }

  async function handleDelete() {
    if (!deleteId) return;
    const { error } = await supabase.from('employees').delete().eq('id', deleteId);
    if (error) { toast.error('Error al eliminar empleado.'); return; }
    setDeleteId(null);
    await fetchEmployees();
  }

  async function toggleStatus(id: string) {
    const emp = employees.find((e) => e.id === id);
    if (!emp) return;
    const { error } = await supabase.from('employees').update({ status: emp.status === 'activo' ? 'inactivo' : 'activo', updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error('Error al cambiar estado del empleado.'); return; }
    await fetchEmployees();
  }

  function updateForm<K extends keyof Omit<Employee, 'id'>>(key: K, value: Omit<Employee, 'id'>[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (formErrors[key]) setFormErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  const fetchAttendance = useCallback(async (date: string) => {
    setAttendanceLoading(true);
    try {
      const { data, error } = await supabase
        .from('employee_attendance')
        .select('*, employees(name)')
        .eq('date', date)
        .order('check_in', { ascending: true });
      if (error) throw error;
      setAttendance((data || []).map((r: any) => ({
        id: r.id,
        employeeId: r.employee_id,
        employeeName: r.employees?.name ?? '—',
        date: r.date,
        checkIn: r.check_in,
        checkOut: r.check_out,
        hoursWorked: r.hours_worked,
      })));
    } catch { /* tabla puede no existir aún */ }
    finally { setAttendanceLoading(false); }
  }, [supabase]);

  useEffect(() => {
    if (activeTab === 'asistencia') fetchAttendance(selectedDate);
  }, [activeTab, selectedDate, fetchAttendance]);

  const handleCheckIn = async (employeeId: string) => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().slice(0,5);
    const { error } = await supabase.from('employee_attendance').insert({
      employee_id: employeeId, date: dateStr, check_in: timeStr,
    });
    if (error) { toast.error('Error al registrar entrada: ' + error.message); return; }
    toast.success('Entrada registrada');
    fetchAttendance(selectedDate);
  };

  const handleCheckOut = async (recordId: string, checkIn: string) => {
    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 5);
    const [inH, inM] = checkIn.split(':').map(Number);
    const [outH, outM] = timeStr.split(':').map(Number);
    const hoursWorked = Math.round(((outH * 60 + outM) - (inH * 60 + inM)) / 60 * 100) / 100;
    const { error } = await supabase.from('employee_attendance')
      .update({ check_out: timeStr, hours_worked: hoursWorked, updated_at: new Date().toISOString() })
      .eq('id', recordId);
    if (error) { toast.error('Error al registrar salida: ' + error.message); return; }
    toast.success(`Salida registrada · ${hoursWorked}h trabajadas`);
    fetchAttendance(selectedDate);
  };

  async function handleShiftChange(employeeId: string, day: string, shift: ShiftType) {
    setSavingShift(true);
    try {
      const { error } = await supabase
        .from('employee_shifts')
        .upsert(
          { employee_id: employeeId, day, shift, updated_at: new Date().toISOString() },
          { onConflict: 'employee_id,day' }
        );
      if (error) throw error;
      setShifts((prev) => {
        const filtered = prev.filter((s) => !(s.employeeId === employeeId && s.day === day));
        return [...filtered, { employeeId, day, shift }];
      });
    } catch {
      toast.error('Error al guardar turno. Verifica tu conexión.');
    }
    setSavingShift(false);
  }

  function getShift(employeeId: string, day: string): ShiftType {
    return shifts.find((s) => s.employeeId === employeeId && s.day === day)?.shift ?? 'descanso';
  }

  function openShiftSchedule() {
    setActiveTab('turnos');
  }

  function openEmployeeList() {
    setActiveTab('empleados');
  }

  function getShiftColor(shift: ShiftType): string {
    return SHIFT_CONFIG[shift].color;
  }

  function getShiftBg(shift: ShiftType): string {
    return SHIFT_CONFIG[shift].bg;
  }

  function getShiftLabel(shift: ShiftType): string {
    return SHIFT_CONFIG[shift].label;
  }

  const deleteTarget = employees.find((e) => e.id === deleteId);

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#0f1e38' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: '#243f72', backgroundColor: '#0f1e38' }}>
        <div>
          <h1 className="text-xl font-bold text-white">Personal</h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>Gestión de empleados y recursos humanos</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90" style={{ backgroundColor: '#f59e0b', color: '#1B3A6B' }}>
          <Plus size={16} />Agregar Empleado
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 px-6 pt-3 pb-0 border-b flex-shrink-0" style={{ borderColor: '#243f72' }}>
        {[
          { key: 'empleados', label: 'Empleados' },
          { key: 'turnos', label: 'Turnos Semanales' },
          { key: 'asistencia', label: 'Asistencia' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as 'empleados' | 'turnos')}
            className="px-4 py-2.5 text-sm font-semibold border-b-2 transition-all duration-150"
            style={{
              borderColor: activeTab === tab.key ? '#f59e0b' : 'transparent',
              color: activeTab === tab.key ? '#f59e0b' : 'rgba(255,255,255,0.5)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'empleados' ? (
        <>
          {/* Stats bar */}
          <div className="flex items-center gap-6 px-6 py-3 border-b flex-shrink-0 flex-wrap" style={{ borderColor: '#243f72', backgroundColor: '#132240' }}>
            <div className="flex items-center gap-2">
              <Users size={16} style={{ color: '#f59e0b' }} />
              <span className="text-sm text-white font-semibold">{loading ? '…' : employees.length}</span>
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>empleados totales</span>
            </div>
            {!loading && (
              <>
                <div className="flex items-center gap-2">
                  <UserCheck size={14} className="text-green-400" />
                  <span className="text-sm text-green-400 font-semibold">{activeCount}</span>
                  <span className="text-sm text-green-400">activos</span>
                </div>
                <div className="flex items-center gap-2">
                  <UserX size={14} className="text-red-400" />
                  <span className="text-sm text-red-400 font-semibold">{inactiveCount}</span>
                  <span className="text-sm text-red-400">inactivos</span>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <DollarSign size={14} style={{ color: '#f59e0b' }} />
                  <span className="text-sm font-semibold" style={{ color: '#f59e0b' }}>
                    Nómina mensual: ${totalMonthlyPayroll.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                  {avgSalary > 0 && (
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      · Promedio: ${avgSalary.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/mes
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-3 px-6 py-3 border-b flex-shrink-0" style={{ borderColor: '#243f72' }}>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-48 max-w-sm">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.35)' }} />
                <input type="text" placeholder="Buscar empleado..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none" style={{ backgroundColor: '#1a2f52', border: '1px solid #243f72', color: 'rgba(255,255,255,0.85)' }} />
              </div>
              <div className="flex items-center gap-1 rounded-lg p-1" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                {FILTER_STATUSES.map((s) => (
                  <button key={s} onClick={() => setFilterStatus(s)} className="px-3 py-1.5 rounded-md text-xs font-semibold transition-all" style={{ backgroundColor: filterStatus === s ? '#f59e0b' : 'transparent', color: filterStatus === s ? '#1B3A6B' : 'rgba(255,255,255,0.6)' }}>{s}</button>
                ))}
              </div>
              <div className="relative">
                <select value={filterRole} onChange={(e) => setFilterRole(e.target.value as Role | 'Todos')} className="pl-3 pr-8 py-2 rounded-lg text-sm outline-none appearance-none" style={{ backgroundColor: '#1a2f52', border: '1px solid #243f72', color: 'rgba(255,255,255,0.85)' }}>
                  <option value="Todos" style={{ backgroundColor: '#162d55' }}>Todos los roles</option>
                  {ROLES.map((r) => <option key={r} value={r} style={{ backgroundColor: '#162d55' }}>{r}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgba(255,255,255,0.4)' }} />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full">
              <thead className="sticky top-0 z-10" style={{ backgroundColor: '#132240' }}>
                <tr className="border-b" style={{ borderColor: '#243f72' }}>
                  {['Empleado', 'Rol', 'Teléfono', 'Contratación', 'Salario', 'Estado', 'Acciones'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.45)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => <RowSkeleton key={i} />)
                ) : employees.length === 0 ? (
                  <EmptyState onAdd={openAdd} />
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        {search ? `Sin resultados para "${search}"` : 'No hay empleados con este filtro'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((emp) => (
                    <tr key={emp.id} className="border-b transition-colors hover:bg-white/5" style={{ borderColor: '#1a2f52' }}>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: avatarColor(emp.id), color: '#1B3A6B' }}>
                            {getInitials(emp.name)}
                          </div>
                          <span className="text-sm font-semibold text-white">{emp.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${ROLE_COLORS[emp.role]}`}>{emp.role}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <Phone size={12} style={{ color: 'rgba(255,255,255,0.4)' }} />
                          <span className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{emp.phone}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={12} style={{ color: 'rgba(255,255,255,0.4)' }} />
                          <span className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{formatDate(emp.hireDate)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {emp.salary > 0 ? (
                          <div>
                            <p className="text-sm font-mono font-semibold" style={{ color: '#34d399' }}>
                              ${emp.salary.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                            </p>
                            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{emp.salaryFrequency}</p>
                          </div>
                        ) : (
                          <span className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <button onClick={() => toggleStatus(emp.id)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all" style={{ backgroundColor: emp.status === 'activo' ? 'rgba(52,211,153,0.15)' : 'rgba(239,68,68,0.15)', color: emp.status === 'activo' ? '#34d399' : '#f87171', border: emp.status === 'activo' ? '1px solid rgba(52,211,153,0.3)' : '1px solid rgba(239,68,68,0.3)' }}>
                          {emp.status === 'activo' ? <UserCheck size={11} /> : <UserX size={11} />}
                          {emp.status === 'activo' ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(emp)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" title="Editar"><Pencil size={13} style={{ color: 'rgba(255,255,255,0.5)' }} /></button>
                          <button onClick={() => setDeleteId(emp.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors" title="Eliminar"><Trash2 size={13} className="text-red-400" /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Payroll summary footer */}
          {!loading && employees.length > 0 && (
            <div className="flex items-center gap-6 px-6 py-3 border-t flex-shrink-0 flex-wrap" style={{ borderColor: '#243f72', backgroundColor: '#132240' }}>
              <div className="flex items-center gap-2">
                <TrendingUp size={14} style={{ color: '#f59e0b' }} />
                <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>Resumen de nómina (empleados activos):</span>
              </div>
              {ROLES.map((role) => {
                const roleEmps = employees.filter((e) => e.role === role && e.status === 'activo' && e.salary > 0);
                if (roleEmps.length === 0) return null;
                const total = roleEmps.reduce((s, e) => s + toMonthlySalary(e.salary, e.salaryFrequency), 0);
                return (
                  <div key={role} className="flex items-center gap-1.5">
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{role}:</span>
                    <span className="text-xs font-mono font-semibold text-white">${total.toLocaleString('es-MX', { minimumFractionDigits: 0 })}/mes</span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* ─── Turnos Semanales Tab ─── */
        <div className="flex-1 overflow-auto p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Turnos Semanales</h2>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>Asigna turno matutino, vespertino, nocturno o descanso por empleado y día</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Legend */}
              {Object.entries(SHIFT_CONFIG).map(([key, cfg]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{cfg.label}</span>
                </div>
              ))}
            </div>
          </div>

          {shiftsLoading || loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#f59e0b', borderTopColor: 'transparent' }} />
            </div>
          ) : employees.filter((e) => e.status === 'activo').length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Clock size={32} style={{ color: 'rgba(255,255,255,0.2)' }} />
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>No hay empleados activos para asignar turnos</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border" style={{ borderColor: '#243f72' }}>
              <table className="w-full">
                <thead style={{ backgroundColor: '#132240' }}>
                  <tr className="border-b" style={{ borderColor: '#243f72' }}>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide sticky left-0 z-10" style={{ color: 'rgba(255,255,255,0.45)', backgroundColor: '#132240', minWidth: '160px' }}>Empleado</th>
                    {DAYS_OF_WEEK.map((day) => (
                      <th key={day} className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.45)', minWidth: '110px' }}>{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.filter((e) => e.status === 'activo').map((emp) => (
                    <tr key={emp.id} className="border-b" style={{ borderColor: '#1a2f52' }}>
                      <td className="px-4 py-3 sticky left-0 z-10" style={{ backgroundColor: '#0f1e38' }}>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: avatarColor(emp.id), color: '#1B3A6B' }}>
                            {getInitials(emp.name)}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-white leading-tight">{emp.name}</p>
                            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{emp.role}</p>
                          </div>
                        </div>
                      </td>
                      {DAYS_OF_WEEK.map((day) => {
                        const currentShift = getShift(emp.id, day);
                        const cfg = SHIFT_CONFIG[currentShift];
                        return (
                          <td key={day} className="px-2 py-2 text-center">
                            <div className="relative">
                              <select
                                value={currentShift}
                                onChange={(e) => handleShiftChange(emp.id, day, e.target.value as ShiftType)}
                                disabled={savingShift}
                                className="w-full px-2 py-1.5 rounded-lg text-xs font-semibold outline-none appearance-none text-center cursor-pointer transition-all"
                                style={{
                                  backgroundColor: cfg.bg,
                                  color: cfg.color,
                                  border: `1px solid ${cfg.color}40`,
                                }}
                              >
                                {Object.entries(SHIFT_CONFIG).map(([key, c]) => (
                                  <option key={key} value={key} style={{ backgroundColor: '#162d55', color: c.color }}>
                                    {c.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── Asistencia Tab ─── */}
      {activeTab === 'asistencia' && (
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header con selector de fecha */}
          <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: '#243f72' }}>
            <div>
              <h2 className="text-base font-bold text-white">Control de Asistencia</h2>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Registra entradas y salidas del personal
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="px-3 py-2 rounded-lg text-sm outline-none"
                style={{ backgroundColor: '#1a2f52', border: '1px solid #243f72', color: '#f1f5f9' }}
              />
            </div>
          </div>

          {/* KPIs rápidos */}
          {(() => {
            const present = attendance.filter(a => a.checkIn).length;
            const withCheckout = attendance.filter(a => a.checkOut).length;
            const avgHours = withCheckout > 0
              ? (attendance.filter(a => a.hoursWorked).reduce((s, a) => s + (a.hoursWorked ?? 0), 0) / withCheckout).toFixed(1)
              : '—';
            return (
              <div className="grid grid-cols-3 gap-4 px-6 py-4 flex-shrink-0">
                {[
                  { label: 'Presentes hoy', value: present, color: '#22c55e' },
                  { label: 'Ya salieron', value: withCheckout, color: '#3b82f6' },
                  { label: 'Hrs promedio', value: avgHours, color: '#f59e0b' },
                ].map(kpi => (
                  <div key={kpi.label} className="rounded-xl p-3 text-center"
                    style={{ backgroundColor: '#1a2f52', border: '1px solid #243f72' }}>
                    <p className="text-xl font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>{kpi.label}</p>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Lista de empleados activos con botones de checkin/checkout */}
          <div className="flex-1 overflow-auto px-6 pb-4">
            {attendanceLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#f59e0b', borderTopColor: 'transparent' }} />
              </div>
            ) : (
              <div className="space-y-2">
                {employees.filter(e => e.status === 'activo').map(emp => {
                  const record = attendance.find(a => a.employeeId === emp.id);
                  const hasIn  = !!record?.checkIn;
                  const hasOut = !!record?.checkOut;
                  return (
                    <div key={emp.id} className="flex items-center gap-4 px-4 py-3 rounded-xl"
                      style={{
                        backgroundColor: hasOut ? 'rgba(59,130,246,0.08)' : hasIn ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${hasOut ? 'rgba(59,130,246,0.2)' : hasIn ? 'rgba(34,197,94,0.2)' : '#243f72'}`,
                      }}>
                      {/* Indicador */}
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${hasOut ? 'bg-blue-400' : hasIn ? 'bg-green-400' : 'bg-gray-600'}`} />
                      {/* Nombre y rol */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{emp.name}</p>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{emp.role}</p>
                      </div>
                      {/* Horario registrado */}
                      <div className="text-right flex-shrink-0 mr-2">
                        {hasIn && (
                          <p className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.6)' }}>
                            {record!.checkIn}
                            {hasOut && <> → {record!.checkOut}</>}
                          </p>
                        )}
                        {record?.hoursWorked != null && (
                          <p className="text-xs font-semibold" style={{ color: '#f59e0b' }}>
                            {record.hoursWorked}h trabajadas
                          </p>
                        )}
                        {!hasIn && (
                          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Sin registro</p>
                        )}
                      </div>
                      {/* Botones */}
                      {!hasIn ? (
                        <button
                          onClick={() => handleCheckIn(emp.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                          style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }}>
                          <UserCheck size={13} /> Entrada
                        </button>
                      ) : !hasOut ? (
                        <button
                          onClick={() => handleCheckOut(record!.id, record!.checkIn!)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                          style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                          <UserX size={13} /> Salida
                        </button>
                      ) : (
                        <span className="text-xs px-3 py-1.5 rounded-lg"
                          style={{ backgroundColor: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}>
                          ✓ Completo
                        </span>
                      )}
                    </div>
                  );
                })}
                {employees.filter(e => e.status === 'activo').length === 0 && (
                  <p className="text-center text-sm py-8" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    No hay empleados activos registrados
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh]" style={{ backgroundColor: '#162d55', border: '1px solid #243f72' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: '#243f72' }}>
              <h2 className="font-bold text-white text-lg">{editingId ? 'Editar empleado' : 'Agregar empleado'}</h2>
              <button onClick={closeModal} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10" style={{ color: 'rgba(255,255,255,0.5)' }}><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Nombre completo <span className="text-red-400">*</span></label>
                <input type="text" value={form.name} onChange={(e) => updateForm('name', e.target.value)} placeholder="Ej. Carlos Mendoza" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: formErrors.name ? '1px solid #f87171' : '1px solid rgba(255,255,255,0.12)', color: 'white' }} />
                {formErrors.name && <p className="text-xs text-red-400 mt-1">{formErrors.name}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Rol</label>
                  <div className="relative">
                    <select value={form.role} onChange={(e) => updateForm('role', e.target.value as Role)} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none appearance-none" style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }}>
                      {ROLES.map((r) => <option key={r} value={r} style={{ backgroundColor: '#162d55' }}>{r}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgba(255,255,255,0.4)' }} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Estado</label>
                  <div className="relative">
                    <select value={form.status} onChange={(e) => updateForm('status', e.target.value as Status)} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none appearance-none" style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }}>
                      <option value="activo" style={{ backgroundColor: '#162d55' }}>Activo</option>
                      <option value="inactivo" style={{ backgroundColor: '#162d55' }}>Inactivo</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgba(255,255,255,0.4)' }} />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Teléfono <span className="text-red-400">*</span></label>
                <input type="text" value={form.phone} onChange={(e) => updateForm('phone', e.target.value)} placeholder="55 1234 5678" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: formErrors.phone ? '1px solid #f87171' : '1px solid rgba(255,255,255,0.12)', color: 'white' }} />
                {formErrors.phone && <p className="text-xs text-red-400 mt-1">{formErrors.phone}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Fecha de contratación <span className="text-red-400">*</span></label>
                <input type="date" value={form.hireDate} onChange={(e) => updateForm('hireDate', e.target.value)} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: formErrors.hireDate ? '1px solid #f87171' : '1px solid rgba(255,255,255,0.12)', color: 'white', colorScheme: 'dark' }} />
                {formErrors.hireDate && <p className="text-xs text-red-400 mt-1">{formErrors.hireDate}</p>}
              </div>
              {/* Salary section */}
              <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign size={14} style={{ color: '#f59e0b' }} />
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#f59e0b' }}>Salario</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Monto (MXN)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>$</span>
                      <input type="number" min={0} step={100} value={form.salary || ''} onChange={(e) => updateForm('salary', parseFloat(e.target.value) || 0)} placeholder="0.00" className="w-full pl-7 pr-3 py-2.5 rounded-xl text-sm outline-none" style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Frecuencia de pago</label>
                    <div className="relative">
                      <select value={form.salaryFrequency} onChange={(e) => updateForm('salaryFrequency', e.target.value as SalaryFrequency)} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none appearance-none" style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }}>
                        {SALARY_FREQUENCIES.map((f) => <option key={f.value} value={f.value} style={{ backgroundColor: '#162d55' }}>{f.label}</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgba(255,255,255,0.4)' }} />
                    </div>
                  </div>
                </div>
                {form.salary > 0 && (
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    Equivalente mensual: <span className="font-semibold" style={{ color: '#34d399' }}>
                      ${toMonthlySalary(form.salary, form.salaryFrequency).toLocaleString('es-MX', { minimumFractionDigits: 0 })}/mes
                    </span>
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t flex-shrink-0" style={{ borderColor: '#243f72' }}>
              <button onClick={closeModal} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}>Cancelar</button>
              <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{ backgroundColor: '#f59e0b', color: '#1B3A6B' }}>
                {editingId ? 'Guardar cambios' : 'Agregar empleado'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteId && deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl" style={{ backgroundColor: '#162d55', border: '1px solid #243f72' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(239,68,68,0.15)' }}>
                <Trash2 size={18} className="text-red-400" />
              </div>
              <div>
                <h3 className="font-bold text-white">Eliminar empleado</h3>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Esta acción no se puede deshacer</p>
              </div>
            </div>
            <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.75)' }}>
              ¿Estás seguro de que deseas eliminar a <span className="font-semibold text-white">"{deleteTarget.name}"</span>?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}>Cancelar</button>
              <button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-500 text-white">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}