import type { Locale } from "@/lib/i18n/types";

export type ImageAgentExpansion = {
  id: string;
  group: "pose" | "scene";
  target: string;
  framing: "full-body" | "knees-up" | "portrait";
};

export const PHOTO_POSE_AGENTS: ImageAgentExpansion[] = [
  { id: "pose-male-crossed", group: "pose", framing: "full-body", target: "Turn the torso about 25 degrees, cross both arms confidently, shift weight onto the rear leg and cross the front foot lightly over it while keeping the face toward camera." },
  { id: "pose-male-pockets", group: "pose", framing: "full-body", target: "Place both hands in trouser pockets with thumbs visible, shift weight strongly to one leg, bend the other knee and step that foot diagonally forward; keep the face toward camera." },
  { id: "pose-male-lapels", group: "pose", framing: "full-body", target: "Adjust both jacket lapels, rotate the torso about 30 degrees and use a confident staggered stance with the front toe turned outward." },
  { id: "pose-male-cuff", group: "pose", framing: "full-body", target: "Adjust the opposite shirt cuff with one hand, separate both elbows from the torso, lower the chin slightly and offset the feet in a strong editorial stance." },
  { id: "pose-male-stride", group: "pose", framing: "full-body", target: "Create a natural confident walking stride frozen in motion, with the forward foot planted, rear heel raised and the arms swinging in opposition." },
  { id: "pose-male-clasped", group: "pose", framing: "full-body", target: "Loosely clasp both hands below the waist, rotate the torso about 25 degrees, use a broad staggered stance and shift weight onto one leg." },
  { id: "pose-male-thinking", group: "pose", framing: "knees-up", target: "Place one forearm across the lower torso and the opposite hand lightly near the chin without hiding the face; rotate the torso and lower one shoulder." },
  { id: "pose-male-hands-back", group: "pose", framing: "full-body", target: "Link both hands behind the lower back, open the shoulders, turn the torso about 25 degrees and cross one foot loosely in front." },
  { id: "pose-female-high-angle", group: "pose", framing: "knees-up", target: "Use a clearly high camera angle looking down; make the body diagonal, turn the shoulders, bring both hands near the waist and place one foot forward with a bent knee." },
  { id: "pose-female-selfie", group: "pose", framing: "knees-up", target: "Create a standing selfie pose with one hand holding a phone beside the face without covering it, the other touching the hair, hips shifted and legs staggered." },
  { id: "pose-female-greeting", group: "pose", framing: "full-body", target: "Raise one hand in an expressive greeting near the face, place the other on the waist, shift weight to the rear leg and cross the front leg with a pointed toe." },
  { id: "pose-female-close-selfie", group: "pose", framing: "portrait", target: "Create a close selfie viewpoint with one arm extended toward the camera, the opposite hand behind the neck, diagonal shoulders, a gentle head tilt and direct gaze." },
  { id: "pose-female-overhead-selfie", group: "pose", framing: "knees-up", target: "Create a dramatic overhead selfie, one arm extended toward the high camera, the opposite hand below the chin, torso twisted and feet staggered." },
  { id: "pose-female-waist", group: "pose", framing: "full-body", target: "Place one hand firmly on the waist, curve the other arm gently, form a strong S-shaped body line, shift weight to the rear leg and cross the front leg." },
  { id: "pose-female-crossed", group: "pose", framing: "full-body", target: "Cross the arms loosely below the chest, cross the legs at the ankles, shift the hip, turn the torso about 25 degrees and lower one shoulder." },
  { id: "pose-female-hair", group: "pose", framing: "full-body", target: "Touch the hair near the temple with one hand, place the other on the waist, shift the hip strongly, bend one knee and angle the torso." },
  { id: "pose-female-stride", group: "pose", framing: "full-body", target: "Create an elegant walking stride frozen mid-step, with the forward leg extended, rear heel raised and arms moving naturally in opposition." },
  { id: "pose-female-low-angle", group: "pose", framing: "full-body", target: "Use a dramatic low camera angle; take a wide staggered stance, place one hand on the waist and the other near the collarbone, twist the torso and lift the chin slightly." },
];

