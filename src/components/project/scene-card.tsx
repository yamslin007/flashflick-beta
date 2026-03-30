"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogBody,
} from "@/components/ui/dialog";
import {
  Check,
  X,
  RefreshCw,
  Play,
  Pencil,
  Clock,
  Loader2,
  ListOrdered,
  ImageIcon,
  Plus,
  Trash2,
  Scissors,
  ZoomIn,
  Download,
  FolderPlus,
} from "lucide-react";

// 状态映射
const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" }> = {
  pending: { label: "等待生成", variant: "secondary" },
  generating_image: { label: "生成图片", variant: "warning" },
  regenerating: { label: "重新生成", variant: "warning" },
  image_ready: { label: "预览就绪", variant: "default" },
  image_failed: { label: "生成失败", variant: "destructive" },
  user_review: { label: "待审核", variant: "default" },
  generating_video: { label: "生成视频", variant: "warning" },
  completed: { label: "已完成", variant: "success" },
  failed: { label: "失败", variant: "destructive" },
  video_failed: { label: "视频生成失败", variant: "destructive" },
  rejected: { label: "已拒绝", variant: "destructive" },
  queued: { label: "排队中", variant: "secondary" },
};

// 镜头类型显示名称（用于旧数据兼容显示）
const SHOT_TYPE_LABELS: Record<string, string> = {
  close_up: "特写",
  medium_shot: "中景",
  wide_shot: "全景",
  extreme_wide: "远景",
};

// 镜头运动显示名称
const CAMERA_MOVEMENT_LABELS: Record<string, string> = {
  static: "静止",
  pan_left: "左移",
  pan_right: "右移",
  zoom_in: "推近",
  zoom_out: "拉远",
  slow_zoom_out: "缓拉远",
  tracking: "跟随",
};

// 编辑数据接口
export interface SceneEditData {
  description: string;
  shot_type?: string;
  camera_movement?: string;
  duration: number;
  location_id: string | null;
}

// 场景地点接口
interface LocationOption {
  id: string;
  name: string;
  reference_image_url: string | null;
}

// Zapiwala Cut 类型
interface ZapiwalaCut {
  cutIndex: number;
  cameraAngle: string;
  visualDescription: string;
  character?: {
    name: string;
    look: string;
    emotion: string;
    dialogue: string;
    cameraFocus: string;
    lipSyncAction: string;
  };
}

/**
 * 格式化 Zapiwala 场景数据为显示文本
 */
function formatZapiwalaDisplay(scene: {
  bgm?: string | null;
  sfx?: string | null;
  pacing?: string | null;
  cuts?: ZapiwalaCut[] | null;
  dialogue_order_lock?: string[] | null;
}): string {
  const lines: string[] = [];

  // 音频层
  if (scene.bgm) {
    lines.push(`🎵 BGM: ${scene.bgm}`);
  }
  if (scene.sfx) {
    lines.push(`🔊 SFX: ${scene.sfx}`);
  }
  if (scene.pacing) {
    lines.push(`⏱ Pacing: ${scene.pacing}`);
  }

  // 添加空行分隔
  if (lines.length > 0 && scene.cuts && scene.cuts.length > 0) {
    lines.push("");
  }

  // Multi-Cut 结构
  if (scene.cuts && scene.cuts.length > 0) {
    scene.cuts.forEach((cut) => {
      if (cut.character?.dialogue) {
        // 有对白的 Cut
        lines.push(
          `Cut ${cut.cutIndex + 1}: ${cut.character.name} (${cut.character.look}; ${cut.character.emotion}): "${cut.character.dialogue}" (${cut.character.cameraFocus}; ${cut.character.lipSyncAction})`
        );
      } else if (cut.character) {
        // 有角色但无对白的 Cut
        lines.push(
          `Cut ${cut.cutIndex + 1}: [${cut.cameraAngle}] ${cut.visualDescription} - ${cut.character.name} (${cut.character.look}; ${cut.character.emotion})`
        );
      } else {
        // 纯环境的 Cut
        lines.push(`Cut ${cut.cutIndex + 1}: [${cut.cameraAngle}] ${cut.visualDescription}`);
      }
    });
  }

  // 对话顺序锁
  if (scene.dialogue_order_lock && scene.dialogue_order_lock.length > 0) {
    lines.push("");
    lines.push(`Dialogue_order_lock=[${scene.dialogue_order_lock.join(", ")}]`);
  }

  return lines.join("\n");
}

