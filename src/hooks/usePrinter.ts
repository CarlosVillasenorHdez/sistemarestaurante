'use client';

// ─── Type declarations for WebUSB and Web Serial ──────────────────────────────
declare global {
  interface Navigator {
    usb: {
      requestDevice(options: { filters: object[] }): Promise<USBDevice>;
      getDevices(): Promise<USBDevice[]>;
    };
    serial: {
      requestPort(options?: { filters?: object[] }): Promise<SerialPort>;
      getPorts(): Promise<SerialPort[]>;
    };
  }
  interface USBDevice {
    vendorId: number;
    productId: number;
    productName?: string;
    configuration: USBConfiguration | null;
    open(): Promise<void>;
    close(): Promise<void>;
    selectConfiguration(configurationValue: number): Promise<void>;
    claimInterface(interfaceNumber: number): Promise<void>;
    transferOut(endpointNumber: number, data: ArrayBuffer | ArrayBufferView): Promise<USBOutTransferResult>;
  }
  interface USBConfiguration { interfaces: USBInterface[]; }
  interface USBInterface { interfaceNumber: number; alternates: USBAlternateInterface[]; }
  interface USBAlternateInterface { interfaceClass: number; endpoints: USBEndpoint[]; }
  interface USBEndpoint { endpointNumber: number; direction: 'in' | 'out'; type: 'bulk' | 'interrupt' | 'isochronous'; }
  interface USBOutTransferResult { bytesWritten: number; status: 'ok' | 'stall' | 'babble'; }
  interface SerialPort {
    open(options: { baudRate: number }): Promise<void>;
    close(): Promise<void>;
    readonly writable: WritableStream<Uint8Array> | null;
    getInfo(): { usbVendorId?: number; usbProductId?: number };
  }
}

import { useState, useCallback, useRef, useEffect } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PrinterStatus   = 'disconnected' | 'connecting' | 'connected' | 'printing' | 'error';
export type PrinterTransport = 'usb' | 'serial' | null;

export interface TicketData {
  restaurantName: string;
  branchName?:   string;
  headerLine1?:  string;
  headerLine2?:  string;
  orderNumber:   string;
  mesa:          string;
  mesero:        string;
  items: { name: string; qty: number; price: number; emoji?: string }[];
  subtotal:  number;
  iva:       number;
  discount:  number;
  total:     number;
  payMethod:   string;
  amountPaid?: number;
  change?:     number;
  footer?:     string;
  paperWidth?: 58 | 80;
  autoCut?:    boolean;
  copies?:     number;
  // Design options (from ticket configurator)
  separatorChar?:   string;
  showOrderNumber?: boolean;
  showDate?:        boolean;
  showMesa?:        boolean;
  showMesero?:      boolean;
  showSubtotal?:    boolean;
  showIva?:         boolean;
  ivaPercent?:      number; // e.g. 16 for Mexico, 10 for Spain restaurants
  showDiscount?:    boolean;
  showUnitPrice?:   boolean;
}

// ─── ESC/POS helpers ──────────────────────────────────────────────────────────

const ESC = 0x1b;
const GS  = 0x1d;
const CMD = {
  INIT:         [ESC, 0x40],
  PARTIAL_CUT:  [GS, 0x56, 0x42, 0x01],
  ALIGN_LEFT:   [ESC, 0x61, 0x00],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  BOLD_ON:      [ESC, 0x45, 0x01],
  BOLD_OFF:     [ESC, 0x45, 0x00],
  DOUBLE_HEIGHT:[ESC, 0x21, 0x10],
  DOUBLE_SIZE:  [ESC, 0x21, 0x30],
  NORMAL_SIZE:  [ESC, 0x21, 0x00],
  LF:           [0x0a],
};

function encode(text: string): Uint8Array {
  const bytes: number[] = [];
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    bytes.push(code < 256 ? code : 0x3f);
  }
  return new Uint8Array(bytes);
}

function bts(...cmds: number[][]): Uint8Array { return new Uint8Array(cmds.flat()); }

function twoCol(left: string, right: string, width: number): Uint8Array {
  const gap = width - left.length - right.length;
  return encode(left + (gap > 0 ? ' '.repeat(gap) : ' ') + right + '\n');
}

function sep(width: number, char = '-'): Uint8Array {
  return encode((char.slice(0, 1) || '-').repeat(width) + '\n');
}

// show helper: returns true if option is undefined (default on) or explicitly true
function show(val: boolean | undefined, def = true): boolean {
  return val === undefined ? def : val;
}

