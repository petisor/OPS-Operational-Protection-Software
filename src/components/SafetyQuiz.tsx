import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, AlertOctagon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Question {
  id: string;
  question: string;
  order_index: number;
  correct_answer: boolean; // true = YES is correct, false = NO is correct
}

interface SafetyQuizProps {
  questions: Question[];
  onComplete: (correctAnswers: number, totalQuestions: number) => void;
  onFail: () => void;
  questionCount?: number;
}

export function SafetyQuiz({ questions, onComplete, onFail, questionCount }: SafetyQuizProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  
  // Sort and limit questions
  const sortedQuestions = [...questions]
    .sort((a, b) => a.order_index - b.order_index)
    .slice(0, questionCount || questions.length);
  
  const currentQuestion = sortedQuestions[currentIndex];
  const progress = ((currentIndex + 1) / sortedQuestions.length) * 100;

  const handleAnswer = (answeredYes: boolean) => {
    const isCorrect = answeredYes === currentQuestion.correct_answer;
    
    if (!isCorrect) {
      // Wrong answer - fail immediately
      onFail();
      return;
    }
    
    const newCorrectCount = correctCount + 1;
    setCorrectCount(newCorrectCount);
    
    if (currentIndex < sortedQuestions.length - 1) {
      // Move to next question
      setCurrentIndex(currentIndex + 1);
    } else {
      // Quiz completed successfully
      onComplete(newCorrectCount, sortedQuestions.length);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 animate-fade-in">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-lg font-bold text-muted-foreground">
            Safety Check Progress
          </span>
          <span className="text-lg font-bold">
            Step {currentIndex + 1} of {sortedQuestions.length}
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
          <h2 className="text-2xl md:text-3xl font-bold leading-tight">
            {currentQuestion?.question}
          </h2>
        </div>

        <p className="text-muted-foreground text-lg">
          Carefully inspect the equipment and answer honestly.
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
        {sortedQuestions.map((_, index) => (
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
