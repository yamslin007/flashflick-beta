// 视频拼接 API
// POST /api/projects/[id]/stitch - 启动视频拼接

import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import type { ApiResponse } from "@/types";
import { getProject, updateProject, updateProjectFinalVideo } from "@/lib/db/projects";
import { getProjectScenes } from "@/lib/db/scenes";
import { VideoStitcher } from "@/lib/ai/video-stitcher";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// 启动视频拼接
export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    // 1. 验证项目存在
    const project = await getProject(id);
    if (!project) {
      return NextResponse.json(
        { success: false, error: "项目不存在" },
        { status: 404 }
      );
    }

    // 2. 检查项目状态
    if (project.status === "stitching") {
      return NextResponse.json(
        { success: false, error: "视频正在合成中" },
        { status: 400 }
      );
    }

    if (project.final_video_url) {
      return NextResponse.json(
        { success: false, error: "视频已合成完成" },
        { status: 400 }
      );
    }

    // 3. 获取所有场景
    const scenes = await getProjectScenes(id);
    if (scenes.length === 0) {
      return NextResponse.json(
        { success: false, error: "项目没有场景" },
        { status: 400 }
      );
    }

    // 4. 检查所有场景视频是否已生成
    const videoUrls: string[] = [];
    const missingScenes: number[] = [];

    for (const scene of scenes) {
      if (scene.video_url) {
        videoUrls.push(scene.video_url);
      } else {
        missingScenes.push(scene.scene_index);
      }
    }

    if (missingScenes.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `以下场景尚未生成视频: ${missingScenes.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // 5. 更新项目状态为 "stitching"
    await updateProject(id, { status: "stitching" });

    // 6. 启动后台拼接任务 (fire-and-forget)
    processStitching(id, videoUrls).catch((err) => {
      console.error("视频拼接后台任务失败:", err);
    });

    const response: ApiResponse = {
      success: true,
      data: {
        message: "视频合成已开始",
        totalScenes: scenes.length,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("启动视频拼接失败:", error);

    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "启动视频拼接失败",
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// 后台拼接处理
async function processStitching(
  projectId: string,
  videoUrls: string[]
): Promise<void> {
  const stitcher = new VideoStitcher(projectId);

  try {
    console.log(`开始拼接项目 ${projectId} 的视频...`);

    // 确保输出目录存在
    const outputDir = path.join(process.cwd(), "public", "videos");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputFilename = `${projectId}_final.mp4`;
    const outputPath = path.join(outputDir, outputFilename);

    // 执行拼接
    const result = await stitcher.stitch(videoUrls, outputPath);

    if (result.success && result.videoPath) {
      // 生成可访问的 URL
      const finalVideoUrl = `/videos/${outputFilename}`;

      // 更新项目
      await updateProjectFinalVideo(projectId, finalVideoUrl);
      console.log(`项目 ${projectId} 视频合成完成: ${finalVideoUrl}`);
    } else {
      // 合成失败
      await updateProject(projectId, { status: "stitch_failed" });
      console.error(`项目 ${projectId} 视频合成失败:`, result.error);
    }
  } catch (error) {
    console.error(`项目 ${projectId} 视频合成异常:`, error);
    await updateProject(projectId, { status: "stitch_failed" });
  } finally {
    // 清理临时文件
    await stitcher.cleanup();
  }
}

// 获取拼接状态
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    const project = await getProject(id);
    if (!project) {
      return NextResponse.json(
        { success: false, error: "项目不存在" },
        { status: 404 }
      );
    }

    const scenes = await getProjectScenes(id);
    const completedScenes = scenes.filter((s) => s.video_url).length;

    const response: ApiResponse = {
      success: true,
      data: {
        status: project.status,
        finalVideoUrl: project.final_video_url,
        totalScenes: scenes.length,
        completedScenes,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("获取拼接状态失败:", error);

    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "获取拼接状态失败",
    };
    return NextResponse.json(response, { status: 500 });
  }
}
