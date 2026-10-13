import { api } from "@/lib/api";

export interface RecommendedProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  discount: number;
}

export interface AskAiResponse {
  reply: string;
  recommendedProducts: RecommendedProduct[];
  requiresSignIn: boolean;
}

export function sendAskAiQuestion(question: string) {
  return api.post<AskAiResponse>("/api/ask-ai", {
    messages: [{ role: "user", content: question }],
  });
}
