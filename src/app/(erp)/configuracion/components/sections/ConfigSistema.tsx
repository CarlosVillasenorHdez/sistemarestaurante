'use client';

import React, { useState, useEffect } from 'react';

import { Zap, Star, Settings2, CheckCircle, Save, AlertTriangle, RotateCcw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

import { DEFAULT_FEATURES, FEATURE_KEYS, Features, invalidateFeaturesCache } from '@/hooks/useFeatures';
import UsuariosManagement from '../UsuariosManagement';
import Icon from '@/components/ui/AppIcon';


function SectionTitle({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      <Icon size={18} style={{ color: '#f59e0b' }} />
      <div>
        <h2 className="text-base font-bold" style={{ color: '#f1f5f9' }}>{title}</h2>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{subtitle}</p>}
      </div>
    </div>
  );
}

function SaveButton({ saved, onClick, label }: { saved: boolean; onClick: () => void; label?: string }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
      style={{ backgroundColor: saved ? 'rgba(34,197,94,0.15)' : '#f59e0b', color: saved ? '#22c55e' : '#1B3A6B', border: saved ? '1px solid rgba(34,197,94,0.4)' : 'none' }}>
      {saved ? <CheckCircle size={15} /> : <Save size={15} />}
      {saved ? 'Guardado' : (label ?? 'Guardar cambios')}
    </button>
  );
}

