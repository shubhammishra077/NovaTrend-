import { Outlet } from "react-router";
import { authClient } from "@/lib/auth-client";
import { redirect } from "react-router";

export async function clientLoader() {
  const { data: session } = await authClient.getSession();
  if (!session) throw redirect("/login");
  return null;
}

import { SiteFooter } from "@/components/globals/site-footer";

export default function UserLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex-1">
        <Outlet />
      </div>
      <SiteFooter />
    </div>
  );
}