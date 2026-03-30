// 项目场景地点 API
// GET /api/projects/[id]/locations - 获取项目的所有场景地点

import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";
import { getProject } from "@/lib/db/projects";
import { getProjectLocations } from "@/lib/db/locations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// 获取项目的所有场景地点
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;

    // 并行查询项目和场景地点列表（提升性能）
    const [project, locations] = await Promise.all([
      getProject(projectId),
      getProjectLocations(projectId),
    ]);

    if (!project) {
      return NextResponse.json(
        { success: false, error: "项目不存在" },
        { status: 404 }
      );
    }

    const response: ApiResponse = {
      success: true,
      data: locations,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("获取项目场景地点失败:", error);

    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "获取项目场景地点失败",
    };
    return NextResponse.json(response, { status: 500 });
  }
}
