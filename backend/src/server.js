import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { toNodeHandler } from "better-auth/node";
import { createRouteHandler } from "uploadthing/express";
import { serve } from "inngest/express";
import { handleRazorpayWebhook } from "./routes/razorpay-webhook.js";
import { handleApiError, notFoundApiHandler } from "./lib/api-response.js";
import { auth } from "./lib/auth.js";
import { getRequestSession } from "./lib/request-session.js";
import { uploadRouter } from "./lib/uploadthing.js";
import { inngest, functions } from "./inngest/index.js";
import sellerRoutes from "./routes/seller.js";
import filesRoutes from "./routes/files.js";
import productRoutes from "./routes/product.js";
import orderRoutes from "./routes/order.js";
import promoRoutes from "./routes/promo.js";
import reviewRoutes from "./routes/review.js";
import userRoutes from "./routes/user.js";
import adminRoutes from "./routes/admin.js";
import aiInsightsRoutes from "./routes/ai-insights.js";
import { adminBlogPostsRouter, publicBlogPostsRouter } from "./routes/blog-posts.js";
import askAiRoutes from "./routes/ask-ai.js";
const app = express();
const PORT = process.env.PORT || 5000;

const FRONTEND_URLS = [
    "https://nova-trend-zeta.vercel.app",
    "http://localhost:5173",
    ...(process.env.FRONTEND_URL
        ? process.env.FRONTEND_URL.split(",").map(url => url.trim().replace(/\/$/, ""))
        : []),
];

app.use(helmet());

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || FRONTEND_URLS.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error(`CORS origin not allowed: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
}));

app.use(morgan("dev"));
app.all("/api/auth/*splat", toNodeHandler(auth));
app.post("/api/webhooks/razorpay", express.raw({ type: "application/json" }), handleRazorpayWebhook);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use("/api/inngest", serve({ client: inngest, functions }));
app.use("/api/uploadthing", createRouteHandler({ router: uploadRouter }));
app.get("/", (_req, res) => {
    res.status(200).json({ message: "API is running", status: "ok" });
});
app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});
app.get("/api/me", async (req, res) => {
    const session = await getRequestSession(req);
    return res.json(session);
});
app.use("/api/seller", sellerRoutes);
app.use("/api/files", filesRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/promos", promoRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin/blog-posts", adminBlogPostsRouter);
app.use("/api/seller/ai-insights", aiInsightsRoutes);
app.use("/api/blog-posts", publicBlogPostsRouter);
app.use("/api/ask-ai", askAiRoutes);
app.use("/api", notFoundApiHandler);
app.use(handleApiError);
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
export default app;
