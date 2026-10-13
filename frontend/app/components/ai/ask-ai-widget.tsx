import { useState, type FormEvent, type KeyboardEvent } from "react";
import { Link } from "react-router";
import { Bot, LoaderCircle, MessageCircle, Send, Sparkles, X } from "lucide-react";
import {
  Message,
  MessageContent,
} from "@/components/ui/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/currency";
import {
  sendAskAiQuestion,
  type RecommendedProduct,
} from "@/hooks/use-ask-ai";

interface ChatMessage {
  role: "assistant" | "user";
  content: string;
  products?: RecommendedProduct[];
  requiresSignIn?: boolean;
}

const SUGGESTED_QUESTIONS = [
  "Recommend a gift",
  "Where is my order?",
  "What is your refund policy?",
];

export function AskAiWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hi! Ask me about your order status, refund guidance, or product suggestions.",
    },
  ]);

  async function sendMessage(question: string) {
    const content = question.trim();
    if (!content || isPending) return;

    setMessages((current) => [...current, { role: "user", content }]);
    setDraft("");
    setError("");
    setIsPending(true);

    try {
      const response = await sendAskAiQuestion(content);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: response.reply,
          products: response.recommendedProducts,
          requiresSignIn: response.requiresSignIn,
        },
      ]);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Ask AI is temporarily unavailable. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(draft);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <div className="fixed bottom-5 right-5 z-40">
        <PopoverTrigger
          render={
            <Button className="rounded-full shadow-lg" aria-label="Open Ask AI chat" aria-expanded={isOpen}>
              <MessageCircle data-icon="inline-start" />
              Ask AI
            </Button>
          }
        />
      </div>
      <PopoverContent
        side="top"
        align="end"
        sideOffset={12}
        className="h-[min(620px,calc(100dvh-6rem))] w-[min(380px,calc(100vw-2rem))] gap-0 overflow-hidden rounded-2xl border border-border bg-card p-0 shadow-xl"
      >
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles />
            </span>
            <div className="min-w-0">
              <PopoverTitle>Ask AI</PopoverTitle>
              <p className="truncate text-xs text-muted-foreground">Product help and order status</p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Close Ask AI chat"
            onClick={() => setIsOpen(false)}
          >
            <X />
          </Button>
        </header>

        <MessageScrollerProvider autoScroll>
          <MessageScroller className="h-auto min-h-0 flex-1">
            <MessageScrollerViewport>
              <MessageScrollerContent className="gap-4 p-4">
                {messages.map((message, index) => (
                  <MessageScrollerItem
                    key={`${message.role}-${index}`}
                    messageId={String(index)}
                    scrollAnchor={message.role === "user"}
                  >
                    <Message align={message.role === "user" ? "end" : "start"}>
                      <MessageContent>
                        <Bubble
                          align={message.role === "user" ? "end" : "start"}
                          variant={message.role === "user" ? "default" : "muted"}
                          className="max-w-full"
                        >
                          <BubbleContent className="whitespace-pre-wrap">
                            {message.content}
                          </BubbleContent>
                        </Bubble>
                        {message.requiresSignIn && (
                          <Link
                            to="/login"
                            className="text-sm font-medium text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
                          >
                            Sign in to view your orders
                          </Link>
                        )}
                        {message.products?.map((product) => (
                          <Link
                            key={product.id}
                            to={`/product/${product.id}`}
                            className="flex max-w-full items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2 text-sm transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                          >
                            <span className="min-w-0">
                              <span className="block truncate font-medium">{product.name}</span>
                              <span className="block truncate text-xs text-muted-foreground">{product.category}</span>
                            </span>
                            <span className="shrink-0 font-medium">
                              {formatCurrency(product.price * (1 - product.discount / 100))}
                            </span>
                          </Link>
                        ))}
                      </MessageContent>
                    </Message>
                  </MessageScrollerItem>
                ))}
                {isPending && (
                  <MessageScrollerItem messageId="thinking">
                    <Message>
                      <MessageContent>
                        <Bubble variant="muted">
                          <BubbleContent className="flex items-center gap-2 text-muted-foreground">
                            <Bot />
                            Thinking…
                          </BubbleContent>
                        </Bubble>
                      </MessageContent>
                    </Message>
                  </MessageScrollerItem>
                )}
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton />
          </MessageScroller>
        </MessageScrollerProvider>

        <div className="border-t border-border p-3">
          {messages.length === 1 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((question) => (
                <Button
                  key={question}
                  type="button"
                  variant="outline"
                  size="xs"
                  disabled={isPending}
                  onClick={() => void sendMessage(question)}
                  className="rounded-full normal-case tracking-normal"
                >
                  {question}
                </Button>
              ))}
            </div>
          )}
          {error && <p role="alert" className="mb-2 text-xs text-destructive">{error}</p>}
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={1200}
              rows={1}
              aria-label="Ask a question"
              placeholder="Ask about products or your order…"
              disabled={isPending}
              className="max-h-24 min-h-10 rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
            <Button
              type="submit"
              size="icon"
              aria-label="Send message"
              disabled={isPending || !draft.trim()}
            >
              {isPending ? <LoaderCircle className="animate-spin" /> : <Send />}
            </Button>
          </form>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Refund policy details? <Link to="/contact" className="underline underline-offset-2">Contact support</Link>
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
