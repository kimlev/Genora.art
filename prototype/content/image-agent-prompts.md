# Агенты для картинок

Спецификация 10 прикладных агентов генерации и редактирования изображений.
Документ предназначен для загрузки в базу агентов: каждый раздел содержит описание, поля ввода, готовый промт-шаблон и критерии приёмки.

Версия: 1.0 · Дата: 14.08.26

---

## 0. Общие правила (обязательны для всех агентов)

### 0.1 Что агент НЕ определяет

Эти параметры задаёт пользователь в интерфейсе, поэтому в тексте промта их запрещено фиксировать словами:

- соотношение сторон и ориентация;
- разрешение, размер в пикселях, DPI;
- количество генераций;
- модель и качество/скорость.

В промт подставляется только один служебный токен `{{FORMAT}}` — платформа заполняет его выбранным пользователем форматом. Никаких «16:9», «квадрат», «4K», «вертикально» в тексте промта быть не должно.

### 0.2 Приоритет инструкций

Каждый промт состоит из трёх слоёв. Порядок приоритета при конфликте строго такой:

1. **HARD RULES** — технические и этические ограничения. Не переопределяются ничем.
2. **{{USER_NOTES}}** — свободные пожелания пользователя. Переопределяют любые значения из DEFAULTS.
3. **DEFAULTS** — значения по умолчанию (свет, фон, стиль, кадрирование). Уступают пожеланиям пользователя.

Стандартный блок, который вставляется в конец каждого промта:

```text
USER ADDITIONS (highest creative priority): {{USER_NOTES}}
Precedence: USER ADDITIONS override any DEFAULTS above. They never override HARD RULES.
If a user addition contradicts a HARD RULE, satisfy the HARD RULE and silently ignore that part of the addition.
Output format: {{FORMAT}} — compose inside it, keep every critical element clear of the edges. Do not describe or annotate the format.
```

### 0.3 Пустые поля

Если поле не заполнено, строка удаляется из промта целиком. Запрещено подставлять названия переменных, «N/A», «не указано» или придумывать значение за пользователя.

### 0.4 Работа с текстом на изображении

Все строки (имя, телефон, HEX, название бренда) передаются в промт в кавычках и сопровождаются инструкцией `render exactly, character for character, do not translate, do not abbreviate, do not invent additional lines`. Это главный источник брака в подобных агентах.

### 0.5 Типы агентов

- **T2I** — генерация с нуля из текста.
- **EDIT** — редактирование загруженного изображения; ключевое требование во всех EDIT-агентах: *всё, что не названо в задаче, остаётся пиксельно неизменным*.

### 0.6 Согласие и законность

Агенты 6 (замена лица) и 9 (скрытие персональных данных) требуют подтверждения прав на исходные материалы. В интерфейсе — обязательный чекбокс согласия; в промте — блок отказа от обработки документов с целью подделки.

---

## 1. Генератор логотипа

- **slug:** `logo-generator`
- **Тип:** T2I_OR_EDIT
- **Что делает:** по названию, сфере и характеру бренда строит чистый знак в векторной стилистике, пригодный для уменьшения до иконки.
- **Входные изображения:** 1 обязательное (референс стиля или исходное фото).

### Поля ввода

| Поле | Тип | Обяз. | Пример |
|------|-----|-------|--------|
| `BRAND_NAME` | строка | да | Northwind |
| `TAGLINE` | строка | нет | logistics since 2016 |
| `INDUSTRY` | строка | да | грузовые перевозки по Европе |
| `AUDIENCE` | строка | нет | средний бизнес, закупщики |
| `PERSONALITY` | 2–4 слова | да | надёжный, точный, сдержанный |
| `LOGO_TYPE` | выбор | да | wordmark / lettermark / pictorial mark / abstract mark / emblem lockup |
| `PALETTE` | строка | нет | глубокий синий и графит |
| `AVOID` | строка | нет | без глобусов, без стрелок |

### Промт

