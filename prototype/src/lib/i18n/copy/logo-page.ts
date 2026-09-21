import type { Locale } from "@/lib/i18n";

export type LogoPageCopy = {
  eyebrow: string;
  title: string;
  description: string;
  lightLabel: string;
  darkLabel: string;
  markLabel: string;
};

const english: LogoPageCopy = {
  eyebrow: "Genora.art visual identity",
  title: "The Genora.art logo",
  description: "Explore the official Genora.art logo, its spiral symbol, and the visual identity used across the creative AI platform.",
  lightLabel: "Light wordmark",
  darkLabel: "Dark wordmark",
  markLabel: "Genora.art spiral mark",
};

const copy: Partial<Record<Locale, LogoPageCopy>> = {
  en: english,
  ru: {
    eyebrow: "Визуальный стиль Genora.art",
    title: "Логотип Genora.art",
    description: "Официальный логотип Genora.art, спиральный знак и визуальный стиль платформы для творчества с искусственным интеллектом.",
    lightLabel: "Логотип для светлого фона",
    darkLabel: "Логотип для тёмного фона",
    markLabel: "Спиральный знак Genora.art",
  },
  hi: { ...english, eyebrow: "Genora.art की दृश्य पहचान", title: "Genora.art का लोगो", description: "Genora.art का आधिकारिक लोगो, उसका सर्पिल चिन्ह और रचनात्मक AI प्लेटफ़ॉर्म की दृश्य पहचान देखें।", lightLabel: "हल्की पृष्ठभूमि का लोगो", darkLabel: "गहरी पृष्ठभूमि का लोगो", markLabel: "Genora.art सर्पिल चिन्ह" },
  es: { ...english, eyebrow: "Identidad visual de Genora.art", title: "El logotipo de Genora.art", description: "Conoce el logotipo oficial de Genora.art, su símbolo espiral y la identidad visual de la plataforma de IA creativa.", lightLabel: "Logotipo para fondo claro", darkLabel: "Logotipo para fondo oscuro", markLabel: "Símbolo espiral de Genora.art" },
  fr: { ...english, eyebrow: "Identité visuelle de Genora.art", title: "Le logo de Genora.art", description: "Découvrez le logo officiel de Genora.art, son symbole en spirale et l’identité visuelle de la plateforme d’IA créative.", lightLabel: "Logo sur fond clair", darkLabel: "Logo sur fond sombre", markLabel: "Symbole spiralé de Genora.art" },
  ar: { ...english, eyebrow: "الهوية البصرية لـ Genora.art", title: "شعار Genora.art", description: "تعرّف على الشعار الرسمي لـ Genora.art ورمز الدوامة والهوية البصرية لمنصة الذكاء الاصطناعي الإبداعي.", lightLabel: "الشعار على خلفية فاتحة", darkLabel: "الشعار على خلفية داكنة", markLabel: "رمز دوامة Genora.art" },
  pt: { ...english, eyebrow: "Identidade visual da Genora.art", title: "O logotipo da Genora.art", description: "Conheça o logotipo oficial da Genora.art, o símbolo em espiral e a identidade visual da plataforma de IA criativa.", lightLabel: "Logotipo para fundo claro", darkLabel: "Logotipo para fundo escuro", markLabel: "Símbolo espiral da Genora.art" },
  de: { ...english, eyebrow: "Visuelle Identität von Genora.art", title: "Das Genora.art-Logo", description: "Entdecke das offizielle Genora.art-Logo, das Spiralsymbol und die visuelle Identität der kreativen KI-Plattform.", lightLabel: "Logo auf hellem Hintergrund", darkLabel: "Logo auf dunklem Hintergrund", markLabel: "Spiralsymbol von Genora.art" },
  it: { ...english, eyebrow: "Identità visiva di Genora.art", title: "Il logo di Genora.art", description: "Scopri il logo ufficiale di Genora.art, il suo simbolo a spirale e l’identità visiva della piattaforma di IA creativa.", lightLabel: "Logo su sfondo chiaro", darkLabel: "Logo su sfondo scuro", markLabel: "Simbolo a spirale di Genora.art" },
  tr: { ...english, eyebrow: "Genora.art görsel kimliği", title: "Genora.art logosu", description: "Genora.art’ın resmi logosunu, spiral simgesini ve yaratıcı yapay zekâ platformunun görsel kimliğini keşfedin.", lightLabel: "Açık arka plan logosu", darkLabel: "Koyu arka plan logosu", markLabel: "Genora.art spiral simgesi" },
  pl: { ...english, eyebrow: "Identyfikacja wizualna Genora.art", title: "Logo Genora.art", description: "Poznaj oficjalne logo Genora.art, spiralny znak i identyfikację wizualną kreatywnej platformy AI.", lightLabel: "Logo na jasnym tle", darkLabel: "Logo na ciemnym tle", markLabel: "Spiralny znak Genora.art" },
  sv: { ...english, eyebrow: "Genora.arts visuella identitet", title: "Genora.art-logotypen", description: "Upptäck Genora.arts officiella logotyp, spiralformade symbol och den visuella identiteten för den kreativa AI-plattformen.", lightLabel: "Logotyp på ljus bakgrund", darkLabel: "Logotyp på mörk bakgrund", markLabel: "Genora.arts spiralsymbol" },
  cs: { ...english, eyebrow: "Vizuální identita Genora.art", title: "Logo Genora.art", description: "Prohlédněte si oficiální logo Genora.art, spirálový symbol a vizuální identitu kreativní platformy AI.", lightLabel: "Logo na světlém pozadí", darkLabel: "Logo na tmavém pozadí", markLabel: "Spirálový symbol Genora.art" },
};

export function logoPageCopy(locale: Locale): LogoPageCopy {
  return copy[locale] ?? english;
}
