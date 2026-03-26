import React from 'react';
import POSClient from './components/POSClient';

// Backend: this page should be server-protected by role (cajero, mesero, admin, gerente)
export default function POSPage() {
  return <POSClient />;
}