"use client"

import { useState } from "react"
import { LoginForm } from "@/components/auth/login-form"
import { RegisterForm } from "@/components/auth/register-form"
import { CheckCircle2 } from "lucide-react"

const highlights = [
  "Plan projects and break work into tasks in minutes",
  "Track progress with a shared, real-time workspace",
  "Keep notes, decisions, and files organized by project",
]

export default function Home() {
  const [isLogin, setIsLogin] = useState(true)

  return (
    <div className="min-h-screen bg-background flex">
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 bg-zinc-950 text-zinc-50 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />
        <div
          className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, oklch(0.82 0.14 85), transparent 70%)" }}
        />

        <div className="relative flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-amber-400/15 flex items-center justify-center">
            <span className="font-bold text-sm text-amber-400">PC</span>
          </div>
          <span className="font-semibold text-lg tracking-tight">Project Camp</span>
        </div>

        <div className="relative space-y-8 max-w-md">
          <h1 className="text-3xl font-semibold leading-tight text-balance">
            Run every project from one connected workspace.
          </h1>
          <ul className="space-y-4">
            {highlights.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-zinc-300">
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-zinc-500">
          &copy; {new Date().getFullYear()} Project Camp. All rights reserved.
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">PC</span>
            </div>
            <span className="font-semibold text-lg tracking-tight">Project Camp</span>
          </div>

          {isLogin ? (
            <LoginForm onSwitchToRegister={() => setIsLogin(false)} />
          ) : (
            <RegisterForm onSwitchToLogin={() => setIsLogin(true)} />
          )}
        </div>
      </div>
    </div>
  )
}
