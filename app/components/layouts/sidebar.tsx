"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutGrid, CheckSquare, FileText, Settings, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/dashboard", label: "Projects", icon: LayoutGrid },
  { href: "/dashboard/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/dashboard/notes", label: "Notes", icon: FileText },
  // { href: "/dashboard/settings", label: "Settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  const handleLogout = () => {
    localStorage.removeItem("token")
    window.location.href = "/"
  }

  return (
    <aside className="w-64 shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center shadow-sm">
            <span className="text-sidebar-primary-foreground font-bold text-sm">PC</span>
          </div>
          <span className="font-semibold text-[15px] tracking-tight text-sidebar-foreground">Project Camp</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="px-3 pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Workspace</p>
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent",
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent w-full transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  )
}
