import { Link } from "react-router";
import { ArrowRight, Store, ShoppingBag, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export function meta() {
  return [
    { title: "About NovaTrend" },
    { name: "description", content: "Learn about NovaTrend, a marketplace for independent sellers and shoppers." },
  ];
}

const values = [
  {
    icon: Store,
    title: "Independent sellers",
    description: "Discover products from independent stores, each with its own selection and style.",
  },
  {
    icon: ShoppingBag,
    title: "One place to explore",
    description: "Browse a range of products and find something that fits your everyday life.",
  },
  {
    icon: ShieldCheck,
    title: "A thoughtful marketplace",
    description: "Seller stores are reviewed before they can begin selling on NovaTrend.",
  },
];

export default function About() {
  return (
    <main className="bg-background">
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
        <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">About NovaTrend</p>
        <h1 className="mt-4 max-w-3xl font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          A marketplace made for discovering something new.
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground">
          NovaTrend brings independent sellers and shoppers together. Explore a growing collection of products, discover new stores, and shop directly from the sellers behind them.
        </p>
        <Button className="mt-8 rounded-full" render={<Link to="/shop" />}>
          Browse the shop <ArrowRight className="size-4" data-icon="inline-end" />
        </Button>
      </section>

      <section className="border-y border-border bg-muted/20">
        <div className="mx-auto grid max-w-6xl gap-5 px-4 py-12 sm:grid-cols-3 sm:px-6 sm:py-16">
          {values.map(({ icon: Icon, title, description }) => (
            <article key={title} className="rounded-2xl border border-border bg-card p-6">
              <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="size-5" />
              </span>
              <h2 className="mt-4 font-heading text-lg font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
