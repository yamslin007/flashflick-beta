// 单个分镜图 API
// GET /api/storyboards/[id] - 获取单个分镜图
// PATCH /api/storyboards/[id] - 更新分镜图
// DELETE /api/storyboards/[id] - 删除分镜图

import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";
import { getStoryboard, updateStoryboard, deleteStoryboard } from "@/lib/db/storyboards";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// 获取单个分镜图
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const storyboard = await getStoryboard(id);

    if (!storyboard) {
      return NextResponse.json(
        { success: false, error: "分镜图不存在" },
        { status: 404 }
      );
    }

    const response: ApiResponse = {
      success: true,
      data: storyboard,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("获取分镜图失败:", error);

    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "获取分镜图失败",
    };
    return NextResponse.json(response, { status: 500 });
  }
}

interface UpdateStoryboardBody {
  name?: string;
  description?: string;
  tags?: string[];
  confirmed?: boolean;
  metadata?: Record<string, unknown>;
}

// 更新分镜图
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body: UpdateStoryboardBody = await request.json();

    // 验证分镜图存在
    const existing = await getStoryboard(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "分镜图不存在" },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.tags !== undefined) updateData.tags = body.tags;
    if (body.confirmed !== undefined) updateData.confirmed = body.confirmed;
    if (body.metadata !== undefined) updateData.metadata = body.metadata;

    const storyboard = await updateStoryboard(id, updateData);

    const response: ApiResponse = {
      success: true,
      data: storyboard,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("更新分镜图失败:", error);

    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "更新分镜图失败",
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// 删除分镜图
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    // 验证分镜图存在
    const existing = await getStoryboard(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "分镜图不存在" },
        { status: 404 }
      );
    }

    await deleteStoryboard(id);

    const response: ApiResponse = {
      success: true,
      data: { id },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("删除分镜图失败:", error);

    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "删除分镜图失败",
    };
    return NextResponse.json(response, { status: 500 });
  }
}
