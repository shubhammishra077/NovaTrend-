import { Router } from "express";
import { requireAuth } from "../middlewares/require-auth.js";
import { requireSeller } from "../middlewares/require-seller.js";
import { inngest } from "../inngest/client.js";
import { prisma } from "../lib/prisma.js";
const router = Router();

async function enqueueInsight(stream, eventName) {
    try {
        await inngest.send({
            name: eventName,
            data: { sellerId: stream.sellerId, streamId: stream.id },
        });
        return true;
    }
    catch (error) {
        console.error(`Failed to queue AI insight event "${eventName}"`, error);
        await prisma.aiInsightStream.update({
            where: { id: stream.id },
            data: {
                status: "error",
                error: "The background job service is unavailable.",
            },
        });
        return false;
    }
}

router.post("/recommendations", requireAuth, requireSeller, async (req, res) => {
    const session = req.session;
    const seller = await prisma.seller.findUnique({
        where: { userId: session.user.id },
    });
    if (!seller) {
        return res.status(404).json({ error: "Seller profile not found" });
    }
    const stream = await prisma.aiInsightStream.create({
        data: {
            sellerId: seller.id,
            type: "recommendations",
            status: "processing",
            chunks: "[]",
        },
    });
    if (!await enqueueInsight(stream, "ai/product-recommendations")) {
        return res.status(503).json({
            error: "AI Insights could not start because the background job service is unavailable.",
        });
    }
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.write("data: " + JSON.stringify({ type: "started" }) + "\n\n");
    let lastChunkIndex = 0;
    let isDone = false;
    const pollInterval = setInterval(async () => {
        try {
            const current = await prisma.aiInsightStream.findUnique({
                where: { id: stream.id },
            });
            if (!current)
                return;
            const chunks = JSON.parse(current.chunks);
            if (chunks.length > lastChunkIndex) {
                const newChunks = chunks.slice(lastChunkIndex);
                for (const chunk of newChunks) {
                    if (chunk) {
                        res.write("data: " + JSON.stringify({ type: "chunk", content: chunk }) + "\n\n");
                    }
                }
                lastChunkIndex = chunks.length;
            }
            if (current.status === "complete" && !isDone) {
                isDone = true;
                clearInterval(pollInterval);
                res.write("data: " + JSON.stringify({ type: "done" }) + "\n\n");
                res.end();
            }
            else if (current.status === "error" && !isDone) {
                isDone = true;
                clearInterval(pollInterval);
                res.write("data: " + JSON.stringify({ type: "error", message: current.error || "Unknown error" }) + "\n\n");
                res.end();
            }
        }
        catch {
            // DB read error, will retry on next poll
        }
    }, 200);
    req.on("close", () => {
        clearInterval(pollInterval);
    });
});
router.post("/feedback-summary", requireAuth, requireSeller, async (req, res) => {
    const session = req.session;
    const seller = await prisma.seller.findUnique({
        where: { userId: session.user.id },
    });
    if (!seller) {
        return res.status(404).json({ error: "Seller profile not found" });
    }
    const stream = await prisma.aiInsightStream.create({
        data: {
            sellerId: seller.id,
            type: "feedback",
            status: "processing",
            chunks: "[]",
        },
    });
    if (!await enqueueInsight(stream, "ai/feedback-summary")) {
        return res.status(503).json({
            error: "AI Insights could not start because the background job service is unavailable.",
        });
    }
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.write("data: " + JSON.stringify({ type: "started" }) + "\n\n");
    let lastChunkIndex = 0;
    let isDone = false;
    const pollInterval = setInterval(async () => {
        try {
            const current = await prisma.aiInsightStream.findUnique({
                where: { id: stream.id },
            });
            if (!current)
                return;
            const chunks = JSON.parse(current.chunks);
            if (chunks.length > lastChunkIndex) {
                const newChunks = chunks.slice(lastChunkIndex);
                for (const chunk of newChunks) {
                    if (chunk) {
                        res.write("data: " + JSON.stringify({ type: "chunk", content: chunk }) + "\n\n");
                    }
                }
                lastChunkIndex = chunks.length;
            }
            if (current.status === "complete" && !isDone) {
                isDone = true;
                clearInterval(pollInterval);
                res.write("data: " + JSON.stringify({ type: "done" }) + "\n\n");
                res.end();
            }
            else if (current.status === "error" && !isDone) {
                isDone = true;
                clearInterval(pollInterval);
                res.write("data: " + JSON.stringify({ type: "error", message: current.error || "Unknown error" }) + "\n\n");
                res.end();
            }
        }
        catch {
            // DB read error, will retry on next poll
        }
    }, 200);
    req.on("close", () => {
        clearInterval(pollInterval);
    });
});
router.get("/history", requireAuth, requireSeller, async (req, res) => {
    const session = req.session;
    const seller = await prisma.seller.findUnique({
        where: { userId: session.user.id },
    });
    if (!seller) {
        return res.status(404).json({ error: "Seller profile not found" });
    }
    const type = req.query.type;
    const insights = await prisma.aiInsight.findMany({
        where: {
            sellerId: seller.id,
            ...(type ? { type } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 20,
    });
    res.json({ insights });
});
export default router;
