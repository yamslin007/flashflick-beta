// 文件上传 API
// POST /api/upload - 上传图片

import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";
import { uploadFile } from "@/lib/storage";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folder = formData.get("folder") as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "未提供文件" },
        { status: 400 }
      );
    }

    // 上传文件
    const result = await uploadFile(file, folder || undefined);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    const response: ApiResponse = {
      success: true,
      data: {
        url: result.url,
        filename: result.filename,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("上传文件失败:", error);

    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "上传文件失败",
    };
    return NextResponse.json(response, { status: 500 });
  }
}
