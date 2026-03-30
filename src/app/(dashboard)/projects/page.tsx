"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectCard } from "@/components/project/project-card";
import { Plus, FolderOpen } from "lucide-react";

interface Project {
  id: string;
  title: string | null;
  status: string;
  original_prompt: string | null;
  total_duration: number;
  created_at: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const response = await fetch("/api/projects");
        const data = await response.json();

        if (data.success) {
          setProjects(data.data.projects || []);
        }
      } catch (error) {
        console.error("获取项目列表失败:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProjects();
  }, []);

  const handleDeleteProject = async (id: string) => {
    const response = await fetch(`/api/projects/${id}`, {
      method: "DELETE",
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "删除失败");
    }

    // 从列表中移除
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FolderOpen className="h-8 w-8 text-primary" />
            我的项目
          </h1>
          <p className="text-muted-foreground mt-1">
            管理你的所有视频项目
          </p>
        </div>

        <Button asChild>
          <Link href="/create">
            <Plus className="mr-2 h-4 w-4" />
            新建项目
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border p-6 space-y-3">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-12 w-full" />
              <div className="flex justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-8 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-6 mb-4">
            <FolderOpen className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">暂无项目</h3>
          <p className="text-muted-foreground mb-6 max-w-sm">
            开始创建你的第一个 AI 动漫视频吧
          </p>
          <Button asChild>
            <Link href="/create">
              <Plus className="mr-2 h-4 w-4" />
              创建第一个视频
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onDelete={handleDeleteProject}
            />
          ))}
        </div>
      )}
    </div>
  );
}
