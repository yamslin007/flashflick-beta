/**
 * 专业运镜语言体系
 * 用于 AI 剧本解析时作为参考，自动选择合适的镜头类型和运动方式
 * 来源: SUMAY AI 运动镜头大全
 */

// ============================================
// 1. 运动镜头 (Camera Movements)
// ============================================

export interface CameraMovement {
  id: string;
  name_cn: string;           // 中文名称
  name_en: string;           // 英文名称 (用于 AI 视频生成)
  category: string;          // 分类
  description_cn: string;    // 中文效果描述
  description_en: string;    // 英文效果描述 (用于 prompt)
  use_cases: string[];       // 适用场景
}

export const CAMERA_MOVEMENTS: CameraMovement[] = [
  // ---- 推拉运镜 (Push/Pull) ----
  {
    id: "slow_push_in",
    name_cn: "缓慢推入镜头",
    name_en: "Slow Push In",
    category: "push_pull",
    description_cn: "从全景缓缓推向角色面部，聚焦眼神变化",
    description_en: "Camera slowly pushes in from wide shot to close-up on face, focusing on eyes and expression",
    use_cases: ["情感特写", "重要对话", "内心独白"],
  },
  {
    id: "fast_pull_out",
    name_cn: "快速拉出镜头",
    name_en: "Fast Pull Out / Zoom Out",
    category: "push_pull",
    description_cn: "从特写急速拉远，展现环境与人物关系",
    description_en: "Camera rapidly pulls back from close-up to reveal environment and character's relationship to surroundings",
    use_cases: ["揭示场景", "孤独感", "震撼时刻"],
  },
  {
    id: "micro_dolly",
    name_cn: "微距缓推镜头",
    name_en: "Micro Dolly / Subtle Push",
    category: "push_pull",
    description_cn: "极端缓慢推向关键细节",
    description_en: "Extremely slow, subtle dolly movement toward key detail",
    use_cases: ["细节特写", "悬疑暗示", "情感积累"],
  },
  {
    id: "reveal_pullback",
    name_cn: "后退揭示镜头",
    name_en: "Reveal Pullback",
    category: "push_pull",
    description_cn: "后退同时展示更大场景",
    description_en: "Camera pulls back to reveal larger scene or unexpected elements",
    use_cases: ["场景揭示", "惊喜时刻", "规模展示"],
  },
  {
    id: "intimate_push",
    name_cn: "推进亲密镜头",
    name_en: "Intimate Push In",
    category: "push_pull",
    description_cn: "向角色推进，表现情感拉近",
    description_en: "Camera pushes closer to character, creating emotional intimacy",
    use_cases: ["浪漫时刻", "亲密对话", "情感连接"],
  },
  {
    id: "distance_pullback",
    name_cn: "后退疏远镜头",
    name_en: "Distancing Pullback",
    category: "push_pull",
    description_cn: "从角色后退，表现关系疏离",
    description_en: "Camera retreats from character, conveying emotional distance or isolation",
    use_cases: ["分离", "孤独", "关系破裂"],
  },

  // ---- 运动轨迹 (Movement Trajectory) ----
  {
    id: "horizontal_track",
    name_cn: "横摇跟随镜头",
    name_en: "Horizontal Tracking Shot",
    category: "trajectory",
    description_cn: "水平跟随角色行走，保持等距",
    description_en: "Camera tracks horizontally alongside character, maintaining consistent distance",
    use_cases: ["行走", "对话", "并行移动"],
  },
  {
    id: "vertical_crane",
    name_cn: "垂直升降镜头",
    name_en: "Vertical Crane Shot",
    category: "trajectory",
    description_cn: "从地面仰拍升起，展现人物与天空关系",
    description_en: "Camera rises vertically from ground level, revealing character against sky",
    use_cases: ["英雄时刻", "希望", "超越"],
  },
  {
    id: "diagonal_move",
    name_cn: "对角线移动镜头",
    name_en: "Diagonal Movement",
    category: "trajectory",
    description_cn: "沿斜线推进，制造动态张力",
    description_en: "Camera moves diagonally, creating dynamic tension and energy",
    use_cases: ["动作场景", "紧张感", "不稳定"],
  },
  {
    id: "arc_orbit",
    name_cn: "弧形绕摄镜头",
    name_en: "Arc / Orbit Shot",
    category: "trajectory",
    description_cn: "围绕主体做半圆运动，展示立体感",
    description_en: "Camera arcs around subject in semi-circle, showing three-dimensionality",
    use_cases: ["角色展示", "重要时刻", "戏剧性"],
  },
  {
    id: "parabolic_move",
    name_cn: "抛物线运动镜头",
    name_en: "Parabolic Movement",
    category: "trajectory",
    description_cn: "沿弧形轨迹移动",
    description_en: "Camera follows parabolic arc trajectory",
    use_cases: ["跳跃", "投掷", "飞行物"],
  },
  {
    id: "z_axis_dolly",
    name_cn: "Z轴纵深镜头",
    name_en: "Z-Axis Dolly / Depth Movement",
    category: "trajectory",
    description_cn: "沿深度方向运动",
    description_en: "Camera moves along Z-axis into or out of the scene depth",
    use_cases: ["穿越空间", "进入场景", "纵深感"],
  },

  // ---- 特殊运动 (Special Movement) ----
  {
    id: "handheld",
    name_cn: "手持灵动镜头",
    name_en: "Handheld Camera",
    category: "special",
    description_cn: "模拟呼吸感，增加现场真实度",
    description_en: "Handheld camera with natural breathing motion, adding realism and immediacy",
    use_cases: ["纪实感", "紧张", "真实"],
  },
  {
    id: "dolly_track",
    name_cn: "轨道平移镜头",
    name_en: "Dolly Track Shot",
    category: "special",
    description_cn: "平稳左右移动，展现群体互动",
    description_en: "Smooth lateral dolly movement, revealing group interactions",
    use_cases: ["群像", "场景展示", "平移揭示"],
  },
  {
    id: "360_rotate",
    name_cn: "旋转镜头",
    name_en: "360 Rotation / Spinning Shot",
    category: "special",
    description_cn: "以主体为中心360度旋转",
    description_en: "Camera rotates 360 degrees around subject as center point",
    use_cases: ["英雄时刻", "变身", "高潮"],
  },
  {
    id: "dive_down",
    name_cn: "俯冲下降镜头",
    name_en: "Dive Down / Descending Shot",
    category: "special",
    description_cn: "从高空急速下降至地面",
    description_en: "Camera rapidly descends from aerial view to ground level",
    use_cases: ["坠落", "俯冲", "冲击"],
  },
  {
    id: "rise_up",
    name_cn: "爬升仰视镜头",
    name_en: "Rising Shot / Ascending",
    category: "special",
    description_cn: "从低处急速上升至俯角",
    description_en: "Camera rapidly rises from low angle to high overhead view",
    use_cases: ["崛起", "力量", "超越"],
  },
  {
    id: "through_movement",
    name_cn: "穿梭运动镜头",
    name_en: "Through Movement / Passing Shot",
    category: "special",
    description_cn: "在物体间曲折穿行",
    description_en: "Camera weaves and passes through objects and obstacles",
    use_cases: ["追逐", "探索", "沉浸"],
  },

  // ---- 速度控制 (Speed Control) ----
  {
    id: "accelerate",
    name_cn: "渐进加速镜头",
    name_en: "Accelerating Movement",
    category: "speed",
    description_cn: "运动速度逐渐加快",
    description_en: "Camera movement gradually accelerates",
    use_cases: ["紧张升级", "追逐加剧", "高潮临近"],
  },
  {
    id: "decelerate",
    name_cn: "减速渐满镜头",
    name_en: "Decelerating Movement",
    category: "speed",
    description_cn: "运动逐渐变慢至停止",
    description_en: "Camera movement gradually slows to a stop",
    use_cases: ["结束", "平静", "思考"],
  },
  {
    id: "freeze_stop",
    name_cn: "急停定帧镜头",
    name_en: "Sudden Stop / Freeze",
    category: "speed",
    description_cn: "快速运动后突然静止",
    description_en: "Rapid movement followed by sudden freeze",
    use_cases: ["震惊", "定格", "强调"],
  },
  {
    id: "spin_dive",
    name_cn: "旋转俯冲镜头",
    name_en: "Spinning Dive",
    category: "speed",
    description_cn: "旋转同时向下俯冲",
    description_en: "Camera spins while diving downward simultaneously",
    use_cases: ["混乱", "坠落", "失控"],
  },

  // ---- 转场技巧 (Transition Techniques) ----
  {
    id: "whip_pan",
    name_cn: "甩镜转场镜头",
    name_en: "Whip Pan Transition",
    category: "transition",
    description_cn: "快速甩动切换场景",
    description_en: "Fast whip pan motion to transition between scenes",
    use_cases: ["快速转场", "时间跳跃", "平行叙事"],
  },
  {
    id: "obstacle_wipe",
    name_cn: "遮挡转场镜头",
    name_en: "Obstacle Wipe Transition",
    category: "transition",
    description_cn: "前景物体遮挡切换画面",
    description_en: "Foreground object passes camera to wipe transition",
    use_cases: ["自然转场", "场景切换", "时间流逝"],
  },
  {
    id: "match_cut",
    name_cn: "匹配剪辑镜头",
    name_en: "Match Cut",
    category: "transition",
    description_cn: "相似动作连接不同场景",
    description_en: "Similar action or shape connects different scenes seamlessly",
    use_cases: ["关联场景", "对比", "叙事连接"],
  },
  {
    id: "pov_shot",
    name_cn: "主观视角镜头",
    name_en: "POV Shot (Point of View)",
    category: "transition",
    description_cn: "第一人称运动视角",
    description_en: "First-person perspective showing what character sees",
    use_cases: ["代入感", "追逐", "探索"],
  },
  {
    id: "dutch_angle",
    name_cn: "倾斜构图镜头",
    name_en: "Dutch Angle / Tilted Shot",
    category: "composition",
    description_cn: "荷兰角制造不安感",
    description_en: "Tilted camera angle creating unease and tension",
    use_cases: ["不安", "混乱", "心理扭曲"],
  },

  // ---- 构图变化 (Composition Changes) ----
  {
    id: "split_screen",
    name_cn: "分屏对比镜头",
    name_en: "Split Screen",
    category: "composition",
    description_cn: "左右展示不同时空",
    description_en: "Screen divided to show different times, places, or perspectives",
    use_cases: ["对比", "平行叙事", "同时发生"],
  },
  {
    id: "picture_in_picture",
    name_cn: "画中画镜头",
    name_en: "Picture in Picture",
    category: "composition",
    description_cn: "小窗口叠加主画面",
    description_en: "Small window overlaid on main frame",
    use_cases: ["回忆", "监控", "多视角"],
  },
  {
    id: "breathing_zoom",
    name_cn: "镜头呼吸效果",
    name_en: "Breathing Zoom / Subtle Zoom",
    category: "composition",
    description_cn: "轻微变焦模拟呼吸节奏",
    description_en: "Subtle zoom in/out mimicking breathing rhythm",
    use_cases: ["紧张", "等待", "情绪波动"],
  },
];

