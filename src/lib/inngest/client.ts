// Inngest 客户端配置
// TODO: 安装 inngest 包后启用

// import { Inngest } from "inngest";

// export const inngest = new Inngest({
//   id: "ai-anime-platform",
// });

export const inngest = {
  // 临时占位，等待安装 inngest 包
  send: async (event: { name: string; data: Record<string, unknown> }) => {
    console.log("Inngest event:", event);
  },
};
