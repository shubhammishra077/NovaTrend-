import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string | null;
  content?: string;
  status?: "draft" | "published";
  createdAt?: string;
  updatedAt?: string;
  publishedAt: string | null;
  author?: { id?: string; name: string | null; email?: string };
}

export interface BlogPostInput {
  title: string;
  excerpt: string;
  coverImage: string | null;
  content: string;
  status?: "draft" | "published";
}

export function usePublishedBlogPosts() {
  return useQuery({
    queryKey: ["blog-posts"],
    queryFn: () => api.get<{ posts: BlogPost[] }>("/api/blog-posts"),
  });
}

export function usePublishedBlogPost(slug: string) {
  return useQuery({
    queryKey: ["blog-post", slug],
    queryFn: () =>
      api.get<{ post: BlogPost }>(`/api/blog-posts/${encodeURIComponent(slug)}`),
  });
}

export function useAdminBlogPosts() {
  return useQuery({
    queryKey: ["admin-blog-posts"],
    queryFn: () =>
      api.get<{ posts: BlogPost[] }>("/api/admin/blog-posts"),
  });
}

export function useSaveBlogPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      variables:
        | (BlogPostInput & { id?: never })
        | (Partial<BlogPostInput> & { id: string }),
    ) => {
      const { id, ...input } = variables;
      return id
        ? api.patch<{ post: BlogPost }>(`/api/admin/blog-posts/${id}`, input)
        : api.post<{ post: BlogPost }>("/api/admin/blog-posts", input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      queryClient.invalidateQueries({ queryKey: ["blog-posts"] });
      queryClient.invalidateQueries({ queryKey: ["blog-post"] });
    },
  });
}

export function useDeleteBlogPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ success: boolean }>(`/api/admin/blog-posts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      queryClient.invalidateQueries({ queryKey: ["blog-posts"] });
      queryClient.invalidateQueries({ queryKey: ["blog-post"] });
    },
  });
}
