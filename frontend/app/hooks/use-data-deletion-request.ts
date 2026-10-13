import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface DataDeletionRequest {
  id: string;
  userId: string;
  userRole: string;
  status: "pending" | "approved" | "rejected" | "completed";
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  decisionNote: string | null;
  user?: { id: string; name: string | null; email: string } | null;
  seller?: { name: string; username: string | null } | null;
}

export function useMyDataDeletionRequest() {
  return useQuery({
    queryKey: ["my-data-deletion-request"],
    queryFn: () => api.get<{ request: DataDeletionRequest | null }>("/api/user/data-deletion-request"),
  });
}

export function useSubmitDataDeletionRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ request: DataDeletionRequest }>("/api/user/data-deletion-request"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-data-deletion-request"] }),
  });
}

export function useAdminDataDeletionRequests() {
  return useQuery({
    queryKey: ["admin-data-deletion-requests"],
    queryFn: () => api.get<{ requests: DataDeletionRequest[] }>("/api/admin/data-deletion-requests"),
  });
}

export function useUpdateDataDeletionRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "approved" | "rejected" | "completed" }) =>
      api.patch<{ request: DataDeletionRequest }>(`/api/admin/data-deletion-requests/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-data-deletion-requests"] }),
  });
}
