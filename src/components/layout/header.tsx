"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Film, Plus, FolderOpen, Users, LayoutGrid, Palette } from "lucide-react";

const navItems = [
  { href: "/create", label: "创建", icon: Plus },
  { href: "/projects", label: "我的项目", icon: FolderOpen },
  { href: "/characters", label: "角色库", icon: Users },
  { href: "/storyboards", label: "分镜库", icon: LayoutGrid },
  { href: "/styles", label: "风格库", icon: Palette },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 flex h-14 items-center">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <Film className="h-5 w-5 text-primary" />
          <span>FlashFlick</span>
        </Link>

        <nav className="ml-auto flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
