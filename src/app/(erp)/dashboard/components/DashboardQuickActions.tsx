'use client';

import React from 'react';
import Link from 'next/link';
import { ShoppingCart, LayoutGrid, Plus, FileText } from 'lucide-react';

export default function DashboardQuickActions() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Link href="/pos-punto-de-venta">
        <button className="btn-primary flex items-center gap-2">
          <ShoppingCart size={16} />
          Abrir POS
        </button>
      </Link>
      <Link href="/pos-punto-de-venta">
        <button className="btn-secondary flex items-center gap-2">
          <LayoutGrid size={16} />
          Ver Mesas
        </button>
      </Link>
      <Link href="/orders-management">
        <button className="btn-secondary flex items-center gap-2">
          <FileText size={16} />
          Órdenes Abiertas
        </button>
      </Link>
      <button className="btn-secondary flex items-center gap-2">
        <Plus size={16} />
        Nueva Orden
      </button>
    </div>
  );
}