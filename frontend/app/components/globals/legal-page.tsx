import { Link } from "react-router";

export interface LegalSection {
  title: string;
  paragraphs: string[];
}

export function LegalPage({
  title,
  intro,
  sections,
}: {
  title: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <main className="bg-background">
      <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
          NovaTrend policies
        </p>
        <h1 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
          {title}
        </h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">{intro}</p>
        <p className="mt-5 rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm leading-6 text-muted-foreground">
          This page is an informational draft, not legal advice. Please have it reviewed and adapted for your business and applicable law before relying on it.
        </p>
        <div className="mt-8 flex flex-col gap-7">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="font-heading text-lg font-semibold tracking-tight">
                {section.title}
              </h2>
              <div className="mt-2 flex flex-col gap-3 text-sm leading-6 text-muted-foreground">
                {section.paragraphs.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
        <p className="mt-8 text-sm text-muted-foreground">
          Questions? <Link to="/contact" className="font-medium text-primary underline underline-offset-4">Contact the NovaTrend team.</Link>
        </p>
      </article>
    </main>
  );
}