export default function ConfigSistema({ activeSection }: { activeSection: string }) {
  const supabase = createClient();
  const { appUser } = useAuth();

  const [features, setFeatures] = useState<Features>({ ...DEFAULT_FEATURES });
  const [featuresSaving, setFeaturesSaving] = useState(false);
  const [featuresSaved, setFeaturesSaved] = useState(false);

  const [loyaltyName, setLoyaltyName] = useState('');
  const [loyaltyPesosPerPoint, setLoyaltyPesosPerPoint] = useState(100);
  const [loyaltyPointValue, setLoyaltyPointValue] = useState(1);
  const [loyaltyExpiryDays, setLoyaltyExpiryDays] = useState(0);
  const [loyaltyMinRedeem, setLoyaltyMinRedeem] = useState(0);
  const [loyaltyMaxRedeemPct, setLoyaltyMaxRedeemPct] = useState(100);
  const [loyaltyLevels, setLoyaltyLevels] = useState<{ name: string; min: number; color: string; benefit: string }[]>([
    { name: 'Bronce', min: 0,    color: '#cd7f32', benefit: '' },
    { name: 'Plata',  min: 500,  color: '#9ca3af', benefit: '' },
    { name: 'Oro',    min: 1500, color: '#f59e0b', benefit: '' },
  ]);
  const [loyaltySaving, setLoyaltySaving] = useState(false);
  const [loyaltySaved, setLoyaltySaved] = useState(false);

  const [resetModal, setResetModal] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [showResetPw, setShowResetPw] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    supabase.from('system_config').select('config_key, config_value').then(({ data }) => {
      if (!data) return;
      const map: Record<string, string> = {};
      data.forEach((r: any) => { map[r.config_key] = r.config_value; });
      const loaded = { ...DEFAULT_FEATURES };
      Object.entries(FEATURE_KEYS).forEach(([feat, key]) => {
        if (key in map) loaded[feat as keyof Features] = map[key] === 'true';
      });
      setFeatures(loaded);
      if (map['loyalty_name']) setLoyaltyName(map['loyalty_name']);
      if (map['loyalty_pesos_per_point']) setLoyaltyPesosPerPoint(Number(map['loyalty_pesos_per_point']));
      if (map['loyalty_point_value']) setLoyaltyPointValue(Number(map['loyalty_point_value']));
      if (map['loyalty_expiry_days']) setLoyaltyExpiryDays(Number(map['loyalty_expiry_days']));
      if (map['loyalty_min_redeem']) setLoyaltyMinRedeem(Number(map['loyalty_min_redeem']));
      if (map['loyalty_max_redeem_pct']) setLoyaltyMaxRedeemPct(Number(map['loyalty_max_redeem_pct']));
      if (map['loyalty_levels']) { try { setLoyaltyLevels(JSON.parse(map['loyalty_levels'])); } catch { /* ignore */ } }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const handleSaveFeatures = async () => {
    setFeaturesSaving(true);
    const rows = Object.entries(FEATURE_KEYS).map(([feat, key]) => ({
      config_key: key,
      config_value: features[feat as keyof Features] ? 'true' : 'false',
      description: `Feature: ${feat}`,
    }));
    await supabase.from('system_config').upsert(rows, { onConflict: 'config_key' });
    invalidateFeaturesCache();
    setFeaturesSaving(false);
    setFeaturesSaved(true);
    setTimeout(() => setFeaturesSaved(false), 3000);
  };

  // ── Save loyalty config ───────────────────────────────────────────────────


  const handleSaveLoyalty = async () => {
    setLoyaltySaving(true);
    await supabase.from('system_config').upsert([
      { config_key: 'loyalty_program_name',    config_value: loyaltyName },
      { config_key: 'loyalty_pesos_per_point', config_value: String(loyaltyPesosPerPoint) },
      { config_key: 'loyalty_point_value',     config_value: String(loyaltyPointValue) },
      { config_key: 'loyalty_expiry_days',     config_value: String(loyaltyExpiryDays) },
      { config_key: 'loyalty_min_redeem',      config_value: String(loyaltyMinRedeem) },
      { config_key: 'loyalty_max_redeem_pct',  config_value: String(loyaltyMaxRedeemPct) },
      { config_key: 'loyalty_levels',          config_value: JSON.stringify(loyaltyLevels) },
    ], { onConflict: 'config_key' });
    setLoyaltySaving(false);
    setLoyaltySaved(true);
    setTimeout(() => setLoyaltySaved(false), 3000);
  };


  async function handleSystemReset() {
    setResetLoading(true);
    setResetError('');
    try {
      // ── Delete ALL operational/demo data ──────────────────────────────────
      // Orders and items
      await supabase.from('order_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      // Tables and layout
      await supabase.from('restaurant_tables').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('restaurant_layout').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      // Stock movements (generated by sales)
      await supabase.from('stock_movements').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      // Gastos (expense payments)
      try {
        await supabase.from('expense_payments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      } catch { /* table may not exist */ }
      // Reset system_config table_count
      await supabase.from('system_config').upsert(
        { config_key: 'table_count', config_value: '0' },
        { onConflict: 'config_key' }
      );

      // Layout reset in DB — ConfigLayout reloads on next mount
      setResetModal(false);
      setResetPassword('');
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 3000);
    } catch {
      setResetError('Ocurrió un error. Intenta de nuevo.');
    } finally {
      setResetLoading(false);
    }
  }

  // ── Save layout ──────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl">
      {activeSection === 'funcionalidades' && (
        <div className="max-w-2xl space-y-4">
              <SectionTitle
                icon={Zap}
                title="Funcionalidades del Sistema"
                subtitle="Activa o desactiva módulos. Los módulos desactivados desaparecen del menú lateral inmediatamente al guardar."
              />
              {([
                { key: 'meseroMovil',     label: 'Mesero Móvil',          desc: 'App para tomar pedidos desde el teléfono del mesero',    icon: '📱' },
                { key: 'lealtad',         label: 'Programa de Lealtad',    desc: 'Puntos, niveles y canjes para clientes frecuentes',      icon: '⭐' },
                { key: 'reservaciones',   label: 'Reservaciones',          desc: 'Calendario de reservas y gestión de mesas futuras',      icon: '📅' },
                { key: 'delivery',        label: 'Delivery',               desc: 'Pedidos Uber Eats, Rappi, DiDi Food y captura manual',   icon: '🛵' },
                { key: 'inventario',      label: 'Inventario',             desc: 'Stock, alertas de mínimos y movimientos de ingredientes', icon: '📦' },
                { key: 'gastos',          label: 'Gastos',                 desc: 'Gastos recurrentes, depreciaciones y flujo de caja',     icon: '💸' },
                { key: 'recursosHumanos', label: 'Recursos Humanos',       desc: 'Vacaciones, permisos, incapacidades y tiempos extra',    icon: '👥' },
                { key: 'reportes',        label: 'Reportes y Análisis',    desc: 'P&L, COGS, canasta de mercado y consolidado sucursales', icon: '📊' },
                { key: 'alarmas',         label: 'Alarmas',                desc: 'Panel de alertas de inventario, órdenes y sistema',      icon: '🔔' },
                { key: 'multiSucursal',   label: 'Multi-Sucursal',         desc: 'Gestión centralizada de varias sucursales',              icon: '🏢' },
              ] as { key: keyof Features; label: string; desc: string; icon: string }[]).map(({ key, label, desc, icon }) => (
                <div key={key} className="flex items-center justify-between p-4 rounded-xl border transition-colors"
                  style={{ borderColor: features[key] ? '#fde68a' : '#e5e7eb', backgroundColor: features[key] ? '#fffdf5' : 'white' }}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl w-8 text-center">{icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setFeatures(prev => ({ ...prev, [key]: !prev[key] }))}
                    className="flex-shrink-0 w-12 h-6 rounded-full flex items-center px-1 transition-all duration-200"
                    style={{ backgroundColor: features[key] ? '#f59e0b' : '#d1d5db' }}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200"
                      style={{ transform: features[key] ? 'translateX(24px)' : 'translateX(0)' }} />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-3 pt-2">
                <button onClick={handleSaveFeatures} disabled={featuresSaving}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
                  style={{ backgroundColor: '#1B3A6B' }}>
                  {featuresSaving ? 'Guardando...' : 'Guardar cambios'}
                </button>
                {featuresSaved && (
                  <span className="text-sm font-semibold text-green-600 flex items-center gap-1">
                    ✓ Guardado — recarga la página para ver el menú actualizado
                  </span>
                )}
              </div>
            </div>
      )}
      {activeSection === 'lealtad_config' && (
        <div className="max-w-2xl space-y-5">
              <SectionTitle
                icon={Star}
                title="Configuración del Programa de Lealtad"
                subtitle="Define cómo se acumulan y canjean los puntos, y los niveles de tus clientes."
              />

              {/* Program name */}
              <div className="bg-white rounded-xl border p-5" style={{ borderColor: '#e5e7eb' }}>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre del programa</label>
                <input type="text" value={loyaltyName} onChange={e => setLoyaltyName(e.target.value)}
                  className="w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                  style={{ borderColor: '#e5e7eb' }} placeholder="Ej: Club VIP, Programa de Puntos..." />
                <p className="text-xs text-gray-400 mt-1.5">Aparece en el módulo de Lealtad y al cobrar.</p>
              </div>

              {/* Points economy */}
              <div className="bg-white rounded-xl border p-5 space-y-4" style={{ borderColor: '#e5e7eb' }}>
                <h3 className="text-sm font-semibold text-gray-700">Economía de puntos</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Pesos gastados para ganar 1 punto</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                      <input type="number" min={1} value={loyaltyPesosPerPoint}
                        onChange={e => setLoyaltyPesosPerPoint(Number(e.target.value))}
                        className="w-full pl-7 pr-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                        style={{ borderColor: '#e5e7eb' }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Ej: $10 → por cada $10 gastados, el cliente gana 1 punto.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Valor de 1 punto al canjear</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                      <input type="number" min={0.01} step={0.01} value={loyaltyPointValue}
                        onChange={e => setLoyaltyPointValue(Number(e.target.value))}
                        className="w-full pl-7 pr-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                        style={{ borderColor: '#e5e7eb' }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Ej: $0.50 → 100 puntos = $50 de descuento.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Mínimo de puntos para canjear</label>
                    <input type="number" min={0} value={loyaltyMinRedeem}
                      onChange={e => setLoyaltyMinRedeem(Number(e.target.value))}
                      className="w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                      style={{ borderColor: '#e5e7eb' }} />
                    <p className="text-xs text-gray-400 mt-1">0 = sin mínimo requerido.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Máx. del total pagable con puntos (%)</label>
                    <div className="relative">
                      <input type="number" min={1} max={100} value={loyaltyMaxRedeemPct}
                        onChange={e => setLoyaltyMaxRedeemPct(Number(e.target.value))}
                        className="w-full pr-8 px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                        style={{ borderColor: '#e5e7eb' }} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">%</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Ej: 30% → no puede cubrir más del 30% de la cuenta.</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Expiración de puntos (días · 0 = nunca expiran)</label>
                    <input type="number" min={0} value={loyaltyExpiryDays}
                      onChange={e => setLoyaltyExpiryDays(Number(e.target.value))}
                      className="w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                      style={{ borderColor: '#e5e7eb' }} />
                  </div>
                </div>
                {/* Live preview */}
                <div className="rounded-xl p-4" style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}>
                  <p className="text-xs font-semibold text-amber-800 mb-1.5">Vista previa</p>
                  <p className="text-xs text-amber-700">
                    Un cliente que gasta <strong>$500</strong> acumula{' '}
                    <strong>{Math.floor(500 / loyaltyPesosPerPoint)} puntos</strong>.
                    Si los canjea, obtiene{' '}
                    <strong>${(Math.floor(500 / loyaltyPesosPerPoint) * loyaltyPointValue).toFixed(2)}</strong> de descuento.
                  </p>
                </div>
              </div>

              {/* Levels */}
              <div className="bg-white rounded-xl border p-5" style={{ borderColor: '#e5e7eb' }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-700">Niveles de cliente</h3>
                  <button
                    onClick={() => setLoyaltyLevels(prev => [...prev, { name: 'Nuevo nivel', min: 0, color: '#6b7280', benefit: '' }])}
                    className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                    style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
                    + Agregar nivel
                  </button>
                </div>
                <div className="space-y-2 mb-4">
                  {loyaltyLevels.map((level, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-3 rounded-xl border" style={{ borderColor: '#f3f4f6' }}>
                      <input type="color" value={level.color}
                        onChange={e => setLoyaltyLevels(prev => prev.map((l, i) => i === idx ? { ...l, color: e.target.value } : l))}
                        className="w-8 h-8 rounded-lg border-0 cursor-pointer" title="Color del nivel" />
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <input type="text" value={level.name} placeholder="Nombre"
                          onChange={e => setLoyaltyLevels(prev => prev.map((l, i) => i === idx ? { ...l, name: e.target.value } : l))}
                          className="px-2 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-300"
                          style={{ borderColor: '#e5e7eb' }} />
                        <input type="number" min={0} value={level.min} placeholder="Pts mínimos"
                          onChange={e => setLoyaltyLevels(prev => prev.map((l, i) => i === idx ? { ...l, min: Number(e.target.value) } : l))}
                          className="px-2 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-300"
                          style={{ borderColor: '#e5e7eb' }} />
                        <input type="text" value={level.benefit} placeholder="Beneficio"
                          onChange={e => setLoyaltyLevels(prev => prev.map((l, i) => i === idx ? { ...l, benefit: e.target.value } : l))}
                          className="px-2 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-300"
                          style={{ borderColor: '#e5e7eb' }} />
                      </div>
                      {loyaltyLevels.length > 1 && (
                        <button onClick={() => setLoyaltyLevels(prev => prev.filter((_, i) => i !== idx))}
                          className="text-red-400 hover:text-red-600 font-bold w-5 text-sm flex-shrink-0">✕</button>
                      )}
                    </div>
                  ))}
                </div>
                {/* Level preview badges */}
                <div className="flex gap-2 flex-wrap pt-3 border-t" style={{ borderColor: '#f3f4f6' }}>
                  {[...loyaltyLevels].sort((a, b) => a.min - b.min).map((l, i) => (
                    <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white"
                      style={{ backgroundColor: l.color }}>
                      {l.name} · {l.min}+ pts
                      {l.benefit ? ` · ${l.benefit}` : ''}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button onClick={handleSaveLoyalty} disabled={loyaltySaving}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                  style={{ backgroundColor: '#1B3A6B' }}>
                  {loyaltySaving ? 'Guardando...' : 'Guardar configuración'}
                </button>
                {loyaltySaved && <span className="text-sm font-semibold text-green-600">✓ Configuración guardada</span>}
              </div>
            </div>
      )}
      {activeSection === 'sistema' && (
        <div className="max-w-2xl">
              <SectionTitle icon={Settings2} title="Configuración del Sistema" />

              {/* Reset system */}
              {resetSuccess && (
                <div className="mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2" style={{ backgroundColor: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80' }}>
                  <CheckCircle size={15} /> Sistema reseteado exitosamente
                </div>
              )}

              <div className="rounded-xl p-5" style={{ backgroundColor: '#1a2535', border: '1px solid rgba(239,68,68,0.25)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <RotateCcw size={16} style={{ color: '#ef4444' }} />
                  <h3 className="text-sm font-bold" style={{ color: '#f1f5f9' }}>Resetear Sistema</h3>
                </div>
                <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Elimina <strong style={{ color: 'rgba(255,255,255,0.6)' }}>todos los datos operativos</strong>: órdenes, mesas, layout, movimientos de inventario y pagos de gastos. El sistema queda completamente vacío listo para un nuevo cliente. Los usuarios, menú e ingredientes se conservan.
                </p>
                <div className="flex items-start gap-3 p-3 rounded-lg mb-4" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" style={{ color: '#f87171' }} />
                  <p className="text-xs" style={{ color: '#f87171' }}>
                    Esta acción no se puede deshacer. Se eliminarán órdenes, mesas, layout del restaurante, movimientos de stock y pagos de gastos. Requiere contraseña de administrador.
                  </p>
                </div>
                <button
                  onClick={() => { setResetModal(true); setResetPassword(''); setResetError(''); }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
                  style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}
                >
                  <RotateCcw size={15} /> Resetear Sistema
                </button>
              </div>
            </div>
      )}
      {activeSection === 'usuarios' && <UsuariosManagement />}
    </div>
  );
}