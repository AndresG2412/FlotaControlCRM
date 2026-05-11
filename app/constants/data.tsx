import { LayoutDashboard,Users,MapPin,BarChart3,Settings,Route,ClipboardList,DollarSign,Receipt,Bell,History,MessageSquare,ShieldCheck,Bus,} from 'lucide-react';

export type NavItem = {
    label: string;
    href: string;
    icon: React.ReactNode;
};


export interface Buseta {
    Empresa: string;
    Placa: string;
    Modelo: string;
    Numero_Buseta: string;
    Motor: string;
    Puestos: number;
    Dueño: string;
    Numero_Personal: number;
    Aceite: string;
}

export const ADMIN_NAV_ITEMS: NavItem[] = [
    { label: 'Panel Principal',    href: '/admin',                icon: <LayoutDashboard   size={18} /> },
    { label: 'Mantenimientos',       href: '/admin/mantenimientos', icon: <ClipboardList     size={18} /> },
    // { label: 'Conductores',        href: '/admin/conductores',    icon: <Users             size={18} /> },
    // { label: 'Viajes',             href: '/admin/viajes',         icon: <MapPin            size={18} /> },
    // { label: 'Mantenimiento',      href: '/admin/mantenimiento',  icon: <BarChart3         size={18} /> }, // Cambio de "Repuestos" a Mantenimiento (Módulo 1)
    // { label: 'Gastos Fijos',       href: '/admin/gastos-admin',   icon: <Receipt           size={18} /> }, // SOAT, Seguros, Nómina (Módulo 3)
    // { label: 'Recordatorios',      href: '/admin/recordatorios',  icon: <Bell              size={18} /> }, // Vencimientos (Módulo 5)
    // { label: 'Historial',          href: '/admin/historial',      icon: <History           size={18} /> }, // Hoja de vida del bus (Módulo 6)
    // { label: 'Configuración',      href: '/admin/config',         icon: <Settings          size={18} /> },
];

export const DRIVER_NAV_ITEMS: NavItem[] = [
    { label: 'Inicio',               href: '/driver',               icon: <LayoutDashboard   size={18} /> },
    { label: 'Nuevo Viaje',          href: '/driver/ruta',          icon: <Route             size={18} /> },
    { label: 'Mantenimientos',       href: '/driver/mantenimiento', icon: <ClipboardList     size={18} /> },
    { label: 'Datos Generales',      href: '/driver/informacion',      icon: <Bus               size={18} /> },
    // { label: 'Extras / Gastos',      href: '/driver/extras',        icon: <DollarSign      size={18} /> },
    // { label: 'Avisos',               href: '/driver/avisos',        icon: <MessageSquare   size={18} /> }, // Mensajes del Admin (Módulo 5)
    // { label: 'Mis Reportes',         href: '/driver/historial',     icon: <History         size={18} /> }, // Ver si le aprobaron o devolvieron algo
];

export const TERMINALES: string[] = [
    'Popayan', 'Pitalito', 'Cali', 'Florencia', 'Neiva', 'Puerto Rico',
];

export const MANTENIMIENTOS_TIPOS: string[] = [
    'Frenos', 'Aceite', 'Electrico', 'Neumaticos', 'Amortiguadores', 
    'Refrigeracion', 'Direccion', 'General', 'Motor', 'Otros',
];

// Cambiamos NavItem por Buseta para que coincidan las propiedades
export const BUSETA_DATOS: Buseta = {
    Empresa: 'Gaitana',
    Placa: 'WFV990',
    Modelo: '2015',
    Numero_Buseta: '7900',
    Motor: 'NKR',
    Puestos: 18,
    Dueño: 'Andres Camilo Gaviria Bolaños',
    Numero_Personal: 3157870130,
    Aceite: '20W50 Mobil',
};