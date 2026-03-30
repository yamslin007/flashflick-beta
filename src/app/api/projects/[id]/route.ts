import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";
import { getProject, updateProject, deleteProject } from "@/lib/db/projects";
import { confirmProjectCharacters } from "@/lib/db/characters";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// 获取项目详情
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    const project = await getProject(id);

    if (!project) {
      return NextResponse.json(
        { success: false, error: "项目不存在" },
        { status: 404 }
      );
    }

    const response: ApiResponse<typeof project> = {
      success: true,
      data: project,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("获取项目详情失败:", error);

    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "获取项目详情失败",
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// 更新项目
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    // 当状态从 characters_pending 变为 locations_pending 时，自动确认角色
    if (body.status === "locations_pending") {
      const currentProject = await getProject(id);
      if (currentProject?.status === "characters_pending") {
        // 确认该项目的所有角色
        await confirmProjectCharacters(id);
        console.log(`已确认项目 ${id} 的所有角色`);
      }
    }

    const project = await updateProject(id, body);

    const response: ApiResponse<typeof project> = {
      success: true,
      data: project,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("更新项目失败:", error);

    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "更新项目失败",
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// 删除项目
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    // 验证项目存在
    const project = await getProject(id);
    if (!project) {
      return NextResponse.json(
        { success: false, error: "项目不存在" },
        { status: 404 }
      );
    }

    await deleteProject(id);

    const response: ApiResponse = {
      success: true,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("删除项目失败:", error);

    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "删除项目失败",
    };
    return NextResponse.json(response, { status: 500 });
  }
}