export function buildTicket(data: TicketData): Uint8Array {
  const width   = data.paperWidth === 58 ? 32 : 48;
  const sepChar = data.separatorChar?.slice(0, 1) || '-';
  const chunks: Uint8Array[] = [];
  const add = (...u: Uint8Array[]) => chunks.push(...u);

  add(bts(CMD.INIT));

  // ── Header ─────────────────────────────────────────────────────────────────
  add(bts(CMD.ALIGN_CENTER, CMD.DOUBLE_SIZE, CMD.BOLD_ON));
  add(encode((data.restaurantName || 'RESTAURANTE').slice(0, width) + '\n'));
  add(bts(CMD.NORMAL_SIZE, CMD.BOLD_OFF));
  if (data.branchName)  add(encode(data.branchName.slice(0, width)  + '\n'));
  if (data.headerLine1) add(encode(data.headerLine1.slice(0, width) + '\n'));
  if (data.headerLine2) add(encode(data.headerLine2.slice(0, width) + '\n'));
  add(bts(CMD.ALIGN_LEFT));
  add(sep(width, sepChar));

  // ── Order info ──────────────────────────────────────────────────────────────
  const now     = new Date();
  const dateStr = now.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: '2-digit' });
  const timeStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  const left1  = show(data.showOrderNumber) ? `Orden: ${data.orderNumber}` : '';
  const right1 = show(data.showDate)        ? `${dateStr} ${timeStr}`      : '';
  if (left1 || right1) add(twoCol(left1, right1, width));

  const left2  = show(data.showMesa)   ? `Mesa: ${data.mesa}`     : '';
  const right2 = show(data.showMesero) ? `Mesero: ${data.mesero}` : '';
  if (left2 || right2) add(twoCol(left2, right2, width));

  add(sep(width, sepChar));

  // ── Items ───────────────────────────────────────────────────────────────────
  add(bts(CMD.BOLD_ON));
  add(twoCol('PRODUCTO', 'IMPORTE', width));
  add(bts(CMD.BOLD_OFF));
  add(sep(width, '-'));

  for (const item of data.items) {
    const nameMax = width - 10;
    const name  = `${item.qty}x ${item.name}`.slice(0, nameMax);
    const price = `$${(item.qty * item.price).toFixed(2)}`;
    add(twoCol(name, price, width));
    if (item.qty > 1 && show(data.showUnitPrice))
      add(encode(`   c/u $${item.price.toFixed(2)}\n`));
  }

  add(sep(width, sepChar));

  // ── Totals ──────────────────────────────────────────────────────────────────
  if (show(data.showDiscount) && data.discount > 0)
    add(twoCol('Descuento:', `-$${data.discount.toFixed(2)}`, width));
  if (show(data.showSubtotal) && data.subtotal !== data.total)
    add(twoCol('Subtotal:', `$${data.subtotal.toFixed(2)}`, width));
  if (show(data.showIva))
    add(twoCol(`IVA (${data.ivaPercent ?? 16}%):`, `$${data.iva.toFixed(2)}`, width));

  add(bts(CMD.BOLD_ON, CMD.DOUBLE_HEIGHT));
  add(twoCol('TOTAL:', `$${data.total.toFixed(2)}`, width));
  add(bts(CMD.NORMAL_SIZE, CMD.BOLD_OFF));
  add(sep(width, sepChar));

  // ── Payment ─────────────────────────────────────────────────────────────────
  add(twoCol('Pago:', data.payMethod === 'efectivo' ? 'Efectivo' : 'Tarjeta', width));
  if (data.payMethod === 'efectivo' && data.amountPaid !== undefined) {
    add(twoCol('Recibido:', `$${data.amountPaid.toFixed(2)}`, width));
    if ((data.change ?? 0) > 0) {
      add(bts(CMD.BOLD_ON));
      add(twoCol('Cambio:', `$${data.change!.toFixed(2)}`, width));
      add(bts(CMD.BOLD_OFF));
    }
  }

  // ── Footer ──────────────────────────────────────────────────────────────────
  add(bts(CMD.ALIGN_CENTER, CMD.LF));
  add(encode((data.footer || 'Gracias por su visita') + '\n'));
  add(encode('* * *\n'));
  add(bts(CMD.LF, CMD.LF, CMD.LF));
  if (data.autoCut !== false) add(bts(CMD.PARTIAL_CUT));

  const total = chunks.reduce((s, c) => s + c.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) { result.set(c, offset); offset += c.length; }
  return result;
}