export const SCENE_PHOTO_AGENTS: ImageAgentExpansion[] = [
  { id: "scene-cafe", group: "scene", framing: "portrait", target: "Place the person at a small table in a lush enclosed garden cafe, wearing an original refined linen outfit, holding a plain coffee cup and looking thoughtfully to the side in soft daylight." },
  { id: "scene-studio", group: "scene", framing: "full-body", target: "Create a tasteful floor-level editorial pose on a seamless warm-grey studio cyclorama, wearing an original modest sculptural evening outfit, supported on one forearm with legs extended diagonally." },
  { id: "scene-beach", group: "scene", framing: "full-body", target: "Place the person at the shoreline in an expressive contemporary-dance standing pose, wearing an original flowing ankle-length outfit; one arm arcs upward, the other extends down and one knee lifts slightly." },
  { id: "scene-mediterranean", group: "scene", framing: "full-body", target: "Place the person on a sunlit white-stone terrace above a dramatic Mediterranean bay, in an original cobalt-blue resort outfit, with one hand on the balustrade and one foot forward." },
  { id: "scene-peonies", group: "scene", framing: "full-body", target: "Place the person beside an unbranded classic charcoal coupe at sunset, wearing an original lilac tailored outfit and holding a large bouquet of white and coral peonies across the torso." },
  { id: "scene-golden", group: "scene", framing: "portrait", target: "Create a warm golden-hour indoor portrait before glowing sheer curtains, wearing an original layered ivory and champagne outfit, arms softly crossed over the shoulders and hair moving in a gentle breeze." },
  { id: "scene-glamour", group: "scene", framing: "portrait", target: "Create an elegant upscale restaurant portrait with chandelier and city lights, wearing an original jewel-tone evening outfit with sparkling mesh gloves, both hands raised near the hair in a fashion gesture." },
];

export const IMAGE_AGENT_EXPANSIONS = [...PHOTO_POSE_AGENTS, ...SCENE_PHOTO_AGENTS] as const;
export const PHOTO_POSE_AGENT_IDS = PHOTO_POSE_AGENTS.map((item) => item.id);
export const SCENE_PHOTO_AGENT_IDS = SCENE_PHOTO_AGENTS.map((item) => item.id);
export const IMAGE_AGENT_EXPANSION_IDS = IMAGE_AGENT_EXPANSIONS.map((item) => item.id);

const ids = IMAGE_AGENT_EXPANSION_IDS;
type ExpansionId = (typeof ids)[number];

const names = (values: string[]) => Object.fromEntries(ids.map((id, index) => [id, values[index] ?? id])) as Record<ExpansionId, string>;

