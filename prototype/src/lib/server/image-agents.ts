import "server-only";

import type { PoolClient } from "pg";
import { readFileSync } from "node:fs";
import path from "node:path";
import { IMAGE_AGENT_RESULT_PROMPTS } from "@/lib/image-agent-result-prompts";
import { IMAGE_AGENT_EXPANSIONS, imageAgentExpansionCopy } from "@/lib/image-agent-expansions";
import { catalogUiCopy } from "@/lib/i18n/copy/catalog-ui";
import type { Locale } from "@/lib/i18n/types";
import { query } from "./db";
import { getSystemAgentOverride, listSystemAgentOverrides } from "./system-agents";

export type ImageAgent = {
  id: string;
  name: string;
  description: string;
  icon: string;
  mode: "T2I" | "EDIT" | "T2I_OR_EDIT";
  inputMin: number;
  inputMax: number;
  consentRequired: boolean;
  promptTemplate: string;
};

const COMMON_RULES = `HARD RULES:
- Follow the selected platform output exactly: format {{FORMAT}}, size {{SIZE}}, quality {{QUALITY}}, style {{STYLE}}. Never redefine them in the prompt or the image.
- User notes have priority over defaults unless they conflict with safety or the requested agent purpose.
- Do not invent text, names, logos, contact details or personal data unless the AGENT TASK explicitly requires exact text or a specific logo.
- When editing, preserve every pixel outside the requested target as closely as possible.
- Render requested text exactly, with the same spelling, punctuation and case.
- Return only the finished visual result; do not add explanations inside the image.`;

