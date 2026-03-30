"use client";

import { useEffect, useState, use, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SceneCard, type SceneEditData } from "@/components/project/scene-card";
import { TrimDialog } from "@/components/project/trim-dialog";
import {
  ArrowLeft,
  Play,
  Download,
  RefreshCw,
  Film,
  Sparkles,
  Image,
  Loader2,
  Video,
  MapPin,
  LayoutGrid,
  Layers,
  ZoomIn,
  Plus,
  Trash2,
} from "lucide-react";
import { WorkflowProgress, getWorkflowStep } from "@/components/project/workflow-progress";
import { StepIndicator } from "@/components/project/step-indicator";

// 图像生成模型类型
type ImageModel = "gemini";

// 视频生成模型类型
type VideoModel = "veo_3_1-fast";

// 状态映射
const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" }> = {
  draft: { label: "草稿", variant: "secondary" },
  parsing: { label: "解析剧本中", variant: "warning" },
  storyboarding: { label: "生成分镜中", variant: "warning" },
  locations_pending: { label: "确认场景", variant: "default" },
  characters_pending: { label: "确认角色", variant: "default" },
  storyboard_ready: { label: "分镜就绪", variant: "default" },
  user_review: { label: "等待审核", variant: "default" },
  generating_images: { label: "生成预览图中", variant: "warning" },
  images_ready: { label: "预览图就绪", variant: "default" },
  images_partial: { label: "部分预览图就绪", variant: "warning" },
  generating: { label: "生成视频中", variant: "warning" },
  stitching: { label: "合成中", variant: "warning" },
  stitch_failed: { label: "合成失败", variant: "destructive" },
  completed: { label: "已完成", variant: "success" },
  failed: { label: "失败", variant: "destructive" },
};

interface Scene {
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
}

interface Location {
  id: string;
  name: string;
  description: string | null;
  reference_image_url: string | null;
  panorama_url: string | null;
  location_index: number;
}

