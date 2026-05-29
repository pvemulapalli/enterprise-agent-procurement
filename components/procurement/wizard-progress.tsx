import type { WizardStep } from "@/lib/procurement/wizard";
import { WIZARD_STEP_LABELS } from "@/lib/procurement/wizard";

type WizardProgressProps = {
  currentStep: WizardStep;
  maxStep: WizardStep;
  onStepClick: (step: WizardStep) => void;
};

export function WizardProgress({
  currentStep,
  maxStep,
  onStepClick,
}: WizardProgressProps) {
  return (
    <nav aria-label="Procurement progress" className="px-8 pt-5 pb-2">
      <div className="flex items-center">
        {WIZARD_STEP_LABELS.map((label, index) => {
          const step = index as WizardStep;
          const isActive = step === currentStep;
          const isDone = step < maxStep;
          const isReachable = step <= maxStep;

          return (
            <div key={label} className="flex flex-1 items-center last:flex-none">
              <button
                type="button"
                disabled={!isReachable}
                onClick={() => isReachable && onStepClick(step)}
                className={`flex flex-col items-center gap-1.5 ${
                  isReachable ? "cursor-pointer" : "cursor-default opacity-50"
                }`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold transition-colors ${
                    isActive
                      ? "bg-slate-900 text-white"
                      : isDone
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {isDone && !isActive ? "✓" : index + 1}
                </span>
                <span
                  className={`whitespace-nowrap text-[10px] font-medium ${
                    isActive ? "text-slate-900" : "text-slate-500"
                  }`}
                >
                  {label}
                </span>
              </button>
              {index < WIZARD_STEP_LABELS.length - 1 ? (
                <div
                  className={`mx-2 mb-4 h-px flex-1 ${
                    step < maxStep ? "bg-emerald-400" : "bg-slate-200"
                  }`}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
