// 文件存储服务
// 当前使用本地存储，后续可切换到 Cloudflare R2

import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// 存储配置
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const PUBLIC_URL_PREFIX = "/uploads";

// 确保上传目录存在
function ensureUploadDir(): void {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

// 获取文件扩展名
function getExtension(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return ext || ".png"; // 默认 png
}

// 验证文件类型
function isValidImageType(mimeType: string): boolean {
  const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  return validTypes.includes(mimeType);
}

export interface UploadResult {
  success: boolean;
  url?: string;
  filename?: string;
  error?: string;
}

// 上传文件
export async function uploadFile(
  file: File,
  folder?: string
): Promise<UploadResult> {
  try {
    ensureUploadDir();

    // 验证文件类型
    if (!isValidImageType(file.type)) {
      return {
        success: false,
        error: "不支持的文件类型，仅支持 JPG/PNG/GIF/WebP",
      };
    }

    // 限制文件大小 (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        success: false,
        error: "文件大小超过 10MB 限制",
      };
    }

    // 生成唯一文件名
    const ext = getExtension(file.name);
    const filename = `${uuidv4()}${ext}`;

    // 确定存储路径
    let targetDir = UPLOAD_DIR;
    let urlPrefix = PUBLIC_URL_PREFIX;

    if (folder) {
      targetDir = path.join(UPLOAD_DIR, folder);
      urlPrefix = `${PUBLIC_URL_PREFIX}/${folder}`;
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
    }

    const filepath = path.join(targetDir, filename);

    // 读取文件内容并写入
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filepath, buffer);

    return {
      success: true,
      url: `${urlPrefix}/${filename}`,
      filename,
    };
  } catch (error) {
    console.error("上传文件失败:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "上传失败",
    };
  }
}

// 删除文件
export async function deleteFile(url: string): Promise<boolean> {
  try {
    // 从 URL 提取相对路径
    if (!url.startsWith(PUBLIC_URL_PREFIX)) {
      return false;
    }

    const relativePath = url.replace(PUBLIC_URL_PREFIX, "");
    const filepath = path.join(UPLOAD_DIR, relativePath);

    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      return true;
    }

    return false;
  } catch (error) {
    console.error("删除文件失败:", error);
    return false;
  }
}