```text
Solid Genora.art brand-blue background #4A9EFF filling the entire frame. Centered composition of THREE abstract logo marks arranged in a triangle (two on top, one below), no letters, no words, no typography anywhere. Logo 1: geometric hexagon/node mark in white with a small navy cut. Logo 2: overlapping rounded triangles in deep navy #1B2A44 and warm gold #E8B84A, different silhouette. Logo 3: circular orbit/spark mark in coral-red #E85D4C and white, completely different shape. Each mark on its own soft white rounded square tile with gentle shadow, like a logo presentation board. Clean studio lighting, high-end brand design, no text, no watermarks, no UI chrome.

USER ADDITIONS (highest creative priority): {{USER_NOTES}}
Precedence: USER ADDITIONS override any DEFAULTS above. They never override HARD RULES.
If a user addition contradicts a HARD RULE, satisfy the HARD RULE and silently ignore that part of the addition.
Output format: {{FORMAT}} — compose inside it, keep every critical element clear of the edges. Do not describe or annotate the format.
```

### Критерии приёмки

- Название написано без ошибок и лишних символов.
- Нет теней, градиентов и «объёма», если пользователь их не просил.
- Знак читается при уменьшении до иконки.
- Фон однотонный, без мокапа и посторонних объектов.

---

## 2. Дизайн визитки

- **slug:** `business-card`
- **Тип:** T2I_OR_EDIT
- **Что делает:** собирает готовый к печати макет визитки с точными контактами, при необходимости — обе стороны.
- **Входные изображения:** логотип (опционально, PNG с прозрачностью).

### Поля ввода

| Поле | Тип | Обяз. | Пример |
|------|-----|-------|--------|
| `FULL_NAME` | строка | да | Кирилл Ефремов |
| `ROLE` | строка | да | Head of Growth |
| `COMPANY` | строка | да | Northwind |
| `PHONE` | строка | нет | +44 20 7946 0112 |
| `EMAIL` | строка | нет | k@northwind.co |
| `WEBSITE` | строка | нет | northwind.co |
| `ADDRESS` | строка | нет | 14 Bevis Marks, London |
| `QR` | да/нет | нет | да |
| `SIDES` | выбор | да | front / back / both |
| `STYLE` | выбор | да | minimal swiss / editorial serif / bold corporate / soft modern |
| `PALETTE` | строка | нет | графит, тёплый белый, акцент оранжевый |

### Промт

```text
Soft cool studio background in light blue-grey mist (#E8F1FB) with subtle navy depth. A single stylish physical business card at a slight 3/4 angle, thick matte paper, sharp print. Card design: dark navy #1B2A44 front with brand-blue #4A9EFF accent bar. Minimal sans-serif English typography only: 'Genora.art' small at top, name 'Rob Qake' large, title 'Chief Executive Officer', phone '+852 2117 6408', email 'rob.qake@genora.art', city 'Hong Kong'. Clean geometric mark (abstract M/nodes, no letters as logo) in brand blue. Soft shadow, editorial photography, luxury stationery, no extra objects, no watermarks.

USER ADDITIONS (highest creative priority): {{USER_NOTES}}
Precedence: USER ADDITIONS override any DEFAULTS above. They never override HARD RULES.
If a user addition contradicts a HARD RULE, satisfy the HARD RULE and silently ignore that part of the addition.
Output format: {{FORMAT}} — compose inside it, keep every critical element clear of the edges. Do not describe or annotate the format.
```

### Критерии приёмки

- Все контакты совпадают с введёнными посимвольно, ничего не добавлено.
- Текст не обрезан и не выходит за поля.
- Макет плоский, без мокап-сцены, если пользователь её не просил.
- Иерархия читается с расстояния: сначала имя, затем должность, затем контакты.

---

## 3. Мини-фирменный стиль

- **slug:** `brand-style-mini`
- **Тип:** T2I (EDIT, если загружен логотип)
- **Что делает:** собирает одностраничный style sheet: логотип, палитра с HEX, шрифтовая пара и примеры применения.
- **Входные изображения:** логотип (опционально).

### Поля ввода

| Поле | Тип | Обяз. | Пример |
|------|-----|-------|--------|
| `BRAND_NAME` | строка | да | Northwind |
| `INDUSTRY` | строка | да | грузовые перевозки |
| `MOOD` | 2–4 слова | да | сдержанный, инженерный |
| `BASE_COLOR` | строка/HEX | нет | #1B2A4A |
| `TYPE_PREFERENCE` | строка | нет | геометрический гротеск |
| `APPLICATIONS` | мультивыбор | да | бланк, папка, аватарка, бейдж, наклейка |

### Промт

