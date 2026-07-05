import { Calendar, Droplet, MapPin, Navigation, DollarSign } from "lucide-react";

interface CardViajeProps {
    viaje: any;
    onClick: () => void;
}

export default function CardViaje({ viaje, onClick }: CardViajeProps) {
    const isActivo = viaje.estado === "activo";
    
    // Format date (handle Firestore Timestamp)
    const dateStr = viaje.createdAt ? new Date(viaje.createdAt.toMillis ? viaje.createdAt.toMillis() : viaje.createdAt).toLocaleDateString() : 'N/A';

    return (
        <div 
            onClick={onClick}
            className={`cursor-pointer rounded-2xl p-5 border transition-all hover:scale-[102%] ${
                isActivo 
                ? 'bg-flota-elevated border-flota-blue shadow-[0_0_15px_rgba(59,130,246,0.15)]' 
                : 'bg-white/5 border-flota-border-focus hover:border-white/20'
            }`}
        >
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2 text-white">
                    <Navigation size={18} className={isActivo ? 'text-flota-blue' : 'text-gray-400'} />
                    <span className="font-bold text-lg">Viaje</span>
                </div>
                {isActivo ? (
                    <span className="bg-flota-blue/20 text-flota-blue px-3 py-1 rounded-full text-xs font-bold border border-flota-blue/30 animate-pulse">
                        EN CURSO
                    </span>
                ) : (
                    <span className="bg-white/10 text-gray-300 px-3 py-1 rounded-full text-xs font-semibold border border-white/10">
                        FINALIZADO
                    </span>
                )}
            </div>

            <div className="space-y-3">
                <div className="grid grid-cols-2">
                    <div className="flex items-center gap-3 text-sm text-gray-300">
                        <Calendar size={16} className="text-gray-500" />
                        <span>{dateStr}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-300">
                        <MapPin size={16} className="text-green-500" />
                        <span>Paradas: <span className="font-semibold text-white">{viaje.paradasCount}</span></span>
                    </div>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-300">
                    <Droplet size={16} className="text-amber-500" />
                    <span>Gasolina: <span className="font-semibold text-white">${viaje.Gasolina}</span></span>
                </div>
                {viaje.dineroExtra ? (
                    <div className="flex items-center gap-3 text-sm text-gray-300">
                        <DollarSign size={16} className="text-green-500" />
                        <span>Dinero Extra: <span className="font-semibold text-white">${viaje.dineroExtra}</span></span>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
