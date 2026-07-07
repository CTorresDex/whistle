"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/auth";

// page#landing — redirects to /home when logged in, /login otherwise
export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(getSession() ? "/home" : "/login");
  }, [router]);

  return null;
}
