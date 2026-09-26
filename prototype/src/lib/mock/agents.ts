import { getCatalogAgentOverride, listCreatedCatalogAgents } from "@/lib/catalog-agent-overrides";
import { catalogUiCopy } from "@/lib/i18n/copy/catalog-ui";
import type { Locale } from "@/lib/i18n/types";
import { IMAGE_AGENT_EXPANSIONS, imageAgentExpansionCopy } from "@/lib/image-agent-expansions";
import { videoAgentCopy } from "@/lib/video-agent-catalog";
import type { Agent } from "./agent-types";
import { textAgents } from "./text-agents";

export type { Agent, AgentCategory } from "./agent-types";

export const agents: Agent[] = [
  ...textAgents,
  {
    id: "weather-change",
    name: "Смена погоды",
    category: "video",
    description: "Меняет погоду в готовом видео, сохраняя сцену и статичную камеру.",
    modelId: "omni-1.1-flash",
    systemPrompt: "Transform the uploaded source video into the weather requested by the user. Preserve the exact location geometry, camera position, framing, buildings, roads, people, vehicles, timing and motion pixel-consistently. Keep the camera locked and static. For winter, create unmistakable full winter: natural white accumulated snow covering roads, sidewalks, roofs and ledges, visible snow banks at curbs, active falling snow, cold blue daylight and realistic tire or foot tracks; retain colored objects and do not merely desaturate or turn the image monochrome. Change only weather, seasonal atmosphere, lighting and physically consistent environmental effects. Maintain temporal continuity and photorealism throughout the clip.",
    icon: "cloud-sun",
  },
  {
    id: "glasses-logo-promo",
    name: "Лого на очках",
    category: "video",
    description: "Создаёт модное промо очков с названием бренда на линзах и дужках.",
    modelId: "seedance-2.0-fast",
    systemPrompt: `The user's entire request is the exact brand name. Use that exact text everywhere [BRAND] appears below. Do not ask for or invent any other input. Preserve capitalization, spacing, punctuation, and spelling exactly. Render [BRAND] as a clean premium wordmark on the outer area of both dark lenses and along the outer side of both temple arms.

GLOBAL STATE

- Subject: High-fashion female model with slicked-back dark hair in a sleek bun, groomed full brows, warm tan complexion, glossy lips, small gold hoop earrings.
- Wardrobe: Fitted sleeveless mock-neck top in burnt orange leather.
- Accessory: Sharp angular cat-eye tortoiseshell sunglasses with dark tinted lenses. Both lenses and both temple arms carry a clean, clearly readable "[BRAND]" wordmark. The lettering must remain sharp, correctly spelled, undistorted, and visually integrated into the sunglasses as premium product branding.
- Setting: Warm studio interior with beige/terracotta backdrop and warm key lighting; rotating film reel shadows projected across background.

MASTER TIMELINE

PHYSICAL SHOT 1 — 00:00.000–00:02.083
00:00.000–00:01.000
Medium bust shot, eye-level, static camera. Model faces front, head tilted slightly back and right. Rotating film projector reel casts distinct mechanical shadows across the warm wall behind her. Sunglasses remain clearly visible; "[BRAND]" branding is visible on both lenses and may be partially visible on the temple depending on head angle.

00:01.000–00:02.083
Model slowly tilts head down towards camera, maintaining cool, aloof expression. Preserve the sunglasses shape and premium tortoiseshell finish. Electronic fashion beat plays. No speech.

PHYSICAL SHOT 2 — 00:02.125–00:03.083
00:02.125–00:03.083
Hard cut to extreme close-up of model's face angled slightly right. Low-angle static framing tightly highlights the tortoiseshell frame, nose bridge, glossy lips, lenses, and outer temple area. The "[BRAND]" wordmark on the visible lens and temple must be legible and correctly spelled. Subtle chin dip; reflection glints on dark polished acetate without obscuring the branding.

PHYSICAL SHOT 3 — 00:03.125–00:04.125
00:03.125–00:04.125
Hard cut to macro studio product insert of the sunglasses' left temple arm and lens in profile against a dark brown backdrop. Static framing centers the amber and dark brown tortoiseshell pattern, gold-tone hinge mechanism, lens branding, and the "[BRAND]" wordmark printed or engraved horizontally along the temple arm. The full text "[BRAND]" must be completely visible, crisp, correctly spelled, and easy to read. Warm rim light tracks across the top edge while avoiding glare over the lettering.

PHYSICAL SHOT 4 — 00:04.167–00:06.083
00:04.167–00:05.125
Hard cut to extreme close-up three-quarter profile facing left. Shallow depth of field centered on the left sunglasses rim, eye area, hinge, lens, and temple. Keep "[BRAND]" branding readable on the visible lens and outer temple whenever they face camera.

00:05.125–00:06.083
Subtle micro-movement as model slightly rotates head forward; bright streak of rim light catches the polished curve of the cat-eye lens frame. Maintain correct geometry and spelling of the "[BRAND]" branding with no warping, letter substitutions, or disappearing characters.

PHYSICAL SHOT 5 — 00:06.125–00:08.375
00:06.125–00:07.250
Hard cut to close-up three-quarter view facing left. Model raises right hand with manicured nails, lightly grasping the right frame temple with fingers. Position the hand so it does not fully cover the branding. The visible lens and temple should clearly display the word "[BRAND]".

00:07.250–00:08.375
Model slowly tilts head down while holding the frame temple, gazing past camera with composed, stylish attitude. Reel shadows drift in background. Keep the "[BRAND]" lettering stable, legible, correctly oriented, and integrated into the tortoiseshell sunglasses.

PHYSICAL SHOT 6 — 00:08.417–00:09.708
00:08.417–00:09.708
Hard cut to direct frontal close-up. Eye-level, static framing. Model squares shoulders, gazing intently straight into lens behind sunglasses. Preserve the same sunglasses design and branding continuity. Both lens wordmarks remain visible; temple lettering may be only partially visible from the frontal angle, but any visible characters must remain consistent with the exact wordmark "[BRAND]". Outro beat rings out to clean finish.

HARD CONSTRAINTS

- Strict continuity of wardrobe and sunglasses model throughout all shots.
- The exact brand text is the user's request substituted for every [BRAND] token.
- Both lenses and both outer temple arms of the sunglasses carry the same exact brand wordmark.
- Never replace the text with gibberish, pseudo-letters, abbreviations, alternate spelling, or another brand.
- Never mirror or reverse the lettering.
- Never deform, stretch, break, duplicate, or partially regenerate the wordmark.
- Shot 3 is the primary product-detail shot and must show the complete brand wordmark clearly and legibly.
- In Shots 2, 4, and 5, keep the wordmark readable whenever a lens or temple is visible to camera.
- Keep reflections and highlights away from the lettering enough to preserve readability.
- Consistent amber-toned studio lighting palette and projected spinning reel silhouette motif.
- No dialogue or audible voice; continuous electronic fashion-editorial score.

GLOBAL VISUAL / AUDIO TREATMENT

- Visual: High-fashion commercial aesthetic, 35mm shallow depth of field, warm amber/terracotta color grade, rich contrast, soft background shadow play. Premium eyewear product-commercial presentation with deliberate emphasis on the tortoiseshell lenses and temples.
- Audio: Upbeat electronic downtempo club track driven by syncopated synth percussion and sub-bass. Clean studio sound, zero environmental noise.`,
    icon: "glasses",
  },
  {
    id: "angel",
    name: "Ангел",
    category: "video",
    description: "Превращает человека с фото в кинематографичный образ ангела на шоссе.",
    modelId: "seedance-2.0-fast",
    systemPrompt: `Use the uploaded full-body photo or selected character as the sole identity reference for the subject. Preserve the person's recognizable face, apparent age, skin tone, body proportions, and identity. Replace the original clothing, footwear, pose, props, background, and styling only as specified below. Do not copy the source background or source outfit. If the reference is a character sheet, use its full-body view for anatomy and its close views for facial identity.

GLOBAL STATE

- Subject: The same person from the uploaded reference, wearing a white tiered ruffle mini dress, large white feathered angel wings, and white platform high-heeled boots. Style the hair into a polished long, straight look while preserving the person's identity.
- Prop: Heavy construction sledgehammer resting vertically head-down on the highway asphalt, held by right hand.
- Setting: Active multi-lane freeway in broad daylight under a clear blue sky with telephone poles, highway overpass infrastructure, and moving vehicle traffic.

MASTER TIMELINE

PHYSICAL SHOT 1 — 00:00.000–00:06.000

00:00.000–00:01.800
Low-angle, wide-lens frontal framing looking up at the subject standing centered in a wide power stance. She gazes stoically at the lens while holding the sledgehammer handle upright. Distant cars travel along lanes behind her. Camera initiates a steady low clockwise orbital tracking move.

00:01.800–00:03.600
Camera arcs toward the subject's front-right three-quarter profile. High-speed cars pass in the background. Greenish vertical anamorphic lens flare artifacts appear across the top portion of the frame.

00:03.600–00:05.000
Camera smoothly sweeps past pure right profile toward rear three-quarter view. Wind drafts slightly shift her hair, feather tips, and ruffled skirt hem. Subject maintains a fixed, motionless pose with both feet planted on the asphalt.

00:05.000–00:06.000
Orbit completes at a low-angle direct rear composition behind her back, emphasizing the wings and boots against the receding freeway traffic.

HARD CONSTRAINTS

- The generated subject must remain unmistakably the same person as the uploaded photo or selected character in every frame.
- Replace the source clothing and location completely with the specified angel wardrobe, boots, wings, sledgehammer, and freeway.
- Single continuous uncut camera shot; no hidden cuts or jump cuts.
- Camera maintains a ground-level low-angle perspective throughout the entire 180-degree clockwise orbit.
- Subject remains completely frozen in pose; no stepping, walking, or swinging of the sledgehammer.
- Keep face, body, wings, clothing, boots, hands, and sledgehammer anatomically stable throughout the orbit.

GLOBAL VISUAL / AUDIO TREATMENT

- Visual: Saturated daylight exterior, deep blue sky, bright high-contrast sunlight, wide-angle distortion with linear vertical lens flares.
- Audio: Highway traffic hum, rushing air drafts, and ambient urban road rumble; no intelligible speech.`,
    icon: "sparkles",
  },
  {
    id: "michael-jackson-dance",
    name: "Michael Jackson Dance",
    category: "video",
    description: "Transfers dance movements from a reference video onto the person in your full-body photo.",
    modelId: "kling-2.6-mc-std",
    systemPrompt: "Treat the single uploaded full-body photo as the exact first frame and immutable visual source for every frame that follows. Keep its person, identity, face, apparent age, body proportions, clothing, footwear, accessories, background, lighting, colors, objects, camera framing, and composition unchanged. Use only the built-in Michael Jackson dance clip supplied as a hidden motion reference: transfer its movement, timing, gestures, and pose changes onto the person in the photo. The user's optional prompt may refine the dance only; it must never override the photo-preservation rules. Change only the photographed person's movement; never replace, restyle, regenerate, or alter the photo's person, background, clothes, lighting, or framing. Do not copy the reference performer's identity, face, clothes, scene, or objects. Keep motion natural and anatomically plausible for the person shown. If the photo shows a child, keep the dance and presentation strictly age-appropriate and non-sexual. Do not add text, logos, or extra people.",
    icon: "music",
  },
  {
    id: "code-review",
    name: "Code Review",
    category: "code",
    description: "Проверяет код, находит баги и предлагает улучшения.",
    modelId: "gpt-5.4",
    systemPrompt:
      "You are a senior engineer reviewing code for clarity, bugs, and performance.",
    icon: "code",
    popular: true,
  },
  {
    id: "sql-helper",
    name: "SQL Helper",
    category: "code",
    description: "Пишет и оптимизирует SQL-запросы под вашу схему.",
    modelId: "gpt-5.4",
    systemPrompt: "You are an expert SQL developer. Write safe, efficient queries.",
    icon: "database",
  },
  {
    id: "copywriter",
    name: "Copywriter",
    category: "writing",
    description: "Создаёт тексты для лендингов, писем и соцсетей.",
    modelId: "claude-sonnet-4-6",
    systemPrompt: "You are a concise marketing copywriter with a clear tone of voice.",
    icon: "pen",
    popular: true,
  },
  {
    id: "research",
    name: "Research",
    category: "analysis",
    description: "Структурирует информацию и делает выводы по материалам.",
    modelId: "gemini-3-6-flash",
    systemPrompt: "You analyze sources, summarize findings, and cite assumptions.",
    icon: "search",
  },
  {
    id: "ads-brief",
    name: "Ads Brief",
    category: "marketing",
    description: "Собирает бриф для рекламных кампаний и креативов.",
    modelId: "gpt-5.4",
    systemPrompt: "You create actionable ad briefs with audience, hooks, and CTAs.",
    icon: "megaphone",
  },
  {
    id: "translator",
    name: "Translator",
    category: "writing",
    description: "Переводит тексты с сохранением стиля и терминологии.",
    modelId: "gpt-5.6-luna",
    systemPrompt: "You translate accurately while preserving tone and domain terms.",
    icon: "languages",
  },
  {id:"logo-generator",name:"Генератор логотипа",category:"images",description:"Создаёт чистый, узнаваемый логотип и знак для бренда.",modelId:"",systemPrompt:"",icon:"badge",popular:true},
  {id:"business-card",name:"Дизайн визитки",category:"images",description:"Собирает аккуратную визитку с точной типографикой и контактами.",modelId:"",systemPrompt:"",icon:"credit-card"},
  {id:"brand-style-mini",name:"Мини-фирменный стиль",category:"images",description:"Создаёт компактную систему визуального стиля для бренда.",modelId:"",systemPrompt:"",icon:"palette",popular:true},
  {id:"background-removal",name:"Удаление фона",category:"images",description:"Аккуратно отделяет объект и сохраняет естественные края.",modelId:"",systemPrompt:"",icon:"scan"},
  {id:"pro-headshot",name:"Деловой портрет",category:"images",description:"Превращает селфи в естественный профессиональный портрет.",modelId:"",systemPrompt:"",icon:"user-round",popular:true},
  {id:"face-swap",name:"Замена лица",category:"images",description:"Переносит лицо с сохранением позы, света и естественности.",modelId:"",systemPrompt:"",icon:"users-round"},
  {id:"background-replace",name:"Замена фона",category:"images",description:"Меняет окружение, сохраняя объект, перспективу и свет.",modelId:"",systemPrompt:"",icon:"layers"},
  {id:"gta-filter",name:"Фильтр GTA",category:"images",description:"Превращает фото в постерную иллюстрацию GTA с фирменной вставкой.",modelId:"",systemPrompt:"",icon:"layers"},
  {id:"natural-retouch",name:"Естественная ретушь",category:"images",description:"Улучшает портрет без пластика и изменения личности.",modelId:"",systemPrompt:"",icon:"wand"},
  {id:"privacy-redaction",name:"Скрытие персональных данных",category:"images",description:"Надёжно закрывает выбранные лица, номера и документы.",modelId:"",systemPrompt:"",icon:"shield"},
  {id:"business-outfit",name:"Деловая одежда",category:"images",description:"Меняет одежду на деловую, сохраняя человека и позу.",modelId:"",systemPrompt:"",icon:"briefcase-business"},
  {id:"restore-old-photo",name:"Восстановить старое",category:"images",description:"Восстанавливает старое фото и аккуратно окрашивает его в цвет.",modelId:"",systemPrompt:"",icon:"image"},
  {id:"remove-objects",name:"Убрать лишние объекты",category:"images",description:"Удаляет нежелательные объекты с фото.",modelId:"",systemPrompt:"",icon:"eraser"},
  {id:"apply-tan",name:"Нанести загар",category:"images",description:"Добавляет естественный загар, сохраняя человека и позу.",modelId:"",systemPrompt:"",icon:"sun"},
  {id:"remove-tattoo",name:"Удаление тату",category:"images",description:"Убирает татуировку и восстанавливает естественную кожу.",modelId:"",systemPrompt:"",icon:"wand"},
  {id:"character-card",name:"Карточка персонажа",category:"images",description:"Один и тот же персонаж в разных ракурсах.",modelId:"",systemPrompt:"",icon:"layout-grid"},
  {id:"ai-character-card",name:"Карточка AI персонажа",category:"images",description:"Создаёт сетку нового вымышленного персонажа по описанию.",modelId:"",systemPrompt:"",icon:"layout-grid"},
  {id:"remove-makeup",name:"Удалить макияж",category:"images",description:"Снимает макияж и оставляет естественную кожу.",modelId:"",systemPrompt:"",icon:"smile"},
  {id:"add-makeup",name:"Добавить макияж",category:"images",description:"Наносит выбранный макияж, сохраняя лицо.",modelId:"",systemPrompt:"",icon:"sparkles"},
  {id:"change-eye-color",name:"Изменить цвет глаз",category:"images",description:"Меняет цвет глаз на указанный.",modelId:"",systemPrompt:"",icon:"eye"},
  {id:"plump-lips",name:"Пухлые губы",category:"images",description:"Делает губы пухлее с выбранной силой.",modelId:"",systemPrompt:"",icon:"heart"},
  {id:"whiten-teeth",name:"Отбелить зубы",category:"images",description:"Отбеливает зубы до голливудской улыбки.",modelId:"",systemPrompt:"",icon:"smile"},
  {id:"remove-wrinkles",name:"Убрать морщины",category:"images",description:"Смягчает морщины, не меняя личность.",modelId:"",systemPrompt:"",icon:"wand"},
  {id:"add-cheekbones",name:"Добавить скулы",category:"images",description:"Добавляет более выраженные скулы.",modelId:"",systemPrompt:"",icon:"user-round"},
  {id:"family-photo",name:"Объединить фото",category:"images",description:"Собирает несколько портретов в одно общее фото.",modelId:"",systemPrompt:"",icon:"users-round"},
  {id:"combine-photos",name:"Объединить фото 2",category:"images",description:"Ставит человека из одного фото в сцену с другого.",modelId:"",systemPrompt:"",icon:"layers"},
  {id:"sunflowers",name:"Объединить фото 3",category:"images",description:"Переносит человека на поле подсолнухов в новой позе.",modelId:"",systemPrompt:"",icon:"sun"},
  {id:"remove-beard",name:"Удалить бороду",category:"images",description:"Убирает бороду, сохраняя лицо, волосы и позу.",modelId:"",systemPrompt:"",icon:"wand"},
  {id:"bald",name:"Лысый",category:"images",description:"Убирает все волосы с головы, сохраняя позу и исходное фото.",modelId:"",systemPrompt:"",icon:"user-round"},
  {id:"ducktail",name:"Утиный хвост",category:"images",description:"Полная борода с удлинённым и заострённым низом.",modelId:"",systemPrompt:"",icon:"wand"},
  {id:"van-dyke",name:"Ван Дайк",category:"images",description:"Отдельные усы и заострённая борода на подбородке, щеки выбриты.",modelId:"",systemPrompt:"",icon:"wand"},
  {id:"goatee",name:"Эспаньолка",category:"images",description:"Борода в основном на подбородке, часто с усами.",modelId:"",systemPrompt:"",icon:"wand"},
  {id:"full-beard",name:"Полная борода",category:"images",description:"Густая борода, покрывающая подбородок, щеки и соединённая с усами.",modelId:"",systemPrompt:"",icon:"wand"},
  {id:"short-boxed-beard",name:"Короткая полная борода",category:"images",description:"Аккуратная борода по линии челюсти с подстриженными щеками и усами.",modelId:"",systemPrompt:"",icon:"wand"},
  {id:"stubble",name:"Щетина",category:"images",description:"Короткая борода 1–5 мм, эффект лёгкой небритости.",modelId:"",systemPrompt:"",icon:"wand"},
  {id:"caesar",name:"Цезарь",category:"images",description:"Короткая стрижка с ровной короткой челкой вперед.",modelId:"",systemPrompt:"",icon:"scissors"},
  {id:"pompadour",name:"Помпадур",category:"images",description:"Выраженный объем спереди и сверху, волосы зачесываются назад.",modelId:"",systemPrompt:"",icon:"scissors"},
  {id:"quiff",name:"Квифф",category:"images",description:"Объемные волосы спереди, уложенные вверх и назад.",modelId:"",systemPrompt:"",icon:"scissors"},
  {id:"crop",name:"Кроп",category:"images",description:"Короткая текстурная стрижка с небольшой челкой вперед.",modelId:"",systemPrompt:"",icon:"scissors"},
  {id:"fade",name:"Фейд",category:"images",description:"Плавный переход от очень коротких волос снизу к более длинным сверху.",modelId:"",systemPrompt:"",icon:"scissors"},
  {id:"undercut",name:"Андеркат",category:"images",description:"Короткие или выбритые виски и затылок, сверху волосы заметно длиннее.",modelId:"",systemPrompt:"",icon:"scissors"},
  {id:"shag",name:"Шэг",category:"images",description:"Многослойная текстурная стрижка с намеренно небрежным объемом.",modelId:"",systemPrompt:"",icon:"scissors"},
  {id:"pixie",name:"Пикси",category:"images",description:"Короткая стрижка с укороченными висками и затылком, верх обычно длиннее.",modelId:"",systemPrompt:"",icon:"scissors"},
  {id:"long-bob",name:"Лонг-боб",category:"images",description:"Удлиненный боб до плеч или чуть ниже, универсален для прямых и волнистых волос.",modelId:"",systemPrompt:"",icon:"scissors"},
  {id:"cascade",name:"Каскад",category:"images",description:"Волосы разной длины слоями, создают объем и движение.",modelId:"",systemPrompt:"",icon:"scissors"},
  {id:"bob",name:"Боб",category:"images",description:"Короткая или средняя стрижка с объемом на затылке и удлинением спереди.",modelId:"",systemPrompt:"",icon:"scissors"},
  {id:"kare",name:"Каре",category:"images",description:"Ровная стрижка примерно до подбородка или плеч, с челкой или без.",modelId:"",systemPrompt:"",icon:"scissors"},
  {id:"sunset",name:"Закат",category:"images",description:"Добавляет тёплый закатный свет к исходному кадру.",modelId:"",systemPrompt:"",icon:"sun"},
  {id:"overcast",name:"Пасмурная погода",category:"images",description:"Делает небо серым, без солнца.",modelId:"",systemPrompt:"",icon:"layers"},
  {id:"sun-rays",name:"Солнечные лучи",category:"images",description:"Добавляет лучи света сквозь облака.",modelId:"",systemPrompt:"",icon:"sun"},
  {id:"thunderstorm",name:"Гроза",category:"images",description:"Тёмное небо, молнии и ливень.",modelId:"",systemPrompt:"",icon:"wand"},
  {id:"fog",name:"Туман",category:"images",description:"Накрывает кадр густой дымкой и мягким светом.",modelId:"",systemPrompt:"",icon:"layers"},
  {id:"snow",name:"Снег",category:"images",description:"Добавляет снежный покров и падающие хлопья.",modelId:"",systemPrompt:"",icon:"sparkles"},
  {id:"rain",name:"Дождь",category:"images",description:"Мокрые улицы и падающие капли на исходном кадре.",modelId:"",systemPrompt:"",icon:"layers"},
  {id:"rock-star",name:"Рок-звезда",category:"images",description:"Меняет одежду на сценический рок-образ.",modelId:"",systemPrompt:"",icon:"sparkles"},
  {id:"queen",name:"Королева",category:"images",description:"Меняет одежду на королевский образ с короной.",modelId:"",systemPrompt:"",icon:"sparkles"},
  {id:"king",name:"Король",category:"images",description:"Меняет одежду на королевскую мантию и корону.",modelId:"",systemPrompt:"",icon:"sparkles"},
  {id:"elf",name:"Эльф",category:"images",description:"Меняет одежду на фэнтезийный эльфийский образ.",modelId:"",systemPrompt:"",icon:"sparkles"},
  {id:"roman-legionary",name:"Римский легионер",category:"images",description:"Меняет одежду на форму римского легионера.",modelId:"",systemPrompt:"",icon:"shield"},
  {id:"gladiator",name:"Гладиатор",category:"images",description:"Меняет одежду на доспехи гладиатора.",modelId:"",systemPrompt:"",icon:"shield"},
  {id:"astronaut",name:"Космонавт",category:"images",description:"Меняет одежду на космический костюм, лицо открыто.",modelId:"",systemPrompt:"",icon:"user-round"},
  {id:"steampunk",name:"Стимпанк",category:"images",description:"Меняет одежду на стимпанк-образ с ремнями и металлом.",modelId:"",systemPrompt:"",icon:"sparkles"},
  {id:"vampire",name:"Вампир",category:"images",description:"Меняет одежду на тёмный вампирский образ.",modelId:"",systemPrompt:"",icon:"sparkles"},
  {id:"fantasy-mage",name:"Фэнтези-маг",category:"images",description:"Меняет одежду на мантию мага с посохом.",modelId:"",systemPrompt:"",icon:"wand"},
  {id:"venetian-carnival",name:"Венецианский карнавал",category:"images",description:"Меняет одежду на богатый карнавальный образ.",modelId:"",systemPrompt:"",icon:"sparkles"},
  {id:"pharaoh",name:"Фараон",category:"images",description:"Меняет одежду на бело-золотые одежды фараона.",modelId:"",systemPrompt:"",icon:"sparkles"},
  {id:"samurai",name:"Самурай",category:"images",description:"Меняет одежду на доспехи самурая с катаной.",modelId:"",systemPrompt:"",icon:"shield"},
  {id:"medieval-knight",name:"Средневековый рыцарь",category:"images",description:"Меняет одежду на рыцарские доспехи.",modelId:"",systemPrompt:"",icon:"shield"},
  {id:"pirate",name:"Пират",category:"images",description:"Меняет одежду на пиратский камзол и сапоги.",modelId:"",systemPrompt:"",icon:"sparkles"},
  {id:"black-widow",name:"Чёрная вдова",category:"images",description:"Меняет одежду на чёрный тактический костюм.",modelId:"",systemPrompt:"",icon:"shield"},
  {id:"thor",name:"Тор",category:"images",description:"Меняет одежду на броню, красный плащ и молот.",modelId:"",systemPrompt:"",icon:"sparkles"},
  {id:"captain-america",name:"Капитан Америка",category:"images",description:"Меняет одежду на сине-красный костюм со щитом.",modelId:"",systemPrompt:"",icon:"shield"},
  {id:"iron-man",name:"Железный человек",category:"images",description:"Меняет одежду на красно-золотой технокостюм.",modelId:"",systemPrompt:"",icon:"sparkles"},
  {id:"spider-man",name:"Человек-паук",category:"images",description:"Меняет одежду на красно-синий костюм с паутиной.",modelId:"",systemPrompt:"",icon:"sparkles"},
  {id:"cowboy",name:"Ковбой",category:"images",description:"Меняет одежду на ковбойский образ со шляпой.",modelId:"",systemPrompt:"",icon:"user-round"},
  {id:"flight-attendant",name:"Форма бортпроводника",category:"images",description:"Меняет одежду на форму бортпроводника.",modelId:"",systemPrompt:"",icon:"briefcase-business"},
  {id:"pilot-uniform",name:"Форма пилота",category:"images",description:"Меняет одежду на форму пилота с погонами.",modelId:"",systemPrompt:"",icon:"briefcase-business"},
  {id:"school-uniform",name:"Школьная форма",category:"images",description:"Меняет одежду на школьную форму, лицо открыто.",modelId:"",systemPrompt:"",icon:"briefcase-business"},
  {id:"firefighter-uniform",name:"Форма пожарного",category:"images",description:"Меняет одежду на защитную форму пожарного.",modelId:"",systemPrompt:"",icon:"shield"},
  {id:"medical-uniform",name:"Медицинская форма",category:"images",description:"Меняет одежду на медицинский халат или костюм.",modelId:"",systemPrompt:"",icon:"heart"},
  {id:"police-uniform",name:"Полицейская форма",category:"images",description:"Меняет одежду на полицейскую форму.",modelId:"",systemPrompt:"",icon:"shield"},
  {id:"military-uniform",name:"Военная форма",category:"images",description:"Меняет одежду на камуфляж и тактический жилет.",modelId:"",systemPrompt:"",icon:"shield"},
  {id:"business-suit-woman",name:"Деловой костюм жен",category:"images",description:"Меняет одежду на юбку, блузу и пиджак.",modelId:"",systemPrompt:"",icon:"briefcase-business"},
  {id:"business-suit-man",name:"Деловой костюм муж",category:"images",description:"Меняет одежду на классический мужской костюм.",modelId:"",systemPrompt:"",icon:"briefcase-business"},
  {id:"uyuni",name:"Солончак Уюни",category:"images",description:"Переносит человека на зеркальный солончак Уюни.",modelId:"",systemPrompt:"",icon:"image"},
  {id:"bora-bora",name:"Бора-Бора",category:"images",description:"Переносит человека на пирс лагуны Бора-Бора.",modelId:"",systemPrompt:"",icon:"image"},
  {id:"new-york",name:"Нью-Йорк",category:"images",description:"Переносит человека на улицы или крышу Нью-Йорка.",modelId:"",systemPrompt:"",icon:"image"},
  {id:"petra",name:"Петра",category:"images",description:"Переносит человека в каньон или к фасаду Петры.",modelId:"",systemPrompt:"",icon:"image"},
  {id:"kyoto",name:"Киото",category:"images",description:"Переносит человека к тории или в бамбуковый лес Киото.",modelId:"",systemPrompt:"",icon:"image"},
  {id:"dolomites",name:"Доломитовые Альпы",category:"images",description:"Переносит человека на тропу Доломитовых Альп.",modelId:"",systemPrompt:"",icon:"image"},
  {id:"iceland",name:"Исландия",category:"images",description:"Переносит человека к водопаду или чёрному пляжу Исландии.",modelId:"",systemPrompt:"",icon:"image"},
  {id:"maldives",name:"Мальдивы",category:"images",description:"Переносит человека на белый пляж Мальдив.",modelId:"",systemPrompt:"",icon:"image"},
  {id:"paris",name:"Париж",category:"images",description:"Переносит человека на улицу Парижа с Эйфелевой башней.",modelId:"",systemPrompt:"",icon:"image"},
  {id:"dubai",name:"Дубай",category:"images",description:"Переносит человека на террасу с панорамой Дубая.",modelId:"",systemPrompt:"",icon:"image"},
  {id:"cappadocia",name:"Каппадокия",category:"images",description:"Переносит человека на смотровую с шарами Каппадокии.",modelId:"",systemPrompt:"",icon:"image"},
  {id:"santorini",name:"Санторини",category:"images",description:"Переносит человека на белую террасу Санторини.",modelId:"",systemPrompt:"",icon:"image"},
  {id:"fantasy",name:"Фэнтези",category:"images",description:"Герой сказочного мира с художественной прорисовкой.",modelId:"",systemPrompt:"",icon:"sparkles"},
  {id:"anime-hero",name:"Аниме-герой",category:"images",description:"Узнаваемый человек в стиле современного аниме.",modelId:"",systemPrompt:"",icon:"sparkles"},
  {id:"clay",name:"Пластилиновый",category:"images",description:"Объёмный персонаж с пластилиновой фактурой.",modelId:"",systemPrompt:"",icon:"sparkles"},
  {id:"comic",name:"Комикс",category:"images",description:"Герой графического романа с чёткими контурами.",modelId:"",systemPrompt:"",icon:"sparkles"},
  {id:"drawn",name:"Рисованный",category:"images",description:"Аккуратный цифровой рисунок с чистыми линиями.",modelId:"",systemPrompt:"",icon:"sparkles"},
  {id:"hero-3d",name:"Герой 3D",category:"images",description:"Объёмный персонаж современной 3D-анимации.",modelId:"",systemPrompt:"",icon:"sparkles"},
  {id:"caricature",name:"Шарж",category:"images",description:"Узнаваемый человек с чуть преувеличенными чертами.",modelId:"",systemPrompt:"",icon:"sparkles"},
  {id:"cartoon-hero",name:"Мультяшный герой",category:"images",description:"Яркий мультперсонаж с выразительной мимикой.",modelId:"",systemPrompt:"",icon:"sparkles"},
  {id:"x-ray",name:"Эффект рентгена",category:"images",description:"Стилизованный рентген лица с узнаваемым силуэтом.",modelId:"",systemPrompt:"",icon:"sparkles"},
  {id:"watercolor",name:"Акварель",category:"images",description:"Нежный акварельный портрет с тем же лицом.",modelId:"",systemPrompt:"",icon:"sparkles"},
  {id:"pixel-illustration",name:"Пиксельная иллюстрация",category:"images",description:"Тёплый пиксельный рисунок, лицо крупным планом.",modelId:"",systemPrompt:"",icon:"sparkles"},
  {id:"old-age",name:"Я в старости",category:"images",description:"Показывает, как человек будет выглядеть в выбранном возрасте.",modelId:"",systemPrompt:"",icon:"user-round"},
  {id:"fashion-caricature",name:"Карикатура",category:"images",description:"Модная карикатура с преувеличенными чертами на нейтральном фоне.",modelId:"",systemPrompt:"",icon:"sparkles"},
  {id:"comic-2",name:"Комикс 2",category:"images",description:"Более мультяшный комикс, кадр от колен в сельской местности.",modelId:"",systemPrompt:"",icon:"sparkles"},
  ...IMAGE_AGENT_EXPANSIONS.map((item) => {
    const copy = imageAgentExpansionCopy("ru", item.id)!;
    return { id: item.id, name: copy.name, category: "images" as const, description: copy.description, modelId: "", systemPrompt: "", icon: item.group === "pose" ? "user-round" : "image" };
  }),
];