interface SceneCardProps {
  scene: {
    id: string;
    scene_index: number;
    duration: number;
    shot_type: string | null;
    camera_movement: string | null;
    description: string | null;
    status: string;
    preview_image_url: string | null;
    video_url: string | null;
    user_approved: boolean;
    location_id: string | null;
    // Zapiwala 新增字段
    bgm?: string | null;
    sfx?: string | null;
    pacing?: string | null;
    cuts?: ZapiwalaCut[] | null;
    dialogue_order_lock?: string[] | null;
  };
  locations?: LocationOption[];
  onApprove?: (sceneId: string) => void;
  onReject?: (sceneId: string, feedback: string) => void;
  onRegenerate?: (sceneId: string) => void;
  onGenerateImage?: (sceneId: string) => void;
  onGenerateVideo?: (sceneId: string) => void;
  onReset?: (sceneId: string) => void;
  onEdit?: (sceneId: string, data: SceneEditData, autoRegenerate: boolean) => Promise<void>;
  onInsertBefore?: (sceneIndex: number) => void;
  onInsertAfter?: (sceneIndex: number) => void;
  onDelete?: (sceneId: string) => void;
  onTrim?: (sceneId: string) => void;
  onSaveToLibrary?: (sceneId: string) => void;
  isGeneratingImage?: boolean;
  isGeneratingVideo?: boolean;
  isSavingToLibrary?: boolean;
  isApproving?: boolean;
  queuePosition?: number;
  isBatchMode?: boolean;
}

