import { LegalPage, type LegalSection } from "@/components/globals/legal-page";

const sections: LegalSection[] = [
  {
    title: "Information handled by the marketplace",
    paragraphs: [
      "When you use NovaTrend, the service may handle account details such as your name, email address, profile image, and sign-in information; contact and delivery details you choose to save; and order, payment-status, review, and seller-store information needed to operate the marketplace.",
      "The site may store cart and wishlist preferences in your browser. Do not include sensitive personal or payment information in product reviews or messages to Ask AI.",
    ],
  },
  {
    title: "How information is used",
    paragraphs: [
      "Information is used to provide account access, display profiles and marketplace listings, process and track orders, support payments, manage seller accounts, respond to support requests, and maintain the service.",
      "Ask AI uses the latest question and a limited set of public product-catalog details to answer general questions and suggest products. Order-status questions are handled by the application using the signed-in account’s own order records; order records are not sent to the AI provider. Ask AI conversations are kept in the current page session and are not stored by the application.",
    ],
  },
  {
    title: "Service providers and sharing",
    paragraphs: [
      "NovaTrend uses third-party services for authentication, payment processing, email, AI responses, file uploads, and database hosting. Information necessary for a requested feature may be processed by those providers under their own terms and privacy practices. Payment card details are handled by the payment provider and are not collected in the Ask AI chat.",
      "Information may also be shared when needed to fulfill a marketplace transaction—for example, relevant order and delivery details with the seller—or when required to protect the service or comply with a valid legal obligation. This draft does not specify provider retention periods.",
    ],
  },
  {
    title: "Your choices and requests",
    paragraphs: [
      "You can review and update available profile, address, and phone details in your account. Buyers and sellers can submit an account data-deletion request from the profile page. Submitting a request does not immediately remove the account or records; an administrator reviews and records a decision, and any deletion is handled separately.",
      "Some transaction records may need to be retained for operational, payment, dispute-resolution, or legal reasons. Contact the NovaTrend team for questions or privacy requests.",
    ],
  },
  {
    title: "Changes and review",
    paragraphs: [
      "This is an informational draft based on currently known application behavior, not a statement of compliance with any particular privacy law. The marketplace owner should verify the actual processors, retention practices, and applicable legal requirements before publication.",
    ],
  },
];

export function meta() {
  return [
    { title: "Privacy Policy | NovaTrend" },
    { name: "description", content: "Learn how NovaTrend handles marketplace and account information." },
  ];
}

export default function PrivacyPolicy() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="This draft describes information the NovaTrend marketplace may handle to provide shopping, seller, payment, and support features."
      sections={sections}
    />
  );
}
