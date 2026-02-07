import { CheckCircle, User, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface SafetySuccessProps {
  employeeName: string;
  machineName: string;
  timestamp: Date;
  onBackToDashboard: () => void;
}

export function SafetySuccess({
  employeeName,
  machineName,
  timestamp,
  onBackToDashboard,
}: SafetySuccessProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-success/10">
      <div className="max-w-lg w-full text-center animate-fade-in">
        {/* Animated Checkmark */}
        <div className="relative mb-8">
          <div className="w-40 h-40 mx-auto rounded-full bg-success/20 flex items-center justify-center success-pulse">
            <div className="w-32 h-32 rounded-full bg-success flex items-center justify-center">
              <CheckCircle className="h-20 w-20 text-success-foreground" />
            </div>
          </div>
        </div>

        {/* Success Message */}
        <h1 className="text-3xl md:text-4xl font-black text-success mb-4 uppercase">
          Machine Safe to Operate
        </h1>

        <p className="text-xl text-muted-foreground mb-8">
          All safety checks passed for <span className="font-bold">{machineName}</span>
        </p>

        {/* Certification Details */}
        <div className="card-industrial p-6 mb-8 text-left">
          <h3 className="text-lg font-bold text-muted-foreground mb-4 uppercase">
            Certification Details
          </h3>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <User className="h-6 w-6 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Certified by</p>
                <p className="text-lg font-bold">{employeeName}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Clock className="h-6 w-6 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Time of Certification</p>
                <p className="text-lg font-bold">
                  {format(timestamp, "MMMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
            </div>
          </div>
        </div>

        <Button
          onClick={onBackToDashboard}
          size="full"
          variant="default"
          className="uppercase font-bold"
        >
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
}
