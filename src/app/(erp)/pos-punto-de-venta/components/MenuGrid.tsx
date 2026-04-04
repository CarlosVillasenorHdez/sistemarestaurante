'use client';

import React, { useState } from 'react';
import { Search, Star, Plus, Check, UtensilsCrossed } from 'lucide-react';
import { MenuItem, OrderItem, Table } from './POSClient';

interface MenuGridProps {
  items: MenuItem[];
  onAddItem: (item: MenuItem) => void;
  orderItems: OrderItem[];
  selectedTable: Table | null;
}

const categories = ['Todos', 'Entradas', 'Platos Fuertes', 'Postres', 'Bebidas', 'Extras'];

const categoryColors: Record<string, { bg: string; color: string }> = {
  Entradas: { bg: '#fef3c7', color: '#92400e' },
  'Platos Fuertes': { bg: '#fee2e2', color: '#991b1b' },
  Postres: { bg: '#fce7f3', color: '#9d174d' },
  Bebidas: { bg: '#dbeafe', color: '#1e40af' },
  Extras: { bg: '#f3f4f6', color: '#374151' },
};

export default function MenuGrid({ items, onAddItem, orderItems, selectedTable }: MenuGridProps) {
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [search, setSearch] = useState('');

  const filtered = items.filter((item) => {
    const matchCat = activeCategory === 'Todos' || item.category === activeCategory;
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase()) || item.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const getQtyInOrder = (itemId: string) => {
    const found = orderItems.find((o) => o.menuItem.id === itemId);
    return found ? found.quantity : 0;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search + Category filter */}
      <div className="px-4 py-3 bg-white border-b flex flex-col gap-2 flex-shrink-0" style={{ borderColor: '#f3f4f6' }}>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Buscar platillo..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-8 py-2 text-sm" />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin pb-1">
          {categories.map((cat) => (
            <button key={cat} onClick={() => setActiveCategory(cat)} className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150" style={{ backgroundColor: activeCategory === cat ? '#1B3A6B' : '#f3f4f6', color: activeCategory === cat ? 'white' : '#6b7280' }}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {!selectedTable && (
        <div className="mx-4 mt-4 px-4 py-3 rounded-xl flex items-center gap-3 text-sm" style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}>
          <span className="text-amber-600">⚠️</span>
          <span className="text-amber-800 font-medium">Selecciona una mesa del mapa para comenzar a tomar una orden.</span>
        </div>
      )}

      {/* Menu grid */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center gap-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#f3f4f6' }}>
              <UtensilsCrossed size={24} className="text-gray-300" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-1">No hay platillos disponibles</p>
              <p className="text-xs text-gray-400">Agrega platillos desde el módulo de Menú para verlos aquí.</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <span className="text-3xl mb-2">🍽️</span>
            <p className="text-sm font-semibold text-gray-700">No se encontraron platillos</p>
            <p className="text-xs text-gray-400 mt-1">Intenta con otra búsqueda o categoría</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-3">
            {filtered.map((item) => {
              const qty = getQtyInOrder(item.id);
              const catColors = categoryColors[item.category] || { bg: '#f3f4f6', color: '#374151' };
              const isInOrder = qty > 0;
              return (
                <div
                  key={item.id}
                  className={`menu-item-card ${!item.available ? 'unavailable' : ''}`}
                  onClick={() => item.available && selectedTable && onAddItem(item)}
                  style={{ outline: isInOrder ? '2px solid #f59e0b' : undefined }}
                >
                  <div className="flex items-center justify-center text-3xl py-4 relative" style={{ backgroundColor: catColors.bg }}>
                    {item.emoji}
                    {item.popular && (
                      <div className="absolute top-2 right-2">
                        <Star size={12} className="text-amber-500 fill-amber-500" />
                      </div>
                    )}
                  </div>
                  <div className="p-3 relative">
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold mb-1.5 inline-block" style={{ backgroundColor: catColors.bg, color: catColors.color, fontSize: '10px' }}>{item.category}</span>
                    <p className="text-sm font-semibold text-gray-900 leading-tight mb-1">{item.name}</p>
                    <p className="text-xs text-gray-400 leading-tight mb-2 line-clamp-2">{item.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-gray-900">${item.price}</span>
                      {!item.available ? (
                        <span className="text-xs text-red-400 font-medium">No disponible</span>
                      ) : isInOrder ? (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold" style={{ backgroundColor: '#f59e0b', color: '#1B3A6B' }}>
                          <Check size={10} />{qty}
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors" style={{ backgroundColor: '#f3f4f6' }}>
                          <Plus size={14} className="text-gray-600" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}