export function buildTestTicket(
  width: 58 | 80 = 80,
  opts?: Partial<TicketData>
): Uint8Array {
  return buildTicket({
    restaurantName:  opts?.restaurantName ?? 'PRUEBA DE IMPRESORA',
    branchName:      opts?.branchName     ?? 'Aldente',
    headerLine1:     opts?.headerLine1,
    headerLine2:     opts?.headerLine2,
    orderNumber:     'TEST-001',
    mesa:            'Mesa 5',
    mesero:          'Administrador',
    items: [
      { name: 'Tacos de carne asada', qty: 2, price: 85 },
      { name: 'Agua de jamaica',      qty: 1, price: 35 },
      { name: 'Quesadillas',          qty: 1, price: 65 },
    ],
    subtotal: 270, iva: 43.2, discount: 0, total: 313.2,
    payMethod:   'efectivo',
    amountPaid:  350,
    change:      36.8,
    footer:      opts?.footer     ?? '¡Impresora configurada correctamente!',
    paperWidth:  width,
    autoCut:     opts?.autoCut    ?? true,
    copies:      1,
    separatorChar:   opts?.separatorChar,
    showOrderNumber: opts?.showOrderNumber,
    showDate:        opts?.showDate,
    showMesa:        opts?.showMesa,
    showMesero:      opts?.showMesero,
    showSubtotal:    opts?.showSubtotal,
    showIva:         opts?.showIva,
    showDiscount:    opts?.showDiscount,
    showUnitPrice:   opts?.showUnitPrice,
  });
}

// ─── Device info ──────────────────────────────────────────────────────────────

