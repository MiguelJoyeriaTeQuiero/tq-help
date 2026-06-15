import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { prisma } from "@/lib/prisma";
import { captureError, logger } from "@/lib/observability";

// Public endpoint — no auth required
// Asistente de autoservicio: responde con un LLM (vía Vercel AI Gateway),
// usando las FAQ activas como base de conocimiento. Si el Gateway no está
// configurado o falla, degrada al buscador por palabras clave.

const MODEL = "anthropic/claude-haiku-4.5";

interface ChatTurn {
  role: "user" | "bot";
  text: string;
}

// Trocea una frase en tokens útiles (sin stop words y palabras muy cortas)
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s,.!?;:¿¡()[\]"'-]+/)
    .filter((t) => t.length > 2)
    .filter((t) => !["que", "para", "con", "como", "una", "por", "los", "las", "del", "sus", "hay", "cuando", "donde", "cual"].includes(t));
}

type ScoredFaq = {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  score: number;
};

// Puntúa las FAQ por solapamiento con la consulta — usado tanto para el
// contexto del LLM como para las tarjetas relacionadas y el modo de respaldo.
function scoreFaqs(
  faqs: { id: string; question: string; answer: string; category: string | null }[],
  query: string,
): ScoredFaq[] {
  const tokens = tokenize(query);
  return faqs
    .map((faq) => {
      const haystack = `${faq.question} ${faq.answer}`.toLowerCase();
      let score = 0;
      if (haystack.includes(query)) score += 20;
      for (const token of tokens) {
        if (faq.question.toLowerCase().includes(token)) score += 3;
        if (faq.answer.toLowerCase().includes(token)) score += 1;
      }
      return { ...faq, score };
    })
    .filter((f) => f.score > 0)
    .sort((a, b) => b.score - a.score);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const message: unknown = body?.message;
  const history: ChatTurn[] = Array.isArray(body?.history) ? body.history : [];

  if (!message || typeof message !== "string" || message.trim().length < 2) {
    return NextResponse.json({ answer: null, faqs: [] });
  }

  const query = message.trim().toLowerCase();

  const faqs = await prisma.faqItem.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { order: "asc" }],
    select: { id: true, question: true, answer: true, category: true },
  });

  const relevant = scoreFaqs(faqs, query);
  const topFaqs = relevant.slice(0, 3);

  // ── Modo respaldo: sin Gateway configurado → buscador por palabras clave ──
  if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
    const best = topFaqs[0];
    return NextResponse.json({
      reply: null,
      answer: best && best.score >= 5 ? { question: best.question, answer: best.answer } : null,
      faqs: topFaqs.map((f) => ({ id: f.id, question: f.question, answer: f.answer, category: f.category })),
    });
  }

  // ── Modo IA: el LLM responde en lenguaje natural usando las FAQ ──
  const knowledgeBase = relevant
    .slice(0, 8)
    .map((f, i) => `[${i + 1}] P: ${f.question}\nR: ${f.answer}`)
    .join("\n\n");

  const system = [
    "Eres el asistente de autoservicio de TQ-HELP, el sistema de soporte interno de Joyería Te Quiero.",
    "Ayudas a los empleados con problemas técnicos (equipos, software, accesos, impresoras, red, etc.) antes de que abran una incidencia.",
    "Responde SIEMPRE en español, de forma breve, cercana y práctica: ofrece pasos concretos de resolución cuando sea posible.",
    "Usa la base de conocimiento siguiente como fuente principal si es relevante; no inventes políticas internas ni datos que no aparezcan en ella.",
    "Si el problema no se resuelve con tus indicaciones, o requiere intervención del equipo de soporte, anima al usuario a crear una incidencia describiendo lo que ya ha intentado.",
    "No pidas datos personales sensibles ni contraseñas.",
    knowledgeBase
      ? `\nBASE DE CONOCIMIENTO:\n${knowledgeBase}`
      : "\nBASE DE CONOCIMIENTO: (vacía) — da consejos generales de soporte IT y, si no puedes resolverlo, sugiere crear una incidencia.",
  ].join("\n");

  const messages = [
    ...history
      .filter((t) => t && typeof t.text === "string" && t.text.trim())
      .slice(-6)
      .map((t) => ({
        role: t.role === "user" ? ("user" as const) : ("assistant" as const),
        content: t.text,
      })),
    { role: "user" as const, content: message.trim() },
  ];

  try {
    const { text } = await generateText({
      model: MODEL,
      system,
      messages,
      maxOutputTokens: 600,
      temperature: 0.3,
    });

    logger.info("chatbot_reply", { hasFaqContext: relevant.length > 0 });

    return NextResponse.json({
      reply: text,
      answer: null,
      faqs: topFaqs.map((f) => ({ id: f.id, question: f.question, answer: f.answer, category: f.category })),
    });
  } catch (err) {
    await captureError(err, { scope: "POST /api/chatbot" });
    // Degradación: si el LLM falla, devolvemos la mejor FAQ por palabras clave
    const best = topFaqs[0];
    return NextResponse.json({
      reply: null,
      answer: best && best.score >= 5 ? { question: best.question, answer: best.answer } : null,
      faqs: topFaqs.map((f) => ({ id: f.id, question: f.question, answer: f.answer, category: f.category })),
    });
  }
}