const NAMES: Record<Locale, Record<ExpansionId, string>> = {
  ru: names(["Скрещённые руки","В карманах","Поправить пиджак","Поправить манжету","Уверенный шаг","Руки вместе","У лица","Руки сзади","Верхний ракурс","Селфи","Жест рукой","Крупное селфи","Селфи сверху","На талии","Мягкий крест","Касание волос","Лёгкий шаг","Нижний ракурс","В кафе","Студийное","Пляжное","Средиземноморье","Пионы","Золотой свет","Гламур"]),
  en: names(["Crossed arms","Pocket pose","Adjust jacket","Adjust cuff","Confident stride","Hands together","Thinking pose","Hands behind","High angle","Selfie","Greeting pose","Close selfie","Overhead selfie","Waist pose","Soft cross","Hair touch","Light stride","Low angle","At café","Studio editorial","Beach movement","Mediterranean","Peonies","Golden light","Glamour"]),
  zh: names(["交叉双臂","双手插袋","整理外套","整理袖口","自信步伐","双手相合","思考姿势","双手背后","高角度","自拍","挥手姿势","近景自拍","俯拍自拍","手扶腰","柔和交叉","轻触头发","轻盈步伐","低角度","咖啡馆","影棚写真","海滩律动","地中海","牡丹花","金色光线","魅力晚宴"]),
  hi: names(["बाँहें क्रॉस","जेब में हाथ","जैकेट सँवारना","कफ सँवारना","आत्मविश्वासी चाल","हाथ साथ","सोचने की मुद्रा","हाथ पीछे","ऊँचा कोण","सेल्फी","अभिवादन मुद्रा","क्लोज सेल्फी","ऊपर से सेल्फी","कमर पर हाथ","सॉफ्ट क्रॉस","बाल छूना","हल्की चाल","नीचा कोण","कैफ़े में","स्टूडियो शूट","समुद्र तट","भूमध्यसागर","पियोनी","सुनहरी रोशनी","ग्लैमर"]),
  es: names(["Brazos cruzados","Manos bolsillos","Ajustar chaqueta","Ajustar puño","Paso seguro","Manos juntas","Pose pensativa","Manos atrás","Ángulo alto","Selfie","Saludo","Selfie cercano","Selfie cenital","Mano cintura","Cruce suave","Tocar cabello","Paso ligero","Ángulo bajo","En cafetería","Editorial estudio","Movimiento playa","Mediterráneo","Peonías","Luz dorada","Glamur"]),
  fr: names(["Bras croisés","Mains poches","Ajuster veste","Ajuster manchette","Pas assuré","Mains jointes","Pose pensive","Mains derrière","Angle haut","Selfie","Geste salut","Selfie rapproché","Selfie plongée","Main taille","Croisement doux","Toucher cheveux","Pas léger","Angle bas","Au café","Éditorial studio","Mouvement plage","Méditerranée","Pivoines","Lumière dorée","Glamour"]),
  ar: names(["ذراعان متقاطعان","يدان بالجيوب","تعديل السترة","تعديل الكم","خطوة واثقة","يدان معاً","وضعية تفكير","يدان خلفاً","زاوية علوية","سيلفي","إيماءة تحية","سيلفي قريب","سيلفي علوي","يد على الخصر","تقاطع ناعم","لمس الشعر","خطوة خفيفة","زاوية سفلية","في المقهى","تصوير استوديو","حركة شاطئية","المتوسط","فاوانيا","ضوء ذهبي","بريق"]),
  pt: names(["Braços cruzados","Mãos bolsos","Ajustar casaco","Ajustar punho","Passo confiante","Mãos juntas","Pose pensativa","Mãos atrás","Ângulo alto","Selfie","Gesto saudação","Selfie próximo","Selfie superior","Mão cintura","Cruzamento suave","Tocar cabelo","Passo leve","Ângulo baixo","No café","Editorial estúdio","Movimento praia","Mediterrâneo","Peônias","Luz dourada","Glamour"]),
  de: names(["Arme verschränkt","Hände Taschen","Jacke richten","Manschette richten","Sicherer Schritt","Hände zusammen","Denkerpose","Hände hinten","Hoher Winkel","Selfie","Grußpose","Nahes Selfie","Selfie von oben","Hand Hüfte","Sanfte Kreuzung","Haare berühren","Leichter Schritt","Tiefer Winkel","Im Café","Studio Editorial","Strandbewegung","Mittelmeer","Pfingstrosen","Goldenes Licht","Glamour"]),
  ja: names(["腕組み","ポケット姿勢","上着を直す","袖口を直す","自信の歩み","手を揃える","思考ポーズ","手を後ろに","ハイアングル","セルフィー","挨拶ポーズ","近接セルフィー","俯瞰セルフィー","腰に手","ソフトクロス","髪に触れる","軽い歩み","ローアングル","カフェ","スタジオ撮影","ビーチムーブ","地中海","ピオニー","黄金の光","グラマー"]),
  it: names(["Braccia incrociate","Mani tasche","Sistemare giacca","Sistemare polsino","Passo sicuro","Mani unite","Posa pensierosa","Mani dietro","Angolo alto","Selfie","Gesto saluto","Selfie ravvicinato","Selfie dall’alto","Mano fianco","Incrocio morbido","Tocco capelli","Passo leggero","Angolo basso","Al caffè","Editoriale studio","Movimento spiaggia","Mediterraneo","Peonie","Luce dorata","Glamour"]),
  ko: names(["팔짱 자세","주머니 손","재킷 정리","소매 정리","당당한 걸음","두 손 모아","생각 포즈","뒷짐 자세","하이 앵글","셀피","인사 포즈","클로즈 셀피","오버헤드 셀피","허리에 손","부드러운 교차","머리 터치","가벼운 걸음","로우 앵글","카페에서","스튜디오 화보","해변 동작","지중해","모란","골든 라이트","글래머"]),
  tr: names(["Kollar çapraz","Eller cepte","Ceket düzelt","Manşet düzelt","Kendinden emin","Eller birlikte","Düşünme pozu","Eller arkada","Üst açı","Selfie","Selamlama pozu","Yakın selfie","Tepeden selfie","El belde","Yumuşak çapraz","Saça dokunuş","Hafif adım","Alt açı","Kafede","Stüdyo çekimi","Plaj hareketi","Akdeniz","Şakayıklar","Altın ışık","Glamur"]),
  pl: names(["Skrzyżowane ręce","Ręce kieszenie","Popraw marynarkę","Popraw mankiet","Pewny krok","Dłonie razem","Poza myśliciela","Ręce z tyłu","Górny kąt","Selfie","Gest powitania","Bliskie selfie","Selfie z góry","Dłoń talia","Miękkie skrzyżowanie","Dotyk włosów","Lekki krok","Dolny kąt","W kawiarni","Sesja studyjna","Ruch plażowy","Morze Śródziemne","Piwonie","Złote światło","Glamour"]),
  nl: names(["Armen gekruist","Handen zakken","Jas schikken","Manchet schikken","Zelfverzekerde stap","Handen samen","Denkpose","Handen achter","Hoge hoek","Selfie","Begroetingspose","Close selfie","Selfie bovenaf","Hand heup","Zachte kruising","Haar aanraken","Lichte stap","Lage hoek","In café","Studio editorial","Strandbeweging","Middellandse Zee","Pioenrozen","Gouden licht","Glamour"]),
  sv: names(["Korsade armar","Händer fickor","Rätta kavajen","Rätta manschett","Säkert steg","Händer ihop","Tänkarpose","Händer bakom","Hög vinkel","Selfie","Hälsningspose","Nära selfie","Selfie ovanifrån","Hand höft","Mjuk korsning","Röra håret","Lätt steg","Låg vinkel","På kafé","Studioeditorial","Strandrörelse","Medelhavet","Pioner","Gyllene ljus","Glamour"]),
  cs: names(["Zkřížené paže","Ruce kapsy","Upravit sako","Upravit manžetu","Jistý krok","Ruce spolu","Zamyšlená póza","Ruce vzadu","Horní úhel","Selfie","Pozdrav","Blízké selfie","Selfie shora","Ruka pas","Jemné křížení","Dotek vlasů","Lehký krok","Dolní úhel","V kavárně","Studiový editoriál","Pohyb pláž","Středomoří","Pivoňky","Zlaté světlo","Glamour"]),
  el: names(["Σταυρωμένα χέρια","Χέρια τσέπες","Διόρθωση σακακιού","Διόρθωση μανσέτας","Σίγουρο βήμα","Χέρια μαζί","Σκεπτική πόζα","Χέρια πίσω","Ψηλή γωνία","Σέλφι","Χαιρετισμός","Κοντινό σέλφι","Σέλφι από ψηλά","Χέρι μέση","Απαλό σταύρωμα","Άγγιγμα μαλλιών","Ελαφρύ βήμα","Χαμηλή γωνία","Στο καφέ","Στούντιο editorial","Κίνηση παραλίας","Μεσόγειος","Παιώνιες","Χρυσό φως","Γκλάμουρ"]),
  ro: names(["Brațe încrucișate","Mâini buzunare","Aranjează sacoul","Aranjează manșeta","Pas sigur","Mâini împreună","Poză gânditoare","Mâini la spate","Unghi înalt","Selfie","Gest salut","Selfie apropiat","Selfie de sus","Mână talie","Încrucișare fină","Atingere păr","Pas ușor","Unghi jos","La cafenea","Editorial studio","Mișcare plajă","Mediterană","Bujori","Lumină aurie","Glamour"]),
};

