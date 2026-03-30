import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// 开始生成视频
export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    // TODO: 触发 Inngest 视频生成工作流

    const response: ApiResponse = {
      success: true,
      data: {
        projectId: id,
        status: "generating",
        estimatedTime: 300, // 预估秒数
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
