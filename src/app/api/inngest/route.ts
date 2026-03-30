// Inngest API 端点
// TODO: 安装 inngest 包后启用

import { NextResponse } from "next/server";

// import { serve } from "inngest/next";
// import { inngest } from "@/lib/inngest/client";
// import { generateVideoWorkflow } from "@/lib/inngest/functions/generate-video";

// export const { GET, POST, PUT } = serve({
//   client: inngest,
//   functions: [generateVideoWorkflow],
// });

export async function GET() {
  return NextResponse.json({
    message: "Inngest endpoint - 待配置",
  });
}

export async function POST() {
  return NextResponse.json({
    message: "Inngest endpoint - 待配置",
  });
}
