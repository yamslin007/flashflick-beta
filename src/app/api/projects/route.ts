import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";
import { createProject, getUserProjects } from "@/lib/db/projects";

// 创建项目
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, style, aspectRatio, duration } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { success: false, error: "请输入视频描述" },
        { status: 400 }
      );
    }

    // TODO: 获取当前用户 ID (暂时使用临时 ID)
    const userId = "00000000-0000-0000-0000-000000000001";

    // 1. 创建项目记录 - 状态为 title_characters_pending（步骤1）
    const project = await createProject({
      user_id: userId,
      title: null, // 稍后由 AI 生成
      status: "title_characters_pending",
      original_prompt: prompt,
      style_config: {
        artStyle: style || "ghibli",
        aspectRatio: aspectRatio || "16:9",
      },
      total_duration: duration || 60,
    });

    const response: ApiResponse<{
      projectId: string;
      status: string;
    }> = {
      success: true,
      data: {
        projectId: project.id,
        status: "title_characters_pending",
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("创建项目失败:", error);

    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "创建项目失败",
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// 获取项目列表
export async function GET() {
  try {
    // TODO: 获取当前用户 ID
    const userId = "00000000-0000-0000-0000-000000000001";

    const projects = await getUserProjects(userId);

    const response: ApiResponse<{ projects: typeof projects }> = {
      success: true,
      data: { projects },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("获取项目列表失败:", error);

    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "获取项目列表失败",
    };
    return NextResponse.json(response, { status: 500 });
  }
}
