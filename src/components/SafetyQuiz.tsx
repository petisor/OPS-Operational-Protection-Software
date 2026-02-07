import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, AlertOctagon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslateContentBatch } from "@/hooks/useTranslateContent";
import { useLanguage } from "@/contexts/LanguageContext";

interface Question {
  id: string;
  question: string;
  order_index: number;
  correct_answer: boolean; // true = YES is correct, false = NO is correct
}

interface SafetyQuizProps {
  questions: Question[];
  onComplete: (correctAnswers: number, totalQuestions: number) => void;
  onFail: (correctAnswers: number, totalQuestions: number) => void;
  questionCount?: number;
}

export function SafetyQuiz({ questions, onComplete, onFail, questionCount }: SafetyQuizProps) {
  const { t } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [shuffledQuestions, setShuffledQuestions] = useState<Question[]>([]);
  
  // Shuffle and limit questions on mount
  useState(() => {
    const shuffled = [...questions]
      .sort(() => Math.random() - 0.5)
      .slice(0, questionCount || questions.length);
    setShuffledQuestions(shuffled);
  });

  // Initialize shuffled questions when questions change
  if (shuffledQuestions.length === 0 && questions.length > 0) {
    const shuffled = [...questions]
      .sort(() => Math.random() - 0.5)
      .slice(0, questionCount || questions.length);
    setShuffledQuestions(shuffled);
  }

  // Translate questions
  const { items: translatedQuestions, isTranslating } = useTranslateContentBatch(
    shuffledQuestions,
    ["question"]
  );
  
  const currentQuestion = translatedQuestions[currentIndex];
  const originalQuestion = shuffledQuestions[currentIndex];
  const totalQuestions = shuffledQuestions.length;
  const progress = totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0;

  const handleAnswer = (answeredYes: boolean) => {
    if (!originalQuestion) return;
    
    const isCorrect = answeredYes === originalQuestion.correct_answer;
    
    if (!isCorrect) {
      // Wrong answer - fail immediately, pass current correct count
      onFail(correctCount, totalQuestions);
      return;
    }
    
    const newCorrectCount = correctCount + 1;
    setCorrectCount(newCorrectCount);
    
    if (currentIndex < totalQuestions - 1) {
      // Move to next question
      setCurrentIndex(currentIndex + 1);
    } else {
      // Quiz completed successfully
      onComplete(newCorrectCount, totalQuestions);
    }
  };

  if (!currentQuestion) {
    return (
      <div className="max-w-2xl mx-auto px-4 animate-fade-in">
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 animate-fade-in">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-lg font-bold text-muted-foreground">
            Safety Check Progress
          </span>
          <span className="text-lg font-bold">
            Step {currentIndex + 1} of {totalQuestions}
          </span>
        </div>
        <div className="progress-industrial">
          <div
            className="progress-industrial-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="card-industrial p-8 mb-8">
        <div className="flex items-start gap-4 mb-6">
          <AlertOctagon className="h-10 w-10 text-warning shrink-0" />
          <div className="flex-1">
            {isTranslating && (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mb-2" />
            )}
            <h2 className="text-2xl md:text-3xl font-bold leading-tight">
              {currentQuestion?.question}
            </h2>
          </div>
        </div>

        <p className="text-muted-foreground text-lg">
          {t("quiz.inspectCarefully")}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <Button
          onClick={() => handleAnswer(false)}
          variant="destructive"
          size="full"
          className="uppercase font-black tracking-wide"
        >
          <XCircle className="h-8 w-8 mr-2" />
          NO
        </Button>
        <Button
          onClick={() => handleAnswer(true)}
          variant="success"
          size="full"
          className="uppercase font-black tracking-wide"
        >
          <CheckCircle className="h-8 w-8 mr-2" />
          YES
        </Button>
      </div>

      {/* Question Indicators */}
      <div className="flex justify-center gap-2 mt-8">
        {shuffledQuestions.map((_, index) => (
          <div
            key={index}
            className={cn(
              "w-4 h-4 rounded-full transition-colors",
              index < currentIndex
                ? "bg-success"
                : index === currentIndex
                ? "bg-primary"
                : "bg-muted"
            )}
          />
        ))}
      </div>
    </div>
  );
}
