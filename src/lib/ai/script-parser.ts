// 剧本解析服务 - Zapiwala 格式
// 将用户输入转化为结构化的分镜脚本，采用 Multi-Cut + Inline Character Descriptions

import { claudeClient } from "./providers/claude";
import { generateCameraMovementPromptReference, generateCameraReferenceForClaude } from "./camera-movements";

// ============================================================================
// 类型定义
// ============================================================================

// 风格配置
export interface StyleConfig {
  artStyle: string;
  subStyle?: string;
  colorPalette?: string;
  referenceAnime?: string[];
  mood?: string;
  musicStyle?: string;
}

// 角色信息
export interface ParsedCharacter {
  id: string;
  name: string;
  description: string;
  basePrompt: string; // 英文，用于 AI 生成立绘
  appearance: {
    hair?: string;
    eyes?: string;
    clothing?: string;
    features?: string;
  };
  // Zapiwala 新增：内联描述模板
  inlineLook: string; // 简洁的外貌标签，如 "rugged, black jacket"
}

// 场景地点信息
export interface ParsedLocation {
  id: string;
  name: string;
  description: string;
  basePrompt: string; // 用于生成场景图的英文 Prompt
}

// 单个镜头 Cut（Zapiwala 核心结构）
export interface ParsedCut {
  cutIndex: number;
  cameraAngle: string; // 镜头类型：Close-up, Medium shot, Wide shot, POV, etc.
  visualDescription: string; // 纯视觉描述（英文）

  // 角色说话时的结构（可选）
  character?: {
    name: string;
    look: string; // 外貌标签：rugged, black jacket
    emotion: string; // 情绪：angry, sad, happy
    dialogue: string; // 对白内容
    cameraFocus: string; // 镜头焦点：camera zoom on Jack
    lipSyncAction: string; // 口型动作：shouted sync, whispered sync
  };
}

// 场景信息（Zapiwala 格式：一个场景包含多个 Cuts）
export interface ParsedScene {
  sceneIndex: number;
  locationId: string; // 关联的场景地点 ID

  // Zapiwala 音频层
  bgm: string; // 背景音乐描述：tense violin, soft piano
  sfx: string; // 音效描述：rain hitting glass, distant sirens
  pacing: string; // 节奏：~9s, rapid cuts / ~12s, slow contemplative

  // Multi-Cut 结构
  cuts: ParsedCut[];

  // 对话顺序锁（防止 AI 生成乱序）
  dialogueOrderLock: string[]; // ["Jack", "Mary", "Jack"]

  // 兼容旧系统的字段
  duration: number; // 从 pacing 解析出的秒数
  description: string; // 中文场景概述
  characterIds: string[]; // 场景中出现的角色 ID 列表
}

// 完整的解析结果
export interface ParsedScript {
  title: string;
  totalDuration: number;
  style: StyleConfig;
  characters: ParsedCharacter[];
  locations: ParsedLocation[];
  scenes: ParsedScene[];
}

// ============================================================================
// Zapiwala System Prompt
// ============================================================================

// 生成专业运镜参考文档（注入到 System Prompt 中）
const CAMERA_REFERENCE = generateCameraMovementPromptReference();