// ============================================
// 2. 情感表达镜头 (Emotional Expression Shots)
// ============================================

export interface EmotionalShot {
  id: string;
  name_cn: string;
  name_en: string;
  category: string;
  description_cn: string;
  description_en: string;
  emotion_tags: string[];    // 适用情绪
}

export const EMOTIONAL_SHOTS: EmotionalShot[] = [
  // ---- 微观情绪 (Micro Emotions) ----
  {
    id: "trembling_closeup",
    name_cn: "颤抖特写镜头",
    name_en: "Trembling Close-up",
    category: "micro_emotion",
    description_cn: "手部/嘴唇颤抖的极致特写",
    description_en: "Extreme close-up on trembling hands or lips",
    emotion_tags: ["恐惧", "紧张", "激动"],
  },
  {
    id: "pupil_zoom",
    name_cn: "瞳孔放大镜头",
    name_en: "Pupil Dilation Shot",
    category: "micro_emotion",
    description_cn: "极端特写瞳孔变化过程",
    description_en: "Extreme close-up capturing pupil dilation",
    emotion_tags: ["惊讶", "恐惧", "爱慕"],
  },
  {
    id: "tear_tracking",
    name_cn: "眼泪滑落镜头",
    name_en: "Tear Tracking Shot",
    category: "micro_emotion",
    description_cn: "跟随泪滴运动轨迹",
    description_en: "Camera follows the path of a falling tear",
    emotion_tags: ["悲伤", "感动", "释放"],
  },
  {
    id: "long_gaze",
    name_cn: "凝视长镜头",
    name_en: "Long Gaze Shot",
    category: "micro_emotion",
    description_cn: "长时间静止凝视表达复杂情绪",
    description_en: "Extended static shot of character's gaze, expressing complex emotions",
    emotion_tags: ["思念", "复杂情感", "内心戏"],
  },
  {
    id: "breath_follow",
    name_cn: "喘息跟拍镜头",
    name_en: "Breathing Follow Shot",
    category: "micro_emotion",
    description_cn: "跟随急促呼吸起伏运动",
    description_en: "Camera follows heavy breathing chest movements",
    emotion_tags: ["紧张", "疲惫", "恐惧"],
  },

  // ---- 心理状态 (Psychological States) ----
  {
    id: "vertigo_spin",
    name_cn: "旋转晕眩镜头",
    name_en: "Vertigo Spin",
    category: "psychological",
    description_cn: "旋转镜头表现心理混乱",
    description_en: "Spinning camera conveys psychological confusion and disorientation",
    emotion_tags: ["混乱", "晕眩", "失控"],
  },
  {
    id: "blur_to_clear",
    name_cn: "模糊转清镜头",
    name_en: "Blur to Clear / Focus Pull",
    category: "psychological",
    description_cn: "虚焦逐渐变清晰，象征认知清晰",
    description_en: "Out of focus gradually becomes sharp, symbolizing clarity of understanding",
    emotion_tags: ["觉醒", "理解", "清醒"],
  },
  {
    id: "clear_to_blur",
    name_cn: "清转变糊镜头",
    name_en: "Clear to Blur / Defocus",
    category: "psychological",
    description_cn: "清晰逐渐失焦，表现意识模糊",
    description_en: "Sharp image gradually loses focus, representing fading consciousness",
    emotion_tags: ["迷茫", "失去意识", "回忆"],
  },
  {
    id: "tilted_unbalance",
    name_cn: "倾斜失衡镜头",
    name_en: "Tilted Unbalance Shot",
    category: "psychological",
    description_cn: "倾斜构图表现心理失衡",
    description_en: "Tilted framing conveys psychological imbalance",
    emotion_tags: ["不安", "失衡", "疯狂"],
  },
  {
    id: "dodge_shake",
    name_cn: "躲避晃动镜头",
    name_en: "Dodge and Shake",
    category: "psychological",
    description_cn: "模拟躲避时的晃动感",
    description_en: "Camera shakes simulating evasive movement",
    emotion_tags: ["恐惧", "躲避", "危险"],
  },

  // ---- 关系动态 (Relationship Dynamics) ----
  {
    id: "embrace_orbit",
    name_cn: "拥抱环绕镜头",
    name_en: "Embrace Orbit Shot",
    category: "relationship",
    description_cn: "环绕拥抱的两人，表达亲密",
    description_en: "Camera orbits around embracing couple, expressing intimacy",
    emotion_tags: ["爱情", "亲密", "团聚"],
  },
  {
    id: "argument_jumpcut",
    name_cn: "争吵跳切镜头",
    name_en: "Argument Jump Cut",
    category: "relationship",
    description_cn: "快速正反打切换，增强冲突感",
    description_en: "Rapid shot-reverse-shot cutting intensifies conflict",
    emotion_tags: ["争吵", "冲突", "对抗"],
  },
  {
    id: "lonely_wide",
    name_cn: "孤独广角镜头",
    name_en: "Lonely Wide Shot",
    category: "relationship",
    description_cn: "广角中渺小身影，突显孤独",
    description_en: "Small figure in wide angle shot emphasizing loneliness",
    emotion_tags: ["孤独", "渺小", "失落"],
  },
  {
    id: "oppressive_high",
    name_cn: "压迫俯拍镜头",
    name_en: "Oppressive High Angle",
    category: "relationship",
    description_cn: "俯视角度制造压迫感",
    description_en: "High angle looking down creates sense of oppression",
    emotion_tags: ["压迫", "弱小", "被控制"],
  },
  {
    id: "powerless_low",
    name_cn: "无力仰角镜头",
    name_en: "Powerless Low Angle",
    category: "relationship",
    description_cn: "仰拍角色表现无助",
    description_en: "Low angle on character conveying helplessness",
    emotion_tags: ["无助", "仰望", "渴望"],
  },

  // ---- 记忆与时间 (Memory & Time) ----
  {
    id: "memory_dissolve",
    name_cn: "回忆叠化镜头",
    name_en: "Memory Dissolve",
    category: "memory",
    description_cn: "现实与回忆画面叠加转换",
    description_en: "Present and memory images dissolve and overlap",
    emotion_tags: ["回忆", "怀念", "过去"],
  },
  {
    id: "fragment_cut",
    name_cn: "碎片剪辑镜头",
    name_en: "Fragmented Montage",
    category: "memory",
    description_cn: "记忆碎片式跳切组合",
    description_en: "Memory fragments assembled through jump cuts",
    emotion_tags: ["回忆", "创伤", "混乱记忆"],
  },
  {
    id: "long_take_oppression",
    name_cn: "长镜压抑镜头",
    name_en: "Oppressive Long Take",
    category: "memory",
    description_cn: "超长镜头制造压抑氛围",
    description_en: "Extended single take creates oppressive atmosphere",
    emotion_tags: ["压抑", "窒息", "等待"],
  },

  // ---- 群体情绪 (Group Emotions) ----
  {
    id: "rapid_group_zoom",
    name_cn: "快速变焦群镜头",
    name_en: "Rapid Group Zoom",
    category: "group",
    description_cn: "多人之间快速变焦切换",
    description_en: "Rapid zoom shifts between multiple people",
    emotion_tags: ["群体", "混乱", "紧张"],
  },
  {
    id: "group_orbit",
    name_cn: "集体环绕镜头",
    name_en: "Group Orbit Shot",
    category: "group",
    description_cn: "围绕群体做环形运动展示互动",
    description_en: "Camera orbits around group showing their interactions",
    emotion_tags: ["团队", "团结", "庆祝"],
  },
];

