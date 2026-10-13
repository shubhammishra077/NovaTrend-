import { Outlet, redirect } from "react-router";
import type { Route } from "./+types/auth";
import { authClient } from "@/lib/auth-client";
import { ThemeToggle } from "@/components/globals/theme-toggle";

export async function clientLoader() {
  const { data: session } = await authClient.getSession();
  if (session) {
    throw redirect("/");
  }
  return null;
}

export default function AuthLayout() {
  return (
    <>
      <div className="fixed right-4 top-4">
        <ThemeToggle />
      </div>
      <Outlet />
    </>
  );
}