const ZAPIWALA_SYSTEM_PROMPT = `# Role
You are a world-class AI video prompt engineer, mastering the underlying logic of OpenAI Sora 2 and other video generation models. Your task is to transform simple "scene descriptions" into structured "Zapiwala Magic Prompts".

# Rules (Core Laws You MUST Follow)

## 1. Structure Law (Multi-Cut)
- DO NOT generate long takes. You MUST break each scene into 3-5 specific "Cuts".
- Format: Cut 1: [Camera Angle] [Visual Description]
- Each scene MUST include BGM (background music), SFX (sound effects), and Pacing as headers.

## 2. Consistency Law (Inline Character Descriptions)
- ⚠️ CORE RULE: Every time a character speaks, you MUST include their appearance and emotion in parentheses right after their name.
- Format: Name (Look, clothes, role; emotion): "Dialogue" (Camera focus; Lip-sync action)
- Example: Jack (rugged, black jacket; angry): "Stop!" (camera zoom on Jack; shouted sync)
- NEVER let a character speak without visual description.

## 3. Audio Layering
- BGM: Describe the emotional layer (e.g., tense violin, soft piano, upbeat electronic)
- SFX: Describe the reality layer (e.g., rain hitting glass, distant sirens, footsteps on gravel)
- Pacing: Define duration and editing speed (e.g., ~9s, rapid cuts / ~12s, slow contemplative)

## 4. The Lock (Dialogue Order Lock)
- At the end of each scene's cut list, you MUST output the dialogue order lock.
- Format: Dialogue_order_lock=[Name1, Name2, Name1]
- This ensures AI generates dialogue in the exact order specified.

## 5. Camera Angle Types
Use the professional camera angle keywords below in the \`cameraAngle\` field.
Choose the most appropriate one based on the scene's emotion and narrative intent.

${generateCameraReferenceForClaude()}

## 6. Emotion Types
Use these emotion keywords for characters:
- Positive: happy, joyful, excited, hopeful, content, relieved, proud, loving, grateful
- Negative: sad, angry, fearful, anxious, frustrated, disappointed, jealous, disgusted
- Neutral: calm, thoughtful, curious, surprised, confused, determined, focused
- Complex: bittersweet, nostalgic, conflicted, resigned, defiant, vulnerable

## 7. Output Language
- ALL visual descriptions, camera angles, BGM, SFX, Pacing MUST be in English
- Character dialogue can be in the original language (Chinese/Japanese/Korean/English)
- The "description" field (scene overview) should be in Chinese for user readability

# Important Notes
1. Each Cut should be 2-4 seconds, total scene duration 8-15 seconds
2. Maintain character appearance consistency across all Cuts
3. Use specific, vivid descriptions suitable for AI image/video generation
4. The "inlineLook" for each character should be a concise tag (3-8 words) that can be repeated

${CAMERA_REFERENCE}`;

