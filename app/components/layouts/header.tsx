"use client"

import { useState } from "react"
import { Bell, LogOut, Search, Settings, User } from "lucide-react"
import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
import { ThemeToggle } from "@/app/components/ui/theme-toggle"
import { Avatar, AvatarFallback } from "@/app/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu"

export function Header() {
  const [showNotifications, setShowNotifications] = useState(false)

  const handleLogout = () => {
    localStorage.removeItem("token")
    window.location.href = "/"
  }

  return (
    <header className="h-16 shrink-0 border-b border-border bg-card/60 backdrop-blur supports-backdrop-filter:bg-card/60 flex items-center justify-between gap-4 px-6">
      <div className="relative w-full max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search projects, tasks, notes..." className="pl-9 h-9 bg-background" />
      </div>

      <div className="flex items-center gap-1.5">
        <ThemeToggle />
        <div className="relative">
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground relative"
            onClick={() => setShowNotifications((visible) => !visible)}
            aria-label="Notifications"
            aria-expanded={showNotifications}
          >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
          </Button>
          {showNotifications && (
            <div className="absolute right-0 top-11 z-20 w-72 rounded-lg border bg-popover p-4 text-popover-foreground shadow-lg">
              <p className="font-medium">Notifications</p>
              <p className="mt-1 text-sm text-muted-foreground">You are all caught up.</p>
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-border mx-1" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-accent transition-colors">
              <Avatar className="size-7">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                  U
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium leading-none">My Account</p>
              <p className="text-xs text-muted-foreground mt-1">Signed in</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="w-4 h-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="w-4 h-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="w-4 h-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
