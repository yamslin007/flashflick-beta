import { NextResponse } from "next/server";

// 增加超时时间到 5 分钟
export const maxDuration = 300;
import type { ApiResponse } from "@/types";
import { getScene, updateScene, updateSceneStatus } from "@/lib/db/scenes";
import { getProject } from "@/lib/db/projects";
import { getProjectCharacters } from "@/lib/db/characters";
import { getLocation } from "@/lib/db/locations";
import { regenerateSceneImage, type AspectRatio } from "@/lib/ai/image-generator";

interface RouteParams {
  params: Promise<{ sceneId: string }>;
}

// 重新生成场景图像
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { sceneId } = await params;
    const body = await request.json().catch(() => ({}));
    const { feedback, newDescription, style } = body;

    // 获取场景信息
    const scene = await getScene(sceneId);
    if (!scene) {
      return NextResponse.json(
        { success: false, error: "场景不存在" },
        { status: 404 }
      );
    }

    // 获取项目配置，读取比例设置
    const project = await getProject(scene.project_id);
    const styleConfig = project?.style_config as { aspectRatio?: string } | null;
    const aspectRatio = (styleConfig?.aspectRatio || "16:9") as AspectRatio;

    // 如果提供了新描述，先更新场景
    if (newDescription) {
      await updateScene(sceneId, {
        description: newDescription,
        full_prompt: newDescription, // 也更新完整提示词
      });
    }

    // 更新状态为生成中
    await updateSceneStatus(sceneId, "regenerating");

    // 获取项目所有角色
    const allCharacters = await getProjectCharacters(scene.project_id);

    // 筛选场景中出现的角色（使用模糊匹配）
    const sceneCharacterNames = (scene.character_ids as string[] | null) || [];
    const sceneCharacters = allCharacters.filter((c) => {
      if (!c.name) return false;
      return sceneCharacterNames.some(
        (sceneName) =>
          c.name!.includes(sceneName) || sceneName.includes(c.name!)
      );
    });

    // 提取角色参考图 URL（优先使用三视图设计稿，回退到正面立绘）
    const referenceImages: string[] = [];
    for (const char of sceneCharacters) {
      const assets = char.assets as { sheet_url?: string } | null;
      const images = char.reference_images as string[] | null;
      // 优先使用三视图设计稿（角色一致性更好），回退到正面立绘
      const refUrl = assets?.sheet_url || (images && images.length > 0 ? images[0] : null);
      if (refUrl && !referenceImages.includes(refUrl)) {
        referenceImages.push(refUrl);
      }
    }

    // 获取场景关联的 location 空景图
    let locationImage: string | undefined;
    let locationName: string | undefined;
    if (scene.location_id) {
      const location = await getLocation(scene.location_id);
      if (location) {
        // 优先使用 panorama_url (21:9)，其次 view_main_url，最后 reference_image_url
        locationImage = location.panorama_url || location.view_main_url || location.reference_image_url || undefined;
        locationName = location.name;
      }
    }

    // 解析 cuts 数据（如果存在）
    const cuts = scene.cuts as import("@/lib/ai/script-parser").ParsedCut[] | null;

    // 🔍 调试日志
    console.log(`\n---------- 重新生成场景图片 ----------`);
    console.log(`场景 character_ids: ${JSON.stringify(sceneCharacterNames)}`);
    console.log(`匹配到的角色: ${sceneCharacters.map(c => c.name).join(", ") || "(无)"}`);
    console.log(`传递的角色参考图数量: ${referenceImages.length}`);
    sceneCharacters.forEach((char) => {
      const assets = char.assets as { sheet_url?: string } | null;
      console.log(`  ${char.name}: ${assets?.sheet_url ? "[三视图]" : "[立绘]"}`);
    });
    console.log(`场景 location_id: ${scene.location_id || "(无)"}`);
    console.log(`场景图: ${locationImage ? `${locationName} (${locationImage.slice(0, 50)}...)` : "(无)"}`);
    console.log(`场景 Cuts 数量: ${cuts?.length || 0}`);
    if (cuts && cuts.length > 0) {
      cuts.forEach((cut, i) => {
        console.log(`  Cut ${i + 1}: ${cut.cameraAngle} - ${cut.visualDescription?.slice(0, 40)}...`);
      });
    }

    // 重新生成图像
    let imageUrl: string;
    try {
      imageUrl = await regenerateSceneImage(
        {
          full_prompt: newDescription || scene.full_prompt,
          shot_type: scene.shot_type,
          description: newDescription || scene.description,
          cuts: cuts || undefined,  // 传递 cuts 数据以启用多格模式
        },
        feedback,
        {
          style,
          aspectRatio,
          characters: sceneCharacters,
          referenceImages,
          locationImage,
          locationName,
        }
      );
    } catch (error) {
      // 生成失败，更新状态
      await updateSceneStatus(sceneId, "image_failed");
      throw error;
    }

    // 更新场景预览图和用户反馈
    await updateScene(sceneId, {
      preview_image_url: imageUrl,
      user_feedback: feedback || null,
      status: "image_ready",
    });

    const response: ApiResponse<{
      sceneId: string;
      previewImageUrl: string;
      status: string;
    }> = {
      success: true,
      data: {
        sceneId,
        previewImageUrl: imageUrl,
        status: "image_ready",
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("重新生成场景图像失败:", error);

    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "重新生成场景图像失败",
    };
    return NextResponse.json(response, { status: 500 });
  }
}
