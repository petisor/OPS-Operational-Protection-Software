import { XOctagon, AlertTriangle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

interface DoNotOperateProps {
  machineName: string;
  onBackToDashboard: () => void;
}

export function DoNotOperate({ machineName, onBackToDashboard }: DoNotOperateProps) {
  const { t } = useLanguage();
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-destructive/10">
      <div className="max-w-lg w-full text-center animate-fade-in">
        {/* Warning Icon */}
        <div className="relative mb-8">
          <div className="w-40 h-40 mx-auto rounded-full bg-destructive/20 flex items-center justify-center">
            <div className="w-32 h-32 rounded-full bg-destructive flex items-center justify-center">
              <XOctagon className="h-20 w-20 text-destructive-foreground" />
            </div>
          </div>
        </div>

        {/* Warning Message */}
        <h1 className="text-3xl md:text-4xl font-black text-destructive mb-4 uppercase">
          {t("failed.title")}
        </h1>

        <p className="text-xl text-muted-foreground mb-8">
          <span className="font-bold">{machineName}</span> {t("doNotOperate.failedInspection")}
        </p>

        {/* Instructions */}
        <div className="card-industrial p-6 mb-8 text-left border-destructive">
          <div className="flex items-start gap-4">
            <AlertTriangle className="h-8 w-8 text-destructive shrink-0" />
            <div>
              <h3 className="text-lg font-bold text-destructive mb-2 uppercase">
                {t("doNotOperate.requiredAction")}
              </h3>
              <ul className="space-y-2 text-lg">
                <li>• {t("doNotOperate.tagEquipment")}</li>
                <li>• {t("doNotOperate.reportSupervisor")}</li>
                <li>• {t("doNotOperate.doNotUse")}</li>
                <li>• {t("doNotOperate.documentIssue")}</li>
              </ul>
            </div>
          </div>
        </div>

        <Button
          onClick={onBackToDashboard}
          size="full"
          variant="outline"
          className="uppercase font-bold"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          {t("failed.returnDashboard")}
        </Button>
      </div>
    </div>
  );
}