interface Project {
  id: string;
  title: string | null;
  status: string;
  original_prompt: string | null;
  total_duration: number;
  final_video_url: string | null;
  created_at: string;
  style_config: {
    artStyle?: string;
    aspectRatio?: string;
  } | null;
}

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [generatingImageSceneId, setGeneratingImageSceneId] = useState<string | null>(null);
  const [generatingVideoSceneId, setGeneratingVideoSceneId] = useState<string | null>(null);
  const [approvingSceneId, setApprovingSceneId] = useState<string | null>(null);

  // 批量生成视频状态
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  // 视频合成状态
  const [isStitching, setIsStitching] = useState(false);
  // 视频裁剪状态
  const [trimmingScene, setTrimmingScene] = useState<Scene | null>(null);
  // 保存到分镜库状态
  const [savingToLibrarySceneId, setSavingToLibrarySceneId] = useState<string | null>(null);
  // 图像生成配置
  const [selectedImageModel, setSelectedImageModel] = useState<ImageModel>("gemini");
  // 视频生成配置
  const [selectedVideoModel, setSelectedVideoModel] = useState<VideoModel>("veo_3_1-fast");
  // 场景分组显示开关
  const [groupByLocation, setGroupByLocation] = useState(false);
  // 场景管理弹窗
  const [showLocationsDialog, setShowLocationsDialog] = useState(false);
  const [generatingLocationId, setGeneratingLocationId] = useState<string | null>(null);
  // 最终视频播放器引用
  const finalVideoRef = useRef<HTMLVideoElement>(null);
  const [batchProgress, setBatchProgress] = useState<{
    total: number;
    completed: number;
    failed: number;
    current: number | null;
  } | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isGeneratingScenes, setIsGeneratingScenes] = useState(false);

  // 更新场景信息
  const handleUpdateLocation = async (locationId: string, updates: { name?: string; description?: string }) => {
    try {
      const res = await fetch(`/api/locations/${locationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success) {
        setLocations(prev => prev.map(l => l.id === locationId ? { ...l, ...updates } : l));
      }
    } catch (err) {
      console.error("更新场景失败:", err);
    }
  };

  // 生成场景空景图
  const handleGenerateLocationBackground = async (locationId: string) => {
    setGeneratingLocationId(locationId);
    try {
      const res = await fetch(`/api/locations/${locationId}/generate-background`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style: project?.style_config?.artStyle || "ghibli" }),
      });
      const data = await res.json();
      if (data.success) {
        setLocations(prev => prev.map(l => l.id === locationId ? {
          ...l,
          panorama_url: data.data.panoramaUrl || data.data.imageUrl || null,
          reference_image_url: data.data.panoramaUrl || data.data.imageUrl || null,
        } : l));
      } else {
        alert(data.error || "生成场景图失败");
      }
    } catch (err) {
      console.error("生成场景图失败:", err);
      alert("生成场景图失败，请重试");
    } finally {
      setGeneratingLocationId(null);
    }
  };

  // 新增场景
  const handleAddLocation = async () => {
    try {
      const res = await fetch(`/api/locations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: id, name: "新场景" }),
      });
      const data = await res.json();
      if (data.success) {
        setLocations(prev => [...prev, {
          id: data.data.id,
          name: data.data.name,
          description: data.data.description,
          reference_image_url: data.data.reference_image_url,
          panorama_url: data.data.panorama_url,
          location_index: data.data.location_index,
        }]);
      }
    } catch (err) {
      console.error("新增场景失败:", err);
    }
  };

  // 删除场景
  const handleDeleteLocation = async (locationId: string) => {
    if (!confirm("确定要删除这个场景吗？")) return;
    try {
      const res = await fetch(`/api/locations/${locationId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setLocations(prev => prev.filter(l => l.id !== locationId));
      }
    } catch (err) {
      console.error("删除场景失败:", err);
    }
  };

  const handleGenerateScenes = async () => {
    setIsGeneratingScenes(true);
    try {
      const res = await fetch(`/api/projects/${id}/generate-scenes`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        // 重新加载分镜数据
        const storyboardRes = await fetch(`/api/projects/${id}/storyboard`);
        const storyboardData = await storyboardRes.json();
        if (storyboardData.success) {
          setScenes(storyboardData.data.scenes || []);
        }
        const projectRes = await fetch(`/api/projects/${id}`);
        const projectData = await projectRes.json();
        if (projectData.success) setProject(projectData.data);
      } else {
        alert(data.error || "生成分镜失败");
      }
    } catch (err) {
      console.error("生成分镜失败:", err);
      alert("生成分镜失败，请重试");
    } finally {
      setIsGeneratingScenes(false);
    }
  };

  useEffect(() => {
    async function fetchProject() {
      try {
        // 并行获取项目详情、分镜列表、场景地点列表（大幅提升加载速度）
        const [projectRes, storyboardRes, locationsRes] = await Promise.all([
          fetch(`/api/projects/${id}`),
          fetch(`/api/projects/${id}/storyboard`),
          fetch(`/api/projects/${id}/locations`),
        ]);

        const [projectData, storyboardData, locationsData] = await Promise.all([
          projectRes.json(),
          storyboardRes.json(),
          locationsRes.json(),
        ]);

        if (projectData.success) {
          // 如果项目状态是待确认角色，跳转到角色确认页
          if (projectData.data.status === "characters_pending") {
            router.replace(`/projects/${id}/characters`);
            return;
          }
          // 如果项目状态是标题角色生成中，跳回 script 页
          if (projectData.data.status === "title_characters_pending") {
            router.replace(`/projects/${id}/script`);
            return;
          }
          setProject(projectData.data);
        }

        if (storyboardData.success) {
          setScenes(storyboardData.data.scenes || []);
        }

        if (locationsData.success) {
          setLocations(locationsData.data || []);
        }
      } catch (error) {
        console.error("获取项目详情失败:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProject();
  }, [id, router]);

  const handleApproveScene = async (sceneId: string) => {
    setApprovingSceneId(sceneId);
    try {
      const response = await fetch(`/api/scenes/${sceneId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });

      const data = await response.json();

      if (data.success) {
        setScenes(prev => prev.map(s =>
          s.id === sceneId ? { ...s, user_approved: true } : s
        ));
      } else {
        console.error("审批场景失败:", data.error);
        alert("审批失败: " + (data.error || "未知错误"));
      }
    } catch (error) {
      console.error("审批场景失败:", error);
      alert("审批失败，请重试");
    } finally {
      setApprovingSceneId(null);
    }
  };

  const handleRejectScene = async (sceneId: string, feedback: string) => {
    try {
      const response = await fetch(`/api/scenes/${sceneId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", feedback }),
      });

      const data = await response.json();

      if (data.success) {
        setScenes(prev => prev.map(s =>
          s.id === sceneId ? { ...s, status: "rejected" } : s
        ));
      } else {
        console.error("拒绝场景失败:", data.error);
      }
    } catch (error) {
      console.error("拒绝场景失败:", error);
    }
  };

  const handleRegenerateScene = async (sceneId: string) => {
    try {
      setGeneratingImageSceneId(sceneId);
      // 先更新状态为生成中
      setScenes(prev => prev.map(s =>
        s.id === sceneId ? { ...s, status: "regenerating" } : s
      ));

      const response = await fetch(`/api/scenes/${sceneId}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (data.success) {
        // 成功：更新预览图和状态
        setScenes(prev => prev.map(s =>
          s.id === sceneId
            ? {
                ...s,
                preview_image_url: data.data.previewImageUrl,
                status: "image_ready",
                user_approved: false, // 重置审核状态
                video_url: null, // 清除视频
              }
            : s
        ));
      } else {
        // 失败：更新状态
        setScenes(prev => prev.map(s =>
          s.id === sceneId ? { ...s, status: "image_failed" } : s
        ));
        console.error("重新生成场景失败:", data.error);
      }
    } catch (error) {
      console.error("重新生成场景失败:", error);
      setScenes(prev => prev.map(s =>
        s.id === sceneId ? { ...s, status: "image_failed" } : s
      ));
    } finally {
      setGeneratingImageSceneId(null);
    }
  };

  // 单场景图片生成（用于测试）
  const handleGenerateSingleImage = async (sceneId: string) => {
    try {
      setGeneratingImageSceneId(sceneId);
      // 更新状态为生成中
      setScenes(scenes.map(s =>
        s.id === sceneId ? { ...s, status: "generating_image" } : s
      ));

      const response = await fetch(`/api/scenes/${sceneId}/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: selectedImageModel,
          // 从项目配置读取比例，默认 16:9
        }),
      });

      const data = await response.json();

      if (data.success) {
        // 成功：更新预览图和状态
        setScenes(scenes.map(s =>
          s.id === sceneId
            ? {
                ...s,
                preview_image_url: data.data.previewImageUrl,
                status: "image_ready",
                user_approved: false,
                video_url: null,
              }
            : s
        ));
      } else {
        // 失败：更新状态
        setScenes(scenes.map(s =>
          s.id === sceneId ? { ...s, status: "image_failed" } : s
        ));
        console.error("生成场景图片失败:", data.error);
      }
    } catch (error) {
      console.error("生成场景图片失败:", error);
      setScenes(scenes.map(s =>
        s.id === sceneId ? { ...s, status: "image_failed" } : s
      ));
    } finally {
      setGeneratingImageSceneId(null);
    }
  };

  const handleGenerateImages = async () => {
    try {
      setIsGeneratingImages(true);
      if (project) {
        setProject({ ...project, status: "generating_images" });
      }

      const response = await fetch(`/api/projects/${id}/generate-images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: selectedImageModel,
          // 从项目配置读取比例，默认 16:9
        }),
      });

      const data = await response.json();

      if (data.success) {
        // 更新场景列表中的预览图
        const updatedScenes = scenes.map((scene) => {
          const result = data.data.results.find(
            (r: { sceneId: string }) => r.sceneId === scene.id
          );
          if (result?.success && result.imageUrl) {
            return {
              ...scene,
              preview_image_url: result.imageUrl,
              status: "image_ready",
            };
          } else if (result && !result.success) {
            return { ...scene, status: "image_failed" };
          }
          return scene;
        });
        setScenes(updatedScenes);

        if (project) {
          setProject({
            ...project,
            status: data.data.failedCount === 0 ? "images_ready" : "images_partial",
          });
        }
      } else {
        console.error("生成预览图失败:", data.error);
        if (project) {
          setProject({ ...project, status: "user_review" });
        }
      }
    } catch (error) {
      console.error("生成预览图失败:", error);
      if (project) {
        setProject({ ...project, status: "user_review" });
      }
    } finally {
      setIsGeneratingImages(false);
    }
  };

  const handleResetScene = async (sceneId: string) => {
    try {
      const response = await fetch(`/api/scenes/${sceneId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });

      const data = await response.json();
      if (data.success) {
        setScenes(scenes.map(s =>
          s.id === sceneId ? { ...s, status: data.data.status } : s
        ));
      }
    } catch (error) {
      console.error("重置场景状态失败:", error);
    }
  };

  const handleGenerateVideo = async (sceneId: string) => {
    try {
      setGeneratingVideoSceneId(sceneId);

      // 更新场景状态为生成中
      setScenes(scenes.map(s =>
        s.id === sceneId ? { ...s, status: "generating_video" } : s
      ));

      const response = await fetch(`/api/scenes/${sceneId}/generate-video`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: selectedVideoModel }),
      });

      const data = await response.json();

      if (data.success) {
        // 更新场景视频 URL
        setScenes(scenes.map(s =>
          s.id === sceneId
            ? { ...s, video_url: data.data.videoUrl, status: "completed" }
            : s
        ));
      } else {
        console.error("生成视频失败:", data.error);
        setScenes(scenes.map(s =>
          s.id === sceneId ? { ...s, status: "video_failed" } : s
        ));
      }
    } catch (error) {
      console.error("生成视频失败:", error);
      setScenes(scenes.map(s =>
        s.id === sceneId ? { ...s, status: "video_failed" } : s
      ));
    } finally {
      setGeneratingVideoSceneId(null);
    }
  };

  // 轮询批量生成进度
  const pollBatchProgress = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${id}/generate-videos/status`);
      const data = await response.json();

      if (!data.success) return;

      const { status, completedScenes, failedScenes, totalScenes, currentScene, scenes: updatedScenes } = data.data;

      // 更新进度状态
      setBatchProgress({
        total: totalScenes,
        completed: completedScenes,
        failed: failedScenes,
        current: currentScene,
      });

      // 更新场景状态
      setScenes(prevScenes => prevScenes.map(scene => {
        const updated = updatedScenes.find((s: { sceneId: string }) => s.sceneId === scene.id);
        if (updated) {
          // 如果本地已经有视频 URL，保持 completed 状态，不要回退
          const hasVideo = updated.videoUrl || scene.video_url;
          let newStatus = updated.status;

          // 防止状态回退：如果已经有视频，强制为 completed
          if (hasVideo) {
            newStatus = "completed";
          } else if (updated.status === "queued") {
            // queued 状态保持本地状态不变
            newStatus = scene.status;
          }

          return {
            ...scene,
            status: newStatus,
            video_url: updated.videoUrl || scene.video_url,
          };
        }
        return scene;
      }));

      // 检查是否完成
      if (status === "completed" || status === "partial" || status === "failed" || status === "idle") {
        // 如果不是 processing 状态，停止轮询
        if (status !== "idle" || (completedScenes > 0 || failedScenes > 0)) {
          setIsBatchGenerating(false);
          setBatchProgress(null);
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }

          // 更新项目状态
          if (project) {
            let newStatus = project.status;
            if (status === "completed") {
              newStatus = "completed";
            } else if (status === "partial") {
              newStatus = "videos_partial";
            }
            setProject({ ...project, status: newStatus });
          }
        }
      }
    } catch (error) {
      console.error("轮询进度失败:", error);
    }
  }, [id, project]);

  // 批量生成视频
  const handleBatchGenerateVideos = async () => {
    try {
      // 获取符合条件的场景
      const eligibleScenes = scenes.filter(
        s => s.user_approved && s.preview_image_url && !s.video_url
      );

      if (eligibleScenes.length === 0) {
        alert("没有符合条件的场景需要生成视频");
        return;
      }

      setIsBatchGenerating(true);
      setBatchProgress({
        total: eligibleScenes.length,
        completed: 0,
        failed: 0,
        current: null,
      });

      // 发起批量生成请求
      const response = await fetch(`/api/projects/${id}/generate-videos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sceneIds: eligibleScenes.map(s => s.id),
          model: selectedVideoModel,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "批量生成失败");
      }

      // 更新项目状态
      if (project) {
        setProject({ ...project, status: "generating" });
      }

      // 开始轮询进度
      pollIntervalRef.current = setInterval(pollBatchProgress, 5000);
      // 立即执行一次
      pollBatchProgress();

    } catch (error) {
      console.error("批量生成视频失败:", error);
      setIsBatchGenerating(false);
      setBatchProgress(null);
      alert(error instanceof Error ? error.message : "批量生成失败");
    }
  };

  // 编辑场景
  const handleEditScene = async (
    sceneId: string,
    data: SceneEditData,
    autoRegenerate: boolean
  ) => {
    try {
      // 1. 保存编辑
      const response = await fetch(`/api/scenes/${sceneId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "edit", data }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "保存失败");
      }

      // 2. 如果需要自动重新生成
      if (autoRegenerate) {
        // 先更新状态为 regenerating，清除视频
        setScenes(prev => prev.map(s =>
          s.id === sceneId
            ? {
                ...s,
                description: data.description,
                shot_type: data.shot_type ?? null,
                camera_movement: data.camera_movement ?? null,
                duration: data.duration,
                location_id: data.location_id,
                user_approved: false,
                video_url: null,
                status: "regenerating",
              }
            : s
        ));

        const regenResponse = await fetch(`/api/scenes/${sceneId}/regenerate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newDescription: data.description }),
        });

        const regenResult = await regenResponse.json();
        if (regenResult.success) {
          setScenes(prev => prev.map(s =>
            s.id === sceneId
              ? {
                  ...s,
                  preview_image_url: regenResult.data.previewImageUrl,
                  status: "image_ready",
                }
              : s
          ));
        } else {
          setScenes(prev => prev.map(s =>
            s.id === sceneId ? { ...s, status: "image_failed" } : s
          ));
          throw new Error(regenResult.error || "重新生成失败");
        }
      } else {
        // 仅保存，不重新生成，但清除视频
        setScenes(prev => prev.map(s =>
          s.id === sceneId
            ? {
                ...s,
                description: data.description,
                shot_type: data.shot_type ?? null,
                camera_movement: data.camera_movement ?? null,
                duration: data.duration,
                location_id: data.location_id,
                user_approved: false,
                video_url: null,
                status: s.preview_image_url ? "image_ready" : "pending",
              }
            : s
        ));
      }
    } catch (error) {
      console.error("编辑场景失败:", error);
      throw error;
    }
  };

  // 插入场景（在指定位置前）
  const handleInsertBefore = async (sceneIndex: number) => {
    try {
      const response = await fetch("/api/scenes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: id,
          insertAtIndex: sceneIndex,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "插入失败");
      }

      // 重新获取场景列表
      const storyboardRes = await fetch(`/api/projects/${id}/storyboard`);
      const storyboardData = await storyboardRes.json();
      if (storyboardData.success) {
        setScenes(storyboardData.data.scenes || []);
      }

      // 更新项目总时长
      if (project) {
        setProject({ ...project, total_duration: data.data.totalDuration });
      }
    } catch (error) {
      console.error("插入场景失败:", error);
      alert(error instanceof Error ? error.message : "插入失败");
    }
  };

  // 删除场景
  const handleDeleteScene = async (sceneId: string) => {
    try {
      const response = await fetch(`/api/scenes/${sceneId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "删除失败");
      }

      // 重新获取场景列表
      const storyboardRes = await fetch(`/api/projects/${id}/storyboard`);
      const storyboardData = await storyboardRes.json();
      if (storyboardData.success) {
        setScenes(storyboardData.data.scenes || []);
      }

      // 更新项目总时长
      if (project) {
        setProject({ ...project, total_duration: data.data.totalDuration });
      }
    } catch (error) {
      console.error("删除场景失败:", error);
      alert(error instanceof Error ? error.message : "删除失败");
    }
  };

  // 打开裁剪对话框
  const handleTrimScene = (sceneId: string) => {
    const scene = scenes.find(s => s.id === sceneId);
    if (scene && scene.video_url) {
      setTrimmingScene(scene);
    }
  };

  // 确认裁剪
  const handleTrimConfirm = async (startTime: number, endTime: number) => {
    if (!trimmingScene) return;

    const response = await fetch(`/api/scenes/${trimmingScene.id}/trim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startTime, endTime }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "裁剪失败");
    }

    // 更新场景列表中的视频 URL 和时长
    setScenes(prev => prev.map(s =>
      s.id === trimmingScene.id
        ? { ...s, video_url: data.data.videoUrl, duration: data.data.duration }
        : s
    ));

    // 更新项目总时长
    const totalDuration = scenes.reduce((sum, s) => {
      if (s.id === trimmingScene.id) {
        return sum + data.data.duration;
      }
      return sum + s.duration;
    }, 0);

    if (project) {
      setProject({ ...project, total_duration: totalDuration });
    }
  };

  // 插入场景（在指定位置后）
  const handleInsertAfter = async (sceneIndex: number) => {
    try {
      const response = await fetch("/api/scenes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: id,
          insertAtIndex: sceneIndex + 1,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "插入失败");
      }

      // 重新获取场景列表
      const storyboardRes = await fetch(`/api/projects/${id}/storyboard`);
      const storyboardData = await storyboardRes.json();
      if (storyboardData.success) {
        setScenes(storyboardData.data.scenes || []);
      }

      // 更新项目总时长
      if (project) {
        setProject({ ...project, total_duration: data.data.totalDuration });
      }
    } catch (error) {
      console.error("插入场景失败:", error);
      alert(error instanceof Error ? error.message : "插入失败");
    }
  };

  // 合成完整视频
  const handleStitchVideo = async () => {
    try {
      setIsStitching(true);

      const response = await fetch(`/api/projects/${id}/stitch`, {
        method: "POST",
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "合成失败");
      }

      // 更新项目状态
      if (project) {
        setProject({ ...project, status: "stitching" });
      }

      // 开始轮询状态
      const pollStitchStatus = async () => {
        const statusRes = await fetch(`/api/projects/${id}/stitch`);
        const statusData = await statusRes.json();

        if (statusData.success) {
          const { status, finalVideoUrl } = statusData.data;

          if (status === "completed" && finalVideoUrl) {
            setProject((prev) =>
              prev ? { ...prev, status: "completed", final_video_url: finalVideoUrl } : prev
            );
            setIsStitching(false);
          } else if (status === "stitch_failed") {
            setProject((prev) => (prev ? { ...prev, status: "stitch_failed" } : prev));
            setIsStitching(false);
          } else if (status === "stitching") {
            // 继续轮询
            setTimeout(pollStitchStatus, 3000);
          } else {
            setIsStitching(false);
          }
        }
      };

      // 3秒后开始轮询
      setTimeout(pollStitchStatus, 3000);
    } catch (error) {
      console.error("合成视频失败:", error);
      setIsStitching(false);
      alert(error instanceof Error ? error.message : "合成失败");
    }
  };

  // 保存场景到分镜库
  const handleSaveToLibrary = async (sceneId: string) => {
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene || !scene.preview_image_url) {
      alert("该场景没有预览图，无法保存到分镜库");
      return;
    }

    try {
      setSavingToLibrarySceneId(sceneId);

      const response = await fetch("/api/storyboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sceneId: scene.id,
          imageUrl: scene.preview_image_url,
          name: scene.description?.slice(0, 50) || `场景 ${scene.scene_index + 1}`,
          description: scene.description,
          shotType: scene.shot_type,
          cameraMovement: scene.camera_movement,
          aspectRatio: project?.style_config?.aspectRatio || "16:9",
          metadata: {
            locationId: scene.location_id,
          },
          confirmed: true,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert("已保存到分镜库！");
      } else {
        alert(data.error || "保存失败");
      }
    } catch (error) {
      console.error("保存到分镜库失败:", error);
      alert("保存失败，请重试");
    } finally {
      setSavingToLibrarySceneId(null);
    }
  };

  // 清理轮询
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="aspect-video rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-16 max-w-6xl mx-auto">
        <p className="text-muted-foreground">项目不存在</p>
        <Button asChild className="mt-4">
          <Link href="/projects">返回项目列表</Link>
        </Button>
      </div>
    );
  }

  const status = statusConfig[project.status] || statusConfig.draft;

  // 计算统一进度条当前步骤
  const getUnifiedStep = (): string => {
    if (allHaveVideos || project.status === "completed" || project.status === "stitching") return "completed";
    if (allScenesApproved) return "video_generation";
    if (project.status === "storyboard_ready" || scenes.length > 0) return "storyboard_ready";
    if (project.status === "characters_pending") return "characters_pending";
    return "title_characters_pending";
  };

  const approvedCount = scenes.filter(s => s.user_approved).length;
  const allScenesApproved = scenes.length > 0 && approvedCount === scenes.length;
  const pendingApprovalCount = scenes.length - approvedCount;

  // 检查是否所有场景都有视频
  const allHaveVideos = scenes.length > 0 && scenes.every(s => s.video_url);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* 头部 */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/projects">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold">
              {project.title || "未命名项目"}
            </h1>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <p className="text-muted-foreground pl-12">
            {project.original_prompt?.slice(0, 100)}
            {(project.original_prompt?.length || 0) > 100 ? "..." : ""}
          </p>
        </div>
        {locations.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => setShowLocationsDialog(true)}>
            <MapPin className="h-4 w-4 mr-2" />
            场景管理
          </Button>
        )}
      </div>

      {/* 工作流进度条 */}
      <div className="flex justify-center">
        <StepIndicator
          steps={[
            { id: "title_characters_pending", label: "标题与角色", href: `/projects/${id}/script` },
            { id: "characters_pending", label: "角色立绘", href: `/projects/${id}/characters` },
            { id: "storyboard_ready", label: "分镜预览" },
            { id: "video_generation", label: "视频生成" },
            { id: "completed", label: "完成" },
          ]}
          currentStep={getUnifiedStep()}
        />
      </div>

      {/* 批量生成视频进度卡片 */}
      {isBatchGenerating && batchProgress && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="py-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Video className="h-4 w-4 text-blue-600" />
                  批量生成视频中
                </span>
                <span className="text-sm text-muted-foreground">
                  {batchProgress.completed}/{batchProgress.total} 完成
                </span>
              </div>
              <Progress
                value={(batchProgress.completed / batchProgress.total) * 100}
                className="h-2"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                {batchProgress.current !== null ? (
                  <span className="flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    正在处理场景 #{batchProgress.current + 1}...
                  </span>
                ) : (
                  <span>准备中...</span>
                )}
                {batchProgress.failed > 0 && (
                  <span className="text-red-500">
                    {batchProgress.failed} 个场景失败
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 最终视频预览 */}
      {project.final_video_url && (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <Film className="h-5 w-5" />
              完整视频已生成
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="aspect-video rounded-lg overflow-hidden bg-black">
              <video
                ref={finalVideoRef}
                src={project.final_video_url}
                controls
                className="w-full h-full"
              />
            </div>
            <div className="flex gap-2">
              <Button asChild className="flex-1">
                <a href={project.final_video_url} download>
                  <Download className="mr-2 h-4 w-4" />
                  下载视频
                </a>
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  if (finalVideoRef.current) {
                    finalVideoRef.current.requestFullscreen();
                    finalVideoRef.current.play();
                  }
                }}
              >
                <Play className="mr-2 h-4 w-4" />
                全屏播放
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 合成中提示 */}
      {project.status === "stitching" && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="py-6">
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <div>
                <p className="font-medium text-blue-700">正在合成完整视频...</p>
                <p className="text-sm text-blue-600">
                  这可能需要几分钟，请稍候
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 合成失败提示 */}
      {project.status === "stitch_failed" && (
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-red-600">
                  <p className="font-medium">视频合成失败</p>
                  <p className="text-sm">请检查 FFmpeg 是否正确安装，然后重试</p>
                </div>
              </div>
              <Button
                onClick={handleStitchVideo}
                disabled={isStitching}
                variant="destructive"
              >
                {isStitching ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                重试
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 分镜列表 */}
      {scenes.length > 0 ? (
        <>
          {/* 阶段一：确认预览图 */}
          <Card className={allScenesApproved ? "border-green-200 bg-green-50/30" : ""}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  {allScenesApproved ? "预览图已全部确认" : "当前：确认预览图"}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {/* 图像模型选择 */}
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">图像模型:</span>
                    <Select
                      value={selectedImageModel}
                      onChange={(e) => setSelectedImageModel(e.target.value as ImageModel)}
                      disabled={isGeneratingImages}
                      className="w-[160px]"
                      options={[
                        { value: "gemini", label: "Gemini" },
                      ]}
                    />
                  </div>
                  {/* 批量生成预览图按钮 */}
                  <Button
                    onClick={handleGenerateImages}
                    disabled={isGeneratingImages}
                    variant="outline"
                    size="sm"
                  >
                    {isGeneratingImages ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Image className="mr-2 h-4 w-4" />
                    )}
                    {isGeneratingImages ? "生成中..." : "批量生成预览图"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {/* 确认进度提示 */}
              <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm">
                    {allScenesApproved ? (
                      <span className="text-green-600 font-medium flex items-center gap-1">
                        <Sparkles className="h-4 w-4" />
                        全部 {scenes.length} 张预览图已确认，可以生成视频了
                      </span>
                    ) : (
                      <span>
                        已确认 <strong>{approvedCount}/{scenes.length}</strong>
                        {pendingApprovalCount > 0 && (
                          <span className="text-muted-foreground">
                            ，还需确认 {pendingApprovalCount} 张图才能生成视频
                          </span>
                        )}
                      </span>
                    )}
                  </span>
                </div>
                {/* 进度条 */}
                <Progress
                  value={(approvedCount / scenes.length) * 100}
                  className="h-2 mt-2"
                />
              </div>
            </CardContent>
          </Card>

          {/* 阶段二：生成视频（仅在全部确认后显示） */}
          {allScenesApproved && (
            <Card className={allHaveVideos ? "border-green-200 bg-green-50/30" : "border-blue-200 bg-blue-50/30"}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    {allHaveVideos ? "视频已全部生成" : "下一步：生成视频"}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {/* 视频模型选择 */}
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">视频模型:</span>
                      <Select
                        value={selectedVideoModel}
                        onChange={(e) => setSelectedVideoModel(e.target.value as VideoModel)}
                        disabled={isBatchGenerating}
                        className="w-[180px]"
                        options={[
                          { value: "veo_3_1-fast", label: "Veo 3.1 Fast" },
                        ]}
                      />
                    </div>
                    {/* 批量生成视频按钮 */}
                    {!allHaveVideos && (
                      <Button
                        onClick={handleBatchGenerateVideos}
                        disabled={isBatchGenerating || !scenes.some((s) => s.user_approved && s.preview_image_url && !s.video_url)}
                        size="sm"
                      >
                        {isBatchGenerating ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Video className="mr-2 h-4 w-4" />
                        )}
                        {isBatchGenerating ? "生成中..." : "批量生成视频"}
                      </Button>
                    )}
                    {/* 合成完整视频按钮 */}
                    {allHaveVideos && !project?.final_video_url && project?.status !== "stitching" && (
                      <Button
                        onClick={handleStitchVideo}
                        disabled={isStitching}
                        className="bg-green-600 hover:bg-green-700"
                        size="sm"
                      >
                        {isStitching ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Film className="mr-2 h-4 w-4" />
                        )}
                        {isStitching ? "合成中..." : "合成完整视频"}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              {!allHaveVideos && (
                <CardContent className="pt-0">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm text-muted-foreground">
                      {scenes.filter(s => s.video_url).length}/{scenes.length} 个视频已生成
                    </span>
                    <Progress
                      value={(scenes.filter(s => s.video_url).length / scenes.length) * 100}
                      className="h-2 mt-2"
                    />
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {/* 分镜卡片标题 */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">分镜列表</h2>
          </div>

          {/* 分组显示开关 */}
          {locations.length > 0 && (
            <div className="flex items-center justify-end mb-4">
              <Button
                variant={groupByLocation ? "default" : "outline"}
                size="sm"
                onClick={() => setGroupByLocation(!groupByLocation)}
              >
                {groupByLocation ? (
                  <>
                    <Layers className="h-4 w-4 mr-2" />
                    按场景分组
                  </>
                ) : (
                  <>
                    <LayoutGrid className="h-4 w-4 mr-2" />
                    平铺显示
                  </>
                )}
              </Button>
            </div>
          )}

          {/* 场景列表 */}
          {groupByLocation && locations.length > 0 ? (
            // 分组视图
            <div className="space-y-8">
              {locations.map((location) => {
                const locationScenes = scenes.filter(s => s.location_id === location.id);
                if (locationScenes.length === 0) return null;

                return (
                  <div key={location.id} className="space-y-4">
                    {/* 场景组头部 */}
                    <div className="flex items-center gap-3 border-b pb-3">
                      {location.reference_image_url ? (
                        <img
                          src={location.reference_image_url}
                          alt={location.name}
                          className="w-20 h-12 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-20 h-12 rounded-lg bg-muted flex items-center justify-center">
                          <MapPin className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-medium">{location.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {locationScenes.length} 个镜头
                        </p>
                      </div>
                    </div>

                    {/* 场景卡片网格 */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {locationScenes.map((scene) => {
                        const eligibleScenes = scenes.filter(
                          s => s.user_approved && s.preview_image_url && !s.video_url
                        );
                        const queuePosition = eligibleScenes.findIndex(s => s.id === scene.id);

                        return (
                          <SceneCard
                            key={scene.id}
                            scene={scene}
                            locations={locations}
                            onApprove={handleApproveScene}
                            onReject={handleRejectScene}
                            onRegenerate={handleRegenerateScene}
                            onGenerateImage={handleGenerateSingleImage}
                            onGenerateVideo={handleGenerateVideo}
                            onReset={handleResetScene}
                            onEdit={handleEditScene}
                            onInsertBefore={handleInsertBefore}
                            onInsertAfter={handleInsertAfter}
                            onDelete={handleDeleteScene}
                            onTrim={handleTrimScene}
                            onSaveToLibrary={handleSaveToLibrary}
                            isGeneratingImage={generatingImageSceneId === scene.id}
                            isGeneratingVideo={generatingVideoSceneId === scene.id}
                            isApproving={approvingSceneId === scene.id}
                            isSavingToLibrary={savingToLibrarySceneId === scene.id}
                            isBatchMode={isBatchGenerating}
                            queuePosition={queuePosition >= 0 ? queuePosition : undefined}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* 未分配场景的镜头 */}
              {scenes.filter(s => !s.location_id).length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 border-b pb-3">
                    <div className="w-20 h-12 rounded-lg bg-muted flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-medium text-muted-foreground">未分配场景</h3>
                      <p className="text-sm text-muted-foreground">
                        {scenes.filter(s => !s.location_id).length} 个镜头
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {scenes.filter(s => !s.location_id).map((scene) => {
                      const eligibleScenes = scenes.filter(
                        s => s.user_approved && s.preview_image_url && !s.video_url
                      );
                      const queuePosition = eligibleScenes.findIndex(s => s.id === scene.id);

                      return (
                        <SceneCard
                          key={scene.id}
                          scene={scene}
                          locations={locations}
                          onApprove={handleApproveScene}
                          onReject={handleRejectScene}
                          onRegenerate={handleRegenerateScene}
                          onGenerateImage={handleGenerateSingleImage}
                          onGenerateVideo={handleGenerateVideo}
                          onReset={handleResetScene}
                          onEdit={handleEditScene}
                          onInsertBefore={handleInsertBefore}
                          onInsertAfter={handleInsertAfter}
                          onDelete={handleDeleteScene}
                          onTrim={handleTrimScene}
                          onSaveToLibrary={handleSaveToLibrary}
                          isGeneratingImage={generatingImageSceneId === scene.id}
                          isGeneratingVideo={generatingVideoSceneId === scene.id}
                          isApproving={approvingSceneId === scene.id}
                          isSavingToLibrary={savingToLibrarySceneId === scene.id}
                          isBatchMode={isBatchGenerating}
                          queuePosition={queuePosition >= 0 ? queuePosition : undefined}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            // 平铺视图（原来的）
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {scenes.map((scene) => {
                // 计算队列位置 (仅在批量生成模式下)
                const eligibleScenes = scenes.filter(
                  s => s.user_approved && s.preview_image_url && !s.video_url
                );
                const queuePosition = eligibleScenes.findIndex(s => s.id === scene.id);

                return (
                  <SceneCard
                    key={scene.id}
                    scene={scene}
                    locations={locations}
                    onApprove={handleApproveScene}
                    onReject={handleRejectScene}
                    onRegenerate={handleRegenerateScene}
                    onGenerateImage={handleGenerateSingleImage}
                    onGenerateVideo={handleGenerateVideo}
                    onReset={handleResetScene}
                    onEdit={handleEditScene}
                    onInsertBefore={handleInsertBefore}
                    onInsertAfter={handleInsertAfter}
                    onDelete={handleDeleteScene}
                    onTrim={handleTrimScene}
                    onSaveToLibrary={handleSaveToLibrary}
                    isGeneratingImage={generatingImageSceneId === scene.id}
                    isGeneratingVideo={generatingVideoSceneId === scene.id}
                    isApproving={approvingSceneId === scene.id}
                    isSavingToLibrary={savingToLibrarySceneId === scene.id}
                    isBatchMode={isBatchGenerating}
                    queuePosition={queuePosition >= 0 ? queuePosition : undefined}
                  />
                );
              })}
            </div>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Film className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              {project.status === "parsing" || project.status === "storyboarding"
                ? "正在生成分镜，请稍候..."
                : "暂无分镜数据"}
            </p>
            {project.status !== "parsing" && project.status !== "storyboarding" && (
              <Button onClick={handleGenerateScenes} disabled={isGeneratingScenes}>
                {isGeneratingScenes ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />生成中...</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" />重新生成分镜</>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* 裁剪对话框 */}
      {trimmingScene && trimmingScene.video_url && (
        <TrimDialog
          open={!!trimmingScene}
          onOpenChange={(open) => !open && setTrimmingScene(null)}
          videoUrl={trimmingScene.video_url}
          sceneIndex={trimmingScene.scene_index}
          onConfirm={handleTrimConfirm}
        />
      )}

      {/* 场景管理弹窗 */}
      <Dialog open={showLocationsDialog} onOpenChange={setShowLocationsDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              场景管理
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {locations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">暂无场景，点击下方按钮添加</p>
            ) : (
              locations.map((location) => (
                <LocationEditCard
                  key={location.id}
                  location={location}
                  isGenerating={generatingLocationId === location.id}
                  onUpdate={(updates) => handleUpdateLocation(location.id, updates)}
                  onGenerateBackground={() => handleGenerateLocationBackground(location.id)}
                  onDelete={() => handleDeleteLocation(location.id)}
                />
              ))
            )}
            <Button variant="outline" className="w-full border-dashed" onClick={handleAddLocation}>
              <Plus className="h-4 w-4 mr-2" />
              新增场景
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 场景编辑卡片（内嵌在弹窗中）
interface LocationEditCardProps {
  location: Location;
  isGenerating: boolean;
  onUpdate: (updates: { name?: string; description?: string }) => void;
  onGenerateBackground: () => void;
  onDelete: () => void;
}

function LocationEditCard({ location, isGenerating, onUpdate, onGenerateBackground, onDelete }: LocationEditCardProps) {
  const [name, setName] = useState(location.name || "");
  const [description, setDescription] = useState(location.description || "");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (name !== location.name) onUpdate({ name });
    }, 500);
    return () => clearTimeout(timer);
  }, [name]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (description !== (location.description || "")) onUpdate({ description });
    }, 500);
    return () => clearTimeout(timer);
  }, [description]);

  const currentImage = location.panorama_url || location.reference_image_url;

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            {/* 左侧：场景图 */}
            <div className="flex-shrink-0 w-40">
              {isGenerating ? (
                <div className="w-full aspect-video rounded-lg border-2 border-dashed border-primary/50 flex flex-col items-center justify-center gap-1 bg-primary/5">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-xs text-primary">生成中...</span>
                </div>
              ) : currentImage ? (
                <button
                  onClick={() => setPreviewImage(currentImage)}
                  className="relative w-full aspect-video rounded-lg overflow-hidden border group cursor-pointer"
                >
                  <img src={currentImage} alt={location.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <ZoomIn className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              ) : (
                <div className="w-full aspect-video rounded-lg border-2 border-dashed border-muted flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2 h-7 text-xs"
                onClick={onGenerateBackground}
                disabled={isGenerating}
              >
                {currentImage ? <RefreshCw className="h-3 w-3 mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                {currentImage ? "重新生成" : "生成场景图"}
              </Button>
            </div>

            {/* 右侧：场景信息 */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">场景名称</Label>
                <button
                  onClick={onDelete}
                  className="text-muted-foreground/50 hover:text-destructive transition-colors"
                  title="删除场景"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="输入场景名称"
                className="h-8 text-sm"
              />
              <div>
                <Label className="text-xs text-muted-foreground">场景描述（中文）</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="描述场景的环境、氛围、时间等..."
                  className="mt-1 min-h-[80px] resize-none text-sm"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 图片预览弹窗 */}
      {previewImage && (
        <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>{location.name}</DialogTitle>
            </DialogHeader>
            <img src={previewImage} alt={location.name} className="w-full rounded-lg" />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
