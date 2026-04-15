import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function FaqPage() {
  const items = await prisma.faqItem.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { order: "asc" }, { createdAt: "asc" }],
  });

  const grouped: Record<string, typeof items> = {};
  for (const item of items) {
    const cat = item.category ?? "General";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-10 text-center">
          <h1 className="text-3xl font-bold text-slate-900">Preguntas frecuentes</h1>
          <p className="mt-2 text-slate-500">Encuentra respuestas rápidas a las dudas más comunes</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-10">
        {items.length === 0 ? (
          <p className="text-center text-slate-400 py-16">No hay preguntas disponibles por el momento.</p>
        ) : (
          Object.entries(grouped).map(([category, faqItems]) => (
            <section key={category}>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">{category}</h2>
              <div className="space-y-2">
                {faqItems.map((item) => (
                  <details
                    key={item.id}
                    className="group rounded-xl border border-slate-200 bg-white overflow-hidden"
                  >
                    <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-sm font-medium text-slate-800 hover:bg-slate-50 transition-colors list-none">
                      <span>{item.question}</span>
                      <svg
                        className="h-4 w-4 flex-shrink-0 text-slate-400 transition-transform group-open:rotate-180"
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <div className="border-t border-slate-100 px-5 py-4">
                      <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{item.answer}</p>
                    </div>
                  </details>
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white mt-4">
        <div className="max-w-3xl mx-auto px-4 py-4 text-center text-xs text-slate-400">
          TQ-HELP · Portal de Autoservicio · <a href="/status" className="hover:underline text-slate-500">Estado del sistema</a>
        </div>
      </footer>
    </div>
  );
}
