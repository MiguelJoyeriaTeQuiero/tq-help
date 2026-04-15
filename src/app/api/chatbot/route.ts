import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public endpoint — no auth required
// Simple keyword-match FAQ bot: score FAQ items by overlap with query tokens
export async function POST(req: NextRequest) {
  const { message } = await req.json();
  if (!message || typeof message !== "string" || message.trim().length < 2) {
    return NextResponse.json({ answer: null, faqs: [] });
  }

  const query  = message.trim().toLowerCase();
  const tokens = query
    .split(/[\s,.!?;:¿¡()[\]"'-]+/)
    .filter((t) => t.length > 2)
    // remove Spanish stop words
    .filter((t) => !["que", "para", "con", "como", "una", "por", "los", "las", "del", "sus", "hay", "cuando", "donde", "cual"].includes(t));

  const faqs = await prisma.faqItem.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { order: "asc" }],
  });

  // Score each FAQ
  const scored = faqs.map((faq) => {
    const haystack = `${faq.question} ${faq.answer}`.toLowerCase();
    let score = 0;

    // Full phrase match — highest weight
    if (haystack.includes(query)) score += 20;

    // Token overlap
    for (const token of tokens) {
      if (faq.question.toLowerCase().includes(token)) score += 3;
      if (faq.answer.toLowerCase().includes(token))   score += 1;
    }

    return { ...faq, score };
  });

  const relevant = scored
    .filter((f) => f.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  // Best match threshold for a direct answer
  const best = relevant[0];
  const directAnswer = best && best.score >= 5 ? best : null;

  return NextResponse.json({
    answer: directAnswer
      ? { question: directAnswer.question, answer: directAnswer.answer }
      : null,
    faqs: relevant.map((f) => ({ id: f.id, question: f.question, answer: f.answer, category: f.category })),
  });
}
