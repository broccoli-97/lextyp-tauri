import { useAppStore } from "../stores/app-store";

interface NavigationBarProps {
  onLoadBib: () => void;
}

const navItems = [
  { icon: "\uD83D\uDCDA", label: "References", action: "references" },
  { icon: "\u2795", label: "New", action: "new" },
  { icon: "\uD83D\uDCC2", label: "Open", action: "open" },
  { icon: "\uD83D\uDCBE", label: "Save", action: "save" },
  { icon: "\uD83D\uDCE4", label: "Export", action: "export" },
  { icon: "\uD83D\uDCDA", label: "Load .bib", action: "loadbib" },
] as const;

export function NavigationBar({ onLoadBib }: NavigationBarProps) {
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);

  const handleAction = (action: string) => {
    switch (action) {
      case "references":
        toggleSidebar();
        break;
      case "loadbib":
        onLoadBib();
        break;
      default:
        console.log("Action:", action);
    }
  };

  return (
    <div className="w-12 bg-[#F3F3F3] border-r border-[#E0E0E0] flex flex-col items-center py-2 gap-1 shrink-0">
      {navItems.map((item, i) => (
        <button
          key={`${item.action}-${i}`}
          onClick={() => handleAction(item.action)}
          className="w-9 h-9 flex items-center justify-center rounded hover:bg-[#EBEBEB] active:bg-[#D6D6D6] transition-colors text-lg"
          title={item.label}
        >
          {item.icon}
        </button>
      ))}
    </div>
  );
}
