import { NextResponse } from "next/server";

// AI 服务回调处理
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // TODO: 根据不同的服务商处理回调
    // - 更新任务状态
    // - 触发后续工作流

    console.log("Webhook received:", body);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