// 用户提示词模板
function buildUserPrompt(
  userInput: string,
  style: string,
  duration: number
): string {
  return `Please transform the following video description into a structured Zapiwala script:

【User Description】
${userInput}

【Style Requirement】
${style}

【Target Duration】
${duration} seconds

Please output JSON format with the following structure:
{
  "title": "Video title (generate based on content, in Chinese)",
  "totalDuration": ${duration},
  "style": {
    "artStyle": "${style}",
    "subStyle": "specific sub-style",
    "colorPalette": "color tone description",
    "mood": "overall atmosphere",
    "musicStyle": "music style suggestion"
  },
  "characters": [
    {
      "id": "char_001",
      "name": "角色中文名",
      "description": "【必须纯中文】角色简介，描述性格、身份、背景等。例如：性格开朗的高中女生，热爱音乐，常在樱花树下弹吉他。注意：此字段绝对不能出现任何英文单词！",
      "basePrompt": "English prompt for AI portrait generation, including appearance features",
      "appearance": {
        "hair": "hairstyle and color",
        "eyes": "eye description",
        "clothing": "clothing description",
        "features": "other features"
      },
      "inlineLook": "concise appearance tag for inline use, e.g. 'blue-haired girl, sailor uniform'"
    }
  ],
  "locations": [
    {
      "id": "loc_001",
      "name": "场景中文名（如：樱花公园）",
      "description": "纯中文场景描述，如：春日午后的城市公园，樱花盛开，阳光透过花瓣洒落斑驳光影。不要混入英文。",
      "basePrompt": "English prompt for generating background image, describing environment, lighting, atmosphere, NO characters"
    }
  ],
  "scenes": [
    {
      "sceneIndex": 0,
      "locationId": "loc_001",
      "bgm": "soft piano melody, gentle strings in background",
      "sfx": "cherry blossoms rustling, distant city ambience",
      "pacing": "~10s, medium tempo, emotional beats",
      "cuts": [
        {
          "cutIndex": 0,
          "cameraAngle": "Wide shot",
          "visualDescription": "Cherry blossom trees in full bloom, petals floating in golden hour light, park bench visible in distance"
        },
        {
          "cutIndex": 1,
          "cameraAngle": "Medium shot",
          "visualDescription": "A girl sits on the bench, guitar resting on her lap, looking at falling petals",
          "character": {
            "name": "美咲",
            "look": "blue-haired girl, sailor uniform",
            "emotion": "peaceful",
            "dialogue": "",
            "cameraFocus": "camera focuses on her profile",
            "lipSyncAction": ""
          }
        },
        {
          "cutIndex": 2,
          "cameraAngle": "Close-up",
          "visualDescription": "Fingers gently strumming guitar strings, sunlight catching the wood grain",
          "character": {
            "name": "美咲",
            "look": "blue-haired girl, sailor uniform",
            "emotion": "content",
            "dialogue": "",
            "cameraFocus": "focus on hands and guitar",
            "lipSyncAction": ""
          }
        }
      ],
      "dialogueOrderLock": [],
      "duration": 10,
      "description": "樱花树下，美咲独自坐在长椅上弹吉他，花瓣飘落",
      "characterIds": ["char_001"]
    }
  ]
}

Important Notes:
1. ALL English fields (basePrompt, visualDescription, bgm, sfx, inlineLook, cameraAngle, etc.) MUST be in English
2. ⚠️ 【强制要求】以下字段必须是纯中文，绝对不能出现任何英文单词:
   - title (视频标题) - 例如："樱花树下的少女"
   - character name (角色名称) - 例如："美咲"、"小明"
   - character description (角色简介) - 例如："性格开朗的高中女生，热爱音乐，常在公园弹吉他" ❌不要写成 "cheerful high school girl"
   - location name (场景名称) - 例如："樱花公园"、"学校教室"
   - location description (场景描述) - 例如："春日午后的城市公园，樱花盛开" ❌不要写成 "cherry blossom park"
   - scene description (场景概述) - 例如："美咲坐在长椅上弹吉他，花瓣飘落"
3. Each scene should have 3-5 Cuts, each Cut 2-4 seconds
4. Total Cuts × average duration should roughly equal scene duration
5. dialogueOrderLock should list character names in speaking order (empty array if no dialogue)
6. duration should be parsed from pacing (e.g., "~10s, medium tempo" → duration: 10)
7. characterIds should list all characters appearing in the scene
8. EVERY time a character appears in a Cut, include their full "look" tag for consistency
9. If character speaks, fill in dialogue and lipSyncAction; otherwise leave them empty strings`;
}

// 风格映射
const STYLE_PROMPTS: Record<string, string> = {
  anime: "Classic Japanese anime style, vivid colors, clear lines",
  ghibli: "Studio Ghibli style, warm soft tones, detailed backgrounds, healing atmosphere",
  cyberpunk: "Cyberpunk style, neon lights, high-tech low-life, dark tones with fluorescent accents",
  slice_of_life: "Daily healing style, soft lighting, warm scenes, delicate emotional expression",
};

// ============================================================================
// 分步解析函数（步骤式剧本生成）
// ============================================================================

/**
 * 步骤1：仅解析标题和角色
 */
