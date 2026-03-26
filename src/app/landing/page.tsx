'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ShoppingCart, BarChart3, Users, Package, Calendar, Truck, Star, Building2, CheckCircle, ArrowRight, Menu, X, Mail, MessageSquare, Zap, Shield, Clock, ChefHat } from 'lucide-react';
import { toast } from 'sonner';

const PLANS = [
  {
    id: 'basico',
    name: 'Básico',
    price: '$799',
    period: '/mes',
    description: 'Ideal para restaurantes pequeños que inician su digitalización',
    color: '#6b7280',
    features: [
      'Punto de Venta (POS)',
      'Gestión de menú',
      'Hasta 10 mesas',
      'Reportes básicos',
      'Soporte por email',
      '1 usuario',
    ],
    notIncluded: ['Multi-sucursal', 'Reservaciones', 'Delivery', 'Programa de lealtad'],
  },
  {
    id: 'profesional',
    name: 'Profesional',
    price: '$1,499',
    period: '/mes',
    description: 'Para restaurantes en crecimiento que necesitan más control',
    color: '#1B3A6B',
    popular: true,
    features: [
      'Todo lo del plan Básico',
      'Módulo de cocina (KDS)',
      'Reservaciones con calendario',
      'Programa de lealtad',
      'Reportes avanzados',
      'Hasta 5 usuarios',
      'Soporte prioritario',
    ],
    notIncluded: ['Multi-sucursal', 'Integración delivery'],
  },
  {
    id: 'empresarial',
    name: 'Empresarial',
    price: '$2,999',
    period: '/mes',
    description: 'Para cadenas y restaurantes con múltiples sucursales',
    color: '#f59e0b',
    features: [
      'Todo lo del plan Profesional',
      'Multi-sucursal ilimitado',
      'Integración Uber Eats / Rappi',
      'Panel consolidado',
      'Usuarios ilimitados',
      'API personalizada',
      'Soporte 24/7',
      'Onboarding dedicado',
    ],
    notIncluded: [],
  },
];

