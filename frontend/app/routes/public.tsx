import { Outlet } from "react-router";
import { Header } from "@/components/globals/header";
import { AskAiWidget } from "@/components/ai/ask-ai-widget";
import { SiteFooter } from "@/components/globals/site-footer";

export default function PublicLayout() {
  return (
    <div className="min-h-screen">
      <Header />
      <Outlet />
      <SiteFooter />
      <AskAiWidget />
    </div>
  );
}