// ============================================
// 3. 动作场景镜头 (Action Scene Shots)
// ============================================

export interface ActionShot {
  id: string;
  name_cn: string;
  name_en: string;
  category: string;
  description_cn: string;
  description_en: string;
  action_types: string[];    // 适用动作类型
}

export const ACTION_SHOTS: ActionShot[] = [
  // ---- 隐秘行动 (Stealth) ----
  {
    id: "stealth_micro",
    name_cn: "潜行微动镜头",
    name_en: "Stealth Micro Movement",
    category: "stealth",
    description_cn: "极缓慢移动镜头配合潜行",
    description_en: "Extremely slow camera movement matching stealth action",
    action_types: ["潜行", "偷袭", "隐藏"],
  },
  {
    id: "sniper_pov",
    name_cn: "狙击视角镜头",
    name_en: "Sniper POV",
    category: "stealth",
    description_cn: "瞄准镜主观视角",
    description_en: "Through-scope point of view shot",
    action_types: ["狙击", "瞄准", "伏击"],
  },

  // ---- 追逐移动 (Chase) ----
  {
    id: "car_chase",
    name_cn: "汽车追逐镜头",
    name_en: "Car Chase Shot",
    category: "chase",
    description_cn: "车载镜头晃动增强真实感",
    description_en: "In-car camera with shake for realism",
    action_types: ["追车", "逃跑", "飙车"],
  },
  {
    id: "rooftop_parkour",
    name_cn: "屋顶跑酷镜头",
    name_en: "Rooftop Parkour Shot",
    category: "chase",
    description_cn: "俯拍+跟随组合镜头",
    description_en: "Overhead and following combined shot",
    action_types: ["跑酷", "屋顶追逐", "跳跃"],
  },
  {
    id: "sprint_chase",
    name_cn: "冲刺追逐镜头",
    name_en: "Sprint Chase Shot",
    category: "chase",
    description_cn: "并列跟随追逐双方",
    description_en: "Parallel tracking of both pursuer and pursued",
    action_types: ["奔跑", "追逐", "逃跑"],
  },

  // ---- 打斗对抗 (Combat) ----
  {
    id: "climb_low_angle",
    name_cn: "攀爬仰拍镜头",
    name_en: "Climbing Low Angle",
    category: "combat",
    description_cn: "仰拍攀爬动作",
    description_en: "Low angle capturing climbing action",
    action_types: ["攀爬", "上升", "挣扎"],
  },
  {
    id: "fight_follow",
    name_cn: "打斗跟随镜头",
    name_en: "Fight Following Shot",
    category: "combat",
    description_cn: "贴身跟随打斗动作",
    description_en: "Close following of fight choreography",
    action_types: ["近战", "格斗", "打斗"],
  },
  {
    id: "kick_dive",
    name_cn: "飞踢俯冲镜头",
    name_en: "Flying Kick Dive Shot",
    category: "combat",
    description_cn: "跟随踢击俯冲动作",
    description_en: "Camera dives following flying kick",
    action_types: ["飞踢", "跳跃攻击", "俯冲"],
  },
  {
    id: "dodge_roll",
    name_cn: "躲避翻滚镜头",
    name_en: "Dodge Roll Shot",
    category: "combat",
    description_cn: "低角度拍翻滚动作",
    description_en: "Low angle capturing rolling dodge",
    action_types: ["翻滚", "躲避", "闪避"],
  },
  {
    id: "sword_slash",
    name_cn: "剑光划过镜头",
    name_en: "Sword Slash Tracking",
    category: "combat",
    description_cn: "跟随刀剑运动轨迹",
    description_en: "Camera follows sword swing trajectory",
    action_types: ["剑术", "刀剑", "斩击"],
  },
  {
    id: "block_impact",
    name_cn: "格挡震动镜头",
    name_en: "Block Impact Shot",
    category: "combat",
    description_cn: "格挡撞击时镜头震动",
    description_en: "Camera shakes on blocking impact",
    action_types: ["格挡", "防御", "冲击"],
  },
  {
    id: "spin_attack",
    name_cn: "旋转攻击镜头",
    name_en: "Spinning Attack Shot",
    category: "combat",
    description_cn: "旋转攻击时同步旋转拍摄",
    description_en: "Camera rotates in sync with spinning attack",
    action_types: ["旋转攻击", "回旋", "横扫"],
  },
  {
    id: "combo_sync",
    name_cn: "合击同步镜头",
    name_en: "Combo Sync Shot",
    category: "combat",
    description_cn: "双人动作同步拍摄",
    description_en: "Synchronized capture of coordinated attack",
    action_types: ["合击", "配合", "双人"],
  },

  // ---- 特殊动作 (Special Actions) ----
  {
    id: "obstacle_vault",
    name_cn: "翻越障碍镜头",
    name_en: "Obstacle Vault Shot",
    category: "special_action",
    description_cn: "同步角色翻越动作",
    description_en: "Camera syncs with vaulting over obstacle",
    action_types: ["翻越", "跨越", "障碍"],
  },
  {
    id: "door_breach",
    name_cn: "破门而入镜头",
    name_en: "Door Breach Shot",
    category: "special_action",
    description_cn: "跟随破门动作推进",
    description_en: "Camera follows door breach action",
    action_types: ["破门", "突入", "冲击"],
  },
  {
    id: "injury_follow",
    name_cn: "受伤跟跑镜头",
    name_en: "Injured Follow Shot",
    category: "special_action",
    description_cn: "晃动跟拍受伤动作",
    description_en: "Shaky following of injured character movement",
    action_types: ["受伤", "蹒跚", "挣扎"],
  },
  {
    id: "jump_slow_rise",
    name_cn: "跳跃慢升镜头",
    name_en: "Jump Slow Rise",
    category: "special_action",
    description_cn: "跳跃时镜头同步上升",
    description_en: "Camera rises in slow motion with jump",
    action_types: ["跳跃", "腾空", "上升"],
  },

  // ---- 特效动作 (VFX Actions) ----
  {
    id: "magic_release",
    name_cn: "魔法释放镜头",
    name_en: "Magic Release Shot",
    category: "vfx",
    description_cn: "从手部特写推向魔法效果",
    description_en: "Push from hand close-up to magical effect",
    action_types: ["魔法", "能量释放", "施法"],
  },
  {
    id: "transform_orbit",
    name_cn: "变身环绕镜头",
    name_en: "Transformation Orbit",
    category: "vfx",
    description_cn: "环绕拍摄变身过程",
    description_en: "Orbiting camera captures transformation",
    action_types: ["变身", "觉醒", "进化"],
  },
  {
    id: "bullet_time",
    name_cn: "子弹时间镜头",
    name_en: "Bullet Time",
    category: "vfx",
    description_cn: "环绕冻结动作的经典手法",
    description_en: "Classic technique orbiting frozen action",
    action_types: ["时间静止", "闪避", "高潮"],
  },
];