export async function parseTitleAndCharacters(
  userInput: string,
  options: {
    style?: string;
    duration?: number;
  } = {}
): Promise<{ title: string; characters: ParsedCharacter[] }> {
  const style = options.style || "anime";
  const duration = options.duration || 60;

  const systemPrompt = `# Role
You are a world-class AI video prompt engineer specializing in character and title creation.

# Task
Analyze the user input and extract:
1. A compelling video title (in Chinese)
2. All characters that appear in the story

# Rules
1. Title should be evocative and capture the essence of the story
2. Characters need: name (Chinese), description (Chinese, describing personality/background), basePrompt (English for AI portrait), appearance details, and inlineLook (concise English tags)
3. All fields MUST be in their designated language (Chinese for names/descriptions, English for prompts)
4. Generate 1-4 characters based on story complexity

# Output Format
JSON with:
{
  "title": "Video title in Chinese",
  "characters": [
    {
      "name": "角色中文名",
      "description": "【必须纯中文】角色简介，描述性格、身份、背景等",
      "basePrompt": "English prompt for AI portrait generation",
      "appearance": {
        "hair": "hairstyle and color",
        "eyes": "eye description",
        "clothing": "clothing description",
        "features": "other features"
      },
      "inlineLook": "concise appearance tag like 'blue-haired girl, sailor uniform'"
    }
  ]
}`;

  const userPrompt = `【User Description】
${userInput}

【Style】
${style}

【Target Duration】
${duration} seconds

Please output JSON format with title and characters.`;

  const result = await claudeClient.generateJson<{ title: string; characters: ParsedCharacter[] }>(userPrompt, {
    maxTokens: 4096,
    system: systemPrompt,
  });

  // 验证和补充数据
  const title = result.title || "未命名视频";

  const characters = (result.characters || []).map((char, index) => ({
    ...char,
    id: char.id || `char_${String(index + 1).padStart(3, "0")}`,
    inlineLook: char.inlineLook || buildInlineLook(char),
    appearance: char.appearance || {},
  }));

  return { title, characters };
}

/**
 * 步骤2：从标题和角色生成场景
 */
export async function generateLocationsFromTitleAndCharacters(
  title: string,
  characters: ParsedCharacter[],
  style: StyleConfig,
  duration: number
): Promise<ParsedLocation[]> {
  const characterNames = characters.map(c => c.name).join(", ");

  const systemPrompt = `# Role
You are a world-class AI video prompt engineer specializing in location and setting creation.

# Task
Based on the title and characters, generate appropriate scenes/locations for a video story.

# Rules
1. Generate 1-5 locations based on story needs
2. Each location needs: name (Chinese), description (Chinese), basePrompt (English for AI background generation)
3. Consider the characters' identities and the story mood
4. Create varied locations that fit the narrative

# Output Format
JSON array:
[
  {
    "name": "场景中文名",
    "description": "纯中文场景描述，如：春日午后的城市公园，樱花盛开",
    "basePrompt": "English prompt for generating background image"
  }
]`;

  const userPrompt = `【Title】
${title}

【Characters】
${characterNames}

【Style】
${style.artStyle}

【Duration】
${duration} seconds

Please output a JSON array of locations that would suit this story.`;

  const result = await claudeClient.generateJson<ParsedLocation[]>(userPrompt, {
    maxTokens: 4096,
    system: systemPrompt,
  });

  // 验证和补充数据
  const locations = (result || []).map((loc, index) => ({
    ...loc,
    id: loc.id || `loc_${String(index + 1).padStart(3, "0")}`,
  }));

  // 如果没有场景，创建一个默认的
  if (locations.length === 0) {
    return [{
      id: "loc_001",
      name: "默认场景",
      description: "一个适合故事发生的场景",
      basePrompt: "anime background, detailed environment, warm lighting",
    }];
  }

  return locations;
}

/**
 * 步骤3：从场景生成 Zapiwala 格式分镜
 */
