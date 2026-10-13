import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";
import { ac, buyer, seller, admin } from "@/lib/permissions";
import { API_BASE } from "@/lib/api";

export const authClient = createAuthClient({
  baseURL: API_BASE || undefined,
  plugins: [
    adminClient({
      ac,
      roles: {
        buyer,
        seller,
        admin,
      },
    }),
  ],
});
