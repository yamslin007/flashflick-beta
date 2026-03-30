import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// 获取项目生成状态
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    // TODO: 从数据库获取项目和场景的状态

    const response: ApiResponse = {
      success: true,
      data: {
        projectId: id,
        status: "draft",
        progress: 0,
        currentStep: "",
        scenes: [],
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "未知错误",
    };
    return NextResponse.json(response, { status: 500 });
  }
}
