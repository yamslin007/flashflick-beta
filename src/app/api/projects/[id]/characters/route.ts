// 项目角色列表 API
// GET /api/projects/[id]/characters - 获取项目的所有角色

import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";
import { getProject } from "@/lib/db/projects";
import { getProjectCharacters } from "@/lib/db/characters";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// 获取项目的所有角色
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    // 并行查询项目和角色列表（提升性能）
    const [project, characters] = await Promise.all([
      getProject(id),
      getProjectCharacters(id),
    ]);

    if (!project) {
      return NextResponse.json(
        { success: false, error: "项目不存在" },
        { status: 404 }
      );
    }

    const response: ApiResponse = {
      success: true,
      data: characters,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("获取角色列表失败:", error);

    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "获取角色列表失败",
    };
    return NextResponse.json(response, { status: 500 });
  }
}
