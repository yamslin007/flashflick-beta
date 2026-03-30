"use client";

import { useEffect, useState, use, useRef, useCallback } from "react";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Loader2,
  User,
  Sparkles,
  RefreshCw,
  X,
  ZoomIn,
  Download,
  Brush,
  Eraser,
  Library,
  Check,
  CheckCircle2,
  Layers,
  ChevronLeft,
  ChevronRight,
  MousePointerClick,
} from "lucide-react";
import { StepIndicator } from "@/components/project/step-indicator";

// 角色多视角资源类型
interface CharacterAssets {
  sheet_url?: string;       // 完整三视图设计稿 (横图)
  front?: string;           // 原始正面立绘
  generated_at?: string;    // 生成时间
}

interface Character {
  id: string;
  project_id: string | null;
  name: string | null;
  description: string | null;
  base_prompt: string | null;
  reference_images: string[] | null;
  assets: CharacterAssets | null; // 多视角立绘资源
  created_at: string;
  // 标记是否从角色库导入（有立绘的）
  fromLibrary?: boolean;
}

// 角色库中的角色（包含项目标题）
interface LibraryCharacter extends Character {
  project_title: string | null;
}

interface Project {
  id: string;
  title: string | null;
  status: string;
  style_config: { artStyle?: string } | null;
}

interface CharactersPageProps {
  params: Promise<{ id: string }>;
}

