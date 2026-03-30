"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Palette,
  Plus,
  Trash2,
  Pencil,
  Loader2,
  Eye,
  Copy,
  Check,
  Lock,
} from "lucide-react";

// 画风数据类型（简化版）
interface ArtStyle {
  id: string;
  name: string;
  nameEn: string | null;
  description: string | null;
  isPreset: boolean;
  basePreset: string | null;
  positivePrompt: string;
  negativePrompt: string;
  previewImageUrl: string | null;
  usageCount: number;
  createdAt: string | null;
  updatedAt: string | null;
}

// 创建/编辑画风的表单数据（简化版）
interface StyleFormData {
  name: string;
  nameEn: string;
  description: string;
  basePreset: string;
  positivePrompt: string;
  negativePrompt: string;
}

const initialFormData: StyleFormData = {
  name: "",
  nameEn: "",
  description: "",
  basePreset: "",
  positivePrompt: "",
  negativePrompt: "",
};

export default function StylesLibraryPage() {
  const [presets, setPresets] = useState<ArtStyle[]>([]);
  const [customStyles, setCustomStyles] = useState<ArtStyle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 预览弹窗
  const [previewStyle, setPreviewStyle] = useState<ArtStyle | null>(null);

  // 创建弹窗
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState<StyleFormData>(initialFormData);
  const [isCreating, setIsCreating] = useState(false);

  // 编辑弹窗
  const [editStyle, setEditStyle] = useState<ArtStyle | null>(null);
  const [editFormData, setEditFormData] = useState<StyleFormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);

  // 加载画风列表
  const fetchStyles = async () => {
    try {
      const response = await fetch("/api/art-styles");
      const data = await response.json();

      if (data.success) {
        setPresets(data.data.presets || []);
        setCustomStyles(data.data.custom || []);
      }
    } catch (error) {
      console.error("获取画风列表失败:", error);
    }
  };

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      await fetchStyles();
      setIsLoading(false);
    }
    loadData();
  }, []);

  // 基于预设填充表单
  const handleBasePresetChange = (presetId: string) => {
    setFormData((prev) => ({ ...prev, basePreset: presetId }));

    if (presetId) {
      const preset = presets.find((p) => p.id === presetId);
      if (preset) {
        setFormData((prev) => ({
          ...prev,
          positivePrompt: preset.positivePrompt,
          negativePrompt: preset.negativePrompt,
        }));
      }
    }
  };

  // 创建自定义画风
  const handleCreate = async () => {
    if (!formData.name.trim()) {
      alert("请输入画风名称");
      return;
    }

    if (!formData.positivePrompt.trim()) {
      alert("请输入正向提示词");
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch("/api/art-styles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          nameEn: formData.nameEn.trim() || null,
          description: formData.description.trim() || null,
          basePreset: formData.basePreset || null,
          positivePrompt: formData.positivePrompt,
          negativePrompt: formData.negativePrompt,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setCustomStyles((prev) => [data.data, ...prev]);
        setIsCreateOpen(false);
        setFormData(initialFormData);
      } else {
        alert(data.error || "创建失败");
      }
    } catch (error) {
      console.error("创建画风失败:", error);
      alert("创建失败");
    } finally {
      setIsCreating(false);
    }
  };

  // 打开编辑弹窗
  const openEditDialog = (style: ArtStyle) => {
    setEditStyle(style);
    setEditFormData({
      name: style.name,
      nameEn: style.nameEn || "",
      description: style.description || "",
      basePreset: style.basePreset || "",
      positivePrompt: style.positivePrompt,
      negativePrompt: style.negativePrompt,
    });
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editStyle || !editFormData.name.trim()) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/art-styles/${editStyle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editFormData.name.trim(),
          nameEn: editFormData.nameEn.trim() || null,
          description: editFormData.description.trim() || null,
          positivePrompt: editFormData.positivePrompt,
          negativePrompt: editFormData.negativePrompt,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setCustomStyles((prev) =>
          prev.map((s) => (s.id === editStyle.id ? data.data : s))
        );
        setEditStyle(null);
        setEditFormData(initialFormData);
      } else {
        alert(data.error || "保存失败");
      }
    } catch (error) {
      console.error("保存画风失败:", error);
      alert("保存失败");
    } finally {
      setIsSaving(false);
    }
  };

  // 删除画风
  const handleDelete = async (styleId: string) => {
    if (!confirm("确定要删除此画风吗？删除后不可恢复。")) return;

    try {
      const response = await fetch(`/api/art-styles/${styleId}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.success) {
        setCustomStyles((prev) => prev.filter((s) => s.id !== styleId));
      } else {
        alert(data.error || "删除失败");
      }
    } catch (error) {
      console.error("删除画风失败:", error);
      alert("删除失败");
    }
  };

  // 复制预设为自定义画风
  const handleCopyPreset = (preset: ArtStyle) => {
    setFormData({
      name: `${preset.name} (副本)`,
      nameEn: preset.nameEn ? `${preset.nameEn} (Copy)` : "",
      description: preset.description || "",
      basePreset: preset.id,
      positivePrompt: preset.positivePrompt,
      negativePrompt: preset.negativePrompt,
    });
    setIsCreateOpen(true);
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Palette className="h-8 w-8 text-primary" />
            风格库
          </h1>
          <p className="text-muted-foreground mt-1">
            管理预设画风和自定义画风，创建属于你的独特风格
          </p>
        </div>

        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          新建画风
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-8">
          <div>
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-48 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-10">
          {/* 预设画风 */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-semibold">预设画风</h2>
              <Lock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">只读</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {presets.map((style) => (
                <StyleCard
                  key={style.id}
                  style={style}
                  onPreview={() => setPreviewStyle(style)}
                  onCopy={() => handleCopyPreset(style)}
                />
              ))}
            </div>
          </section>

          {/* 自定义画风 */}
          <section>
            <h2 className="text-xl font-semibold mb-4">我的画风</h2>
            {customStyles.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Palette className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground text-center">
                    还没有自定义画风
                    <br />
                    点击"新建画风"或复制预设开始创建
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {customStyles.map((style) => (
                  <StyleCard
                    key={style.id}
                    style={style}
                    onPreview={() => setPreviewStyle(style)}
                    onEdit={() => openEditDialog(style)}
                    onDelete={() => handleDelete(style.id)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* 预览弹窗 */}
      <Dialog open={!!previewStyle} onOpenChange={() => setPreviewStyle(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {previewStyle && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {previewStyle.name}
                  {previewStyle.isPreset && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      预设
                    </span>
                  )}
                </DialogTitle>
                {previewStyle.description && (
                  <p className="text-sm text-muted-foreground">
                    {previewStyle.description}
                  </p>
                )}
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {/* 正向提示词 */}
                <div className="border rounded-lg p-4">
                  <Label className="text-sm font-medium mb-2 block">正向提示词</Label>
                  <p className="p-3 bg-muted/30 rounded text-sm font-mono whitespace-pre-wrap break-all">
                    {previewStyle.positivePrompt}
                  </p>
                </div>

                {/* 负向提示词 */}
                <div className="border rounded-lg p-4">
                  <Label className="text-sm font-medium mb-2 block">负向提示词</Label>
                  <p className="p-3 bg-muted/30 rounded text-sm font-mono whitespace-pre-wrap break-all">
                    {previewStyle.negativePrompt}
                  </p>
                </div>

                <p className="text-xs text-muted-foreground">
                  系统会根据用途（角色立绘/分镜图/场景空景）自动补充相应的后缀提示词
                </p>
              </div>

              <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                <Button variant="outline" onClick={() => setPreviewStyle(null)}>
                  关闭
                </Button>
                {previewStyle.isPreset && (
                  <Button onClick={() => {
                    handleCopyPreset(previewStyle);
                    setPreviewStyle(null);
                  }}>
                    <Copy className="h-4 w-4 mr-2" />
                    基于此创建
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 创建弹窗 */}
      <Dialog open={isCreateOpen} onOpenChange={(open) => {
        setIsCreateOpen(open);
        if (!open) setFormData(initialFormData);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>新建画风</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* 基础信息 */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">画风名称 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="如：赛博朋克"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nameEn">英文名称</Label>
                <Input
                  id="nameEn"
                  value={formData.nameEn}
                  onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                  placeholder="如：Cyberpunk"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">画风描述</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="描述这个画风的特点..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="basePreset">基于预设</Label>
              <Select
                options={[
                  { value: "", label: "从头创建" },
                  ...presets.map((p) => ({ value: p.id, label: p.name })),
                ]}
                value={formData.basePreset}
                onChange={(e) => handleBasePresetChange(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                选择预设后将自动填充提示词，你可以在此基础上修改
              </p>
            </div>

            {/* 提示词 */}
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="font-medium">画风提示词</h3>
              <p className="text-xs text-muted-foreground">
                只需填写通用的画风描述，系统会根据用途自动补充后缀
              </p>
              <div className="space-y-2">
                <Label className="text-sm">正向提示词 *</Label>
                <Textarea
                  value={formData.positivePrompt}
                  onChange={(e) => setFormData({ ...formData, positivePrompt: e.target.value })}
                  placeholder="描述画风的核心特征，如：warm hand-drawn animation style, soft watercolor texture, pastel colors, gentle atmosphere..."
                  rows={4}
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">负向提示词</Label>
                <Textarea
                  value={formData.negativePrompt}
                  onChange={(e) => setFormData({ ...formData, negativePrompt: e.target.value })}
                  placeholder="需要避免的元素，如：photorealistic, 3D render, sharp digital texture..."
                  rows={3}
                  className="font-mono text-sm"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false);
                setFormData(initialFormData);
              }}
              disabled={isCreating}
            >
              取消
            </Button>
            <Button onClick={handleCreate} disabled={isCreating || !formData.name.trim() || !formData.positivePrompt.trim()}>
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  创建中...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  创建画风
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 编辑弹窗 */}
      <Dialog open={!!editStyle} onOpenChange={(open) => {
        if (!open) {
          setEditStyle(null);
          setEditFormData(initialFormData);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑画风</DialogTitle>
          </DialogHeader>

          {editStyle && (
            <div className="space-y-6 mt-4">
              {/* 基础信息 */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">画风名称 *</Label>
                  <Input
                    id="edit-name"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    placeholder="如：赛博朋克"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-nameEn">英文名称</Label>
                  <Input
                    id="edit-nameEn"
                    value={editFormData.nameEn}
                    onChange={(e) => setEditFormData({ ...editFormData, nameEn: e.target.value })}
                    placeholder="如：Cyberpunk"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">画风描述</Label>
                <Textarea
                  id="edit-description"
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  placeholder="描述这个画风的特点..."
                  rows={2}
                />
              </div>

              {/* 提示词 */}
              <div className="space-y-4 p-4 border rounded-lg">
                <h3 className="font-medium">画风提示词</h3>
                <div className="space-y-2">
                  <Label className="text-sm">正向提示词 *</Label>
                  <Textarea
                    value={editFormData.positivePrompt}
                    onChange={(e) => setEditFormData({ ...editFormData, positivePrompt: e.target.value })}
                    placeholder="描述画风的核心特征..."
                    rows={4}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">负向提示词</Label>
                  <Textarea
                    value={editFormData.negativePrompt}
                    onChange={(e) => setEditFormData({ ...editFormData, negativePrompt: e.target.value })}
                    placeholder="需要避免的元素..."
                    rows={3}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setEditStyle(null);
                setEditFormData(initialFormData);
              }}
              disabled={isSaving}
            >
              取消
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving || !editFormData.name.trim()}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  保存修改
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 画风卡片组件
interface StyleCardProps {
  style: ArtStyle;
  onPreview: () => void;
  onCopy?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

function StyleCard({ style, onPreview, onCopy, onEdit, onDelete }: StyleCardProps) {
  const isPreset = style.isPreset;

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {style.name}
              {isPreset && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  预设
                </span>
              )}
            </CardTitle>
            {style.nameEn && (
              <p className="text-sm text-muted-foreground">{style.nameEn}</p>
            )}
          </div>
          {isPreset && <Lock className="h-4 w-4 text-muted-foreground" />}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {style.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
            {style.description}
          </p>
        )}

        {/* 操作按钮 */}
        <div className="flex items-center gap-1 pt-3 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1"
            onClick={onPreview}
          >
            <Eye className="h-4 w-4 mr-1" />
            查看
          </Button>

          {isPreset ? (
            <Button
              variant="ghost"
              size="sm"
              className="flex-1"
              onClick={onCopy}
            >
              <Copy className="h-4 w-4 mr-1" />
              复制
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1"
                onClick={onEdit}
              >
                <Pencil className="h-4 w-4 mr-1" />
                编辑
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