// ============================================
// 4. 创意特效镜头 (Creative VFX Shots)
// ============================================

export interface CreativeShot {
  id: string;
  name_cn: string;
  name_en: string;
  category: string;
  description_cn: string;
  description_en: string;
  effect_type: string;       // 特效类型
}

export const CREATIVE_SHOTS: CreativeShot[] = [
  // ---- 视角变形 (Perspective Distortion) ----
  {
    id: "fisheye",
    name_cn: "鱼眼扭曲镜头",
    name_en: "Fisheye Distortion",
    category: "perspective",
    description_cn: "鱼眼镜头变形效果",
    description_en: "Fisheye lens distortion effect",
    effect_type: "lens",
  },
  {
    id: "miniature",
    name_cn: "微缩景观镜头",
    name_en: "Tilt-Shift Miniature",
    category: "perspective",
    description_cn: "微距透视创造小人国效果",
    description_en: "Tilt-shift effect creating miniature world illusion",
    effect_type: "lens",
  },
  {
    id: "xray_vision",
    name_cn: "X光透视镜头",
    name_en: "X-Ray Vision",
    category: "perspective",
    description_cn: "透视内部结构",
    description_en: "See-through revealing internal structure",
    effect_type: "vfx",
  },
  {
    id: "pass_through",
    name_cn: "穿透视角镜头",
    name_en: "Pass Through Shot",
    category: "perspective",
    description_cn: "穿透物体直接拍摄内部",
    description_en: "Camera passes through objects to show interior",
    effect_type: "vfx",
  },
  {
    id: "thermal",
    name_cn: "热成像镜头",
    name_en: "Thermal Vision",
    category: "perspective",
    description_cn: "热辐射视觉特效",
    description_en: "Thermal radiation visual effect",
    effect_type: "filter",
  },

  // ---- 时间操控 (Time Manipulation) ----
  {
    id: "time_reverse",
    name_cn: "时间倒流镜头",
    name_en: "Time Reverse",
    category: "time",
    description_cn: "反向运动特效",
    description_en: "Reverse motion effect",
    effect_type: "time",
  },
  {
    id: "clone_trail",
    name_cn: "分身残影镜头",
    name_en: "Clone Trail / Motion Ghost",
    category: "time",
    description_cn: "多个残影跟随主体",
    description_en: "Multiple ghost images trailing subject",
    effect_type: "time",
  },
  {
    id: "time_freeze_orbit",
    name_cn: "时停环绕镜头",
    name_en: "Time Freeze Orbit",
    category: "time",
    description_cn: "时间静止时环绕拍摄",
    description_en: "Orbiting camera while time is frozen",
    effect_type: "time",
  },

  // ---- 介质转换 (Medium Transition) ----
  {
    id: "kaleidoscope",
    name_cn: "万花筒镜头",
    name_en: "Kaleidoscope Effect",
    category: "medium",
    description_cn: "对称重复画面效果",
    description_en: "Symmetrical repeating pattern effect",
    effect_type: "filter",
  },
  {
    id: "ink_wash",
    name_cn: "水墨晕染镜头",
    name_en: "Ink Wash Transition",
    category: "medium",
    description_cn: "国画晕染风格转场",
    description_en: "Chinese ink wash painting style transition",
    effect_type: "style",
  },
  {
    id: "old_film",
    name_cn: "老胶片镜头",
    name_en: "Old Film Effect",
    category: "medium",
    description_cn: "模拟胶片抖动划痕",
    description_en: "Simulated film grain, scratches and flicker",
    effect_type: "filter",
  },
  {
    id: "glitch",
    name_cn: "故障艺术镜头",
    name_en: "Glitch Effect",
    category: "medium",
    description_cn: "数字故障扭曲效果",
    description_en: "Digital glitch distortion effect",
    effect_type: "vfx",
  },
  {
    id: "datamosh",
    name_cn: "数据化镜头",
    name_en: "Datamosh / Pixel Sort",
    category: "medium",
    description_cn: "像素化转换视角",
    description_en: "Pixelation and data corruption effect",
    effect_type: "vfx",
  },

  // ---- 反射光影 (Reflection & Light) ----
  {
    id: "mirror_reflection",
    name_cn: "镜面反射镜头",
    name_en: "Mirror Reflection Shot",
    category: "reflection",
    description_cn: "通过镜子反射拍摄",
    description_en: "Shooting through mirror reflection",
    effect_type: "composition",
  },
  {
    id: "water_reflection",
    name_cn: "水面倒影镜头",
    name_en: "Water Reflection Shot",
    category: "reflection",
    description_cn: "以倒影为主视角",
    description_en: "Water reflection as primary perspective",
    effect_type: "composition",
  },
  {
    id: "light_beam_pass",
    name_cn: "光影穿梭镜头",
    name_en: "Light Beam Pass",
    category: "reflection",
    description_cn: "在光柱间穿行效果",
    description_en: "Passing through beams of light",
    effect_type: "lighting",
  },
  {
    id: "starfield_rotate",
    name_cn: "星空旋转镜头",
    name_en: "Starfield Rotation",
    category: "reflection",
    description_cn: "以星空为背景旋转",
    description_en: "Rotating with starfield background",
    effect_type: "background",
  },
  {
    id: "particle_dissolve",
    name_cn: "粒子消散镜头",
    name_en: "Particle Dissolve",
    category: "reflection",
    description_cn: "随粒子消散拉远",
    description_en: "Camera pulls back as subject dissolves into particles",
    effect_type: "vfx",
  },

  // ---- 空间扭曲 (Space Distortion) ----
  {
    id: "tunnel_pass",
    name_cn: "隧道穿越镜头",
    name_en: "Tunnel Pass",
    category: "space",
    description_cn: "穿越光隧道特效",
    description_en: "Passing through light tunnel effect",
    effect_type: "vfx",
  },
  {
    id: "dimension_fold",
    name_cn: "维度折叠镜头",
    name_en: "Dimension Fold / Inception Effect",
    category: "space",
    description_cn: "空间折叠视觉效果",
    description_en: "Space folding visual effect like Inception",
    effect_type: "vfx",
  },
];

