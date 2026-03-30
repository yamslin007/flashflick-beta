// 图片拼接服务
// 支持 Outpainting 方式生成 32:9 全景图

import sharp from "sharp";

/**
 * 从 base64 data URL 中提取纯 base64 数据
 */
function extractBase64(dataUrl: string): string {
  if (dataUrl.startsWith("data:")) {
    return dataUrl.split(",")[1] || dataUrl;
  }
  return dataUrl;
}

/**
 * 从 URL 下载图片并返回 Buffer
 */
async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * 将图片转换为 Buffer
 * 支持 base64 data URL 和 HTTP URL
 */
async function imageToBuffer(image: string): Promise<Buffer> {
  if (image.startsWith("data:")) {
    const base64Data = extractBase64(image);
    return Buffer.from(base64Data, "base64");
  } else if (image.startsWith("http")) {
    return downloadImage(image);
  } else {
    // 假设是纯 base64
    return Buffer.from(image, "base64");
  }
}

/**
 * Outpainting 准备：将 16:9 图片放到 32:9 画布的指定位置
 * @param sourceImage 源图片 (16:9)
 * @param position 放置位置: 'left' | 'right'
 * @param targetWidth 目标画布宽度，默认 2048
 * @param bleedPixels 重叠区域像素数（Bleed Trick），默认 50px
 * @returns { canvas: base64, mask: base64 }
 */
export async function prepareOutpaintingCanvas(
  sourceImage: string,
  position: "left" | "right" = "left",
  targetWidth: number = 2048,
  bleedPixels: number = 50
): Promise<{ canvas: string; mask: string }> {
  const sourceBuffer = await imageToBuffer(sourceImage);

  // 计算尺寸：32:9 画布
  const halfWidth = Math.floor(targetWidth / 2);
  const targetHeight = Math.floor(halfWidth * 9 / 16);

  // 调整源图片大小以匹配半边
  const resizedSource = await sharp(sourceBuffer)
    .resize(halfWidth, targetHeight, { fit: "cover" })
    .toBuffer();

  // 创建 32:9 画布，放置源图片
  // 重要：使用中灰色而不是纯黑（避免 AI 误解为黑夜）
  const leftPosition = position === "left" ? 0 : halfWidth;
  const canvas = await sharp({
    create: {
      width: targetWidth,
      height: targetHeight,
      channels: 3, // RGB，不使用 alpha
      background: { r: 128, g: 128, b: 128 }, // 中灰色背景
    },
  })
    .composite([
      { input: resizedSource, left: leftPosition, top: 0 },
    ])
    .jpeg({ quality: 85 }) // 使用 JPEG 压缩来减少数据量
    .toBuffer();

  // 创建 Mask（使用 Bleed Trick 策略）
  // 让白色区域（绘制区）稍微往原图侧"侵蚀"一点，消除接缝
  // position=left 时：左边保护（黑），右边绘制（白），白色往左侵蚀 bleedPixels
  // position=right 时：右边保护（黑），左边绘制（白），白色往右侵蚀 bleedPixels

  const protectedWidth = halfWidth - bleedPixels; // 严格保护区域宽度
  const drawWidth = halfWidth + bleedPixels;       // 绘制区域宽度（包含重叠）

  // 创建严格保护区（黑色）
  const protectedArea = await sharp({
    create: {
      width: protectedWidth,
      height: targetHeight,
      channels: 3,
      background: { r: 0, g: 0, b: 0 }, // 黑色 = 保护
    },
  }).png().toBuffer();

  // 创建绘制区（白色）
  const drawArea = await sharp({
    create: {
      width: drawWidth,
      height: targetHeight,
      channels: 3,
      background: { r: 255, g: 255, b: 255 }, // 白色 = 绘制
    },
  }).png().toBuffer();

  // 根据 position 决定布局
  let mask: Buffer;
  if (position === "left") {
    // 左边放原图：黑色保护区在左，白色绘制区在右（往左侵蚀）
    mask = await sharp({
      create: {
        width: targetWidth,
        height: targetHeight,
        channels: 3,
        background: { r: 255, g: 255, b: 255 }, // 默认白色
      },
    })
      .composite([
        { input: protectedArea, left: 0, top: 0 }, // 左边黑色保护区
      ])
      .png()
      .toBuffer();
  } else {
    // 右边放原图：黑色保护区在右，白色绘制区在左（往右侵蚀）
    mask = await sharp({
      create: {
        width: targetWidth,
        height: targetHeight,
        channels: 3,
        background: { r: 255, g: 255, b: 255 }, // 默认白色
      },
    })
      .composite([
        { input: protectedArea, left: targetWidth - protectedWidth, top: 0 }, // 右边黑色保护区
      ])
      .png()
      .toBuffer();
  }

  // 转换为 base64
  // 画布用 JPEG（已压缩），Mask 用 PNG（黑白图，本身很小）
  const canvasBase64 = `data:image/jpeg;base64,${canvas.toString("base64")}`;
  const maskBase64 = `data:image/png;base64,${mask.toString("base64")}`;

  console.log(`[ImageStitcher] 画布尺寸: ${targetWidth}x${targetHeight}`);
  console.log(`[ImageStitcher] Bleed 重叠区: ${bleedPixels}px`);
  console.log(`[ImageStitcher] 保护区宽度: ${protectedWidth}px, 绘制区宽度: ${drawWidth}px`);

  return { canvas: canvasBase64, mask: maskBase64 };
}

