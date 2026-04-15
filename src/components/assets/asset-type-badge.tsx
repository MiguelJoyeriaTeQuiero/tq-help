import {
  ComputerDesktopIcon,
  DeviceTabletIcon,
  PhoneIcon,
  PrinterIcon,
  ServerIcon,
  CpuChipIcon,
  DocumentTextIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";

const TYPE_CONFIG: Record<string, { label: string; Icon: React.ElementType; color: string }> = {
  LAPTOP:           { label: "Portátil",          Icon: ComputerDesktopIcon, color: "text-indigo-600 bg-indigo-50" },
  DESKTOP:          { label: "Sobremesa",          Icon: ComputerDesktopIcon, color: "text-blue-600 bg-blue-50" },
  MONITOR:          { label: "Monitor",            Icon: ComputerDesktopIcon, color: "text-cyan-600 bg-cyan-50" },
  PHONE:            { label: "Teléfono",           Icon: PhoneIcon,           color: "text-green-600 bg-green-50" },
  TABLET:           { label: "Tablet",             Icon: DeviceTabletIcon,    color: "text-teal-600 bg-teal-50" },
  PRINTER:          { label: "Impresora",          Icon: PrinterIcon,         color: "text-orange-600 bg-orange-50" },
  NETWORK_DEVICE:   { label: "Red",                Icon: ServerIcon,          color: "text-purple-600 bg-purple-50" },
  SOFTWARE_LICENSE: { label: "Licencia Software",  Icon: DocumentTextIcon,    color: "text-pink-600 bg-pink-50" },
  PERIPHERAL:       { label: "Periférico",         Icon: CpuChipIcon,         color: "text-slate-600 bg-slate-100" },
  OTHER:            { label: "Otro",               Icon: WrenchScrewdriverIcon, color: "text-slate-600 bg-slate-100" },
};

export function AssetTypeBadge({ type, showIcon = true }: { type: string; showIcon?: boolean }) {
  const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.OTHER;
  const Icon = cfg.Icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}>
      {showIcon && <Icon className="h-3.5 w-3.5" />}
      {cfg.label}
    </span>
  );
}

export const ASSET_TYPE_OPTIONS = Object.entries(TYPE_CONFIG).map(([value, { label }]) => ({ value, label }));
export const ASSET_TYPE_LABELS = Object.fromEntries(Object.entries(TYPE_CONFIG).map(([k, v]) => [k, v.label]));