// ============================================
// 5. 情绪-场景-镜头匹配指南
// ============================================

export interface EmotionSceneGuide {
  emotion: string;           // 目标情绪
  scene_type: string;        // 推荐场景
  camera_combo: string[];    // 核心镜头组合 (ID)
  pacing: string;            // 节奏控制
  duration_suggestion: string; // 时长建议
}

export const EMOTION_SCENE_GUIDES: EmotionSceneGuide[] = [
  {
    emotion: "浪漫时刻",
    scene_type: "告白/重逢",
    camera_combo: ["slow_push_in", "breathing_zoom", "micro_dolly"],
    pacing: "慢速缓推",
    duration_suggestion: "3-5秒/镜",
  },
  {
    emotion: "激烈争吵",
    scene_type: "冲突/对决",
    camera_combo: ["rapid_group_zoom", "dutch_angle", "argument_jumpcut"],
    pacing: "极快速",
    duration_suggestion: "0.5-1秒/镜",
  },
  {
    emotion: "紧张潜行",
    scene_type: "跟踪/暗杀",
    camera_combo: ["stealth_micro", "pov_shot", "handheld"],
    pacing: "慢→快",
    duration_suggestion: "2-4秒/镜",
  },
  {
    emotion: "英雄登场",
    scene_type: "救场/觉醒",
    camera_combo: ["rise_up", "360_rotate", "vertical_crane"],
    pacing: "中→急速",
    duration_suggestion: "1-3秒/镜",
  },
  {
    emotion: "悲伤失落",
    scene_type: "离别/失败",
    camera_combo: ["distance_pullback", "lonely_wide", "tear_tracking"],
    pacing: "缓慢",
    duration_suggestion: "4-6秒/镜",
  },
  {
    emotion: "记忆闪回",
    scene_type: "回忆/穿越",
    camera_combo: ["blur_to_clear", "fragment_cut", "old_film"],
    pacing: "不规则",
    duration_suggestion: "1-2秒/镜",
  },
  {
    emotion: "史诗战斗",
    scene_type: "团战/BOSS战",
    camera_combo: ["bullet_time", "dive_down", "sword_slash"],
    pacing: "多变",
    duration_suggestion: "0.5-4秒/镜",
  },
];

// ============================================
// 6. 魔法公式组合库
// ============================================

export interface MagicFormula {
  name: string;              // 公式名称
  scene_type: string;        // 适用场景
  shot_sequence: string[];   // 镜头序列 (ID)
  technique_notes: string;   // 技术要点
}

export const MAGIC_FORMULAS: MagicFormula[] = [
  {
    name: "震撼开场",
    scene_type: "剧情转折/世界观展开",
    shot_sequence: ["dive_down", "fast_pull_out", "vertigo_spin"],
    technique_notes: "三级变速：制造压迫→释放→混乱感",
  },
  {
    name: "内心挣扎",
    scene_type: "道德抉择/情感冲突",
    shot_sequence: ["trembling_closeup", "tilted_unbalance", "pupil_zoom"],
    technique_notes: "从外到内，层层深入心理，时间空间",
  },
  {
    name: "超凡时刻",
    scene_type: "超能力/关键突破",
    shot_sequence: ["bullet_time", "clone_trail", "particle_dissolve"],
    technique_notes: "双重扭曲，营造神圣感",
  },
  {
    name: "温情收尾",
    scene_type: "和解/情感升华",
    shot_sequence: ["embrace_orbit", "slow_push_in", "light_beam_pass"],
    technique_notes: "由动转静，温暖收束",
  },
];

// ============================================
// 7. 三级变速法则
// ============================================

export interface SpeedRule {
  phase: string;             // 阶段
  speed_ratio: string;       // 速度倍率
  emotional_function: string; // 情绪功能
  position: string;          // 适用位置
}

export const SPEED_RULES: SpeedRule[] = [
  {
    phase: "建立阶段",
    speed_ratio: "1x",
    emotional_function: "铺垫情绪，建立场景",
    position: "开场/过渡",
  },
  {
    phase: "发展阶段",
    speed_ratio: "1.5x",
    emotional_function: "加速推进，积累张力",
    position: "中段/高潮前",
  },
  {
    phase: "释放阶段",
    speed_ratio: "3x",
    emotional_function: "情绪爆发，视觉冲击",
    position: "高潮/结尾",
  },
];

// ============================================
// 辅助函数: 根据情绪/场景推荐镜头
// ============================================

/**
 * 根据情绪标签获取推荐的情感镜头
 */
export function getEmotionalShotsByEmotion(emotion: string): EmotionalShot[] {
  return EMOTIONAL_SHOTS.filter(shot =>
    shot.emotion_tags.some(tag => tag.includes(emotion) || emotion.includes(tag))
  );
}

/**
 * 根据动作类型获取推荐的动作镜头
 */
export function getActionShotsByType(actionType: string): ActionShot[] {
  return ACTION_SHOTS.filter(shot =>
    shot.action_types.some(type => type.includes(actionType) || actionType.includes(type))
  );
}

/**
 * 根据场景情绪获取完整的镜头组合建议
 */
export function getSceneGuideByEmotion(emotion: string): EmotionSceneGuide | undefined {
  return EMOTION_SCENE_GUIDES.find(guide =>
    guide.emotion.includes(emotion) || emotion.includes(guide.emotion)
  );
}

/**
 * 根据 ID 获取镜头详情
 */
export function getCameraMovementById(id: string): CameraMovement | undefined {
  return CAMERA_MOVEMENTS.find(m => m.id === id);
}

/**
 * 生成用于 AI Prompt 的运镜参考文档
 */
