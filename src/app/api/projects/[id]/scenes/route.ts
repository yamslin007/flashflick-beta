import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";
import { getProjectScenes } from "@/lib/db/scenes";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// 获取项目的所有场景
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;

    const scenes = await getProjectScenes(projectId);

    const response: ApiResponse<typeof scenes> = {
      success: true,
      data: scenes,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("获取项目场景失败:", error);

    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "获取项目场景失败",
    };
    return NextResponse.json(response, { status: 500 });
  }
}