```text
Genora.art brand kit infographic. Cool navy-to-mist background. A neat flat-lay of a compact visual identity system on a desk: 1) small logo tile with abstract geometric mark in #4A9EFF on navy, 2) color chips labeled in English only: Navy, Brand Blue, Mist, Gold, 3) type specimen card showing the word 'Aa' and 'Genora.art' in clean grotesque sans, 4) miniature business card, 5) stationery corner. Short English labels only: Logo, Palette, Type, Stationery. Premium design-system aesthetic, tight composition, no clutter, no Russian text, no watermarks.

USER ADDITIONS (highest creative priority): {{USER_NOTES}}
Precedence: USER ADDITIONS override any DEFAULTS above. They never override HARD RULES.
If a user addition contradicts a HARD RULE, satisfy the HARD RULE and silently ignore that part of the addition.
Output format: {{FORMAT}} — compose inside it, keep every critical element clear of the edges. Do not describe or annotate the format.
```

### Критерии приёмки

- HEX-коды корректны и соответствуют образцам цвета.
- Подписи разделов читаемые, без искажённых букв.
- Все блоки на одной сетке, ничего не обрезано.
- Палитра работает: есть светлый нейтральный, тёмный нейтральный и один акцент.

---

## 4. Удаление фона

- **slug:** `background-removal`
- **Тип:** EDIT
- **Что делает:** изолирует объект и отдаёт его на прозрачном фоне, сохраняя сложные края.
- **Входные изображения:** 1 обязательное.

### Поля ввода

| Поле | Тип | Обяз. | Пример |
|------|-----|-------|--------|
| `SUBJECT` | строка | нет | девушка в пальто |
| `FALLBACK_BG` | выбор | да | transparent / pure white / pure black / custom HEX |
| `KEEP_SHADOW` | да/нет | да | нет |

### Промт

```text
Cut out the main subject from the supplied photograph and remove the background completely.

TARGET
Subject to keep: {{SUBJECT}}. If not specified, keep the single most prominent foreground subject and remove everything else.
Background result: {{FALLBACK_BG}}. Deliver full alpha transparency when the pipeline supports it; otherwise fill with a perfectly uniform, unshaded colour.
Ground shadow: {{KEEP_SHADOW}} — when yes, retain only the subject's own contact shadow, cleanly separated from the removed background.

EDGE QUALITY
Preserve fine boundary detail at full fidelity: individual hair strands, fur, fabric fibres, lace, feathers, wisps, thin straps and antennae.
Handle semi-transparency correctly: glass, plastic, veils, smoke, water, and motion blur keep partial alpha rather than being cut hard or filled in.
No halo, no light fringe, no dark outline, no colour bleed from the removed background, no visible stair-stepping, no over-smoothed rubbery silhouette.
Do not erode the subject: nothing gets shaved off the outline, no limbs, fingers, ears or accessories are trimmed.

HARD RULES
This is a masking operation only. Do not redraw, regenerate, restyle, retouch, relight, reposition, rotate, crop or resample the subject.
Preserve the subject's original pixels: exact colours, exposure, contrast, sharpness, grain and lens character.
Do not add reflections, glows, outlines, stickers, text or new shadows.
Do not remove parts of the subject that merely resemble background, and do not keep background objects that touch or overlap the subject.

USER ADDITIONS (highest creative priority): {{USER_NOTES}}
Precedence: USER ADDITIONS override any DEFAULTS above. They never override HARD RULES.
If a user addition contradicts a HARD RULE, satisfy the HARD RULE and silently ignore that part of the addition.
Output format: {{FORMAT}} — compose inside it, keep every critical element clear of the edges. Do not describe or annotate the format.
```

### Критерии приёмки

- Объект не изменён: цвет, резкость и детали идентичны исходнику.
- Волосы и полупрозрачные участки сохранены, без белой каймы.
- Фон полностью удалён, включая узкие зазоры между рукой и телом.

---

## 5. Деловой портрет из селфи

- **slug:** `pro-headshot`
- **Тип:** EDIT
- **Что делает:** превращает бытовое фото в студийный деловой портрет с полным сохранением личности.
- **Входные изображения:** 1 обязательное (лицо крупно, в фокусе, без сильных теней).

### Поля ввода

