import { useState } from "react";
import { BookOpen, LoaderCircle, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import {
  useAdminBlogPosts,
  useDeleteBlogPost,
  useSaveBlogPost,
  type BlogPost,
  type BlogPostInput,
} from "@/hooks/use-blog-posts";

const blankPost: BlogPostInput = {
  title: "",
  excerpt: "",
  coverImage: null,
  content: "",
  status: "draft",
};

export default function AdminBlog() {
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [form, setForm] = useState<BlogPostInput>(blankPost);
  const { data, isLoading, isError, error, refetch } = useAdminBlogPosts();
  const savePost = useSaveBlogPost();
  const deletePost = useDeleteBlogPost();
  const posts = data?.posts ?? [];

  function resetForm() {
    setEditingPost(null);
    setForm(blankPost);
  }

  function editPost(post: BlogPost) {
    setEditingPost(post);
    setForm({
      title: post.title,
      excerpt: post.excerpt,
      coverImage: post.coverImage,
      content: post.content ?? "",
      status: post.status ?? "draft",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitPost(status: "draft" | "published") {
    try {
      await savePost.mutateAsync({
        ...form,
        coverImage: form.coverImage?.trim() || null,
        status,
        ...(editingPost ? { id: editingPost.id } : {}),
      });
      toast.add({
        type: "success",
        title: editingPost ? "Story updated" : "Story created",
        description: status === "published" ? "Your story is live." : "Saved as a draft.",
      });
      resetForm();
    } catch (saveError) {
      toast.add({
        type: "error",
        title: "Could not save story",
        description: saveError instanceof Error ? saveError.message : "Please try again.",
      });
    }
  }

  async function handleDelete(post: BlogPost) {
    if (!window.confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    try {
      await deletePost.mutateAsync(post.id);
      if (editingPost?.id === post.id) resetForm();
      toast.add({ type: "success", title: "Story deleted" });
    } catch (deleteError) {
      toast.add({
        type: "error",
        title: "Could not delete story",
        description: deleteError instanceof Error ? deleteError.message : "Please try again.",
      });
    }
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-xl">
            {editingPost ? <Pencil /> : <Plus />}
            {editingPost ? "Edit story" : "Write a story"}
          </CardTitle>
          <CardDescription>
            Write a plain-text article. New stories are drafts until published.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-5"
            onSubmit={(event) => {
              event.preventDefault();
              void submitPost("draft");
            }}
          >
            <FieldGroup className="gap-5">
              <Field>
                <FieldLabel htmlFor="blog-title">Title</FieldLabel>
                <Input
                  id="blog-title"
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  maxLength={300}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="blog-excerpt">Excerpt</FieldLabel>
                <Textarea
                  id="blog-excerpt"
                  value={form.excerpt}
                  onChange={(event) => setForm({ ...form, excerpt: event.target.value })}
                  maxLength={1000}
                  rows={3}
                  required
                  className="min-h-20 resize-y rounded-md border border-input px-3"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="blog-cover">Cover image URL (optional)</FieldLabel>
                <Input
                  id="blog-cover"
                  type="url"
                  value={form.coverImage ?? ""}
                  onChange={(event) =>
                    setForm({ ...form, coverImage: event.target.value || null })
                  }
                  placeholder="https://..."
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="blog-content">Article</FieldLabel>
                <Textarea
                  id="blog-content"
                  value={form.content}
                  onChange={(event) => setForm({ ...form, content: event.target.value })}
                  maxLength={100000}
                  rows={14}
                  required
                  className="min-h-72 resize-y rounded-md border border-input px-3"
                />
              </Field>
            </FieldGroup>
            <div className="flex flex-wrap justify-end gap-2">
              {editingPost && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                variant="outline"
                disabled={savePost.isPending || deletePost.isPending}
              >
                Save draft
              </Button>
              <Button
                type="button"
                disabled={savePost.isPending || deletePost.isPending}
                onClick={() => void submitPost("published")}
              >
                {savePost.isPending ? (
                  <LoaderCircle className="animate-spin" data-icon="inline-start" />
                ) : (
                  <Send data-icon="inline-start" />
                )}
                Publish
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="h-fit overflow-hidden">
        <CardHeader>
          <CardTitle className="font-heading text-xl">Stories</CardTitle>
          <CardDescription>Manage drafts and published posts.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 rounded-lg border p-4">
                <Skeleton className="size-14 rounded-md" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))
          ) : isError ? (
            <div className="flex flex-col items-start gap-3 rounded-lg border p-5">
              <p className="text-sm text-destructive">
                {error instanceof Error ? error.message : "Could not load stories."}
              </p>
              <Button variant="outline" size="sm" onClick={() => void refetch()}>
                Retry
              </Button>
            </div>
          ) : posts.length === 0 ? (
            <Empty className="border-0 py-10">
              <EmptyMedia variant="icon"><BookOpen /></EmptyMedia>
              <EmptyTitle>No stories yet</EmptyTitle>
              <EmptyDescription>Create your first blog story using the editor.</EmptyDescription>
            </Empty>
          ) : (
            posts.map((post) => (
              <article
                key={post.id}
                className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center"
              >
                {post.coverImage ? (
                  <img
                    src={post.coverImage}
                    alt=""
                    className="size-14 shrink-0 rounded-md object-cover"
                  />
                ) : (
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <BookOpen />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-medium">{post.title}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {post.status === "published" ? "Published" : "Draft"}
                    {" · "}
                    {new Date(post.updatedAt ?? post.publishedAt ?? Date.now()).toLocaleDateString()}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{post.excerpt}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {post.status === "published" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={savePost.isPending}
                      onClick={() => {
                        void savePost.mutateAsync({ id: post.id, status: "draft" })
                          .then(() => toast.add({ type: "success", title: "Story unpublished" }))
                          .catch((error: unknown) =>
                            toast.add({
                              type: "error",
                              title: "Could not unpublish story",
                              description: error instanceof Error ? error.message : "Please try again.",
                            }),
                          );
                      }}
                    >
                      Unpublish
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={savePost.isPending}
                      onClick={() => {
                        void savePost.mutateAsync({ id: post.id, status: "published" })
                          .then(() => toast.add({ type: "success", title: "Story published" }))
                          .catch((error: unknown) =>
                            toast.add({
                              type: "error",
                              title: "Could not publish story",
                              description: error instanceof Error ? error.message : "Please try again.",
                            }),
                          );
                      }}
                    >
                      Publish
                    </Button>
                  )}
                  <Button variant="outline" size="icon-sm" aria-label={`Edit ${post.title}`} onClick={() => editPost(post)}>
                    <Pencil />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label={`Delete ${post.title}`}
                    disabled={deletePost.isPending}
                    onClick={() => void handleDelete(post)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </article>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
