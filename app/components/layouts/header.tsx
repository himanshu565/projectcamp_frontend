"use client"

import { useEffect, useState } from "react"
import { Bell, LogOut, MailCheck, Menu, Search } from "lucide-react"
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/app/components/ui/sheet"
import { Sidebar } from "./sidebar"
import { apiFetch, logout } from "@/lib/api"

type CurrentUser = {
  _id?: string
  username?: string
  email?: string
  fullName?: string
  isEmailVerified?: boolean
}

export function Header() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [resendingEmail, setResendingEmail] = useState(false)
  const [resendStatus, setResendStatus] = useState("")

  useEffect(() => {
    let isMounted = true
    const loadCurrentUser = async () => {
      try {
        const data = await apiFetch<Record<string, unknown>>("/auth/current-user")
        if (!isMounted) return
        const user = (data?.data ?? data?.user ?? data) as CurrentUser
        setCurrentUser(user)
      } catch {
        if (isMounted) setCurrentUser(null)
      }
    }

    loadCurrentUser()
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!showNotifications) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowNotifications(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [showNotifications])

  const handleLogout = async () => {
    await logout()
  }

  const handleResendVerification = async () => {
    setResendingEmail(true)
    setResendStatus("")
    try {
      const data = await apiFetch<Record<string, unknown>>("/auth/resend-email-verification", {
        method: "POST",
      })
      setResendStatus(String(data?.message || "Verification email sent!"))
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to resend verification email."
      setResendStatus(message)
    } finally {
      setResendingEmail(false)
    }
  }

  const userInitial = (currentUser?.fullName || currentUser?.username || currentUser?.email || "U")
    .slice(0, 1)
    .toUpperCase()

  return (
    <header className="h-16 shrink-0 border-b border-border bg-card/60 backdrop-blur supports-backdrop-filter:bg-card/60 flex items-center justify-between gap-4 px-4 sm:px-6">
      <div className="flex items-center gap-2 flex-1 max-w-sm">
        <Button
          variant="ghost"
          size="icon-sm"
          className="md:hidden text-foreground shrink-0"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </Button>
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search projects, tasks, notes..."
            className="pl-9 h-9 bg-background"
            aria-label="Search projects, tasks, notes"
          />
        </div>
      </div>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="p-0 w-72">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation Menu</SheetTitle>
            <SheetDescription>Workspace navigation and links</SheetDescription>
          </SheetHeader>
          <Sidebar className="w-full border-r-0" onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex items-center gap-2">
        {currentUser && currentUser.isEmailVerified === false && (
          <div className="hidden sm:flex items-center gap-2 text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-3 py-1 rounded-full">
            <MailCheck className="w-3.5 h-3.5" />
            <span>Email unverified</span>
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resendingEmail}
              className="font-medium underline hover:text-amber-700 disabled:opacity-50"
            >
              {resendingEmail ? "Sending..." : "Resend link"}
            </button>
            {resendStatus && (
              <span className="text-[11px] font-normal text-muted-foreground truncate max-w-32">
                ({resendStatus})
              </span>
            )}
          </div>
        )}

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
            <button
              className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-accent transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="User account menu"
            >
              <Avatar className="size-7">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium leading-none">
                {currentUser?.fullName || currentUser?.username || "My Account"}
              </p>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {currentUser?.email || "Signed in"}
              </p>
              {currentUser?.username && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  @{currentUser.username}
                </p>
              )}
            </DropdownMenuLabel>
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
