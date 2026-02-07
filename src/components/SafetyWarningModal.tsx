import { AlertTriangle, ShieldAlert, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslateContent } from "@/hooks/useTranslateContent";
import { useLanguage } from "@/contexts/LanguageContext";

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
  const { t } = useLanguage();
  const { text: translatedInjury, isTranslating: isTranslatingInjury } = useTranslateContent(commonInjury);
  const { text: translatedWarning, isTranslating: isTranslatingWarning } = useTranslateContent(safetyWarning);
  
  const isTranslating = isTranslatingInjury || isTranslatingWarning;

  return (
    <div className="warning-overlay animate-fade-in">
      <div className="bg-card max-w-lg w-full mx-4 rounded-sm border-4 border-warning shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="bg-warning p-6 flex items-center gap-4">
          <ShieldAlert className="h-12 w-12 text-warning-foreground shrink-0" />
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-warning-foreground uppercase">
              {t("safetyModal.criticalWarning")}
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
              <h3 className="text-xl font-bold text-destructive mb-2 uppercase">
                {t("safetyModal.commonInjury")}
              </h3>
              <div className="flex items-center gap-2">
                {isTranslatingInjury && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                <p className="text-lg font-semibold">{translatedInjury}</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-muted rounded-sm">
            {isTranslatingWarning && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mb-2" />}
            <p className="text-lg leading-relaxed">{translatedWarning}</p>
          </div>

          <Button
            onClick={onAcknowledge}
            size="full"
            variant="warning"
            className="uppercase font-black tracking-wide"
          >
            <ShieldAlert className="h-6 w-6 mr-2" />
            {t("safetyModal.acknowledge")}
          </Button>
        </div>
      </div>
    </div>
  );
}
