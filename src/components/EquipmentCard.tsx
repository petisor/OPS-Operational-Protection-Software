import { cn } from "@/lib/utils";
import { Truck, Construction, Tractor, LucideIcon } from "lucide-react";

interface EquipmentCardProps {
  id: string;
  name: string;
  icon: string;
  description?: string;
  selected?: boolean;
  onClick?: () => void;
}

const iconMap: Record<string, LucideIcon> = {
  truck: Truck,
  construction: Construction,
  tractor: Tractor,
};

export function EquipmentCard({
  name,
  icon,
  description,
  selected = false,
  onClick,
}: EquipmentCardProps) {
  const IconComponent = iconMap[icon] || Truck;

  return (
    <button
      onClick={onClick}
      className={cn(
        "card-equipment w-full",
        selected && "selected"
      )}
    >
      <IconComponent
        className={cn(
          "h-12 w-12 md:h-16 md:w-16 transition-colors",
          selected ? "text-primary" : "text-muted-foreground"
        )}
      />
      <h3 className="text-xl md:text-2xl font-bold">{name}</h3>
      {description && (
        <p className="text-sm text-muted-foreground text-center">{description}</p>
      )}
    </button>
  );
}
