"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export default function VerifyEmailPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isMounted = true;
    const verifyToken = async () => {
      try {
        const response = await fetch(`${API_URL}/auth/verify-email/${token}`, {
          method: "GET",
          credentials: "include",
        });

        const data = await response.json().catch(() => null);

        if (!isMounted) return;

        if (response.ok) {
          setSuccess(true);
          setMessage(data?.message || "Email verified successfully!");
        } else {
          setSuccess(false);
          setMessage(
            data?.message ||
            "Verification token is invalid or has expired. Please sign in and request a new one."
          );
        }
      } catch {
        if (!isMounted) return;
        setSuccess(false);
        setMessage("Unable to reach the server. Please check your connection and try again.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (token) {
      verifyToken();
    }
    return () => {
      isMounted = false;
    };
  }, [token]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">PC</span>
          </div>
          <span className="font-semibold text-lg tracking-tight">Project Camp</span>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="space-y-1.5 text-center">
            <CardTitle className="text-2xl">Email Verification</CardTitle>
            <CardDescription>
              Confirming your account verification status.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="py-8 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Verifying your token...</p>
              </div>
            ) : success ? (
              <div className="space-y-4 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 mb-2">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <Alert className="border-success/30 bg-success/10 text-success-foreground [&>svg]:text-success">
                  <CheckCircle2 className="w-4 h-4" />
                  <AlertDescription className="text-foreground/90">{message}</AlertDescription>
                </Alert>
                <Button onClick={() => router.push("/")} className="w-full rounded-full">
                  Proceed to Sign In
                </Button>
              </div>
            ) : (
              <div className="space-y-4 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-2">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
                <Button onClick={() => router.push("/")} className="w-full rounded-full">
                  Back to Sign In
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

