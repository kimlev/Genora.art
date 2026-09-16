import type { LegalSection } from "@/lib/legal/documents";

type LegalDocumentProps = {
  title: string;
  intro?: string[];
  sections: LegalSection[];
};

export function LegalDocument({ title, intro = [], sections }: LegalDocumentProps) {
  return (
    <article className="min-w-0">
      <h1 className="text-3xl font-semibold tracking-tight text-text sm:text-4xl">
        {title}
      </h1>
      <p className="mt-2 text-sm text-steel">
        Последнее обновление: 11.08.2026
      </p>

      {intro.length ? (
        <div className="mt-6 space-y-3 rounded-2xl border border-border bg-mist/35 p-5 text-sm leading-7 text-steel">
          {intro.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </div>
      ) : null}

      <div className="mt-9 space-y-9">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-lg font-semibold text-text">{section.title}</h2>
            <div className="mt-2 space-y-3 text-sm leading-7 text-steel">
              {(Array.isArray(section.body) ? section.body : [section.body]).map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {section.items?.length ? (
                <ul className="list-disc space-y-1.5 pl-5">
                  {section.items.map((item) => <li key={item}>{item}</li>)}
                </ul>
              ) : null}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
