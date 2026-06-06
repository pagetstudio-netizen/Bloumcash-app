import React from "react";
import { useAuth } from "./auth-provider";
import { useLocation } from "wouter";

interface LayoutProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export function Layout({ children, requireAuth = true }: LayoutProps) {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  React.useEffect(() => {
    if (requireAuth && !isAuthenticated) {
      setLocation("/login");
    }
  }, [isAuthenticated, requireAuth, setLocation]);

  if (requireAuth && !isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-[100dvh] w-full bg-background flex flex-col md:mx-auto md:max-w-md relative overflow-x-hidden">
      {children}
    </div>
  );
}
