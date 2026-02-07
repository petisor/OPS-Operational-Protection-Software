import { AlertTriangle, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SafetyWarningModalProps {
  machineName: string;
  commonInjury: string;
  safetyWarning: string;
  onAcknowledge: () => void;
}

export function SafetyWarningModal({
  machineName,
  commonInjury,
  safetyWarning,
  onAcknowledge,
}: SafetyWarningModalProps) {
  return (
    <div className="warning-overlay animate-fade-in">
      <div className="bg-card max-w-lg w-full mx-4 rounded-sm border-4 border-warning shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="bg-warning p-6 flex items-center gap-4">
          <ShieldAlert className="h-12 w-12 text-warning-foreground shrink-0" />
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-warning-foreground uppercase">
              Critical Safety Warning
            </h2>
            <p className="text-warning-foreground/90 font-semibold">
              {machineName}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="flex items-start gap-4 p-4 bg-destructive/10 border-2 border-destructive rounded-sm">
            <AlertTriangle className="h-8 w-8 text-destructive shrink-0 mt-1" />
            <div>
              <h3 className="text-xl font-bold text-destructive mb-2">
                MOST COMMON INJURY
              </h3>
              <p className="text-lg font-semibold">{commonInjury}</p>
            </div>
          </div>

          <div className="p-4 bg-muted rounded-sm">
            <p className="text-lg leading-relaxed">{safetyWarning}</p>
          </div>

          <Button
            onClick={onAcknowledge}
            size="full"
            variant="warning"
            className="uppercase font-black tracking-wide"
          >
            <ShieldAlert className="h-6 w-6 mr-2" />
            I ACKNOWLEDGE
          </Button>
        </div>
      </div>
    </div>
  );
}
