import { AlertCircle, Check, Clock3, ShieldCheck, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { toast } from "@/components/ui/toast";
import {
  useAdminDataDeletionRequests,
  useUpdateDataDeletionRequest,
  type DataDeletionRequest,
} from "@/hooks/use-data-deletion-request";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function RequestStatus({ status }: { status: DataDeletionRequest["status"] }) {
  const variant = status === "rejected" ? "destructive" : status === "pending" ? "secondary" : "outline";
  return <Badge variant={variant}>{status}</Badge>;
}

export default function AdminDataDeletionRequests() {
  const { data, isLoading, isError, error, refetch } = useAdminDataDeletionRequests();
  const updateRequest = useUpdateDataDeletionRequest();
  const requests = data?.requests ?? [];

  async function updateStatus(request: DataDeletionRequest, status: "approved" | "rejected" | "completed") {
    try {
      await updateRequest.mutateAsync({ id: request.id, status });
      toast.add({ type: "success", title: "Request updated", description: `Marked ${status}.` });
    } catch (updateError) {
      toast.add({
        type: "error",
        title: "Could not update request",
        description: updateError instanceof Error ? updateError.message : "Please try again.",
      });
    }
  }

  return (
    <main className="mx-auto max-w-6xl space-y-5">
      <div>
        <h1 className="flex items-center gap-2 font-heading text-2xl font-semibold tracking-tight">
          <ShieldCheck className="size-5 text-primary" />
          Data deletion requests
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review requests and record decisions. Approval does not delete account data automatically.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Latest requests</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-24 w-full rounded-xl" />
            ))
          ) : isError ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <AlertCircle className="size-6 text-destructive" />
              <p className="text-sm text-muted-foreground">
                {(error as Error)?.message || "Could not load requests."}
              </p>
              <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
                Retry
              </Button>
            </div>
          ) : requests.length === 0 ? (
            <Empty className="border-0 py-10">
              <EmptyMedia variant="icon"><Clock3 /></EmptyMedia>
              <EmptyTitle>No deletion requests</EmptyTitle>
              <EmptyDescription>New requests from buyers and sellers will appear here.</EmptyDescription>
            </Empty>
          ) : (
            requests.map((request) => (
              <article key={request.id} className="flex flex-col gap-4 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-medium">{request.user?.name || "Account name unavailable"}</h2>
                    <RequestStatus status={request.status} />
                    <Badge variant="outline">{request.userRole}</Badge>
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">{request.user?.email || request.userId}</p>
                  {request.seller && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Store: {request.seller.name}{request.seller.username ? ` (@${request.seller.username})` : ""}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">Submitted {formatDate(request.createdAt)}</p>
                  {request.reviewedAt && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Updated {formatDate(request.reviewedAt)}{request.decisionNote ? ` — ${request.decisionNote}` : ""}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {request.status === "pending" && (
                    <>
                      <Button type="button" size="sm" disabled={updateRequest.isPending} onClick={() => void updateStatus(request, "approved")}>
                        <Check data-icon="inline-start" /> Approve
                      </Button>
                      <Button type="button" size="sm" variant="outline" disabled={updateRequest.isPending} onClick={() => void updateStatus(request, "rejected")}>
                        <X data-icon="inline-start" /> Reject
                      </Button>
                    </>
                  )}
                  {request.status === "approved" && (
                    <Button type="button" size="sm" variant="outline" disabled={updateRequest.isPending} onClick={() => void updateStatus(request, "completed")}>
                      Mark manually completed
                    </Button>
                  )}
                </div>
              </article>
            ))
          )}
        </CardContent>
      </Card>
    </main>
  );
}
