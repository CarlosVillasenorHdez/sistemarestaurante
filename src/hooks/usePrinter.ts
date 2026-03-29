'use client';

// WebUSB type declarations (not in default TS lib)
declare global {
  interface Navigator {
    usb: {
      requestDevice(options: { filters: object[] }): Promise<USBDevice>;
      getDevices(): Promise<USBDevice[]>;
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
  interface USBConfiguration {
    interfaces: USBInterface[];
  }
  interface USBInterface {
    interfaceNumber: number;
    alternates: USBAlternateInterface[];
  }
  interface USBAlternateInterface {
    interfaceClass: number;
    endpoints: USBEndpoint[];
  }
  interface USBEndpoint {
    endpointNumber: number;
    direction: 'in' | 'out';
    type: 'bulk' | 'interrupt' | 'isochronous';
  }
  interface USBOutTransferResult {
    bytesWritten: number;
    status: 'ok' | 'stall' | 'babble';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// usePrinter — WebUSB + ESC/POS para impresoras térmicas USB
//
// Navegadores compatibles: Chrome 61+, Edge 79+, Opera 48+
// Firefox y Safari NO soportan WebUSB.
//
// Cómo funciona:
//   1. navigator.usb.requestDevice() — muestra el diálogo del navegador para
//      seleccionar el dispositivo USB. Solo se puede llamar desde un gesto
//      del usuario (click). El permiso queda guardado para sesiones futuras.
//   2. usePrinter.connect() — solicita permiso y conecta
//   3. usePrinter.print(commands) — envía bytes ESC/POS al endpoint bulk
//   4. Helpers: printTicket(data), printTest()
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useRef, useEffect } from 'react';

export type PrinterStatus = 'disconnected' | 'connecting' | 'connected' | 'printing' | 'error';

export interface TicketData {
  restaurantName: string;
  branchName?: string;
  orderNumber: string;
  mesa: string;
  mesero: string;
  items: { name: string; qty: number; price: number; emoji?: string }[];
  subtotal: number;
  iva: number;
  discount: number;
  total: number;
  payMethod: string;
  amountPaid?: number;
  change?: number;
  footer?: string;
  paperWidth?: 58 | 80;
  autoCut?: boolean;
  copies?: number;
}

// ─── ESC/POS helpers ─────────────────────────────────────────────────────────

const ESC = 0x1b;
const GS  = 0x1d;

const CMD = {
  INIT:           [ESC, 0x40],
  CUT:            [GS, 0x56, 0x41, 0x00],   // full cut
  PARTIAL_CUT:    [GS, 0x56, 0x42, 0x01],   // partial cut
  ALIGN_LEFT:     [ESC, 0x61, 0x00],
  ALIGN_CENTER:   [ESC, 0x61, 0x01],
  ALIGN_RIGHT:    [ESC, 0x61, 0x02],
  BOLD_ON:        [ESC, 0x45, 0x01],
  BOLD_OFF:       [ESC, 0x45, 0x00],
  DOUBLE_HEIGHT:  [ESC, 0x21, 0x10],
  DOUBLE_SIZE:    [ESC, 0x21, 0x30],
  NORMAL_SIZE:    [ESC, 0x21, 0x00],
  LF:             [0x0a],
  CR:             [0x0d],
};

function encode(text: string): Uint8Array {
  // Latin-1 encoding compatible with most thermal printers
  const bytes: number[] = [];
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    bytes.push(code < 256 ? code : 0x3f); // '?' for unmappable chars
  }
  return new Uint8Array(bytes);
}

function bytes(...cmds: number[][]): Uint8Array {
  const flat = cmds.flat();
  return new Uint8Array(flat);
}

function line(text: string, width = 48): Uint8Array {
  return encode(text.padEnd(width, ' ').slice(0, width) + '\n');
}

function twoCol(left: string, right: string, width = 48): Uint8Array {
  const gap = width - left.length - right.length;
  return encode(left + (gap > 0 ? ' '.repeat(gap) : ' ') + right + '\n');
}

function separator(width = 48, char = '-'): Uint8Array {
  return encode(char.repeat(width) + '\n');
}

export function buildTicket(data: TicketData): Uint8Array {
  const width = data.paperWidth === 58 ? 32 : 48;
  const chunks: Uint8Array[] = [];
  const add = (...u: Uint8Array[]) => chunks.push(...u);

  // Init
  add(bytes(CMD.INIT));

  // Header — restaurant name
  add(bytes(CMD.ALIGN_CENTER, CMD.DOUBLE_SIZE, CMD.BOLD_ON));
  add(encode((data.restaurantName || 'RESTAURANTE').slice(0, width) + '\n'));
  add(bytes(CMD.NORMAL_SIZE, CMD.BOLD_OFF));

  if (data.branchName) {
    add(encode(data.branchName.slice(0, width) + '\n'));
  }

  add(bytes(CMD.ALIGN_LEFT));
  add(separator(width));

  // Order info
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: '2-digit' });
  const timeStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  add(twoCol(`Orden: ${data.orderNumber}`, `${dateStr} ${timeStr}`, width));
  add(twoCol(`Mesa: ${data.mesa}`, `Mesero: ${data.mesero}`, width));
  add(separator(width));

  // Items
  add(bytes(CMD.BOLD_ON));
  add(twoCol('PRODUCTO', 'IMPORTE', width));
  add(bytes(CMD.BOLD_OFF));
  add(separator(width, '-'));

  for (const item of data.items) {
    const nameMax = width - 10;
    const name = `${item.qty}x ${item.name}`.slice(0, nameMax);
    const price = `$${(item.qty * item.price).toFixed(2)}`;
    add(twoCol(name, price, width));
    // Unit price if qty > 1
    if (item.qty > 1) {
      add(encode(`   c/u $${item.price.toFixed(2)}\n`));
    }
  }

  add(separator(width));

  // Totals
  if (data.discount > 0) {
    add(twoCol('Subtotal:', `$${data.subtotal.toFixed(2)}`, width));
    add(twoCol('Descuento:', `-$${data.discount.toFixed(2)}`, width));
  }
  add(twoCol('IVA (16%):', `$${data.iva.toFixed(2)}`, width));

  add(bytes(CMD.BOLD_ON, CMD.DOUBLE_HEIGHT));
  add(twoCol('TOTAL:', `$${data.total.toFixed(2)}`, width));
  add(bytes(CMD.NORMAL_SIZE, CMD.BOLD_OFF));

  add(separator(width));

  // Payment
  add(twoCol('Método de pago:', data.payMethod === 'efectivo' ? 'Efectivo' : 'Tarjeta', width));
  if (data.payMethod === 'efectivo' && data.amountPaid !== undefined) {
    add(twoCol('Efectivo recibido:', `$${data.amountPaid.toFixed(2)}`, width));
    if (data.change !== undefined && data.change > 0) {
      add(bytes(CMD.BOLD_ON));
      add(twoCol('Cambio:', `$${data.change.toFixed(2)}`, width));
      add(bytes(CMD.BOLD_OFF));
    }
  }

  // Footer
  add(bytes(CMD.ALIGN_CENTER));
  add(bytes(CMD.LF));
  add(encode((data.footer || 'Gracias por su visita') + '\n'));
  add(encode('* * *\n'));
  add(bytes(CMD.LF, CMD.LF, CMD.LF));

  // Cut
  if (data.autoCut !== false) {
    add(bytes(CMD.PARTIAL_CUT));
  }

  // Merge all chunks
  const total = chunks.reduce((s, c) => s + c.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

export function buildTestTicket(width: 58 | 80 = 80): Uint8Array {
  return buildTicket({
    restaurantName: 'PRUEBA DE IMPRESORA',
    branchName: 'SistemaRest',
    orderNumber: 'TEST-001',
    mesa: 'Mesa 1',
    mesero: 'Administrador',
    items: [
      { name: 'Tacos de carne', qty: 2, price: 85 },
      { name: 'Agua de jamaica', qty: 1, price: 35 },
      { name: 'Quesadillas', qty: 1, price: 65 },
    ],
    subtotal: 270,
    iva: 43.2,
    discount: 0,
    total: 313.2,
    payMethod: 'efectivo',
    amountPaid: 350,
    change: 36.8,
    footer: '¡Impresora configurada correctamente!',
    paperWidth: width,
    autoCut: true,
    copies: 1,
  });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface PrinterDevice {
  vendorId: number;
  productId: number;
  name: string;
  raw: USBDevice;
}

export function usePrinter() {
  const [status, setStatus] = useState<PrinterStatus>('disconnected');
  const [device, setDevice] = useState<PrinterDevice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);
  const deviceRef = useRef<USBDevice | null>(null);

  useEffect(() => {
    setSupported(typeof navigator !== 'undefined' && 'usb' in navigator);

    // Auto-reconnect to previously paired device
    if (typeof navigator !== 'undefined' && 'usb' in navigator) {
      try {
        navigator.usb.getDevices().then(async (devices) => {
          if (devices.length > 0) {
            try {
              await openDevice(devices[0]);
            } catch { /* silent */ }
          }
        }).catch(() => { /* USB access denied by permissions policy */ });
      } catch { /* USB access denied by permissions policy */ }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openDevice(raw: USBDevice) {
    await raw.open();
    if (raw.configuration === null) {
      await raw.selectConfiguration(1);
    }
    // Find the printer interface (class 7 = printer, or first available)
    const iface = raw.configuration?.interfaces.find(
      (i) => i.alternates[0]?.interfaceClass === 7
    ) ?? raw.configuration?.interfaces[0];

    if (!iface) throw new Error('No se encontró interfaz de impresora en el dispositivo');

    await raw.claimInterface(iface.interfaceNumber);
    deviceRef.current = raw;

    setDevice({
      vendorId: raw.vendorId,
      productId: raw.productId,
      name: raw.productName || `USB ${raw.vendorId.toString(16)}:${raw.productId.toString(16)}`,
      raw,
    });
    setStatus('connected');
    setError(null);
  }

  const connect = useCallback(async () => {
    if (!supported) {
      setError('WebUSB no está disponible. Usa Chrome o Edge.');
      return false;
    }
    setStatus('connecting');
    setError(null);
    try {
      // Show browser device picker — common thermal printer vendors
      const raw = await navigator.usb.requestDevice({
        filters: [
          { classCode: 7 },          // Printer class
          { vendorId: 0x04b8 },      // Epson
          { vendorId: 0x0519 },      // Star Micronics
          { vendorId: 0x154f },      // SNBC
          { vendorId: 0x1fc9 },      // Bixolon
          { vendorId: 0x0dd4 },      // Custom / Generic
          { vendorId: 0x067b },      // Generic USB thermal
          { vendorId: 0x0416 },      // Winbond (common generic)
          { vendorId: 0x20d1 },      // HPRT
        ],
      });
      await openDevice(raw);
      return true;
    } catch (err: any) {
      if (err?.name !== 'NotFoundError') {
        setError(err?.message || 'Error al conectar');
        setStatus('error');
      } else {
        setStatus('disconnected');
      }
      return false;
    }
  }, [supported]);

  const disconnect = useCallback(async () => {
    if (deviceRef.current) {
      try { await deviceRef.current.close(); } catch { /* ignore */ }
      deviceRef.current = null;
    }
    setDevice(null);
    setStatus('disconnected');
    setError(null);
  }, []);

  const print = useCallback(async (data: Uint8Array, copies = 1): Promise<boolean> => {
    if (!deviceRef.current) {
      setError('Impresora no conectada');
      return false;
    }
    setStatus('printing');
    setError(null);
    try {
      const dev = deviceRef.current;
      // Find bulk OUT endpoint
      const iface = dev.configuration?.interfaces.find(
        (i) => i.alternates[0]?.interfaceClass === 7
      ) ?? dev.configuration?.interfaces[0];
      const ep = iface?.alternates[0]?.endpoints.find(
        (e) => e.direction === 'out' && e.type === 'bulk'
      );
      if (!ep) throw new Error('No se encontró endpoint de impresión');

      for (let i = 0; i < copies; i++) {
        await dev.transferOut(ep.endpointNumber, data);
        if (copies > 1 && i < copies - 1) {
          await new Promise(r => setTimeout(r, 300));
        }
      }
      setStatus('connected');
      return true;
    } catch (err: any) {
      setError(err?.message || 'Error al imprimir');
      setStatus('error');
      // Try to recover connection
      setTimeout(() => setStatus('connected'), 3000);
      return false;
    }
  }, []);

  const printTicket = useCallback(async (ticketData: TicketData): Promise<boolean> => {
    const payload = buildTicket(ticketData);
    return print(payload, ticketData.copies ?? 1);
  }, [print]);

  const printTest = useCallback(async (paperWidth: 58 | 80 = 80): Promise<boolean> => {
    const payload = buildTestTicket(paperWidth);
    return print(payload);
  }, [print]);

  return {
    status,
    device,
    error,
    supported,
    connect,
    disconnect,
    print,
    printTicket,
    printTest,
  };
}
