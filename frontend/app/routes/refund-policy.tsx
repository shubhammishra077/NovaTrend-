import { LegalPage, type LegalSection } from "@/components/globals/legal-page";

const sections: LegalSection[] = [
  {
    title: "Request window",
    paragraphs: [
      "You must submit a refund request within 14 days of the order’s delivery date. Requests submitted after this period are outside the stated request window.",
    ],
  },
  {
    title: "Required unboxing video",
    paragraphs: [
      "Video proof of unboxing is required with a refund request. Keep the original unboxing video and include it when contacting the support team, along with your order reference and a description of the issue.",
      "The video is required for review but does not itself guarantee that a refund will be approved. The team will review the request and available order details.",
    ],
  },
  {
    title: "How to contact us",
    paragraphs: [
      "Email the NovaTrend team through the Contact page within the 14-day window. Include your order reference, delivery date, reason for the request, and the unboxing video proof. Do not send payment card details.",
    ],
  },
  {
    title: "Policy scope",
    paragraphs: [
      "This policy draft states the confirmed 14-day-from-delivery window and the video-proof requirement. It does not define product exclusions, return shipping costs, refund processing timelines, or other exceptions. Those terms must be reviewed and completed by the marketplace owner before this policy is treated as final.",
    ],
  },
];

export function meta() {
  return [
    { title: "Refund Policy | NovaTrend" },
    { name: "description", content: "Refund requests must be made within 14 days of delivery and include video proof of unboxing." },
  ];
}

export default function RefundPolicy() {
  return (
    <LegalPage
      title="Refund Policy"
      intro="Refund requests must be made within 14 days of delivery and include video proof of unboxing."
      sections={sections}
    />
  );
}