export function getAgentById(id: string): Agent | undefined {
  const created = listCreatedCatalogAgents().find((agent) => agent.id === id);
  const base = agents.find((agent) => agent.id === id) ?? created;
  if (!base) return undefined;
  const override = getCatalogAgentOverride(id);
  if (!override) return base;
  return {
    ...base,
    name: override.name || base.name,
    description: override.description || base.description,
    category: override.category || base.category,
    icon: override.icon || base.icon,
  };
}

export function listVisibleAgents(): Agent[] {
  const extra = listCreatedCatalogAgents();
  const known = new Set(agents.map((agent) => agent.id));
  return [...extra.filter((agent) => !known.has(agent.id)), ...agents].map((agent) => getAgentById(agent.id) ?? agent);
}

export function getPopularAgents(): Agent[] {
  return agents.filter((agent) => agent.popular);
}

/**
 * Описание агента на языке интерфейса. Русский текст из `agents` остаётся
 * значением по умолчанию и используется только для `ru` либо для агентов,
 * которых нет в каталоге переводов (например, пользовательских).
 */
export function agentDescription(id: string, locale: Locale): string {
  const videoCopy = videoAgentCopy(id, locale);
  if (videoCopy) return videoCopy.description;
  const override = getCatalogAgentOverride(id);
  const localizedCopy = catalogUiCopy(locale);
  const localized = localizedCopy.agents[id] ?? localizedCopy.imageAgents[id];
  if (localized) return localized;
  if (locale === "ru") return (override?.description || getAgentById(id)?.description) ?? "";
  const englishCopy = catalogUiCopy("en");
  return englishCopy.agents[id] ?? englishCopy.imageAgents[id] ?? override?.description ?? id;
}

/**
 * Название агента на языке интерфейса. Собственные имена (Code Review,
 * SQL Helper) в каталоге переводов совпадают с исходными.
 */
export function agentName(id: string, locale: Locale): string {
  const videoCopy = videoAgentCopy(id, locale);
  if (videoCopy) return videoCopy.name;
  const override = getCatalogAgentOverride(id);
  const localizedCopy = catalogUiCopy(locale);
  const localized = localizedCopy.agentNames[id] ?? localizedCopy.imageAgentNames[id];
  if (localized) return localized;
  if (locale === "ru") return (override?.name || getAgentById(id)?.name) ?? "";
  const englishCopy = catalogUiCopy("en");
  return englishCopy.agentNames[id] ?? englishCopy.imageAgentNames[id] ?? override?.name ?? id;
}