export default function CharactersPage({ params }: CharactersPageProps) {
  const { id: projectId } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [generatingPortraitId, setGeneratingPortraitId] = useState<string | null>(null);
  const [generatingType, setGeneratingType] = useState<"portrait" | "sheet" | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const [inpaintingCharacter, setInpaintingCharacter] = useState<Character | null>(null);
  // 角色库弹窗
  const [showLibraryDialog, setShowLibraryDialog] = useState(false);

  // 下载图片
  const handleDownloadImage = async (url: string, name: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `${name || "character"}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("下载失败:", error);
      alert("下载失败");
    }
  };

  // 加载项目和角色数据
  useEffect(() => {
    async function fetchData() {
      try {
        // 并行获取项目信息和角色列表（提升加载速度）
        const [projectRes, charactersRes] = await Promise.all([
          fetch(`/api/projects/${projectId}`),
          fetch(`/api/projects/${projectId}/characters`),
        ]);

        const [projectData, charactersData] = await Promise.all([
          projectRes.json(),
          charactersRes.json(),
        ]);

        if (projectData.success) {
          setProject(projectData.data);
        }

        if (charactersData.success) {
          setCharacters(charactersData.data || []);
        }
      } catch (error) {
        console.error("加载数据失败:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [projectId]);

  // 添加新角色
  const handleAddCharacter = async () => {
    try {
      const res = await fetch("/api/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          name: "新角色",
          description: "",
        }),
      });

      const data = await res.json();
      if (data.success) {
        setCharacters([...characters, data.data]);
      } else {
        alert(data.error || "添加角色失败");
      }
    } catch (error) {
      console.error("添加角色失败:", error);
      alert("添加角色失败");
    }
  };

  // 从角色库添加角色
  const handleAddFromLibrary = async (libraryCharacters: LibraryCharacter[]) => {
    try {
      const newCharacters: Character[] = [];

      for (const char of libraryCharacters) {
        const res = await fetch("/api/characters", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            name: char.name,
            description: char.description,
            referenceImages: char.reference_images || [],
          }),
        });

        const data = await res.json();
        if (data.success) {
          // 标记为从角色库导入
          newCharacters.push({ ...data.data, fromLibrary: true });
        }
      }

      if (newCharacters.length > 0) {
        setCharacters([...characters, ...newCharacters]);
      }

      setShowLibraryDialog(false);
    } catch (error) {
      console.error("从角色库添加失败:", error);
      alert("添加失败");
    }
  };

  // 更新角色
  const handleUpdateCharacter = async (
    characterId: string,
    updates: { name?: string; description?: string; basePrompt?: string; referenceImages?: string[] }
  ) => {
    try {
      const res = await fetch(`/api/characters/${characterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      const data = await res.json();
      if (data.success) {
        setCharacters(
          characters.map((c) => (c.id === characterId ? data.data : c))
        );
      }
    } catch (error) {
      console.error("更新角色失败:", error);
    }
  };

  // 删除角色
  const handleDeleteCharacter = async (characterId: string) => {
    if (!confirm("确定要删除此角色吗？")) return;

    try {
      const res = await fetch(`/api/characters/${characterId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (data.success) {
        setCharacters(characters.filter((c) => c.id !== characterId));
      } else {
        alert(data.error || "删除角色失败");
      }
    } catch (error) {
      console.error("删除角色失败:", error);
      alert("删除角色失败");
    }
  };

  // 删除角色立绘（仅删除图片，保留角色）
  const handleDeletePortrait = async (characterId: string) => {
    if (!confirm("确定要删除这个立绘吗？角色信息会保留。")) return;

    try {
      const res = await fetch(`/api/characters/${characterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referenceImages: [],
          assets: null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setCharacters(
          characters.map((c) =>
            c.id === characterId
              ? { ...c, reference_images: [], assets: null }
              : c
          )
        );
      } else {
        alert(data.error || "删除立绘失败");
      }
    } catch (error) {
      console.error("删除立绘失败:", error);
      alert("删除立绘失败");
    }
  };

  // 生成角色形象（单张立绘）
  const handleGeneratePortrait = async (characterId: string) => {
    const character = characters.find((c) => c.id === characterId);
    if (!character?.base_prompt && !character?.description) {
      alert("请先填写角色外观描述");
      return;
    }

    setGeneratingPortraitId(characterId);
    setGeneratingType("portrait");

    try {
      console.log("[前端] 开始生成角色形象:", characterId);

      const res = await fetch(`/api/characters/${characterId}/generate-portrait`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          style: project?.style_config?.artStyle || "ghibli",
        }),
      });

      console.log("[前端] 响应状态:", res.status, res.statusText);

      // 检查响应状态
      if (!res.ok) {
        const errorText = await res.text();
        console.error("[前端] 响应错误:", errorText);
        alert(`生成失败: ${res.status} - ${errorText.substring(0, 100)}`);
        return;
      }

      // 尝试解析 JSON
      let data;
      try {
        const responseText = await res.text();
        console.log("[前端] 响应长度:", responseText.length, "字节");
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("[前端] JSON 解析失败:", parseError);
        alert("响应解析失败，请重试");
        return;
      }

      if (data.success) {
        console.log("[前端] 生成成功，图片 URL 长度:", data.data.imageUrl?.length || 0);
        setCharacters(
          characters.map((c) =>
            c.id === characterId
              ? { ...c, reference_images: [data.data.imageUrl] }
              : c
          )
        );
      } else {
        console.error("[前端] API 返回失败:", data.error);
        alert(data.error || "生成失败");
      }
    } catch (error) {
      console.error("[前端] 生成角色形象失败:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`生成角色形象失败: ${errorMessage}`);
    } finally {
      setGeneratingPortraitId(null);
      setGeneratingType(null);
    }
  };

  // 生成角色三视图（正面、侧面、背面）
  // 返回 Promise 以便 CharacterCard 管理自己的加载状态
  const handleGenerateSheet = async (characterId: string): Promise<void> => {
    const character = characters.find((c) => c.id === characterId);
    if (!character?.description) {
      alert("请先填写角色外观描述");
      return;
    }

    try {
      const res = await fetch(`/api/characters/${characterId}/generate-sheet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          style: project?.style_config?.artStyle || "anime",
        }),
      });

      const data = await res.json();
      if (data.success) {
        const assets = data.data.assets as CharacterAssets;
        setCharacters(
          characters.map((c) =>
            c.id === characterId
              ? {
                  ...c,
                  reference_images: [assets.front || ""],
                  assets: assets,
                }
              : c
          )
        );
      } else {
        alert(data.error || "生成三视图失败");
      }
    } catch (error) {
      console.error("生成角色三视图失败:", error);
      alert("生成角色三视图失败");
    }
  };

  // 确认并继续
  const handleConfirmAndContinue = async () => {
    setIsSaving(true);
    try {
      // 触发分镜生成（API 内部会将状态改为 storyboard_ready）
      const res = await fetch(`/api/projects/${projectId}/generate-scenes`, {
        method: "POST",
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || "生成分镜失败，请重试");
        return;
      }
      // 跳转到分镜预览页
      router.push(`/projects/${projectId}`);
    } catch (error) {
      console.error("保存失败:", error);
      alert("保存失败");
    } finally {
      setIsSaving(false);
    }
  };

  // 跳过角色设定
  const handleSkipCharacters = async () => {
    if (!confirm("跳过角色设定后，AI 生成的角色可能不一致。确定要跳过吗？")) {
      return;
    }

    setIsSaving(true);
    try {
      // 触发分镜生成（API 内部会将状态改为 storyboard_ready）
      const res = await fetch(`/api/projects/${projectId}/generate-scenes`, {
        method: "POST",
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || "生成分镜失败，请重试");
        return;
      }
      // 跳转到项目详情页（分镜预览）
      router.push(`/projects/${projectId}`);
    } catch (error) {
      console.error("保存失败:", error);
      alert("保存失败");
    } finally {
      setIsSaving(false);
    }
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
        <div className="flex items-center gap-4">
          <Link href={`/projects/${projectId}/script`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">步骤2：角色立绘</h1>
            <p className="text-muted-foreground text-sm">
              {project?.title || "未命名项目"}
            </p>
          </div>
        </div>

        {/* 步骤指示器 */}
        <StepIndicator
          steps={[
            { id: "title_characters_pending", label: "标题与角色", href: `/projects/${projectId}/script` },
            { id: "characters_pending", label: "角色立绘" },
            { id: "storyboard_ready", label: "分镜预览", href: `/projects/${projectId}` },
            { id: "video_generation", label: "视频生成" },
            { id: "completed", label: "完成" },
          ]}
          currentStep="characters_pending"
        />
      </div>

      {/* 说明 */}
      <div className="mb-6 p-4 bg-muted/50 rounded-lg">
        <p className="text-sm text-muted-foreground">
          请确认和编辑角色信息。可以从角色库导入已有角色，或为新角色生成 AI 形象。
        </p>
      </div>

      {/* 从角色库添加按钮 */}
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => setShowLibraryDialog(true)}
          className="w-full border-dashed"
        >
          <Library className="h-4 w-4 mr-2" />
          从角色库添加已有角色
        </Button>
      </div>

      {/* 角色列表 */}
      <div className="space-y-6 mb-8">
        {characters.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">暂无角色</p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={() => setShowLibraryDialog(true)}>
                  <Library className="h-4 w-4 mr-2" />
                  从角色库添加
                </Button>
                <Button onClick={handleAddCharacter}>
                  <Plus className="h-4 w-4 mr-2" />
                  新建角色
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* 已有立绘的角色 */}
            {characters.filter(c => c.reference_images && c.reference_images.length > 0).length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <h3 className="text-sm font-medium text-muted-foreground">
                    已有立绘的角色
                  </h3>
                </div>
                <div className="space-y-4">
                  {characters
                    .filter(c => c.reference_images && c.reference_images.length > 0)
                    .map((character) => (
                      <CharacterCard
                        key={character.id}
                        character={character}
                        onUpdate={(updates) => handleUpdateCharacter(character.id, updates)}
                        onDelete={() => handleDeleteCharacter(character.id)}
                        onDeletePortrait={() => handleDeletePortrait(character.id)}
                        onGeneratePortrait={() => handleGeneratePortrait(character.id)}
                        onGenerateSheet={() => handleGenerateSheet(character.id)}
                        onPreviewImage={(url) => setPreviewImage({ url, name: character.name || "角色形象" })}
                        onDownload={() => {
                          const url = character.reference_images?.[0];
                          if (url) handleDownloadImage(url, character.name || "character");
                        }}
                        onDownloadUrl={handleDownloadImage}
                        onInpaint={() => setInpaintingCharacter(character)}
                        isGenerating={generatingPortraitId === character.id}
                        generatingType={generatingPortraitId === character.id ? generatingType ?? undefined : undefined}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* 需要生成立绘的角色 */}
            {characters.filter(c => !c.reference_images || c.reference_images.length === 0).length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-orange-500" />
                  <h3 className="text-sm font-medium text-muted-foreground">
                    需要生成立绘的角色
                  </h3>
                </div>
                <div className="space-y-4">
                  {characters
                    .filter(c => !c.reference_images || c.reference_images.length === 0)
                    .map((character) => (
                      <CharacterCard
                        key={character.id}
                        character={character}
                        onUpdate={(updates) => handleUpdateCharacter(character.id, updates)}
                        onDelete={() => handleDeleteCharacter(character.id)}
                        onDeletePortrait={() => handleDeletePortrait(character.id)}
                        onGeneratePortrait={() => handleGeneratePortrait(character.id)}
                        onGenerateSheet={() => handleGenerateSheet(character.id)}
                        onPreviewImage={(url) => setPreviewImage({ url, name: character.name || "角色形象" })}
                        onDownload={() => {
                          const url = character.reference_images?.[0];
                          if (url) handleDownloadImage(url, character.name || "character");
                        }}
                        onDownloadUrl={handleDownloadImage}
                        onInpaint={() => setInpaintingCharacter(character)}
                        isGenerating={generatingPortraitId === character.id}
                        generatingType={generatingPortraitId === character.id ? generatingType ?? undefined : undefined}
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
          <Button variant="outline" onClick={() => setShowLibraryDialog(true)}>
            <Library className="h-4 w-4 mr-2" />
            从角色库添加
          </Button>
          <Button variant="outline" onClick={handleAddCharacter}>
            <Plus className="h-4 w-4 mr-2" />
            新建角色
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={handleSkipCharacters}
            disabled={isSaving}
          >
            跳过角色设定
          </Button>
          <Button onClick={handleConfirmAndContinue} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                保存中...
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
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
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
                className="w-full h-auto max-h-[80vh] object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 局部重绘弹窗 */}
      {inpaintingCharacter && (
        <InpaintDialog
          character={inpaintingCharacter}
          onClose={() => setInpaintingCharacter(null)}
          onSuccess={(imageUrl) => {
            setCharacters(
              characters.map((c) =>
                c.id === inpaintingCharacter.id
                  ? { ...c, reference_images: [imageUrl] }
                  : c
              )
            );
            setInpaintingCharacter(null);
          }}
        />
      )}

      {/* 角色库选择弹窗 */}
      {showLibraryDialog && (
        <CharacterLibraryDialog
          currentProjectId={projectId}
          existingCharacterNames={characters.map(c => c.name || "")}
          onClose={() => setShowLibraryDialog(false)}
          onSelect={handleAddFromLibrary}
        />
      )}
    </div>
  );
}

// 角色卡片组件
// 状态1: 有正面立绘，待生成三视图
// 状态2: 已有三视图
interface CharacterCardProps {
  character: Character;
  onUpdate: (updates: { name?: string; description?: string; basePrompt?: string }) => void;
  onDelete: () => void;
  onDeletePortrait: () => void;  // 仅删除立绘图片，不删除角色
  onGeneratePortrait: () => void;
  onGenerateSheet: () => Promise<void>;
  onPreviewImage: (url: string) => void;
  onDownload: () => void;
  onDownloadUrl: (url: string, name: string) => void;  // 下载指定 URL 的图片
  onInpaint: () => void;
  isGenerating: boolean;
  generatingType?: "portrait" | "sheet";
}

function CharacterCard({
  character,
  onUpdate,
  onDelete,
  onDeletePortrait,
  onGeneratePortrait,
  onGenerateSheet,
  onPreviewImage,
  onDownload,
  onDownloadUrl,
  onInpaint,
  isGenerating,
  generatingType,
}: CharacterCardProps) {
  const [name, setName] = useState(character.name || "");
  const [description, setDescription] = useState(character.description || "");
  // 外观描述（用于生图）：优先用 base_prompt，没有则 fallback 到 description
  const [basePrompt, setBasePrompt] = useState(character.base_prompt || character.description || "");
  const [isGeneratingSheet, setIsGeneratingSheet] = useState(false);
  const [isRegenerateSheet, setIsRegenerateSheet] = useState(false);
  // 中文描述编辑弹窗
  const [showDescriptionDialog, setShowDescriptionDialog] = useState(false);
  const [editingDescription, setEditingDescription] = useState("");
  // 是否正在用 AI 重新生成英文 prompt
  const [isRegeneratingPrompt, setIsRegeneratingPrompt] = useState(false);
  // 英文外观描述编辑弹窗
  const [showBasePromptDialog, setShowBasePromptDialog] = useState(false);
  const [editingBasePrompt, setEditingBasePrompt] = useState("");
  // 英文外观描述是否展开
  const [showBasePrompt, setShowBasePrompt] = useState(false);

  // 防抖更新 name
  useEffect(() => {
    const timer = setTimeout(() => {
      if (name !== character.name) {
        onUpdate({ name });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [name]);

  // 防抖更新 basePrompt（外观描述，用于生图）
  useEffect(() => {
    const timer = setTimeout(() => {
      if (basePrompt !== character.base_prompt) {
        onUpdate({ basePrompt });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [basePrompt]);

  // 打开编辑弹窗
  const handleOpenDescriptionDialog = () => {
    setEditingDescription(description);
    setShowDescriptionDialog(true);
  };

  // 打开英文外观描述编辑弹窗
  const handleOpenBasePromptDialog = () => {
    setEditingBasePrompt(basePrompt);
    setShowBasePromptDialog(true);
  };

  // 确认英文外观描述修改
  const handleConfirmBasePrompt = () => {
    setBasePrompt(editingBasePrompt);
    onUpdate({ basePrompt: editingBasePrompt });
    setShowBasePromptDialog(false);
  };

  // 确认中文描述修改：保存描述并用 AI 重新生成英文 prompt
  const handleConfirmDescription = async () => {
    setIsRegeneratingPrompt(true);
    try {
      setDescription(editingDescription);
      onUpdate({ description: editingDescription });

      const res = await fetch(`/api/characters/${character.id}/regenerate-prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: editingDescription }),
      });
      const data = await res.json();
      if (data.success) {
        setBasePrompt(data.data.generatedPrompt || data.data.base_prompt || "");
      } else {
        alert(data.error || "生成英文描述失败，请手动修改");
      }
    } catch {
      alert("生成英文描述失败，请手动修改");
    } finally {
      setIsRegeneratingPrompt(false);
      setShowDescriptionDialog(false);
    }
  };

  // 状态判断
  const assets = character.assets;
  const hasSheet = assets && assets.sheet_url;  // 有三视图设计稿
  const hasPortrait = character.reference_images && character.reference_images.length > 0;
  const frontImage = character.reference_images?.[0];

  const handleGenerateSheet: React.MouseEventHandler<HTMLButtonElement> = async () => {
    // 如果是重新生成，先确认
    if (isRegenerateSheet && hasSheet) {
      if (!confirm("重新生成将覆盖当前的设计稿，确定继续吗？")) {
        setIsRegenerateSheet(false);
        return;
      }
    }
    setIsGeneratingSheet(true);
    try {
      await onGenerateSheet();
    } finally {
      setIsGeneratingSheet(false);
      setIsRegenerateSheet(false);
    }
  };

  // 下载三视图
  const handleDownloadSheet = () => {
    const characterName = character.name || "character";
    if (assets?.sheet_url) {
      // 下载完整三视图设计稿
      onDownloadUrl(assets.sheet_url, `${characterName}-三视图`);
    } else if (frontImage) {
      // 没有三视图时下载正面立绘
      onDownload();
    }
  };

  return (
    <Card>
      <CardContent className="p-5">
        {/* 状态1: 只有正面立绘 或 无立绘 */}
        {!hasSheet && (
          <div className="flex gap-5 items-stretch min-h-[220px]">
            {/* 左侧：角色信息 */}
            <div className="flex-1 flex flex-col gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">角色名称</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="输入角色名称"
                  className="mt-1"
                />
              </div>
              <div className="flex-1 flex flex-col gap-2">
                {/* 中文角色简介 */}
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs text-muted-foreground">角色简介</Label>
                    <button
                      className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                      onClick={handleOpenDescriptionDialog}
                    >
                      修改
                    </button>
                  </div>
                  <p className="text-sm min-h-[40px] px-3 py-2 rounded-md border bg-muted/30 text-foreground whitespace-pre-wrap break-words overflow-hidden">
                    {description || <span className="text-muted-foreground">暂无角色简介</span>}
                  </p>
                </div>
                {/* 英文外观描述（用于生图）- 可折叠 */}
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => setShowBasePrompt(!showBasePrompt)}
                    className="flex items-center justify-between mb-1 group"
                  >
                    <Label className="text-xs text-muted-foreground cursor-pointer group-hover:text-foreground">
                      外观描述（英文/中文，用于角色生图）
                      <ChevronRight className={`inline h-3 w-3 ml-1 transition-transform ${showBasePrompt ? "rotate-90" : ""}`} />
                    </Label>
                  </button>
                  {showBasePrompt && (
                    <div className="mt-1 px-3 py-2 rounded-md border bg-muted/30">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs text-muted-foreground font-mono break-words overflow-hidden min-w-0 flex-1">
                          {basePrompt || <span className="italic">暂无外观描述</span>}
                        </p>
                        <button
                          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 shrink-0"
                          onClick={handleOpenBasePromptDialog}
                        >
                          修改
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 右侧：立绘 - pt-5 让立绘框与名称输入框顶部对齐 */}
            <div className="flex-shrink-0 w-36 flex flex-col pt-5">
              {(isGenerating && generatingType === "portrait") ? (
                <div className="flex-1 w-36 rounded-lg border-2 border-dashed border-primary/50
                  flex flex-col items-center justify-center gap-2 bg-primary/5">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="text-xs text-primary">生成中...</span>
                </div>
              ) : hasPortrait ? (
                <div className="flex-1 flex flex-col gap-2">
                  <button
                    onClick={() => frontImage && onPreviewImage(frontImage)}
                    className="relative flex-1 w-36 min-h-[140px] rounded-lg overflow-hidden border group cursor-pointer"
                  >
                    <img src={frontImage} alt={character.name || "角色"} className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
                      <p className="text-white/70 text-[10px] text-center">正面</p>
                      {character.name && (
                        <p className="text-white text-xs font-medium text-center truncate">{character.name}</p>
                      )}
                    </div>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" className="flex-1 h-7 px-0" onClick={onGeneratePortrait} title="重新生成">
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 h-7 px-0" onClick={onInpaint} title="局部重绘">
                      <Brush className="h-3 w-3" />
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 h-7 px-0" onClick={onDownload} title="下载">
                      <Download className="h-3 w-3" />
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 h-7 px-0 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50" onClick={onDeletePortrait} title="删除立绘">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col gap-2">
                  <button
                    onClick={onGeneratePortrait}
                    disabled={!basePrompt}
                    className={`group relative flex-1 w-36 min-h-[140px] rounded-lg border-2
                      flex flex-col items-center justify-center gap-3
                      transition-all duration-300
                      ${basePrompt
                        ? "border-dashed text-muted-foreground animate-breathing-border hover:border-solid hover:border-foreground/50 hover:bg-muted/50 hover:text-foreground hover:shadow-[0_0_20px_rgba(0,0,0,0.1)]"
                        : "border-dashed border-muted-foreground/30 text-muted-foreground/50 opacity-50 cursor-not-allowed"
                      }`}
                  >
                    {/* 呼吸光晕背景 - 仅在有描述时显示 */}
                    {basePrompt && (
                      <div className="absolute inset-0 rounded-lg animate-breathing-glow
                        group-hover:opacity-100 group-hover:bg-muted/30 group-hover:animate-none transition-all" />
                    )}

                    {/* 浮动小星星 - 仅在有描述时显示 */}
                    {basePrompt && (
                      <div className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none
                        group-hover:opacity-0 transition-opacity duration-300">
                        <span className="absolute top-3 left-4 text-[10px] text-muted-foreground/40 animate-sparkle-float-1">✦</span>
                        <span className="absolute top-6 right-5 text-[8px] text-muted-foreground/30 animate-sparkle-float-2">✦</span>
                        <span className="absolute bottom-12 left-6 text-[9px] text-muted-foreground/35 animate-sparkle-float-3">✦</span>
                        <span className="absolute bottom-8 right-4 text-[10px] text-muted-foreground/40 animate-sparkle-float-4">✦</span>
                      </div>
                    )}

                    {/* Sparkles 图标 */}
                    <Sparkles className={`relative h-7 w-7 transition-all duration-300
                      ${basePrompt
                        ? "animate-breathing-icon group-hover:animate-none group-hover:scale-110 group-hover:text-foreground"
                        : "text-muted-foreground/50"
                      }`} />

                    {/* 文字 */}
                    <span className={`relative text-xs transition-colors duration-300
                      ${basePrompt ? "group-hover:text-foreground" : ""}`}>
                      点击生成立绘
                    </span>

                    {/* 手指图标 - 在文字下方浮动 */}
                    {basePrompt && (
                      <MousePointerClick className="h-4 w-4 animate-finger-float
                        group-hover:animate-none group-hover:text-foreground/70 transition-colors" />
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 生成三视图按钮 - 仅当有正面立绘且无三视图时显示 */}
        {hasPortrait && !hasSheet && (
          <div className="mt-4">
            <Button
              className="w-full"
              onClick={handleGenerateSheet}
              disabled={isGeneratingSheet}
            >
              {isGeneratingSheet ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  正在生成三视图...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  满意，生成三视图
                </>
              )}
            </Button>
          </div>
        )}

        {/* 状态2: 已有三视图 */}
        {hasSheet && assets && (
          <div className="space-y-4">
            {/* 顶部信息区 */}
            <div className="flex gap-5">
              {/* 左侧：角色信息 */}
              <div className="flex-1 space-y-2">
                <div>
                  <Label className="text-xs text-muted-foreground">角色名称</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs text-muted-foreground">角色简介</Label>
                    <button
                      className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                      onClick={handleOpenDescriptionDialog}
                    >
                      修改
                    </button>
                  </div>
                  <p className="text-sm min-h-[40px] px-3 py-2 rounded-md border bg-muted/30 text-foreground whitespace-pre-wrap break-words overflow-hidden">
                    {description || <span className="text-muted-foreground">暂无角色简介</span>}
                  </p>
                </div>
              </div>

              {/* 右侧：正面立绘缩略图 */}
              <div className="flex-shrink-0">
                <div className="relative">
                  <button
                    onClick={() => frontImage && onPreviewImage(frontImage)}
                    className="w-24 h-30 rounded-lg overflow-hidden border group cursor-pointer"
                  >
                    <img src={frontImage} alt="正面" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                  <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-green-600 text-white flex items-center justify-center">
                    <Check className="h-3 w-3" />
                  </div>
                </div>
                <div className="flex gap-1 mt-1">
                  <Button variant="outline" size="sm" className="flex-1 h-6 px-0 text-[10px]" onClick={onGeneratePortrait} title="重新生成正面">
                    <RefreshCw className="h-2.5 w-2.5" />
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 h-6 px-0 text-[10px]" onClick={onInpaint} title="局部重绘">
                    <Brush className="h-2.5 w-2.5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* 分隔线 */}
            <div className="border-t" />

            {/* 三视图设计稿展示 */}
            <div>
              <p className="text-sm font-medium mb-3">三视图设计稿</p>
              <button
                onClick={() => assets.sheet_url && onPreviewImage(assets.sheet_url)}
                className="relative w-full rounded-lg overflow-hidden border bg-muted/30 group cursor-pointer"
              >
                <img
                  src={assets.sheet_url}
                  alt="三视图设计稿"
                  className="w-full h-auto object-contain"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                </div>
              </button>
              <div className="flex gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={(e) => { setIsRegenerateSheet(true); handleGenerateSheet(e); }}
                  disabled={isGeneratingSheet}
                >
                  {isGeneratingSheet ? (
                    <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3 mr-1.5" />
                  )}
                  重新生成
                </Button>
                <Button variant="outline" size="sm" className="h-8" onClick={handleDownloadSheet}>
                  <Download className="h-3 w-3 mr-1.5" />
                  下载
                </Button>
              </div>
            </div>

          </div>
        )}

        {/* 删除按钮 - 仅在三视图状态显示（状态1的删除在图标行里） */}
        {hasSheet && (
          <div className="mt-4 pt-4 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive h-8 px-2"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              删除角色
            </Button>
          </div>
        )}
      </CardContent>

      {/* 角色简介编辑弹窗 */}
      <Dialog open={showDescriptionDialog} onOpenChange={(open) => {
        if (!isRegeneratingPrompt) setShowDescriptionDialog(open);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>编辑角色简介</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Textarea
              value={editingDescription}
              onChange={(e) => setEditingDescription(e.target.value)}
              placeholder="描述角色的性格、身份、背景等（中文）..."
              className="min-h-[120px] resize-none text-sm"
              disabled={isRegeneratingPrompt}
            />
            <p className="text-xs text-muted-foreground">
              确认后将自动更新英文外观描述（用于生图）
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDescriptionDialog(false)}
                disabled={isRegeneratingPrompt}
              >
                取消
              </Button>
              <Button
                onClick={handleConfirmDescription}
                disabled={isRegeneratingPrompt || !editingDescription.trim()}
              >
                {isRegeneratingPrompt ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    更新中...
                  </>
                ) : (
                  "确认"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 英文外观描述编辑弹窗 */}
      <Dialog open={showBasePromptDialog} onOpenChange={setShowBasePromptDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>编辑外观描述</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Textarea
              value={editingBasePrompt}
              onChange={(e) => setEditingBasePrompt(e.target.value)}
              placeholder="Describe appearance in English, e.g. blue hair, sailor uniform..."
              className="min-h-[120px] resize-none text-sm font-mono"
            />
            <p className="text-xs text-muted-foreground">
              修改后需重新生成立绘才会生效
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowBasePromptDialog(false)}>
                取消
              </Button>
              <Button
                onClick={handleConfirmBasePrompt}
                disabled={!editingBasePrompt.trim()}
              >
                确认
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// 局部重绘弹窗组件
interface InpaintDialogProps {
  character: Character;
  onClose: () => void;
  onSuccess: (imageUrl: string) => void;
}

function InpaintDialog({ character, onClose, onSuccess }: InpaintDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(30);
  const [isEraser, setIsEraser] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const imageUrl = character.reference_images?.[0];

  // 初始化 canvas
  useEffect(() => {
    if (!imageLoaded || !canvasRef.current || !imageRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 设置 canvas 尺寸与图片一致
    canvas.width = imageRef.current.naturalWidth;
    canvas.height = imageRef.current.naturalHeight;

    // 清空画布（透明）
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, [imageLoaded]);

  // 获取鼠标在 canvas 上的位置
  const getCanvasPosition = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  // 绘制
  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCanvasPosition(e);

    ctx.globalCompositeOperation = isEraser ? "destination-out" : "source-over";
    ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
  }, [isDrawing, brushSize, isEraser, getCanvasPosition]);

  // 开始绘制
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    draw(e);
  };

  // 停止绘制
  const stopDrawing = () => {
    setIsDrawing(false);
  };

  // 清除遮罩
  const clearMask = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // 获取 mask 图像（白色=重绘区域，黑色=保留区域）
  const getMaskDataUrl = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // 创建新的 canvas 用于生成 mask
    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = canvas.width;
    maskCanvas.height = canvas.height;
    const maskCtx = maskCanvas.getContext("2d");
    if (!maskCtx) return null;

    // 填充黑色背景
    maskCtx.fillStyle = "black";
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

    // 获取原始 canvas 的图像数据
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const maskImageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);

    // 将有颜色的区域转为白色
    for (let i = 0; i < imageData.data.length; i += 4) {
      if (imageData.data[i + 3] > 0) {
        // 如果有 alpha 值，说明被绘制过
        maskImageData.data[i] = 255; // R
        maskImageData.data[i + 1] = 255; // G
        maskImageData.data[i + 2] = 255; // B
        maskImageData.data[i + 3] = 255; // A
      }
    }

    maskCtx.putImageData(maskImageData, 0, 0);
    return maskCanvas.toDataURL("image/png");
  };

  // 提交重绘
  const handleSubmit = async () => {
    const mask = getMaskDataUrl();
    if (!mask) {
      alert("请先绘制需要重绘的区域");
      return;
    }

    if (!prompt.trim()) {
      alert("请输入重绘提示词");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/characters/${character.id}/inpaint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mask,
          prompt: prompt.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        onSuccess(data.data.imageUrl);
      } else {
        alert(data.error || "局部重绘失败");
      }
    } catch (error) {
      console.error("局部重绘失败:", error);
      alert("局部重绘失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>局部重绘 - {character.name || "角色"}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          <div className="space-y-4">
            {/* 说明 */}
            <p className="text-sm text-muted-foreground">
              用画笔涂抹需要重绘的区域（红色），然后输入想要生成的内容描述。
            </p>

            {/* 工具栏 */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Button
                  variant={!isEraser ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsEraser(false)}
                >
                  <Brush className="h-4 w-4 mr-1" />
                  画笔
                </Button>
                <Button
                  variant={isEraser ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsEraser(true)}
                >
                  <Eraser className="h-4 w-4 mr-1" />
                  橡皮
                </Button>
              </div>

              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <Label className="text-sm whitespace-nowrap">笔刷大小:</Label>
                <Slider
                  value={[brushSize]}
                  onValueChange={(v) => setBrushSize(v[0])}
                  min={5}
                  max={100}
                  step={5}
                  className="flex-1"
                />
                <span className="text-sm w-8">{brushSize}</span>
              </div>

              <Button variant="outline" size="sm" onClick={clearMask}>
                清除遮罩
              </Button>
            </div>

            {/* 画布区域 */}
            <div className="flex justify-center">
              <div className="relative inline-block border rounded-lg overflow-hidden bg-muted/30">
                {imageUrl && (
                  <>
                    <img
                      ref={imageRef}
                      src={imageUrl}
                      alt="原图"
                      className="max-w-full max-h-[50vh] object-contain"
                      onLoad={() => setImageLoaded(true)}
                      crossOrigin="anonymous"
                    />
                    {imageLoaded && (
                      <canvas
                        ref={canvasRef}
                        className="absolute top-0 left-0 w-full h-full cursor-crosshair"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                      />
                    )}
                  </>
                )}
              </div>
            </div>

            {/* 提示词输入 */}
            <div className="space-y-2">
              <Label>重绘提示词</Label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="描述你想要在选中区域生成的内容，例如：蓝色的眼睛、红色的头发、微笑的表情..."
                className="min-h-[80px] resize-none"
              />
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                重绘中...
              </>
            ) : (
              <>
                <Brush className="h-4 w-4 mr-2" />
                开始重绘
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// 角色库选择弹窗组件
interface CharacterLibraryDialogProps {
  currentProjectId: string;
  existingCharacterNames: string[];
  onClose: () => void;
  onSelect: (characters: LibraryCharacter[]) => void;
}

function CharacterLibraryDialog({
  currentProjectId,
  existingCharacterNames,
  onClose,
  onSelect,
}: CharacterLibraryDialogProps) {
  const [libraryCharacters, setLibraryCharacters] = useState<LibraryCharacter[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  // 加载角色库
  useEffect(() => {
    async function fetchLibrary() {
      try {
        const res = await fetch("/api/characters");
        const data = await res.json();
        if (data.success) {
          // 过滤：排除当前项目的角色，只保留有立绘的角色
          const filtered = (data.data as LibraryCharacter[]).filter(
            (c) =>
              c.project_id !== currentProjectId &&
              c.reference_images &&
              c.reference_images.length > 0
          );
          setLibraryCharacters(filtered);
        }
      } catch (error) {
        console.error("加载角色库失败:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchLibrary();
  }, [currentProjectId]);

  // 切换选中状态
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // 确认添加
  const handleConfirm = async () => {
    if (selectedIds.size === 0) return;

    setIsAdding(true);
    const selectedCharacters = libraryCharacters.filter((c) =>
      selectedIds.has(c.id)
    );
    await onSelect(selectedCharacters);
    setIsAdding(false);
  };

  // 检查角色名是否已存在
  const isNameDuplicate = (name: string | null) => {
    return name ? existingCharacterNames.includes(name) : false;
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Library className="h-5 w-5" />
            从角色库添加
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          选择已有立绘的角色添加到当前项目，保持角色一致性。
        </p>

        <div className="flex-1 overflow-auto py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : libraryCharacters.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                角色库中没有可用的角色
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                只有已生成立绘的角色才能被复用
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {libraryCharacters.map((char) => {
                const isSelected = selectedIds.has(char.id);
                const isDuplicate = isNameDuplicate(char.name);

                return (
                  <button
                    key={char.id}
                    onClick={() => !isDuplicate && toggleSelect(char.id)}
                    disabled={isDuplicate}
                    className={`
                      relative p-3 rounded-lg border-2 text-left transition-all
                      ${isSelected
                        ? "border-primary bg-primary/5"
                        : isDuplicate
                          ? "border-muted bg-muted/30 opacity-60 cursor-not-allowed"
                          : "border-muted hover:border-muted-foreground/50"
                      }
                    `}
                  >
                    {/* 选中标记 */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                        <Check className="h-3 w-3" />
                      </div>
                    )}

                    {/* 角色立绘 */}
                    <div className="aspect-[3/4] rounded-md overflow-hidden mb-2 bg-muted relative">
                      {char.reference_images?.[0] && (
                        <img
                          src={char.reference_images[0]}
                          alt={char.name || "角色"}
                          className="w-full h-full object-cover"
                        />
                      )}
                      {/* 角色名称标签 */}
                      {char.name && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
                          <p className="text-white text-xs font-medium truncate">
                            {char.name}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* 角色信息 */}
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground truncate">
                        {char.project_title || "独立角色"}
                      </p>
                      {isDuplicate && (
                        <p className="text-xs text-orange-500">
                          同名角色已存在
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            已选择 {selectedIds.size} 个角色
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isAdding}>
              取消
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={selectedIds.size === 0 || isAdding}
            >
              {isAdding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  添加中...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  添加到项目
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
