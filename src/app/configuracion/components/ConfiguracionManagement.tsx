'use client';

import { toast } from 'sonner';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Store, Hash, Percent, Clock, Users, Save, Upload, CheckCircle, Shield, Printer, Settings2, RotateCcw, AlertTriangle, Eye, EyeOff, Wifi, Usb, Bluetooth, LayoutGrid, Move, Trash2, Plus, XCircle, Zap, Star } from 'lucide-react';
import UsuariosManagement from './UsuariosManagement';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePrinter } from '@/hooks/usePrinter';
import { DEFAULT_FEATURES, FEATURE_KEYS, Features, invalidateFeaturesCache } from '@/hooks/useFeatures';
import Icon from '@/components/ui/AppIcon';


// ─── Types ────────────────────────────────────────────────────────────────────

interface BusinessHours {
  day: string;
  dayLabel: string;
  open: boolean;
  from: string;
  to: string;
}

interface PrinterConfig {
  id?: string;
  name: string;
  connectionType: 'network' | 'usb' | 'bluetooth';
  ipAddress: string;
  port: number;
  usbPath: string;
  usbVendorId?: number;
  usbProductId?: number;
  usbDeviceName?: string;
  bluetoothAddress: string;
  // Ticket layout
  paperWidth: 58 | 80;
  printCopies: number;
  autoCut: boolean;
  printLogo: boolean;
  printFooter: boolean;
  footerText: string;
  // Ticket content toggles
  showOrderNumber: boolean;
  showMesa: boolean;
  showMesero: boolean;
  showDate: boolean;
  showSubtotal: boolean;
  showIva: boolean;
  showDiscount: boolean;
  showUnitPrice: boolean;
  headerLine1: string;   // Línea extra bajo el nombre del restaurante
  headerLine2: string;   // Ej: dirección, teléfono, RFC
  separatorChar: string; // '-' | '=' | '*' | '.'
  isActive: boolean;
}

const defaultPrinter: PrinterConfig = {
  name: 'Impresora Principal',
  connectionType: 'network',
  ipAddress: '192.168.1.100',
  port: 9100,
  usbPath: '',
  bluetoothAddress: '',
  paperWidth: 58,
  printCopies: 1,
  autoCut: true,
  printLogo: true,
  printFooter: true,
  footerText: 'Gracias por su visita',
  showOrderNumber: true,
  showMesa: true,
  showMesero: true,
  showDate: true,
  showSubtotal: true,
  showIva: true,
  showDiscount: true,
  showUnitPrice: true,
  headerLine1: '',
  headerLine2: '',
  separatorChar: '-',
  isActive: true,
};

const initialHours: BusinessHours[] = [
  { day: 'lun', dayLabel: 'Lunes', open: true, from: '08:00', to: '22:00' },
  { day: 'mar', dayLabel: 'Martes', open: true, from: '08:00', to: '22:00' },
  { day: 'mie', dayLabel: 'Miércoles', open: true, from: '08:00', to: '22:00' },
  { day: 'jue', dayLabel: 'Jueves', open: true, from: '08:00', to: '22:00' },
  { day: 'vie', dayLabel: 'Viernes', open: true, from: '08:00', to: '23:00' },
  { day: 'sab', dayLabel: 'Sábado', open: true, from: '09:00', to: '23:00' },
  { day: 'dom', dayLabel: 'Domingo', open: false, from: '10:00', to: '20:00' },
];

const SECTIONS = [
  { id: 'restaurante', label: 'Restaurante', icon: Store },
  { id: 'operacion', label: 'Operación', icon: Hash },
  { id: 'layout', label: 'Layout Mesas', icon: LayoutGrid },
  { id: 'horarios', label: 'Horarios', icon: Clock },
  { id: 'impresora', label: 'Impresora', icon: Printer },
  { id: 'funcionalidades', label: 'Funcionalidades', icon: Zap },
  { id: 'lealtad_config', label: 'Programa de Lealtad', icon: Star },
  { id: 'sistema', label: 'Sistema', icon: Settings2 },
  { id: 'usuarios', label: 'Usuarios', icon: Users },
];

// ─── Layout Types ─────────────────────────────────────────────────────────────

interface LayoutTable {
  id: string;
  number: number;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  shape: 'rect' | 'round';
  capacity: number;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ConfiguracionManagement() {
  const supabase = createClient();
  const { brandConfig } = useAuth();
  const [activeSection, setActiveSection] = useState<string>('restaurante');

  // Restaurant settings
  const [restaurantName, setRestaurantName] = useState('Restaurante El Sabor Mexicano');
  const [restaurantNameDraft, setRestaurantNameDraft] = useState('Restaurante El Sabor Mexicano');
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [settingsSaved, setSettingsSaved] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Branding / personalization
  const [primaryColor, setPrimaryColor] = useState('#1B3A6B');
  const [appTheme, setAppTheme] = useState<'dark' | 'light'>('dark');

  // Operation settings
  const [ivaPercent, setIvaPercent] = useState(16);
  const [ivaPercentDraft, setIvaPercentDraft] = useState(16);
  const [operacionSaved, setOperacionSaved] = useState(false);

  // Business hours
  const [hours, setHours] = useState<BusinessHours[]>(initialHours);
  const [hoursSaved, setHoursSaved] = useState(false);

  // Printer config
  const [printerConfig, setPrinterConfig] = useState<PrinterConfig>(defaultPrinter);
  const [printerDraft, setPrinterDraft] = useState<PrinterConfig>(defaultPrinter);
  const [printerSaved, setPrinterSaved] = useState(false);
  const [printerLoading, setPrinterLoading] = useState(true);
  const [testingPrinter, setTestingPrinter] = useState(false);
  const printer = usePrinter();
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  // System reset
  const [resetModal, setResetModal] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [showResetPw, setShowResetPw] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Layout state
  const [layoutTables, setLayoutTables] = useState<LayoutTable[]>([]);
  const [layoutLoading, setLayoutLoading] = useState(true);
  const [layoutSaved, setLayoutSaved] = useState(false);
  const [layoutId, setLayoutId] = useState<string | null>(null);
  const [selectedLayoutTable, setSelectedLayoutTable] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const CELL = 56; // px per grid cell

  // System config loading
  const [sysConfigLoading, setSysConfigLoading] = useState(true);

  // Add table form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState(4);
  const [newTableShape, setNewTableShape] = useState<'rect' | 'round'>('rect');

  // Clear tables confirmation
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Feature flags
  const [features, setFeatures] = useState<Features>({ ...DEFAULT_FEATURES });
  const [featuresSaving, setFeaturesSaving] = useState(false);
  const [featuresSaved, setFeaturesSaved] = useState(false);

  // Loyalty config
  const [loyaltyName, setLoyaltyName] = useState('');
  const [loyaltyPesosPerPoint, setLoyaltyPesosPerPoint] = useState(100);
  const [loyaltyPointValue, setLoyaltyPointValue] = useState(1);
  const [loyaltyExpiryDays, setLoyaltyExpiryDays] = useState(0);
  const [loyaltyMinRedeem, setLoyaltyMinRedeem] = useState(0);
  const [loyaltyMaxRedeemPct, setLoyaltyMaxRedeemPct] = useState(100);
  const [loyaltyLevels, setLoyaltyLevels] = useState<{ name: string; min: number; color: string; benefit: string }[]>([
    { name: 'Bronce', min: 0, color: '#cd7f32', benefit: '' },
    { name: 'Plata', min: 500, color: '#9ca3af', benefit: '' },
    { name: 'Oro', min: 1500, color: '#f59e0b', benefit: '' },
  ]);
  const [loyaltySaving, setLoyaltySaving] = useState(false);
  const [loyaltySaved, setLoyaltySaved] = useState(false);

  // ── Load printer config ──────────────────────────────────────────────────────
  const loadPrinterConfig = useCallback(async () => {
    setPrinterLoading(true);
    try {
      const { data } = await supabase.from('printer_config').select('*').limit(1).single();
      if (data) {
        const cfg: PrinterConfig = {
          id: data.id,
          name: data.name,
          connectionType: data.connection_type as PrinterConfig['connectionType'],
          ipAddress: data.ip_address || '',
          port: data.port || 9100,
          usbPath: data.usb_path || '',
          bluetoothAddress: data.bluetooth_address || '',
          paperWidth: (data.paper_width || 80) as 58 | 80,
          printCopies: data.print_copies || 1,
          autoCut: data.auto_cut ?? true,
          printLogo: data.print_logo ?? true,
          printFooter: data.print_footer ?? true,
          footerText: data.footer_text || 'Gracias por su visita',
          showOrderNumber: data.show_order_number ?? true,
          showMesa:        data.show_mesa        ?? true,
          showMesero:      data.show_mesero      ?? true,
          showDate:        data.show_date        ?? true,
          showSubtotal:    data.show_subtotal    ?? true,
          showIva:         data.show_iva         ?? true,
          showDiscount:    data.show_discount    ?? true,
          showUnitPrice:   data.show_unit_price  ?? true,
          headerLine1:     data.header_line1     || '',
          headerLine2:     data.header_line2     || '',
          separatorChar:   data.separator_char   || '-',
          isActive: data.is_active ?? true,
        };
        setPrinterConfig(cfg);
        setPrinterDraft(cfg);
      }
    } catch {
      // use defaults
    } finally {
      setPrinterLoading(false);
    }
  }, [supabase]);

  // ── Load system config ───────────────────────────────────────────────────────
  const loadSysConfig = useCallback(async () => {
    setSysConfigLoading(true);
    try {
      const { data } = await supabase.from('system_config').select('*');
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((r: any) => { map[r.config_key] = r.config_value; });

        // Load feature flags
        const loadedFeatures = { ...DEFAULT_FEATURES };
        Object.entries(FEATURE_KEYS).forEach(([feat, key]) => {
          if (key in map) loadedFeatures[feat as keyof Features] = map[key] === 'true';
        });
        setFeatures(loadedFeatures);

        // Load loyalty config
        if (map['business_hours']) {
          try { setHours(JSON.parse(map['business_hours'])); } catch {}
        }
        if (map['loyalty_program_name'])    setLoyaltyName(map['loyalty_program_name']);
        if (map['loyalty_pesos_per_point']) setLoyaltyPesosPerPoint(Number(map['loyalty_pesos_per_point']));
        if (map['loyalty_point_value'])     setLoyaltyPointValue(Number(map['loyalty_point_value']));
        if (map['loyalty_expiry_days'])     setLoyaltyExpiryDays(Number(map['loyalty_expiry_days']));
        if (map['loyalty_min_redeem'])      setLoyaltyMinRedeem(Number(map['loyalty_min_redeem']));
        if (map['loyalty_max_redeem_pct'])  setLoyaltyMaxRedeemPct(Number(map['loyalty_max_redeem_pct']));
        if (map['loyalty_levels']) {
          try { setLoyaltyLevels(JSON.parse(map['loyalty_levels'])); } catch {}
        }
        if (map.iva_percent) {
          const iva = parseFloat(map.iva_percent);
          setIvaPercent(iva); setIvaPercentDraft(iva);
        }
        if (map.restaurant_name) {
          setRestaurantName(map.restaurant_name);
          setRestaurantNameDraft(map.restaurant_name);
        }
        if (map.brand_primary_color) setPrimaryColor(map.brand_primary_color);
        if (map.brand_theme) setAppTheme(map.brand_theme as 'dark' | 'light');
        if (map.brand_logo_url) setLogoPreview(map.brand_logo_url);
      }
    } catch {
      // use defaults
    } finally {
      setSysConfigLoading(false);
    }
  }, [supabase]);

