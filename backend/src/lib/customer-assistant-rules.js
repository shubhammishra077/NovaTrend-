const ORDER_TERMS = /\b(?:order|purchase|shipment|delivery|package|parcel)\b/i;
const ORDER_LOOKUP_TERMS = /\b(?:status|track(?:ing)?|where|arriv(?:e|al)|deliver(?:y|ed)?|latest|update)\b/i;
const PERSONAL_ORDER_QUESTION = /\b(?:my|mine)\b.{0,40}\b(?:order|purchase|shipment|delivery|package|parcel)\b/i;
const REFUND_TERMS = /\b(?:refund|return|exchange|send back)\b/i;

export function detectCustomerIntent(question) {
    if (REFUND_TERMS.test(question)) return "refund";
    if (ORDER_TERMS.test(question) && (ORDER_LOOKUP_TERMS.test(question) || PERSONAL_ORDER_QUESTION.test(question))) {
        return "order-status";
    }
    return "general";
}

export const REFUND_POLICY_RESPONSE =
    "Refund requests must be made within 14 days of delivery and include video proof of unboxing. The video is required for review but does not guarantee approval. For order-specific eligibility, include your order reference and delivery date when contacting support.";