const FEATURES = [
  { icon: ShoppingCart, title: 'Punto de Venta', desc: 'POS intuitivo con gestión de mesas, órdenes y pagos en tiempo real.' },
  { icon: ChefHat, title: 'Cocina Digital (KDS)', desc: 'Pantalla de cocina con flujo de órdenes y tiempos de preparación.' },
  { icon: Calendar, title: 'Reservaciones', desc: 'Calendario nativo con confirmación automática por correo y lista de espera.' },
  { icon: Truck, title: 'Delivery Integrado', desc: 'Recibe pedidos de Uber Eats y Rappi directamente en tu cocina.' },
  { icon: BarChart3, title: 'Reportes Avanzados', desc: 'Tendencias de ventas, ticket promedio por mesero y alertas de inventario.' },
  { icon: Star, title: 'Programa de Lealtad', desc: 'Acumula y canjea puntos en caja para fidelizar a tus clientes.' },
  { icon: Building2, title: 'Multi-Sucursal', desc: 'Administra todas tus sucursales desde un panel centralizado.' },
  { icon: Package, title: 'Inventario Inteligente', desc: 'Control de stock con alertas automáticas y movimientos en tiempo real.' },
];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoForm, setDemoForm] = useState({
    restaurantName: '', contactName: '', email: '', phone: '', plan: 'profesional', message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoForm.restaurantName || !demoForm.contactName || !demoForm.email) {
      toast.error('Por favor completa los campos obligatorios');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/demo-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(demoForm),
      });
      if (!res.ok) throw new Error('Error al enviar');
      setSubmitted(true);
      toast.success('¡Solicitud enviada! Te contactaremos pronto.');
    } catch {
      toast.error('Error al enviar la solicitud. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#1B3A6B' }}>
                <ChefHat size={18} className="text-white" />
              </div>
              <span className="font-bold text-lg" style={{ color: '#1B3A6B' }}>SistemaRest</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              {['Funcionalidades', 'Precios', 'Demo'].map(item => (
                <a key={item} href={`#${item.toLowerCase()}`} className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  {item}
                </a>
              ))}
            </div>
            <div className="hidden md:flex items-center gap-3">
              <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">Iniciar sesión</Link>
              <a href="#demo" className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors hover:opacity-90" style={{ backgroundColor: '#f59e0b' }}>
                Solicitar Demo
              </a>
            </div>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 rounded-lg hover:bg-gray-100">
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-3">
            {['Funcionalidades', 'Precios', 'Demo'].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`} onClick={() => setMobileMenuOpen(false)} className="block text-sm text-gray-600 py-2">
                {item}
              </a>
            ))}
            <Link href="/login" className="block text-sm font-medium text-gray-600 py-2">Iniciar sesión</Link>
            <a href="#demo" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2 rounded-lg text-sm font-medium text-white text-center" style={{ backgroundColor: '#f59e0b' }}>
              Solicitar Demo
            </a>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f1e38 0%, #1B3A6B 60%, #243f72 100%)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6" style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
              <Zap size={14} /> Sistema POS para restaurantes mexicanos
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Administra tu restaurante{' '}
              <span style={{ color: '#f59e0b' }}>de forma inteligente</span>
            </h1>
            <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
              Sistema completo de gestión para restaurantes: POS, cocina, inventario, reservaciones, delivery y más. Todo en español, desde México.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="#demo" className="px-8 py-4 rounded-xl text-base font-semibold text-white transition-all hover:opacity-90 flex items-center justify-center gap-2" style={{ backgroundColor: '#f59e0b' }}>
                Solicitar Demo Gratis <ArrowRight size={18} />
              </a>
              <Link href="/login" className="px-8 py-4 rounded-xl text-base font-semibold text-white border border-white/20 hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                Ver el Sistema
              </Link>
            </div>
            <div className="flex items-center justify-center gap-6 mt-10 text-sm text-gray-400">
              {['Sin contrato de permanencia', 'Soporte en español', 'Configuración en 10 min'].map(t => (
                <span key={t} className="flex items-center gap-1.5">
                  <CheckCircle size={14} className="text-green-400" /> {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="funcionalidades" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Todo lo que necesita tu restaurante</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">Una plataforma completa diseñada específicamente para restaurantes mexicanos.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map(f => (
              <div key={f.title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: '#1B3A6B15' }}>
                  <f.icon size={24} style={{ color: '#1B3A6B' }} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="precios" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Planes y Precios</h2>
            <p className="text-gray-500">Elige el plan que mejor se adapte a tu negocio. Sin costos ocultos.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {PLANS.map(plan => (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-8 border-2 transition-all ${plan.popular ? 'shadow-xl scale-105' : 'shadow-sm'}`}
                style={{ borderColor: plan.popular ? plan.color : '#e5e7eb', backgroundColor: plan.popular ? '#0f1e38' : 'white' }}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white" style={{ backgroundColor: '#f59e0b' }}>
                    MÁS POPULAR
                  </div>
                )}
                <div className="mb-6">
                  <h3 className={`text-xl font-bold mb-1 ${plan.popular ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
                  <p className={`text-sm mb-4 ${plan.popular ? 'text-gray-300' : 'text-gray-500'}`}>{plan.description}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold" style={{ color: plan.color }}>{plan.price}</span>
                    <span className={`text-sm ${plan.popular ? 'text-gray-400' : 'text-gray-500'}`}>{plan.period}</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle size={16} style={{ color: plan.color, flexShrink: 0 }} />
                      <span className={plan.popular ? 'text-gray-200' : 'text-gray-700'}>{f}</span>
                    </li>
                  ))}
                  {plan.notIncluded.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm opacity-40">
                      <X size={16} className="flex-shrink-0" style={{ color: plan.popular ? 'white' : 'gray' }} />
                      <span className={plan.popular ? 'text-gray-400' : 'text-gray-400'}>{f}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href="#demo"
                  className="block w-full py-3 rounded-xl text-sm font-semibold text-center transition-all hover:opacity-90"
                  style={{
                    backgroundColor: plan.popular ? '#f59e0b' : plan.color,
                    color: plan.popular ? '#1B3A6B' : 'white',
                  }}
                >
                  Solicitar Demo
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust badges */}
      <section className="py-12 bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { icon: Shield, label: 'Datos seguros', sub: 'Cifrado SSL' },
              { icon: Clock, label: 'Disponibilidad', sub: '99.9% uptime' },
              { icon: Users, label: 'Restaurantes', sub: 'Confianza comprobada' },
              { icon: MessageSquare, label: 'Soporte', sub: 'En español' },
            ].map(b => (
              <div key={b.label} className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#1B3A6B15' }}>
                  <b.icon size={22} style={{ color: '#1B3A6B' }} />
                </div>
                <p className="font-semibold text-gray-800 text-sm">{b.label}</p>
                <p className="text-xs text-gray-500">{b.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Form */}
      <section id="demo" className="py-20 bg-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Solicita tu Demo Gratuita</h2>
            <p className="text-gray-500">Nuestro equipo te contactará en menos de 24 horas para agendar una demostración personalizada.</p>
          </div>
          {submitted ? (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
              <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">¡Solicitud recibida!</h3>
              <p className="text-gray-600">Te contactaremos pronto para agendar tu demo personalizada.</p>
            </div>
          ) : (
            <form onSubmit={handleDemoSubmit} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nombre del Restaurante *</label>
                  <input type="text" value={demoForm.restaurantName} onChange={e => setDemoForm({ ...demoForm, restaurantName: e.target.value })} required className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" placeholder="Mi Restaurante" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tu Nombre *</label>
                  <input type="text" value={demoForm.contactName} onChange={e => setDemoForm({ ...demoForm, contactName: e.target.value })} required className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" placeholder="Juan García" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
                  <input type="email" value={demoForm.email} onChange={e => setDemoForm({ ...demoForm, email: e.target.value })} required className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" placeholder="juan@restaurante.com" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
                  <input type="tel" value={demoForm.phone} onChange={e => setDemoForm({ ...demoForm, phone: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" placeholder="555-0001" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Plan de Interés</label>
                <select value={demoForm.plan} onChange={e => setDemoForm({ ...demoForm, plan: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
                  <option value="basico">Básico — $799/mes</option>
                  <option value="profesional">Profesional — $1,499/mes</option>
                  <option value="empresarial">Empresarial — $2,999/mes</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Mensaje (opcional)</label>
                <textarea value={demoForm.message} onChange={e => setDemoForm({ ...demoForm, message: e.target.value })} rows={3} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" placeholder="Cuéntanos sobre tu restaurante..." />
              </div>
              <button type="submit" disabled={submitting} className="w-full py-3.5 rounded-xl text-base font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2" style={{ backgroundColor: '#f59e0b' }}>
                {submitting ? 'Enviando...' : <><Mail size={18} /> Solicitar Demo Gratis</>}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t border-gray-100" style={{ backgroundColor: '#0f1e38' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#f59e0b' }}>
              <ChefHat size={16} className="text-white" />
            </div>
            <span className="font-bold text-white">SistemaRest</span>
          </div>
          <p className="text-sm text-gray-400">© {new Date().getFullYear()} SistemaRest. Hecho en México 🇲🇽</p>
          <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">Acceso al sistema</Link>
        </div>
      </footer>
    </div>
  );
}