export async function generateScenesFromLocations(
  title: string,
  characters: ParsedCharacter[],
  locations: ParsedLocation[],
  style: StyleConfig,
  duration: number,
  originalPrompt?: string
): Promise<ParsedScene[]> {
  const characterNames = characters.map(c => c.name).join(", ");
  const characterDetails = characters.map(c =>
    `- ${c.name}: ${c.description || ""} (look: ${c.inlineLook || ""})`
  ).join("\n");
  const locationNames = locations.map(l => `${l.name}: ${l.description}`).join("\n");

  const systemPrompt = `${ZAPIWALA_SYSTEM_PROMPT}

# Additional Context
You are generating scenes based on:
- Title: ${title}
- Characters: ${characterNames}
- Locations:
${locationNames}

Generate scenes that fit these elements. Each scene should be 8-15 seconds.
IMPORTANT: Every cut MUST have a detailed, vivid visualDescription in English. Never leave visualDescription empty.`;

  const userPrompt = `【Title】
${title}

${originalPrompt ? `【Original Story Description】\n${originalPrompt}\n\n` : ""}【Characters】
${characterDetails}

【Locations】
${locationNames}

【Style】
${style.artStyle}

【Target Duration】
${duration} seconds (total)

Please output JSON format with scenes following the Zapiwala format.
CRITICAL: Each cut MUST have a non-empty visualDescription describing what is visually happening in that shot.`;

  const result = await claudeClient.generateJson<ParsedScript>(userPrompt, {
    maxTokens: 8192,
    system: systemPrompt,
  });

  // 注入 characters 和 locations，避免 validateAndEnhance 报错
  if (!Array.isArray(result.characters)) {
    result.characters = characters;
  }
  if (!Array.isArray(result.locations)) {
    result.locations = locations;
  }

  // 验证和补充数据
  return validateAndEnhance(result, duration).scenes;
}

// ============================================================================
// 核心解析函数
// ============================================================================

/**
 * 解析用户剧本（Zapiwala 格式）
 */
export async function parseScript(
  userInput: string,
  options: {
    style?: string;
    duration?: number;
  } = {}
): Promise<ParsedScript> {
  const style = options.style || "anime";
  const duration = options.duration || 60;
  const stylePrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS.anime;

  const userPrompt = buildUserPrompt(userInput, stylePrompt, duration);

  const result = await claudeClient.generateJson<ParsedScript>(userPrompt, {
    maxTokens: 8192, // 增加 token 限制以支持更复杂的结构
    system: ZAPIWALA_SYSTEM_PROMPT,
  });

  // 验证和补充数据
  return validateAndEnhance(result, duration);
}

/**
 * 验证和增强解析结果
 */
