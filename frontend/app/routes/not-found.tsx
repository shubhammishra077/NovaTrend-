import { NotFoundPage } from "@/components/globals/not-found-page";

export function meta() {
  return [
    { title: "Page not found | NovaTrend" },
    { name: "description", content: "The requested NovaTrend page could not be found." },
  ];
}

export default function NotFound() {
  return <NotFoundPage />;
}