| Поле | Тип | Обяз. | Пример |
|------|-----|-------|--------|
| `BACKDROP` | выбор | да | neutral grey / soft white / dark charcoal / blurred office |
| `WARDROBE` | выбор | нет | keep as is / shirt / shirt and jacket / blouse / knit |
| `FRAMING` | выбор | да | head and shoulders / upper body |
| `MOOD` | выбор | нет | approachable / confident / editorial |

### Промт

```text
Same exact person as the reference selfie, same face identity, now a professional LinkedIn-style business headshot. Wear a tailored navy suit jacket and crisp white shirt, no tie. Soft studio key light, clean cool grey-blue backdrop in Genora.art tones. Skin naturally even but still real, hair neatly groomed, confident calm expression. Tight portrait crop shoulders-up. Photorealistic, no text, no watermark. Do not change facial identity.

USER ADDITIONS (highest creative priority): {{USER_NOTES}}
Precedence: USER ADDITIONS override any DEFAULTS above. They never override HARD RULES.
If a user addition contradicts a HARD RULE, satisfy the HARD RULE and silently ignore that part of the addition.
Output format: {{FORMAT}} — compose inside it, keep every critical element clear of the edges. Do not describe or annotate the format.
```

### Критерии приёмки

- Человек узнаётся при сравнении с исходником.
- Кожа с текстурой, без «пластика».
- Глаза резкие, с блеском, взгляд в камеру.
- Фон ровный, одежда сидит по фигуре, без артефактов на воротнике.

---

## 6. Замена лица

- **slug:** `face-swap`
- **Тип:** EDIT (2 входа)
- **Что делает:** переносит личность с фото-источника на человека в целевом кадре, сохраняя свет, позу и композицию цели.
- **Входные изображения:** 2 обязательных — целевая сцена и фото лица-источника.
- **Требуется согласие:** да.

### Поля ввода

| Поле | Тип | Обяз. | Пример |
|------|-----|-------|--------|
| `TARGET_PERSON` | строка | нет | человек справа |
| `SWAP_HAIR` | да/нет | да | нет |
| `MATCH_AGE` | выбор | нет | keep source age / adapt to target |
| `CONSENT` | чекбокс | да | подтверждаю права на оба изображения |

### Промт

```text
Same photo pose, lighting, hair, clothing, and framing as the first reference, but the FACE is swapped to the consenting identity from the second attached photo: keep the swap photorealistic and well placed in the frame with strong face emphasis. The body, hair color/length, pose, and background stay the same as the first reference. Photorealistic seamless face swap result. No text, no watermark.

USER ADDITIONS (highest creative priority): {{USER_NOTES}}
Precedence: USER ADDITIONS override any DEFAULTS above. They never override HARD RULES.
If a user addition contradicts a HARD RULE, satisfy the HARD RULE and silently ignore that part of the addition.
Output format: {{FORMAT}} — compose inside it, keep every critical element clear of the edges. Do not describe or annotate the format.
```

### Критерии приёмки

- Лицо узнаётся как лицо из источника, а поза и свет — из целевого кадра.
- Нет видимой границы маски, тон лица и шеи совпадает.
- Всё вне лица не изменилось.

---

## 7. Замена фона

- **slug:** `background-replace`
- **Тип:** EDIT
- **Что делает:** ставит объект в новое окружение с корректным светом, перспективой и тенью.
- **Входные изображения:** 1 обязательное, опционально референс фона.

### Поля ввода

| Поле | Тип | Обяз. | Пример |
|------|-----|-------|--------|
| `NEW_BACKGROUND` | строка | да | светлый минималистичный офис, окно слева |
| `TIME_OF_DAY` | выбор | нет | soft daylight / golden hour / overcast / indoor evening |
| `DEPTH` | выбор | нет | sharp / gently blurred / strongly blurred |
| `KEEP_SUBJECT_LIGHT` | да/нет | да | нет |

### Промт

