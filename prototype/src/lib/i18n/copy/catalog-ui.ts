import { getDictionary } from "../index";
import type { Locale } from "../types";
import { IMAGE_AGENT_EXPANSION_IDS, imageAgentExpansionCopy } from "@/lib/image-agent-expansions";

/**
 * Тексты демо-данных чата. В словарях локалей их нет, поэтому переводы
 * хранятся здесь для всех 19 языков.
 */
export type CatalogDemoCopy = {
  /** Заголовок демо-диалога на лендинге */
  title: string;
  userCompare: string;
  assistantCompare: string;
  userPrice: string;
  assistantPrice: string;
  suggestionCalories: string;
  suggestionAggregator: string;
  /** Подпись ссылки на агрегатор в демо-переписке */
  aggregatorLinkLabel: string;
};

export type CatalogUiCopy = {
  /** Описания агентов по `agent.id` */
  agents: Record<string, string>;
  /** Названия агентов по `agent.id` */
  agentNames: Record<string, string>;
  /** Описания моделей по `model.id` */
  models: Record<string, string>;
  /** Описания агентов изображений по `ImageAgent.id` */
  imageAgents: Record<string, string>;
  /** Названия агентов изображений по `ImageAgent.id` */
  imageAgentNames: Record<string, string>;
  demo: CatalogDemoCopy;
};

/**
 * Идентификаторы агентов изображений из `lib/server/image-agents.ts`.
 * Совпадают с агентами категории `images` в `lib/mock/agents.ts`, поэтому
 * подписи берутся из того же блока словаря и не расходятся между каталогом
 * и студией изображений.
 */
const IMAGE_AGENT_IDS = [
  "logo-generator",
  "business-card",
  "brand-style-mini",
  "background-removal",
  "pro-headshot",
  "face-swap",
  "background-replace",
  "gta-filter",
  "natural-retouch",
  "privacy-redaction",
  "business-outfit",
  "restore-old-photo",
  "remove-objects",
  "apply-tan",
  "remove-tattoo",
  "character-card",
  "ai-character-card",
  "remove-makeup",
  "add-makeup",
  "change-eye-color",
  "plump-lips",
  "whiten-teeth",
  "remove-wrinkles",
  "add-cheekbones",
  "family-photo",
  "combine-photos",
  "sunflowers",
  "kare",
  "bob",
  "cascade",
  "long-bob",
  "pixie",
  "shag",
  "undercut",
  "fade",
  "crop",
  "quiff",
  "pompadour",
  "caesar",
  "stubble",
  "short-boxed-beard",
  "full-beard",
  "goatee",
  "van-dyke",
  "ducktail",
  "bald",
  "remove-beard",
  "rain",
  "snow",
  "fog",
  "thunderstorm",
  "sun-rays",
  "overcast",
  "sunset",
  "business-suit-man",
  "business-suit-woman",
  "military-uniform",
  "police-uniform",
  "medical-uniform",
  "firefighter-uniform",
  "school-uniform",
  "pilot-uniform",
  "flight-attendant",
  "cowboy",
  "spider-man",
  "iron-man",
  "captain-america",
  "thor",
  "black-widow",
  "pirate",
  "medieval-knight",
  "samurai",
  "pharaoh",
  "venetian-carnival",
  "fantasy-mage",
  "vampire",
  "steampunk",
  "astronaut",
  "gladiator",
  "roman-legionary",
  "elf",
  "king",
  "queen",
  "rock-star",
  "santorini",
  "cappadocia",
  "dubai",
  "paris",
  "maldives",
  "iceland",
  "dolomites",
  "kyoto",
  "petra",
  "new-york",
  "bora-bora",
  "uyuni",
  "cartoon-hero",
  "caricature",
  "hero-3d",
  "drawn",
  "comic",
  "clay",
  "anime-hero",
  "fantasy",
  "pixel-illustration",
  "watercolor",
  "x-ray",
  "old-age",
  "fashion-caricature",
  "comic-2",
  ...IMAGE_AGENT_EXPANSION_IDS,
] as const;

