import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { getRequestSession } from "../lib/request-session.js";
import { generateCustomerAssistantResponse } from "../lib/gemini.js";
import { detectCustomerIntent, REFUND_POLICY_RESPONSE } from "../lib/customer-assistant-rules.js";
import { PRODUCT_STATUS } from "../lib/api-constants.js";

const router = Router();
const MAX_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 1200;
const MAX_CONVERSATION_LENGTH = 6000;
function humanizeStatus(value) {
    return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatOrderStatus(orders) {
    if (orders.length === 0) {
        return "I couldn't find any orders linked to this account. If you checked out with a different account, sign in to that account and ask again.";
    }
    const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });
    const orderLines = orders.map((order) => {
        const shortId = order.id.slice(-6);
        const placedDate = new Date(order.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" });
        return `Order ending ${shortId}: status ${humanizeStatus(order.status)}, delivery method ${humanizeStatus(order.deliveryStatus)}, payment ${humanizeStatus(order.paymentStatus)}, placed ${placedDate}, total ${currency.format(order.total)}.`;
    });
    return `Here are your ${orders.length === 1 ? "most recent order" : "most recent orders"}:\n${orderLines.join("\n")}`;
}

router.post("/", async (req, res) => {
    try {
        const { messages } = req.body ?? {};
        if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
            return res.status(400).json({ error: "Send between 1 and 12 chat messages." });
        }
        let conversationLength = 0;
        for (const message of messages) {
            if (!message || !["user", "assistant"].includes(message.role) ||
                typeof message.content !== "string" || !message.content.trim() ||
                message.content.length > MAX_MESSAGE_LENGTH) {
                return res.status(400).json({ error: "Each message must have a valid role and contain 1 to 1200 characters." });
            }
            conversationLength += message.content.length;
        }
        if (conversationLength > MAX_CONVERSATION_LENGTH || messages[messages.length - 1].role !== "user") {
            return res.status(400).json({ error: "The conversation is too long or does not end with a user message." });
        }

        let session;
        try {
            session = await getRequestSession(req);
        }
        catch (error) {
            console.error("Ask AI session lookup failed:", error);
            return res.status(503).json({ error: "Unable to verify your sign-in right now. Please try again." });
        }

        const latestQuestion = messages[messages.length - 1].content;
        const intent = detectCustomerIntent(latestQuestion);
        if (intent === "refund") {
            return res.json({
                reply: REFUND_POLICY_RESPONSE,
                recommendedProducts: [],
                requiresSignIn: false,
            });
        }
        if (!session && intent === "order-status") {
            return res.json({
                reply: "Please sign in to your account so I can securely look up your order status.",
                recommendedProducts: [],
                requiresSignIn: true,
            });
        }

        if (session && intent === "order-status") {
            const orders = await prisma.order.findMany({
                where: { userId: session.user.id },
                select: {
                    id: true,
                    status: true,
                    deliveryStatus: true,
                    paymentStatus: true,
                    createdAt: true,
                    total: true,
                },
                orderBy: { createdAt: "desc" },
                take: 5,
            });
            return res.json({
                reply: formatOrderStatus(orders),
                recommendedProducts: [],
                requiresSignIn: false,
            });
        }

        const approvedSellers = await prisma.seller.findMany({
            where: { approved: true, revokedAt: null },
            select: { id: true },
        });
        const approvedSellerIds = approvedSellers.map((seller) => seller.id);
        const products = approvedSellerIds.length
            ? await prisma.product.findMany({
                where: { status: PRODUCT_STATUS.ACTIVE, sellerId: { in: approvedSellerIds } },
                select: {
                    id: true,
                    name: true,
                    category: true,
                    price: true,
                    discount: true,
                },
                orderBy: { createdAt: "desc" },
                take: 30,
            })
            : [];
        let generated;
        try {
            generated = await generateCustomerAssistantResponse({
                messages: [messages[messages.length - 1]],
                products,
            });
        }
        catch (error) {
            console.error("Ask AI provider request failed:", error);
            if (error instanceof Error && error.message === "GEMINI_API_KEY is not set in environment variables") {
                return res.status(503).json({ error: "Ask AI is not configured yet." });
            }
            return res.status(502).json({ error: "Ask AI is temporarily unavailable. Please try again." });
        }

        let parsed;
        try {
            parsed = JSON.parse(generated);
        }
        catch {
            console.error("Ask AI returned an invalid JSON response.");
            return res.status(502).json({ error: "The assistant could not create a response. Please try again." });
        }
        if (!parsed || typeof parsed.reply !== "string" || !parsed.reply.trim() || !Array.isArray(parsed.recommendedProductIds)) {
            console.error("Ask AI returned a response with an invalid shape.");
            return res.status(502).json({ error: "The assistant could not create a response. Please try again." });
        }
        const productById = new Map(products.map((product) => [product.id, product]));
        const recommendedProducts = [...new Set(parsed.recommendedProductIds)]
            .filter((id) => typeof id === "string" && productById.has(id))
            .slice(0, 4)
            .map((id) => productById.get(id));

        return res.json({
            reply: parsed.reply.slice(0, 3000),
            recommendedProducts,
            requiresSignIn: false,
        });
    }
    catch (error) {
        console.error("Ask AI request failed:", error);
        return res.status(500).json({ error: "Ask AI could not complete this request. Please try again." });
    }
});

export default router;
