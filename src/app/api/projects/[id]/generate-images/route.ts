import { NextResponse } from "next/server";

// 增加超时时间到 5 分钟
export const maxDuration = 300;
import type { ApiResponse } from "@/types";
import { getProject, updateProject } from "@/lib/db/projects";
import { getProjectScenes, updateScenePreview, updateSceneStatus } from "@/lib/db/scenes";
import { getProjectCharacters } from "@/lib/db/characters";
import { getProjectLocations } from "@/lib/db/locations";
import { generateSceneImage, type ImageModel, type AspectRatio } from "@/lib/ai/image-generator";
import { geminiClient } from "@/lib/ai/providers/gemini";

// 默认配置
const DEFAULT_MODEL: ImageModel = "gemini";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// 为项目的所有场景生成预览图
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const {
      style,
      model = DEFAULT_MODEL,
    } = body as {
      style?: string;
      model?: ImageModel;
    };

    // 验证项目存在
    const project = await getProject(id);
    if (!project) {
      return NextResponse.json(
        { success: false, error: "项目不存在" },
        { status: 404 }
      );
    }

    // 从项目配置读取比例设置
    const styleConfig = project.style_config as { aspectRatio?: string } | null;
    const aspectRatio = (styleConfig?.aspectRatio || "16:9") as AspectRatio;

    // 获取所有场景
    const scenes = await getProjectScenes(id);
    if (scenes.length === 0) {
      return NextResponse.json(
        { success: false, error: "项目没有场景" },
        { status: 400 }
      );
    }

    // 更新项目状态
    await updateProject(id, { status: "generating_images" });

    // 获取项目所有角色
    const allCharacters = await getProjectCharacters(id);

    // 获取项目所有场景地点
    const allLocations = await getProjectLocations(id);

    // 构建 location_id 到 location 的映射
    const locationMap = new Map<string, { name: string; imageUrl: string | null }>();
    allLocations.forEach((loc) => {
      // 优先使用 panorama_url (21:9)，其次 view_main_url，最后 reference_image_url
      const imageUrl = loc.panorama_url || loc.view_main_url || loc.reference_image_url || null;
      locationMap.set(loc.id, { name: loc.name, imageUrl });
    });

    // 🔍 调试：输出场景地点信息
    console.log("\n========== 场景地点调试信息 ==========");
    console.log(`场景地点总数: ${allLocations.length}`);
    allLocations.forEach((loc, index) => {
      const imageUrl = loc.panorama_url || loc.view_main_url || loc.reference_image_url;
      console.log(`\n地点 ${index + 1}:`);
      console.log(`  - ID: ${loc.id}`);
      console.log(`  - 名称: ${loc.name}`);
      console.log(`  - 空景图: ${imageUrl ? imageUrl.slice(0, 80) + "..." : "(无)"}`);
    });

    // 🔍 调试：输出所有角色信息
    console.log("\n========== 角色调试信息 ==========");
    console.log(`项目 ID: ${id}`);
    console.log(`角色总数: ${allCharacters.length}`);
    allCharacters.forEach((char, index) => {
      const images = char.reference_images as string[] | null;
      console.log(`\n角色 ${index + 1}:`);
      console.log(`  - ID: ${char.id}`);
      console.log(`  - 名称: ${char.name || "(空)"}`);
      console.log(`  - 描述: ${char.description?.slice(0, 50) || "(空)"}...`);
      console.log(`  - 立绘数量: ${images?.length || 0}`);
      console.log(`  - 立绘 URL: ${images?.[0]?.slice(0, 80) || "(无)"}...`);
    });

    // 构建角色名称到参考图 URL 的映射（优先三视图设计稿，回退到正面立绘）
    const characterImageMap = new Map<string, string>();
    allCharacters.forEach((char) => {
      if (char.name) {
        const assets = char.assets as { sheet_url?: string } | null;
        const images = char.reference_images as string[] | null;
        const refUrl = assets?.sheet_url || (images && images.length > 0 ? images[0] : null);
        if (refUrl) {
          characterImageMap.set(char.name, refUrl);
        }
      }
    });

    // 🔍 调试：输出映射表
    console.log("\n========== 角色参考图映射表 ==========");
    console.log(`有参考图的角色数: ${characterImageMap.size}`);
    characterImageMap.forEach((url, name) => {
      const isSheet = allCharacters.find(c => c.name === name)?.assets && (allCharacters.find(c => c.name === name)?.assets as { sheet_url?: string })?.sheet_url === url;
      console.log(`  - ${name}: [${isSheet ? "三视图" : "立绘"}] ${url.slice(0, 80)}...`);
    });

    // 先更新所有场景状态为生成中
    await Promise.all(
      scenes.map((scene) => updateSceneStatus(scene.id, "generating_image"))
    );

    // 并行生成所有场景的图像
    const generatePromises = scenes.map(async (scene) => {
      try {
        // 获取场景关联的角色（使用模糊匹配：角色名包含场景中的名称，或场景中的名称包含角色名）
        const sceneCharacterNames = (scene.character_ids as string[] | null) || [];
        const sceneCharacters = allCharacters.filter((c) => {
          if (!c.name) return false;
          return sceneCharacterNames.some(
            (sceneName) =>
              c.name!.includes(sceneName) || sceneName.includes(c.name!)
          );
        });

        // 提取角色立绘 URL（用于角色一致性，使用模糊匹配）
        const referenceImages: string[] = [];
        for (const sceneName of sceneCharacterNames) {
          // 遍历映射表，找到包含关系的角色
          for (const [charName, imageUrl] of characterImageMap) {
            if (charName.includes(sceneName) || sceneName.includes(charName)) {
              if (!referenceImages.includes(imageUrl)) {
                referenceImages.push(imageUrl);
              }
            }
          }
        }

        // 获取场景关联的 location 空景图
        let locationImage: string | undefined;
        let locationName: string | undefined;
        if (scene.location_id) {
          const locationInfo = locationMap.get(scene.location_id);
          if (locationInfo && locationInfo.imageUrl) {
            locationImage = locationInfo.imageUrl;
            locationName = locationInfo.name;
          }
        }

        // 🔍 调试：输出场景信息
        console.log(`\n---------- 场景 #${scene.scene_index} 信息 ----------`);
        console.log(`场景 ID: ${scene.id}`);
        console.log(`场景描述: ${scene.description?.slice(0, 50) || "(空)"}...`);
        console.log(`character_ids 原始值: ${JSON.stringify(scene.character_ids)}`);
        console.log(`解析后角色名称: [${sceneCharacterNames.join(", ")}]`);
        console.log(`匹配到的角色数: ${sceneCharacters.length}`);
        sceneCharacters.forEach((c) => {
          console.log(`  - ${c.name}`);
        });
        console.log(`传递的角色参考图数量: ${referenceImages.length}`);
        referenceImages.forEach((url, i) => {
          console.log(`  角色参考图 ${i + 1}: ${url.slice(0, 80)}...`);
        });
        console.log(`场景 location_id: ${scene.location_id || "(无)"}`);
        console.log(`场景图: ${locationImage ? `${locationName} (${locationImage.slice(0, 50)}...)` : "(无)"}`);
        console.log(`使用模型: ${model}`);
        console.log(`使用比例: ${aspectRatio}`);

        // 解析 cuts 数据（如果存在）
        const cuts = scene.cuts as import("@/lib/ai/script-parser").ParsedCut[] | null;

        // 🔍 调试：输出 cuts 信息
        if (cuts && cuts.length > 0) {
          console.log(`场景 Cuts 数量: ${cuts.length}`);
          cuts.forEach((cut, i) => {
            console.log(`  Cut ${i + 1}: ${cut.cameraAngle} - ${cut.visualDescription?.slice(0, 40)}...`);
          });
        } else {
          console.log(`场景 Cuts: (无)`);
        }

        // 生成图像（包含角色信息、参考图、场景图和 cuts 数据）
        const imageUrl = await generateSceneImage(
          {
            full_prompt: scene.full_prompt,
            shot_type: scene.shot_type,
            description: scene.description,
            cuts: cuts || undefined,  // 传递 cuts 数据以启用多格模式
          },
          {
            model,
            aspectRatio,
            style,
            characters: sceneCharacters,
            referenceImages,
            characterNames: sceneCharacterNames,
            locationImage,
            locationName,
          }
        );

        // 更新场景预览图
        await updateScenePreview(scene.id, imageUrl);

        return {
          sceneId: scene.id,
          sceneIndex: scene.scene_index,
          success: true as const,
          imageUrl,
        };
      } catch (error) {
        // 单个场景失败
        await updateSceneStatus(scene.id, "image_failed");

        return {
          sceneId: scene.id,
          sceneIndex: scene.scene_index,
          success: false as const,
          error: error instanceof Error ? error.message : "生成失败",
        };
      }
    });

    // 等待所有生成任务完成
    const results = await Promise.all(generatePromises);

    // 批量生成结束，清除缓存释放内存
    geminiClient.clearUrlCache();

    // 检查是否全部成功
    const successCount = results.filter((r) => r.success).length;
    const allSuccess = successCount === scenes.length;

    // 更新项目状态
    await updateProject(id, {
      status: allSuccess ? "images_ready" : "images_partial",
    });

    const response: ApiResponse<{
      projectId: string;
      totalScenes: number;
      successCount: number;
      failedCount: number;
      results: typeof results;
    }> = {
      success: true,
      data: {
        projectId: id,
        totalScenes: scenes.length,
        successCount,
        failedCount: scenes.length - successCount,
        results,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("生成项目图像失败:", error);

    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "生成项目图像失败",
    };
    return NextResponse.json(response, { status: 500 });
  }
}
