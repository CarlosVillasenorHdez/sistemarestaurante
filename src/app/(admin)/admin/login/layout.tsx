/**
 * Layout exclusivo para /admin/login
 *
 * Anula el layout del grupo (admin) para esta ruta:
 * - Sin header de administración
 * - Fondo oscuro full-screen
 * - noindex/nofollow heredado del grupo padre
 */
export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