  // ── Load layout ──────────────────────────────────────────────────────────────
  const loadLayout = useCallback(async () => {
    setLayoutLoading(true);
    try {
      const { data } = await supabase.from('restaurant_layout').select('*').limit(1).single();
      if (data) {
        setLayoutId(data.id);
        setLayoutTables((data.tables_layout as LayoutTable[]) || []);
      }
    } catch {
      // no layout yet
    } finally {
      setLayoutLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadPrinterConfig();
    loadSysConfig();
    loadLayout();
  }, [loadPrinterConfig, loadSysConfig, loadLayout]);

  // ── Logo upload ──────────────────────────────────────────────────────────────
  async function handleLogoUpload(file: File) {
    const ext = file.name.split('.').pop();
    const fileName = `logo-${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage
      .from('restaurant-assets')
      .upload(fileName, file, { upsert: true });
    if (!error && data) {
      const { data: urlData } = supabase.storage
        .from('restaurant-assets')
        .getPublicUrl(data.path);
      await supabase.from('system_config').upsert(
        { config_key: 'brand_logo_url', config_value: urlData.publicUrl },
        { onConflict: 'config_key' }
      );
      setLogoPreview(urlData.publicUrl);
    }
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    handleLogoUpload(file);
  }

  // ── Save restaurant settings ─────────────────────────────────────────────────
  async function handleSaveSettings() {
    try {
      const { error } = await supabase.from('system_config').upsert([
        { config_key: 'restaurant_name', config_value: restaurantNameDraft },
        { config_key: 'brand_primary_color', config_value: primaryColor },
        { config_key: 'brand_theme', config_value: appTheme },
      ], { onConflict: 'config_key' });
      if (error) throw error;

      // Invalidate brandConfig sessionStorage cache so all tabs pick up the change
      sessionStorage.removeItem('sistemarest_brand_config');

      setRestaurantName(restaurantNameDraft);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2500);
    } catch (err: any) {
      toast.error('Error al guardar configuración: ' + (err?.message ?? 'Intenta de nuevo'));
    }
  }

  // ── Save operation settings ──────────────────────────────────────────────────
  async function handleSaveOperacion() {
    await supabase.from('system_config').upsert([
      { config_key: 'iva_percent', config_value: String(ivaPercentDraft) },
    ], { onConflict: 'config_key' });
    setIvaPercent(ivaPercentDraft);
    setOperacionSaved(true);
    setTimeout(() => setOperacionSaved(false), 2500);
  }

  // ── Save hours ───────────────────────────────────────────────────────────────
  async function handleSaveHours() {
    await supabase.from('system_config').upsert(
      { config_key: 'business_hours', config_value: JSON.stringify(hours), description: 'Horarios de apertura del restaurante' },
      { onConflict: 'config_key' }
    );
    setHoursSaved(true);
    setTimeout(() => setHoursSaved(false), 2500);
  }

  function updateHour(day: string, field: keyof BusinessHours, value: string | boolean) {
    setHours((prev) => prev.map((h) => (h.day === day ? { ...h, [field]: value } : h)));
  }

  // ── Save printer config ──────────────────────────────────────────────────────
  async function handleSavePrinter() {
    const payload = {
      name: printerDraft.name,
      connection_type: printerDraft.connectionType,
      ip_address: printerDraft.ipAddress,
      port: printerDraft.port,
      usb_path: printerDraft.usbPath,
      bluetooth_address: printerDraft.bluetoothAddress,
      paper_width: printerDraft.paperWidth,
      print_copies: printerDraft.printCopies,
      auto_cut: printerDraft.autoCut,
      print_logo: printerDraft.printLogo,
      print_footer: printerDraft.printFooter,
      footer_text: printerDraft.footerText,
      show_order_number: printerDraft.showOrderNumber,
      show_mesa:         printerDraft.showMesa,
      show_mesero:       printerDraft.showMesero,
      show_date:         printerDraft.showDate,
      show_subtotal:     printerDraft.showSubtotal,
      show_iva:          printerDraft.showIva,
      show_discount:     printerDraft.showDiscount,
      show_unit_price:   printerDraft.showUnitPrice,
      header_line1:      printerDraft.headerLine1,
      header_line2:      printerDraft.headerLine2,
      separator_char:    printerDraft.separatorChar,
      is_active: printerDraft.isActive,
      updated_at: new Date().toISOString(),
    };
    if (printerDraft.id) {
      await supabase.from('printer_config').update(payload).eq('id', printerDraft.id);
    } else {
      const { data } = await supabase.from('printer_config').insert(payload).select().single();
      if (data) setPrinterDraft((p) => ({ ...p, id: data.id }));
    }
    setPrinterConfig({ ...printerDraft });
    setPrinterSaved(true);
    setTimeout(() => setPrinterSaved(false), 2500);
  }

  async function handleTestPrinter() {
    if (printerDraft.connectionType === 'usb') {
      // WebUSB real test
      if (!printer.supported) {
        setTestResult('error');
        toast.error('WebUSB no disponible. Usa Chrome o Edge para USB.');
        return;
      }
      setTestingPrinter(true);
      setTestResult(null);
      try {
        if (printer.status !== 'connected') {
          const ok = await printer.connect();
          if (!ok) { setTestResult('error'); setTestingPrinter(false); return; }
          // Guardar los ids del dispositivo
          if (printer.device) {
            setPrinterDraft(p => ({
              ...p,
              usbVendorId: printer.device!.vendorId,
              usbProductId: printer.device!.productId,
              usbDeviceName: printer.device!.name,
            }));
          }
        }
        const ok = await printer.printTest(printerDraft.paperWidth, {
          restaurantName: 'PRUEBA DE IMPRESORA',
          headerLine1:    printerDraft.headerLine1  || undefined,
          headerLine2:    printerDraft.headerLine2  || undefined,
          footer:         printerDraft.footerText   || '¡Impresora configurada correctamente!',
          autoCut:        printerDraft.autoCut,
          separatorChar:  printerDraft.separatorChar,
          showOrderNumber: printerDraft.showOrderNumber,
          showDate:        printerDraft.showDate,
          showMesa:        printerDraft.showMesa,
          showMesero:      printerDraft.showMesero,
          showSubtotal:    printerDraft.showSubtotal,
          showIva:         printerDraft.showIva,
          showDiscount:    printerDraft.showDiscount,
          showUnitPrice:   printerDraft.showUnitPrice,
        });
        setTestResult(ok ? 'success' : 'error');
      } catch {
        setTestResult('error');
      }
      setTestingPrinter(false);
      setTimeout(() => setTestResult(null), 5000);
    } else {
      // Simulated test for network/bluetooth
      setTestingPrinter(true);
      setTestResult(null);
      await new Promise((r) => setTimeout(r, 1200));
      setTestResult(printerDraft.connectionType === 'network' && !printerDraft.ipAddress ? 'error' : 'success');
      setTestingPrinter(false);
      setTimeout(() => setTestResult(null), 4000);
    }
  }

  // ── System Reset ─────────────────────────────────────────────────────────────
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

      // Reset local layout state
      setLayoutTables([]);
      setLayoutId(null);

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
  async function handleSaveLayout() {
    const payload = { tables_layout: layoutTables, updated_at: new Date().toISOString() };
    if (layoutId) {
      await supabase.from('restaurant_layout').update(payload).eq('id', layoutId);
    } else {
      const { data } = await supabase.from('restaurant_layout').insert({ ...payload, name: 'Planta Principal', width: 12, height: 8 }).select().single();
      if (data) setLayoutId(data.id);
    }

    // ── Sync restaurant_tables to match the layout ──────────────────────────
    // 1. Fetch existing restaurant_tables
    const { data: existingRows } = await supabase.from('restaurant_tables').select('id, number');
    const existingNums = new Set((existingRows || []).map((r: any) => r.number));
    const layoutNums = new Set(layoutTables.map((t) => t.number));

    // 2. Delete tables that are no longer in the layout
    const toDelete = (existingRows || []).filter((r: any) => !layoutNums.has(r.number));
    if (toDelete.length > 0) {
      await supabase.from('restaurant_tables').delete().in('id', toDelete.map((r: any) => r.id));
    }

    // 3. Upsert tables that are in the layout (insert new, update existing name/capacity)
    for (const lt of layoutTables) {
      if (!existingNums.has(lt.number)) {
        // Insert new
        await supabase.from('restaurant_tables').insert({
          number: lt.number,
          name: lt.name,
          capacity: lt.capacity,
          status: 'libre',
        });
      } else {
        // Update name and capacity for existing
        const existing = (existingRows || []).find((r: any) => r.number === lt.number);
        if (existing) {
          await supabase.from('restaurant_tables').update({
            name: lt.name,
            capacity: lt.capacity,
            updated_at: new Date().toISOString(),
          }).eq('id', existing.id);
        }
      }
    }

    // 4. Sync table count to system_config
    await supabase.from('system_config').upsert(
      { config_key: 'table_count', config_value: String(layoutTables.length) },
      { onConflict: 'config_key' }
    );
    setLayoutSaved(true);
    setTimeout(() => setLayoutSaved(false), 2500);
  }

  function openAddForm() {
    const nextNum = layoutTables.length > 0 ? Math.max(...layoutTables.map((t) => t.number)) + 1 : 1;
    setNewTableName(`Mesa ${nextNum}`);
    setNewTableCapacity(4);
    setNewTableShape('rect');
    setShowAddForm(true);
  }

  function confirmAddTable() {
    const nextNum = layoutTables.length > 0 ? Math.max(...layoutTables.map((t) => t.number)) + 1 : 1;
    const newTable: LayoutTable = {
      id: crypto.randomUUID(),
      number: nextNum,
      name: newTableName.trim() || `Mesa ${nextNum}`,
      x: 0,
      y: 0,
      w: 1,
      h: 1,
      shape: 'rect',
      capacity: 4,
    };
    setLayoutTables((prev) => [...prev, newTable]);
    setShowAddForm(false);
  }

  async function handleClearAllTables() {
    setLayoutTables([]);
    setSelectedLayoutTable(null);
    setShowClearConfirm(false);
    // Save empty layout and reset table_count
    const payload = { tables_layout: [], updated_at: new Date().toISOString() };
    if (layoutId) {
      await supabase.from('restaurant_layout').update(payload).eq('id', layoutId);
    }
    // Delete all restaurant_tables rows
    await supabase.from('restaurant_tables').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('system_config').upsert(
      { config_key: 'table_count', config_value: '0' },
      { onConflict: 'config_key' }
    );
  }

  function addLayoutTable() {
    const nextNum = layoutTables.length > 0 ? Math.max(...layoutTables.map((t) => t.number)) + 1 : 1;
    const newTable: LayoutTable = {
      id: crypto.randomUUID(),
      number: nextNum,
      name: `Mesa ${nextNum}`,
      x: 0,
      y: 0,
      w: 1,
      h: 1,
      shape: 'rect',
      capacity: 4,
    };
    setLayoutTables((prev) => [...prev, newTable]);
  }

  function removeLayoutTable(id: string) {
    setLayoutTables((prev) => prev.filter((t) => t.id !== id));
    if (selectedLayoutTable === id) setSelectedLayoutTable(null);
  }

  function updateLayoutTable(id: string, changes: Partial<LayoutTable>) {
    setLayoutTables((prev) => prev.map((t) => t.id === id ? { ...t, ...changes } : t));
  }

  function handleGridMouseDown(e: React.MouseEvent, tableId: string) {
    e.preventDefault();
    const table = layoutTables.find((t) => t.id === tableId);
    if (!table) return;
    setSelectedLayoutTable(tableId);
    setDragging({ id: tableId, startX: e.clientX, startY: e.clientY, origX: table.x, origY: table.y });
  }

  function handleGridMouseMove(e: React.MouseEvent) {
    if (!dragging) return;
    const dx = Math.round((e.clientX - dragging.startX) / CELL);
    const dy = Math.round((e.clientY - dragging.startY) / CELL);
    const newX = Math.max(0, Math.min(11, dragging.origX + dx));
    const newY = Math.max(0, Math.min(7, dragging.origY + dy));
    updateLayoutTable(dragging.id, { x: newX, y: newY });
  }

  function handleGridMouseUp() {
    setDragging(null);
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  // ── Save feature flags ────────────────────────────────────────────────────
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

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#0f1923', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-5 border-b" style={{ borderColor: '#1e2d3d' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(245,158,11,0.15)' }}>
            <Shield size={20} style={{ color: '#f59e0b' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#f1f5f9' }}>Configuración</h1>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>Administración del sistema — Solo Administradores</p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left nav */}
        <div className="w-52 flex-shrink-0 border-r py-4 px-3" style={{ borderColor: '#1e2d3d', backgroundColor: '#0d1720' }}>
          {SECTIONS.map((sec) => {
            const Icon = sec.icon;
            const active = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm transition-all duration-150"
                style={{
                  backgroundColor: active ? 'rgba(245,158,11,0.15)' : 'transparent',
                  color: active ? '#f59e0b' : 'rgba(255,255,255,0.55)',
                  fontWeight: active ? 600 : 400,
                  borderLeft: active ? '3px solid #f59e0b' : '3px solid transparent',
                }}
              >
                <Icon size={16} />
                {sec.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── RESTAURANTE ─────────────────────────────────────────────────── */}
          {activeSection === 'restaurante' && (
            <div className="max-w-2xl">
              <SectionTitle icon={Store} title="Información del Restaurante" />
              <div className="rounded-xl p-5 mb-5" style={{ backgroundColor: '#1a2535', border: '1px solid #1e2d3d' }}>
                <label className="block text-sm font-semibold mb-3" style={{ color: 'rgba(255,255,255,0.7)' }}>Logo del Restaurante</label>
                <div className="flex items-center gap-5">
                  <div className="w-24 h-24 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0" style={{ backgroundColor: '#0f1923', border: '2px dashed #2a3f5f' }}>
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo del restaurante" className="w-full h-full object-cover" />
                    ) : (
                      <Store size={32} style={{ color: 'rgba(255,255,255,0.2)' }} />
                    )}
                  </div>
                  <div>
                    <button onClick={() => logoInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
                      <Upload size={15} /> Subir Logo
                    </button>
                    <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.35)' }}>PNG, JPG o SVG. Máx 2 MB.</p>
                    <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                  </div>
                </div>
              </div>
              <div className="rounded-xl p-5 mb-5" style={{ backgroundColor: '#1a2535', border: '1px solid #1e2d3d' }}>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>Nombre del Restaurante</label>
                <input type="text" value={restaurantNameDraft} onChange={(e) => setRestaurantNameDraft(e.target.value)} className="w-full px-4 py-2.5 rounded-lg text-sm outline-none" style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: '#f1f5f9' }} placeholder="Nombre del restaurante" />
              </div>

              {/* Color primario */}
              <div className="rounded-xl p-5 mb-5" style={{ backgroundColor: '#1a2535', border: '1px solid #1e2d3d' }}>
                <label className="text-sm font-medium block mb-3" style={{ color: 'rgba(255,255,255,0.7)' }}>Color primario (sidebar y botones)</label>
                <div className="flex items-center gap-3 flex-wrap">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={e => setPrimaryColor(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border-0"
                  />
                  <span className="text-sm font-mono" style={{ color: 'rgba(255,255,255,0.5)' }}>{primaryColor}</span>
                  <div className="flex gap-2 ml-2">
                    {(['#1B3A6B', '#7c3aed', '#059669', '#dc2626', '#0369a1', '#1f2937'] as const).map(c => (
                      <button
                        key={c}
                        onClick={() => setPrimaryColor(c)}
                        className="w-6 h-6 rounded-full border-2 transition-all"
                        style={{ backgroundColor: c, borderColor: primaryColor === c ? '#f59e0b' : 'transparent' }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Tema claro/oscuro */}
              <div className="rounded-xl p-5 mb-5" style={{ backgroundColor: '#1a2535', border: '1px solid #1e2d3d' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>Tema de la aplicación</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Afecta el fondo del sidebar y módulos internos</p>
                  </div>
                  <div className="flex gap-2">
                    {(['dark', 'light'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => setAppTheme(t)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={{
                          backgroundColor: appTheme === t ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.06)',
                          color: appTheme === t ? '#f59e0b' : 'rgba(255,255,255,0.5)',
                          border: appTheme === t ? '1px solid rgba(245,158,11,0.4)' : '1px solid transparent',
                        }}
                      >
                        {t === 'dark' ? '🌙 Oscuro' : '☀️ Claro'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <SaveButton saved={settingsSaved} onClick={handleSaveSettings} />
            </div>
          )}

          {/* ── OPERACIÓN ───────────────────────────────────────────────────── */}
          {activeSection === 'operacion' && (
            <div className="max-w-2xl">
              <SectionTitle icon={Hash} title="Parámetros de Operación" />
              <div className="rounded-xl p-5 mb-5" style={{ backgroundColor: '#1a2535', border: '1px solid #1e2d3d' }}>
                <div>
                  <label className="block text-sm font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>Porcentaje de IVA</label>
                  <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>Impuesto al Valor Agregado aplicado a las ventas</p>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <input type="number" min={0} max={100} step={0.5} value={ivaPercentDraft} onChange={(e) => setIvaPercentDraft(parseFloat(e.target.value) || 0)} className="w-28 px-4 py-2.5 rounded-lg text-sm outline-none pr-8" style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: '#f1f5f9' }} />
                      <Percent size={14} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.4)' }} />
                    </div>
                    <div className="px-3 py-1.5 rounded-lg text-sm" style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>IVA: {ivaPercentDraft}%</div>
                  </div>
                </div>
              </div>
              <SaveButton saved={operacionSaved} onClick={handleSaveOperacion} />
            </div>
          )}

          {/* ── LAYOUT MESAS ────────────────────────────────────────────────── */}
          {activeSection === 'layout' && (
            <div>
              <SectionTitle icon={LayoutGrid} title="Diseñador de Layout del Restaurante" />
              <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Agrega y arrastra las mesas para recrear el plano de tu restaurante. Este es el único lugar donde se configura el número de mesas y su capacidad.
              </p>

              {layoutLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#f59e0b', borderTopColor: 'transparent' }} />
                </div>
              ) : (
                <div className="flex gap-5">
                  {/* Grid canvas */}
                  <div className="flex-1">
                    <div
                      className="relative rounded-xl overflow-hidden select-none"
                      style={{
                        width: 12 * CELL,
                        height: 8 * CELL,
                        backgroundColor: '#0d1720',
                        border: '1px solid #1e2d3d',
                        backgroundImage: `
                          linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)
                        `,
                        backgroundSize: `${CELL}px ${CELL}px`,
                        cursor: dragging ? 'grabbing' : 'default',
                      }}
                      onMouseMove={handleGridMouseMove}
                      onMouseUp={handleGridMouseUp}
                      onMouseLeave={handleGridMouseUp}
                    >
                      {layoutTables.map((table) => {
                        const isSelected = selectedLayoutTable === table.id;
                        return (
                          <div
                            key={table.id}
                            onMouseDown={(e) => handleGridMouseDown(e, table.id)}
                            onClick={() => setSelectedLayoutTable(table.id)}
                            className="absolute flex flex-col items-center justify-center transition-shadow"
                            style={{
                              left: table.x * CELL + 4,
                              top: table.y * CELL + 4,
                              width: table.w * CELL - 8,
                              height: table.h * CELL - 8,
                              backgroundColor: isSelected ? 'rgba(245,158,11,0.25)' : 'rgba(27,58,107,0.7)',
                              border: `2px solid ${isSelected ? '#f59e0b' : '#2a3f5f'}`,
                              borderRadius: table.shape === 'round' ? '50%' : '8px',
                              cursor: 'grab',
                              zIndex: isSelected ? 10 : 1,
                              boxShadow: isSelected ? '0 0 0 2px rgba(245,158,11,0.3)' : 'none',
                            }}
                          >
                            <span className="text-xs font-bold" style={{ color: isSelected ? '#f59e0b' : '#f1f5f9' }}>{table.number}</span>
                            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '9px' }}>{table.capacity}p</span>
                          </div>
                        );
                      })}
                      {layoutTables.length === 0 && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-40">
                          <LayoutGrid size={32} style={{ color: 'rgba(255,255,255,0.3)' }} />
                          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Agrega mesas para comenzar</p>
                        </div>
                      )}
                    </div>
                    <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      <Move size={10} className="inline mr-1" />
                      Arrastra las mesas para posicionarlas en el plano
                    </p>
                  </div>

                  {/* Side panel */}
                  <div className="w-64 flex-shrink-0">
                    {/* Add table form */}
                    {showAddForm ? (
                      <div className="rounded-xl p-4 mb-3" style={{ backgroundColor: '#1a2535', border: '1px solid rgba(245,158,11,0.3)' }}>
                        <h3 className="text-sm font-bold mb-3" style={{ color: '#f59e0b' }}>Nueva Mesa</h3>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Nombre</label>
                            <input
                              type="text"
                              value={newTableName}
                              onChange={(e) => setNewTableName(e.target.value)}
                              className="w-full px-3 py-1.5 rounded-lg text-xs outline-none"
                              style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: '#f1f5f9' }}
                              autoFocus
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Capacidad (personas)</label>
                            <div className="flex items-center gap-2">
                              <button onClick={() => setNewTableCapacity((p) => Math.max(1, p - 1))} className="w-7 h-7 rounded-lg flex items-center justify-center font-bold" style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: '#f59e0b' }}>−</button>
                              <input type="number" min={1} max={20} value={newTableCapacity} onChange={(e) => setNewTableCapacity(Math.max(1, parseInt(e.target.value) || 1))} className="w-14 text-center px-2 py-1.5 rounded-lg text-xs outline-none" style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: '#f1f5f9' }} />
                              <button onClick={() => setNewTableCapacity((p) => Math.min(20, p + 1))} className="w-7 h-7 rounded-lg flex items-center justify-center font-bold" style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: '#f59e0b' }}>+</button>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Forma</label>
                            <div className="flex gap-2">
                              {(['rect', 'round'] as const).map((shape) => (
                                <button
                                  key={shape}
                                  onClick={() => setNewTableShape(shape)}
                                  className="flex-1 py-1.5 text-xs font-medium rounded-lg transition-all"
                                  style={{
                                    backgroundColor: newTableShape === shape ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)',
                                    color: newTableShape === shape ? '#f59e0b' : 'rgba(255,255,255,0.5)',
                                    border: `1px solid ${newTableShape === shape ? 'rgba(245,158,11,0.3)' : '#2a3f5f'}`,
                                  }}
                                >
                                  {shape === 'rect' ? 'Cuadrada' : 'Redonda'}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button onClick={() => setShowAddForm(false)} className="flex-1 py-1.5 rounded-lg text-xs font-medium" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid #2a3f5f' }}>Cancelar</button>
                            <button onClick={confirmAddTable} className="flex-1 py-1.5 rounded-lg text-xs font-semibold" style={{ backgroundColor: '#f59e0b', color: '#1B3A6B' }}>Agregar</button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 mb-3">
                        <button
                          onClick={openAddForm}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all"
                          style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}
                        >
                          <Plus size={13} /> Agregar Mesa
                        </button>
                        <button
                          onClick={() => setShowClearConfirm(true)}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                          style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}
                          title="Borrar todas las mesas"
                        >
                          <XCircle size={13} />
                        </button>
                      </div>
                    )}

                    <div className="rounded-xl p-4 mb-3" style={{ backgroundColor: '#1a2535', border: '1px solid #1e2d3d' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <Hash size={16} style={{ color: '#f59e0b' }} />
                        <h3 className="text-sm font-bold" style={{ color: '#f1f5f9' }}>Mesas ({layoutTables.length})</h3>
                      </div>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {layoutTables.map((table) => (
                          <div
                            key={table.id}
                            onClick={() => setSelectedLayoutTable(table.id)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all"
                            style={{
                              backgroundColor: selectedLayoutTable === table.id ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.04)',
                              border: `1px solid ${selectedLayoutTable === table.id ? 'rgba(245,158,11,0.3)' : 'transparent'}`,
                            }}
                          >
                            <div className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: 'rgba(27,58,107,0.8)', color: '#f59e0b', borderRadius: table.shape === 'round' ? '50%' : '4px' }}>
                              {table.number}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="block text-xs truncate" style={{ color: '#f1f5f9' }}>{table.name}</span>
                              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px' }}>{table.capacity} personas</span>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); removeLayoutTable(table.id); }}
                              className="p-1 rounded hover:bg-red-500/20 transition-colors"
                              style={{ color: 'rgba(255,255,255,0.3)' }}
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        ))}
                        {layoutTables.length === 0 && (
                          <p className="text-xs text-center py-3" style={{ color: 'rgba(255,255,255,0.3)' }}>Sin mesas agregadas</p>
                        )}
                      </div>
                    </div>

                    {/* Selected table editor */}
                    {selectedLayoutTable && (() => {
                      const t = layoutTables.find((lt) => lt.id === selectedLayoutTable);
                      if (!t) return null;
                      return (
                        <div className="rounded-xl p-4 mb-3" style={{ backgroundColor: '#1a2535', border: '1px solid rgba(245,158,11,0.25)' }}>
                          <h3 className="text-sm font-semibold mb-3" style={{ color: '#f59e0b' }}>Editar Mesa {t.number}</h3>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Nombre</label>
                              <input type="text" value={t.name} onChange={(e) => updateLayoutTable(t.id, { name: e.target.value })} className="w-full px-3 py-1.5 rounded-lg text-xs outline-none" style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: '#f1f5f9' }} />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Capacidad (personas)</label>
                              <div className="flex items-center gap-2">
                                <button onClick={() => updateLayoutTable(t.id, { capacity: Math.max(1, t.capacity - 1) })} className="w-7 h-7 rounded-lg flex items-center justify-center font-bold" style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: '#f59e0b' }}>−</button>
                                <input type="number" min={1} max={20} value={t.capacity} onChange={(e) => updateLayoutTable(t.id, { capacity: parseInt(e.target.value) || 1 })} className="w-14 text-center px-2 py-1.5 rounded-lg text-xs outline-none" style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: '#f1f5f9' }} />
                                <button onClick={() => updateLayoutTable(t.id, { capacity: Math.min(20, t.capacity + 1) })} className="w-7 h-7 rounded-lg flex items-center justify-center font-bold" style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: '#f59e0b' }}>+</button>
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Forma</label>
                              <div className="flex gap-2">
                                {(['rect', 'round'] as const).map((shape) => (
                                  <button
                                    key={shape}
                                    onClick={() => updateLayoutTable(t.id, { shape })}
                                    className="flex-1 py-1.5 text-xs font-medium rounded-lg transition-all"
                                    style={{
                                      backgroundColor: t.shape === shape ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)',
                                      color: t.shape === shape ? '#f59e0b' : 'rgba(255,255,255,0.5)',
                                      border: `1px solid ${t.shape === shape ? 'rgba(245,158,11,0.3)' : '#2a3f5f'}`,
                                    }}
                                  >
                                    {shape === 'rect' ? 'Cuadrada' : 'Redonda'}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="mt-1">
                      <SaveButton saved={layoutSaved} onClick={handleSaveLayout} label="Guardar Layout" />
                    </div>
                  </div>
                </div>
              )}

              {/* Clear all tables confirmation modal */}
              {showClearConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}>
                  <div className="w-full max-w-sm rounded-2xl p-6" style={{ backgroundColor: '#1a2535', border: '1px solid #2a3f5f' }}>
                    <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'rgba(245,158,11,0.15)' }}>
                      <Trash2 size={22} style={{ color: '#ef4444' }} />
                    </div>
                    <h3 className="text-base font-bold text-center mb-1" style={{ color: '#f1f5f9' }}>Borrar todas las mesas</h3>
                    <p className="text-sm text-center mb-5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      Se eliminarán todas las mesas del layout. Esta acción no se puede deshacer.
                    </p>
                    <div className="flex gap-3">
                      <button onClick={() => setShowClearConfirm(false)} className="flex-1 py-2.5 rounded-lg text-sm font-medium" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>Cancelar</button>
                      <button onClick={handleClearAllTables} className="flex-1 py-2.5 rounded-lg text-sm font-semibold" style={{ backgroundColor: '#ef4444', color: '#fff' }}>Borrar todo</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── HORARIOS ────────────────────────────────────────────────────── */}
          {activeSection === 'horarios' && (
            <div className="max-w-2xl">
              <SectionTitle icon={Clock} title="Horarios de Atención" />
              <div className="rounded-xl overflow-hidden mb-5" style={{ backgroundColor: '#1a2535', border: '1px solid #1e2d3d' }}>
                <div className="grid grid-cols-4 gap-4 px-5 py-3 text-xs font-semibold" style={{ backgroundColor: '#0f1923', color: 'rgba(255,255,255,0.4)' }}>
                  <span>DÍA</span><span>ABIERTO</span><span>APERTURA</span><span>CIERRE</span>
                </div>
                {hours.map((h, idx) => (
                  <div key={h.day} className="grid grid-cols-4 gap-4 items-center px-5 py-3" style={{ borderTop: idx > 0 ? '1px solid #1e2d3d' : 'none', opacity: h.open ? 1 : 0.5 }}>
                    <span className="text-sm font-medium" style={{ color: '#f1f5f9' }}>{h.dayLabel}</span>
                    <div>
                      <button onClick={() => updateHour(h.day, 'open', !h.open)} className="relative w-11 h-6 rounded-full transition-all duration-200" style={{ backgroundColor: h.open ? '#f59e0b' : '#2a3f5f' }}>
                        <span className="absolute top-0.5 w-5 h-5 rounded-full transition-all duration-200" style={{ backgroundColor: '#fff', left: h.open ? '22px' : '2px' }} />
                      </button>
                    </div>
                    <input type="time" value={h.from} disabled={!h.open} onChange={(e) => updateHour(h.day, 'from', e.target.value)} className="px-3 py-1.5 rounded-lg text-sm outline-none" style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: h.open ? '#f1f5f9' : 'rgba(255,255,255,0.3)', colorScheme: 'dark' }} />
                    <input type="time" value={h.to} disabled={!h.open} onChange={(e) => updateHour(h.day, 'to', e.target.value)} className="px-3 py-1.5 rounded-lg text-sm outline-none" style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: h.open ? '#f1f5f9' : 'rgba(255,255,255,0.3)', colorScheme: 'dark' }} />
                  </div>
                ))}
              </div>
              <SaveButton saved={hoursSaved} onClick={handleSaveHours} />
            </div>
          )}

          {/* ── IMPRESORA ────────────────────────────────────────────────────── */}
          {activeSection === 'impresora' && (
            <div className="max-w-2xl">
              <SectionTitle icon={Printer} title="Configuración de Impresora de Tickets" />

              {printerLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#f59e0b', borderTopColor: 'transparent' }} />
                </div>
              ) : (
                <>
                  {/* Status toggle */}
                  <div className="rounded-xl p-5 mb-4 flex items-center justify-between" style={{ backgroundColor: '#1a2535', border: '1px solid #1e2d3d' }}>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>Impresora Activa</p>
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Habilitar impresión automática de tickets</p>
                    </div>
                    <button onClick={() => setPrinterDraft((p) => ({ ...p, isActive: !p.isActive }))} className="relative w-12 h-6 rounded-full transition-all duration-200" style={{ backgroundColor: printerDraft.isActive ? '#f59e0b' : '#2a3f5f' }}>
                      <span className="absolute top-0.5 w-5 h-5 rounded-full transition-all duration-200" style={{ backgroundColor: '#fff', left: printerDraft.isActive ? '22px' : '2px' }} />
                    </button>
                  </div>

                  {/* Connection type */}
                  <div className="rounded-xl p-5 mb-4" style={{ backgroundColor: '#1a2535', border: '1px solid #1e2d3d' }}>
                    <label className="block text-sm font-semibold mb-3" style={{ color: 'rgba(255,255,255,0.7)' }}>Tipo de Conexión</label>
                    <div className="grid grid-cols-3 gap-3">
                      {([
                        { key: 'network', label: 'Red (IP)', icon: Wifi },
                        { key: 'usb', label: 'USB', icon: Usb },
                        { key: 'bluetooth', label: 'Bluetooth', icon: Bluetooth },
                      ] as const).map(({ key, label, icon: Icon }) => (
                        <button
                          key={key}
                          onClick={() => setPrinterDraft((p) => ({ ...p, connectionType: key }))}
                          className="flex flex-col items-center gap-2 py-3 rounded-xl text-sm transition-all"
                          style={{
                            backgroundColor: printerDraft.connectionType === key ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${printerDraft.connectionType === key ? 'rgba(245,158,11,0.4)' : '#2a3f5f'}`,
                            color: printerDraft.connectionType === key ? '#f59e0b' : 'rgba(255,255,255,0.5)',
                          }}
                        >
                          <Icon size={18} />
                          <span className="text-xs font-medium">{label}</span>
                        </button>
                      ))}
                    </div>

                    {/* Connection details */}
                    <div className="mt-4 space-y-3">
                      {printerDraft.connectionType === 'network' && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Dirección IP</label>
                            <input type="text" value={printerDraft.ipAddress} onChange={(e) => setPrinterDraft((p) => ({ ...p, ipAddress: e.target.value }))} placeholder="192.168.1.100" className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: '#f1f5f9' }} />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Puerto</label>
                            <input type="number" value={printerDraft.port} onChange={(e) => setPrinterDraft((p) => ({ ...p, port: parseInt(e.target.value) || 9100 }))} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: '#f1f5f9' }} />
                          </div>
                        </div>
                      )}
                      {printerDraft.connectionType === 'usb' && (
                        <div className="space-y-3">
                          {/* Estado de conexión */}
                          <div className="rounded-lg px-4 py-3 flex items-center gap-3" style={{
                            backgroundColor: printer.status === 'connected' ? 'rgba(34,197,94,0.1)' : printer.status === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${printer.status === 'connected' ? 'rgba(34,197,94,0.3)' : printer.status === 'error' ? 'rgba(239,68,68,0.3)' : '#2a3f5f'}`,
                          }}>
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${printer.status === 'connected' ? 'bg-green-400' : printer.status === 'connecting' || printer.status === 'printing' ? 'bg-yellow-400 animate-pulse' : 'bg-gray-500'}`} />
                            <div className="flex-1 min-w-0">
                              {printer.status === 'connected' && printer.device ? (
                                <>
                                  <p className="text-xs font-semibold" style={{ color: '#4ade80' }}>
                                    Conectada vía {printer.transport === 'serial' ? 'Puerto Serial (COM)' : 'WebUSB'}
                                  </p>
                                  <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.45)' }}>{printer.device.name}</p>
                                </>
                              ) : printer.status === 'printing' ? (
                                <p className="text-xs font-semibold" style={{ color: '#fbbf24' }}>Imprimiendo...</p>
                              ) : printer.status === 'connecting' ? (
                                <p className="text-xs font-semibold" style={{ color: '#fbbf24' }}>Conectando...</p>
                              ) : printer.error ? (
                                <>
                                  <p className="text-xs font-semibold" style={{ color: '#f87171' }}>Error de conexión</p>
                                  <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>{printer.error}</p>
                                </>
                              ) : (
                                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Sin impresora conectada</p>
                              )}
                            </div>
                            {printer.status === 'connected' && (
                              <button onClick={printer.disconnect}
                                className="text-xs px-2.5 py-1 rounded-lg flex-shrink-0"
                                style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                                Desconectar
                              </button>
                            )}
                          </div>

                          {/* Dos opciones de conexión */}
                          {printer.status !== 'connected' && (
                            <div className="grid grid-cols-2 gap-2">
                              {/* WebUSB */}
                              <div className="rounded-lg p-3 space-y-2" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid #2a3f5f' }}>
                                <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>
                                  🔌 WebUSB
                                </p>
                                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                                  Requiere Zadig en Windows si da error de driver
                                </p>
                                <button
                                  onClick={async () => {
                                    const ok = await printer.connectUsb();
                                    if (ok && printer.device) {
                                      setPrinterDraft(p => ({ ...p, usbDeviceName: printer.device!.name, usbVendorId: printer.device!.vendorId, usbProductId: printer.device!.productId }));
                                    }
                                  }}
                                  disabled={printer.status === 'connecting'}
                                  className="w-full py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50 transition-all"
                                  style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
                                  Conectar USB
                                </button>
                              </div>

                              {/* Web Serial */}
                              <div className="rounded-lg p-3 space-y-2" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid #2a3f5f' }}>
                                <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>
                                  📡 Puerto COM (Serial)
                                </p>
                                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                                  Sin drivers adicionales — funciona con el driver original
                                </p>
                                <button
                                  onClick={() => printer.connectSerial()}
                                  disabled={!printer.serialSupported || printer.status === 'connecting'}
                                  className="w-full py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50 transition-all"
                                  style={{ backgroundColor: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)' }}
                                  title={!printer.serialSupported ? 'Web Serial requiere Chrome 89+ o Edge 89+' : ''}>
                                  {!printer.serialSupported ? 'No disponible' : 'Conectar COM'}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Guía rápida MP-58N */}
                          {printer.status !== 'connected' && (
                            <div className="rounded-lg px-3 py-2" style={{ backgroundColor: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
                              <p className="text-xs font-semibold mb-1" style={{ color: 'rgba(245,158,11,0.8)' }}>💡 Para impresoras MP-58N y similares:</p>
                              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
                                <strong style={{ color: 'rgba(255,255,255,0.6)' }}>Opción recomendada:</strong> Prueba primero <em>Puerto COM</em> — funciona sin instalar nada extra.
                                Si no aparece el puerto, prueba <em>WebUSB</em>. Si WebUSB da error de driver, descarga{' '}
                                <strong style={{ color: '#f59e0b' }}>Zadig</strong> (zadig.akeo.ie) → selecciona la impresora → elige WinUSB → Replace Driver.
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {printerDraft.connectionType === 'bluetooth' && (
                        <div>
                          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Dirección Bluetooth (MAC)</label>
                          <input type="text" value={printerDraft.bluetoothAddress} onChange={(e) => setPrinterDraft((p) => ({ ...p, bluetoothAddress: e.target.value }))} placeholder="00:11:22:33:44:55" className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: '#f1f5f9' }} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Paper & print settings */}
                  <div className="rounded-xl p-5 mb-4" style={{ backgroundColor: '#1a2535', border: '1px solid #1e2d3d' }}>
                    <label className="block text-sm font-semibold mb-4" style={{ color: 'rgba(255,255,255,0.7)' }}>Configuración de Impresión</label>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Ancho de papel</label>
                        <div className="flex gap-2">
                          {([58, 80] as const).map((w) => (
                            <button key={w} onClick={() => setPrinterDraft((p) => ({ ...p, paperWidth: w }))} className="flex-1 py-2 rounded-lg text-sm font-medium transition-all" style={{ backgroundColor: printerDraft.paperWidth === w ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)', color: printerDraft.paperWidth === w ? '#f59e0b' : 'rgba(255,255,255,0.5)', border: `1px solid ${printerDraft.paperWidth === w ? 'rgba(245,158,11,0.4)' : '#2a3f5f'}` }}>
                              {w} mm
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Copias por ticket</label>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setPrinterDraft((p) => ({ ...p, printCopies: Math.max(1, p.printCopies - 1) }))} className="w-8 h-8 rounded-lg flex items-center justify-center font-bold" style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: '#f59e0b' }}>−</button>
                          <span className="w-8 text-center text-sm font-semibold" style={{ color: '#f1f5f9' }}>{printerDraft.printCopies}</span>
                          <button onClick={() => setPrinterDraft((p) => ({ ...p, printCopies: Math.min(5, p.printCopies + 1) }))} className="w-8 h-8 rounded-lg flex items-center justify-center font-bold" style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: '#f59e0b' }}>+</button>
                        </div>
                      </div>
                    </div>
                    {/* Toggles */}
                    {[
                      { key: 'autoCut', label: 'Corte automático', desc: 'Cortar el papel al terminar de imprimir' },
                      { key: 'printLogo', label: 'Imprimir logo', desc: 'Incluir el logo del restaurante en el ticket' },
                      { key: 'printFooter', label: 'Imprimir pie de página', desc: 'Mostrar mensaje al final del ticket' },
                    ].map(({ key, label, desc }) => (
                      <div key={key} className="flex items-center justify-between py-3 border-t" style={{ borderColor: '#1e2d3d' }}>
                        <div>
                          <p className="text-sm" style={{ color: '#f1f5f9' }}>{label}</p>
                          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{desc}</p>
                        </div>
                        <button onClick={() => setPrinterDraft((p) => ({ ...p, [key]: !p[key as keyof PrinterConfig] }))} className="relative w-11 h-6 rounded-full transition-all duration-200" style={{ backgroundColor: (printerDraft[key as keyof PrinterConfig] as boolean) ? '#f59e0b' : '#2a3f5f' }}>
                          <span className="absolute top-0.5 w-5 h-5 rounded-full transition-all duration-200" style={{ backgroundColor: '#fff', left: (printerDraft[key as keyof PrinterConfig] as boolean) ? '22px' : '2px' }} />
                        </button>
                      </div>
                    ))}
                    {printerDraft.printFooter && (
                      <div className="mt-3">
                        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Texto del pie de página</label>
                        <input type="text" value={printerDraft.footerText} onChange={(e) => setPrinterDraft((p) => ({ ...p, footerText: e.target.value }))} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: '#f1f5f9' }} placeholder="Gracias por su visita" />
                      </div>
                    )}
                  </div>

                  {/* ── DISEÑO DEL TICKET ── */}
                  <div className="rounded-xl p-5 mb-4" style={{ backgroundColor: '#1a2535', border: '1px solid #1e2d3d' }}>
                    <label className="block text-sm font-semibold mb-4" style={{ color: 'rgba(255,255,255,0.7)' }}>
                      🧾 Diseño del Ticket
                    </label>

                    {/* Encabezado extra */}
                    <div className="space-y-2 mb-4">
                      <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Línea de encabezado 1 (dirección, slogan...)</label>
                        <input type="text" value={printerDraft.headerLine1}
                          onChange={e => setPrinterDraft(p => ({ ...p, headerLine1: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                          style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: '#f1f5f9' }}
                          placeholder="Av. Reforma 123, Col. Centro" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Línea de encabezado 2 (tel, RFC, web...)</label>
                        <input type="text" value={printerDraft.headerLine2}
                          onChange={e => setPrinterDraft(p => ({ ...p, headerLine2: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                          style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: '#f1f5f9' }}
                          placeholder="Tel: 55 1234 5678 · RFC: XAXX010101000" />
                      </div>
                    </div>

                    {/* Separador */}
                    <div className="mb-4">
                      <label className="block text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>Carácter separador de secciones</label>
                      <div className="flex gap-2">
                        {['-', '=', '*', '.', '─'].map(ch => (
                          <button key={ch} onClick={() => setPrinterDraft(p => ({ ...p, separatorChar: ch }))}
                            className="flex-1 py-2 rounded-lg text-sm font-mono font-bold transition-all"
                            style={{
                              backgroundColor: printerDraft.separatorChar === ch ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)',
                              border: `1px solid ${printerDraft.separatorChar === ch ? 'rgba(245,158,11,0.4)' : '#2a3f5f'}`,
                              color: printerDraft.separatorChar === ch ? '#f59e0b' : 'rgba(255,255,255,0.5)',
                            }}>
                            {ch.repeat(4)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Elementos a mostrar */}
                    <p className="text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>Elementos a incluir en el ticket</p>
                    <div className="grid grid-cols-2 gap-x-4">
                      {[
                        { key: 'showOrderNumber', label: '# de orden' },
                        { key: 'showDate',        label: 'Fecha y hora' },
                        { key: 'showMesa',        label: 'Mesa' },
                        { key: 'showMesero',      label: 'Mesero' },
                        { key: 'showUnitPrice',   label: 'Precio unitario' },
                        { key: 'showSubtotal',    label: 'Subtotal' },
                        { key: 'showIva',         label: 'IVA desglosado' },
                        { key: 'showDiscount',    label: 'Descuento' },
                      ].map(({ key, label }) => (
                        <div key={key} className="flex items-center justify-between py-2 border-b" style={{ borderColor: '#1e2d3d' }}>
                          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>{label}</span>
                          <button
                            onClick={() => setPrinterDraft(p => ({ ...p, [key]: !(p as any)[key] }))}
                            className="relative w-9 h-5 rounded-full transition-all duration-200"
                            style={{ backgroundColor: (printerDraft as any)[key] ? '#f59e0b' : '#2a3f5f' }}>
                            <span className="absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200"
                              style={{ backgroundColor: '#fff', left: (printerDraft as any)[key] ? '17px' : '2px' }} />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Vista previa del ticket */}
                    <div className="mt-4">
                      <p className="text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        Vista previa ({printerDraft.paperWidth}mm · {printerDraft.paperWidth === 58 ? '32 cols' : '48 cols'})
                      </p>
                      <div className="rounded-lg p-3 font-mono text-xs leading-relaxed overflow-x-auto"
                        style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: '#d1fae5', whiteSpace: 'pre', maxHeight: '280px', overflowY: 'auto' }}>
                        {(() => {
                          const w = printerDraft.paperWidth === 58 ? 32 : 48;
                          const sep = (printerDraft.separatorChar || '-').repeat(w);
                          const center = (t: string) => t.slice(0, w).padStart(Math.floor((w + Math.min(t.length, w)) / 2)).padEnd(w);
                          const two = (l: string, r: string) => { const g = w - l.length - r.length; return l + (g > 0 ? ' '.repeat(g) : ' ') + r; };
                          const lines: string[] = [];
                          lines.push(center('RESTAURANTE EL SABOR'));
                          if (printerDraft.headerLine1) lines.push(center(printerDraft.headerLine1.slice(0, w)));
                          if (printerDraft.headerLine2) lines.push(center(printerDraft.headerLine2.slice(0, w)));
                          lines.push(sep);
                          if (printerDraft.showOrderNumber || printerDraft.showDate) lines.push(two(printerDraft.showOrderNumber ? 'Orden: #0042' : '', printerDraft.showDate ? '29/03/26 14:30' : ''));
                          if (printerDraft.showMesa || printerDraft.showMesero) lines.push(two(printerDraft.showMesa ? 'Mesa: 5' : '', printerDraft.showMesero ? 'Mesero: Ana' : ''));
                          lines.push(sep);
                          lines.push(two('PRODUCTO', 'IMPORTE'));
                          lines.push(sep);
                          lines.push(two('2x Tacos carne'.slice(0, w-8), '$170.00'));
                          if (printerDraft.showUnitPrice) lines.push('   c/u $85.00');
                          lines.push(two('1x Agua jamaica'.slice(0, w-8), '$35.00'));
                          lines.push(sep);
                          if (printerDraft.showSubtotal) lines.push(two('Subtotal:', '$205.00'));
                          if (printerDraft.showIva) lines.push(two('IVA (16%):', '$32.80'));
                          if (printerDraft.showDiscount) lines.push(two('Descuento:', '-$0.00'));
                          lines.push(two('TOTAL:', '$237.80'));
                          lines.push(sep);
                          if (printerDraft.printFooter) lines.push(center(printerDraft.footerText || 'Gracias por su visita'));
                          return lines.join('\n');
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Test result */}
                  {testResult && (
                    <div className="mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2" style={{ backgroundColor: testResult === 'success' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', border: `1px solid ${testResult === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, color: testResult === 'success' ? '#4ade80' : '#f87171' }}>
                      {testResult === 'success' ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
                      {testResult === 'success' ? 'Impresora respondió correctamente' : 'No se pudo conectar con la impresora'}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3">
                    {/* Botón conectar/desconectar USB */}
                    {printerDraft.connectionType === 'usb' && (
                      printer.status === 'connected' ? (
                        <button onClick={printer.disconnect}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all"
                          style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                          <Usb size={15} /> Desconectar
                        </button>
                      ) : (
                        <button
                          onClick={async () => {
                            if (!printer.supported) { toast.error('WebUSB requiere Chrome o Edge'); return; }
                            const ok = await printer.connect();
                            if (ok && printer.device) {
                              setPrinterDraft(p => ({ ...p, usbDeviceName: printer.device!.name, usbVendorId: printer.device!.vendorId, usbProductId: printer.device!.productId }));
                              toast.success(`Impresora conectada: ${printer.device.name}`);
                            }
                          }}
                          disabled={printer.status === 'connecting'}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
                          style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}
                          title={printerDraft.connectionType === 'usb' && printer.status !== 'connected' ? 'Conecta la impresora primero' : ''}>
                          {(testingPrinter || printer.status === 'printing')
                            ? <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'rgba(255,255,255,0.8)' }} />
                            : <Usb size={15} />}
                          {testingPrinter || printer.status === 'printing' ?'Imprimiendo...' :'Ticket de prueba'}
                        </button>
                      )
                    )}

                    <SaveButton saved={printerSaved} onClick={handleSavePrinter} />
                  </div>
                </>
              )}
            </div>
          )}

                    {/* ── FUNCIONALIDADES ──────────────────────────────────────────────── */}
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

          {/* ── LEALTAD CONFIG ────────────────────────────────────────────────── */}
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

          {/* ── SISTEMA ──────────────────────────────────────────────────────── */}
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

          {/* ── USUARIOS ────────────────────────────────────────────────────── */}
          {activeSection === 'usuarios' && (
            <div>
              <UsuariosManagement />
            </div>
          )}
        </div>
      </div>

      {/* ── Reset Confirmation Modal ──────────────────────────────────────────── */}
      {resetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ backgroundColor: '#1a2535', border: '1px solid #2a3f5f' }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'rgba(245,158,11,0.15)' }}>
              <RotateCcw size={22} style={{ color: '#ef4444' }} />
            </div>
            <h3 className="text-lg font-bold text-center mb-1" style={{ color: '#f1f5f9' }}>Confirmar Reset del Sistema</h3>
            <p className="text-sm text-center mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>Ingresa tu contraseña de administrador para confirmar esta acción.</p>

            <div className="mb-4">
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Contraseña de Administrador</label>
              <div className="relative">
                <input
                  type={showResetPw ? 'text' : 'password'}
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSystemReset()}
                  className="w-full px-4 py-2.5 rounded-lg text-sm outline-none pr-10"
                  style={{ backgroundColor: '#0f1923', border: `1px solid ${resetError ? '#ef4444' : '#2a3f5f'}`, color: '#f1f5f9' }}
                  placeholder="••••••••"
                  autoFocus
                />
                <button type="button" onClick={() => setShowResetPw((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {showResetPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {resetError && <p className="text-xs mt-1.5" style={{ color: '#ef4444' }}>{resetError}</p>}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setResetModal(false)} className="flex-1 py-2.5 rounded-lg text-sm font-medium" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>Cancelar</button>
              <button onClick={handleSystemReset} disabled={resetLoading} className="flex-1 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2" style={{ backgroundColor: '#ef4444', color: '#fff', opacity: resetLoading ? 0.7 : 1 }}>
                {resetLoading ? <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#fff', borderTopColor: 'transparent' }} /> : <RotateCcw size={15} />}
                {resetLoading ? 'Reseteando...' : 'Confirmar Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionTitle({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2">
        <Icon size={18} style={{ color: '#f59e0b' }} />
        <h2 className="text-base font-bold" style={{ color: '#f1f5f9' }}>{title}</h2>
      </div>
      {subtitle && <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>{subtitle}</p>}
    </div>
  );
}

function SaveButton({ saved, onClick, label }: { saved: boolean; onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150"
      style={{ backgroundColor: saved ? 'rgba(34,197,94,0.2)' : '#f59e0b', color: saved ? '#22c55e' : '#1B3A6B', border: saved ? '1px solid rgba(34,197,94,0.4)' : 'none' }}
    >
      {saved ? <CheckCircle size={16} /> : <Save size={16} />}
      {saved ? 'Guardado' : (label || 'Guardar Cambios')}
    </button>
  );
}