// 创建测试用户脚本
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ogdxytmwbhdrscdhtwzn.supabase.co";
const supabaseKey = "sb_secret_WlaDpRrH2YV1_bMPrRCqjQ_qbFNlizH";

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestUser() {
  const { data, error } = await supabase.from("users").upsert(
    {
      id: "00000000-0000-0000-0000-000000000001",
      email: "test@example.com",
      name: "测试用户",
      credits: 100,
    },
    { onConflict: "id" }
  );

  if (error) {
    console.error("创建用户失败:", error.message);
    process.exit(1);
  }

  console.log("测试用户创建成功!");
  process.exit(0);
}

createTestUser();
