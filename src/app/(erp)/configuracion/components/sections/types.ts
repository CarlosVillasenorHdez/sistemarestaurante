// Shared types for Configuracion sub-components
// Auto-extracted from ConfiguracionManagement.tsx

export interface BusinessHours {
  day: string;
  dayLabel: string;
  open: boolean;
  from: string;
  to: string;
}

export interface PrinterConfig {
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

// ─── Layout Types ─────────────────────────────────────────────────────────────

export type ElementType = 'mesa' | 'pared' | 'bano' | 'barra' | 'entrada' | 'ventana' | 'decoracion';

export interface LayoutTable {
  id: string;
  number: number;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  shape: 'rect' | 'round';
  capacity: number;
  elementType?: ElementType; // undefined = 'mesa' (backwards compat)
  color?: string;            // custom color override
}

export const ELEMENT_TYPES: { type: ElementType; label: string; emoji: string; color: string; defaultW: number; defaultH: number }[] = [
  { type: 'mesa',       label: 'Mesa',       emoji: '🪑', color: '#1B3A6B', defaultW: 1, defaultH: 1 },
  { type: 'pared',      label: 'Pared',      emoji: '🧱', color: '#6b7280', defaultW: 3, defaultH: 1 },
  { type: 'bano',       label: 'Baño',       emoji: '🚻', color: '#0ea5e9', defaultW: 1, defaultH: 2 },
  { type: 'barra',      label: 'Barra',      emoji: '🍺', color: '#92400e', defaultW: 3, defaultH: 1 },
  { type: 'entrada',    label: 'Entrada',    emoji: '🚪', color: '#10b981', defaultW: 1, defaultH: 1 },
  { type: 'ventana',    label: 'Ventana',    emoji: '🪟', color: '#38bdf8', defaultW: 2, defaultH: 1 },
  { type: 'decoracion', label: 'Decoración', emoji: '🌿', color: '#84cc16', defaultW: 1, defaultH: 1 },
];


// Country → currency mapping for quick autocomplete
export const COUNTRY_CURRENCY: { name: string; flag: string; symbol: string; code: string; locale: string }[] = [
  { name: 'México',         flag: '🇲🇽', symbol: '$',  code: 'MXN', locale: 'es-MX' },
  { name: 'España',         flag: '🇪🇸', symbol: '€',  code: 'EUR', locale: 'es-ES' },
  { name: 'Estados Unidos', flag: '🇺🇸', symbol: '$',  code: 'USD', locale: 'en-US' },
  { name: 'Argentina',      flag: '🇦🇷', symbol: '$',  code: 'ARS', locale: 'es-AR' },
  { name: 'Colombia',       flag: '🇨🇴', symbol: '$',  code: 'COP', locale: 'es-CO' },
  { name: 'Chile',          flag: '🇨🇱', symbol: '$',  code: 'CLP', locale: 'es-CL' },
  { name: 'Perú',           flag: '🇵🇪', symbol: 'S/', code: 'PEN', locale: 'es-PE' },
  { name: 'Guatemala',      flag: '🇬🇹', symbol: 'Q',  code: 'GTQ', locale: 'es-GT' },
  { name: 'Costa Rica',     flag: '🇨🇷', symbol: '₡',  code: 'CRC', locale: 'es-CR' },
  { name: 'Uruguay',        flag: '🇺🇾', symbol: '$',  code: 'UYU', locale: 'es-UY' },
  { name: 'Ecuador',        flag: '🇪🇨', symbol: '$',  code: 'USD', locale: 'es-EC' },
  { name: 'Venezuela',      flag: '🇻🇪', symbol: 'Bs', code: 'VES', locale: 'es-VE' },
  { name: 'Bolivia',        flag: '🇧🇴', symbol: 'Bs', code: 'BOB', locale: 'es-BO' },
  { name: 'Paraguay',       flag: '🇵🇾', symbol: '₲',  code: 'PYG', locale: 'es-PY' },
  { name: 'República Dom.', flag: '🇩🇴', symbol: '$',  code: 'DOP', locale: 'es-DO' },
  { name: 'Honduras',       flag: '🇭🇳', symbol: 'L',  code: 'HNL', locale: 'es-HN' },
  { name: 'El Salvador',    flag: '🇸🇻', symbol: '$',  code: 'USD', locale: 'es-SV' },
  { name: 'Nicaragua',      flag: '🇳🇮', symbol: 'C$', code: 'NIO', locale: 'es-NI' },
  { name: 'Panamá',         flag: '🇵🇦', symbol: 'B/', code: 'PAB', locale: 'es-PA' },
  { name: 'Cuba',           flag: '🇨🇺', symbol: '$',  code: 'CUP', locale: 'es-CU' },
  { name: 'Brasil',         flag: '🇧🇷', symbol: 'R$', code: 'BRL', locale: 'pt-BR' },
  { name: 'Reino Unido',    flag: '🇬🇧', symbol: '£',  code: 'GBP', locale: 'en-GB' },
  { name: 'Francia',        flag: '🇫🇷', symbol: '€',  code: 'EUR', locale: 'fr-FR' },
  { name: 'Alemania',       flag: '🇩🇪', symbol: '€',  code: 'EUR', locale: 'de-DE' },
  { name: 'Italia',         flag: '🇮🇹', symbol: '€',  code: 'EUR', locale: 'it-IT' },
  { name: 'Canadá',         flag: '🇨🇦', symbol: '$',  code: 'CAD', locale: 'en-CA' },
  { name: 'Australia',      flag: '🇦🇺', symbol: '$',  code: 'AUD', locale: 'en-AU' },
  { name: 'Japón',          flag: '🇯🇵', symbol: '¥',  code: 'JPY', locale: 'ja-JP' },
];
