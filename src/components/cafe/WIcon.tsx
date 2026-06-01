import type { ReactNode } from "react";

// Ported icon set from the BOBO web design handoff (web-ui.jsx).
export function WIcon({
  name,
  size = 20,
  stroke = "currentColor",
  sw = 1.8,
}: {
  name: string;
  size?: number;
  stroke?: string;
  sw?: number;
}) {
  const p = {
    fill: "none",
    stroke,
    strokeWidth: sw,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const paths: Record<string, ReactNode> = {
    home: <path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z" {...p} />,
    grid: (
      <g {...p}>
        <rect x="4" y="4" width="6.5" height="6.5" rx="1.4" />
        <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.4" />
        <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.4" />
        <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.4" />
      </g>
    ),
    list: <g {...p}><path d="M4 7h16M4 12h16M4 17h16" /></g>,
    invoice: <g {...p}><path d="M6 3h9l3 3v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M8.5 11h7M8.5 15h5" /></g>,
    user: <g {...p}><circle cx="12" cy="8" r="3.4" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></g>,
    pin: <g {...p}><path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z" /><circle cx="12" cy="10" r="2.4" /></g>,
    clock: <g {...p}><circle cx="12" cy="12" r="8.4" /><path d="M12 7.5V12l3 1.8" /></g>,
    check: <path d="M5 12.5 10 17.5 19.5 7" {...p} />,
    chevR: <path d="M9 5l7 7-7 7" {...p} />,
    chevL: <path d="M15 5l-7 7 7 7" {...p} />,
    plus: <g {...p}><path d="M12 6v12M6 12h12" /></g>,
    minus: <path d="M6 12h12" {...p} />,
    box: <g {...p}><path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z" /><path d="M3 7.5 12 12l9-4.5M12 12v9" /></g>,
    hourglass: <g {...p}><path d="M7 4h10M7 20h10M8 4c0 4 8 4 8 8s-8 4-8 8M16 4c0 4-8 4-8 8s8 4 8 8" /></g>,
    bell: <g {...p}><path d="M6 9a6 6 0 0 1 12 0c0 6 2 7 2 7H4s2-1 2-7z" /><path d="M10 20a2 2 0 0 0 4 0" /></g>,
    truck: <g {...p}><path d="M3 6h11v10H3zM14 9h4l3 3v4h-7z" /><circle cx="7" cy="18" r="1.6" /><circle cx="17.5" cy="18" r="1.6" /></g>,
    tag: <g {...p}><path d="M4 11.5V5a1 1 0 0 1 1-1h6.5a2 2 0 0 1 1.4.6l6.5 6.5a1.5 1.5 0 0 1 0 2.1l-6.4 6.4a1.5 1.5 0 0 1-2.1 0L4.6 12.9A2 2 0 0 1 4 11.5z" /><circle cx="8.5" cy="8.5" r="1.3" fill={stroke} /></g>,
    search: <g {...p}><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" /></g>,
    download: <g {...p}><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14" /></g>,
    printer: <g {...p}><path d="M7 8V4h10v4M7 18H5a1 1 0 0 1-1-1v-5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5a1 1 0 0 1-1 1h-2" /><path d="M7 14h10v6H7z" /></g>,
    cog: <g {...p}><circle cx="12" cy="12" r="3" /><path d="M12 3v2.5M12 18.5V21M4.2 7l2.2 1.3M17.6 15.7 19.8 17M4.2 17l2.2-1.3M17.6 8.3 19.8 7" /></g>,
    card: <g {...p}><rect x="3" y="6" width="18" height="12" rx="2.2" /><path d="M3 10h18" /></g>,
    calendar: <g {...p}><rect x="4" y="5" width="16" height="16" rx="2.2" /><path d="M4 9.5h16M8.5 3v4M15.5 3v4" /></g>,
    camera: <g {...p}><path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" /><circle cx="12" cy="13" r="3.2" /></g>,
    bread: <g {...p}><path d="M6 13c-2 0-3-1.4-3-3 0-2.2 2.4-4 6-4h6c3.6 0 6 1.8 6 4 0 1.6-1 3-3 3v5a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1z" /></g>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }} aria-hidden="true">
      {paths[name] ?? paths.box}
    </svg>
  );
}