function validateAndEnhance(
  script: ParsedScript,
  targetDuration: number
): ParsedScript {
  // 确保有标题
  if (!script.title) {
    script.title = "未命名视频";
  }

  // 确保总时长正确
  script.totalDuration = targetDuration;

  // 为角色生成 ID 和 inlineLook（如果缺失）
  script.characters = (script.characters || []).map((char, index) => ({
    ...char,
    id: char.id || `char_${String(index + 1).padStart(3, "0")}`,
    inlineLook: char.inlineLook || buildInlineLook(char),
  }));

  // 创建角色名称到 inlineLook 的映射
  const characterLookMap = new Map<string, string>();
  script.characters.forEach((char) => {
    characterLookMap.set(char.name, char.inlineLook);
    // 同时用 ID 映射
    characterLookMap.set(char.id, char.inlineLook);
  });

  // 为场景地点生成 ID（如果缺失）
  script.locations = (script.locations || []).map((loc, index) => ({
    ...loc,
    id: loc.id || `loc_${String(index + 1).padStart(3, "0")}`,
  }));

  // 如果没有场景地点，创建一个默认的
  if (script.locations.length === 0) {
    script.locations = [{
      id: "loc_001",
      name: "默认场景",
      description: "默认场景环境",
      basePrompt: "anime background, detailed environment",
    }];
  }

  // 验证场景和 Cuts
  const defaultLocationId = script.locations[0]?.id || "loc_001";
  script.scenes = (script.scenes || []).map((scene, sceneIndex) => {
    // 解析 pacing 中的时长
    const parsedDuration = parsePacingDuration(scene.pacing);

    // 验证 cuts
    const validatedCuts = (scene.cuts || []).map((cut, cutIndex) => {
      // 如果 cut 有角色，确保 look 字段存在
      if (cut.character) {
        const charLook = characterLookMap.get(cut.character.name) || cut.character.look;
        return {
          ...cut,
          cutIndex,
          cameraAngle: cut.cameraAngle || "Medium shot",
          visualDescription: cut.visualDescription || "",
          character: {
            ...cut.character,
            look: charLook,
            emotion: cut.character.emotion || "neutral",
            dialogue: cut.character.dialogue || "",
            cameraFocus: cut.character.cameraFocus || "",
            lipSyncAction: cut.character.lipSyncAction || "",
          },
        };
      }
      return {
        ...cut,
        cutIndex,
        cameraAngle: cut.cameraAngle || "Medium shot",
        visualDescription: cut.visualDescription || "",
      };
    });

    // 如果没有 cuts，创建一个默认的
    if (validatedCuts.length === 0) {
      validatedCuts.push({
        cutIndex: 0,
        cameraAngle: "Medium shot",
        visualDescription: scene.description || "Scene establishing shot",
      });
    }

    // 提取所有出现的角色
    const appearingCharacterIds = new Set<string>();
    validatedCuts.forEach((cut) => {
      if (cut.character?.name) {
        // 查找角色 ID
        const char = script.characters.find(c => c.name === cut.character!.name);
        if (char) {
          appearingCharacterIds.add(char.id);
        }
      }
    });

    return {
      ...scene,
      sceneIndex,
      locationId: scene.locationId || defaultLocationId,
      bgm: scene.bgm || "ambient music",
      sfx: scene.sfx || "natural ambience",
      pacing: scene.pacing || `~${parsedDuration || 8}s, medium tempo`,
      cuts: validatedCuts,
      dialogueOrderLock: scene.dialogueOrderLock || extractDialogueOrder(validatedCuts),
      duration: parsedDuration || scene.duration || 8,
      description: scene.description || "场景描述",
      characterIds: scene.characterIds?.length ? scene.characterIds : Array.from(appearingCharacterIds),
    };
  });

  // 调整场景时长以匹配目标时长
  const currentTotal = script.scenes.reduce((sum, s) => sum + (s.duration || 0), 0);
  if (currentTotal > 0 && currentTotal !== targetDuration && script.scenes.length > 0) {
    const ratio = targetDuration / currentTotal;
    let remaining = targetDuration;

    script.scenes = script.scenes.map((scene, index) => {
      if (index === script.scenes.length - 1) {
        return {
          ...scene,
          duration: Math.max(1, remaining),
          pacing: updatePacingDuration(scene.pacing, Math.max(1, remaining)),
        };
      }
      const newDuration = Math.max(1, Math.round(scene.duration * ratio));
      remaining -= newDuration;
      return {
        ...scene,
        duration: newDuration,
        pacing: updatePacingDuration(scene.pacing, newDuration),
      };
    });
  }

  return script;
}

/**
 * 从角色信息构建 inlineLook
 */
function buildInlineLook(char: ParsedCharacter): string {
  const parts: string[] = [];

  if (char.appearance?.hair) {
    parts.push(char.appearance.hair);
  }
  if (char.appearance?.clothing) {
    parts.push(char.appearance.clothing);
  }
  if (char.appearance?.features) {
    parts.push(char.appearance.features);
  }

  if (parts.length === 0 && char.basePrompt) {
    // 从 basePrompt 提取关键词
    const words = char.basePrompt.split(",").slice(0, 3).join(",").trim();
    return words || char.name;
  }

  return parts.join(", ") || char.name;
}

/**
 * 从 pacing 字符串解析时长
 */