export function generateCameraMovementPromptReference(): string {
  let prompt = `## 专业运镜语言参考

### 运动镜头类型
`;

  // 按分类分组
  const categories = [...new Set(CAMERA_MOVEMENTS.map(m => m.category))];
  for (const category of categories) {
    const movements = CAMERA_MOVEMENTS.filter(m => m.category === category);
    prompt += `\n**${category}**:\n`;
    for (const m of movements) {
      prompt += `- ${m.name_en}: ${m.description_en}\n`;
    }
  }

  prompt += `\n### 情感表达镜头\n`;
  const emotionCategories = [...new Set(EMOTIONAL_SHOTS.map(s => s.category))];
  for (const category of emotionCategories) {
    const shots = EMOTIONAL_SHOTS.filter(s => s.category === category);
    prompt += `\n**${category}**:\n`;
    for (const s of shots) {
      prompt += `- ${s.name_en}: ${s.description_en} (适用: ${s.emotion_tags.join(", ")})\n`;
    }
  }

  prompt += `\n### 动作场景镜头\n`;
  const actionCategories = [...new Set(ACTION_SHOTS.map(s => s.category))];
  for (const category of actionCategories) {
    const shots = ACTION_SHOTS.filter(s => s.category === category);
    prompt += `\n**${category}**:\n`;
    for (const s of shots) {
      prompt += `- ${s.name_en}: ${s.description_en}\n`;
    }
  }

  prompt += `\n### 情绪-镜头匹配建议\n`;
  for (const guide of EMOTION_SCENE_GUIDES) {
    const cameraNames = guide.camera_combo.map(id => {
      const m = getCameraMovementById(id);
      return m?.name_en || id;
    });
    prompt += `- ${guide.emotion} (${guide.scene_type}): ${cameraNames.join(" → ")} | 节奏: ${guide.pacing} | 时长: ${guide.duration_suggestion}\n`;
  }

  return prompt;
}

// ============================================
// 8. 扩展运镜词典（来自镜头提示词词典）
// ============================================

export interface ExtendedCameraEntry {
  en: string;          // 英文关键词
  zh: string;          // 中文名称
  description: string; // 英文运镜描述（发给视频 API）
  category: string;
}

