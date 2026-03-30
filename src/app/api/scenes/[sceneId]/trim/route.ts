// 视频裁剪 API
// POST /api/scenes/[sceneId]/trim - 裁剪场景视频

import { NextResponse } from "next/server";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import os from "os";
import https from "https";
import http from "http";
import type { ApiResponse } from "@/types";
import { getScene, updateScene } from "@/lib/db/scenes";

// 配置 FFmpeg 路径
const FFMPEG_PATH = process.env.FFMPEG_PATH || "D:\\GeneralSoftware\\ffmpeg\\ffmpeg-8.0.1-essentials_build\\bin\\ffmpeg.exe";
const FFPROBE_PATH = process.env.FFPROBE_PATH || "D:\\GeneralSoftware\\ffmpeg\\ffmpeg-8.0.1-essentials_build\\bin\\ffprobe.exe";

if (fs.existsSync(FFMPEG_PATH)) {
  ffmpeg.setFfmpegPath(FFMPEG_PATH);
}
if (fs.existsSync(FFPROBE_PATH)) {
  ffmpeg.setFfprobePath(FFPROBE_PATH);
}

interface RouteParams {
  params: Promise<{ sceneId: string }>;
}

interface TrimRequestBody {
  startTime: number;
  endTime: number;
}

// 下载视频到临时文件
async function downloadVideo(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const protocol = url.startsWith("https") ? https : http;

    protocol
      .get(url, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            file.close();
            fs.unlinkSync(destPath);
            downloadVideo(redirectUrl, destPath).then(resolve).catch(reject);
            return;
          }
        }

        if (response.statusCode !== 200) {
          file.close();
          if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
          reject(new Error(`下载失败: HTTP ${response.statusCode}`));
          return;
        }

        response.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve();
        });
      })
      .on("error", (err) => {
        file.close();
        if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
        reject(err);
      });
  });
}

// 执行 FFmpeg 裁剪
async function trimVideo(
  inputPath: string,
  outputPath: string,
  startTime: number,
  endTime: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    const duration = endTime - startTime;

    ffmpeg(inputPath)
      .setStartTime(startTime)
      .setDuration(duration)
      .outputOptions(["-c", "copy"]) // 不重编码，速度快
      .output(outputPath)
      .on("start", (cmd) => {
        console.log("FFmpeg 裁剪命令:", cmd);
      })
      .on("end", () => {
        resolve();
      })
      .on("error", (err) => {
        reject(err);
      })
      .run();
  });
}

export async function POST(request: Request, { params }: RouteParams) {
  const tempDir = path.join(os.tmpdir(), "flashflick-trim");

  try {
    const { sceneId } = await params;
    const body: TrimRequestBody = await request.json();
    const { startTime, endTime } = body;

    // 验证参数
    if (startTime === undefined || endTime === undefined) {
      return NextResponse.json(
        { success: false, error: "缺少起止时间参数" },
        { status: 400 }
      );
    }

    if (startTime < 0 || endTime <= startTime) {
      return NextResponse.json(
        { success: false, error: "时间参数无效" },
        { status: 400 }
      );
    }

    // 获取场景
    const scene = await getScene(sceneId);
    if (!scene) {
      return NextResponse.json(
        { success: false, error: "场景不存在" },
        { status: 404 }
      );
    }

    if (!scene.video_url) {
      return NextResponse.json(
        { success: false, error: "场景没有视频" },
        { status: 400 }
      );
    }

    // 创建临时目录
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const inputPath = path.join(tempDir, `${sceneId}_input.mp4`);
    const outputFilename = `${sceneId}_trimmed_${Date.now()}.mp4`;
    const outputPath = path.join(tempDir, outputFilename);

    // 判断是远程 URL 还是本地文件
    const isRemoteUrl = scene.video_url.startsWith("http");
    let localInputPath = inputPath;

    if (isRemoteUrl) {
      // 下载远程视频
      console.log("下载远程视频:", scene.video_url);
      await downloadVideo(scene.video_url, inputPath);
    } else {
      // 本地文件（public 目录下）
      localInputPath = path.join(process.cwd(), "public", scene.video_url);
      if (!fs.existsSync(localInputPath)) {
        return NextResponse.json(
          { success: false, error: "本地视频文件不存在" },
          { status: 404 }
        );
      }
    }

    // 执行裁剪
    console.log(`裁剪视频: ${startTime}s - ${endTime}s`);
    await trimVideo(localInputPath, outputPath, startTime, endTime);

    // 移动到 public 目录
    const publicDir = path.join(process.cwd(), "public", "videos");
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    const finalPath = path.join(publicDir, outputFilename);
    fs.renameSync(outputPath, finalPath);

    // 更新场景的视频 URL
    const newVideoUrl = `/videos/${outputFilename}`;
    const newDuration = Math.round(endTime - startTime);

    await updateScene(sceneId, {
      video_url: newVideoUrl,
      duration: newDuration,
    });

    // 清理临时文件
    if (isRemoteUrl && fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
    }

    const response: ApiResponse = {
      success: true,
      data: {
        videoUrl: newVideoUrl,
        duration: newDuration,
        originalDuration: scene.duration,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("裁剪视频失败:", error);

    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "裁剪视频失败",
    };
    return NextResponse.json(response, { status: 500 });
  }
}