const POSE_DESCRIPTION: Record<Locale, (name: string) => string> = {
  ru: (name) => `Меняет позу на «${name}», сохраняя человека, одежду и фон.`, en: (name) => `Changes the pose to “${name}” while preserving the person, clothes and background.`,
  zh: (name) => `将姿势改为“${name}”，保留人物、服装和背景。`, hi: (name) => `व्यक्ति, कपड़े और पृष्ठभूमि रखते हुए मुद्रा “${name}” में बदलता है।`,
  es: (name) => `Cambia la pose a «${name}» conservando persona, ropa y fondo.`, fr: (name) => `Adopte la pose « ${name} » en conservant personne, tenue et décor.`,
  ar: (name) => `يغيّر الوضعية إلى «${name}» مع الحفاظ على الشخص والملابس والخلفية.`, pt: (name) => `Muda a pose para “${name}”, preservando pessoa, roupa e fundo.`,
  de: (name) => `Ändert die Pose zu „${name}“ und bewahrt Person, Kleidung und Hintergrund.`, ja: (name) => `人物、服、背景を保ったまま「${name}」のポーズに変えます。`,
  it: (name) => `Cambia la posa in “${name}” mantenendo persona, abiti e sfondo.`, ko: (name) => `인물, 옷, 배경을 유지하며 “${name}” 포즈로 바꿉니다.`,
  tr: (name) => `Kişiyi, kıyafeti ve arka planı koruyarak pozu “${name}” yapar.`, pl: (name) => `Zmienia pozę na „${name}”, zachowując osobę, ubranie i tło.`,
  nl: (name) => `Verandert de pose naar ‘${name}’ met behoud van persoon, kleding en achtergrond.`, sv: (name) => `Ändrar posen till ”${name}” och bevarar person, kläder och bakgrund.`,
  cs: (name) => `Změní pózu na „${name}“ a zachová osobu, oblečení i pozadí.`, el: (name) => `Αλλάζει τη στάση σε «${name}», διατηρώντας άτομο, ρούχα και φόντο.`,
  ro: (name) => `Schimbă postura în „${name}”, păstrând persoana, hainele și fundalul.`,
};

