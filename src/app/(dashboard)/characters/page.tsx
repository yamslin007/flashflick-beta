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
import { Users, User, Copy, Trash2, Pencil, Loader2, Eye, Download, X, Check } from "lucide-react";

interface Character {
  id: string;
  project_id: string | null; // 项目删除后为 null
  name: string | null;
  description: string | null;
  reference_images: string[] | null;
  project_title: string | null; // 项目删除后为 null
  created_at: string;
}

interface Project {
  id: string;
  title: string | null;
}

export default function CharactersLibraryPage() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterProjectId, setFilterProjectId] = useState<string>("");

  // 复用弹窗状态
  const [reuseCharacter, setReuseCharacter] = useState<Character | null>(null);
  const [targetProjectId, setTargetProjectId] = useState<string>("");
  const [isReusing, setIsReusing] = useState(false);

  // 预览弹窗状态
  const [previewCharacter, setPreviewCharacter] = useState<Character | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // 加载角色列表
  const fetchCharacters = async (projectId?: string) => {
    try {
      const url = projectId
        ? `/api/characters?projectId=${projectId}`
        : "/api/characters";
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setCharacters(data.data || []);
      }
    } catch (error) {
      console.error("获取角色列表失败:", error);
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
      await Promise.all([fetchCharacters(), fetchProjects()]);
      setIsLoading(false);
    }
    loadData();
  }, []);

  // 筛选项目变化
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const projectId = e.target.value;
    setFilterProjectId(projectId);
    fetchCharacters(projectId || undefined);
  };

  // 删除角色
  const handleDelete = async (characterId: string) => {
    if (!confirm("确定要删除此角色吗？")) return;

    try {
      const response = await fetch(`/api/characters/${characterId}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.success) {
        setCharacters((prev) => prev.filter((c) => c.id !== characterId));
      } else {
        alert(data.error || "删除失败");
      }
    } catch (error) {
      console.error("删除角色失败:", error);
      alert("删除失败");
    }
  };

  // 复用角色到其他项目
  const handleReuse = async () => {
    if (!reuseCharacter || !targetProjectId) return;

    setIsReusing(true);
    try {
      const response = await fetch("/api/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: targetProjectId,
          name: reuseCharacter.name,
          description: reuseCharacter.description,
          referenceImages: reuseCharacter.reference_images,
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert("角色复用成功！");
        setReuseCharacter(null);
        setTargetProjectId("");
        // 刷新列表
        fetchCharacters(filterProjectId || undefined);
      } else {
        alert(data.error || "复用失败");
      }
    } catch (error) {
      console.error("复用角色失败:", error);
      alert("复用失败");
    } finally {
      setIsReusing(false);
    }
  };

  // 开始编辑角色信息
  const startEditing = () => {
    if (previewCharacter) {
      setEditName(previewCharacter.name || "");
      setEditDescription(previewCharacter.description || "");
      setIsEditing(true);
    }
  };

  // 取消编辑
  const cancelEditing = () => {
    setIsEditing(false);
    setEditName("");
    setEditDescription("");
  };

  // 保存角色信息
  const saveCharacterInfo = async () => {
    if (!previewCharacter || !editName.trim()) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/characters/${previewCharacter.id}`, {
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
        const updatedCharacter = {
          ...previewCharacter,
          name: editName.trim(),
          description: editDescription.trim(),
        };
        setPreviewCharacter(updatedCharacter);
        setCharacters((prev) =>
          prev.map((c) =>
            c.id === previewCharacter.id ? updatedCharacter : c
          )
        );
        setIsEditing(false);
      } else {
        alert(data.error || "保存失败");
      }
    } catch (error) {
      console.error("保存角色信息失败:", error);
      alert("保存失败");
    } finally {
      setIsSaving(false);
    }
  };

  // 下载角色立绘
  const handleDownload = async (character: Character) => {
    const imageUrl = character.reference_images?.[0];
    if (!imageUrl) return;

    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${character.name || "角色"}_立绘.png`;
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

  // 构建目标项目选项（排除当前角色所在项目）
  const targetProjectOptions = projects
    .filter((p) => p.id !== reuseCharacter?.project_id)
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
            <Users className="h-8 w-8 text-primary" />
            角色库
          </h1>
          <p className="text-muted-foreground mt-1">
            管理所有项目中的角色，支持跨项目复用
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
      ) : characters.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-6 mb-4">
            <User className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">暂无角色</h3>
          <p className="text-muted-foreground max-w-sm">
            创建项目时会自动提取角色，或在项目的角色确认页面手动添加角色
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {characters.map((character) => (
            <CharacterLibraryCard
              key={character.id}
              character={character}
              onDelete={() => handleDelete(character.id)}
              onReuse={() => {
                setReuseCharacter(character);
                setTargetProjectId("");
              }}
              onPreview={() => setPreviewCharacter(character)}
              onDownload={() => handleDownload(character)}
            />
          ))}
        </div>
      )}

      {/* 复用弹窗 */}
      <Dialog
        open={!!reuseCharacter}
        onOpenChange={() => setReuseCharacter(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>复用角色到其他项目</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              将角色 <strong>{reuseCharacter?.name}</strong> 复制到其他项目
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
              onClick={() => setReuseCharacter(null)}
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
        open={!!previewCharacter}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewCharacter(null);
            setIsEditing(false);
            setEditName("");
            setEditDescription("");
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          {previewCharacter && (
            <div className="relative">
              {/* 关闭按钮 */}
              <button
                onClick={() => {
                  setPreviewCharacter(null);
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
                {previewCharacter.reference_images?.[0] ? (
                  <img
                    src={previewCharacter.reference_images[0]}
                    alt={previewCharacter.name || "角色"}
                    className="max-w-full max-h-[60vh] object-contain"
                  />
                ) : (
                  <div className="flex items-center justify-center py-20">
                    <User className="h-24 w-24 text-gray-500" />
                  </div>
                )}
              </div>

              {/* 底部信息栏 */}
              <div className="p-4 bg-background border-t">
                {isEditing ? (
                  // 编辑模式
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">
                        角色名称
                      </label>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="输入角色名称"
                        className="h-9"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">
                        外观描述
                      </label>
                      <Textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="描述角色的外观特征..."
                        rows={3}
                        className="resize-none"
                      />
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <p className="text-xs text-muted-foreground">
                        来自项目：{previewCharacter.project_id ? (previewCharacter.project_title || "未命名项目") : "独立角色"}
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
                          onClick={saveCharacterInfo}
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
                        {previewCharacter.name || "未命名角色"}
                      </h3>
                      {previewCharacter.description ? (
                        <p className="text-sm text-muted-foreground mt-1">
                          {previewCharacter.description}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground/50 mt-1 italic">
                          暂无描述，点击编辑添加
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        来自项目：{previewCharacter.project_id ? (previewCharacter.project_title || "未命名项目") : "独立角色"}
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

// 角色卡片组件
interface CharacterLibraryCardProps {
  character: Character;
  onDelete: () => void;
  onReuse: () => void;
  onPreview: () => void;
  onDownload: () => void;
}

function CharacterLibraryCard({
  character,
  onDelete,
  onReuse,
  onPreview,
  onDownload,
}: CharacterLibraryCardProps) {
  const portraitImage = character.reference_images?.[0];

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow group">
      {/* 角色图片 */}
      <div
        className="aspect-[3/4] bg-muted relative cursor-pointer"
        onClick={onPreview}
      >
        {portraitImage ? (
          <img
            src={portraitImage}
            alt={character.name || "角色"}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <User className="h-16 w-16 text-muted-foreground/30" />
          </div>
        )}
        {/* 角色名称标签 */}
        {character.name && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-3">
            <p className="text-white text-sm font-medium truncate">
              {character.name}
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
        {/* 角色名称 */}
        <h3 className="font-medium truncate">{character.name || "未命名角色"}</h3>

        {/* 外观描述 */}
        {character.description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {character.description}
          </p>
        )}

        {/* 所属项目 */}
        <p className="text-xs text-muted-foreground mt-2">
          项目：{character.project_id ? (character.project_title || "未命名项目") : "独立角色"}
        </p>

        {/* 操作按钮 */}
        <div className="flex items-center gap-1 mt-3 pt-3 border-t">
          {portraitImage && (
            <Button
              variant="ghost"
              size="sm"
              className="flex-1"
              onClick={onDownload}
              title="下载立绘"
            >
              <Download className="h-4 w-4 mr-1" />
              下载
            </Button>
          )}
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