const aiCharacterAgentCopy: Record<Locale, { name: string; description: string }> = {
  ru:{name:"Карточка AI персонажа",description:"Создаёт сетку нового вымышленного персонажа по описанию."}, en:{name:"AI character card",description:"Creates a consistent angle sheet for a new fictional character from a description."},
  zh:{name:"AI 角色卡",description:"根据描述创建全新虚构角色的一致角度表。"}, hi:{name:"AI पात्र कार्ड",description:"विवरण से नए काल्पनिक पात्र की एकसमान कोण-शीट बनाता है।"},
  es:{name:"Ficha de personaje IA",description:"Crea una hoja de ángulos coherente de un nuevo personaje ficticio a partir de una descripción."}, fr:{name:"Fiche de personnage IA",description:"Crée une planche d’angles cohérente d’un nouveau personnage fictif à partir d’une description."},
  ar:{name:"بطاقة شخصية بالذكاء الاصطناعي",description:"ينشئ شبكة زوايا متناسقة لشخصية خيالية جديدة من الوصف."}, pt:{name:"Cartão de personagem IA",description:"Cria uma grelha coerente de ângulos para uma nova personagem fictícia a partir da descrição."},
  de:{name:"KI-Charakterkarte",description:"Erstellt aus einer Beschreibung eine konsistente Ansichtenkarte einer neuen fiktiven Figur."}, ja:{name:"AIキャラクターカード",description:"説明から新しい架空キャラクターの一貫したアングル表を作成します。"},
  it:{name:"Scheda personaggio IA",description:"Crea una tavola coerente di angolazioni per un nuovo personaggio immaginario da una descrizione."}, ko:{name:"AI 캐릭터 카드",description:"설명으로 새로운 가상 캐릭터의 일관된 각도 시트를 만듭니다."},
  tr:{name:"AI karakter kartı",description:"Açıklamadan yeni bir kurgusal karakter için tutarlı açı tablosu oluşturur."}, pl:{name:"Karta postaci AI",description:"Tworzy spójną siatkę ujęć nowej fikcyjnej postaci na podstawie opisu."},
  nl:{name:"AI-personagekaart",description:"Maakt uit een beschrijving een consistente hoekensheet van een nieuw fictief personage."}, sv:{name:"AI-karaktärskort",description:"Skapar ett enhetligt vinkelblad för en ny fiktiv karaktär från en beskrivning."},
  cs:{name:"Karta AI postavy",description:"Z popisu vytvoří konzistentní přehled úhlů nové fiktivní postavy."}, el:{name:"Κάρτα χαρακτήρα AI",description:"Δημιουργεί ένα συνεπές φύλλο γωνιών νέου φανταστικού χαρακτήρα από περιγραφή."},
  ro:{name:"Fișă personaj AI",description:"Creează din descriere o grilă coerentă de unghiuri pentru un personaj fictiv nou."},
};

