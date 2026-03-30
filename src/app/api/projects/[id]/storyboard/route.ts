import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";
import { getProject } from "@/lib/db/projects";
import { getProjectScenes } from "@/lib/db/scenes";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// 获取分镜预览
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    // 并行查询项目和场景列表（提升性能）
    const [project, scenes] = await Promise.all([
      getProject(id),
      getProjectScenes(id),
    ]);

    if (!project) {
      return NextResponse.json(
        { success: false, error: "项目不存在" },
        { status: 404 }
      );
    }

    const response: ApiResponse<{
      projectId: string;
      projectStatus: string;
      scenes: typeof scenes;
    }> = {
      success: true,
      data: {
        projectId: id,
        projectStatus: project.status,
        scenes,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("获取分镜列表失败:", error);

    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "获取分镜列表失败",
    };
    return NextResponse.json(response, { status: 500 });
  }
}