const FALLBACK_IMAGE_AGENTS: ImageAgent[] = [
  { id:"logo-generator",name:"Генератор логотипа",description:"Создаёт чистый, узнаваемый логотип и знак для бренда.",icon:"badge",mode:"T2I",inputMin:0,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["logo-generator"] },
  { id:"business-card",name:"Дизайн визитки",description:"Собирает аккуратную визитку с точной типографикой и контактами.",icon:"credit-card",mode:"T2I",inputMin:0,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["business-card"] },
  { id:"brand-style-mini",name:"Мини-фирменный стиль",description:"Создаёт компактную систему визуального стиля для бренда.",icon:"palette",mode:"T2I",inputMin:0,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["brand-style-mini"] },
  { id:"background-removal",name:"Удаление фона",description:"Аккуратно отделяет объект и сохраняет естественные края.",icon:"scan",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:`Remove the entire background from the attached image. Preserve the subject, hair, fur, transparent materials, soft edges, fine detail and original proportions. Do not retouch, recolor, reshape or add shadows unless explicitly requested. Produce a clean isolated subject suitable for transparent-background use.` },
  { id:"pro-headshot",name:"Деловой портрет",description:"Превращает селфи в естественный профессиональный портрет.",icon:"user-round",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["pro-headshot"] },
  { id:"face-swap",name:"Замена лица",description:"Переносит лицо с сохранением позы, света и естественности.",icon:"users-round",mode:"EDIT",inputMin:2,inputMax:2,consentRequired:true,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["face-swap"] },
  { id:"background-replace",name:"Замена фона",description:"Меняет окружение, сохраняя объект, перспективу и свет.",icon:"layers",mode:"EDIT",inputMin:1,inputMax:2,consentRequired:false,promptTemplate:`Replace only the background according to the user's description or reference. Preserve the main subject exactly. Match perspective, horizon, depth of field, light direction, contact shadows, reflections and color temperature so the composite looks photographed in one scene. Do not alter the subject unless explicitly requested.` },
  { id:"gta-filter",name:"Фильтр GTA",description:"Превращает фото в постерную иллюстрацию GTA с фирменной вставкой.",icon:"layers",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["gta-filter"] },
  { id:"natural-retouch",name:"Естественная ретушь",description:"Улучшает портрет без пластика и изменения личности.",icon:"wand",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["natural-retouch"] },
  { id:"privacy-redaction",name:"Скрытие персональных данных",description:"Надёжно закрывает выбранные лица, номера и документы.",icon:"shield",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:true,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["privacy-redaction"] },
  { id:"business-outfit",name:"Деловая одежда",description:"Меняет одежду на деловую, сохраняя человека и позу.",icon:"briefcase-business",mode:"EDIT",inputMin:1,inputMax:2,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["business-outfit"] },
  { id:"restore-old-photo",name:"Восстановить старое",description:"Восстанавливает старое фото и аккуратно окрашивает его в цвет.",icon:"image",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["restore-old-photo"] },
  { id:"remove-objects",name:"Убрать лишние объекты",description:"Удаляет нежелательные объекты с фото.",icon:"eraser",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["remove-objects"] },
  { id:"apply-tan",name:"Нанести загар",description:"Добавляет естественный загар, сохраняя человека и позу.",icon:"sun",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["apply-tan"] },
  { id:"remove-tattoo",name:"Удаление тату",description:"Убирает татуировку и восстанавливает естественную кожу.",icon:"wand",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["remove-tattoo"] },
  { id:"character-card",name:"Карточка персонажа",description:"Один и тот же персонаж в разных ракурсах.",icon:"layout-grid",mode:"EDIT",inputMin:3,inputMax:3,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["character-card"] },
  { id:"ai-character-card",name:"Карточка AI персонажа",description:"Создаёт сетку нового вымышленного персонажа по описанию.",icon:"layout-grid",mode:"T2I",inputMin:0,inputMax:0,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["ai-character-card"] },
  { id:"remove-makeup",name:"Удалить макияж",description:"Снимает макияж и оставляет естественную кожу.",icon:"smile",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["remove-makeup"] },
  { id:"add-makeup",name:"Добавить макияж",description:"Наносит выбранный макияж, сохраняя лицо.",icon:"sparkles",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["add-makeup"] },
  { id:"change-eye-color",name:"Изменить цвет глаз",description:"Меняет цвет глаз на указанный.",icon:"eye",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["change-eye-color"] },
  { id:"plump-lips",name:"Пухлые губы",description:"Делает губы пухлее с выбранной силой.",icon:"heart",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["plump-lips"] },
  { id:"whiten-teeth",name:"Отбелить зубы",description:"Отбеливает зубы до голливудской улыбки.",icon:"smile",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["whiten-teeth"] },
  { id:"remove-wrinkles",name:"Убрать морщины",description:"Смягчает морщины, не меняя личность.",icon:"wand",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["remove-wrinkles"] },
  { id:"add-cheekbones",name:"Добавить скулы",description:"Добавляет более выраженные скулы.",icon:"user-round",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["add-cheekbones"] },
  { id:"family-photo",name:"Объединить фото",description:"Собирает несколько портретов в одно общее фото.",icon:"users-round",mode:"EDIT",inputMin:2,inputMax:4,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["family-photo"] },
  { id:"combine-photos",name:"Объединить фото 2",description:"Ставит человека из одного фото в сцену с другого.",icon:"layers",mode:"EDIT",inputMin:2,inputMax:2,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["combine-photos"] },
  { id:"sunflowers",name:"Объединить фото 3",description:"Переносит человека на поле подсолнухов в новой позе.",icon:"sun",mode:"EDIT",inputMin:2,inputMax:2,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["sunflowers"] },
  { id:"remove-beard",name:"Удалить бороду",description:"Убирает бороду, сохраняя лицо, волосы и позу.",icon:"wand",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["remove-beard"] },
  { id:"bald",name:"Лысый",description:"Убирает все волосы с головы, сохраняя позу и исходное фото.",icon:"user-round",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS.bald },
  { id:"ducktail",name:"Утиный хвост",description:"Полная борода с удлинённым и заострённым низом.",icon:"wand",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS.ducktail },
  { id:"van-dyke",name:"Ван Дайк",description:"Отдельные усы и заострённая борода на подбородке, щеки выбриты.",icon:"wand",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["van-dyke"] },
  { id:"goatee",name:"Эспаньолка",description:"Борода в основном на подбородке, часто с усами.",icon:"wand",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS.goatee },
  { id:"full-beard",name:"Полная борода",description:"Густая борода, покрывающая подбородок, щеки и соединённая с усами.",icon:"wand",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["full-beard"] },
  { id:"short-boxed-beard",name:"Короткая полная борода",description:"Аккуратная борода по линии челюсти с подстриженными щеками и усами.",icon:"wand",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["short-boxed-beard"] },
  { id:"stubble",name:"Щетина",description:"Короткая борода 1–5 мм, эффект лёгкой небритости.",icon:"wand",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS.stubble },
  { id:"caesar",name:"Цезарь",description:"Короткая стрижка с ровной короткой челкой вперед.",icon:"scissors",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS.caesar },
  { id:"pompadour",name:"Помпадур",description:"Выраженный объем спереди и сверху, волосы зачесываются назад.",icon:"scissors",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS.pompadour },
  { id:"quiff",name:"Квифф",description:"Объемные волосы спереди, уложенные вверх и назад.",icon:"scissors",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS.quiff },
  { id:"crop",name:"Кроп",description:"Короткая текстурная стрижка с небольшой челкой вперед.",icon:"scissors",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS.crop },
  { id:"fade",name:"Фейд",description:"Плавный переход от очень коротких волос снизу к более длинным сверху.",icon:"scissors",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS.fade },
  { id:"undercut",name:"Андеркат",description:"Короткие или выбритые виски и затылок, сверху волосы заметно длиннее.",icon:"scissors",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS.undercut },
  { id:"shag",name:"Шэг",description:"Многослойная текстурная стрижка с намеренно небрежным объемом.",icon:"scissors",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS.shag },
  { id:"pixie",name:"Пикси",description:"Короткая стрижка с укороченными висками и затылком, верх обычно длиннее.",icon:"scissors",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS.pixie },
  { id:"long-bob",name:"Лонг-боб",description:"Удлиненный боб до плеч или чуть ниже, универсален для прямых и волнистых волос.",icon:"scissors",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["long-bob"] },
  { id:"cascade",name:"Каскад",description:"Волосы разной длины слоями, создают объем и движение.",icon:"scissors",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS.cascade },
  { id:"bob",name:"Боб",description:"Короткая или средняя стрижка с объемом на затылке и удлинением спереди.",icon:"scissors",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS.bob },
  { id:"kare",name:"Каре",description:"Ровная стрижка примерно до подбородка или плеч, с челкой или без.",icon:"scissors",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS.kare },
  { id:"sunset",name:"Закат",description:"Добавляет тёплый закатный свет к исходному кадру.",icon:"sun",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS.sunset },
  { id:"overcast",name:"Пасмурная погода",description:"Делает небо серым, без солнца.",icon:"layers",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS.overcast },
  { id:"sun-rays",name:"Солнечные лучи",description:"Добавляет лучи света сквозь облака.",icon:"sun",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["sun-rays"] },
  { id:"thunderstorm",name:"Гроза",description:"Тёмное небо, молнии и ливень.",icon:"wand",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS.thunderstorm },
  { id:"fog",name:"Туман",description:"Накрывает кадр густой дымкой и мягким светом.",icon:"layers",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS.fog },
  { id:"snow",name:"Снег",description:"Добавляет снежный покров и падающие хлопья.",icon:"sparkles",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS.snow },
  { id:"rain",name:"Дождь",description:"Мокрые улицы и падающие капли на исходном кадре.",icon:"layers",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS.rain },
  { id:"rock-star",name:"Рок-звезда",description:"Меняет одежду на сценический рок-образ.",icon:"sparkles",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["rock-star"] },
  { id:"queen",name:"Королева",description:"Меняет одежду на королевский образ с короной.",icon:"sparkles",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS.queen },
  { id:"king",name:"Король",description:"Меняет одежду на королевскую мантию и корону.",icon:"sparkles",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS.king },
  { id:"elf",name:"Эльф",description:"Меняет одежду на фэнтезийный эльфийский образ.",icon:"sparkles",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS.elf },
  { id:"roman-legionary",name:"Римский легионер",description:"Меняет одежду на форму римского легионера.",icon:"shield",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["roman-legionary"] },
  { id:"gladiator",name:"Гладиатор",description:"Меняет одежду на доспехи гладиатора.",icon:"shield",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS.gladiator },
  { id:"astronaut",name:"Космонавт",description:"Меняет одежду на космический костюм, лицо открыто.",icon:"user-round",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS.astronaut },
  { id:"steampunk",name:"Стимпанк",description:"Меняет одежду на стимпанк-образ с ремнями и металлом.",icon:"sparkles",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS.steampunk },
  { id:"vampire",name:"Вампир",description:"Меняет одежду на тёмный вампирский образ.",icon:"sparkles",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS.vampire },
  { id:"fantasy-mage",name:"Фэнтези-маг",description:"Меняет одежду на мантию мага с посохом.",icon:"wand",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["fantasy-mage"] },
  { id:"venetian-carnival",name:"Венецианский карнавал",description:"Меняет одежду на богатый карнавальный образ.",icon:"sparkles",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["venetian-carnival"] },
  { id:"pharaoh",name:"Фараон",description:"Меняет одежду на бело-золотые одежды фараона.",icon:"sparkles",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS.pharaoh },
  { id:"samurai",name:"Самурай",description:"Меняет одежду на доспехи самурая с катаной.",icon:"shield",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS.samurai },
  { id:"medieval-knight",name:"Средневековый рыцарь",description:"Меняет одежду на рыцарские доспехи.",icon:"shield",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["medieval-knight"] },
  { id:"pirate",name:"Пират",description:"Меняет одежду на пиратский камзол и сапоги.",icon:"sparkles",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS.pirate },
  { id:"black-widow",name:"Чёрная вдова",description:"Меняет одежду на чёрный тактический костюм.",icon:"shield",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["black-widow"] },
  { id:"thor",name:"Тор",description:"Меняет одежду на броню, красный плащ и молот.",icon:"sparkles",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS.thor },
  { id:"captain-america",name:"Капитан Америка",description:"Меняет одежду на сине-красный костюм со щитом.",icon:"shield",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["captain-america"] },
  { id:"iron-man",name:"Железный человек",description:"Меняет одежду на красно-золотой технокостюм.",icon:"sparkles",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["iron-man"] },
  { id:"spider-man",name:"Человек-паук",description:"Меняет одежду на красно-синий костюм с паутиной.",icon:"sparkles",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["spider-man"] },
  { id:"cowboy",name:"Ковбой",description:"Меняет одежду на ковбойский образ со шляпой.",icon:"user-round",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS.cowboy },
  { id:"flight-attendant",name:"Форма бортпроводника",description:"Меняет одежду на форму бортпроводника.",icon:"briefcase-business",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["flight-attendant"] },
  { id:"pilot-uniform",name:"Форма пилота",description:"Меняет одежду на форму пилота с погонами.",icon:"briefcase-business",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["pilot-uniform"] },
  { id:"school-uniform",name:"Школьная форма",description:"Меняет одежду на школьную форму, лицо открыто.",icon:"briefcase-business",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["school-uniform"] },
  { id:"firefighter-uniform",name:"Форма пожарного",description:"Меняет одежду на защитную форму пожарного.",icon:"shield",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["firefighter-uniform"] },
  { id:"medical-uniform",name:"Медицинская форма",description:"Меняет одежду на медицинский халат или костюм.",icon:"heart",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["medical-uniform"] },
  { id:"police-uniform",name:"Полицейская форма",description:"Меняет одежду на полицейскую форму.",icon:"shield",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["police-uniform"] },
  { id:"military-uniform",name:"Военная форма",description:"Меняет одежду на камуфляж и тактический жилет.",icon:"shield",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["military-uniform"] },
  { id:"business-suit-woman",name:"Деловой костюм жен",description:"Меняет одежду на юбку, блузу и пиджак.",icon:"briefcase-business",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["business-suit-woman"] },
  { id:"business-suit-man",name:"Деловой костюм муж",description:"Меняет одежду на классический мужской костюм.",icon:"briefcase-business",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["business-suit-man"] },
  { id:"uyuni",name:"Солончак Уюни",description:"Переносит человека на зеркальный солончак Уюни.",icon:"image",mode:"EDIT",inputMin:2,inputMax:2,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS.uyuni },
  { id:"bora-bora",name:"Бора-Бора",description:"Переносит человека на пирс лагуны Бора-Бора.",icon:"image",mode:"EDIT",inputMin:2,inputMax:2,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["bora-bora"] },
  { id:"new-york",name:"Нью-Йорк",description:"Переносит человека на улицы или крышу Нью-Йорка.",icon:"image",mode:"EDIT",inputMin:2,inputMax:2,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["new-york"] },
  { id:"petra",name:"Петра",description:"Переносит человека в каньон или к фасаду Петры.",icon:"image",mode:"EDIT",inputMin:2,inputMax:2,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS.petra },
  { id:"kyoto",name:"Киото",description:"Переносит человека к тории или в бамбуковый лес Киото.",icon:"image",mode:"EDIT",inputMin:2,inputMax:2,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS.kyoto },
  { id:"dolomites",name:"Доломитовые Альпы",description:"Переносит человека на тропу Доломитовых Альп.",icon:"image",mode:"EDIT",inputMin:2,inputMax:2,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS.dolomites },
  { id:"iceland",name:"Исландия",description:"Переносит человека к водопаду или чёрному пляжу Исландии.",icon:"image",mode:"EDIT",inputMin:2,inputMax:2,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS.iceland },
  { id:"maldives",name:"Мальдивы",description:"Переносит человека на белый пляж Мальдив.",icon:"image",mode:"EDIT",inputMin:2,inputMax:2,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS.maldives },
  { id:"paris",name:"Париж",description:"Переносит человека на улицу Парижа с Эйфелевой башней.",icon:"image",mode:"EDIT",inputMin:2,inputMax:2,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS.paris },
  { id:"dubai",name:"Дубай",description:"Переносит человека на террасу с панорамой Дубая.",icon:"image",mode:"EDIT",inputMin:2,inputMax:2,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS.dubai },
  { id:"cappadocia",name:"Каппадокия",description:"Переносит человека на смотровую с шарами Каппадокии.",icon:"image",mode:"EDIT",inputMin:2,inputMax:2,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS.cappadocia },
  { id:"santorini",name:"Санторини",description:"Переносит человека на белую террасу Санторини.",icon:"image",mode:"EDIT",inputMin:2,inputMax:2,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS.santorini },
  { id:"fantasy",name:"Фэнтези",description:"Герой сказочного мира с художественной прорисовкой.",icon:"sparkles",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS.fantasy },
  { id:"anime-hero",name:"Аниме-герой",description:"Узнаваемый человек в стиле современного аниме.",icon:"sparkles",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["anime-hero"] },
  { id:"clay",name:"Пластилиновый",description:"Объёмный персонаж с пластилиновой фактурой.",icon:"sparkles",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS.clay },
  { id:"comic",name:"Комикс",description:"Герой графического романа с чёткими контурами.",icon:"sparkles",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS.comic },
  { id:"drawn",name:"Рисованный",description:"Аккуратный цифровой рисунок с чистыми линиями.",icon:"sparkles",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS.drawn },
  { id:"hero-3d",name:"Герой 3D",description:"Объёмный персонаж современной 3D-анимации.",icon:"sparkles",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["hero-3d"] },
  { id:"caricature",name:"Шарж",description:"Узнаваемый человек с чуть преувеличенными чертами.",icon:"sparkles",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS.caricature },
  { id:"cartoon-hero",name:"Мультяшный герой",description:"Яркий мультперсонаж с выразительной мимикой.",icon:"sparkles",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["cartoon-hero"] },
  { id:"x-ray",name:"Эффект рентгена",description:"Стилизованный рентген лица с узнаваемым силуэтом.",icon:"sparkles",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["x-ray"] },
  { id:"watercolor",name:"Акварель",description:"Нежный акварельный портрет с тем же лицом.",icon:"sparkles",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS.watercolor },
  { id:"pixel-illustration",name:"Пиксельная иллюстрация",description:"Тёплый пиксельный рисунок, лицо крупным планом.",icon:"sparkles",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["pixel-illustration"] },
  { id:"old-age",name:"Я в старости",description:"Показывает, как человек будет выглядеть в выбранном возрасте.",icon:"user-round",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["old-age"] },
  { id:"fashion-caricature",name:"Карикатура",description:"Модная карикатура с преувеличенными чертами на нейтральном фоне.",icon:"sparkles",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["fashion-caricature"] },
  { id:"comic-2",name:"Комикс 2",description:"Более мультяшный комикс, кадр от колен в сельской местности.",icon:"sparkles",mode:"EDIT",inputMin:1,inputMax:1,consentRequired:false,promptTemplate:IMAGE_AGENT_RESULT_PROMPTS["comic-2"] },
  ...IMAGE_AGENT_EXPANSIONS.map((item) => {
    const copy = imageAgentExpansionCopy("ru", item.id)!;
    return { id: item.id, name: copy.name, description: copy.description, icon: item.group === "pose" ? "user-round" : "image", mode: "EDIT" as const, inputMin: 1, inputMax: 1, consentRequired: false, promptTemplate: IMAGE_AGENT_RESULT_PROMPTS[item.id] };
  }),
];

