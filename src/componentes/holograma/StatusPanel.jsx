import React from "react";
import { Wifi, Monitor, Globe, User } from "lucide-react";

const defaultStatusItems = [
  { label: "SISTEMA", value: "Ativo", icon: Wifi },
  { label: "CONEXÃO", value: "Conectado", icon: Monitor },
  { label: "NAVEGADOR", value: "Pronto", icon: Globe },
  { label: "FALANTE", value: "Carmen", icon: User },
];

export default function StatusPanel({ items = defaultStatusItems }) {
  const normalizedItems = items.map((item, index) => ({
    ...item,
    icon: item.icon || defaultStatusItems[index % defaultStatusItems.length].icon,
  }));

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 w-full max-w-4xl">
      {normalizedItems.map((item) => (
        <div
          key={item.label}
          className="border border-gray-800 bg-gray-900/50 rounded-lg px-4 py-3 backdrop-blur-sm"
        >
          <div className="flex items-center gap-2 mb-1">
            <item.icon className="w-3 h-3 text-red-500/70" />
            <span className="text-[10px] font-mono tracking-[0.2em] text-gray-500 uppercase">
              {item.label}
            </span>
          </div>
          <span className="text-sm font-semibold text-gray-200">
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}