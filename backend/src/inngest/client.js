import { Inngest } from "inngest";

export const inngest = new Inngest({
    id: "ecommerce",
    eventKey: process.env.INNGEST_EVENT_KEY,
});