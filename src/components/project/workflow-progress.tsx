"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// 工作流步骤定义
export type WorkflowStep = "script" | "images" | "videos" | "complete";

interface WorkflowProgressProps {
  currentStep: WorkflowStep;
  className?: string;
}

const steps: { id: WorkflowStep; label: string }[] = [
  { id: "script", label: "剧本解析" },
  { id: "images", label: "预览图" },
  { id: "videos", label: "视频生成" },
  { id: "complete", label: "完成" },
];

// 根据项目状态和场景状态计算当前步骤
export function getWorkflowStep(
  projectStatus: string,
  scenes: { preview_image_url: string | null; user_approved: boolean; video_url: string | null }[]
): WorkflowStep {
  // 完成状态
  if (projectStatus === "completed") {
    return "complete";
  }

  // 解析阶段
  if (
    projectStatus === "parsing" ||
    projectStatus === "storyboarding" ||
    projectStatus === "locations_pending" ||
    projectStatus === "characters_pending"
  ) {
    return "script";
  }

  // 检查是否所有场景都有视频
  const allHaveVideos = scenes.length > 0 && scenes.every(s => s.video_url);
  if (allHaveVideos || projectStatus === "stitching") {
    return "complete";
  }

  // 检查是否所有场景都已确认（可以进入视频生成阶段）
  const allApproved = scenes.length > 0 && scenes.every(s => s.user_approved);
  if (allApproved) {
    return "videos";
  }

  // 默认在预览图阶段
  return "images";
}

export function WorkflowProgress({ currentStep, className }: WorkflowProgressProps) {
  const currentIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between relative">
        {/* 连接线背景 */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-muted" />

        {/* 进度线 */}
        <div
          className="absolute top-4 left-0 h-0.5 bg-primary transition-all duration-500"
          style={{
            width: currentIndex === 0 ? "0%" : `${(currentIndex / (steps.length - 1)) * 100}%`,
          }}
        />

        {/* 步骤节点 */}
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isPending = index > currentIndex;

          return (
            <div key={step.id} className="flex flex-col items-center relative z-10">
              {/* 圆点 */}
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                  isCompleted && "bg-primary border-primary text-primary-foreground",
                  isCurrent && "bg-primary border-primary text-primary-foreground ring-4 ring-primary/20",
                  isPending && "bg-background border-muted-foreground/30 text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span className="text-xs font-medium">{index + 1}</span>
                )}
              </div>

              {/* 标签 */}
              <span
                className={cn(
                  "mt-2 text-xs font-medium whitespace-nowrap",
                  isCompleted && "text-primary",
                  isCurrent && "text-primary font-semibold",
                  isPending && "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