export interface PrinterDevice {
  vendorId:  number;
  productId: number;
  name:      string;
  transport: PrinterTransport;
  raw:       USBDevice | SerialPort;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePrinter() {
  const [status,   setStatus]   = useState<PrinterStatus>('disconnected');
  const [device,   setDevice]   = useState<PrinterDevice | null>(null);
  const [error,    setError]    = useState<string | null>(null);
  const [transport, setTransport] = useState<PrinterTransport>(null);
  const [supported,       setSupported]       = useState(false);
  const [serialSupported, setSerialSupported] = useState(false);

  const usbDeviceRef    = useRef<USBDevice | null>(null);
  const serialPortRef   = useRef<SerialPort | null>(null);
  const serialWriterRef = useRef<WritableStreamDefaultWriter<Uint8Array> | null>(null);

  useEffect(() => {
    const hasUsb    = typeof navigator !== 'undefined' && 'usb'    in navigator;
    const hasSerial = typeof navigator !== 'undefined' && 'serial' in navigator;
    setSupported(hasUsb || hasSerial);
    setSerialSupported(hasSerial);

    if (hasUsb) {
      try {
        navigator.usb.getDevices().then(async (devices) => {
          if (devices.length > 0) {
            try { await openUsbDevice(devices[0]); } catch { /* silent */ }
          }
        }).catch(() => {});
      } catch { /* permissions policy */ }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── USB ────────────────────────────────────────────────────────────────────

  async function openUsbDevice(raw: USBDevice) {
    await raw.open();
    if (raw.configuration === null) await raw.selectConfiguration(1);

    const iface = raw.configuration?.interfaces.find(
      (i) => i.alternates[0]?.interfaceClass === 7
    ) ?? raw.configuration?.interfaces[0];

    if (!iface) throw new Error('No se encontró interfaz de impresora en el dispositivo USB');
    await raw.claimInterface(iface.interfaceNumber);
    usbDeviceRef.current = raw;

    setDevice({
      vendorId:  raw.vendorId,
      productId: raw.productId,
      name: raw.productName || `USB ${raw.vendorId.toString(16).toUpperCase().padStart(4,'0')}:${raw.productId.toString(16).toUpperCase().padStart(4,'0')}`,
      transport: 'usb',
      raw,
    });
    setTransport('usb');
    setStatus('connected');
    setError(null);
  }

  const connectUsb = useCallback(async (): Promise<boolean> => {
    if (!('usb' in navigator)) {
      setError('WebUSB no disponible. Usa Chrome o Edge.');
      return false;
    }
    setStatus('connecting');
    setError(null);
    try {
      const raw = await navigator.usb.requestDevice({ filters: [] });
      await openUsbDevice(raw);
      return true;
    } catch (err: any) {
      if (err?.name === 'NotFoundError') {
        setStatus('disconnected');
      } else if (err?.message?.includes('permissions policy') || err?.message?.includes('disallowed')) {
        setError('WebUSB bloqueado — abre la app en una pestaña directa (no en un iframe).');
        setStatus('error');
      } else if (err?.name === 'SecurityError') {
        setError('Driver bloqueando WebUSB. Usa "Conectar por Serial (COM)" o instala Zadig (zadig.akeo.ie).');
        setStatus('error');
      } else {
        setError(err?.message || 'Error al conectar por USB');
        setStatus('error');
      }
      return false;
    }
  }, []);

  // ── Serial ─────────────────────────────────────────────────────────────────

  const connectSerial = useCallback(async (): Promise<boolean> => {
    if (!('serial' in navigator)) {
      setError('Web Serial no disponible. Usa Chrome 89+ o Edge 89+.');
      return false;
    }
    setStatus('connecting');
    setError(null);
    try {
      const port = await navigator.serial.requestPort({ filters: [] });
      await port.open({ baudRate: 9600 });
      if (!port.writable) throw new Error('Puerto serial sin stream de escritura');

      serialPortRef.current   = port;
      serialWriterRef.current = port.writable.getWriter();
      const info = port.getInfo();

      setDevice({
        vendorId:  info.usbVendorId  ?? 0,
        productId: info.usbProductId ?? 0,
        name: `Puerto Serie (COM) — VID:${(info.usbVendorId ?? 0).toString(16).toUpperCase().padStart(4,'0')}`,
        transport: 'serial',
        raw: port,
      });
      setTransport('serial');
      setStatus('connected');
      setError(null);
      return true;
    } catch (err: any) {
      if (err?.name === 'NotFoundError') {
        setStatus('disconnected');
      } else {
        setError(err?.message || 'Error al conectar por puerto serial');
        setStatus('error');
      }
      return false;
    }
  }, []);

  const connect = useCallback(async (): Promise<boolean> => connectUsb(), [connectUsb]);

  // ── Disconnect ─────────────────────────────────────────────────────────────

  const disconnect = useCallback(async () => {
    if (usbDeviceRef.current) {
      try { await usbDeviceRef.current.close(); } catch { /* ignore */ }
      usbDeviceRef.current = null;
    }
    if (serialWriterRef.current) {
      try { serialWriterRef.current.releaseLock(); } catch { /* ignore */ }
      serialWriterRef.current = null;
    }
    if (serialPortRef.current) {
      try { await serialPortRef.current.close(); } catch { /* ignore */ }
      serialPortRef.current = null;
    }
    setDevice(null);
    setTransport(null);
    setStatus('disconnected');
    setError(null);
  }, []);

  // ── Print ──────────────────────────────────────────────────────────────────

  const print = useCallback(async (data: Uint8Array, copies = 1): Promise<boolean> => {
    if (!usbDeviceRef.current && !serialWriterRef.current) {
      setError('Impresora no conectada. Conéctala primero en Configuración → Impresora.');
      return false;
    }
    setStatus('printing');
    setError(null);
    try {
      for (let i = 0; i < copies; i++) {
        if (usbDeviceRef.current) {
          const dev   = usbDeviceRef.current;
          const iface = dev.configuration?.interfaces.find((ii) => ii.alternates[0]?.interfaceClass === 7)
            ?? dev.configuration?.interfaces[0];
          const ep = iface?.alternates[0]?.endpoints.find((e) => e.direction === 'out' && e.type === 'bulk');
          if (!ep) throw new Error('No se encontró endpoint de impresión USB');
          await dev.transferOut(ep.endpointNumber, data);
        } else if (serialWriterRef.current) {
          const CHUNK = 64;
          for (let off = 0; off < data.length; off += CHUNK) {
            await serialWriterRef.current.write(data.slice(off, off + CHUNK));
            await new Promise(r => setTimeout(r, 5));
          }
        }
        if (copies > 1 && i < copies - 1) await new Promise(r => setTimeout(r, 400));
      }
      setStatus('connected');
      return true;
    } catch (err: any) {
      setError(err?.message || 'Error al imprimir');
      setStatus('error');
      setTimeout(() => setStatus('connected'), 3000);
      return false;
    }
  }, []);

  const printTicket = useCallback(async (ticketData: TicketData): Promise<boolean> => {
    const payload = buildTicket(ticketData);
    return print(payload, ticketData.copies ?? 1);
  }, [print]);

  const printTest = useCallback(async (
    paperWidth: 58 | 80 = 80,
    opts?: Partial<TicketData>
  ): Promise<boolean> => {
    return print(buildTestTicket(paperWidth, opts));
  }, [print]);

  return {
    status, device, error, transport,
    supported, serialSupported,
    connect, connectUsb, connectSerial,
    disconnect, print, printTicket, printTest,
  };
}