```text
Keep the subject from the supplied photograph and place it into a new environment.

NEW ENVIRONMENT
Scene: {{NEW_BACKGROUND}}. Light condition: {{TIME_OF_DAY}}. Background rendering: {{DEPTH}}.
The environment must be physically plausible and consistent: one coherent space, correct scale relative to the subject, believable materials, no impossible geometry, no repeated pasted elements.

INTEGRATION — this is what makes the result convincing
Match perspective: camera height, horizon line, vanishing lines and focal length of the background must agree with how the subject was photographed.
Match light: the new key light direction, colour temperature, intensity, hardness and contrast must be reflected on the subject. Relight the subject accordingly unless {{KEEP_SUBJECT_LIGHT}} is yes.
Ground the subject: correct contact shadow with the right direction, softness and density, plus subtle ambient occlusion where the subject meets a surface. The subject must never appear to float.
Match optics and colour: consistent depth of field, grain, noise, sharpness, colour grade and dynamic range across subject and background.
Add restrained environmental interaction where it is physically justified: bounce light, reflected colour on the subject's edges, plausible reflection on glossy floors.

HARD RULES
Do not change the subject's identity, face, pose, gesture, proportions, hairstyle, clothing, colours of clothing or accessories.
Do not crop, mirror, rotate, rescale or reposition the subject unless the user asks for it.
Cutout quality must be clean: preserve hair strands and semi-transparent areas, no halo, no fringe, no cut-off fingers or limbs.
No text, signage with invented words, watermark, logo, brand mark or extra people in the new background.
Keep skin texture and facial detail intact when relighting.

USER ADDITIONS (highest creative priority): {{USER_NOTES}}
Precedence: USER ADDITIONS override any DEFAULTS above. They never override HARD RULES.
If a user addition contradicts a HARD RULE, satisfy the HARD RULE and silently ignore that part of the addition.
Output format: {{FORMAT}} — compose inside it, keep every critical element clear of the edges. Do not describe or annotate the format.
```

### Критерии приёмки

- Направление света на объекте совпадает с фоном.
- Есть контактная тень, объект «стоит», а не висит.
- Края чистые, без свечения и каймы.
- Лицо и одежда не изменились.

---

## 8. Естественная ретушь

- **slug:** `natural-retouch`
- **Тип:** EDIT
- **Что делает:** убирает временные дефекты кожи, сохраняя текстуру, черты и возраст.
- **Входные изображения:** 1 обязательное.

### Поля ввода

| Поле | Тип | Обяз. | Пример |
|------|-----|-------|--------|
| `INTENSITY` | выбор | да | subtle / standard / editorial |
| `TEETH` | да/нет | нет | нет |
| `STRAY_HAIR` | да/нет | нет | да |
| `KEEP_MARKS` | да/нет | да | да |

### Промт

```text
Same exact person as the reference portrait, same pose, hair, lighting, and identity. Natural professional retouch only: even skin tone, reduced redness and under-eye shadows, tidy flyaways, slight catchlight. Still looks like a real person, no plastic skin, no face reshape, no makeup transformation. Photorealistic. No text, no watermark.

USER ADDITIONS (highest creative priority): {{USER_NOTES}}
Precedence: USER ADDITIONS override any DEFAULTS above. They never override HARD RULES.
If a user addition contradicts a HARD RULE, satisfy the HARD RULE and silently ignore that part of the addition.
Output format: {{FORMAT}} — compose inside it, keep every critical element clear of the edges. Do not describe or annotate the format.
```

### Критерии приёмки

- При увеличении видны поры, нет размытых пятен на коже.
- Родинки и веснушки на месте, возраст не изменился.
- Черты лица не изменены, тон кожи тот же.

---

## 9. Скрытие персональных данных

- **slug:** `privacy-redaction`
- **Тип:** EDIT
- **Что делает:** находит и надёжно закрывает персональные данные на фото перед публикацией.
- **Входные изображения:** 1 обязательное.
- **Требуется согласие:** да (запрет использования для подделки документов).

### Поля ввода

| Поле | Тип | Обяз. | Пример |
|------|-----|-------|--------|
| `METHOD` | выбор | да | strong blur / pixelation / solid block / plausible replacement |
| `KEEP_VISIBLE` | строка | нет | лицо человека в центре оставить |
| `TARGETS` | мультивыбор | да | лица, номера машин, документы, экраны, бейджи, адреса, банковские карты, QR и штрихкоды |
| `STYLE_MATCH` | да/нет | нет | да |

### Промт

