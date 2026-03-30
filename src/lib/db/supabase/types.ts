// Supabase 数据库类型定义
// 这个文件可以通过 supabase gen types typescript 命令自动生成
// 这里我们手动定义以匹配 CLAUDE.md 中的数据库结构

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          credits: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          name?: string | null;
          credits?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          credits?: number;
          created_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          title: string | null;
          status: string;
          original_prompt: string | null;
          parsed_script: Json | null;
          style_config: Json | null;
          total_duration: number;
          final_video_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string | null;
          status?: string;
          original_prompt?: string | null;
          parsed_script?: Json | null;
          style_config?: Json | null;
          total_duration?: number;
          final_video_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string | null;
          status?: string;
          original_prompt?: string | null;
          parsed_script?: Json | null;
          style_config?: Json | null;
          total_duration?: number;
          final_video_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      characters: {
        Row: {
          id: string;
          project_id: string | null; // 删除项目后为 null
          name: string | null;
          description: string | null;
          base_prompt: string | null;
          reference_images: Json | null;
          assets: Json | null; // 多视角立绘资源 { sheet_url, front, side, back, generated_at, legacy }
          inline_look: string | null; // Zapiwala: 简洁的外貌标签
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id?: string | null; // 可选，支持独立角色
          name?: string | null;
          description?: string | null;
          base_prompt?: string | null;
          reference_images?: Json | null;
          assets?: Json | null;
          inline_look?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string | null;
          name?: string | null;
          description?: string | null;
          base_prompt?: string | null;
          reference_images?: Json | null;
          assets?: Json | null;
          inline_look?: string | null;
          created_at?: string;
        };
      };
      scenes: {
        Row: {
          id: string;
          project_id: string;
          scene_index: number;
          duration: number;
          shot_type: string | null;
          camera_movement: string | null;
          camera_movement_prompt: string | null;  // 用于视频生成的英文运镜描述
          description: string | null;
          full_prompt: string | null;
          status: string;
          preview_image_url: string | null;
          video_url: string | null;
          user_approved: boolean;
          user_feedback: string | null;
          character_ids: string[] | null;
          location_id: string | null;
          created_at: string;
          // Zapiwala 新增字段
          bgm: string | null;                     // 背景音乐描述
          sfx: string | null;                     // 音效描述
          pacing: string | null;                  // 节奏描述
          cuts: Json | null;                      // Multi-Cut 结构 (JSONB)
          dialogue_order_lock: string[] | null;   // 对话顺序锁
        };
        Insert: {
          id?: string;
          project_id: string;
          scene_index: number;
          duration?: number;
          shot_type?: string | null;
          camera_movement?: string | null;
          camera_movement_prompt?: string | null;
          description?: string | null;
          full_prompt?: string | null;
          status?: string;
          preview_image_url?: string | null;
          video_url?: string | null;
          user_approved?: boolean;
          user_feedback?: string | null;
          character_ids?: string[] | null;
          location_id?: string | null;
          created_at?: string;
          // Zapiwala 新增字段
          bgm?: string | null;
          sfx?: string | null;
          pacing?: string | null;
          cuts?: Json | null;
          dialogue_order_lock?: string[] | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          scene_index?: number;
          duration?: number;
          shot_type?: string | null;
          camera_movement?: string | null;
          camera_movement_prompt?: string | null;
          description?: string | null;
          full_prompt?: string | null;
          status?: string;
          preview_image_url?: string | null;
          video_url?: string | null;
          user_approved?: boolean;
          user_feedback?: string | null;
          character_ids?: string[] | null;
          location_id?: string | null;
          created_at?: string;
          // Zapiwala 新增字段
          bgm?: string | null;
          sfx?: string | null;
          pacing?: string | null;
          cuts?: Json | null;
          dialogue_order_lock?: string[] | null;
        };
      };
      locations: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          description: string | null;
          base_prompt: string | null;
          time_of_day: string | null;
          weather: string | null;
          mood: string | null;
          reference_image_url: string | null;
          view_main_url: string | null;       // 保留字段（兼容）
          view_reverse_url: string | null;    // 保留字段（兼容）
          panorama_url: string | null;        // 21:9 CinemaScope 全景图
          location_index: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          description?: string | null;
          base_prompt?: string | null;
          time_of_day?: string | null;
          weather?: string | null;
          mood?: string | null;
          reference_image_url?: string | null;
          view_main_url?: string | null;
          view_reverse_url?: string | null;
          panorama_url?: string | null;
          location_index?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          name?: string;
          description?: string | null;
          base_prompt?: string | null;
          time_of_day?: string | null;
          weather?: string | null;
          mood?: string | null;
          reference_image_url?: string | null;
          view_main_url?: string | null;
          view_reverse_url?: string | null;
          panorama_url?: string | null;
          location_index?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          project_id: string;
          scene_id: string | null;
          task_type: string;
          status: string;
          provider: string | null;
          external_task_id: string | null;
          input_params: Json | null;
          output_result: Json | null;
          error_message: string | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          scene_id?: string | null;
          task_type: string;
          status?: string;
          provider?: string | null;
          external_task_id?: string | null;
          input_params?: Json | null;
          output_result?: Json | null;
          error_message?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          scene_id?: string | null;
          task_type?: string;
          status?: string;
          provider?: string | null;
          external_task_id?: string | null;
          input_params?: Json | null;
          output_result?: Json | null;
          error_message?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
      };
      storyboards: {
        Row: {
          id: string;
          project_id: string | null;     // 项目删除后为 null
          scene_id: string | null;       // 原场景删除后为 null
          name: string | null;
          description: string | null;
          image_url: string;
          prompt: string | null;
          shot_type: string | null;
          camera_movement: string | null;
          art_style: string | null;
          aspect_ratio: string | null;
          tags: string[] | null;
          confirmed: boolean;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id?: string | null;
          scene_id?: string | null;
          name?: string | null;
          description?: string | null;
          image_url: string;
          prompt?: string | null;
          shot_type?: string | null;
          camera_movement?: string | null;
          art_style?: string | null;
          aspect_ratio?: string | null;
          tags?: string[] | null;
          confirmed?: boolean;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string | null;
          scene_id?: string | null;
          name?: string | null;
          description?: string | null;
          image_url?: string;
          prompt?: string | null;
          shot_type?: string | null;
          camera_movement?: string | null;
          art_style?: string | null;
          aspect_ratio?: string | null;
          tags?: string[] | null;
          confirmed?: boolean;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      custom_art_styles: {
        Row: {
          id: string;
          name: string;
          name_en: string | null;
          description: string | null;
          base_preset: string | null;       // 'ghibli' | 'cel' | null
          positive_prompt: string;          // 通用正向提示词
          negative_prompt: string;          // 通用负向提示词
          preview_image_url: string | null;
          is_public: boolean;
          usage_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          name_en?: string | null;
          description?: string | null;
          base_preset?: string | null;
          positive_prompt: string;
          negative_prompt: string;
          preview_image_url?: string | null;
          is_public?: boolean;
          usage_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          name_en?: string | null;
          description?: string | null;
          base_preset?: string | null;
          positive_prompt?: string;
          negative_prompt?: string;
          preview_image_url?: string | null;
          is_public?: boolean;
          usage_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// 便捷类型别名
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

// 导出具体表类型
export type User = Tables<"users">;
export type Project = Tables<"projects">;
export type Character = Tables<"characters">;
export type Scene = Tables<"scenes">;
export type Location = Tables<"locations">;
export type Task = Tables<"tasks">;
export type Storyboard = Tables<"storyboards">;
export type CustomArtStyle = Tables<"custom_art_styles">;
