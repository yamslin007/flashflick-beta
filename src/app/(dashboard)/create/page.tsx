"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Wand2, Palette, Monitor, Smartphone } from "lucide-react";
import { getArtStyleOptions } from "@/lib/ai/art-styles";

// 预设画风完整信息
const presetStyles = getArtStyleOptions();

// 预设画风选项（用于下拉框）
const presetStyleOptions = presetStyles.map((style) => ({
  value: style.value,
  label: style.label,
}));

// 比例选项
const aspectRatioOptions = [
  { value: "16:9", label: "16:9 横版" },
  { value: "9:16", label: "9:16 竖版" },
];

// 时长选项
const durationOptions = [
  { value: "30", label: "30 秒" },
  { value: "60", label: "60 秒" },
  { value: "120", label: "2 分钟" },
];

// 自定义画风类型
interface CustomStyle {
  id: string;
  name: string;
  description: string | null;
  previewImageUrl: string | null;
}

export default function CreatePage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("ghibli");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [duration, setDuration] = useState("60");
  const [isLoading, setIsLoading] = useState(false);
  // 防止重复提交的锁
  const isSubmittingRef = useRef(false);

  // 自定义画风列表
  const [customStyles, setCustomStyles] = useState<CustomStyle[]>([]);

  // 加载自定义画风列表
  useEffect(() => {
    async function loadCustomStyles() {
      try {
        const response = await fetch("/api/art-styles");
        const data = await response.json();
        if (data.success && data.data.custom) {
          setCustomStyles(data.data.custom);
        }
      } catch (error) {
        console.error("加载自定义画风失败:", error);
      }
    }
    loadCustomStyles();
  }, []);

  // 合并预设和自定义画风选项
  const allStyleOptions = [
    ...presetStyleOptions,
    ...(customStyles.length > 0
      ? [{ value: "divider", label: "── 我的画风 ──", disabled: true }]
      : []),
    ...customStyles.map((s) => ({
      value: `custom:${s.id}`,
      label: s.name,
    })),
  ];

  // 获取当前选中画风的详细信息
  const getSelectedStyleInfo = () => {
    // 检查是否是自定义画风
    if (style.startsWith("custom:")) {
      const customId = style.replace("custom:", "");
      const customStyle = customStyles.find((s) => s.id === customId);
      if (customStyle) {
        return {
          name: customStyle.name,
          description: customStyle.description || "自定义画风",
          previewImage: customStyle.previewImageUrl,
          previewGradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          isCustom: true,
        };
      }
    }
    // 预设画风
    const preset = presetStyles.find((s) => s.value === style);
    if (preset) {
      return {
        name: preset.label,
        description: preset.description,
        previewImage: preset.previewImage,
        previewGradient: preset.previewGradient,
        isCustom: false,
      };
    }
    return null;
  };

  const selectedStyleInfo = getSelectedStyleInfo();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 防止重复提交
    if (isSubmittingRef.current) {
      console.log("已在提交中，忽略重复请求");
      return;
    }

    if (!prompt.trim()) {
      alert("请输入视频描述");
      return;
    }

    isSubmittingRef.current = true;
    setIsLoading(true);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          style,
          aspectRatio,
          duration: parseInt(duration),
        }),
      });

      const data = await response.json();

      if (data.success) {
        // 跳转到剧本预览页面
        router.push(`/projects/${data.data.projectId}/script`);
      } else {
        alert(data.error || "创建失败");
      }
    } catch (error) {
      console.error("创建项目失败:", error);
      alert("创建失败，请重试");
    } finally {
      isSubmittingRef.current = false;
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-primary" />
          创建新视频
        </h1>
        <p className="text-muted-foreground mt-2">
          输入你的创意，AI 将分步骤为你生成精美的动漫视频
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 第一栏：视频描述 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5" />
              视频描述
            </CardTitle>
            <CardDescription>
              详细描述你想要的视频内容、场景、角色和情节
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="例如：一个蓝发少女在樱花树下弹吉他，镜头慢慢拉远，花瓣随风飘落，阳光透过树叶洒下斑驳的光影，背景是宁静的日式庭院..."
              className="min-h-[160px] resize-none"
            />
            <p className="text-xs text-muted-foreground mt-2">
              提示：描述越详细，生成效果越好。可以包含角色外观、场景环境、动作和情绪。
            </p>
          </CardContent>
        </Card>

        {/* 第二栏：画风、比例、时长 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              画面设置
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 画风和比例选择 - 并排 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">画风</label>
                <Select
                  options={allStyleOptions}
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">画面比例</label>
                <Select
                  options={aspectRatioOptions}
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                />
              </div>
            </div>

            {/* 画风预览 */}
            {selectedStyleInfo && (
              <div className="rounded-lg border overflow-hidden">
                {/* 预览图或渐变占位 - 根据比例调整 */}
                <div
                  className={`relative ${
                    aspectRatio === "16:9" ? "aspect-video" : "aspect-[9/16] max-h-[280px] mx-auto"
                  }`}
                >
                  {selectedStyleInfo.previewImage ? (
                    <Image
                      src={selectedStyleInfo.previewImage}
                      alt={selectedStyleInfo.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ background: selectedStyleInfo.previewGradient }}
                    >
                      <span className="text-white/80 text-sm font-medium drop-shadow-md">
                        {selectedStyleInfo.name}
                      </span>
                    </div>
                  )}
                  {/* 比例标签 */}
                  <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                    {aspectRatio === "16:9" ? (
                      <Monitor className="h-3 w-3" />
                    ) : (
                      <Smartphone className="h-3 w-3" />
                    )}
                    {aspectRatio}
                  </div>
                </div>
                {/* 描述 */}
                <div className="p-2.5 bg-muted/30">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {selectedStyleInfo.description}
                  </p>
                </div>
              </div>
            )}

            {/* 时长选择 - 单选按钮组 */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">视频时长</label>
              <div className="flex gap-2">
                {durationOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setDuration(option.value)}
                    className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      duration === option.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80 text-muted-foreground"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 第三栏：生成按钮 */}
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={isLoading || !prompt.trim()}
        >
          {isLoading ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              创建中...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              开始创建视频
            </>
          )}
        </Button>
      </form>

      <div className="mt-8 p-4 rounded-lg bg-muted/50">
        <h3 className="font-medium mb-2">创作提示</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• 描述具体的场景和角色（如"蓝发少女在樱花树下弹吉他"）</li>
          <li>• 加入环境细节会让画面更丰富（如"阳光透过树叶洒下斑驳的光影"）</li>
          <li>• AI 会分步骤生成：标题与角色 → 场景设定 → 分镜生成</li>
          <li>• 你可以在每一步审核和调整 AI 生成的内容</li>
        </ul>
      </div>
    </div>
  );
}
