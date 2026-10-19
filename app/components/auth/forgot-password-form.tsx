"use client";

import type React from "react";
import { useState } from "react";
import { API_URL } from "@/lib/api";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import { AlertCircle, CheckCircle2, Loader2, Mail } from "lucide-react";

interface ForgotPasswordFormProps {
  onSwitchToLogin: () => void;
}

export function ForgotPasswordForm({ onSwitchToLogin }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
        credentials: "include",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(
          data?.message ||
          "Unable to process password reset. Please verify your email or try again later."
        );
        return;
      }

      setSuccessMessage(
        data?.message || "Password reset instructions have been sent to your email."
      );
      setSubmitted(true);
    } catch {
      setError("Unable to connect to the server. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <Card className="shadow-lg">
        <CardHeader className="space-y-1.5 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 mb-2">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl">Check your inbox</CardTitle>
          <CardDescription>
            {successMessage}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Click the link in the email to set a new password. If you don&apos;t receive an email within a few minutes, check your spam folder.
          </p>
          <Button onClick={onSwitchToLogin} className="w-full rounded-full">
            Back to Sign In
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="space-y-1.5">
        <CardTitle className="text-2xl">Reset password</CardTitle>
        <CardDescription>
          Enter your account email to receive a password reset link.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="reset-email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="reset-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="pl-9"
                required
                autoFocus
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full rounded-full">
            {loading && <Loader2 className="animate-spin" />}
            {loading ? "Sending link..." : "Send reset link"}
          </Button>

          <div className="text-center text-sm">
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-primary hover:underline font-medium"
            >
              Back to Sign In
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
