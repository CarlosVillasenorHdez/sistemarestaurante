'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { CheckCircle, ChevronRight, ChevronLeft, UtensilsCrossed, LayoutGrid, Users, Rocket, Plus, Trash2 } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


interface Step {
  id: number;
  title: string;
  description: string;
  icon: React.ElementType;
}

const STEPS: Step[] = [
  { id: 1, title: 'Bienvenida', description: 'Configura los datos básicos de tu restaurante', icon: Rocket },
  { id: 2, title: 'Menú', description: 'Agrega tus primeros platillos', icon: UtensilsCrossed },
  { id: 3, title: 'Mesas', description: 'Configura el número de mesas', icon: LayoutGrid },
  { id: 4, title: 'Empleados', description: 'Registra a tu equipo de trabajo', icon: Users },
  { id: 5, title: '¡Listo!', description: 'Tu restaurante está configurado', icon: CheckCircle },
];

const DISH_CATEGORIES = ['Entradas', 'Platos Fuertes', 'Postres', 'Bebidas', 'Extras'];
const EMPLOYEE_ROLES = ['Gerente', 'Cajero', 'Mesero', 'Cocinero', 'Ayudante de Cocina', 'Repartidor'];

export default function OnboardingFlow() {
  const supabase = createClient();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1 data
  const [restaurantName, setRestaurantName] = useState('');
  const [restaurantPhone, setRestaurantPhone] = useState('');

  // Step 2 data
  const [dishes, setDishes] = useState([
    { name: '', price: '', category: 'Platos Fuertes', emoji: '🍽️' },
  ]);

  // Step 3 data
  const [tableCount, setTableCount] = useState(5);
  const [tableCapacity, setTableCapacity] = useState(4);

  // Step 4 data
  const [employees, setEmployees] = useState([
    { name: '', role: 'Mesero', phone: '' },
  ]);

  const addDish = () => setDishes([...dishes, { name: '', price: '', category: 'Platos Fuertes', emoji: '🍽️' }]);
  const removeDish = (i: number) => setDishes(dishes.filter((_, idx) => idx !== i));
  const updateDish = (i: number, field: string, value: string) => {
    const d = [...dishes]; d[i] = { ...d[i], [field]: value }; setDishes(d);
  };

  const addEmployee = () => setEmployees([...employees, { name: '', role: 'Mesero', phone: '' }]);
  const removeEmployee = (i: number) => setEmployees(employees.filter((_, idx) => idx !== i));
  const updateEmployee = (i: number, field: string, value: string) => {
    const e = [...employees]; e[i] = { ...e[i], [field]: value }; setEmployees(e);
  };

  const handleNext = async () => {
    if (currentStep === 1 && !restaurantName.trim()) {
      toast.error('Ingresa el nombre de tu restaurante');
      return;
    }
    if (currentStep === 4) {
      await handleSaveAll();
      return;
    }
    setCurrentStep(s => s + 1);
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      // Save restaurant name to system_config
      if (restaurantName.trim()) {
        await supabase.from('system_config').upsert({
          config_key: 'restaurant_name',
          config_value: restaurantName.trim(),
          description: 'Nombre del restaurante',
        }, { onConflict: 'config_key' });
      }

      // Save dishes
      const validDishes = dishes.filter(d => d.name.trim() && d.price);
      if (validDishes.length > 0) {
        await supabase.from('dishes').insert(
          validDishes.map(d => ({
            name: d.name.trim(),
            price: Number(d.price),
            category: d.category,
            emoji: d.emoji,
            available: true,
          }))
        );
      }

      // Save tables
      const tableInserts = Array.from({ length: tableCount }, (_, i) => ({
        number: i + 1,
        name: `Mesa ${i + 1}`,
        capacity: tableCapacity,
        status: 'libre',
      }));
      // Delete existing tables first
      await supabase.from('restaurant_tables').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (tableInserts.length > 0) {
        await supabase.from('restaurant_tables').insert(tableInserts);
      }

      // Save employees
      const validEmployees = employees.filter(e => e.name.trim());
      if (validEmployees.length > 0) {
        await supabase.from('employees').insert(
          validEmployees.map(e => ({
            name: e.name.trim(),
            role: e.role,
            phone: e.phone,
            status: 'activo',
          }))
        );
      }

      setCurrentStep(5);
      toast.success('¡Configuración completada!');
    } catch (err: any) {
      toast.error('Error al guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const progress = ((currentStep - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            return (
              <div key={step.id} className="flex flex-col items-center gap-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isCompleted ? 'text-white' : isCurrent ? 'text-white' : 'text-gray-400 bg-gray-100'}`}
                  style={isCompleted ? { backgroundColor: '#10b981' } : isCurrent ? { backgroundColor: '#1B3A6B' } : {}}
                >
                  {isCompleted ? <CheckCircle size={20} /> : <Icon size={20} />}
                </div>
                <span className={`text-xs hidden sm:block ${isCurrent ? 'font-medium text-gray-800' : 'text-gray-400'}`}>{step.title}</span>
              </div>
            );
          })}
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: '#1B3A6B' }} />
        </div>
      </div>

      {/* Step content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        {/* Step 1: Welcome */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Bienvenido a Aldente! 🎉</h2>
              <p className="text-gray-500">Vamos a configurar tu restaurante en pocos pasos. Empieza con los datos básicos.</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Restaurante *</label>
                <input
                  type="text"
                  value={restaurantName}
                  onChange={e => setRestaurantName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="Ej: Tacos El Güero"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono (opcional)</label>
                <input
                  type="tel"
                  value={restaurantPhone}
                  onChange={e => setRestaurantPhone(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="555-0001"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Menu */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Agrega tu Menú 🍽️</h2>
              <p className="text-gray-500">Registra tus platillos principales. Puedes agregar más desde el módulo de Menú.</p>
            </div>
            <div className="space-y-3">
              {dishes.map((dish, i) => (
                <div key={i} className="flex gap-2 items-start p-3 bg-gray-50 rounded-xl">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={dish.name}
                      onChange={e => updateDish(i, 'name', e.target.value)}
                      placeholder="Nombre del platillo"
                      className="col-span-2 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                    />
                    <input
                      type="number"
                      value={dish.price}
                      onChange={e => updateDish(i, 'price', e.target.value)}
                      placeholder="Precio $"
                      min={0}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                    />
                    <select
                      value={dish.category}
                      onChange={e => updateDish(i, 'category', e.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                    >
                      {DISH_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  {dishes.length > 1 && (
                    <button onClick={() => removeDish(i)} className="p-2 text-red-400 hover:text-red-600 mt-1">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={addDish} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium">
                <Plus size={16} /> Agregar otro platillo
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Tables */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Configura tus Mesas 🪑</h2>
              <p className="text-gray-500">Define cuántas mesas tiene tu restaurante y su capacidad promedio.</p>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Número de mesas: <span className="text-2xl font-bold" style={{ color: '#1B3A6B' }}>{tableCount}</span></label>
                <input
                  type="range"
                  min={1}
                  max={50}
                  value={tableCount}
                  onChange={e => setTableCount(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>1</span><span>25</span><span>50</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Capacidad por mesa: <span className="text-2xl font-bold" style={{ color: '#1B3A6B' }}>{tableCapacity} personas</span></label>
                <input
                  type="range"
                  min={1}
                  max={12}
                  value={tableCapacity}
                  onChange={e => setTableCapacity(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>1</span><span>6</span><span>12</span>
                </div>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
                Se crearán <strong>{tableCount} mesas</strong> con capacidad para <strong>{tableCapacity} personas</strong> cada una.
                Capacidad total: <strong>{tableCount * tableCapacity} personas</strong>.
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Employees */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Registra tu Equipo 👥</h2>
              <p className="text-gray-500">Agrega a los empleados que usarán el sistema. Puedes agregar más desde el módulo de Personal.</p>
            </div>
            <div className="space-y-3">
              {employees.map((emp, i) => (
                <div key={i} className="flex gap-2 items-start p-3 bg-gray-50 rounded-xl">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={emp.name}
                      onChange={e => updateEmployee(i, 'name', e.target.value)}
                      placeholder="Nombre completo"
                      className="col-span-2 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                    />
                    <select
                      value={emp.role}
                      onChange={e => updateEmployee(i, 'role', e.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                    >
                      {EMPLOYEE_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <input
                      type="tel"
                      value={emp.phone}
                      onChange={e => updateEmployee(i, 'phone', e.target.value)}
                      placeholder="Teléfono"
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                    />
                  </div>
                  {employees.length > 1 && (
                    <button onClick={() => removeEmployee(i)} className="p-2 text-red-400 hover:text-red-600 mt-1">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={addEmployee} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium">
                <Plus size={16} /> Agregar otro empleado
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Done */}
        {currentStep === 5 && (
          <div className="text-center space-y-6 py-4">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto" style={{ backgroundColor: '#10b98120' }}>
              <CheckCircle size={40} className="text-green-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">¡{restaurantName || 'Tu restaurante'} está listo! 🎉</h2>
              <p className="text-gray-500">Tu configuración inicial está completa. Ahora puedes empezar a usar el sistema.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label: 'Ir al Dashboard', href: '/dashboard', color: '#1B3A6B' },
                { label: 'Abrir POS', href: '/pos-punto-de-venta', color: '#f59e0b' },
                { label: 'Ver Menú', href: '/menu', color: '#10b981' },
                { label: 'Ver Mesas', href: '/configuracion', color: '#8b5cf6' },
              ].map(link => (
                <a
                  key={link.href}
                  href={link.href}
                  className="py-3 px-4 rounded-xl font-medium text-white text-center transition-all hover:opacity-90"
                  style={{ backgroundColor: link.color }}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      {currentStep < 5 && (
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => setCurrentStep(s => s - 1)}
            disabled={currentStep === 1}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} /> Anterior
          </button>
          <span className="text-sm text-gray-400">Paso {currentStep} de {STEPS.length - 1}</span>
          <button
            onClick={handleNext}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: '#1B3A6B' }}
          >
            {saving ? 'Guardando...' : currentStep === 4 ? 'Finalizar' : 'Siguiente'}
            {!saving && <ChevronRight size={16} />}
          </button>
        </div>
      )}
    </div>
  );
}