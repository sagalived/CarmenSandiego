import React from "react";
import { Wifi, Monitor, Globe, User } from "lucide-react";

const statusItems = [
  { label: "SISTEMA", value: "Ativo", icon: Wifi, valueClass: "text-emerald-400" },
  { label: "CONEXÃO", value: "Conectado", icon: Monitor, valueClass: "text-emerald-400" },
  { label: "NAVEGADOR", value: "Pronto", icon: Globe, valueClass: "text-emerald-400" },
  { label: "FALANTE", value: "Carmen", icon: User, valueClass: "text-red-300" },
];

export default function StatusPanel() {
  return (
    <div className="grid w-full grid-cols-2 gap-3 xl:grid-cols-4">
      {statusItems.map((item) => (
        <div
          key={item.label}
          className="rounded-[22px] border border-[#1b2530] bg-[#0b1016] px-4 py-4 shadow-[0_0_22px_rgba(0,0,0,0.16)]"
        >
          <div className="mb-2 flex items-center gap-2">
            <item.icon className="h-4 w-4 text-cyan-400" />
            <span className="text-[11px] font-mono tracking-[0.22em] text-slate-500 uppercase">
              {item.label}
            </span>
          </div>
          <span className={`text-[1.65rem] font-semibold ${item.valueClass}`}>
            {item.value}
          </span>
          <div className="mt-3 h-[3px] w-full rounded-full bg-[#16202a]">
            <div className="h-full w-2/3 rounded-full bg-[linear-gradient(90deg,#4ade80,#22c55e)]" />
          </div>
        </div>
      ))}
    </div>
  );
}