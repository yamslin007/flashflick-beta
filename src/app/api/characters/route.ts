// 角色 API
// GET /api/characters - 获取角色列表（支持按项目筛选）
// POST /api/characters - 创建角色

import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";
import { createCharacter, getAllCharacters } from "@/lib/db/characters";
import { getProject } from "@/lib/db/projects";

// 获取角色列表
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId") || undefined;

    const characters = await getAllCharacters(projectId);

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

interface CreateCharacterBody {
  projectId: string;
  name: string;
  description?: string;
  referenceImages?: string[];
}

export async function POST(request: Request) {
  try {
    const body: CreateCharacterBody = await request.json();
    const { projectId, name, description, referenceImages } = body;

    // 验证必填字段
    if (!projectId) {
      return NextResponse.json(
        { success: false, error: "缺少项目 ID" },
        { status: 400 }
      );
    }

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "角色名称不能为空" },
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

    // 创建角色
    const character = await createCharacter({
      project_id: projectId,
      name: name.trim(),
      description: description?.trim() || null,
      reference_images: referenceImages || [],
    });

    const response: ApiResponse = {
      success: true,
      data: character,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("创建角色失败:", error);

    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "创建角色失败",
    };
    return NextResponse.json(response, { status: 500 });
  }
}
