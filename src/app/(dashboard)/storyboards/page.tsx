"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LayoutGrid, Image, Copy, Trash2, Pencil, Loader2, Eye, Download, X, Check } from "lucide-react";

interface Storyboard {
  id: string;
  project_id: string | null;
  scene_id: string | null;
  name: string | null;
  description: string | null;
  image_url: string;
  prompt: string | null;
  shot_type: string | null;
  camera_movement: string | null;
  art_style: string | null;
  aspect_ratio: string | null;
  tags: string[] | null;
  confirmed: boolean;
  metadata: Record<string, unknown> | null;
  project_title: string | null;
  created_at: string;
}

interface Project {
  id: string;
  title: string | null;
}

export default function StoryboardsLibraryPage() {
  const [storyboards, setStoryboards] = useState<Storyboard[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterProjectId, setFilterProjectId] = useState<string>("");

  // 复用弹窗状态
  const [reuseStoryboard, setReuseStoryboard] = useState<Storyboard | null>(null);
  const [targetProjectId, setTargetProjectId] = useState<string>("");
  const [isReusing, setIsReusing] = useState(false);

  // 预览弹窗状态
  const [previewStoryboard, setPreviewStoryboard] = useState<Storyboard | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // 加载分镜图列表
  const fetchStoryboards = async (projectId?: string) => {
    try {
      const url = projectId
        ? `/api/storyboards?projectId=${projectId}`
        : "/api/storyboards";
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setStoryboards(data.data || []);
      }
    } catch (error) {
      console.error("获取分镜图列表失败:", error);
    }
  };

  // 加载项目列表（用于筛选和复用）
  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/projects");
      const data = await response.json();

      if (data.success) {
        setProjects(data.data.projects || []);
      }
    } catch (error) {
      console.error("获取项目列表失败:", error);
    }
  };

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      await Promise.all([fetchStoryboards(), fetchProjects()]);
      setIsLoading(false);
    }
    loadData();
  }, []);

  // 筛选项目变化
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const projectId = e.target.value;
    setFilterProjectId(projectId);
    fetchStoryboards(projectId || undefined);
  };

  // 删除分镜图
  const handleDelete = async (storyboardId: string) => {
    if (!confirm("确定要删除此分镜图吗？")) return;

    try {
      const response = await fetch(`/api/storyboards/${storyboardId}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.success) {
        setStoryboards((prev) => prev.filter((s) => s.id !== storyboardId));
      } else {
        alert(data.error || "删除失败");
      }
    } catch (error) {
      console.error("删除分镜图失败:", error);
      alert("删除失败");
    }
  };

  // 复用分镜图到其他项目（创建副本）
  const handleReuse = async () => {
    if (!reuseStoryboard || !targetProjectId) return;

    setIsReusing(true);
    try {
      const response = await fetch("/api/storyboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: targetProjectId,
          name: reuseStoryboard.name,
          description: reuseStoryboard.description,
          imageUrl: reuseStoryboard.image_url,
          prompt: reuseStoryboard.prompt,
          shotType: reuseStoryboard.shot_type,
          cameraMovement: reuseStoryboard.camera_movement,
          artStyle: reuseStoryboard.art_style,
          aspectRatio: reuseStoryboard.aspect_ratio,
          tags: reuseStoryboard.tags,
          metadata: reuseStoryboard.metadata,
          confirmed: true,
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert("分镜图复用成功！");
        setReuseStoryboard(null);
        setTargetProjectId("");
        // 刷新列表
        fetchStoryboards(filterProjectId || undefined);
      } else {
        alert(data.error || "复用失败");
      }
    } catch (error) {
      console.error("复用分镜图失败:", error);
      alert("复用失败");
    } finally {
      setIsReusing(false);
    }
  };

  // 开始编辑分镜图信息
  const startEditing = () => {
    if (previewStoryboard) {
      setEditName(previewStoryboard.name || "");
      setEditDescription(previewStoryboard.description || "");
      setIsEditing(true);
    }
  };

  // 取消编辑
  const cancelEditing = () => {
    setIsEditing(false);
    setEditName("");
    setEditDescription("");
  };

  // 保存分镜图信息
  const saveStoryboardInfo = async () => {
    if (!previewStoryboard || !editName.trim()) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/storyboards/${previewStoryboard.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim(),
        }),
      });

      const data = await response.json();
      if (data.success) {
        // 更新本地状态
        const updatedStoryboard = {
          ...previewStoryboard,
          name: editName.trim(),
          description: editDescription.trim(),
        };
        setPreviewStoryboard(updatedStoryboard);
        setStoryboards((prev) =>
          prev.map((s) =>
            s.id === previewStoryboard.id ? updatedStoryboard : s
          )
        );
        setIsEditing(false);
      } else {
        alert(data.error || "保存失败");
      }
    } catch (error) {
      console.error("保存分镜图信息失败:", error);
      alert("保存失败");
    } finally {
      setIsSaving(false);
    }
  };

  // 下载分镜图
  const handleDownload = async (storyboard: Storyboard) => {
    const imageUrl = storyboard.image_url;
    if (!imageUrl) return;

    try {
      // 检查是否是 base64 图片
      if (imageUrl.startsWith("data:")) {
        const a = document.createElement("a");
        a.href = imageUrl;
        a.download = `${storyboard.name || "分镜图"}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }

      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${storyboard.name || "分镜图"}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("下载失败:", error);
      // 回退方案：直接打开图片链接
      window.open(imageUrl, "_blank");
    }
  };

  // 构建筛选选项
  const filterOptions = [
    { value: "", label: "全部项目" },
    ...projects.map((p) => ({
      value: p.id,
      label: p.title || "未命名项目",
    })),
  ];

  // 构建目标项目选项（排除当前分镜图所在项目）
  const targetProjectOptions = projects
    .filter((p) => p.id !== reuseStoryboard?.project_id)
    .map((p) => ({
      value: p.id,
      label: p.title || "未命名项目",
    }));

  return (
    <div className="max-w-6xl mx-auto">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <LayoutGrid className="h-8 w-8 text-primary" />
            分镜图库
          </h1>
          <p className="text-muted-foreground mt-1">
            管理所有项目中的分镜图，支持跨项目复用
          </p>
        </div>

        {/* 筛选 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">筛选项目：</span>
          <Select
            options={filterOptions}
            value={filterProjectId}
            onChange={handleFilterChange}
            className="w-48"
          />
        </div>
      </div>

      {/* 内容 */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border p-4 space-y-3">
              <Skeleton className="h-40 w-full rounded-lg" />
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : storyboards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-6 mb-4">
            <Image className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">暂无分镜图</h3>
          <p className="text-muted-foreground max-w-sm">
            在项目详情页点击"保存到分镜库"按钮，将满意的分镜图添加到这里
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {storyboards.map((storyboard) => (
            <StoryboardLibraryCard
              key={storyboard.id}
              storyboard={storyboard}
              onDelete={() => handleDelete(storyboard.id)}
              onReuse={() => {
                setReuseStoryboard(storyboard);
                setTargetProjectId("");
              }}
              onPreview={() => setPreviewStoryboard(storyboard)}
              onDownload={() => handleDownload(storyboard)}
            />
          ))}
        </div>
      )}

      {/* 复用弹窗 */}
      <Dialog
        open={!!reuseStoryboard}
        onOpenChange={() => setReuseStoryboard(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>复用分镜图到其他项目</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              将分镜图 <strong>{reuseStoryboard?.name || "未命名"}</strong> 复制到其他项目
            </p>

            <div className="space-y-2">
              <label className="text-sm font-medium">选择目标项目</label>
              {targetProjectOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">没有可选的项目</p>
              ) : (
                <Select
                  options={[
                    { value: "", label: "请选择项目" },
                    ...targetProjectOptions,
                  ]}
                  value={targetProjectId}
                  onChange={(e) => setTargetProjectId(e.target.value)}
                />
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setReuseStoryboard(null)}
              disabled={isReusing}
            >
              取消
            </Button>
            <Button
              onClick={handleReuse}
              disabled={!targetProjectId || isReusing}
            >
              {isReusing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  复制中...
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  确认复用
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 预览弹窗 */}
      <Dialog
        open={!!previewStoryboard}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewStoryboard(null);
            setIsEditing(false);
            setEditName("");
            setEditDescription("");
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          {previewStoryboard && (
            <div className="relative">
              {/* 关闭按钮 */}
              <button
                onClick={() => {
                  setPreviewStoryboard(null);
                  setIsEditing(false);
                  setEditName("");
                  setEditDescription("");
                }}
                className="absolute top-4 right-4 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              {/* 图片预览 */}
              <div className="flex items-center justify-center bg-black min-h-[300px] max-h-[60vh]">
                <img
                  src={previewStoryboard.image_url}
                  alt={previewStoryboard.name || "分镜图"}
                  className="max-w-full max-h-[60vh] object-contain"
                />
              </div>

              {/* 底部信息栏 */}
              <div className="p-4 bg-background border-t">
                {isEditing ? (
                  // 编辑模式
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">
                        分镜名称
                      </label>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="输入分镜名称"
                        className="h-9"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">
                        场景描述
                      </label>
                      <Textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="描述这个分镜的内容..."
                        rows={3}
                        className="resize-none"
                      />
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <p className="text-xs text-muted-foreground">
                        来自项目：{previewStoryboard.project_id ? (previewStoryboard.project_title || "未命名项目") : "独立分镜"}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={cancelEditing}
                          disabled={isSaving}
                        >
                          取消
                        </Button>
                        <Button
                          size="sm"
                          onClick={saveStoryboardInfo}
                          disabled={!editName.trim() || isSaving}
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              保存中
                            </>
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              保存
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // 查看模式
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold">
                        {previewStoryboard.name || "未命名分镜"}
                      </h3>
                      {previewStoryboard.description ? (
                        <p className="text-sm text-muted-foreground mt-1">
                          {previewStoryboard.description}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground/50 mt-1 italic">
                          暂无描述，点击编辑添加
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {previewStoryboard.shot_type && (
                          <span className="text-xs bg-muted px-2 py-0.5 rounded">
                            {previewStoryboard.shot_type}
                          </span>
                        )}
                        {previewStoryboard.camera_movement && (
                          <span className="text-xs bg-muted px-2 py-0.5 rounded">
                            {previewStoryboard.camera_movement}
                          </span>
                        )}
                        {previewStoryboard.art_style && (
                          <span className="text-xs bg-muted px-2 py-0.5 rounded">
                            {previewStoryboard.art_style}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        来自项目：{previewStoryboard.project_id ? (previewStoryboard.project_title || "未命名项目") : "独立分镜"}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={startEditing}
                      className="ml-2 shrink-0"
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      编辑
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 分镜图卡片组件
interface StoryboardLibraryCardProps {
  storyboard: Storyboard;
  onDelete: () => void;
  onReuse: () => void;
  onPreview: () => void;
  onDownload: () => void;
}

function StoryboardLibraryCard({
  storyboard,
  onDelete,
  onReuse,
  onPreview,
  onDownload,
}: StoryboardLibraryCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow group">
      {/* 分镜图片 */}
      <div
        className="aspect-video bg-muted relative cursor-pointer"
        onClick={onPreview}
      >
        <img
          src={storyboard.image_url}
          alt={storyboard.name || "分镜图"}
          className="w-full h-full object-cover"
        />
        {/* 分镜名称标签 */}
        {storyboard.name && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-3">
            <p className="text-white text-sm font-medium truncate">
              {storyboard.name}
            </p>
          </div>
        )}
        {/* 悬停遮罩 */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPreview();
              }}
              className="rounded-full bg-white/90 p-2 hover:bg-white transition-colors"
              title="查看大图"
            >
              <Eye className="h-5 w-5 text-gray-700" />
            </button>
          </div>
        </div>
      </div>

      <CardContent className="p-4">
        {/* 分镜名称 */}
        <h3 className="font-medium truncate">{storyboard.name || "未命名分镜"}</h3>

        {/* 场景描述 */}
        {storyboard.description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {storyboard.description}
          </p>
        )}

        {/* 标签 */}
        <div className="flex flex-wrap gap-1 mt-2">
          {storyboard.shot_type && (
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
              {storyboard.shot_type}
            </span>
          )}
          {storyboard.art_style && (
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
              {storyboard.art_style}
            </span>
          )}
        </div>

        {/* 所属项目 */}
        <p className="text-xs text-muted-foreground mt-2">
          项目：{storyboard.project_id ? (storyboard.project_title || "未命名项目") : "独立分镜"}
        </p>

        {/* 操作按钮 */}
        <div className="flex items-center gap-1 mt-3 pt-3 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1"
            onClick={onDownload}
            title="下载分镜图"
          >
            <Download className="h-4 w-4 mr-1" />
            下载
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1"
            onClick={onReuse}
            title="复用到其他项目"
          >
            <Copy className="h-4 w-4 mr-1" />
            复用
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={onDelete}
            title="删除"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
