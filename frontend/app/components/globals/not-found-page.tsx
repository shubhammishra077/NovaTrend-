import { Link } from "react-router";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-4 py-16 text-center">
      <p className="font-heading text-7xl font-semibold tracking-tight text-primary">404</p>
      <h1 className="mt-4 font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
        This page wandered off
      </h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
        The link may be outdated, or the page may have moved. Let’s get you back to the marketplace.
      </p>
      <Button className="mt-7 rounded-full" render={<Link to="/" />}>
        Return to home
      </Button>
    </main>
  );
}
