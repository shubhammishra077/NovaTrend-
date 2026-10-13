import { useEffect } from "react";
import { Link, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, Clock, XCircle, Package, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useCartStore } from "@/stores/cart";
import { formatCurrency } from "@/lib/currency";

export default function OrderConfirmation() {
  const { id } = useParams();
  const clearCart = useCartStore((s) => s.clearCart);

  const { data, isLoading, isError, isRefetchError, refetch } = useQuery({
    queryKey: ["order", id],
    enabled: !!id,
    queryFn: () => api.get<{ order: { id: string; status: string; paymentStatus: string; paymentMethod: string; total: number; subtotal: number; discount: number; deliveryFee: number; deliveryStatus: string; phoneNumber: string; addressSnapshot: unknown; promoCode: string | null; createdAt: string; items: { productId: string; quantity: number; price: number }[] } }>(`/api/orders/${id}`),
    refetchInterval: (query) => {
      const order = query.state.data?.order;
      return order?.paymentMethod === "razorpay" && order.paymentStatus === "pending" && query.state.dataUpdateCount < 24
        ? 5000
        : false;
    },
  });

  useEffect(() => {
    if (data?.order?.paymentStatus === "paid" || data?.order?.paymentMethod === "cod") {
      clearCart();
    }
  }, [data, clearCart]);

  if (isLoading) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <Skeleton className="h-32 rounded-2xl" />
      </main>
    );
  }
  if ((isError && !data) || !data?.order) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <XCircle className="mx-auto size-10 text-destructive" />
        <h1 className="mt-4 font-heading text-xl font-semibold">Order not found</h1>
        <Button className="mt-6 rounded-full" render={<Link to="/shop" />}>Back to shop</Button>
      </main>
    );
  }

  const order = data.order;
  const isPaid = order.paymentStatus === "paid";
  const isPending = order.paymentStatus === "pending" && ["razorpay", "stripe"].includes(order.paymentMethod);
  const currency = order.paymentMethod === "stripe" ? "USD" : "INR";

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Card className="overflow-hidden rounded-2xl">
        <CardHeader className="items-center text-center">
          <span className={`flex size-14 items-center justify-center rounded-full ${isPaid || order.paymentMethod === "cod" ? "bg-emerald-500/10 text-emerald-600" : isPending ? "bg-amber-500/10 text-amber-600" : "bg-destructive/10 text-destructive"}`}>
            {isPaid || order.paymentMethod === "cod" ? <CheckCircle className="size-7" /> : isPending ? <Clock className="size-7" /> : <XCircle className="size-7" />}
          </span>
          <CardTitle className="mt-2 text-center">
            {order.paymentMethod === "cod" ? "Order confirmed" : isPaid ? "Payment successful" : isPending ? "Payment pending" : "Payment failed"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">Order #{order.id.slice(-6)} • {new Date(order.createdAt).toLocaleString()}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl bg-muted/40 p-4 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span className="capitalize">{order.deliveryStatus}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Payment</span><span className="capitalize">{order.paymentMethod} • {order.paymentStatus}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{order.phoneNumber}</span></div>
            {order.promoCode && <div className="flex justify-between"><span className="text-muted-foreground">Promo</span><span>{order.promoCode}</span></div>}
          </div>
          {isPending && (
            <div role="status" aria-live="polite" className="rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">
              We are confirming this payment with Razorpay. Keep this page open; the status will refresh automatically.
            </div>
          )}
          {isRefetchError && (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/40 p-3 text-sm">
              <span className="text-muted-foreground">Could not refresh this order status.</span>
              <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
                Retry
              </Button>
            </div>
          )}
          <Separator />
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(order.subtotal, currency)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span>{formatCurrency(order.deliveryFee, currency)}</span></div>
            {order.discount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span>-{formatCurrency(order.discount, currency)}</span></div>}
            <div className="flex justify-between font-semibold"><span>Total</span><span>{formatCurrency(order.total, currency)}</span></div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button className="flex-1 rounded-full" render={<Link to="/shop" />}>
              Continue shopping <ArrowRight data-icon="inline-end" />
            </Button>
            <Button variant="outline" className="flex-1 rounded-full" render={<Link to="/" />}>
              <Package data-icon="inline-start" /> Home
            </Button>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            {order.paymentMethod === "razorpay"
              ? "Razorpay confirms online payments after server verification."
              : order.paymentMethod === "stripe"
                ? "Historical Stripe order amounts are displayed in USD."
                : "COD payment stays pending until delivery."}
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
