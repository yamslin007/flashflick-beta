// 单个场景地点 API
// GET /api/locations/[id] - 获取场景地点详情
// PATCH /api/locations/[id] - 更新场景地点
// DELETE /api/locations/[id] - 删除场景地点

import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";
import { getLocation, updateLocation, deleteLocation } from "@/lib/db/locations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// 获取场景地点详情
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const location = await getLocation(id);

    if (!location) {
      return NextResponse.json(
        { success: false, error: "场景地点不存在" },
        { status: 404 }
      );
    }

    const response: ApiResponse = {
      success: true,
      data: location,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("获取场景地点失败:", error);

    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "获取场景地点失败",
    };
    return NextResponse.json(response, { status: 500 });
  }
}

interface UpdateLocationBody {
  name?: string;
  description?: string;
  basePrompt?: string;
  referenceImageUrl?: string | null;
  viewMainUrl?: string | null;
  viewReverseUrl?: string | null;
  panoramaUrl?: string | null;
}

// 更新场景地点
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body: UpdateLocationBody = await request.json();

    // 检查场景地点是否存在
    const existing = await getLocation(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "场景地点不存在" },
        { status: 404 }
      );
    }

    // 构建更新数据
    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.description !== undefined) updateData.description = body.description?.trim() || null;
    if (body.basePrompt !== undefined) updateData.base_prompt = body.basePrompt?.trim() || null;
    if (body.referenceImageUrl !== undefined) updateData.reference_image_url = body.referenceImageUrl;
    if (body.viewMainUrl !== undefined) updateData.view_main_url = body.viewMainUrl;
    if (body.viewReverseUrl !== undefined) updateData.view_reverse_url = body.viewReverseUrl;
    if (body.panoramaUrl !== undefined) updateData.panorama_url = body.panoramaUrl;

    const location = await updateLocation(id, updateData);

    const response: ApiResponse = {
      success: true,
      data: location,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("更新场景地点失败:", error);

    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "更新场景地点失败",
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// 删除场景地点
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    // 检查场景地点是否存在
    const existing = await getLocation(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "场景地点不存在" },
        { status: 404 }
      );
    }

    await deleteLocation(id);

    const response: ApiResponse = {
      success: true,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("删除场景地点失败:", error);

    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "删除场景地点失败",
    };
    return NextResponse.json(response, { status: 500 });
  }
}
