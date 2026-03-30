"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Loader2,
  MapPin,
  Sparkles,
  RefreshCw,
  X,
  ZoomIn,
  Download,
  CheckCircle2,
  MousePointerClick,
  Sparkle,
} from "lucide-react";
import { StepIndicator, WORKFLOW_STEPS } from "@/components/project/step-indicator";

interface Location {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  base_prompt: string | null;
  reference_image_url: string | null;
  view_main_url: string | null;       // 保留字段（兼容）
  view_reverse_url: string | null;    // 保留字段（兼容）
  panorama_url: string | null;        // 16:9 场景图
  location_index: number;
  created_at: string;
  updated_at: string;
}

interface Project {
  id: string;
  title: string | null;
  status: string;
  style_config: { artStyle?: string } | null;
}

interface LocationsPageProps {
  params: Promise<{ id: string }>;
}

export default function LocationsPage({ params }: LocationsPageProps) {
  const { id: projectId } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);

  // 下载图片
  const handleDownloadImage = async (url: string, name: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `${name || "location"}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("下载失败:", error);
      alert("下载失败");
    }
  };

  // 加载项目和场景数据
  useEffect(() => {
    async function fetchData() {
      try {
        // 并行获取项目信息和场景地点列表（提升加载速度）
        const [projectRes, locationsRes] = await Promise.all([
          fetch(`/api/projects/${projectId}`),
          fetch(`/api/projects/${projectId}/locations`),
        ]);

        const [projectData, locationsData] = await Promise.all([
          projectRes.json(),
          locationsRes.json(),
        ]);

        if (projectData.success) {
          setProject(projectData.data);

          // 路由保护：如果状态不是 locations_pending 或更高，跳转到正确页面
          const status = projectData.data.status;
          if (status === "title_characters_pending") {
            router.replace(`/projects/${projectId}/script`);
            return;
          } else if (status === "scenes_pending" || status === "storyboard_ready") {
            router.replace(`/projects/${projectId}/scenes`);
            return;
          }
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

  // 添加新场景地点
  const handleAddLocation = async () => {
    try {
      const res = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          name: "新场景",
          description: "",
        }),
      });

      const data = await res.json();
      if (data.success) {
        setLocations([...locations, data.data]);
      } else {
        alert(data.error || "添加场景失败");
      }
    } catch (error) {
      console.error("添加场景失败:", error);
      alert("添加场景失败");
    }
  };

  // 更新场景地点
  const handleUpdateLocation = async (
    locationId: string,
    updates: {
      name?: string;
      description?: string;
      basePrompt?: string;
    }
  ) => {
    try {
      const res = await fetch(`/api/locations/${locationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      const data = await res.json();
      if (data.success) {
        setLocations(
          locations.map((loc) => (loc.id === locationId ? data.data : loc))
        );
      }
    } catch (error) {
      console.error("更新场景失败:", error);
    }
  };

  // 删除场景地点
  const handleDeleteLocation = async (locationId: string) => {
    if (!confirm("确定要删除此场景吗？关联的镜头将变为未分配状态。")) return;

    try {
      const res = await fetch(`/api/locations/${locationId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (data.success) {
        setLocations(locations.filter((loc) => loc.id !== locationId));
      } else {
        alert(data.error || "删除场景失败");
      }
    } catch (error) {
      console.error("删除场景失败:", error);
      alert("删除场景失败");
    }
  };

  // 删除场景图（仅删除图片，保留场景）
  const handleDeleteBackground = async (locationId: string) => {
    if (!confirm("确定要删除这个场景图吗？场景信息会保留。")) return;

    try {
      const res = await fetch(`/api/locations/${locationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referenceImageUrl: null,
          viewMainUrl: null,
          viewReverseUrl: null,
          panoramaUrl: null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setLocations(
          locations.map((loc) =>
            loc.id === locationId
              ? {
                  ...loc,
                  reference_image_url: null,
                  view_main_url: null,
                  view_reverse_url: null,
                  panorama_url: null,
                }
              : loc
          )
        );
      } else {
        alert(data.error || "删除场景图失败");
      }
    } catch (error) {
      console.error("删除场景图失败:", error);
      alert("删除场景图失败");
    }
  };

  // 生成空景参考图 (16:9 横版)
  const handleGenerateBackground = async (locationId: string) => {
    const location = locations.find((loc) => loc.id === locationId);
    if (!location?.name && !location?.description && !location?.base_prompt) {
      alert("请先填写场景描述");
      return;
    }

    setGeneratingId(locationId);

    try {
      const res = await fetch(`/api/locations/${locationId}/generate-background`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          style: project?.style_config?.artStyle || "anime",
          mode: "panorama", // 16:9 横版模式
        }),
      });

      const data = await res.json();
      if (data.success) {
        setLocations(
          locations.map((loc) =>
            loc.id === locationId
              ? {
                  ...loc,
                  reference_image_url: data.data.panoramaUrl || data.data.imageUrl,
                  view_main_url: data.data.viewMainUrl || null,
                  view_reverse_url: data.data.viewReverseUrl || null,
                  panorama_url: data.data.panoramaUrl || null,
                }
              : loc
          )
        );
      } else {
        alert(data.error || "生成失败");
      }
    } catch (error) {
      console.error("生成场景图失败:", error);
      alert("生成场景图失败");
    } finally {
      setGeneratingId(null);
    }
  };

  // 确认并继续到分镜生成
  const handleConfirmAndContinue = async () => {
    setIsSaving(true);
    try {
      // 更新项目状态为分镜待生成
      await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "scenes_pending" }),
      });

      // 跳转到分镜生成页
      router.push(`/projects/${projectId}/scenes`);
    } catch (error) {
      console.error("保存失败:", error);
      alert("保存失败");
    } finally {
      setIsSaving(false);
    }
  };

  // AI 生成场景
  const handleGenerateLocations = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/generate-locations`, {
        method: "POST",
      });

      const data = await res.json();
      if (data.success) {
        // 重新加载场景
        const locationsRes = await fetch(`/api/projects/${projectId}/locations`);
        const locationsData = await locationsRes.json();
        if (locationsData.success) {
          setLocations(locationsData.data || []);
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
      setIsSaving(false);
    }
  };

  // 重新生成场景
  const handleRegenerateLocations = async () => {
    if (!confirm("重新生成将覆盖当前的场景，确定继续吗？")) {
      return;
    }
    await handleGenerateLocations();
  };

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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/projects">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">步骤2：场景设定</h1>
              <p className="text-muted-foreground text-sm">
                {project?.title || "未命名项目"}
              </p>
            </div>
          </div>
        </div>

        {/* 步骤指示器 */}
        <StepIndicator
          steps={WORKFLOW_STEPS as unknown as { id: string; label: string }[]}
          currentStep={project?.status || "locations_pending"}
        />
      </div>

      {/* 说明 */}
      <div className="mb-6 p-4 bg-muted/50 rounded-lg">
        <p className="text-sm text-muted-foreground">
          {locations.length === 0
            ? "点击「AI 生成场景」，让 AI 根据标题和角色自动生成场景。"
            : "请确认和编辑场景地点信息。为每个场景生成空景参考图，可以提高后续镜头生成时背景的一致性。"}
        </p>
      </div>

      {/* 场景列表 */}
      <div className="space-y-6 mb-8">
        {locations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">暂无场景地点</p>
              <Button onClick={handleAddLocation}>
                <Plus className="h-4 w-4 mr-2" />
                添加场景
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* 已有场景图的场景 */}
            {locations.filter(loc => loc.panorama_url || loc.view_main_url || loc.reference_image_url).length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <h3 className="text-sm font-medium text-muted-foreground">
                    已有场景图的场景
                  </h3>
                </div>
                <div className="space-y-4">
                  {locations
                    .filter(loc => loc.panorama_url || loc.view_main_url || loc.reference_image_url)
                    .map((location) => (
                      <LocationCard
                        key={location.id}
                        location={location}
                        onUpdate={(updates) => handleUpdateLocation(location.id, updates)}
                        onDelete={() => handleDeleteLocation(location.id)}
                        onDeleteBackground={() => handleDeleteBackground(location.id)}
                        onGenerateBackground={() => handleGenerateBackground(location.id)}
                        onPreviewImage={(url) => setPreviewImage({ url, name: location.name })}
                        onDownload={() => {
                          if (location.panorama_url) {
                            handleDownloadImage(location.panorama_url, location.name);
                          } else if (location.reference_image_url) {
                            handleDownloadImage(location.reference_image_url, location.name);
                          }
                        }}
                        isGenerating={generatingId === location.id}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* 需要生成场景图的场景 */}
            {locations.filter(loc => !loc.panorama_url && !loc.view_main_url && !loc.reference_image_url).length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-orange-500" />
                  <h3 className="text-sm font-medium text-muted-foreground">
                    需要生成场景图的场景
                  </h3>
                </div>
                <div className="space-y-4">
                  {locations
                    .filter(loc => !loc.panorama_url && !loc.view_main_url && !loc.reference_image_url)
                    .map((location) => (
                      <LocationCard
                        key={location.id}
                        location={location}
                        onUpdate={(updates) => handleUpdateLocation(location.id, updates)}
                        onDelete={() => handleDeleteLocation(location.id)}
                        onDeleteBackground={() => handleDeleteBackground(location.id)}
                        onGenerateBackground={() => handleGenerateBackground(location.id)}
                        onPreviewImage={(url) => setPreviewImage({ url, name: location.name })}
                        onDownload={() => {
                          if (location.panorama_url) {
                            handleDownloadImage(location.panorama_url, location.name);
                          } else if (location.reference_image_url) {
                            handleDownloadImage(location.reference_image_url, location.name);
                          }
                        }}
                        isGenerating={generatingId === location.id}
                      />
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 底部操作 */}
      <div className="flex items-center justify-between border-t pt-6">
        <div className="flex items-center gap-2">
          {locations.length === 0 ? (
            <Button
              variant="outline"
              onClick={handleGenerateLocations}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  AI 生成场景
                </>
              )}
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleAddLocation}>
                <Plus className="h-4 w-4 mr-2" />
                添加场景
              </Button>
              <Button
                variant="outline"
                onClick={handleRegenerateLocations}
                disabled={isSaving}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                重新生成场景
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleConfirmAndContinue}
            disabled={locations.length === 0 || isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                处理中...
              </>
            ) : (
              <>
                确认并继续
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 图片预览弹窗 */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <DialogTitle className="sr-only">
            {previewImage?.name || "图片预览"}
          </DialogTitle>
          <div className="relative">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-black/60 text-white
                flex items-center justify-center hover:bg-black/80 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            {previewImage && (
              <img
                src={previewImage.url}
                alt={previewImage.name}
                className="w-full max-h-[80vh] object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 场景卡片组件
interface LocationCardProps {
  location: Location;
  onUpdate: (updates: {
    name?: string;
    description?: string;
    basePrompt?: string;
  }) => void;
  onDelete: () => void;
  onDeleteBackground: () => void;  // 仅删除场景图
  onGenerateBackground: () => void;
  onPreviewImage: (url: string) => void;
  onDownload: () => void;
  isGenerating: boolean;
}

function LocationCard({
  location,
  onUpdate,
  onDelete,
  onDeleteBackground,
  onGenerateBackground,
  onPreviewImage,
  onDownload,
  isGenerating,
}: LocationCardProps) {
  const [name, setName] = useState(location.name || "");
  const [description, setDescription] = useState(location.description || "");

  // 防抖更新
  useEffect(() => {
    const timer = setTimeout(() => {
      if (name !== location.name) {
        onUpdate({ name });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [name, location.name, onUpdate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (description !== (location.description || "")) {
        onUpdate({ description });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [description, location.description, onUpdate]);

  // 获取场景图（16:9 或兼容旧版 reference_image_url）
  const currentImage = location.panorama_url || location.reference_image_url;
  const hasImage = !!currentImage;
  const hasDescription = name || description;

  // 下载场景图
  const handleDownload = async () => {
    if (!currentImage) return;

    try {
      const response = await fetch(currentImage);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `${location.name || "location"}_16x9.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("下载失败:", error);
      alert("下载失败");
    }
  };

  return (
    <Card>
      <CardContent className="p-5">
        <div className="space-y-4">
          {/* 上方：场景信息 */}
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 mr-2">
                <Label className="text-xs text-muted-foreground">场景名称</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="输入场景名称"
                  className="mt-1"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive mt-5"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">场景描述</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="描述场景的环境、氛围..."
                className="mt-1 min-h-[60px] resize-none"
              />
            </div>

          </div>

          {/* 下方：场景图 (16:9) */}
          <div>
            {isGenerating ? (
              <div className="w-full aspect-video rounded-lg border-2 border-dashed border-primary/50
                flex flex-col items-center justify-center gap-2 bg-primary/5">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-xs text-primary">生成场景图中...</span>
              </div>
            ) : hasImage ? (
              <div className="space-y-2">
                {/* 图片显示区域 - 16:9 */}
                <button
                  onClick={() => currentImage && onPreviewImage(currentImage)}
                  className="relative w-full rounded-lg overflow-hidden border group cursor-pointer aspect-video"
                >
                  <img
                    src={currentImage}
                    alt={location.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2">
                    <div className="flex items-center justify-between">
                      {location.name && (
                        <p className="text-white text-sm font-medium truncate">{location.name}</p>
                      )}
                      <span className="text-white/70 text-xs">16:9</span>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>

                {/* 操作按钮 */}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-8" onClick={onGenerateBackground}>
                    <RefreshCw className="h-3 w-3 mr-1.5" />
                    重新生成
                  </Button>
                  <Button variant="outline" size="sm" className="h-8" onClick={handleDownload}>
                    <Download className="h-3 w-3 mr-1.5" />
                    下载
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
                    onClick={onDeleteBackground}
                  >
                    <Trash2 className="h-3 w-3 mr-1.5" />
                    删除
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={onGenerateBackground}
                disabled={!hasDescription}
                className={`group relative w-full aspect-video rounded-lg border-2
                  flex flex-col items-center justify-center gap-3
                  transition-all duration-300
                  ${hasDescription
                    ? "border-dashed text-muted-foreground animate-breathing-border hover:border-solid hover:border-foreground/50 hover:bg-muted/50 hover:text-foreground hover:shadow-[0_0_20px_rgba(0,0,0,0.1)]"
                    : "border-dashed border-muted-foreground/30 text-muted-foreground/50 opacity-50 cursor-not-allowed"
                  }`}
              >
                {/* 呼吸光晕背景 - 仅在有描述时显示 */}
                {hasDescription && (
                  <div className="absolute inset-0 rounded-lg animate-breathing-glow
                    group-hover:opacity-100 group-hover:bg-muted/30 group-hover:animate-none transition-all" />
                )}

                {/* 浮动小星星 - 仅在有描述时显示 */}
                {hasDescription && (
                  <div className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none
                    group-hover:opacity-0 transition-opacity duration-300">
                    <span className="absolute top-4 left-8 text-[10px] text-muted-foreground/40 animate-sparkle-float-1">✦</span>
                    <span className="absolute top-6 right-12 text-[8px] text-muted-foreground/30 animate-sparkle-float-2">✦</span>
                    <span className="absolute bottom-8 left-16 text-[9px] text-muted-foreground/35 animate-sparkle-float-3">✦</span>
                    <span className="absolute bottom-6 right-8 text-[10px] text-muted-foreground/40 animate-sparkle-float-4">✦</span>
                    <span className="absolute top-1/2 left-1/4 text-[8px] text-muted-foreground/30 animate-sparkle-float-2">✦</span>
                    <span className="absolute top-1/3 right-1/4 text-[9px] text-muted-foreground/35 animate-sparkle-float-3">✦</span>
                  </div>
                )}

                {/* Sparkles 图标 */}
                <Sparkles className={`relative h-8 w-8 transition-all duration-300
                  ${hasDescription
                    ? "animate-breathing-icon group-hover:animate-none group-hover:scale-110 group-hover:text-foreground"
                    : "text-muted-foreground/50"
                  }`} />

                {/* 文字 */}
                <span className={`relative text-sm transition-colors duration-300
                  ${hasDescription ? "group-hover:text-foreground" : ""}`}>
                  点击生成场景图
                </span>

                {/* 手指图标 - 在文字下方浮动 */}
                {hasDescription && (
                  <MousePointerClick className="h-5 w-5 animate-finger-float
                    group-hover:animate-none group-hover:text-foreground/70 transition-colors" />
                )}
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
