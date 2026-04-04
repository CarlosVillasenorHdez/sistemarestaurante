'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, X, Pencil, Shield, Eye, EyeOff, UserCheck, RefreshCw, AlertCircle, Lock, ChevronDown, ChevronUp, CheckSquare, Square, Users } from 'lucide-react';
import { useAuth, AppRole, BUILTIN_ROLES } from '@/contexts/AuthContext';
import { invalidatePermissionsCache } from '@/hooks/useRolePermissions';
import { createClient } from '@/lib/supabase/client';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  gerente: 'Gerente',
  cajero: 'Cajero',
  mesero: 'Mesero',
  cocinero: 'Cocinero',
  ayudante_cocina: 'Ayudante de Cocina',
  repartidor: 'Repartidor',
};

const ROLE_COLORS: Record<string, string> = {
  admin: '#f59e0b',
  gerente: '#3b82f6',
  cajero: '#8b5cf6',
  mesero: '#10b981',
  cocinero: '#ef4444',
  ayudante_cocina: '#f97316',
  repartidor: '#14b8a6',
};

// ALL_ROLES is now dynamic — loaded from DB. Builtin roles are always included.
const BUILTIN_ROLE_LABELS: Record<string, string> = { admin: 'Administrador', gerente: 'Gerente', cajero: 'Cajero', mesero: 'Mesero', cocinero: 'Cocinero', ayudante_cocina: 'Ayudante de Cocina', repartidor: 'Repartidor' };
const BUILTIN_ROLE_COLORS: Record<string, string> = { admin: '#f59e0b', gerente: '#3b82f6', cajero: '#8b5cf6', mesero: '#10b981', cocinero: '#ef4444', ayudante_cocina: '#f97316', repartidor: '#14b8a6' };

// Map employee role strings to AppRole
const EMPLOYEE_ROLE_MAP: Record<string, AppRole> = {
  'Administrador': 'admin',
  'Gerente': 'gerente',
  'Cajero': 'cajero',
  'Mesero': 'mesero',
  'Cocinero': 'cocinero',
  'Ayudante de Cocina': 'ayudante_cocina',
  'Repartidor': 'repartidor',
};

// Pages that can be toggled per role
const PAGE_DEFINITIONS = [
  { key: 'dashboard',       label: 'Dashboard',         group: 'OPERACIONES' },
  { key: 'pos',             label: 'Punto de Venta',    group: 'OPERACIONES' },
  { key: 'mesero',          label: 'Mesero Móvil',      group: 'OPERACIONES' },
  { key: 'orders',          label: 'Órdenes',           group: 'OPERACIONES' },
  { key: 'corte_caja',      label: 'Corte de Caja',     group: 'OPERACIONES' },
  { key: 'cocina',          label: 'Cocina (KDS)',       group: 'OPERACIONES' },
  { key: 'delivery',        label: 'Delivery',          group: 'OPERACIONES' },
  { key: 'menu',            label: 'Menú',              group: 'GESTIÓN' },
  { key: 'inventario',      label: 'Inventario',        group: 'GESTIÓN' },
  { key: 'reservaciones',   label: 'Reservaciones',     group: 'GESTIÓN' },
  { key: 'lealtad',         label: 'Lealtad',           group: 'GESTIÓN' },
  { key: 'personal',        label: 'Personal',          group: 'GESTIÓN' },
  { key: 'recursos_humanos',label: 'Recursos Humanos',  group: 'GESTIÓN' },
  { key: 'gastos',          label: 'Gastos',            group: 'GESTIÓN' },
  { key: 'sucursales',      label: 'Multi-Sucursal',    group: 'GESTIÓN' },
  { key: 'reportes',        label: 'Reportes',          group: 'ANÁLISIS' },
  { key: 'alarmas',         label: 'Alarmas',           group: 'ANÁLISIS' },
  { key: 'configuracion',   label: 'Configuración',     group: 'SISTEMA' },
];

interface AppUser {
  id: string;
  authUserId?: string;
  username: string;
  fullName: string;
  appRole: AppRole;
  isActive: boolean;
}

interface Employee {
  id: string;
  name: string;
  role: string;
}

interface UserForm {
  username: string;
  fullName: string;
  password: string;
  appRole: AppRole;
  employeeId: string;
}

type RolePermissions = Record<string, boolean>;
type AllRolePermissions = Record<string, RolePermissions>;

const emptyForm = (): UserForm => ({ username: '', fullName: '', password: '12345', appRole: 'mesero', employeeId: '' });

