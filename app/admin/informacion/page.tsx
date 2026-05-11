"use client"

import { useEffect, useState } from "react";
import Navbar from "@/app/components/Navbar";
import Container from "@/app/components/Container";
import { ADMIN_NAV_ITEMS, BUSETA_DATOS } from "@/app/constants/data";
import { getInformacion, updateInformacion, CampoInformacion } from "@/firebase/informacion";
import Button from "@/app/components/Button";
import { Edit2, Save, Plus, Trash2, X } from "lucide-react";

export default function InformacionAdminPage() {
    const [campos, setCampos] = useState<CampoInformacion[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const data = await getInformacion();
            setCampos(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateInformacion(campos);
            setIsEditing(false);
        } catch (error) {
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const addField = () => {
        setCampos([...campos, { etiqueta: "Nuevo Campo", valor: "" }]);
    };

    const removeField = (index: number) => {
        const newCampos = [...campos];
        newCampos.splice(index, 1);
        setCampos(newCampos);
    };

    const updateField = (index: number, key: 'etiqueta' | 'valor', value: string) => {
        const newCampos = [...campos];
        newCampos[index][key] = value;
        setCampos(newCampos);
    };

    return (
        <div className="flex h-screen">
            <Navbar items={ADMIN_NAV_ITEMS} role="admin" />
            <Container>
                <div className="h-screen w-full flex items-center justify-center p-4">
                    <div className="border border-flota-border-focus bg-flota-surface rounded-2xl p-8 flex flex-col gap-y-6 w-full max-w-2xl shadow-xl">
                        
                        <div className="flex justify-between items-start border-b border-flota-border-focus pb-4">
                            <div>
                                <h1 className="text-4xl font-secundario tracking-wider font-bold text-white">
                                    Buseta {BUSETA_DATOS.Numero_Buseta}
                                </h1>
                                <p className="text-flota-textSecondary font-medium">
                                    {BUSETA_DATOS.Empresa} • {BUSETA_DATOS.Placa} • Modelo {BUSETA_DATOS.Modelo}
                                </p>
                            </div>
                            {!isEditing ? (
                                <button 
                                    onClick={() => setIsEditing(true)}
                                    className="p-2 hover:bg-white/5 rounded-full transition-colors text-flota-blue"
                                >
                                    <Edit2 size={24} />
                                </button>
                            ) : (
                                <button 
                                    onClick={() => { setIsEditing(false); fetchData(); }}
                                    className="p-2 hover:bg-white/5 rounded-full transition-colors text-red-400"
                                >
                                    <X size={24} />
                                </button>
                            )}
                        </div>

                        {loading ? (
                            <div className="text-center py-10 text-gray-400">Cargando información...</div>
                        ) : (
                            <div className="flex flex-col gap-y-4">
                                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                                    {campos.map((campo, index) => (
                                        <div key={index} className="group relative flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-transparent transition-all">
                                            {isEditing ? (
                                                <>
                                                    <div className="flex-1 space-y-2">
                                                        <input 
                                                            type="text"
                                                            value={campo.etiqueta}
                                                            onChange={(e) => updateField(index, 'etiqueta', e.target.value)}
                                                            className="bg-transparent border-b border-flota-border-focus focus:border-flota-blue outline-none text-sm text-flota-blue font-bold w-full"
                                                            placeholder="Etiqueta"
                                                        />
                                                        <input 
                                                            type="text"
                                                            value={campo.valor}
                                                            onChange={(e) => updateField(index, 'valor', e.target.value)}
                                                            className="bg-transparent border-b border-white/10 focus:border-flota-blue outline-none text-lg text-white w-full"
                                                            placeholder="Valor"
                                                        />
                                                    </div>
                                                    <button 
                                                        onClick={() => removeField(index)}
                                                        className="text-red-400 p-2 hover:bg-red-400/10 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 size={20} />
                                                    </button>
                                                </>
                                            ) : (
                                                <div className="flex-1">
                                                    <p className="text-sm text-flota-blue font-bold uppercase tracking-wider">{campo.etiqueta}</p>
                                                    <p className="text-xl text-white font-medium">{campo.valor}</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {isEditing && (
                                    <div className="flex gap-4 mt-4">
                                        <button 
                                            onClick={addField}
                                            className="flex-1 flex items-center justify-center gap-2 p-3 border-2 border-dashed border-flota-border-focus rounded-xl text-gray-400 hover:text-white hover:border-white/20 transition-all"
                                        >
                                            <Plus size={20} /> Agregar Campo
                                        </button>
                                        <div className="w-1/2">
                                            <Button 
                                                text={saving ? "Guardando..." : "Guardar Cambios"}
                                                onClick={handleSave}
                                                icon={<Save size={20} />}
                                                disabled={saving}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </Container>
        </div>
    );
}