function sourcePromptTemplates():string[]{
  try{
    const source=readFileSync(path.join(process.cwd(),"content","image-agent-prompts.md"),"utf8");
    return [...source.matchAll(/##\s+\d+\.[^\n]*[\s\S]*?### Промт\s*\n```text\s*\n([\s\S]*?)\n```/g)].map((match)=>match[1].trim());
  }catch{return[];}
}

const exactTemplates=sourcePromptTemplates();
export const IMAGE_AGENTS:ImageAgent[]=FALLBACK_IMAGE_AGENTS.map((agent,index)=>({
  ...agent,
  promptTemplate:IMAGE_AGENT_RESULT_PROMPTS[agent.id]??exactTemplates[index]??agent.promptTemplate,
}));
let imageAgentsSynced=false;

type ImageAgentRow = { id:string;name:string;description:string;icon:string;mode:ImageAgent["mode"];input_min:number;input_max:number;consent_required:boolean;prompt_template:string };

const rowToAgent=(row:ImageAgentRow):ImageAgent=>({id:row.id,name:row.name,description:row.description,icon:row.icon,mode:row.mode,inputMin:row.input_min,inputMax:row.input_max,consentRequired:row.consent_required,promptTemplate:row.prompt_template});

function applyOverride(agent:ImageAgent,override:{name:string|null;description:string|null;icon:string|null;systemPrompt:string|null}|null):ImageAgent{
  if(!override)return agent;
  return {
    ...agent,
    name:override.name||agent.name,
    description:override.description||agent.description,
    icon:override.icon||agent.icon,
    promptTemplate:override.systemPrompt||agent.promptTemplate,
  };
}

export async function syncImageAgents(client?:PoolClient):Promise<void>{
  if(imageAgentsSynced)return;
  const execute=client?client.query.bind(client):async(text:string,values?:unknown[])=>({rows:await query(text,values)});
  for(const [index,agent] of IMAGE_AGENTS.entries()){
    await execute(`INSERT INTO image_agents(id,name,description,icon,mode,input_min,input_max,consent_required,prompt_template,sort_order)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,icon=EXCLUDED.icon,mode=EXCLUDED.mode,input_min=EXCLUDED.input_min,input_max=EXCLUDED.input_max,consent_required=EXCLUDED.consent_required,prompt_template=EXCLUDED.prompt_template,sort_order=EXCLUDED.sort_order,updated_at=now()`,
      [agent.id,agent.name,agent.description,agent.icon,agent.mode,agent.inputMin,agent.inputMax,agent.consentRequired,agent.promptTemplate,index+1]);
  }
  imageAgentsSynced=true;
}

export async function listImageAgents():Promise<ImageAgent[]>{
  await syncImageAgents();
  const rows=await query<ImageAgentRow>(`SELECT id,name,description,icon,mode,input_min,input_max,consent_required,prompt_template FROM image_agents WHERE active=true ORDER BY sort_order,id`);
  const overrides=await listSystemAgentOverrides();
  const byId=new Map(overrides.map((item)=>[item.id,item]));
  return rows.map((row)=>applyOverride(rowToAgent(row),byId.get(row.id)??null));
}

export async function findImageAgent(id:string,client?:PoolClient,userId?:string):Promise<ImageAgent|null>{
  await syncImageAgents(client);
  const result=client?await client.query<ImageAgentRow>(`SELECT id,name,description,icon,mode,input_min,input_max,consent_required,prompt_template FROM image_agents WHERE id=$1 AND active=true`,[id]):{rows:await query<ImageAgentRow>(`SELECT id,name,description,icon,mode,input_min,input_max,consent_required,prompt_template FROM image_agents WHERE id=$1 AND active=true`,[id])};
  if(result.rows[0]){
    const override=await getSystemAgentOverride(id,client);
    return applyOverride(rowToAgent(result.rows[0]),override);
  }
  if(!userId)return null;
  type CustomRow={id:string;name:string;description:string;icon:string;system_prompt:string};
  const custom=client
    ?await client.query<CustomRow>(`SELECT id,name,description,icon,system_prompt FROM custom_agents WHERE id=$1 AND user_id=$2 AND context='images'`,[id,userId])
    :{rows:await query<CustomRow>(`SELECT id,name,description,icon,system_prompt FROM custom_agents WHERE id=$1 AND user_id=$2 AND context='images'`,[id,userId])};
  const row=custom.rows[0];
  if(!row)return null;
  return {id:row.id,name:row.name,description:row.description,icon:row.icon,mode:"T2I_OR_EDIT",inputMin:0,inputMax:2,consentRequired:false,promptTemplate:row.system_prompt};
}

/**
 * Локализованное описание агента изображений. Русский текст из базы и
 * `FALLBACK_IMAGE_AGENTS` остаётся значением по умолчанию и используется только
 * для `ru` либо для агентов, которых нет в каталоге переводов.
 */
export function imageAgentDescription(id:string,locale:Locale,fallback=""):string{
  const localized=catalogUiCopy(locale).imageAgents[id];
  if(localized)return localized;
  if(locale==="ru")return fallback;
  return catalogUiCopy("en").imageAgents[id]??fallback;
}

/** Локализованное название агента изображений. */
export function imageAgentName(id:string,locale:Locale,fallback=""):string{
  const localized=catalogUiCopy(locale).imageAgentNames[id];
  if(localized)return localized;
  if(locale==="ru")return fallback;
  return catalogUiCopy("en").imageAgentNames[id]??fallback;
}

/** Возвращает агента с подписями на языке интерфейса. Промт не переводится. */
export function localizeImageAgent(agent:ImageAgent,locale:Locale):ImageAgent{
  const catalog=IMAGE_AGENTS.find((item)=>item.id===agent.id);
  if(!catalog)return agent;
  return {
    ...agent,
    name:agent.name!==catalog.name?agent.name:imageAgentName(agent.id,locale,agent.name),
    description:agent.description!==catalog.description?agent.description:imageAgentDescription(agent.id,locale,agent.description),
  };
}

/** Каталог агентов изображений на языке интерфейса. */
export async function listLocalizedImageAgents(locale:Locale):Promise<ImageAgent[]>{
  const agents=await listImageAgents();
  return agents.map((agent)=>localizeImageAgent(agent,locale));
}

export function photoListLabel(count:number):string{
  const safe=Math.max(0,Math.min(4,Math.floor(count)));
  if(!safe)return "";
  return Array.from({length:safe},(_,index)=>`Photo ${index+1}`).join(", ");
}

export function renderImageAgentPrompt(agent:ImageAgent,userPrompt:string,format:string,extras?:{size?:string;quality?:string;style?:string;photoCount?:number}):string{
  const hasUserNotes=agent.promptTemplate.includes("{{USER_NOTES}}");
  const size=extras?.size??"";
  const quality=extras?.quality??"";
  const style=extras?.style??"";
  const photoList=photoListLabel(extras?.photoCount??0);
  const rules=COMMON_RULES
    .replaceAll("{{FORMAT}}",format)
    .replaceAll("{{SIZE}}",size)
    .replaceAll("{{QUALITY}}",quality)
    .replaceAll("{{STYLE}}",style);
  const rendered=agent.promptTemplate
    .replaceAll("{{FORMAT}}",format)
    .replaceAll("{{SIZE}}",size)
    .replaceAll("{{QUALITY}}",quality)
    .replaceAll("{{STYLE}}",style)
    .replaceAll("{{PHOTO_LIST}}",photoList)
    .replaceAll("{{USER_NOTES}}",userPrompt.trim())
    .replace(/^.*{{[A-Z0-9_]+}}.*(?:\n|$)/gm,"")
    .replace(/\n{3,}/g,"\n\n")
    .trim();
  return `${rules}\n\nAGENT TASK:\n${rendered}${hasUserNotes?"":`\n\nUSER NOTES:\n${userPrompt.trim()}`}`;
}
