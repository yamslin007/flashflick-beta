import type { NextConfig } from "next";

// Node.js v24 的 undici fetch 默认走系统代理 (HTTP_PROXY/HTTPS_PROXY)
// 会导致 Supabase 等外部 API 连接失败，需要清除代理环境变量
delete process.env.HTTP_PROXY;
delete process.env.HTTPS_PROXY;
delete process.env.http_proxy;
delete process.env.https_proxy;

const nextConfig: NextConfig = {
  /* 配置选项 */
};

export default nextConfig;
