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
import { Badge } from "@/components/ui/badge";
import { StepIndicator } from "@/components/project/step-indicator";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  User,
  Sparkles,
  Plus,
  Trash2,
} from "lucide-react";

// 类型定义
interface Character {
  id: string;
  name: string | null;
  description: string | null;
  base_prompt?: string | null;
  inline_look?: string | null;
}

interface Project {
  id: string;
  title: string | null;
  status: string;
  original_prompt: string | null;
  style_config: { artStyle?: string; aspectRatio?: string } | null;
  total_duration: number;
}

interface ScriptPageProps {
  params: Promise<{ id: string }>;
}

export default function ScriptPage({ params }: ScriptPageProps) {
  const { id: projectId } = use(params);
  const router = useRouter();

  // 数据状态
  const [project, setProject] = useState<Project | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);

  // 编辑状态
  const [editedTitle, setEditedTitle] = useState("");
  const [editedCharacters, setEditedCharacters] = useState<Character[]>([]);

  // UI 状态
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  // 加载数据
  useEffect(() => {
    async function fetchData() {
      try {
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
          setEditedTitle(projectData.data.title || "");

          // 路由保护：只有已完成分镜阶段才跳转
          const status = projectData.data.status;
          if (status === "storyboard_ready" || status === "generating" || status === "completed") {
            router.replace(`/projects/${projectId}`);
            return;
          }

          if (charactersData.success) {
            const chars = charactersData.data || [];
            setCharacters(chars);
            setEditedCharacters(chars);

            // 如果已有标题和角色，标记为已生成
            if (projectData.data.title && chars.length > 0) {
              setHasGenerated(true);
            }
          }

          // 如果还没有标题，自动触发 AI 生成
          if (!projectData.data.title) {
            setIsGenerating(true);
            try {
              const res = await fetch(`/api/projects/${projectId}/generate-title-characters`, {
                method: "POST",
              });
              const data = await res.json();
              if (data.success) {
                setEditedTitle(data.data.title);
                setCharacters(data.data.characters || []);
                setEditedCharacters(data.data.characters || []);
                setHasGenerated(true);
                setProject((prev) => prev ? { ...prev, title: data.data.title } : null);
              } else {
                console.error("自动生成失败:", data.error);
              }
            } catch (err) {
              console.error("自动生成失败:", err);
            } finally {
              setIsGenerating(false);
            }
            return;
          }
        } else if (charactersData.success) {
          setCharacters(charactersData.data || []);
          setEditedCharacters(charactersData.data || []);
        }
      } catch (error) {
        console.error("加载数据失败:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [projectId, router]);

  // 更新角色
  const updateCharacter = (id: string, updates: Partial<Character>) => {
    setEditedCharacters(
      editedCharacters.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      )
    );
  };

  // 添加角色
  const addCharacter = () => {
    const newChar: Character = {
      id: `new_${Date.now()}`,
      name: "新角色",
      description: "",
    };
    setEditedCharacters([...editedCharacters, newChar]);
  };

  // 删除角色
  const removeCharacter = (id: string) => {
    setEditedCharacters(editedCharacters.filter((c) => c.id !== id));
  };

  // AI 生成标题和角色
  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/generate-title-characters`, {
        method: "POST",
      });

      const data = await res.json();
      if (data.success) {
        setEditedTitle(data.data.title);
        setCharacters(data.data.characters || []);
        setEditedCharacters(data.data.characters || []);
        setHasGenerated(true);

        // 重新加载项目获取最新状态
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

  // 保存修改
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 1. 更新项目标题
      if (editedTitle !== project?.title) {
        await fetch(`/api/projects/${projectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: editedTitle }),
        });
      }

      // 2. 同步角色（创建/更新/删除）
      // 先获取当前角色
      const currentCharsRes = await fetch(`/api/projects/${projectId}/characters`);
      const currentCharsData = await currentCharsRes.json();
      const currentChars: Character[] = currentCharsData.success ? currentCharsData.data || [] : [];

      // 需要创建的新角色
      const newChars = editedCharacters.filter(c => c.id.startsWith("new_"));

      // 需要删除的角色
      const charsToDelete = currentChars.filter(c => !editedCharacters.find(ec => ec.id === c.id));

      // 需要更新的角色
      const charsToUpdate = editedCharacters
        .filter(c => !c.id.startsWith("new_"))
        .filter(ec => {
          const original = currentChars.find(cc => cc.id === ec.id);
          return original && (ec.name !== original.name || ec.description !== original.description);
        });

      // 执行创建
      for (const char of newChars) {
        await fetch("/api/characters", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            name: char.name,
            description: char.description,
          }),
        });
      }

      // 执行更新
      for (const char of charsToUpdate) {
        await fetch(`/api/characters/${char.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: char.name,
            description: char.description,
          }),
        });
      }

      // 执行删除
      for (const char of charsToDelete) {
        await fetch(`/api/characters/${char.id}`, {
          method: "DELETE",
        });
      }

      // 重新加载角色
      const charactersRes = await fetch(`/api/projects/${projectId}/characters`);
      const charactersData = await charactersRes.json();
      if (charactersData.success) {
        setCharacters(charactersData.data || []);
        setEditedCharacters(charactersData.data || []);
      }

      setProject((prev) => prev ? { ...prev, title: editedTitle } : null);
    } catch (error) {
      console.error("保存失败:", error);
      alert("保存失败，请重试");
    } finally {
      setIsSaving(false);
    }
  };

  // 确认并继续到角色设定
  const handleConfirmAndContinue = async () => {
    // 先保存
    await handleSave();

    setIsSaving(true);
    try {
      await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "characters_pending" }),
      });
      router.push(`/projects/${projectId}/characters`);
    } catch (error) {
      console.error("操作失败:", error);
      alert("操作失败，请重试");
    } finally {
      setIsSaving(false);
    }
  };


  if (isLoading || (isGenerating && !hasGenerated)) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Skeleton className="h-8 w-48 mb-8" />
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">AI 正在解析剧本，生成标题和角色...</span>
          </div>
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/projects">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">步骤1：标题与角色</h1>
            <p className="text-muted-foreground text-sm">
              {project?.title ? `"${project.title}"` : "创建新视频"}
            </p>
          </div>
        </div>

        {/* 步骤指示器 */}
        <StepIndicator
          steps={[
            { id: "title_characters_pending", label: "标题与角色" },
            { id: "characters_pending", label: "角色立绘", href: `/projects/${projectId}/characters` },
            { id: "storyboard_ready", label: "分镜预览", href: `/projects/${projectId}` },
            { id: "video_generation", label: "视频生成" },
            { id: "completed", label: "完成" },
          ]}
          currentStep="title_characters_pending"
        />
      </div>

      {/* 说明 */}
      <div className="mb-6 p-4 bg-muted/50 rounded-lg">
        <p className="text-sm text-muted-foreground">
          {hasGenerated
            ? "AI 已生成标题和角色。您可以编辑这些内容，或点击「重新生成」让 AI 重新创作。"
            : "点击「AI 生成标题和角色」，让 AI 根据您的描述自动生成。"}
        </p>
      </div>

      {/* 标题编辑 */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <Label>视频标题</Label>
            <Input
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              placeholder="输入视频标题"
              className="text-lg font-medium"
            />
          </div>
        </CardContent>
      </Card>

      {/* 角色列表 */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              <Label className="text-lg font-medium">角色列表</Label>
              <Badge variant="secondary">{editedCharacters.length}</Badge>
            </div>
            <Button variant="outline" size="sm" onClick={addCharacter}>
              <Plus className="h-4 w-4 mr-1" />
              添加角色
            </Button>
          </div>

          <div className="space-y-4">
            {editedCharacters.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>暂无角色</p>
                <p className="text-sm">点击上方「AI 生成」自动创建角色</p>
              </div>
            ) : (
              editedCharacters.map((char) => (
                <div key={char.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">角色名称</Label>
                        <Input
                          value={char.name || ""}
                          onChange={(e) => updateCharacter(char.id, { name: e.target.value })}
                          placeholder="角色名称"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">角色描述</Label>
                        <Textarea
                          value={char.description || ""}
                          onChange={(e) => updateCharacter(char.id, { description: e.target.value })}
                          placeholder="描述角色的外观、性格、背景..."
                          className="mt-1 min-h-[80px] resize-none"
                        />
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => removeCharacter(char.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* 底部操作 */}
      <div className="flex items-center justify-end border-t pt-6">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleGenerate}
            disabled={isGenerating || isSaving}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                AI 生成标题和角色
              </>
            )}
          </Button>
          <Button
            onClick={handleConfirmAndContinue}
            disabled={isGenerating || isSaving || !hasGenerated}
          >
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
    </div>
  );
}
