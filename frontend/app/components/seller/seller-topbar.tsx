import { LogOut, User } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { useWishlistStore } from "@/stores/wishlist";
import { ThemeToggle } from "@/components/globals/theme-toggle";

export function SellerTopbar() {
  const { data: session } = authClient.useSession();
  const user = session?.user;
  const clearWishlist = useWishlistStore((s) => s.clear);

  const handleSignOut = async () => {
    await authClient.signOut();
    clearWishlist();
    window.location.href = "/";
  };

  return (
    <header className="flex h-14 items-center gap-2 border-b border-border px-4">
      <SidebarTrigger />

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <ThemeToggle />
        {user?.image ? (
          <img
            src={user.image}
            alt={user.name || "User"}
            className="size-7 rounded-full object-cover"
          />
        ) : (
          <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
            {user?.name?.charAt(0).toUpperCase() || "U"}
          </span>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleSignOut}
          aria-label="Sign out"
        >
          <LogOut className="size-4" />
        </Button>
      </div>
    </header>
  );
}