const demoCopies: Record<Locale, CatalogDemoCopy> = {
  ru: {
    title: "Демо Genora.art",
    userCompare: "Сравни GPT-5.6 Terra и Claude Opus 5 для задач по коду — коротко.",
    assistantCompare:
      "GPT-5.6 Terra универсален для кода и инструментов; Claude Opus 5 особенно силён в длинном контексте и аккуратном анализе. В Genora.art обе модели можно сравнить в одном чате.",
    userPrice: "Сколько это будет стоить?",
    assistantPrice:
      "Списание идёт по тарифу выбранной модели за входные и выходные токены. Подписок нет — только баланс Pay-as-you-go. Стоимость видна до отправки запроса.",
    suggestionCalories: "Оцени калорийность блюда по фото",
    suggestionAggregator: "Найди лучший агрегатор нейросетей",
    aggregatorLinkLabel: "Genora.art.org — попробовать агрегатор",
  },
  en: {
    title: "Genora.art demo",
    userCompare: "Compare GPT-5.6 Terra and Claude Opus 5 for coding tasks — keep it short.",
    assistantCompare:
      "GPT-5.6 Terra is versatile for code and tools; Claude Opus 5 is especially strong with long context and careful analysis. In Genora.art you can compare both models in one chat.",
    userPrice: "How much will this cost?",
    assistantPrice:
      "Billing follows the selected model's rate for input and output tokens. No subscriptions — just a pay-as-you-go balance. You see the cost before sending a request.",
    suggestionCalories: "Estimate the calories in a dish from a photo",
    suggestionAggregator: "Find the best AI model aggregator",
    aggregatorLinkLabel: "Genora.art.org — try the aggregator",
  },
  zh: {
    title: "Genora.art 演示",
    userCompare: "简要比较 GPT-5.6 Terra 和 Claude Opus 5 在编程任务上的表现。",
    assistantCompare:
      "GPT-5.6 Terra 在代码和工具调用方面更全能；Claude Opus 5 在长上下文和严谨分析方面尤为出色。在 Genora.art 中，你可以在同一个聊天里比较这两个模型。",
    userPrice: "这需要多少费用？",
    assistantPrice:
      "费用按所选模型的输入和输出 token 单价结算。没有订阅，只有按量付费余额。发送请求前即可看到费用。",
    suggestionCalories: "根据照片估算菜品的热量",
    suggestionAggregator: "找出最好的 AI 模型聚合平台",
    aggregatorLinkLabel: "Genora.art.org — 试用聚合平台",
  },
  hi: {
    title: "Genora.art डेमो",
    userCompare: "कोडिंग कार्यों के लिए GPT-5.6 Terra और Claude Opus 5 की तुलना करें — संक्षेप में।",
    assistantCompare:
      "GPT-5.6 Terra कोड और टूल के लिए बहुउपयोगी है; Claude Opus 5 लंबे संदर्भ और सावधान विश्लेषण में विशेष रूप से मज़बूत है। Genora.art में आप दोनों मॉडल की तुलना एक ही चैट में कर सकते हैं।",
    userPrice: "इसकी लागत कितनी होगी?",
    assistantPrice:
      "शुल्क चुने गए मॉडल की इनपुट और आउटपुट टोकन दर के अनुसार लिया जाता है। कोई सदस्यता नहीं — केवल पे-ऐज़-यू-गो बैलेंस। अनुरोध भेजने से पहले लागत दिख जाती है।",
    suggestionCalories: "फ़ोटो से व्यंजन की कैलोरी का अनुमान लगाएँ",
    suggestionAggregator: "सबसे अच्छा AI मॉडल एग्रीगेटर खोजें",
    aggregatorLinkLabel: "Genora.art.org — एग्रीगेटर आज़माएँ",
  },
  es: {
    title: "Demo de Genora.art",
    userCompare: "Compara GPT-5.6 Terra y Claude Opus 5 para tareas de programación — breve.",
    assistantCompare:
      "GPT-5.6 Terra es versátil para código y herramientas; Claude Opus 5 destaca especialmente en contexto largo y análisis cuidadoso. En Genora.art puedes comparar ambos modelos en un mismo chat.",
    userPrice: "¿Cuánto costará esto?",
    assistantPrice:
      "El cobro sigue la tarifa del modelo elegido por tokens de entrada y salida. Sin suscripciones: solo saldo de pago por uso. El coste se ve antes de enviar la solicitud.",
    suggestionCalories: "Calcula las calorías de un plato a partir de una foto",
    suggestionAggregator: "Encuentra el mejor agregador de modelos de IA",
    aggregatorLinkLabel: "Genora.art.org — probar el agregador",
  },
  fr: {
    title: "Démo Genora.art",
    userCompare: "Compare GPT-5.6 Terra et Claude Opus 5 pour les tâches de code — brièvement.",
    assistantCompare:
      "GPT-5.6 Terra est polyvalent pour le code et les outils ; Claude Opus 5 excelle surtout sur le contexte long et l’analyse rigoureuse. Dans Genora.art, vous pouvez comparer les deux modèles dans un même chat.",
    userPrice: "Combien cela va-t-il coûter ?",
    assistantPrice:
      "La facturation suit le tarif du modèle choisi pour les tokens d’entrée et de sortie. Pas d’abonnement — uniquement un solde à l’usage. Le coût est visible avant l’envoi de la requête.",
    suggestionCalories: "Estime les calories d’un plat à partir d’une photo",
    suggestionAggregator: "Trouve le meilleur agrégateur de modèles d’IA",
    aggregatorLinkLabel: "Genora.art.org — essayer l’agrégateur",
  },
  ar: {
    title: "عرض Genora.art التجريبي",
    userCompare: "قارن بين GPT-5.6 Terra و Claude Opus 5 لمهام البرمجة — باختصار.",
    assistantCompare:
      "GPT-5.6 Terra متعدد الاستخدامات للبرمجة والأدوات، أما Claude Opus 5 فقوي بشكل خاص في السياق الطويل والتحليل الدقيق. في Genora.art يمكنك مقارنة النموذجين في محادثة واحدة.",
    userPrice: "كم ستكون التكلفة؟",
    assistantPrice:
      "يتم الخصم حسب سعر النموذج المختار لرموز الإدخال والإخراج. لا توجد اشتراكات — فقط رصيد الدفع حسب الاستخدام. تظهر التكلفة قبل إرسال الطلب.",
    suggestionCalories: "قدّر السعرات الحرارية للطبق من صورة",
    suggestionAggregator: "ابحث عن أفضل مجمّع لنماذج الذكاء الاصطناعي",
    aggregatorLinkLabel: "Genora.art.org — تجربة المجمّع",
  },
  pt: {
    title: "Demo do Genora.art",
    userCompare: "Compare GPT-5.6 Terra e Claude Opus 5 para tarefas de código — de forma breve.",
    assistantCompare:
      "O GPT-5.6 Terra é versátil para código e ferramentas; o Claude Opus 5 é especialmente forte em contexto longo e análise cuidadosa. No Genora.art é possível comparar os dois modelos no mesmo chat.",
    userPrice: "Quanto isto vai custar?",
    assistantPrice:
      "A cobrança segue a tarifa do modelo escolhido por tokens de entrada e saída. Sem subscrições — apenas saldo pago conforme o uso. O custo aparece antes de enviar o pedido.",
    suggestionCalories: "Estima as calorias de um prato a partir de uma foto",
    suggestionAggregator: "Encontra o melhor agregador de modelos de IA",
    aggregatorLinkLabel: "Genora.art.org — experimentar o agregador",
  },
  de: {
    title: "Genora.art-Demo",
    userCompare: "Vergleiche GPT-5.6 Terra und Claude Opus 5 für Coding-Aufgaben — kurz.",
    assistantCompare:
      "GPT-5.6 Terra ist vielseitig für Code und Tools; Claude Opus 5 ist besonders stark bei langem Kontext und sorgfältiger Analyse. In Genora.art können Sie beide Modelle in einem Chat vergleichen.",
    userPrice: "Was wird das kosten?",
    assistantPrice:
      "Abgerechnet wird nach dem Tarif des gewählten Modells für Eingabe- und Ausgabe-Tokens. Keine Abos — nur ein Pay-as-you-go-Guthaben. Die Kosten sind vor dem Senden der Anfrage sichtbar.",
    suggestionCalories: "Schätze die Kalorien eines Gerichts anhand eines Fotos",
    suggestionAggregator: "Finde den besten Aggregator für KI-Modelle",
    aggregatorLinkLabel: "Genora.art.org — Aggregator testen",
  },
  ja: {
    title: "Genora.art デモ",
    userCompare: "コーディング用途で GPT-5.6 Terra と Claude Opus 5 を短く比較して。",
    assistantCompare:
      "GPT-5.6 Terra はコードとツール利用で万能です。Claude Opus 5 は長いコンテキストと丁寧な分析に特に強みがあります。Genora.art では両方のモデルを同じチャットで比較できます。",
    userPrice: "これはいくらかかりますか？",
    assistantPrice:
      "課金は選択したモデルの入力トークンと出力トークンの料金に従います。サブスクリプションはなく、従量課金の残高だけです。リクエストを送信する前に費用を確認できます。",
    suggestionCalories: "写真から料理のカロリーを見積もって",
    suggestionAggregator: "最良の AI モデルアグリゲーターを探して",
    aggregatorLinkLabel: "Genora.art.org — アグリゲーターを試す",
  },
  it: {
    title: "Demo di Genora.art",
    userCompare: "Confronta GPT-5.6 Terra e Claude Opus 5 per attività di codice — in breve.",
    assistantCompare:
      "GPT-5.6 Terra è versatile per codice e strumenti; Claude Opus 5 è particolarmente forte su contesto lungo e analisi accurata. In Genora.art puoi confrontare entrambi i modelli nella stessa chat.",
    userPrice: "Quanto costerà?",
    assistantPrice:
      "L’addebito segue la tariffa del modello scelto per i token di input e output. Nessun abbonamento: solo un saldo a consumo. Il costo è visibile prima di inviare la richiesta.",
    suggestionCalories: "Stima le calorie di un piatto da una foto",
    suggestionAggregator: "Trova il miglior aggregatore di modelli IA",
    aggregatorLinkLabel: "Genora.art.org — prova l’aggregatore",
  },
  ko: {
    title: "Genora.art 데모",
    userCompare: "코딩 작업에 대해 GPT-5.6 Terra와 Claude Opus 5를 간단히 비교해 줘.",
    assistantCompare:
      "GPT-5.6 Terra는 코드와 도구 활용 전반에서 뛰어납니다. Claude Opus 5는 긴 컨텍스트와 꼼꼼한 분석에 특히 강합니다. Genora.art에서는 두 모델을 같은 채팅에서 비교할 수 있습니다.",
    userPrice: "비용은 얼마나 드나요?",
    assistantPrice:
      "요금은 선택한 모델의 입력 및 출력 토큰 단가에 따라 청구됩니다. 구독은 없고 사용량 기반 잔액만 있습니다. 요청을 보내기 전에 비용을 확인할 수 있습니다.",
    suggestionCalories: "사진으로 음식의 칼로리를 추정해 줘",
    suggestionAggregator: "최고의 AI 모델 애그리게이터를 찾아 줘",
    aggregatorLinkLabel: "Genora.art.org — 애그리게이터 사용해 보기",
  },
  tr: {
    title: "Genora.art demosu",
    userCompare: "Kod görevleri için GPT-5.6 Terra ile Claude Opus 5’i kısaca karşılaştır.",
    assistantCompare:
      "GPT-5.6 Terra kod ve araç kullanımında çok yönlüdür; Claude Opus 5 ise uzun bağlam ve dikkatli analizde özellikle güçlüdür. Genora.art’da iki modeli aynı sohbette karşılaştırabilirsiniz.",
    userPrice: "Bunun maliyeti ne olur?",
    assistantPrice:
      "Ücretlendirme, seçilen modelin girdi ve çıktı token tarifesine göre yapılır. Abonelik yok — yalnızca kullandıkça öde bakiyesi. Maliyet, istek gönderilmeden önce görünür.",
    suggestionCalories: "Fotoğraftan bir yemeğin kalorisini tahmin et",
    suggestionAggregator: "En iyi AI model toplayıcısını bul",
    aggregatorLinkLabel: "Genora.art.org — toplayıcıyı dene",
  },
  pl: {
    title: "Demo Genora.art",
    userCompare: "Porównaj GPT-5.6 Terra i Claude Opus 5 do zadań programistycznych — krótko.",
    assistantCompare:
      "GPT-5.6 Terra jest wszechstronny w kodzie i narzędziach; Claude Opus 5 jest szczególnie silny w długim kontekście i starannej analizie. W Genora.art możesz porównać oba modele w jednym czacie.",
    userPrice: "Ile to będzie kosztować?",
    assistantPrice:
      "Rozliczenie odbywa się według stawki wybranego modelu za tokeny wejściowe i wyjściowe. Bez subskrypcji — tylko saldo płatne za użycie. Koszt widać przed wysłaniem zapytania.",
    suggestionCalories: "Oszacuj kaloryczność potrawy na podstawie zdjęcia",
    suggestionAggregator: "Znajdź najlepszy agregator modeli AI",
    aggregatorLinkLabel: "Genora.art.org — wypróbuj agregator",
  },
  nl: {
    title: "Genora.art-demo",
    userCompare: "Vergelijk GPT-5.6 Terra en Claude Opus 5 voor codeertaken — kort.",
    assistantCompare:
      "GPT-5.6 Terra is veelzijdig voor code en tools; Claude Opus 5 is vooral sterk in lange context en zorgvuldige analyse. In Genora.art vergelijkt u beide modellen in één chat.",
    userPrice: "Wat gaat dit kosten?",
    assistantPrice:
      "De afrekening volgt het tarief van het gekozen model voor invoer- en uitvoertokens. Geen abonnementen — alleen een pay-as-you-go-saldo. De kosten zijn zichtbaar voordat u de aanvraag verstuurt.",
    suggestionCalories: "Schat de calorieën van een gerecht op basis van een foto",
    suggestionAggregator: "Vind de beste aggregator voor AI-modellen",
    aggregatorLinkLabel: "Genora.art.org — probeer de aggregator",
  },
  sv: {
    title: "Genora.art-demo",
    userCompare: "Jämför GPT-5.6 Terra och Claude Opus 5 för koduppgifter — kort.",
    assistantCompare:
      "GPT-5.6 Terra är allsidig för kod och verktyg; Claude Opus 5 är särskilt stark på långt sammanhang och noggrann analys. I Genora.art kan du jämföra båda modellerna i samma chatt.",
    userPrice: "Vad kommer det att kosta?",
    assistantPrice:
      "Debiteringen följer den valda modellens pris för in- och ut-tokens. Inga abonnemang — bara ett saldo som betalas per användning. Kostnaden syns innan du skickar förfrågan.",
    suggestionCalories: "Uppskatta kalorierna i en måltid utifrån ett foto",
    suggestionAggregator: "Hitta den bästa aggregatorn för AI-modeller",
    aggregatorLinkLabel: "Genora.art.org — prova aggregatorn",
  },
  cs: {
    title: "Demo Genora.art",
    userCompare: "Porovnej GPT-5.6 Terra a Claude Opus 5 pro programátorské úlohy — krátce.",
    assistantCompare:
      "GPT-5.6 Terra je univerzální pro kód a nástroje; Claude Opus 5 je zvlášť silný v dlouhém kontextu a pečlivé analýze. V Genora.art můžete oba modely porovnat v jednom chatu.",
    userPrice: "Kolik to bude stát?",
    assistantPrice:
      "Účtuje se podle tarifu zvoleného modelu za vstupní a výstupní tokeny. Žádné předplatné — jen kredit placený podle spotřeby. Cenu vidíte před odesláním dotazu.",
    suggestionCalories: "Odhadni kalorie jídla z fotografie",
    suggestionAggregator: "Najdi nejlepší agregátor modelů AI",
    aggregatorLinkLabel: "Genora.art.org — vyzkoušet agregátor",
  },
  el: {
    title: "Demo του Genora.art",
    userCompare: "Σύγκρινε το GPT-5.6 Terra και το Claude Opus 5 για εργασίες κώδικα — σύντομα.",
    assistantCompare:
      "Το GPT-5.6 Terra είναι ευέλικτο για κώδικα και εργαλεία· το Claude Opus 5 είναι ιδιαίτερα δυνατό σε μεγάλο πλαίσιο και προσεκτική ανάλυση. Στο Genora.art μπορείτε να συγκρίνετε και τα δύο μοντέλα στην ίδια συνομιλία.",
    userPrice: "Πόσο θα κοστίσει αυτό;",
    assistantPrice:
      "Η χρέωση γίνεται με βάση την τιμή του επιλεγμένου μοντέλου για tokens εισόδου και εξόδου. Χωρίς συνδρομές — μόνο υπόλοιπο με πληρωμή κατά τη χρήση. Το κόστος φαίνεται πριν στείλετε το αίτημα.",
    suggestionCalories: "Υπολόγισε τις θερμίδες ενός πιάτου από φωτογραφία",
    suggestionAggregator: "Βρες τον καλύτερο συγκεντρωτή μοντέλων AI",
    aggregatorLinkLabel: "Genora.art.org — δοκιμάστε τον συγκεντρωτή",
  },
  ro: {
    title: "Demo Genora.art",
    userCompare: "Compară GPT-5.6 Terra și Claude Opus 5 pentru sarcini de programare — pe scurt.",
    assistantCompare:
      "GPT-5.6 Terra este versatil pentru cod și instrumente; Claude Opus 5 este deosebit de puternic la context lung și analiză atentă. În Genora.art puteți compara ambele modele în același chat.",
    userPrice: "Cât va costa?",
    assistantPrice:
      "Taxarea urmează tariful modelului ales pentru tokenurile de intrare și de ieșire. Fără abonamente — doar un sold plătit pe măsura utilizării. Costul este vizibil înainte de trimiterea cererii.",
    suggestionCalories: "Estimează caloriile unui preparat dintr-o fotografie",
    suggestionAggregator: "Găsește cel mai bun agregator de modele AI",
    aggregatorLinkLabel: "Genora.art.org — încearcă agregatorul",
  },
};

