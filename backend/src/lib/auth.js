
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";
import { prisma } from "./prisma.js";
import { ROLE } from "./api-constants.js";
import { ac, buyer, seller, admin as adminRole } from "./permissions.js";
import { sendPasswordResetEmail } from "./emails.js";

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "mongodb",
    }),

    secret: process.env.BETTER_AUTH_SECRET,

    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:5000",

   trustedOrigins: [
  "https://nova-trend-zeta.vercel.app",
],

    emailAndPassword: {
        enabled: true,
        revokeSessionsOnPasswordReset: true,
        sendResetPassword: async ({ user, url }) => {
            await sendPasswordResetEmail({
                to: user.email,
                url,
            });
        },
    },

    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        },
    },

    plugins: [
        admin({
            ac,
            roles: {
                buyer,
                seller,
                admin: adminRole,
            },
            defaultRole: ROLE.BUYER,
        }),
    ],
});
