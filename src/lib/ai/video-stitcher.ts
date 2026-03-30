// 视频拼接服务
// 使用 FFmpeg 将多个场景视频拼接成完整视频

import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import os from "os";
import https from "https";
import http from "http";

// 配置 FFmpeg 路径（如果未添加到系统 PATH）
const FFMPEG_PATH = process.env.FFMPEG_PATH || "D:\\GeneralSoftware\\ffmpeg\\ffmpeg-8.0.1-essentials_build\\bin\\ffmpeg.exe";
const FFPROBE_PATH = process.env.FFPROBE_PATH || "D:\\GeneralSoftware\\ffmpeg\\ffmpeg-8.0.1-essentials_build\\bin\\ffprobe.exe";

// 设置 fluent-ffmpeg 的路径
if (fs.existsSync(FFMPEG_PATH)) {
  ffmpeg.setFfmpegPath(FFMPEG_PATH);
}
if (fs.existsSync(FFPROBE_PATH)) {
  ffmpeg.setFfprobePath(FFPROBE_PATH);
}

export interface StitchOptions {
  projectId: string;
  outputFormat?: "mp4" | "webm";
}

export interface StitchResult {
  success: boolean;
  videoPath?: string;
  duration?: number;
  error?: string;
}

export class VideoStitcher {
  private tempDir: string;

  constructor(projectId: string) {
    this.tempDir = path.join(os.tmpdir(), "flashflick-stitch", projectId);
  }

  // 确保临时目录存在
  private ensureTempDir(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  // 下载视频到临时目录
  async downloadVideo(url: string, filename: string): Promise<string> {
    this.ensureTempDir();
    const filePath = path.join(this.tempDir, filename);

    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(filePath);
      const protocol = url.startsWith("https") ? https : http;

      protocol
        .get(url, (response) => {
          // 处理重定向
          if (response.statusCode === 301 || response.statusCode === 302) {
            const redirectUrl = response.headers.location;
            if (redirectUrl) {
              file.close();
              fs.unlinkSync(filePath);
              this.downloadVideo(redirectUrl, filename)
                .then(resolve)
                .catch(reject);
              return;
            }
          }

          if (response.statusCode !== 200) {
            file.close();
            fs.unlinkSync(filePath);
            reject(new Error(`下载失败: HTTP ${response.statusCode}`));
            return;
          }

          response.pipe(file);

          file.on("finish", () => {
            file.close();
            resolve(filePath);
          });
        })
        .on("error", (err) => {
          file.close();
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
          reject(new Error(`下载失败: ${err.message}`));
        });
    });
  }

  // 创建 FFmpeg concat 文件列表
  async createConcatFile(videoPaths: string[]): Promise<string> {
    this.ensureTempDir();
    const concatFilePath = path.join(this.tempDir, "concat.txt");

    // FFmpeg concat demuxer 格式
    const content = videoPaths
      .map((p) => `file '${p.replace(/\\/g, "/").replace(/'/g, "'\\''")}'`)
      .join("\n");

    fs.writeFileSync(concatFilePath, content, "utf-8");
    return concatFilePath;
  }

  // 执行拼接
  async stitch(
    videoUrls: string[],
    outputPath: string,
    options?: StitchOptions
  ): Promise<StitchResult> {
    try {
      // 1. 下载所有视频
      console.log(`开始下载 ${videoUrls.length} 个视频...`);
      const downloadedPaths: string[] = [];

      for (let i = 0; i < videoUrls.length; i++) {
        const url = videoUrls[i];
        const filename = `scene_${String(i).padStart(3, "0")}.mp4`;
        console.log(`下载视频 ${i + 1}/${videoUrls.length}: ${filename}`);

        try {
          const localPath = await this.downloadVideo(url, filename);
          downloadedPaths.push(localPath);
        } catch (err) {
          // 重试一次
          console.log(`下载失败，重试中...`);
          const localPath = await this.downloadVideo(url, filename);
          downloadedPaths.push(localPath);
        }
      }

      // 2. 创建 concat 文件
      console.log("创建拼接文件列表...");
      const concatFilePath = await this.createConcatFile(downloadedPaths);

      // 3. 执行 FFmpeg 拼接
      console.log("开始拼接视频...");
      const result = await this.runFFmpeg(concatFilePath, outputPath);

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "未知错误";
      console.error("视频拼接失败:", errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  // 运行 FFmpeg
  private runFFmpeg(
    concatFilePath: string,
    outputPath: string
  ): Promise<StitchResult> {
    return new Promise((resolve) => {
      let duration = 0;

      ffmpeg()
        .input(concatFilePath)
        .inputOptions(["-f", "concat", "-safe", "0"])
        .outputOptions(["-c", "copy"]) // 不重编码，速度快
        .output(outputPath)
        .on("start", (commandLine) => {
          console.log("FFmpeg 命令:", commandLine);
        })
        .on("progress", (progress) => {
          if (progress.timemark) {
            console.log(`进度: ${progress.timemark}`);
          }
        })
        .on("end", () => {
          // 获取输出视频时长
          ffmpeg.ffprobe(outputPath, (err, metadata) => {
            if (!err && metadata.format.duration) {
              duration = metadata.format.duration;
            }
            resolve({
              success: true,
              videoPath: outputPath,
              duration,
            });
          });
        })
        .on("error", (err) => {
          console.error("FFmpeg 错误:", err.message);
          resolve({
            success: false,
            error: err.message,
          });
        })
        .run();
    });
  }

  // 清理临时文件
  async cleanup(): Promise<void> {
    try {
      if (fs.existsSync(this.tempDir)) {
        fs.rmSync(this.tempDir, { recursive: true, force: true });
        console.log("临时文件已清理");
      }
    } catch (err) {
      console.error("清理临时文件失败:", err);
    }
  }
}

// 便捷函数：拼接项目的所有场景视频
export async function stitchProjectVideos(
  projectId: string,
  videoUrls: string[],
  outputDir: string
): Promise<StitchResult> {
  const stitcher = new VideoStitcher(projectId);
  const outputPath = path.join(outputDir, `${projectId}_final.mp4`);

  try {
    const result = await stitcher.stitch(videoUrls, outputPath);
    return result;
  } finally {
    await stitcher.cleanup();
  }
}