function buildCopy(locale: Locale): CatalogUiCopy {
  const dictionary = getDictionary(locale);
  const agents: Record<string, string> = {};
  const agentNames: Record<string, string> = {};

  for (const [id, item] of Object.entries(dictionary.agents.items)) {
    agents[id] = item.description;
    agentNames[id] = item.name;
  }

  const models: Record<string, string> = {};
  for (const [id, item] of Object.entries(dictionary.models.items)) {
    models[id] = item.description;
  }

  const imageAgents: Record<string, string> = {};
  const imageAgentNames: Record<string, string> = {};
  for (const id of IMAGE_AGENT_IDS) {
    const item = dictionary.agents.items[id];
    if (!item) continue;
    imageAgents[id] = item.description;
    imageAgentNames[id] = item.name;
  }
  imageAgents["ai-character-card"] = aiCharacterAgentCopy[locale].description;
  imageAgentNames["ai-character-card"] = aiCharacterAgentCopy[locale].name;
  for (const id of IMAGE_AGENT_EXPANSION_IDS) {
    const item = imageAgentExpansionCopy(locale, id);
    if (!item) continue;
    imageAgents[id] = item.description;
    imageAgentNames[id] = item.name;
  }

  return {
    agents,
    agentNames,
    models,
    imageAgents,
    imageAgentNames,
    demo: demoCopies[locale] ?? demoCopies.en,
  };
}

const cache = new Map<Locale, CatalogUiCopy>();

/**
 * Локализованные подписи каталога: описания агентов и моделей, агенты
 * изображений и тексты демо-данных. Фолбэк — `en`.
 */
export function catalogUiCopy(locale: Locale): CatalogUiCopy {
  const cached = cache.get(locale);
  if (cached) return cached;

  const copy = buildCopy(demoCopies[locale] ? locale : "en");
  cache.set(locale, copy);
  return copy;
}
