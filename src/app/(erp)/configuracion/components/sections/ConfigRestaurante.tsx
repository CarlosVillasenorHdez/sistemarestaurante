'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { Store, Upload, Save, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { invalidateSysConfigCache } from '@/hooks/useSysConfig';
import { COUNTRY_CURRENCY } from './types';
import Icon from '@/components/ui/AppIcon';


function SectionTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      <Icon size={18} style={{ color: '#f59e0b' }} />
      <h2 className="text-base font-bold" style={{ color: '#f1f5f9' }}>{title}</h2>
    </div>
  );
}

function SaveButton({ saved, onClick }: { saved: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
      style={{ backgroundColor: saved ? 'rgba(34,197,94,0.15)' : '#f59e0b', color: saved ? '#22c55e' : '#1B3A6B', border: saved ? '1px solid rgba(34,197,94,0.4)' : 'none' }}>
      {saved ? <CheckCircle size={15} /> : <Save size={15} />}
      {saved ? 'Guardado' : 'Guardar cambios'}
    </button>
  );
}

export default function ConfigRestaurante({ activeSection }: { activeSection: string }) {
  const supabase = createClient();
  const { brandConfig } = useAuth();

  // Restaurant settings
  const [restaurantName, setRestaurantName] = useState(brandConfig?.restaurantName || 'Mi Restaurante');
  const [restaurantNameDraft, setRestaurantNameDraft] = useState(brandConfig?.restaurantName || 'Mi Restaurante');
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [settingsSaved, setSettingsSaved] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [primaryColor, setPrimaryColor] = useState(brandConfig?.primaryColor || '#1B3A6B');
  const [appTheme, setAppTheme] = useState<'dark'|'light'>(brandConfig?.theme || 'dark');

  // Operation settings
  const [ivaPercent, setIvaPercent] = useState(16);
  const [ivaPercentDraft, setIvaPercentDraft] = useState(16);
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [currencyCode, setCurrencyCode] = useState('MXN');
  const [currencyLocale, setCurrencyLocale] = useState('es-MX');
  const [operacionSaved, setOperacionSaved] = useState(false);

  // Load system config on mount
  useEffect(() => {
    supabase.from('system_config').select('config_key, config_value').then(({ data }) => {
      if (!data) return;
      const map: Record<string,string> = {};
      data.forEach((r: any) => { map[r.config_key] = r.config_value; });
      if (map.restaurant_name) { setRestaurantName(map.restaurant_name); setRestaurantNameDraft(map.restaurant_name); }
      if (map.brand_primary_color) setPrimaryColor(map.brand_primary_color);
      if (map.brand_logo_url) setLogoPreview(map.brand_logo_url);
      if (map.brand_theme) setAppTheme(map.brand_theme as 'dark'|'light');
      if (map.iva_percent) { const v = parseFloat(map.iva_percent); setIvaPercent(v); setIvaPercentDraft(v); }
      if (map.currency_symbol) setCurrencySymbol(map.currency_symbol);
      if (map.currency_code) setCurrencyCode(map.currency_code);
      if (map.currency_locale) setCurrencyLocale(map.currency_locale);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSaveSettings() {
    const upsertRows = [
      { config_key: 'restaurant_name', config_value: restaurantNameDraft },
      { config_key: 'brand_primary_color', config_value: primaryColor },
      { config_key: 'brand_theme', config_value: appTheme },
    ];
    await supabase.from('system_config').upsert(upsertRows, { onConflict: 'config_key' });
    setRestaurantName(restaurantNameDraft);
    invalidateSysConfigCache();
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2500);
    toast.success('Configuración del restaurante guardada');
  }

  async function handleSaveOperacion() {
    const rows = [
      { config_key: 'iva_percent', config_value: String(ivaPercentDraft) },
      { config_key: 'currency_symbol', config_value: currencySymbol },
      { config_key: 'currency_code', config_value: currencyCode },
      { config_key: 'currency_locale', config_value: currencyLocale },
    ];
    await supabase.from('system_config').upsert(rows, { onConflict: 'config_key' });
    setIvaPercent(ivaPercentDraft);
    invalidateSysConfigCache();
    setOperacionSaved(true);
    setTimeout(() => setOperacionSaved(false), 2500);
    toast.success('Parámetros de operación guardados');
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div className="max-w-2xl">
      {/* Restaurante */}
      {activeSection === 'restaurante' && <div>
        <SectionTitle icon={Store} title="Información del Restaurante" />
        <div className="rounded-xl p-5 mb-5" style={{ backgroundColor: '#1a2535', border: '1px solid #1e2d3d' }}>
          <label className="block text-sm font-semibold mb-3" style={{ color: 'rgba(255,255,255,0.7)' }}>Logo del Restaurante</label>
          <div className="flex items-center gap-5">
            <div className="w-24 h-24 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0" style={{ backgroundColor: '#0f1923', border: '2px dashed #2a3f5f' }}>
              {logoPreview ? <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" /> : <Store size={32} style={{ color: 'rgba(255,255,255,0.2)' }} />}
            </div>
            <div>
              <button onClick={() => logoInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium" style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
                <Upload size={15} /> Subir Logo
              </button>
              <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.35)' }}>PNG, JPG o SVG. Máx 2 MB.</p>
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
            </div>
          </div>
        </div>
        <div className="rounded-xl p-5 mb-5" style={{ backgroundColor: '#1a2535', border: '1px solid #1e2d3d' }}>
          <label className="block text-sm font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>Nombre del restaurante</label>
          <input type="text" value={restaurantNameDraft} onChange={(e) => setRestaurantNameDraft(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg text-sm outline-none" maxLength={80}
            style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: '#f1f5f9' }} />
        </div>
        <SaveButton saved={settingsSaved} onClick={handleSaveSettings} />
      </div>}

      {/* Operación */}
      {activeSection === 'operacion' && <div>
        <SectionTitle icon={Store} title="Parámetros de Operación" />
        <div className="rounded-xl p-5 mb-5" style={{ backgroundColor: '#1a2535', border: '1px solid #1e2d3d' }}>
          <label className="block text-sm font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>Porcentaje de IVA</label>
          <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>Impuesto al Valor Agregado aplicado a las ventas</p>
          <div className="flex items-center gap-3">
            <input type="number" min={0} max={100} step={0.5} value={ivaPercentDraft}
              onChange={(e) => setIvaPercentDraft(parseFloat(e.target.value) || 0)}
              className="w-28 px-4 py-2.5 rounded-lg text-sm outline-none"
              style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: '#f1f5f9' }} />
            <div className="px-3 py-1.5 rounded-lg text-sm" style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
              IVA: {ivaPercentDraft}%
            </div>
          </div>
        </div>
        <div className="rounded-xl p-5 mb-5" style={{ backgroundColor: '#1a2535', border: '1px solid #1e2d3d' }}>
          <label className="block text-sm font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>Moneda</label>
          <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>Símbolo y código monetario para tickets, reportes y pantallas</p>
          <div className="mb-3">
            <label className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>País / Región</label>
            <select onChange={(e) => {
              const entry = COUNTRY_CURRENCY.find(cc => cc.code + '|' + cc.locale === e.target.value);
              if (entry) { setCurrencySymbol(entry.symbol); setCurrencyCode(entry.code); setCurrencyLocale(entry.locale); }
            }} defaultValue=""
              className="w-full px-3 py-2 rounded-lg text-sm outline-none appearance-none"
              style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: '#f1f5f9' }}>
              <option value="" disabled>Selecciona un país para autocompletar...</option>
              {COUNTRY_CURRENCY.map(cc => (
                <option key={cc.code + cc.locale} value={cc.code + '|' + cc.locale}>
                  {cc.flag} {cc.name} — {cc.symbol} ({cc.code})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>Símbolo</label>
              <input type="text" maxLength={3} value={currencySymbol} onChange={(e) => setCurrencySymbol(e.target.value)}
                placeholder="$" className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: '#f1f5f9' }} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>Código</label>
              <input type="text" maxLength={3} value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())}
                placeholder="MXN" className="w-full px-3 py-2 rounded-lg text-sm outline-none font-mono"
                style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: '#f1f5f9' }} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>Preview</label>
              <div className="px-3 py-2 rounded-lg text-sm font-mono" style={{ backgroundColor: '#0f1923', border: '1px solid #1e2d3d', color: '#f59e0b' }}>
                {currencySymbol}{(1234.5).toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>
        <SaveButton saved={operacionSaved} onClick={handleSaveOperacion} />
      </div>}
    </div>
  );
}