import { Link, useParams } from "react-router";
import { ArrowLeft, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePublishedBlogPost } from "@/hooks/use-blog-posts";

export function meta() {
  return [
    { title: "Story — NovaTrend Journal" },
    { name: "description", content: "Read a story from the NovaTrend Journal." },
  ];
}

export default function BlogPost() {
  const { slug = "" } = useParams();
  const { data, isLoading, isError, error, refetch } = usePublishedBlogPost(slug);
  const post = data?.post;

  if (isLoading) {
    return (
      <main className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-12 sm:px-6">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="aspect-[16/9] w-full" />
        <Skeleton className="h-40 w-full" />
      </main>
    );
  }

  if (isError || !post) {
    return (
      <main className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
        <BookOpen className="size-8 text-muted-foreground" />
        <h1 className="font-heading text-2xl font-semibold">Story unavailable</h1>
        <p role="alert" className="text-sm text-muted-foreground">
          {isError && error instanceof Error ? error.message : "This story may have been removed or unpublished."}
        </p>
        {isError && <Button variant="outline" onClick={() => void refetch()}>Try again</Button>}
        <Button variant="link" render={<Link to="/blog" />}>
          <ArrowLeft data-icon="inline-start" /> Back to the journal
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Button variant="link" render={<Link to="/blog" />} className="mb-8 px-0">
        <ArrowLeft data-icon="inline-start" /> Back to the journal
      </Button>
      <article>
        <header className="flex flex-col gap-4">
          {post.publishedAt && (
            <time dateTime={post.publishedAt} className="text-sm text-muted-foreground">
              {new Date(post.publishedAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
          )}
          <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            {post.title}
          </h1>
          <p className="text-lg leading-7 text-muted-foreground">{post.excerpt}</p>
          {post.coverImage && (
            <img
              src={post.coverImage}
              alt=""
              className="mt-3 max-h-[480px] w-full rounded-xl object-cover"
            />
          )}
        </header>
        <div className="mt-10 whitespace-pre-wrap text-base leading-8 text-foreground">
          {post.content}
        </div>
      </article>
    </main>
  );
}