export function SceneCard({
  scene,
  locations,
  onApprove,
  onReject,
  onRegenerate,
  onGenerateImage,
  onGenerateVideo,
  onReset,
  onEdit,
  onInsertBefore,
  onInsertAfter,
  onDelete,
  onTrim,
  onSaveToLibrary,
  isGeneratingImage,
  isGeneratingVideo,
  isSavingToLibrary,
  isApproving,
  queuePosition,
  isBatchMode
}: SceneCardProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isFeedbackMode, setIsFeedbackMode] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // 编辑表单状态（镜头类型和运动由 AI 自动生成）
  const [editForm, setEditForm] = useState<SceneEditData>({
    description: scene.description || "",
    duration: scene.duration,
    location_id: scene.location_id || null,
  });
  const [autoRegenerate, setAutoRegenerate] = useState(false);

  const status = statusConfig[scene.status] || statusConfig.pending;
  const hasImage = !!scene.preview_image_url;

  // 当打开编辑对话框时，重置表单
  useEffect(() => {
    if (isEditDialogOpen) {
      setEditForm({
        description: scene.description || "",
        duration: scene.duration,
        location_id: scene.location_id || null,
      });
      setAutoRegenerate(false);
    }
  }, [isEditDialogOpen, scene]);

  // 判断是否可以编辑（正在生成时禁用）
  const canEdit = !isBatchMode &&
    scene.status !== "generating_image" &&
    scene.status !== "regenerating" &&
    scene.status !== "generating_video";

  const handleGenerateVideoClick = () => {
    if (onGenerateVideo) {
      onGenerateVideo(scene.id);
    }
  };

  const handlePlayClick = () => {
    setIsPlaying(true);
  };

  const handleVideoEnd = () => {
    setIsPlaying(false);
  };

  const handleReject = () => {
    if (onReject && feedback.trim()) {
      onReject(scene.id, feedback);
      setFeedback("");
      setIsFeedbackMode(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!onEdit) return;

    // 简单验证
    if (!editForm.description.trim()) {
      alert("场景描述不能为空");
      return;
    }
    if (editForm.duration < 1 || editForm.duration > 15) {
      alert("时长必须在 1-15 秒之间");
      return;
    }

    setIsSaving(true);
    try {
      await onEdit(scene.id, editForm, autoRegenerate);
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error("保存失败:", error);
      alert("保存失败，请重试");
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenEditDialog = () => {
    if (canEdit) {
      setIsEditDialogOpen(true);
    }
  };

  // ==================== 插入按钮组件 ====================
  const InsertButtons = () => (
    <>
      {/* 左侧插入按钮 */}
      {onInsertBefore && (
        <button
          onClick={() => onInsertBefore(scene.scene_index)}
          className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10
            w-7 h-7 rounded-full bg-primary/80 text-primary-foreground
            flex items-center justify-center
            opacity-0 group-hover:opacity-40 hover:!opacity-100
            transition-opacity duration-200
            shadow-md hover:shadow-lg hover:scale-110"
          title="在此前插入场景"
        >
          <Plus className="h-4 w-4" />
        </button>
      )}
      {/* 右侧插入按钮 */}
      {onInsertAfter && (
        <button
          onClick={() => onInsertAfter(scene.scene_index)}
          className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 z-10
            w-7 h-7 rounded-full bg-primary/80 text-primary-foreground
            flex items-center justify-center
            opacity-0 group-hover:opacity-40 hover:!opacity-100
            transition-opacity duration-200
            shadow-md hover:shadow-lg hover:scale-110"
          title="在此后插入场景"
        >
          <Plus className="h-4 w-4" />
        </button>
      )}
    </>
  );

  // ==================== 无图状态布局 ====================
  if (!hasImage) {
    return (
      <>
        <div className="relative group">
          <InsertButtons />
          <Card className="overflow-hidden">
          <CardContent className="p-4">
            {/* 顶部：序号 + 状态 */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline">#{scene.scene_index + 1}</Badge>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {scene.duration}秒
              </div>
            </div>

            {/* 场景描述 - 可点击编辑 */}
            <div
              onClick={handleOpenEditDialog}
              className={`
                mb-3 p-3 rounded-md border bg-muted/30 min-h-[80px]
                ${canEdit ? "cursor-pointer hover:bg-muted/50 hover:border-primary/50 transition-colors group" : ""}
              `}
            >
              <div className="flex items-start justify-between">
                {/* Zapiwala 格式：显示完整的音频层 + Multi-Cut 结构 */}
                {scene.cuts && scene.cuts.length > 0 ? (
                  <pre className="text-xs text-foreground whitespace-pre-wrap font-mono flex-1 max-h-[200px] overflow-y-auto">
                    {formatZapiwalaDisplay(scene)}
                  </pre>
                ) : (
                  <p className="text-sm text-foreground line-clamp-3 flex-1">
                    {scene.description || "点击添加场景描述..."}
                  </p>
                )}
                {canEdit && (
                  <Pencil className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0" />
                )}
              </div>
            </div>

            {/* 镜头信息 + 删除按钮 */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex gap-3 text-xs text-muted-foreground">
                {/* Zapiwala: 显示 cuts 数量 */}
                {scene.cuts && scene.cuts.length > 0 ? (
                  <>
                    <span>{scene.cuts.length} 个镜头</span>
                    {scene.bgm && <span title={scene.bgm}>🎵</span>}
                    {scene.sfx && <span title={scene.sfx}>🔊</span>}
                  </>
                ) : (
                  <>
                    <span>镜头: {SHOT_TYPE_LABELS[scene.shot_type || "medium_shot"] || "中景"}</span>
                    <span>运动: {CAMERA_MOVEMENT_LABELS[scene.camera_movement || "static"] || "静止"}</span>
                  </>
                )}
              </div>
              {onDelete && (
                <button
                  onClick={() => {
                    if (confirm(`确定要删除场景 #${scene.scene_index + 1} 吗？`)) {
                      onDelete(scene.id);
                    }
                  }}
                  className="text-muted-foreground/50 hover:text-destructive transition-colors p-1"
                  title="删除此场景"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* 场景选择 */}
            {locations && locations.length > 0 && (
              <div className="mb-3">
                <select
                  value={editForm.location_id || ""}
                  onChange={(e) => {
                    const newLocationId = e.target.value || null;
                    setEditForm({ ...editForm, location_id: newLocationId });
                    if (onEdit) {
                      onEdit(scene.id, { ...editForm, location_id: newLocationId }, false);
                    }
                  }}
                  className="w-full text-xs border rounded-md px-2 py-1.5 bg-background text-foreground"
                >
                  <option value="">选择场景地点...</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* 预览图状态提示 + 生成按钮 */}
            {scene.status === "generating_image" || scene.status === "regenerating" || isGeneratingImage ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2 px-3 bg-muted/50 rounded">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>预览图生成中...</span>
              </div>
            ) : scene.status === "image_failed" ? (
              <div className="flex items-center justify-between py-2 px-3 bg-red-50 rounded text-sm">
                <span className="text-red-600">预览图生成失败</span>
                <Button size="sm" variant="ghost" onClick={() => onGenerateImage?.(scene.id)}>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  重试
                </Button>
              </div>
            ) : onGenerateImage ? (
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => onGenerateImage(scene.id)}
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                生成分镜图
              </Button>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2 px-3 bg-muted/30 rounded">
                <ImageIcon className="h-4 w-4" />
                <span>点击上方按钮生成预览图</span>
              </div>
            )}
          </CardContent>
        </Card>
        </div>

        {/* 编辑对话框 */}
        <EditDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          scene={scene}
          editForm={editForm}
          setEditForm={setEditForm}
          autoRegenerate={autoRegenerate}
          setAutoRegenerate={setAutoRegenerate}
          onSave={handleSaveEdit}
          isSaving={isSaving}
          hasImage={hasImage}
          locations={locations}
        />
      </>
    );
  }

  // ==================== 有图状态布局 ====================
  return (
    <>
      <div className="relative group">
        <InsertButtons />
        <Card className="overflow-hidden">
        {/* 预览图/视频区域 */}
        <div className="aspect-video relative bg-muted">
          {/* 视频播放器 */}
          {scene.video_url && isPlaying ? (
            <video
              src={scene.video_url}
              className="w-full h-full object-cover"
              autoPlay
              controls
              onEnded={handleVideoEnd}
              onError={() => {
                console.error("视频播放失败:", scene.video_url);
                setIsPlaying(false);
              }}
            />
          ) : (
            <button
              onClick={() => setIsPreviewOpen(true)}
              className="w-full h-full relative group/preview"
            >
              <img
                src={scene.preview_image_url!}
                alt={`场景 ${scene.scene_index + 1}`}
                className="w-full h-full object-cover"
              />
              {/* 悬停时显示放大图标 */}
              <div className="absolute inset-0 bg-black/0 group-hover/preview:bg-black/20 transition-colors flex items-center justify-center">
                <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover/preview:opacity-100 transition-opacity" />
              </div>
            </button>
          )}

          {/* 状态和序号 */}
          <div className="absolute top-2 left-2 flex gap-2">
            <Badge variant="outline" className="bg-background/80">
              #{scene.scene_index + 1}
            </Badge>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>

          {/* 时长 - 播放时隐藏 */}
          {!isPlaying && (
            <div className="absolute bottom-2 left-2">
              <Badge variant="outline" className="bg-background/80">
                <Clock className="h-3 w-3 mr-1" />
                {scene.duration}秒
              </Badge>
            </div>
          )}

          {/* 播放按钮 */}
          {scene.video_url && !isPlaying && (
            <div
              className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
              onClick={handlePlayClick}
            >
              <Button size="lg" variant="secondary" className="rounded-full">
                <Play className="h-6 w-6" />
              </Button>
            </div>
          )}
        </div>

        <CardContent className="p-4">
          {/* 反馈编辑模式 */}
          {isFeedbackMode ? (
            <div className="space-y-2">
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="描述你想要的修改..."
                className="min-h-[80px] text-sm"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleReject} disabled={!feedback.trim()}>
                  提交反馈
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsFeedbackMode(false)}>
                  取消
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* 描述 - 可点击编辑 */}
              <div
                onClick={handleOpenEditDialog}
                className={`
                  mb-3 p-2 -mx-2 rounded
                  ${canEdit ? "cursor-pointer hover:bg-muted/50 transition-colors group" : ""}
                `}
              >
                <div className="flex items-start justify-between">
                  {/* Zapiwala 格式：显示完整的音频层 + Multi-Cut 结构 */}
                  {scene.cuts && scene.cuts.length > 0 ? (
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono flex-1 max-h-[150px] overflow-y-auto">
                      {formatZapiwalaDisplay(scene)}
                    </pre>
                  ) : (
                    <p className="text-sm text-muted-foreground line-clamp-3 flex-1">
                      {scene.description || "暂无描述"}
                    </p>
                  )}
                  {canEdit && (
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0 mt-0.5" />
                  )}
                </div>
              </div>

              {/* 镜头信息 + 操作按钮 */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex gap-2 text-xs">
                  {/* Zapiwala: 显示 cuts 信息 */}
                  {scene.cuts && scene.cuts.length > 0 ? (
                    <>
                      <span className="text-muted-foreground">{scene.cuts.length} 个镜头</span>
                      {scene.bgm && <span title={`BGM: ${scene.bgm}`}>🎵</span>}
                      {scene.sfx && <span title={`SFX: ${scene.sfx}`}>🔊</span>}
                      {scene.dialogue_order_lock && scene.dialogue_order_lock.length > 0 && (
                        <span title={`对话顺序: ${scene.dialogue_order_lock.join(' → ')}`}>💬</span>
                      )}
                    </>
                  ) : (
                    <>
                      {scene.shot_type && (
                        <span className="text-muted-foreground">
                          镜头: {SHOT_TYPE_LABELS[scene.shot_type] || scene.shot_type}
                        </span>
                      )}
                      {scene.camera_movement && (
                        <span className="text-muted-foreground">
                          运动: {CAMERA_MOVEMENT_LABELS[scene.camera_movement] || scene.camera_movement}
                        </span>
                      )}
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {/* 保存到分镜库按钮 */}
                  {onSaveToLibrary && scene.preview_image_url && (
                    <button
                      onClick={() => onSaveToLibrary(scene.id)}
                      className="text-muted-foreground/50 hover:text-primary transition-colors p-1"
                      title="保存到分镜库"
                      disabled={isSavingToLibrary}
                    >
                      {isSavingToLibrary ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <FolderPlus className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                  {/* 重新生成分镜图按钮 */}
                  {onGenerateImage && !isGeneratingImage && scene.status !== "generating_image" && scene.status !== "regenerating" && (
                    <button
                      onClick={() => onGenerateImage(scene.id)}
                      className="text-muted-foreground/50 hover:text-primary transition-colors p-1"
                      title="重新生成分镜图"
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {/* 生成中状态 */}
                  {(isGeneratingImage || scene.status === "generating_image" || scene.status === "regenerating") && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground/50" />
                  )}
                  {/* 裁剪按钮 - 有视频时显示 */}
                  {scene.video_url && onTrim && (
                    <button
                      onClick={() => onTrim(scene.id)}
                      className="text-muted-foreground/50 hover:text-primary transition-colors p-1"
                      title="裁剪视频"
                    >
                      <Scissors className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {/* 删除按钮 */}
                  {onDelete && (
                    <button
                      onClick={() => {
                        if (confirm(`确定要删除场景 #${scene.scene_index + 1} 吗？`)) {
                          onDelete(scene.id);
                        }
                      }}
                      className="text-muted-foreground/50 hover:text-destructive transition-colors p-1"
                      title="删除此场景"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* 操作按钮 - 预览就绪且未审核 */}
              {scene.status === "image_ready" && !scene.user_approved && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    disabled={isApproving}
                    onClick={() => onApprove?.(scene.id)}
                  >
                    {isApproving ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <Check className="h-3 w-3 mr-1" />
                    )}
                    {isApproving ? "确认中..." : "满意"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={handleOpenEditDialog}
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    修改
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onRegenerate?.(scene.id)}
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                </div>
              )}

              {/* 视频生成失败状态 */}
              {scene.status === "video_failed" && !scene.video_url && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-sm text-red-600">
                    <X className="h-4 w-4" />
                    视频生成失败
                  </div>
                  {scene.preview_image_url && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleGenerateVideoClick}
                      disabled={isGeneratingVideo}
                    >
                      {isGeneratingVideo ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3 mr-1" />
                      )}
                      重试
                    </Button>
                  )}
                </div>
              )}

              {/* 已确认状态 */}
              {scene.user_approved && !scene.video_url && scene.status !== "generating_video" && scene.status !== "video_failed" && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-sm text-green-600">
                    <Check className="h-4 w-4" />
                    已确认
                  </div>
                  {isBatchMode && queuePosition !== undefined && (
                    <div className="flex items-center gap-1 text-sm text-blue-600">
                      <ListOrdered className="h-4 w-4" />
                      排队中 #{queuePosition + 1}
                    </div>
                  )}
                  {!isBatchMode && scene.preview_image_url && (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={handleGenerateVideoClick}
                      disabled={isGeneratingVideo}
                    >
                      {isGeneratingVideo ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <Play className="h-3 w-3 mr-1" />
                      )}
                      生成视频
                    </Button>
                  )}
                </div>
              )}

              {/* 视频生成中状态 */}
              {scene.status === "generating_video" && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-sm text-amber-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    视频生成中...
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onReset?.(scene.id)}
                    title="取消并重置状态"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}

              {/* 视频已生成状态 - 排除正在重新生成的情况 */}
              {scene.video_url && scene.status !== "generating_video" && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-sm text-green-600">
                    <Check className="h-4 w-4" />
                    视频已生成
                  </div>
                  {!isBatchMode && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleGenerateVideoClick}
                      disabled={isGeneratingVideo}
                      title="重新生成视频"
                    >
                      {isGeneratingVideo ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
      </div>

      {/* 编辑对话框 */}
      <EditDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        scene={scene}
        editForm={editForm}
        setEditForm={setEditForm}
        autoRegenerate={autoRegenerate}
        setAutoRegenerate={setAutoRegenerate}
        onSave={handleSaveEdit}
        isSaving={isSaving}
        hasImage={hasImage}
        locations={locations}
      />

      {/* 图片预览弹窗 */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/90">
          <DialogTitle className="sr-only">
            场景 #{scene.scene_index + 1} 预览图
          </DialogTitle>
          <div className="relative">
            {/* 顶部按钮栏 */}
            <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
              {/* 下载按钮 */}
              {scene.preview_image_url && (
                <a
                  href={scene.preview_image_url}
                  download={`scene-${scene.scene_index + 1}.png`}
                  className="w-8 h-8 rounded-full bg-black/60 text-white
                    flex items-center justify-center hover:bg-black/80 transition-colors"
                  title="下载图片"
                  onClick={(e) => {
                    // 如果是 base64 图片，需要特殊处理
                    if (scene.preview_image_url?.startsWith('data:')) {
                      e.preventDefault();
                      const link = document.createElement('a');
                      link.href = scene.preview_image_url;
                      link.download = `scene-${scene.scene_index + 1}.png`;
                      link.click();
                    }
                  }}
                >
                  <Download className="h-4 w-4" />
                </a>
              )}
              {/* 关闭按钮 */}
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="w-8 h-8 rounded-full bg-black/60 text-white
                  flex items-center justify-center hover:bg-black/80 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {scene.preview_image_url && (
              <img
                src={scene.preview_image_url}
                alt={`场景 ${scene.scene_index + 1}`}
                className="w-full h-auto max-h-[85vh] object-contain"
              />
            )}
            {/* 底部信息栏 */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <div className="flex items-center justify-between text-white">
                <div className="flex-1 mr-4">
                  <p className="font-medium">场景 #{scene.scene_index + 1}</p>
                  {/* Zapiwala 格式：显示完整信息 */}
                  {scene.cuts && scene.cuts.length > 0 ? (
                    <pre className="text-xs text-white/70 whitespace-pre-wrap font-mono max-h-[100px] overflow-y-auto mt-1">
                      {formatZapiwalaDisplay(scene)}
                    </pre>
                  ) : (
                    <p className="text-sm text-white/70 line-clamp-2 max-w-2xl">
                      {scene.description || "暂无描述"}
                    </p>
                  )}
                </div>
                <Badge variant="outline" className="bg-white/10 text-white border-white/30 flex-shrink-0">
                  <Clock className="h-3 w-3 mr-1" />
                  {scene.duration}秒
                </Badge>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ==================== 编辑对话框组件 ====================
interface EditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scene: {
    id: string;
    scene_index: number;
    preview_image_url: string | null;
  };
  editForm: SceneEditData;
  setEditForm: (form: SceneEditData) => void;
  autoRegenerate: boolean;
  setAutoRegenerate: (value: boolean) => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
  hasImage: boolean;
  locations?: LocationOption[];
}

function EditDialog({
  open,
  onOpenChange,
  scene,
  editForm,
  setEditForm,
  autoRegenerate,
  setAutoRegenerate,
  onSave,
  isSaving,
  hasImage,
  locations,
}: EditDialogProps) {
  // 找到当前选中的场景地点
  const selectedLocation = locations?.find(loc => loc.id === editForm.location_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>编辑场景 #{scene.scene_index + 1}</DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {/* 所属场景地点 - 仅在有场景地点时显示 */}
          {locations && locations.length > 0 && (
            <div className="space-y-2">
              <Label>所属场景</Label>
              <Select
                value={editForm.location_id || ""}
                onChange={(e) => setEditForm({ ...editForm, location_id: e.target.value || null })}
                options={[
                  { value: "", label: "未指定" },
                  ...locations.map(loc => ({ value: loc.id, label: loc.name }))
                ]}
              />
              {/* 选中场景的空景预览 */}
              {selectedLocation?.reference_image_url && (
                <div className="mt-2">
                  <img
                    src={selectedLocation.reference_image_url}
                    alt={selectedLocation.name}
                    className="w-full h-24 object-cover rounded-lg"
                  />
                </div>
              )}
            </div>
          )}

          {/* 场景描述 - 大编辑区 */}
          <div className="space-y-2">
            <Label>场景描述</Label>
            <Textarea
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              placeholder="详细描述这个场景的内容、画面、氛围..."
              className="min-h-[200px] text-sm resize-none"
            />
          </div>

          {/* 时长设置 - 镜头类型和运动由 AI 自由发挥 */}
          <div className="flex items-center gap-4">
            <div className="space-y-2">
              <Label>时长（秒）</Label>
              <Input
                type="number"
                min={1}
                max={60}
                value={editForm.duration}
                onChange={(e) => setEditForm({ ...editForm, duration: parseInt(e.target.value) || 5 })}
                className="w-24"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-6">
              镜头类型和运动由 AI 根据描述自动生成
            </p>
          </div>

          {/* 自动重新生成选项 - 仅在有图时显示 */}
          {hasImage && (
            <div className="pt-2 border-t">
              <Checkbox
                checked={autoRegenerate}
                onChange={(e) => setAutoRegenerate(e.target.checked)}
                label="保存后自动重新生成预览图"
              />
            </div>
          )}
        </DialogBody>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button
            variant="outline"
            onClick={() => setEditForm({
              description: "",
              duration: 5,
              location_id: null,
            })}
            disabled={isSaving}
          >
            清空
          </Button>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              取消
            </Button>
            <Button onClick={onSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                "保存"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