export const EXTENDED_CAMERA_DICT: ExtendedCameraEntry[] = [
  // 镜头运动方向
  { en: "push forward", zh: "向前推进", description: "Camera steadily pushes forward toward subject, compressing space and intensifying focus on the main subject", category: "direction" },
  { en: "pull back", zh: "向后拉进", description: "Camera gradually pulls back to reveal the environment, creating a sense of spatial narrative and context", category: "direction" },
  { en: "lateral left", zh: "向左横移", description: "Camera moves laterally to the left, creating a dynamic parallel perspective that sweeps across the scene", category: "direction" },
  { en: "lateral right", zh: "向右横移", description: "Camera moves laterally to the right, naturally shifting the visual focus across the frame", category: "direction" },
  { en: "upward tilt", zh: "向上仰拍运镜", description: "Camera rises from low angle upward, emphasizing the subject's height and imposing presence", category: "direction" },
  { en: "downward dive", zh: "向下俯拍运镜", description: "Camera descends from above in a diving motion, revealing the full depth and scale of the scene below", category: "direction" },
  { en: "clockwise orbit", zh: "顺时针环绕", description: "Camera orbits clockwise around the subject, creating an immersive 360-degree surrounding sensation", category: "direction" },
  { en: "counter-clockwise orbit", zh: "逆时针环绕", description: "Camera orbits counter-clockwise around the subject, generating reverse visual tension and dynamic energy", category: "direction" },
  { en: "upward follow", zh: "向上跟拍", description: "Camera follows subject upward in synchronized movement, capturing the ascending trajectory with fluid motion", category: "direction" },
  { en: "downward follow", zh: "向下跟拍", description: "Camera follows subject downward, reinforcing the sensation of falling and weightlessness", category: "direction" },
  { en: "diagonal forward up", zh: "斜向前上运镜", description: "Camera moves diagonally forward and upward, combining subject push-in with dimensional elevation", category: "direction" },
  { en: "diagonal backward down", zh: "斜向后下运镜", description: "Camera moves diagonally backward and downward, de-emphasizing subject while expanding environmental layers", category: "direction" },

  // 镜头动态运镜
  { en: "steady push in", zh: "匀速推镜", description: "Smooth constant-speed push toward subject, gradually focusing attention with controlled momentum", category: "dynamic" },
  { en: "accelerating pull out", zh: "加速拉镜", description: "Accelerating pull-back rapidly reveals the surrounding scene with increasing energy", category: "dynamic" },
  { en: "tracking lateral", zh: "跟拍横移", description: "Lateral tracking shot following the subject, maintaining dynamic continuity and fluid movement", category: "dynamic" },
  { en: "slow rise low angle", zh: "缓升仰拍", description: "Slow upward rise with low angle, gradually revealing the subject's imposing stature", category: "dynamic" },
  { en: "fast descent high angle", zh: "急降俯拍", description: "Rapid downward descent from above, delivering strong visual impact and dramatic tension", category: "dynamic" },
  { en: "orbit tracking", zh: "环绕跟拍", description: "Orbiting tracking shot around the subject, creating a spatial encircling sensation", category: "dynamic" },
  { en: "handheld shake", zh: "抖动运镜", description: "Subtle handheld camera shake adds authentic immediacy and realistic on-the-ground presence", category: "dynamic" },
  { en: "pan sweep", zh: "摇镜扫景", description: "Sweeping pan across the full panorama, providing environmental transition and spatial context", category: "dynamic" },
  { en: "push pull combo", zh: "推拉结合", description: "Alternating push-in and pull-out movements, creating rich rhythmic variation in the shot", category: "dynamic" },
  { en: "diagonal tracking", zh: "斜向跟拍", description: "Diagonal tracking movement breaks visual monotony, adding dynamic angular energy to the frame", category: "dynamic" },
  { en: "descend and pan", zh: "降摇运镜", description: "Synchronized descent and pan movement, converging the scene's focal point from above", category: "dynamic" },
  { en: "rise and pan", zh: "升摇运镜", description: "Synchronized rise and pan movement, expanding the visual field and broadening the scene's scope", category: "dynamic" },

  // 情绪化运镜
  { en: "slow push emotional", zh: "缓慢推镜", description: "Slow deliberate push-in builds emotional resonance, drawing the audience into shared feeling", category: "emotional" },
  { en: "sudden pull back", zh: "急促拉镜", description: "Abrupt pull-back cuts emotional connection, conveying alienation and psychological distance", category: "emotional" },
  { en: "trembling follow", zh: "颤抖跟拍", description: "Trembling handheld follow shot transmits anxiety, tension, and psychological unease", category: "emotional" },
  { en: "gentle pan", zh: "轻柔摇镜", description: "Soft gentle pan across the scene, complementing a calm and soothing atmosphere", category: "emotional" },
  { en: "hesitant push", zh: "顿挫推镜", description: "Stuttering push-in movement conveys hesitation, internal conflict, and emotional wavering", category: "emotional" },
  { en: "floating follow", zh: "悬浮跟拍", description: "Floating weightless follow movement creates a dreamlike, ethereal, and light sensation", category: "emotional" },
  { en: "heavy press down", zh: "重压俯拍", description: "Heavy pressing downward shot conveys oppression, suffocation, and psychological weight", category: "emotional" },
  { en: "sprint follow", zh: "冲刺跟拍", description: "High-energy sprint tracking shot transmits excitement, exhilaration, and intense momentum", category: "emotional" },
  { en: "slow descent", zh: "缓降运镜", description: "Slow descending camera movement accompanies feelings of loss, melancholy, and quiet sorrow", category: "emotional" },
  { en: "sudden rise low angle", zh: "骤升仰拍", description: "Sudden upward rise with low angle conveys surprise, awe, and overwhelming shock", category: "emotional" },
  { en: "wandering orbit", zh: "徘徊环绕", description: "Wandering circular orbit transmits confusion, disorientation, and a sense of being lost", category: "emotional" },
  { en: "converging push", zh: "收束推镜", description: "Converging slow push-in concentrates focus and solemnity, building quiet intensity", category: "emotional" },

  // 特殊场景运镜
  { en: "rain slow push", zh: "雨景慢推", description: "Slow push through rain, raindrops catching light, creating a hazy atmospheric mood", category: "special_scene" },
  { en: "night orbit", zh: "夜景环绕", description: "Orbiting night scene shot, city lights and shadows creating a quiet, mesmerizing ambiance", category: "special_scene" },
  { en: "snow descent", zh: "雪景俯降", description: "Descending aerial shot over snow-covered landscape, conveying pure, vast, and serene emptiness", category: "special_scene" },
  { en: "crowd weave tracking", zh: "人群穿梭跟拍", description: "Weaving through crowd tracking shot, conveying congestion, urgency, and chaotic energy", category: "special_scene" },
  { en: "narrow interior lateral", zh: "室内窄空间横移", description: "Lateral movement through narrow interior space, creating claustrophobic and confined tension", category: "special_scene" },
  { en: "aerial sweep", zh: "高空俯扫", description: "High aerial sweeping shot, revealing vast and magnificent landscape from above", category: "special_scene" },
  { en: "tunnel depth push", zh: "隧道纵深推镜", description: "Deep push through tunnel, intensifying spatial extension and forward momentum", category: "special_scene" },
  { en: "water surface skim", zh: "水面贴镜平移", description: "Camera skims just above water surface, reflecting shimmering light and fluid movement", category: "special_scene" },
  { en: "fire orbit tracking", zh: "火光环绕跟拍", description: "Orbiting tracking shot around fire, conveying intense heat, energy, and dramatic tension", category: "special_scene" },
  { en: "fog gentle pan", zh: "雾景柔摇", description: "Gentle pan through misty fog, creating mysterious, ethereal, and dreamlike atmosphere", category: "special_scene" },
  { en: "sports low angle tracking", zh: "运动赛事低角度跟拍", description: "Low angle tracking shot of athletic event, maximizing speed, power, and kinetic impact", category: "special_scene" },
  { en: "ancient architecture rise push", zh: "古建筑仰升推镜", description: "Rising push-in on ancient architecture from low angle, conveying historical weight and grandeur", category: "special_scene" },

  // 景别
  { en: "extreme long shot", zh: "极远景/大远景", description: "Extreme long shot — subject merges into vast environment, conveying epic scale and grandeur", category: "framing" },
  { en: "long shot", zh: "远景", description: "Long shot establishing full scene silhouette, defining the scene's tone and spatial context", category: "framing" },
  { en: "full shot", zh: "全景", description: "Full shot showing entire character head-to-toe, revealing complete action and spatial layout", category: "framing" },
  { en: "medium long shot", zh: "中远景", description: "3/4 shot from knees up, bridging medium and full shot with balanced character-environment framing", category: "framing" },
  { en: "medium shot", zh: "中景", description: "Waist-up framing showing character actions and emotional expression with visible background context", category: "framing" },
  { en: "cowboy shot", zh: "牛仔镜头", description: "American shot from mid-thigh up, classic western framing showing character and holster area", category: "framing" },
  { en: "medium close-up", zh: "中近景", description: "Chest-up framing emphasizing facial expression and subtle emotional detail", category: "framing" },
  { en: "close-up", zh: "近景/特写", description: "Head and face close-up conveying emotional expression and intimate detail, background softly blurred", category: "framing" },
  { en: "choker shot", zh: "全特写", description: "Tight framing from eyebrows to lips, intensely personal and emotionally charged", category: "framing" },
  { en: "extreme close-up", zh: "大特写", description: "Extreme close-up emphasizing micro details — eyes, mouth, fingertips — maximum emotional impact", category: "framing" },
  { en: "wide angle", zh: "广角镜头", description: "Wide angle lens capturing broader scene range, emphasizing space, depth, and environmental scale", category: "framing" },
  { en: "fisheye", zh: "鱼眼镜头", description: "Fisheye lens creating distinctive curved distortion, conveying surreal spatial warping", category: "framing" },

  // 镜头运动技法
  { en: "crane shot", zh: "起重机拍摄", description: "Crane or jib arm movement, sweeping vertically through space with cinematic grandeur", category: "technique" },
  { en: "whip pan", zh: "快速平移", description: "Whip pan creating motion blur transition, fast and energetic scene-to-scene connection", category: "technique" },
  { en: "arc shot", zh: "弧线拍摄", description: "Camera arcs in circular motion around subject, revealing three-dimensionality and spatial depth", category: "technique" },
  { en: "cinematic dolly in", zh: "电影式滑进", description: "Cinematic dolly push toward subject with smooth controlled momentum, building dramatic focus", category: "technique" },
  { en: "360 spin", zh: "360度旋转", description: "Full 360-degree rotation around subject, creating immersive spatial awareness and dynamic energy", category: "technique" },
  { en: "low angle tracking", zh: "低角度跟踪", description: "Low angle tracking shot following subject, emphasizing ground-level perspective and kinetic energy", category: "technique" },
  { en: "drone aerial", zh: "无人机航拍", description: "Drone-like aerial movement transitioning from sky to ground level with smooth cinematic descent", category: "technique" },
  { en: "steadicam sprint", zh: "稳定镜头冲刺", description: "Fast-paced steadicam following sprinting subject, combining stability with urgent forward momentum", category: "technique" },
  { en: "handheld follow", zh: "手持跟拍", description: "Handheld camera following subject with natural organic movement, adding immediacy and realism", category: "technique" },
  { en: "slow pan", zh: "慢移摇镜", description: "Slow-motion pan across scene, revealing details with deliberate and contemplative pacing", category: "technique" },
  { en: "spin transition", zh: "旋转过渡", description: "Spinning rotation transitioning to new scene, creating dynamic visual momentum between shots", category: "technique" },
  { en: "dolly zoom", zh: "眩晕效果", description: "Simultaneous dolly and zoom in opposite directions, creating the classic vertigo disorientation effect", category: "technique" },
  { en: "rack focus", zh: "聚焦拉伸", description: "Rapid focus shift between foreground and background subjects, guiding viewer attention precisely", category: "technique" },
  { en: "aerial shot", zh: "航拍镜头", description: "Aerial shot from drone or helicopter, revealing vast environment and tracking dynamic action from above", category: "technique" },
  { en: "steadicam", zh: "斯坦尼康", description: "Steadicam stabilized smooth tracking shot combining mobility with cinematic fluid movement", category: "technique" },

  // 镜头角度
  { en: "eye level shot", zh: "视平线镜头", description: "Eye-level neutral perspective creating natural, objective observation with balanced emotional distance", category: "angle" },
  { en: "high angle shot", zh: "俯拍镜头", description: "High angle looking down, making subject appear small, vulnerable, or overwhelmed by surroundings", category: "angle" },
  { en: "low angle shot", zh: "仰拍镜头", description: "Low angle looking up, making subject appear powerful, dominant, and larger than life", category: "angle" },
  { en: "dutch angle", zh: "倾斜镜头", description: "Deliberately tilted camera creating visual instability, conveying chaos, unease, or psychological tension", category: "angle" },
  { en: "extreme angle", zh: "极端视角", description: "Extreme high or low angle adding dramatic intensity and emphasizing power dynamics between characters", category: "angle" },
  { en: "inverted shot", zh: "反转镜头", description: "Upside-down framing challenging visual conventions, expressing chaos or unstable psychological state", category: "angle" },
  { en: "over-the-shoulder", zh: "过肩镜头", description: "Over-the-shoulder framing from behind character, providing relational perspective in dialogue scenes", category: "angle" },
  { en: "subjective shaky", zh: "主观晃动", description: "Subjective POV combined with camera shake, simulating character's tense or disoriented state", category: "angle" },
  { en: "split screen", zh: "分屏镜头", description: "Screen divided into multiple panels showing simultaneous events from different locations or angles", category: "angle" },
  { en: "silhouette shot", zh: "剪影镜头", description: "Strong backlight creating dark silhouette against bright background, emphasizing shape and form", category: "angle" },
];

