import {
    LayoutDashboard,
    Users,
    MapPin,
    BarChart3,
    Settings,
    Route,
    ClipboardList,
    DollarSign,
    Receipt,
    Bell,
    History,
    MessageSquare,
    ShieldCheck,
    Bus,
} from 'lucide-react';

export type NavItem = {
    label: string;
    href: string;
    icon: React.ReactNode;
};
  


export const ADMIN_NAV_ITEMS: NavItem[] = [
    { label: 'Panel Principal',    href: '/admin',                icon: <LayoutDashboard   size={18} /> },
    { label: 'Revisiones',         href: '/admin/auditoria',      icon: <ShieldCheck       size={18} /> }, // Para aprobar/devolver reportes (Módulo 7)
    { label: 'Conductores',        href: '/admin/conductores',    icon: <Users             size={18} /> },
    { label: 'Viajes',             href: '/admin/viajes',         icon: <MapPin            size={18} /> },
    { label: 'Mantenimiento',      href: '/admin/mantenimiento',  icon: <BarChart3         size={18} /> }, // Cambio de "Repuestos" a Mantenimiento (Módulo 1)
    { label: 'Gastos Fijos',       href: '/admin/gastos-admin',   icon: <Receipt           size={18} /> }, // SOAT, Seguros, Nómina (Módulo 3)
    { label: 'Recordatorios',      href: '/admin/recordatorios',  icon: <Bell              size={18} /> }, // Vencimientos (Módulo 5)
    { label: 'Historial',          href: '/admin/historial',      icon: <History           size={18} /> }, // Hoja de vida del bus (Módulo 6)
    { label: 'Configuración',      href: '/admin/config',         icon: <Settings          size={18} /> },
];

export const DRIVER_NAV_ITEMS: NavItem[] = [
    { label: 'Inicio',               href: '/driver',               icon: <LayoutDashboard   size={18} /> },
    { label: 'Nuevo Viaje',          href: '/driver/ruta',          icon: <Route             size={18} /> },
    { label: 'Mantenimientos',       href: '/driver/mantenimiento', icon: <ClipboardList     size={18} /> },
    { label: 'Datos Generales',      href: '/driver/vehiculo',      icon: <Bus               size={18} /> },
    // { label: 'Extras / Gastos',      href: '/driver/extras',        icon: <DollarSign      size={18} /> },
    // { label: 'Avisos',               href: '/driver/avisos',        icon: <MessageSquare   size={18} /> }, // Mensajes del Admin (Módulo 5)
    // { label: 'Mis Reportes',         href: '/driver/historial',     icon: <History         size={18} /> }, // Ver si le aprobaron o devolvieron algo
];

export const TERMINALES: string[] = [
    'Popayan',
    'Pitalito',
    'Cali',
    'Florencia'
]