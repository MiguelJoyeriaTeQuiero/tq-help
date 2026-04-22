import { MetalFamily, MetalOrderStatus } from "@prisma/client";

export const METAL_FAMILY_LABELS: Record<MetalFamily, string> = {
  PENDIENTE:              "Pendiente",
  AROS:                   "Aros",
  CADENA:                 "Cadena",
  CORDON:                 "Cordón",
  COLLAR:                 "Collar",
  ANILLO:                 "Anillo",
  SELLO:                  "Sello",
  SOLITARIO:              "Solitario",
  ALIANZA:                "Alianza",
  PULSERA:                "Pulsera",
  ESCLAVA:                "Esclava",
  SEMANARIO:              "Semanario",
  ATADEDO:                "Atadedo",
  PLACA_FOTO:             "Placa foto",
  PLACA_RH:               "Placa RH",
  PLACA:                  "Placa",
  PIERCING:               "Piercing",
  COLGANTE:               "Colgante",
  MEDALLA:                "Medalla",
  GEMELO:                 "Gemelo",
  PASA_CORBATA:           "Pasacorbata",
  RELOJ:                  "Reloj",
  RELOJ_DE_BOLSILLO:      "Reloj de bolsillo",
  PROTESIS_DENTAL:        "Prótesis dental",
  TOBILLERA:              "Tobillera",
  LLAVERO:                "Llavero",
  BROCHE:                 "Broche",
  CADENA_RELOJ_BOLSILLO:  "Cadena reloj bolsillo",
  MONEDA:                 "Moneda",
  CRUZ:                   "Cruz",
  MANO:                   "Mano",
  CORREA_RELOJ:           "Correa reloj",
  OTRAS:                  "Otras",
  LINGOTE:                "Lingote",
  EAR_CUFF:               "Ear cuff",
  PACKAGING:              "Packaging",
  FORNITURA:              "Fornitura",
};

export const METAL_FAMILY_OPTIONS = (Object.keys(METAL_FAMILY_LABELS) as MetalFamily[]).map(
  (key) => ({ value: key, label: METAL_FAMILY_LABELS[key] })
);

export const METAL_ORDER_STATUS_LABELS: Record<MetalOrderStatus, string> = {
  BORRADOR:   "Borrador",
  ENVIADO:    "Enviado",
  CONFIRMADO: "Confirmado",
  PREPARANDO: "Preparando",
  EN_CAMINO:  "En camino",
  ENTREGADO:  "Entregado",
  CANCELADO:  "Cancelado",
};

export const METAL_ORDER_STATUS_COLORS: Record<MetalOrderStatus, string> = {
  BORRADOR:   "bg-slate-100 text-slate-600",
  ENVIADO:    "bg-yellow-100 text-yellow-700",
  CONFIRMADO: "bg-blue-100 text-blue-700",
  PREPARANDO: "bg-indigo-100 text-indigo-700",
  EN_CAMINO:  "bg-purple-100 text-purple-700",
  ENTREGADO:  "bg-green-100 text-green-700",
  CANCELADO:  "bg-red-100 text-red-600",
};