const SCENE_DESCRIPTION: Record<Locale, (name: string) => string> = {
  ru: (name) => `Создаёт образ «${name}»: новая локация, одежда и поза с тем же персонажем.`, en: (name) => `Creates the “${name}” look: a new location, outfit and pose with the same character.`,
  zh: (name) => `创建“${name}”造型：同一角色的新场景、服装和姿势。`, hi: (name) => `उसी पात्र के साथ “${name}” रूप: नई जगह, पोशाक और मुद्रा बनाता है।`,
  es: (name) => `Crea el estilo «${name}»: nueva ubicación, ropa y pose con el mismo personaje.`, fr: (name) => `Crée le style « ${name} » : nouveau lieu, tenue et pose avec le même personnage.`,
  ar: (name) => `ينشئ مظهر «${name}»: موقع وملابس ووضعية جديدة للشخصية نفسها.`, pt: (name) => `Cria o visual “${name}”: novo local, roupa e pose com a mesma personagem.`,
  de: (name) => `Erstellt den Look „${name}“: neuer Ort, Outfit und Pose mit derselben Figur.`, ja: (name) => `同じ人物で「${name}」の新しい場所、服装、ポーズを作ります。`,
  it: (name) => `Crea il look “${name}”: nuova location, abito e posa con lo stesso personaggio.`, ko: (name) => `같은 인물로 “${name}”의 새 장소, 의상, 포즈를 만듭니다.`,
  tr: (name) => `Aynı karakterle “${name}” görünümü için yeni mekân, kıyafet ve poz oluşturur.`, pl: (name) => `Tworzy styl „${name}”: nowe miejsce, strój i pozę tej samej postaci.`,
  nl: (name) => `Maakt de look ‘${name}’: nieuwe locatie, outfit en pose met hetzelfde personage.`, sv: (name) => `Skapar stilen ”${name}”: ny plats, klädsel och pose med samma person.`,
  cs: (name) => `Vytvoří styl „${name}“: nové místo, oblečení a pózu stejné postavy.`, el: (name) => `Δημιουργεί το στυλ «${name}»: νέα τοποθεσία, ρούχα και πόζα με το ίδιο άτομο.`,
  ro: (name) => `Creează stilul „${name}”: locație, ținută și postură noi cu același personaj.`,
};