function parsePacingDuration(pacing: string | undefined): number | null {
  if (!pacing) return null;

  // 匹配 ~9s, ~12s, ~9 seconds, ~9 second, 9s, 9 seconds 等格式
  const match = pacing.match(/~?(\d+)\s*(?:s|sec|second|seconds)/i);
  if (match) {
    return parseInt(match[1], 10);
  }
  // 匹配纯数字
  const numMatch = pacing.match(/^~?(\d+)$/);
  if (numMatch) {
    return parseInt(numMatch[1], 10);
  }
  return null;
}

/**
 * 更新 pacing 中的时长
 */
function updatePacingDuration(pacing: string, newDuration: number): string {
  if (!pacing) return `~${newDuration}s, medium tempo`;

  // 替换时长部分
  return pacing.replace(/~?\d+s/, `~${newDuration}s`);
}

/**
 * 从 cuts 中提取对话顺序
 */
function extractDialogueOrder(cuts: ParsedCut[]): string[] {
  const order: string[] = [];
  cuts.forEach((cut) => {
    if (cut.character?.dialogue && cut.character.dialogue.trim()) {
      order.push(cut.character.name);
    }
  });
  return order;
}

// ============================================================================
// Prompt 构建函数
// ============================================================================

/**
 * 为单个 Cut 生成图像生成 Prompt
 */
export function buildCutImagePrompt(
  cut: ParsedCut,
  scene: ParsedScene,
  characters: ParsedCharacter[],
  style: StyleConfig,
  hasReferenceImages: boolean = false
): string {
  const parts: string[] = [];

  // 风格
  parts.push(`${style.artStyle} style`);
  if (style.colorPalette) {
    parts.push(style.colorPalette);
  }

  // 镜头类型
  parts.push(cut.cameraAngle.toLowerCase());

  // 视觉描述
  if (cut.visualDescription) {
    parts.push(cut.visualDescription);
  }

  // 如果有角色，添加角色描述
  if (cut.character) {
    if (hasReferenceImages) {
      // 有参考图时：只写角色名 + 情绪，外观由参考图决定，避免文字描述与参考图冲突
      parts.push(`${cut.character.name}`);
    } else {
      // 无参考图时：使用文字描述外观
      const char = characters.find(c => c.name === cut.character!.name);
      if (char) {
        parts.push(char.basePrompt);
      } else {
        parts.push(cut.character.look);
      }
    }

    // 添加情绪
    if (cut.character.emotion) {
      parts.push(`${cut.character.emotion} expression`);
    }

    // 如果有对白，添加口型提示
    if (cut.character.dialogue && cut.character.lipSyncAction) {
      parts.push("mouth slightly open, speaking");
    }
  }

  // 质量提示词
  parts.push("high quality, detailed, anime, masterpiece");

  return parts.filter(Boolean).join(", ");
}

/**
 * 为整个场景生成视频生成 Prompt（Zapiwala 格式）
 */
export function buildSceneVideoPrompt(
  scene: ParsedScene,
  characters: ParsedCharacter[],
  style: StyleConfig
): string {
  const lines: string[] = [];

  // 音频层
  lines.push(`🎵 BGM: ${scene.bgm}`);
  lines.push(`🔊 SFX: ${scene.sfx}`);
  lines.push(`⏱ Pacing: ${scene.pacing}`);
  lines.push("");

  // Multi-Cut
  scene.cuts.forEach((cut) => {
    if (cut.character?.dialogue) {
      // 有对白的 Cut
      const char = characters.find(c => c.name === cut.character!.name);
      const look = char?.inlineLook || cut.character.look;
      lines.push(
        `Cut ${cut.cutIndex + 1}: ${cut.character.name} (${look}; ${cut.character.emotion}): "${cut.character.dialogue}" (${cut.character.cameraFocus}; ${cut.character.lipSyncAction})`
      );
    } else if (cut.character) {
      // 有角色但无对白的 Cut
      const char = characters.find(c => c.name === cut.character!.name);
      const look = char?.inlineLook || cut.character.look;
      lines.push(
        `Cut ${cut.cutIndex + 1}: [${cut.cameraAngle}] ${cut.visualDescription} - ${cut.character.name} (${look}; ${cut.character.emotion})`
      );
    } else {
      // 纯环境的 Cut
      lines.push(`Cut ${cut.cutIndex + 1}: [${cut.cameraAngle}] ${cut.visualDescription}`);
    }
  });

  // 对话锁
  if (scene.dialogueOrderLock.length > 0) {
    lines.push("");
    lines.push(`Dialogue_order_lock=[${scene.dialogueOrderLock.join(", ")}]`);
  }

  return lines.join("\n");
}

