import { Link } from "react-router";
import { ArrowRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { usePublishedBlogPosts } from "@/hooks/use-blog-posts";

export function meta() {
  return [
    { title: "NovaTrend Blog" },
    { name: "description", content: "News and stories from the NovaTrend marketplace." },
  ];
}

export default function Blog() {
  const { data, isLoading, isError, error, refetch } = usePublishedBlogPosts();
  const posts = data?.posts ?? [];

  return (
    <main className="mx-auto min-h-[60vh] max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
      <header className="mx-auto mb-10 max-w-2xl text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <BookOpen />
        </span>
        <p className="mt-5 text-xs font-semibold tracking-[0.2em] text-primary uppercase">
          The NovaTrend Journal
        </p>
        <h1 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
          Stories, ideas, and inspiration
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Discover seller stories, product guides, and marketplace updates.
        </p>
      </header>

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="overflow-hidden p-0">
              <Skeleton className="aspect-[16/10] w-full rounded-none" />
              <CardContent className="flex flex-col gap-3 p-5">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-14 text-center">
          <p role="alert" className="text-sm text-destructive">
            {error instanceof Error ? error.message : "Stories could not be loaded."}
          </p>
          <Button variant="outline" onClick={() => void refetch()}>Try again</Button>
        </div>
      ) : posts.length === 0 ? (
        <Empty className="border-0 py-16">
          <EmptyMedia variant="icon"><BookOpen /></EmptyMedia>
          <EmptyTitle>No stories published yet</EmptyTitle>
          <EmptyDescription>Check back soon for new stories and updates.</EmptyDescription>
        </Empty>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Card key={post.id} className="overflow-hidden p-0 transition-shadow hover:shadow-md">
              <Link to={`/blog/${encodeURIComponent(post.slug)}`} className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {post.coverImage ? (
                  <img
                    src={post.coverImage}
                    alt=""
                    className="aspect-[16/10] w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="flex aspect-[16/10] items-center justify-center bg-muted text-muted-foreground">
                    <BookOpen className="size-8" />
                  </div>
                )}
                <CardContent className="flex flex-col gap-3 p-5">
                  {post.publishedAt && (
                    <time
                      dateTime={post.publishedAt}
                      className="text-xs tracking-wide text-muted-foreground"
                    >
                      {new Date(post.publishedAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </time>
                  )}
                  <h2 className="font-heading text-xl font-semibold tracking-tight group-hover:text-primary">
                    {post.title}
                  </h2>
                  <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
                    {post.excerpt}
                  </p>
                  <span className="mt-1 inline-flex items-center gap-2 text-sm font-medium text-primary">
                    Read story <ArrowRight />
                  </span>
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
