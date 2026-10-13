import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middlewares/require-auth.js";
import { requireAdmin } from "../middlewares/require-admin.js";
import { BLOG_STATUS } from "../lib/api-constants.js";

const adminRouter = Router();
const publicRouter = Router();

function slugify(value) {
    return value
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 100) || "story";
}

function validatePost(body, partial = false) {
    const fields = ["title", "excerpt", "content", "coverImage"];
    const values = {};
    for (const field of fields) {
        const value = body[field];
        if (value === undefined && partial) continue;
        if (field === "coverImage" && (value === undefined || value === "" || value === null)) {
            values.coverImage = null;
            continue;
        }
        if (typeof value !== "string") {
            return { error: `${field} must be a string` };
        }
        const trimmed = value.trim();
        if (field !== "coverImage" && !trimmed) {
            return { error: `${field} is required` };
        }
        const maxLength = field === "content" ? 100000 : field === "excerpt" ? 1000 : 300;
        if (trimmed.length > maxLength) {
            return { error: `${field} must be ${maxLength} characters or fewer` };
        }
        if (field === "coverImage" && trimmed) {
            try {
                const url = new URL(trimmed);
                if (url.protocol !== "http:" && url.protocol !== "https:") {
                    return { error: "Cover image URL must use HTTP or HTTPS" };
                }
            }
            catch {
                return { error: "Cover image URL must be a valid URL" };
            }
        }
        values[field] = trimmed || null;
    }
    if (body.status !== undefined) {
        if (body.status !== BLOG_STATUS.DRAFT && body.status !== BLOG_STATUS.PUBLISHED) {
            return { error: "Status must be draft or published" };
        }
        values.status = body.status;
    }
    return { values };
}

async function uniqueSlug(title, excludeId) {
    const base = slugify(title);
    let slug = base;
    let suffix = 2;
    while (true) {
        const existing = await prisma.blogPost.findUnique({ where: { slug } });
        if (!existing || existing.id === excludeId) return slug;
        slug = `${base}-${suffix++}`;
    }
}

adminRouter.use(requireAuth, requireAdmin);

adminRouter.get("/", async (_req, res) => {
    try {
        const posts = await prisma.blogPost.findMany({
            orderBy: { updatedAt: "desc" },
            include: { author: { select: { id: true, name: true, email: true } } },
        });
        return res.json({ posts });
    }
    catch (error) {
        console.error("List admin blog posts error:", error);
        return res.status(500).json({ error: "Failed to load blog posts" });
    }
});

adminRouter.post("/", async (req, res) => {
    try {
        const { values, error } = validatePost(req.body);
        if (error) return res.status(400).json({ error });
        const slug = await uniqueSlug(values.title);
        const post = await prisma.blogPost.create({
            data: {
                ...values,
                slug,
                authorId: req.session.user.id,
                ...(values.status === BLOG_STATUS.PUBLISHED ? { publishedAt: new Date() } : {}),
            },
        });
        return res.status(201).json({ post });
    }
    catch (error) {
        console.error("Create blog post error:", error);
        if (error?.code === "P2002") {
            return res.status(409).json({ error: "A story with this title already exists. Try again." });
        }
        return res.status(500).json({ error: "Failed to create blog post" });
    }
});

adminRouter.patch("/:id", async (req, res) => {
    try {
        const id = String(req.params.id);
        const existing = await prisma.blogPost.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ error: "Blog post not found" });

        const { values, error } = validatePost(req.body, true);
        if (error) return res.status(400).json({ error });
        if (Object.keys(values).length === 0) {
            return res.status(400).json({ error: "No changes provided" });
        }

        const data = { ...values };
        if (values.title && values.title !== existing.title) {
            data.slug = await uniqueSlug(values.title, id);
        }
        if (values.status === BLOG_STATUS.PUBLISHED && existing.status !== BLOG_STATUS.PUBLISHED) {
            data.publishedAt = new Date();
        }
        if (values.status === BLOG_STATUS.DRAFT) {
            data.publishedAt = null;
        }
        const post = await prisma.blogPost.update({ where: { id }, data });
        return res.json({ post });
    }
    catch (error) {
        console.error("Update blog post error:", error);
        if (error?.code === "P2002") {
            return res.status(409).json({ error: "A story with this title already exists. Try a different title." });
        }
        return res.status(500).json({ error: "Failed to update blog post" });
    }
});

adminRouter.delete("/:id", async (req, res) => {
    try {
        const id = String(req.params.id);
        await prisma.blogPost.delete({ where: { id } });
        return res.json({ success: true });
    }
    catch (error) {
        console.error("Delete blog post error:", error);
        if (error?.code === "P2025") {
            return res.status(404).json({ error: "Blog post not found" });
        }
        return res.status(500).json({ error: "Failed to delete blog post" });
    }
});

publicRouter.get("/", async (_req, res) => {
    try {
        const posts = await prisma.blogPost.findMany({
            where: { status: BLOG_STATUS.PUBLISHED },
            orderBy: { publishedAt: "desc" },
            select: {
                id: true,
                title: true,
                slug: true,
                excerpt: true,
                coverImage: true,
                publishedAt: true,
            },
        });
        return res.json({ posts });
    }
    catch (error) {
        console.error("List published blog posts error:", error);
        return res.status(500).json({ error: "Failed to load blog stories" });
    }
});

publicRouter.get("/:slug", async (req, res) => {
    try {
        const post = await prisma.blogPost.findFirst({
            where: { slug: String(req.params.slug), status: BLOG_STATUS.PUBLISHED },
            select: {
                id: true,
                title: true,
                slug: true,
                excerpt: true,
                coverImage: true,
                content: true,
                publishedAt: true,
                author: { select: { name: true } },
            },
        });
        if (!post) return res.status(404).json({ error: "Blog story not found" });
        return res.json({ post });
    }
    catch (error) {
        console.error("Get published blog post error:", error);
        return res.status(500).json({ error: "Failed to load blog story" });
    }
});

export { adminRouter as adminBlogPostsRouter, publicRouter as publicBlogPostsRouter };