```text
Photorealistic. Recreate the SAME scene as the reference. Do NOT add a mosaic or pixel grid over the whole photo. Keep the photo clean. Apply ONLY privacy blurs: 1) a strong gaussian blur covering just faces, 2) a strong gaussian blur covering just license plates or document numbers so they cannot be read. Body, car, background stay perfectly sharp and unfiltered. No overlays, no icons, no text, no watermark.

USER ADDITIONS (highest creative priority): {{USER_NOTES}}
Precedence: USER ADDITIONS override any DEFAULTS above. They never override HARD RULES.
If a user addition contradicts a HARD RULE, satisfy the HARD RULE and silently ignore that part of the addition.
Output format: {{FORMAT}} — compose inside it, keep every critical element clear of the edges. Do not describe or annotate the format.
```

### Критерии приёмки

- Ни один символ на закрытых участках не читается и не восстанавливается.
- Закрыты все повторы, включая отражения и задний план.
- Остальная часть кадра не изменилась.

---

## 10. Переодеть в деловую одежду

- **slug:** `business-outfit`
- **Тип:** EDIT
- **Что делает:** заменяет одежду на деловую, сохраняя человека, позу, свет и фон.
- **Входные изображения:** 1 обязательное, опционально референс одежды.

### Поля ввода

| Поле | Тип | Обяз. | Пример |
|------|-----|-------|--------|
| `GARMENT` | выбор | да | shirt / shirt and blazer / blouse / knit top / sheath dress / polo |
| `COLOR` | строка | да | белый, холодный оттенок |
| `FORMALITY` | выбор | да | business casual / business formal |
| `TIE` | выбор | нет | none / plain tie / knitted tie |
| `FIT` | выбор | нет | tailored / relaxed |

### Промт

```text
Same exact person as the reference, same face, hair, body, pose, and background. Only the clothing changed: a tailored charcoal suit, light blue dress shirt, no loud patterns. Photorealistic clothing swap, natural fabric, same lighting. Identity must match the reference. No text, no watermark.

USER ADDITIONS (highest creative priority): {{USER_NOTES}}
Precedence: USER ADDITIONS override any DEFAULTS above. They never override HARD RULES.
If a user addition contradicts a HARD RULE, satisfy the HARD RULE and silently ignore that part of the addition.
Output format: {{FORMAT}} — compose inside it, keep every critical element clear of the edges. Do not describe or annotate the format.
```

### Критерии приёмки

- Одежда сидит по фигуре, складки соответствуют позе.
- Свет на одежде совпадает со светом на лице.
- Кисти рук и шея целые, без артефактов на границе.
- Лицо и фон не изменились.

---

## 11. Сводная таблица для базы агентов

| # | slug | Название | Тип | Входы | Согласие |
|---|------|----------|-----|-------|----------|
| 1 | `logo-generator` | Генератор логотипа | T2I | 0–1 | нет |
| 2 | `business-card` | Дизайн визитки | T2I / EDIT | 0–1 | нет |
| 3 | `brand-style-mini` | Мини-фирменный стиль | T2I / EDIT | 0–1 | нет |
| 4 | `background-removal` | Удаление фона | EDIT | 1 | нет |
| 5 | `pro-headshot` | Деловой портрет из селфи | EDIT | 1 | нет |
| 6 | `face-swap` | Замена лица | EDIT | 2 | да |
| 7 | `background-replace` | Замена фона | EDIT | 1–2 | нет |
| 8 | `natural-retouch` | Естественная ретушь | EDIT | 1 | нет |
| 9 | `privacy-redaction` | Скрытие персональных данных | EDIT | 1 | да |
| 10 | `business-outfit` | Переодеть в деловую одежду | EDIT | 1–2 | нет |

## 12. Требования к реализации в базе

1. Промты хранить как шаблоны с плейсхолдерами `{{...}}`; подстановка на стороне бэкенда, без изменения формулировок.
2. Незаполненные плейсхолдеры вырезать вместе со строкой перед отправкой в модель.
3. `{{FORMAT}}` заполняет платформа из выбора пользователя. Значения формата и размера нигде больше в промте не появляются.
4. `{{USER_NOTES}}` всегда идёт последним блоком и никогда не смешивается с блоком HARD RULES.
5. Для EDIT-агентов передавать исходное изображение как основной вход; для агента 6 порядок входов фиксирован: первое — целевая сцена, второе — источник лица.
6. Блоки «Критерии приёмки» использовать как чек-лист для автопроверки или для подсказок пользователю при повторной генерации.
