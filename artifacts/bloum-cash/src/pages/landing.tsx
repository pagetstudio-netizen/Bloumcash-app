import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/components/auth-provider";

export default function Landing() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/dashboard");
    } else {
      setLocation("/splash");
    }
  }, [isAuthenticated, setLocation]);

  return null;
}
