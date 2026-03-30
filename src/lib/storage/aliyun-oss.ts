// 阿里云 OSS 文件上传工具
// 使用 REST API + HMAC-SHA1 签名，无需额外依赖

import crypto from "crypto";

const OSS_REGION = process.env.ALIYUN_OSS_REGION || "";
const OSS_ACCESS_KEY_ID = process.env.ALIYUN_OSS_ACCESS_KEY_ID || "";
const OSS_ACCESS_KEY_SECRET = process.env.ALIYUN_OSS_ACCESS_KEY_SECRET || "";
const OSS_BUCKET = process.env.ALIYUN_OSS_BUCKET || "";

/**
 * 将 base64 图片上传到阿里云 OSS，返回公开访问 URL
 * @param base64Data  data:image/png;base64,xxx 或纯 base64 字符串
 * @param folder      存储目录，默认 "images"
 */
export async function uploadBase64ToOSS(
  base64Data: string,
  folder = "images"
): Promise<string> {
  if (!OSS_ACCESS_KEY_ID || !OSS_ACCESS_KEY_SECRET || !OSS_BUCKET) {
    throw new Error("阿里云 OSS 环境变量未配置 (ALIYUN_OSS_*)");
  }

  // 解析 MIME 类型和纯 base64
  let mimeType = "image/png";
  let pureBase64 = base64Data;
  if (base64Data.startsWith("data:")) {
    const match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      mimeType = match[1];
      pureBase64 = match[2];
    }
  }

  const ext = mimeType.split("/")[1]?.replace("jpeg", "jpg") || "png";
  const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const buffer = Buffer.from(pureBase64, "base64");

  // OSS endpoint
  const host = `${OSS_BUCKET}.${OSS_REGION}.aliyuncs.com`;
  const endpoint = `https://${host}/${filename}`;

  // 构建签名
  const date = new Date().toUTCString();
  const contentMd5 = crypto.createHash("md5").update(buffer).digest("base64");
  const stringToSign = `PUT\n${contentMd5}\n${mimeType}\n${date}\n/${OSS_BUCKET}/${filename}`;
  const signature = crypto
    .createHmac("sha1", OSS_ACCESS_KEY_SECRET)
    .update(stringToSign)
    .digest("base64");

  const response = await fetch(endpoint, {
    method: "PUT",
    headers: {
      "Content-Type": mimeType,
      "Content-MD5": contentMd5,
      "Date": date,
      "Authorization": `OSS ${OSS_ACCESS_KEY_ID}:${signature}`,
    },
    body: buffer,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OSS 上传失败 ${response.status}: ${text.slice(0, 200)}`);
  }

  console.log(`[OSS] 上传成功: ${endpoint}`);
  return endpoint;
}
