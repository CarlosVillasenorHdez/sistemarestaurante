/**
 * (erp)/layout.tsx
 *
 * Pass-through layout for the ERP route group.
 *
 * Each ERP page already wraps its content in <AppLayout> directly,
 * so this layout only needs to render children. It keeps the door
 * open for migrating to a shared layout later without changing URLs.
 */
export default function ErpGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
