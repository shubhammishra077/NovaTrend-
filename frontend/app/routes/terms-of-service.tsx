import { LegalPage, type LegalSection } from "@/components/globals/legal-page";

const sections: LegalSection[] = [
  {
    title: "Using the marketplace",
    paragraphs: [
      "NovaTrend provides an online marketplace where customers can browse products and place orders with sellers. You are responsible for keeping your account credentials private and for ensuring that information submitted through your account is accurate.",
      "Access to seller selling features may depend on platform review and approval. Sellers are responsible for their listings and for keeping product descriptions, prices, and availability accurate.",
    ],
  },
  {
    title: "Orders and payments",
    paragraphs: [
      "Product prices are displayed in Indian rupees. An order is subject to availability and the checkout details shown when it is placed. Available payment methods may include Razorpay and cash on delivery where offered at checkout.",
      "Payment processing is provided by third parties and may be subject to their terms. Order status and payment status are displayed in the account where available.",
    ],
  },
  {
    title: "Returns and refunds",
    paragraphs: [
      "Refund requests are subject to the Refund Policy: requests must be made within 14 days after delivery and include video proof of unboxing. See the full Refund Policy for instructions and contact the team with questions.",
    ],
  },
  {
    title: "Marketplace content and availability",
    paragraphs: [
      "Product listings and seller information are provided for marketplace shopping. NovaTrend may update or remove content or features as the service changes. No additional warranty, service-level commitment, or legal jurisdiction is stated in this draft.",
    ],
  },
  {
    title: "Informational draft",
    paragraphs: [
      "These terms are a general informational draft, not legal advice. They should be reviewed and completed by the marketplace owner and qualified counsel before being treated as binding terms.",
    ],
  },
];

export function meta() {
  return [
    { title: "Terms of Service | NovaTrend" },
    { name: "description", content: "Read the draft terms for using the NovaTrend marketplace." },
  ];
}

export default function TermsOfService() {
  return (
    <LegalPage
      title="Terms of Service"
      intro="These draft terms describe basic expectations for using NovaTrend as a customer or seller."
      sections={sections}
    />
  );
}