/**
 * 为场景生成完整的图像生成 Prompt（兼容旧系统）
 * 使用第一个 Cut 作为预览图
 */
export function buildScenePrompt(
  scene: ParsedScene,
  characters: ParsedCharacter[],
  style: StyleConfig,
  hasReferenceImages: boolean = false
): string {
  // 如果有 cuts，使用第一个 cut 生成 prompt
  if (scene.cuts && scene.cuts.length > 0) {
    return buildCutImagePrompt(scene.cuts[0], scene, characters, style, hasReferenceImages);
  }

  // 兼容旧格式（无 cuts）
  const sceneCharacters = characters.filter((c) =>
    scene.characterIds.includes(c.id) || scene.characterIds.includes(c.name)
  );

  const characterPrompts = sceneCharacters
    .map((c) => c.basePrompt)
    .join(", ");

  const shotTypeMap: Record<string, string> = {
    close_up: "close-up shot, face focus",
    medium_shot: "medium shot, upper body",
    wide_shot: "wide shot, full body",
    extreme_wide: "extreme wide shot, landscape",
  };

  // 从第一个 cut 获取镜头类型
  const cameraAngle = scene.cuts?.[0]?.cameraAngle?.toLowerCase() || "medium shot";
  const shotType = shotTypeMap[cameraAngle] || cameraAngle;

  const parts = [
    `${style.artStyle} style`,
    style.colorPalette,
    characterPrompts,
    scene.cuts?.[0]?.visualDescription || scene.description,
    shotType,
    "high quality, detailed, anime",
  ].filter(Boolean);

  return parts.join(", ");
}

/**
 * 为单个 Cut 生成视频运镜 Prompt
 */
export function buildCutVideoPrompt(
  cut: ParsedCut,
  scene: ParsedScene,
  characters: ParsedCharacter[]
): string {
  const parts: string[] = [];

  // 镜头类型转运镜
  const cameraMovementMap: Record<string, string> = {
    "close-up": "Slow push in toward face, focus on expression",
    "extreme close-up": "Subtle micro movements, intimate detail",
    "medium shot": "Gentle breathing motion, conversational framing",
    "medium wide": "Slow horizontal track, following subject",
    "wide shot": "Slow pan across scene, establishing environment",
    "extreme wide": "Static or very slow zoom out, epic scale",
    "pov": "Handheld perspective, natural head movement",
    "over-the-shoulder": "Subtle rack focus between subjects",
    "dutch angle": "Slight rotation, building tension",
    "low angle": "Slow tilt up, conveying power",
    "high angle": "Slow descent, creating vulnerability",
    "tracking": "Smooth follow, maintaining distance",
    "dolly": "Dramatic push in or pull out",
    "pan": "Smooth horizontal sweep",
    "tilt": "Smooth vertical sweep",
    "crane": "Rising or descending with angle change",
  };

  const movement = cameraMovementMap[cut.cameraAngle.toLowerCase()] || "Static camera, subtle breathing motion";
  parts.push(movement);

  // 视觉描述
  parts.push(cut.visualDescription);

  // 角色动作
  if (cut.character) {
    const char = characters.find(c => c.name === cut.character!.name);
    if (char) {
      parts.push(`${char.inlineLook}, ${cut.character.emotion}`);
    }
    if (cut.character.dialogue) {
      parts.push("character speaking, natural lip movement");
    }
  }

  return parts.filter(Boolean).join(", ");
}