/**
 * 从 Outpainting 结果中提取指定部分
 * @param panoramaImage 32:9 全景图
 * @param position 提取位置: 'left' | 'right'
 * @returns base64 data URL (16:9)
 */
export async function extractHalfFromPanorama(
  panoramaImage: string,
  position: "left" | "right"
): Promise<string> {
  const buffer = await imageToBuffer(panoramaImage);
  const meta = await sharp(buffer).metadata();

  if (!meta.width || !meta.height) {
    throw new Error("无法获取图片尺寸");
  }

  const halfWidth = Math.floor(meta.width / 2);
  const left = position === "left" ? 0 : halfWidth;

  const extracted = await sharp(buffer)
    .extract({
      left,
      top: 0,
      width: halfWidth,
      height: meta.height,
    })
    .png()
    .toBuffer();

  return `data:image/png;base64,${extracted.toString("base64")}`;
}

/**
 * 横向拼接两张图片
 * @param leftImage 左侧图片 (base64 或 URL)
 * @param rightImage 右侧图片 (base64 或 URL)
 * @param targetWidth 目标宽度，默认 3840 (4K 宽度的一半，适合 32:9)
 * @returns base64 data URL
 */
export async function stitchImagesHorizontally(
  leftImage: string,
  rightImage: string,
  targetWidth: number = 3840
): Promise<string> {
  // 下载/转换两张图片
  const [leftBuffer, rightBuffer] = await Promise.all([
    imageToBuffer(leftImage),
    imageToBuffer(rightImage),
  ]);

  // 获取图片元数据
  const [leftMeta, rightMeta] = await Promise.all([
    sharp(leftBuffer).metadata(),
    sharp(rightBuffer).metadata(),
  ]);

  // 计算目标尺寸
  // 32:9 比例，每张图片占一半宽度 (16:9)
  const halfWidth = Math.floor(targetWidth / 2);
  const targetHeight = Math.floor(halfWidth * 9 / 16);

  // 调整两张图片大小
  const [leftResized, rightResized] = await Promise.all([
    sharp(leftBuffer)
      .resize(halfWidth, targetHeight, { fit: "cover" })
      .toBuffer(),
    sharp(rightBuffer)
      .resize(halfWidth, targetHeight, { fit: "cover" })
      .toBuffer(),
  ]);

  // 拼接图片
  const panorama = await sharp({
    create: {
      width: targetWidth,
      height: targetHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    },
  })
    .composite([
      { input: leftResized, left: 0, top: 0 },
      { input: rightResized, left: halfWidth, top: 0 },
    ])
    .png()
    .toBuffer();

  // 转换为 base64 data URL
  const base64 = panorama.toString("base64");
  return `data:image/png;base64,${base64}`;
}

/**
 * 从全景图中裁剪指定位置的 16:9 图片
 * @param panoramaImage 32:9 全景图 (base64 或 URL)
 * @param position 裁剪位置: 'left' | 'right' | 'center'
 * @returns base64 data URL
 */
export async function cropFromPanorama(
  panoramaImage: string,
  position: "left" | "right" | "center"
): Promise<string> {
  const buffer = await imageToBuffer(panoramaImage);
  const meta = await sharp(buffer).metadata();

  if (!meta.width || !meta.height) {
    throw new Error("无法获取图片尺寸");
  }

  // 计算裁剪区域 (16:9)
  const cropWidth = Math.floor(meta.width / 2);
  const cropHeight = meta.height;

  let left = 0;
  switch (position) {
    case "left":
      left = 0;
      break;
    case "right":
      left = cropWidth;
      break;
    case "center":
      left = Math.floor(cropWidth / 2);
      break;
  }

  const cropped = await sharp(buffer)
    .extract({
      left,
      top: 0,
      width: cropWidth,
      height: cropHeight,
    })
    .png()
    .toBuffer();

  const base64 = cropped.toString("base64");
  return `data:image/png;base64,${base64}`;
}
