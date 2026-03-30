"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { StepIndicator, WORKFLOW_STEPS } from "@/components/project/step-indicator";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Film,
  Sparkles,
  MapPin,
  Music,
  Volume2,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";

interface Scene {
  id: string;
  scene_index: number;
  description: string | null;
  duration: number;
  character_ids: string[] | null;
  location_id: string | null;
  bgm: string | null;
  sfx: string | null;
  pacing: string | null;
  cuts: unknown[] | null;
  status: string;
}

interface Location {
  id: string;
  name: string;
  description: string | null;
}

interface Project {
  id: string;
  title: string | null;
  status: string;
  style_config: { artStyle?: string } | null;
}

interface ScenesPageProps {
  params: Promise<{ id: string }>;
}

export default function ScenesPage({ params }: ScenesPageProps) {
  const { id: projectId } = use(params);
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  // 加载数据
  useEffect(() => {
    async function fetchData() {
      try {
        const [projectRes, scenesRes, locationsRes] = await Promise.all([
          fetch(`/api/projects/${projectId}`),
          fetch(`/api/projects/${projectId}/scenes`),
          fetch(`/api/projects/${projectId}/locations`),
        ]);

        const [projectData, scenesData, locationsData] = await Promise.all([
          projectRes.json(),
          scenesRes.json(),
          locationsRes.json(),
        ]);

        if (projectData.success) {
          setProject(projectData.data);

          // 路由保护：如果状态不是 scenes_pending 或更高，跳转到正确页面
          const status = projectData.data.status;
          if (status === "title_characters_pending") {
            router.replace(`/projects/${projectId}/script`);
            return;
          } else if (status === "locations_pending") {
            router.replace(`/projects/${projectId}/locations`);
            return;
          } else if (status === "storyboard_ready") {
            router.replace(`/projects/${projectId}`);
            return;
          }
        }

        if (scenesData.success) {
          setScenes(scenesData.data || []);
        }

        if (locationsData.success) {
          setLocations(locationsData.data || []);
        }
      } catch (error) {
        console.error("加载数据失败:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [projectId, router]);

  // AI 生成分镜
  const handleGenerateScenes = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/generate-scenes`, {
        method: "POST",
      });

      const data = await res.json();
      if (data.success) {
        // 重新加载场景
        const scenesRes = await fetch(`/api/projects/${projectId}/scenes`);
        const scenesData = await scenesRes.json();
        if (scenesData.success) {
          setScenes(scenesData.data || []);
        }

        // 重新加载项目获取状态
        const projectRes = await fetch(`/api/projects/${projectId}`);
        const projectData = await projectRes.json();
        if (projectData.success) {
          setProject(projectData.data);
        }
      } else {
        alert(data.error || "生成失败");
      }
    } catch (error) {
      console.error("生成失败:", error);
      alert("生成失败，请重试");
    } finally {
      setIsGenerating(false);
    }
  };

  // 确认并继续到分镜预览
  const handleConfirmAndContinue = async () => {
    setIsConfirming(true);
    try {
      await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "storyboard_ready" }),
      });
      router.push(`/projects/${projectId}`);
    } catch (error) {
      console.error("操作失败:", error);
      alert("操作失败，请重试");
    } finally {
      setIsConfirming(false);
    }
  };

  const currentStep = project?.status || "scenes_pending";

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Skeleton className="h-8 w-48 mb-8" />
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* 头部 */}
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Link href="/projects">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">步骤3：分镜生成</h1>
            <p className="text-muted-foreground text-sm">
              {project?.title ? `"${project.title}"` : "创建新视频"}
            </p>
          </div>
        </div>

        {/* 步骤指示器 */}
        <StepIndicator
          steps={WORKFLOW_STEPS as unknown as { id: string; label: string }[]}
          currentStep={currentStep}
        />
      </div>

      {/* 说明 */}
      <div className="mb-6 p-4 bg-muted/50 rounded-lg">
        <p className="text-sm text-muted-foreground">
          {scenes.length > 0
            ? "AI 已生成分镜脚本。您可以查看每个场景的镜头结构，或点击「重新生成分镜」让 AI 重新创作。"
            : "点击「AI 生成分镜」，让 AI 根据角色和场景自动生成分镜脚本。"}
        </p>
      </div>

      {/* 分镜列表 */}
      {scenes.length === 0 ? (
        <Card className="mb-6">
          <CardContent className="py-12 text-center">
            <Film className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">暂无分镜</p>
            <Button onClick={handleGenerateScenes} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  AI 生成分镜
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6 mb-6">
          {scenes.map((scene, index) => {
            const location = locations.find(l => l.id === scene.location_id);
            const cuts = (scene.cuts || []) as { cutIndex?: number; cameraAngle?: string; visualDescription?: string; character?: { name?: string; dialogue?: string } }[];
            const totalDuration = cuts.reduce((sum, cut) => sum + 2, 0) || scene.duration;

            return (
              <Card key={scene.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">场景 {index + 1}</Badge>
                      {location && (
                        <Badge variant="secondary" className="text-xs">
                          <MapPin className="h-3 w-3 mr-1" />
                          {location.name}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {scene.duration}秒
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {cuts.length} 个镜头
                      </Badge>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 音频层信息 */}
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {scene.bgm && (
                      <div className="flex items-center gap-1">
                        <Music className="h-3 w-3" />
                        <span>{scene.bgm}</span>
                      </div>
                    )}
                    {scene.sfx && (
                      <div className="flex items-center gap-1">
                        <Volume2 className="h-3 w-3" />
                        <span>{scene.sfx}</span>
                      </div>
                    )}
                    {scene.pacing && (
                      <div className="flex items-center gap-1">
                        <Film className="h-3 w-3" />
                        <span>{scene.pacing}</span>
                      </div>
                    )}
                  </div>

                  {/* 场景描述 */}
                  <p className="text-sm">{scene.description}</p>

                  {/* 镜头列表 */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">镜头列表</Label>
                    <div className="space-y-2">
                      {cuts.map((cut, cutIndex) => (
                        <div key={cutIndex} className="flex items-start gap-3 p-2 bg-muted/50 rounded text-sm">
                          <Badge variant="secondary" className="shrink-0 mt-0.5">
                            #{cutIndex + 1}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-muted-foreground">
                                {cut.cameraAngle || "Medium shot"}
                              </span>
                              {cut.character?.name && (
                                <span className="text-xs font-medium">
                                  {cut.character.name}
                                </span>
                              )}
                              {cut.character?.dialogue && (
                                <span className="text-xs italic text-muted-foreground truncate">
                                  "{cut.character.dialogue}"
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {cut.visualDescription}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* 底部操作 */}
      <div className="flex items-center justify-between border-t pt-6">
        <Button
          variant="outline"
          onClick={handleGenerateScenes}
          disabled={isGenerating || isConfirming}
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              重新生成分镜
            </>
          )}
        </Button>

        <Button
          onClick={handleConfirmAndContinue}
          disabled={scenes.length === 0 || isGenerating || isConfirming}
        >
          {isConfirming ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              处理中...
            </>
          ) : (
            <>
              确认并继续到分镜预览
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
