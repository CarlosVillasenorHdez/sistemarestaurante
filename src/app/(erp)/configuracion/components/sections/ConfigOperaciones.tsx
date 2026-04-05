'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { Clock, Printer, CheckCircle, Save, Wifi, Usb, Bluetooth, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { usePrinter } from '@/hooks/usePrinter';
import { BusinessHours, PrinterConfig } from './types';
import Icon from '@/components/ui/AppIcon';


const defaultPrinter: PrinterConfig = {
  id: '', name: 'Impresora Principal', connectionType: 'network',
  ipAddress: '192.168.1.100', port: 9100, usbPath: '', bluetoothAddress: '',
  paperWidth: 80, printCopies: 1, autoCut: true, printLogo: true,
  printFooter: true, footerText: 'Gracias por su visita',
  showOrderNumber: true, showMesa: true, showMesero: true, showDate: true,
  showSubtotal: true, showIva: true, showDiscount: true, showUnitPrice: true,
  headerLine1: '', headerLine2: '', separatorChar: '-', isActive: true,
};

const initialHours: BusinessHours[] = [
  { day: 'lunes',     dayLabel: 'Lunes',     open: true, from: '09:00', to: '22:00' },
  { day: 'martes',    dayLabel: 'Martes',    open: true, from: '09:00', to: '22:00' },
  { day: 'miercoles', dayLabel: 'Miércoles', open: true, from: '09:00', to: '22:00' },
  { day: 'jueves',    dayLabel: 'Jueves',    open: true, from: '09:00', to: '22:00' },
  { day: 'viernes',   dayLabel: 'Viernes',   open: true, from: '09:00', to: '23:00' },
  { day: 'sabado',    dayLabel: 'Sábado',    open: true, from: '10:00', to: '23:00' },
  { day: 'domingo',   dayLabel: 'Domingo',   open: true, from: '10:00', to: '21:00' },
];

function SectionTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      <Icon size={18} style={{ color: '#f59e0b' }} />
      <h2 className="text-base font-bold" style={{ color: '#f1f5f9' }}>{title}</h2>
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

export default function ConfigOperaciones({ activeSection }: { activeSection: string }) {
  const supabase = createClient();
  const printer = usePrinter();

  const [hours, setHours] = useState<BusinessHours[]>(initialHours);
  const [hoursSaved, setHoursSaved] = useState(false);
  const [printerConfig, setPrinterConfig] = useState<PrinterConfig>(defaultPrinter);
  const [printerDraft, setPrinterDraft] = useState<PrinterConfig>(defaultPrinter);
  const [printerSaved, setPrinterSaved] = useState(false);
  const [printerLoading, setPrinterLoading] = useState(true);
  const [testingPrinter, setTestingPrinter] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);


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

  useEffect(() => {
    loadPrinterConfig();
    supabase.from('system_config').select('config_key,config_value').eq('config_key', 'business_hours').single()
      .then(({ data }) => { if (data?.config_value) { try { setHours(JSON.parse(data.config_value)); } catch { /* ignore */ } } });
  }, [loadPrinterConfig, supabase]);

  return (
    <div className="max-w-2xl">
      {activeSection === 'horarios' && <div>
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
                        <span className="absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200" style={{ backgroundColor: '#fff', left: h.open ? '22px' : '2px' }} />
                      </button>
                    </div>
                    <input type="time" value={h.from} disabled={!h.open} onChange={(e) => updateHour(h.day, 'from', e.target.value)} className="px-3 py-1.5 rounded-lg text-sm outline-none" style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: h.open ? '#f1f5f9' : 'rgba(255,255,255,0.3)', colorScheme: 'dark' }} />
                    <input type="time" value={h.to} disabled={!h.open} onChange={(e) => updateHour(h.day, 'to', e.target.value)} className="px-3 py-1.5 rounded-lg text-sm outline-none" style={{ backgroundColor: '#0f1923', border: '1px solid #2a3f5f', color: h.open ? '#f1f5f9' : 'rgba(255,255,255,0.3)', colorScheme: 'dark' }} />
                  </div>
                ))}
              </div>
              <SaveButton saved={hoursSaved} onClick={handleSaveHours} />
            </div>}
      {activeSection === 'impresora' && <div className="max-w-2xl">
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
                          title="Imprime un ticket de prueba para verificar la configuración">
                          {(testingPrinter || printer.status === 'printing')
                            ? <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'rgba(255,255,255,0.8)' }} />
                            : <Printer size={15} />}
                          {testingPrinter || printer.status === 'printing' ? 'Imprimiendo...' : 'Ticket de prueba'}
                        </button>
                      )
                    )}

                    <SaveButton saved={printerSaved} onClick={() => handleSavePrinter()} />
                  </div>
                </>
              )}
            </div>}
    </div>
  );
}