import { createUploadthing } from "uploadthing/express";
import { UploadThingError } from "uploadthing/server";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "./auth.js";
import { prisma } from "./prisma.js";
import { isApprovedSeller } from "./order-rules.js";
import { ROLE } from "./api-constants.js";
const f = createUploadthing();
async function getUserFromReq(headers) {
    const session = await auth.api.getSession({
        headers: fromNodeHeaders(headers),
    });
    return session?.user ?? null;
}
export const uploadRouter = {
    productImageUploader: f({
        image: {
            maxFileSize: "8MB",
            maxFileCount: 5,
        },
    })
        .middleware(async ({ req }) => {
            const user = await getUserFromReq(req.headers);
            if (!user || user.role !== ROLE.SELLER) {
                throw new UploadThingError("Approved seller access required.");
            }
            const seller = await prisma.seller.findUnique({
                where: { userId: user.id },
                select: { approved: true, revokedAt: true },
            });
            if (!isApprovedSeller(seller)) {
                throw new UploadThingError("Approved seller access required.");
            }
            return { userId: user.id };
        })
        .onUploadComplete(({ file }) => {
            console.log("Product image uploaded:", file.name);
            return { url: file.url, name: file.name, size: file.size };
        }),
    avatarUploader: f({
        image: {
            maxFileSize: "2MB",
            maxFileCount: 1,
        },
    })
        .middleware(async ({ req }) => {
            const user = await getUserFromReq(req.headers);
            if (!user) {
                throw new UploadThingError("Sign in to upload an avatar.");
            }
            return { userId: user.id };
        })
        .onUploadComplete(({ file }) => {
            console.log("Avatar uploaded:", file.name);
            return { url: file.url, name: file.name, size: file.size };
        }),
};