export function imageAgentExpansionCopy(locale: Locale, id: string): { name: string; description: string } | null {
  const agent = IMAGE_AGENT_EXPANSIONS.find((item) => item.id === id);
  if (!agent) return null;
  const name = (NAMES[locale] ?? NAMES.en)[id];
  return { name, description: agent.group === "pose" ? POSE_DESCRIPTION[locale](name) : SCENE_DESCRIPTION[locale](name) };
}

const POSE_RULES = `Use the one attached source image as the subject reference. If it is a multi-angle character sheet, reconstruct one single person from that sheet and do not output a grid. Change only body pose and the explicitly requested camera angle. Keep the exact same identity, face, age, body proportions, hairstyle, outfit, accessories, background, objects, lighting, colors and photographic treatment. Do not add furniture or make the person sit, kneel, lean on, touch or hold environmental objects. A selected Visual style may change rendering treatment, but must never change identity, clothing or scene semantics.`;
const SCENE_RULES = `Use the one attached source image as the identity reference. It may be either a normal portrait or a multi-angle character sheet. If it is a character sheet, reconstruct one single person and never output a grid. Preserve the exact identity, face, age, body proportions and defining hair traits while intentionally replacing the outfit, pose, location, lighting and framing with the target scene. Do not imitate a named real person, brand, logo or copyrighted photo.`;
const FOOTER = `USER ADDITIONS (highest creative priority): {{USER_NOTES}}\nPrecedence: USER ADDITIONS override scene defaults but never identity-preservation or safety rules.\nOutput format: {{FORMAT}}. Output size: {{SIZE}}. Output quality: {{QUALITY}}. Visual style: {{STYLE}}.\nThe selected Visual style has priority over default photographic treatment. Return one finished image only, with no text, labels, watermark or comparison layout.`;

export const IMAGE_AGENT_EXPANSION_PROMPTS: Record<string, string> = Object.fromEntries(
  IMAGE_AGENT_EXPANSIONS.map((agent) => [
    agent.id,
    `${agent.group === "pose" ? POSE_RULES : SCENE_RULES}\n\nTARGET: ${agent.target}\nFRAMING: ${agent.framing}. Keep all required limbs and hands visible and use natural anatomy.\n\n${FOOTER}`,
  ]),
);

export function imageAgentExpansion(id: string): ImageAgentExpansion | null {
  return IMAGE_AGENT_EXPANSIONS.find((item) => item.id === id) ?? null;
}
