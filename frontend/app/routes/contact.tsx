import { Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function meta() {
  return [
    { title: "Contact NovaTrend" },
    { name: "description", content: "Get in touch with the NovaTrend team." },
  ];
}

const adminEmail = "shubhammishra88044@gmail.com";

export default function Contact() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-4xl flex-col items-center justify-center px-4 py-20 text-center sm:px-6">
      <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <MessageCircle className="size-7" />
      </span>
      <p className="mt-6 text-xs font-semibold tracking-[0.2em] text-primary uppercase">Contact</p>
      <h1 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">How can we help?</h1>
      <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
        For questions about NovaTrend, your account, or the marketplace, email our team. Please include enough detail to help us understand your request.
      </p>
      <Button className="mt-7 rounded-full" render={<a href={`mailto:${adminEmail}`} />}>
        <Mail className="size-4" data-icon="inline-start" />
        {adminEmail}
      </Button>
    </main>
  );
}
