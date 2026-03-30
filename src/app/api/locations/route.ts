// 场景地点 API
// GET /api/locations - 获取场景地点列表（支持按项目筛选）
// POST /api/locations - 创建场景地点

import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";
import { createLocation, getProjectLocations } from "@/lib/db/locations";
import { getProject } from "@/lib/db/projects";

// 获取场景地点列表
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: "缺少项目 ID" },
        { status: 400 }
      );
    }

    const locations = await getProjectLocations(projectId);

    const response: ApiResponse = {
      success: true,
      data: locations,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("获取场景地点列表失败:", error);

    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "获取场景地点列表失败",
    };
    return NextResponse.json(response, { status: 500 });
  }
}

interface CreateLocationBody {
  projectId: string;
  name: string;
  description?: string;
  basePrompt?: string;
}

export async function POST(request: Request) {
  try {
    const body: CreateLocationBody = await request.json();
    const { projectId, name, description, basePrompt } = body;

    // 验证必填字段
    if (!projectId) {
      return NextResponse.json(
        { success: false, error: "缺少项目 ID" },
        { status: 400 }
      );
    }

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "场景名称不能为空" },
        { status: 400 }
      );
    }

    // 验证项目存在
    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json(
        { success: false, error: "项目不存在" },
        { status: 404 }
      );
    }

    // 获取当前场景数量，用于设置 location_index
    const existingLocations = await getProjectLocations(projectId);
    const locationIndex = existingLocations.length;

    // 创建场景地点
    const location = await createLocation({
      project_id: projectId,
      name: name.trim(),
      description: description?.trim() || null,
      base_prompt: basePrompt?.trim() || null,
      location_index: locationIndex,
    });

    const response: ApiResponse = {
      success: true,
      data: location,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("创建场景地点失败:", error);

    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "创建场景地点失败",
    };
    return NextResponse.json(response, { status: 500 });
  }
}
