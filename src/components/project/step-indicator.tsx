"use client";

import { Check } from "lucide-react";

interface Step {
  id: string;
  label: string;
  description?: string;
  href?: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: string;
  className?: string;
}

export function StepIndicator({ steps, currentStep, className = "" }: StepIndicatorProps) {
  const currentIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isUpcoming = index > currentIndex;
        const isClickable = isCompleted && step.href;

        const nodeContent = (
          <div className="flex items-center gap-2">
            <div
              className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                transition-all duration-300
                ${isCompleted
                  ? "bg-green-500 text-white"
                  : isCurrent
                    ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                    : "bg-muted text-muted-foreground"
                }
                ${isClickable ? "cursor-pointer hover:opacity-80" : ""}
              `}
            >
              {isCompleted ? (
                <Check className="h-4 w-4" />
              ) : (
                index + 1
              )}
            </div>
            <div className="hidden sm:block">
              <p
                className={`text-sm font-medium transition-colors ${
                  isCurrent ? "text-foreground" : isUpcoming ? "text-muted-foreground" : "text-foreground"
                } ${isClickable ? "underline underline-offset-2 cursor-pointer" : ""}`}
              >
                {step.label}
              </p>
              {step.description && isCurrent && (
                <p className="text-xs text-muted-foreground">{step.description}</p>
              )}
            </div>
          </div>
        );

        return (
          <div key={step.id} className="flex items-center">
            {/* 步骤节点 */}
            {isClickable ? (
              <a href={step.href}>{nodeContent}</a>
            ) : (
              nodeContent
            )}

            {/* 连接线 */}
            {index < steps.length - 1 && (
              <div
                className={`
                  w-12 sm:w-16 h-0.5 mx-2 transition-colors duration-300
                  ${isCompleted ? "bg-green-500" : "bg-muted"}
                `}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// 步骤定义常量（3步流程：locations 已后台化）
export const WORKFLOW_STEPS = [
  { id: "title_characters_pending", label: "标题与角色" },
  { id: "characters_pending", label: "角色立绘" },
  { id: "storyboard_ready", label: "分镜预览" },
] as const;

export type WorkflowStepId = typeof WORKFLOW_STEPS[number]["id"];

// 获取下一步
export function getNextStep(currentStep: string): string | null {
  const currentIndex = WORKFLOW_STEPS.findIndex(s => s.id === currentStep);
  if (currentIndex === -1 || currentIndex >= WORKFLOW_STEPS.length - 1) {
    return null;
  }
  return WORKFLOW_STEPS[currentIndex + 1].id;
}

// 获取上一步
export function getPrevStep(currentStep: string): string | null {
  const currentIndex = WORKFLOW_STEPS.findIndex(s => s.id === currentStep);
  if (currentIndex <= 0) {
    return null;
  }
  return WORKFLOW_STEPS[currentIndex - 1].id;
}