export default function UsuariosManagement() {
  const { createUser, listUsers, toggleUserActive, updateUserRole } = useAuth();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<'usuarios' | 'permisos'>('usuarios');

  // Users state
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [pwModalOpen, setPwModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState<UserForm>(emptyForm());
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Employees from Personal
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empLoading, setEmpLoading] = useState(false);

  // Permissions state
  const [permissions, setPermissions] = useState<AllRolePermissions>({});
  const [permLoading, setPermLoading] = useState(true);
  const [permSaving, setPermSaving] = useState(false);
  const [permSaved, setPermSaved] = useState(false);
  const [expandedRole, setExpandedRole] = useState<string | null>('gerente');

  // All roles (builtin + custom from DB)
  const [allRoles, setAllRoles] = useState<string[]>([...BUILTIN_ROLES]);
  const [roleLabels, setRoleLabels] = useState<Record<string, string>>({ ...BUILTIN_ROLE_LABELS });
  const [roleColors] = useState<Record<string, string>>({ ...BUILTIN_ROLE_COLORS });

  // New custom profile form
  const [newProfileOpen, setNewProfileOpen] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileKey, setNewProfileKey] = useState('');
  const [newProfileError, setNewProfileError] = useState('');

  const isAdmin = true;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listUsers();
      setUsers(list);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [listUsers]);

  const fetchEmployees = useCallback(async () => {
    setEmpLoading(true);
    try {
      const { data } = await supabase.from('employees').select('id, name, role').order('name');
      if (data) setEmployees(data as Employee[]);
    } catch {
      // ignore
    } finally {
      setEmpLoading(false);
    }
  }, [supabase]);

  const fetchPermissions = useCallback(async () => {
    setPermLoading(true);
    try {
      const { data, error } = await supabase.from('role_permissions').select('*');

      // Build map from DB data
      const map: AllRolePermissions = {};
      const discoveredRoles = new Set<string>([...BUILTIN_ROLES]);
      const discoveredLabels: Record<string, string> = { ...BUILTIN_ROLE_LABELS };

      if (data && !error) {
        data.forEach((row: any) => {
          if (!map[row.role]) map[row.role] = {};
          map[row.role][row.page_key] = row.can_access;
          // Discover custom roles from DB
          if (!BUILTIN_ROLES.includes(row.role as typeof BUILTIN_ROLES[number])) {
            discoveredRoles.add(row.role);
            if (!discoveredLabels[row.role]) {
              // Convert key to label: 'supervisor_turno' -> 'Supervisor Turno'
              discoveredLabels[row.role] = row.role
                .split('_')
                .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(' ');
            }
          }
        });
      }

      // Ensure all roles have entries for all pages
      const roleList = Array.from(discoveredRoles);
      roleList.forEach((role) => {
        if (!map[role]) map[role] = {};
        PAGE_DEFINITIONS.forEach((page) => {
          if (!(page.key in map[role])) {
            map[role][page.key] = role === 'admin';
          }
        });
      });

      setAllRoles(roleList);
      setRoleLabels(discoveredLabels);
      setPermissions(map);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Error al cargar permisos');
    } finally {
      setPermLoading(false);
    }
  }, [supabase]);

  useEffect(() => { fetchUsers(); fetchEmployees(); }, [fetchUsers, fetchEmployees]);
  useEffect(() => { if (activeTab === 'permisos') fetchPermissions(); }, [activeTab, fetchPermissions]);

  // When employee is selected, auto-fill full name and role
  function handleEmployeeSelect(employeeId: string) {
    const emp = employees.find((e) => e.id === employeeId);
    if (emp) {
      const mappedRole = EMPLOYEE_ROLE_MAP[emp.role] ?? 'mesero';
      setForm((prev) => ({ ...prev, employeeId, fullName: emp.name, appRole: mappedRole }));
    } else {
      setForm((prev) => ({ ...prev, employeeId: '', fullName: '', appRole: 'mesero' }));
    }
  }

  async function handleCreateUser() {
    setFormError('');
    if (!form.employeeId) { setFormError('Selecciona un empleado del personal'); return; }
    if (!form.username.trim()) { setFormError('El nombre de usuario es requerido'); return; }
    if (form.password.length < 4) { setFormError('El PIN debe tener al menos 4 caracteres'); return; }
    setSaving(true);
    try {
      await createUser(form.username, form.password, form.fullName, form.appRole);
      setModalOpen(false);
      setForm(emptyForm());
      setSuccessMsg('Usuario creado exitosamente');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchUsers();
    } catch (e: any) {
      setFormError(e.message || 'Error al crear usuario');
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePin() {
    if (!selectedUser || newPassword.length < 4) return;
    setSaving(true);
    try {
      // Hash PIN with SHA-256 before saving (matches AuthContext)
      const encoder = new TextEncoder();
      const buf = await crypto.subtle.digest(
        'SHA-256',
        encoder.encode(newPassword + 'aldente_salt_2024')
      );
      const hashed = Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, '0')).join('');

      const { error } = await supabase
        .from('app_users')
        .update({ pin: hashed })
        .eq('id', selectedUser.id);
      if (error) throw error;
      setPwModalOpen(false);
      setNewPassword('');
      setSelectedUser(null);
      setSuccessMsg('PIN actualizado correctamente');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Error al cambiar PIN');
    } finally {
      setSaving(false);
    }
  }

  function togglePermission(role: string, pageKey: string) {
    if (role === 'admin') return;
    setPermissions((prev) => ({
      ...prev,
      [role]: { ...(prev[role] || {}), [pageKey]: !(prev[role]?.[pageKey] ?? false) },
    }));
  }

  async function handleSavePermissions() {
    setPermSaving(true);
    try {
      const rows: { role: string; page_key: string; can_access: boolean }[] = [];
      Object.entries(permissions).forEach(([role, pages]) => {
        Object.entries(pages).forEach(([page_key, can_access]) => {
          rows.push({ role, page_key, can_access: can_access as boolean });
        });
      });

      if (rows.length === 0) {
        setFormError('No hay permisos para guardar. Expande un rol y configura sus permisos.');
        setPermSaving(false);
        return;
      }

      const { error } = await supabase
        .from('role_permissions')
        .upsert(rows, { onConflict: 'role,page_key' });

      if (error) {
        setFormError('Error al guardar: ' + error.message);
        setPermSaving(false);
        return;
      }

      // Invalidate cache so Sidebar re-reads on next navigation
      invalidatePermissionsCache();
      setPermSaved(true);
      setFormError('');
      setTimeout(() => setPermSaved(false), 3000);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Error desconocido al guardar');
    } finally {
      setPermSaving(false);
    }
  }

  async function handleCreateProfile() {
    const key = newProfileKey.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!key || key.length < 2) {
      setNewProfileError('Ingresa un nombre válido (mínimo 2 caracteres)');
      return;
    }
    if (allRoles.includes(key)) {
      setNewProfileError('Ya existe un perfil con ese nombre');
      return;
    }

    // Create empty permissions for all pages (default false)
    const newPerms: RolePermissions = {};
    PAGE_DEFINITIONS.forEach((p) => { newPerms[p.key] = false; });

    // Save to DB
    const rows = PAGE_DEFINITIONS.map((p) => ({
      role: key, page_key: p.key, can_access: false,
    }));
    const { error } = await supabase
      .from('role_permissions')
      .upsert(rows, { onConflict: 'role,page_key' });

    if (error) {
      setNewProfileError('Error al crear perfil: ' + error.message);
      return;
    }

    const label = newProfileName.trim() ||
      key.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    setAllRoles((prev) => [...prev, key]);
    setRoleLabels((prev) => ({ ...prev, [key]: label }));
    setPermissions((prev) => ({ ...prev, [key]: newPerms }));
    setExpandedRole(key);
    setNewProfileOpen(false);
    setNewProfileName('');
    setNewProfileKey('');
    setNewProfileError('');
    invalidatePermissionsCache();
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Shield size={40} style={{ color: 'rgba(255,255,255,0.15)' }} />
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Solo el Administrador puede gestionar usuarios.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden flex flex-col" style={{ backgroundColor: '#162d55', border: '1px solid #243f72', minHeight: '500px' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#243f72' }}>
        <div className="flex items-center gap-3">
          <Shield size={20} style={{ color: '#f59e0b' }} />
          <div>
            <h2 className="text-base font-bold text-white">Gestión de Usuarios y Permisos</h2>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Administra accesos y perfiles del sistema</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchUsers} className="p-2 rounded-lg hover:bg-white/10 transition-all" title="Actualizar">
            <RefreshCw size={15} style={{ color: 'rgba(255,255,255,0.5)' }} />
          </button>
          {activeTab === 'usuarios' && (
            <button
              onClick={() => { setForm(emptyForm()); setFormError(''); setModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:brightness-110"
              style={{ backgroundColor: '#f59e0b', color: '#1B3A6B' }}
            >
              <Plus size={15} /> Nuevo usuario
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b" style={{ borderColor: '#243f72' }}>
        {[
          { id: 'usuarios', label: 'Usuarios' },
          { id: 'permisos', label: 'Permisos por Perfil' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'usuarios' | 'permisos')}
            className="px-5 py-3 text-sm font-medium transition-all"
            style={{
              color: activeTab === tab.id ? '#f59e0b' : 'rgba(255,255,255,0.45)',
              borderBottom: activeTab === tab.id ? '2px solid #f59e0b' : '2px solid transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Success */}
      {successMsg && (
        <div className="mx-6 mt-4 flex items-center gap-2 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80' }}>
          <UserCheck size={15} /> {successMsg}
        </div>
      )}

      {/* ── USUARIOS TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'usuarios' && (
        <div className="flex-1 overflow-auto">
          {/* Info note */}
          <div className="mx-6 mt-4 mb-2 flex items-start gap-2 px-4 py-3 rounded-xl text-xs" style={{ backgroundColor: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', color: 'rgba(255,255,255,0.55)' }}>
            <Users size={13} className="mt-0.5 flex-shrink-0" style={{ color: '#3b82f6' }} />
            <span>Los usuarios se crean a partir del personal registrado en la sección <strong className="text-white">Personal</strong>. Aquí puedes gestionar su acceso al sistema (login y PIN).</span>
          </div>
          <table className="w-full">
            <thead className="sticky top-0 z-10" style={{ backgroundColor: '#132240' }}>
              <tr className="border-b" style={{ borderColor: '#243f72' }}>
                {['Empleado', 'Usuario (login)', 'Perfil', 'PIN'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.45)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b animate-pulse" style={{ borderColor: '#243f72' }}>
                    {Array.from({ length: 4 }).map((_, j) => (
                      <td key={j} className="px-4 py-3.5"><div className="h-4 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.07)', width: j === 0 ? '140px' : '100px' }} /></td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr><td colSpan={4} className="py-12 text-center text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>No hay usuarios registrados</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-b transition-colors hover:bg-white/5" style={{ borderColor: '#1a2f52' }}>
                    {/* Empleado (full name from Personal) */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: `${(roleColors[u.appRole] ?? BUILTIN_ROLE_COLORS[u.appRole] ?? '#64748b')}25`, color: (roleColors[u.appRole] ?? BUILTIN_ROLE_COLORS[u.appRole] ?? '#64748b') }}>
                          {u.fullName ? u.fullName.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase() : '?'}
                        </div>
                        <span className="text-sm text-white">{u.fullName || '—'}</span>
                      </div>
                    </td>
                    {/* Login */}
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-mono font-semibold" style={{ color: '#f59e0b' }}>@{u.username}</span>
                    </td>
                    {/* Perfil (read-only badge) */}
                    <td className="px-4 py-3.5">
                      <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ backgroundColor: `${(roleColors[u.appRole] ?? BUILTIN_ROLE_COLORS[u.appRole] ?? '#64748b')}20`, color: (roleColors[u.appRole] ?? BUILTIN_ROLE_COLORS[u.appRole] ?? '#64748b') }}>
                        {(roleLabels[u.appRole] ?? u.appRole)}
                      </span>
                    </td>
                    {/* Password action */}
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => { setSelectedUser(u); setNewPassword(''); setFormError(''); setPwModalOpen(true); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:brightness-110"
                        style={{ backgroundColor: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}
                        title="Cambiar PIN"
                      >
                        <Pencil size={12} /> Cambiar PIN
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── PERMISOS TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'permisos' && (
        <div className="flex-1 overflow-auto p-5">
          <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Define qué secciones del sistema puede ver cada perfil. El Administrador siempre tiene acceso completo.
          </p>

          {permLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#f59e0b', borderTopColor: 'transparent' }} />
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-5">
                {allRoles.map((role) => {
                  const isAdminRole = role === 'admin';
                  const isExpanded = expandedRole === role;
                  const rolePerms = permissions[role] || {};
                  const accessCount = isAdminRole ? PAGE_DEFINITIONS.length : PAGE_DEFINITIONS.filter((p) => rolePerms[p.key]).length;

                  return (
                    <div key={role} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${isExpanded ? (roleColors[role] ?? '#64748b') + '40' : '#243f72'}` }}>
                      {/* Role header */}
                      <button
                        onClick={() => setExpandedRole(isExpanded ? null : role)}
                        className="w-full flex items-center justify-between px-4 py-3 transition-all"
                        style={{ backgroundColor: isExpanded ? `${(roleColors[role] ?? '#64748b')}10` : 'rgba(255,255,255,0.03)' }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: (roleColors[role] ?? '#64748b') }} />
                          <span className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>{roleLabels[role] ?? role}</span>
                          {isAdminRole && (
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                              Acceso total
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{accessCount}/{PAGE_DEFINITIONS.length} secciones</span>
                          {isExpanded ? <ChevronUp size={15} style={{ color: 'rgba(255,255,255,0.4)' }} /> : <ChevronDown size={15} style={{ color: 'rgba(255,255,255,0.4)' }} />}
                        </div>
                      </button>

                      {/* Pages list */}
                      {isExpanded && (
                        <div className="border-t" style={{ borderColor: '#243f72' }}>
                          {['OPERACIONES', 'GESTIÓN', 'ANÁLISIS', 'SISTEMA'].map((group) => {
                            const groupPages = PAGE_DEFINITIONS.filter((p) => p.group === group);
                            return (
                              <div key={group}>
                                <div className="px-4 py-2 text-xs font-semibold tracking-widest" style={{ color: 'rgba(255,255,255,0.3)', backgroundColor: 'rgba(0,0,0,0.2)' }}>
                                  {group}
                                </div>
                                {groupPages.map((page) => {
                                  const hasAccess = isAdminRole ? true : (rolePerms[page.key] ?? false);
                                  return (
                                    <div
                                      key={page.key}
                                      className="flex items-center justify-between px-4 py-2.5 border-t transition-all"
                                      style={{ borderColor: '#1a2f52', cursor: isAdminRole ? 'default' : 'pointer' }}
                                      onClick={() => !isAdminRole && togglePermission(role, page.key)}
                                    >
                                      <span className="text-sm" style={{ color: hasAccess ? '#f1f5f9' : 'rgba(255,255,255,0.35)' }}>{page.label}</span>
                                      <div className="flex items-center gap-2">
                                        {isAdminRole ? (
                                          <Lock size={13} style={{ color: 'rgba(255,255,255,0.3)' }} />
                                        ) : hasAccess ? (
                                          <CheckSquare size={17} style={{ color: (roleColors[role] ?? '#64748b') }} />
                                        ) : (
                                          <Square size={17} style={{ color: 'rgba(255,255,255,0.2)' }} />
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={handleSavePermissions}
                  disabled={permSaving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
                  style={{ backgroundColor: permSaved ? 'rgba(34,197,94,0.2)' : '#f59e0b', color: permSaved ? '#22c55e' : '#1B3A6B', border: permSaved ? '1px solid rgba(34,197,94,0.4)' : 'none' }}
                >
                  {permSaving ? (
                    <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#1B3A6B', borderTopColor: 'transparent' }} />
                  ) : permSaved ? (
                    <UserCheck size={15} />
                  ) : (
                    <Shield size={15} />
                  )}
                  {permSaved ? 'Permisos guardados' : 'Guardar Permisos'}
                </button>

                <button
                  onClick={() => { setNewProfileOpen(true); setNewProfileError(''); }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all"
                  style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#f1f5f9', border: '1px solid #2a3f5f' }}
                >
                  <Plus size={14} />
                  Nuevo Perfil
                </button>
              </div>

              {/* New Profile Modal */}
              {newProfileOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
                  <div className="w-full max-w-sm rounded-2xl p-6" style={{ backgroundColor: '#1a2535', border: '1px solid #2a3f5f' }}>
                    <div className="flex items-center justify-between mb-5">
                      <h2 className="text-base font-bold" style={{ color: '#f1f5f9' }}>Nuevo Perfil de Acceso</h2>
                      <button onClick={() => setNewProfileOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>
                        <X size={16} />
                      </button>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                          Nombre del perfil *
                        </label>
                        <input
                          type="text"
                          value={newProfileName}
                          onChange={(e) => {
                            setNewProfileName(e.target.value);
                            setNewProfileKey(e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''));
                            setNewProfileError('');
                          }}
                          placeholder="Ej: Supervisor de Turno"
                          maxLength={40}
                          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                          style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: '#f1f5f9' }}
                        />
                        {newProfileKey && (
                          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                            Clave interna: <span style={{ color: '#f59e0b' }}>{newProfileKey}</span>
                          </p>
                        )}
                      </div>
                      {newProfileError && (
                        <p className="text-xs" style={{ color: '#f87171' }}>⚠️ {newProfileError}</p>
                      )}
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        Se creará con todos los accesos desactivados. Actívalos manualmente después de crear el perfil.
                      </p>
                      <div className="flex gap-3 pt-1">
                        <button onClick={() => setNewProfileOpen(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}>
                          Cancelar
                        </button>
                        <button onClick={handleCreateProfile} disabled={!newProfileName.trim()} className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40" style={{ backgroundColor: '#f59e0b', color: '#1B3A6B' }}>
                          Crear Perfil
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Create User Modal ─────────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ backgroundColor: '#1a2535', border: '1px solid #2a3f5f' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold" style={{ color: '#f1f5f9' }}>Nuevo Usuario</h2>
              <button onClick={() => setModalOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4">
              {/* Employee selector */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Empleado (Personal) *</label>
                <select
                  value={form.employeeId}
                  onChange={(e) => handleEmployeeSelect(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg text-sm outline-none"
                  style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: form.employeeId ? '#f1f5f9' : 'rgba(255,255,255,0.35)' }}
                >
                  <option value="" style={{ backgroundColor: '#1a2535', color: 'rgba(255,255,255,0.4)' }}>
                    {empLoading ? 'Cargando empleados…' : '— Selecciona un empleado —'}
                  </option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id} style={{ backgroundColor: '#1a2535', color: 'white' }}>
                      {emp.name} ({emp.role})
                    </option>
                  ))}
                </select>
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>El nombre y perfil se toman automáticamente del empleado seleccionado.</p>
              </div>

              {/* Auto-filled info */}
              {form.employeeId && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg" style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: `${ROLE_COLORS[form.appRole]}25`, color: ROLE_COLORS[form.appRole] }}>
                    {form.fullName.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{form.fullName}</p>
                    <p className="text-xs" style={{ color: ROLE_COLORS[form.appRole] }}>{ROLE_LABELS[form.appRole]}</p>
                  </div>
                </div>
              )}

              {/* Username */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Usuario (login) *</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-lg text-sm outline-none"
                  style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: '#f1f5f9' }}
                  placeholder="usuario123"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Contraseña *</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-lg text-sm outline-none pr-10"
                    style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: '#f1f5f9' }}
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowPw((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {formError && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: '#f87171' }}>
                  <AlertCircle size={13} /> {formError}
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModalOpen(false)} className="flex-1 py-2.5 rounded-lg text-sm font-medium" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>Cancelar</button>
              <button onClick={handleCreateUser} disabled={saving} className="flex-1 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2" style={{ backgroundColor: '#f59e0b', color: '#1B3A6B' }}>
                {saving ? <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#1B3A6B', borderTopColor: 'transparent' }} /> : null}
                Crear Usuario
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Change Password Modal ─────────────────────────────────────────────── */}
      {pwModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ backgroundColor: '#1a2535', border: '1px solid #2a3f5f' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold" style={{ color: '#f1f5f9' }}>Cambiar Contraseña</h2>
              <button onClick={() => setPwModalOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>
                <X size={16} />
              </button>
            </div>
            <div className="flex items-center gap-3 mb-4 px-3 py-2.5 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: `${ROLE_COLORS[selectedUser.appRole]}25`, color: ROLE_COLORS[selectedUser.appRole] }}>
                {selectedUser.fullName ? selectedUser.fullName.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase() : '?'}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{selectedUser.fullName || selectedUser.username}</p>
                <p className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.45)' }}>@{selectedUser.username}</p>
              </div>
            </div>
            <div className="relative mb-4">
              <input
                type={showPw ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg text-sm outline-none pr-10"
                style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: '#f1f5f9' }}
                placeholder="Nueva contraseña"
              />
              <button type="button" onClick={() => setShowPw((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {formError && <p className="text-xs mb-3" style={{ color: '#f87171' }}>{formError}</p>}
            <div className="flex gap-3">
              <button onClick={() => setPwModalOpen(false)} className="flex-1 py-2.5 rounded-lg text-sm font-medium" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>Cancelar</button>
              <button
                onClick={handleChangePin}
                disabled={saving || newPassword.length < 4}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold"
                style={{ backgroundColor: '#f59e0b', color: '#1B3A6B', opacity: newPassword.length < 4 ? 0.5 : 1 }}
              >
                Actualizar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}