// ============================================
// 统一查找函数：根据英文关键词匹配运镜描述
// 优先查 EXTENDED_CAMERA_DICT，再查 CAMERA_MOVEMENTS
// ============================================
export function getCameraDescription(cameraAngle: string): string {
  const input = cameraAngle.toLowerCase().trim();

  // 1. 精确匹配扩展词典
  const exact = EXTENDED_CAMERA_DICT.find(e => e.en.toLowerCase() === input);
  if (exact) return exact.description;

  // 2. 精确匹配旧词典
  const oldExact = CAMERA_MOVEMENTS.find(m => m.name_en.toLowerCase() === input);
  if (oldExact) return oldExact.description_en;

  // 3. 包含匹配扩展词典
  const partial = EXTENDED_CAMERA_DICT.find(e =>
    input.includes(e.en.toLowerCase()) || e.en.toLowerCase().includes(input)
  );
  if (partial) return partial.description;

  // 4. 包含匹配旧词典
  const oldPartial = CAMERA_MOVEMENTS.find(m =>
    input.includes(m.name_en.toLowerCase()) || m.name_en.toLowerCase().includes(input)
  );
  if (oldPartial) return oldPartial.description_en;

  // 5. 关键词模糊匹配
  const keywords: Record<string, string> = {
    "push": "Camera steadily pushes forward toward subject, compressing space and intensifying focus",
    "pull": "Camera pulls back to reveal the environment and spatial context",
    "pan": "Smooth horizontal pan across scene, revealing environment and spatial relationships",
    "tilt": "Smooth vertical tilt revealing height and vertical spatial relationships",
    "orbit": "Camera orbits around subject, creating immersive surrounding sensation",
    "track": "Smooth tracking shot following subject, maintaining dynamic continuity",
    "handheld": "Handheld camera with natural organic movement, adding immediacy and realism",
    "aerial": "Aerial shot revealing vast environment from above with cinematic grandeur",
    "crane": "Crane movement sweeping vertically through space with cinematic grandeur",
    "dolly": "Smooth dolly movement along Z-axis for emotional emphasis and depth",
    "zoom": "Zoom adjustment pulling viewer closer or pushing away without physical movement",
    "steadicam": "Steadicam stabilized smooth tracking combining mobility with fluid movement",
    "whip": "Fast whip pan creating motion blur and energetic scene transition",
    "arc": "Camera arcs around subject revealing three-dimensionality and spatial depth",
    "wide": "Wide establishing shot showing character in full environmental context",
    "close": "Close framing capturing emotional detail and intimate expression",
    "medium": "Medium framing showing upper body with natural conversational presence",
    "low": "Low angle shot conveying power, dominance, and imposing presence",
    "high": "High angle shot creating vulnerability and overview perspective",
    "dutch": "Dutch angle tilt creating visual instability and psychological tension",
    "pov": "First-person point-of-view shot maximizing immersive experience",
    "silhouette": "Strong backlight creating dramatic silhouette against bright background",
    "slow": "Slow deliberate movement building emotional resonance and contemplative mood",
    "fast": "Fast energetic movement conveying urgency, excitement, and kinetic energy",
    "float": "Floating weightless movement creating dreamlike ethereal sensation",
    "shake": "Camera shake adding authentic immediacy and realistic tension",
    "spin": "Spinning rotation creating dynamic energy and disorientation",
    "rise": "Rising camera movement conveying ascent, power, and revelation",
    "descent": "Descending camera movement conveying falling, loss, or revelation from above",
    "fog": "Movement through fog creating mysterious and ethereal atmosphere",
    "rain": "Movement through rain creating atmospheric and emotional mood",
    "night": "Night scene movement with ambient light creating cinematic atmosphere",
  };

  for (const [key, desc] of Object.entries(keywords)) {
    if (input.includes(key)) return desc;
  }

  return "Subtle natural movement with gentle animation, smooth cinematic motion";
}

// ============================================
// 生成精简的运镜参考（用于 Claude system prompt）
// ============================================
export function generateCameraReferenceForClaude(): string {
  const lines: string[] = [
    "## Professional Camera Reference",
    "",
    "Use these camera angle keywords in the `cameraAngle` field of each cut:",
    "",
    "### Framing / Shot Size",
  ];

  const framingEntries = EXTENDED_CAMERA_DICT.filter(e => e.category === "framing");
  for (const e of framingEntries) {
    lines.push(`- **${e.en}** (${e.zh})`);
  }

  lines.push("", "### Movement Direction");
  const dirEntries = EXTENDED_CAMERA_DICT.filter(e => e.category === "direction");
  for (const e of dirEntries) {
    lines.push(`- **${e.en}** (${e.zh})`);
  }

  lines.push("", "### Dynamic Movement");
  const dynEntries = EXTENDED_CAMERA_DICT.filter(e => e.category === "dynamic");
  for (const e of dynEntries) {
    lines.push(`- **${e.en}** (${e.zh})`);
  }

  lines.push("", "### Emotional Movement");
  const emoEntries = EXTENDED_CAMERA_DICT.filter(e => e.category === "emotional");
  for (const e of emoEntries) {
    lines.push(`- **${e.en}** (${e.zh})`);
  }

  lines.push("", "### Special Scene Movement");
  const specEntries = EXTENDED_CAMERA_DICT.filter(e => e.category === "special_scene");
  for (const e of specEntries) {
    lines.push(`- **${e.en}** (${e.zh})`);
  }

  lines.push("", "### Techniques & Angles");
  const techEntries = EXTENDED_CAMERA_DICT.filter(e => e.category === "technique" || e.category === "angle");
  for (const e of techEntries) {
    lines.push(`- **${e.en}** (${e.zh})`);
  }

  lines.push("", "### Emotion-Scene Matching Guide");
  for (const guide of EMOTION_SCENE_GUIDES) {
    const cameraNames = guide.camera_combo.map(id => {
      const m = getCameraMovementById(id);
      return m?.name_en || id;
    });
    lines.push(`- **${guide.emotion}** (${guide.scene_type}): ${cameraNames.join(" → ")} | ${guide.pacing}`);
  }

  return lines.join("\n");
}
