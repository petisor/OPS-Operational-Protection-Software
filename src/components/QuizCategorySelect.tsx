import { ShieldCheck, BookOpen } from "lucide-react";

interface QuizCategorySelectProps {
  onSelect: (category: "safety" | "usage") => void;
  machineName: string;
}

export function QuizCategorySelect({ onSelect, machineName }: QuizCategorySelectProps) {
  return (
    <div className="max-w-2xl mx-auto px-4 animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-black mb-2">
          {machineName}
        </h1>
        <p className="text-lg text-muted-foreground">
          Select the type of quiz you want to complete
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Safety Check */}
        <button
          onClick={() => onSelect("safety")}
          className="card-industrial p-8 flex flex-col items-center gap-4 hover:border-warning transition-all"
        >
          <div className="w-20 h-20 rounded-full bg-warning/20 flex items-center justify-center">
            <ShieldCheck className="h-10 w-10 text-warning" />
          </div>
          <h2 className="text-2xl font-black">Safety Check</h2>
          <p className="text-muted-foreground text-center">
            Verify all safety precautions and hazard awareness before operating
          </p>
          <div className="mt-2 px-4 py-2 bg-warning/20 rounded-sm">
            <span className="font-bold text-warning">Required Daily</span>
          </div>
        </button>

        {/* Usage Quiz */}
        <button
          onClick={() => onSelect("usage")}
          className="card-industrial p-8 flex flex-col items-center gap-4 hover:border-primary transition-all"
        >
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
            <BookOpen className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-2xl font-black">Usage Quiz</h2>
          <p className="text-muted-foreground text-center">
            Test your knowledge of proper operation and usage procedures
          </p>
          <div className="mt-2 px-4 py-2 bg-primary/20 rounded-sm">
            <span className="font-bold text-primary">Knowledge Check</span>
          </div>
        </button>
      </div>
    </div>
  );
}
