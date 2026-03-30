import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Film, Sparkles, Zap, Palette, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* 导航栏 */}
      <header className="border-b">
        <div className="container flex h-14 items-center">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <Film className="h-5 w-5 text-primary" />
            <span>FlashFlick</span>
          </Link>
          <nav className="ml-auto flex items-center gap-4">
            <Link
              href="/projects"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              我的项目
            </Link>
            <Button asChild>
              <Link href="/create">开始创作</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero 区域 */}
      <section className="container py-24 md:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center rounded-full border px-4 py-1.5 text-sm">
            <Sparkles className="mr-2 h-3.5 w-3.5 text-primary" />
            AI 驱动的动漫视频生成
          </div>

          <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-6xl">
            用文字描述
            <br />
            <span className="text-primary">创造动漫世界</span>
          </h1>

          <p className="mb-10 text-lg text-muted-foreground md:text-xl">
            输入你的创意，AI 自动生成分镜、画面和视频。
            <br />
            60 秒高质量动漫视频，触手可及。
          </p>

          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" asChild>
              <Link href="/create">
                <Sparkles className="mr-2 h-4 w-4" />
                免费开始创作
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/projects">
                查看示例
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* 特性区域 */}
      <section className="border-t bg-muted/30">
        <div className="container py-24">
          <h2 className="mb-12 text-center text-3xl font-bold">
            为什么选择 FlashFlick
          </h2>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-xl border bg-background p-6">
              <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">AI 智能分镜</h3>
              <p className="text-muted-foreground">
                AI 自动解析你的描述，生成专业的分镜脚本，你可以预览和调整每一帧画面。
              </p>
            </div>

            <div className="rounded-xl border bg-background p-6">
              <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
                <Palette className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">多种画风</h3>
              <p className="text-muted-foreground">
                支持经典动漫、吉卜力、赛博朋克等多种画风，让你的创意完美呈现。
              </p>
            </div>

            <div className="rounded-xl border bg-background p-6">
              <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">快速生成</h3>
              <p className="text-muted-foreground">
                强大的 AI 引擎，分钟级生成高质量视频，支持实时预览和迭代优化。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA 区域 */}
      <section className="border-t">
        <div className="container py-24 text-center">
          <h2 className="mb-4 text-3xl font-bold">准备好开始了吗？</h2>
          <p className="mb-8 text-muted-foreground">
            立即体验 AI 动漫视频生成的魔力
          </p>
          <Button size="lg" asChild>
            <Link href="/create">
              <Sparkles className="mr-2 h-4 w-4" />
              开始创作
            </Link>
          </Button>
        </div>
      </section>

      {/* 页脚 */}
      <footer className="border-t py-8">
        <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Film className="h-4 w-4" />
            <span>FlashFlick © 2026</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Powered by AI · Built with Next.js
          </p>
        </div>
      </footer>
    </div>
  );
}
