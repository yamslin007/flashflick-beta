"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Trash2, Loader2 } from "lucide-react";

// 状态映射
const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" }> = {
  draft: { label: "草稿", variant: "secondary" },
  parsing: { label: "解析中", variant: "warning" },
  storyboarding: { label: "生成分镜", variant: "warning" },
  characters_pending: { label: "确认角色", variant: "default" },
  storyboard_ready: { label: "分镜就绪", variant: "default" },
  user_review: { label: "待审核", variant: "default" },
  generating: { label: "生成中", variant: "warning" },
  stitching: { label: "合成中", variant: "warning" },
  completed: { label: "已完成", variant: "success" },
  failed: { label: "失败", variant: "destructive" },
};

interface ProjectCardProps {
  project: {
    id: string;
    title: string | null;
    status: string;
    original_prompt: string | null;
    total_duration: number;
    created_at: string;
  };
  onDelete?: (id: string) => Promise<void>;
}

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const status = statusConfig[project.status] || statusConfig.draft;
  const createdAt = new Date(project.created_at).toLocaleDateString("zh-CN");

  const handleDelete = async () => {
    if (!onDelete) return;

    const confirmed = window.confirm(
      `确定要删除项目"${project.title || "未命名项目"}"吗？\n此操作不可撤销。`
    );

    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await onDelete(project.id);
    } catch (error) {
      console.error("删除失败:", error);
      alert("删除失败，请重试");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="font-semibold leading-none">
              {project.title || "未命名项目"}
            </h3>
            <p className="text-xs text-muted-foreground">{createdAt}</p>
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {project.original_prompt || "暂无描述"}
        </p>
      </CardContent>

      <CardFooter className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{project.total_duration}秒</span>
        </div>

        <div className="flex gap-2">
          {onDelete && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-muted-foreground hover:text-destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-8" asChild>
            <Link href={`/projects/${project.id}`}>查看详情</Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
