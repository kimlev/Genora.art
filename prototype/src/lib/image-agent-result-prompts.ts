import { IMAGE_AGENT_EXPANSION_PROMPTS } from "@/lib/image-agent-expansions";

const PROMPT_FOOTER = `USER ADDITIONS (highest creative priority): {{USER_NOTES}}
Precedence: USER ADDITIONS override any DEFAULTS above. They never override HARD RULES.
If a user addition contradicts a HARD RULE, satisfy the HARD RULE and silently ignore that part of the addition.
Output format: {{FORMAT}}. Output size: {{SIZE}}. Output quality: {{QUALITY}}. Visual style: {{STYLE}}.
Follow these platform parameters exactly. Never override format, size, quality or style in the image. Compose inside the chosen format and keep every critical element clear of the edges. Do not describe or annotate the format.`;

const HAIR_COLOR_RULE = `If USER ADDITIONS name a hair color, use that color. If they do not name a color, keep the hair color from the attached photo.`;
const BEARD_COLOR_RULE = `If USER ADDITIONS name a beard color, use that color. If they do not name a color, keep the beard color from the attached photo.`;
const SUIT_COLOR_RULE = `If USER ADDITIONS name a suit color, use that color for the suit. If they do not name a color, use a classic dark navy or charcoal suit.`;
const LOCATION_IDENTITY = `Use the attached reference photos of the same person. Keep identity, face, hair, body and the clothes they are already wearing. Do not change the outfit.`;

/** Промты «после», которыми собраны обложки. Без указания формата кадра — его задаёт студия. */
export const IMAGE_AGENT_RESULT_PROMPTS: Record<string, string> = {
  ...IMAGE_AGENT_EXPANSION_PROMPTS,
  "logo-generator": `Create ONE polished brand identity presentation sheet containing EXACTLY FIVE logo applications in one clean grid. Derive one original, simple, recognizable logo mark and one matching wordmark from USER ADDITIONS. Use the exact brand name and spelling supplied by the user. If the user gives a business description, use it only to guide the visual concept; do not turn the description into extra text. The same mark, wordmark, typography, proportions and brand colors must remain identical in all five applications. This is one coherent identity system, not five unrelated logo concepts.

GRID STRUCTURE — five clearly separated tiles only: a balanced two-column grid for tiles 1–4, followed by one centered square favicon tile below them. Keep comfortable internal margins and show every logo completely without cropping.

1. DARK WEBSITE LOCKUP: dark background; logo mark on the LEFT and exact brand wordmark on the RIGHT, aligned horizontally for a website header.
2. DARK STACKED LOCKUP: dark background; the same logo mark CENTERED ABOVE the exact brand wordmark, suitable as the primary stacked logo.
3. LIGHT WEBSITE LOCKUP: light background; the same logo mark on the LEFT and exact brand wordmark on the RIGHT, aligned horizontally for a website header.
4. LIGHT STACKED LOCKUP: light background; the same logo mark CENTERED ABOVE the exact brand wordmark, suitable as the primary stacked logo.
5. FAVICON: one square favicon using only the same logo mark, centered and simplified for legibility at 16×16 and 32×32 pixels; no wordmark and no extra symbol.

HARD RULES: exactly five tiles and exactly these five applications. Do not add captions, letters A–E, mockup devices, browser chrome, slogans, taglines, color swatches, alternate concepts or decorative filler. Apart from the exact brand wordmark in tiles 1–4, render no other text. Preserve exact spelling and case in all four wordmarks. Use high contrast on both dark and light themes. Flat professional vector-brand presentation, crisp geometry, clean typography, no perspective distortion, no watermarks.

${PROMPT_FOOTER}`,
  "ai-character-card": `Create ONE original fictional adult character from USER ADDITIONS. Treat every stated trait as binding, including age, gender presentation, hair color and style, height, body proportions, clothing, distinguishing marks and requested visual style. Do not imitate or resemble a named real person.

Create ONE strict 3-by-3 contact sheet with nine equal, clearly separated tiles of this exact same character: frontal close-up, left profile, right profile, three-quarter left, three-quarter right, waist-up front, full-body front, full-body side, and full-body three-quarter back. Keep the identical face, hair, body, outfit, distinguishing marks, clean neutral background, even studio light and lens character in every tile.

HARD FRAMING RULES. The complete head, including the top of the hair, must remain visible in every tile. The first row contains head-and-shoulders portraits with a small margin above the hair. The second row contains waist-up views and must never crop the head. ALL THREE tiles in the bottom row are true head-to-toe full-body views with the complete shoes and visible neutral floor. Leave 8–12% empty margin above the head and below the feet. Scale the character down as needed. Never crop the head, hands, knees, legs, ankles, feet or shoes. This is one consistent fictional character, not nine different people. No text, labels, logos or watermark.

${PROMPT_FOOTER}`,
  "business-card": `Soft cool studio background in light blue-grey mist (#E8F1FB) with subtle navy depth. A single stylish physical business card at a slight 3/4 angle, thick matte paper, sharp print. Card design: dark navy #1B2A44 front with brand-blue #4A9EFF accent bar. Minimal sans-serif English typography only: 'Genora.art' small at top, name 'Rob Qake' large, title 'Chief Executive Officer', phone '+852 2117 6408', email 'rob.qake@genora.art', city 'Hong Kong'. Clean geometric mark (abstract M/nodes, no letters as logo) in brand blue. Soft shadow, editorial photography, luxury stationery, no extra objects, no watermarks.

${PROMPT_FOOTER}`,
  "brand-style-mini": `Genora.art brand kit infographic. Cool navy-to-mist background. A neat flat-lay of a compact visual identity system on a desk: 1) small logo tile with abstract geometric mark in #4A9EFF on navy, 2) color chips labeled in English only: Navy, Brand Blue, Mist, Gold, 3) type specimen card showing the word 'Aa' and 'Genora.art' in clean grotesque sans, 4) miniature business card, 5) stationery corner. Short English labels only: Logo, Palette, Type, Stationery. Premium design-system aesthetic, tight composition, no clutter, no Russian text, no watermarks.

${PROMPT_FOOTER}`,
  "pro-headshot": `Same exact person as the reference selfie, same face identity, now a professional LinkedIn-style business headshot. Wear a tailored navy suit jacket and crisp white shirt, no tie. Soft studio key light, clean cool grey-blue backdrop in Genora.art tones. Skin naturally even but still real, hair neatly groomed, confident calm expression. Tight portrait crop shoulders-up. Photorealistic, no text, no watermark. Do not change facial identity.

${PROMPT_FOOTER}`,
  "face-swap": `Photo 1 is the identity to PUT IN: use that person's FACE and HAIR (color, length, and style). Photo 2 is the photo whose FACE we REPLACE: keep Photo 2 pose, lighting, clothing, body, framing, and background. Photorealistic seamless identity swap, well placed, strong face emphasis. No text, no watermark.

${PROMPT_FOOTER}`,
  "natural-retouch": `Same exact person as the reference portrait, same pose, hair, lighting, and identity. Natural professional retouch only: even skin tone, reduced redness and under-eye shadows, tidy flyaways, slight catchlight. Still looks like a real person, no plastic skin, no face reshape, no makeup transformation. Photorealistic. No text, no watermark.

${PROMPT_FOOTER}`,
  "privacy-redaction": `Photorealistic. Recreate the SAME scene as the reference. Do NOT add a mosaic or pixel grid over the whole photo. Keep the photo clean. Apply ONLY privacy blurs: 1) a strong gaussian blur covering just faces, 2) a strong gaussian blur covering just license plates or document numbers so they cannot be read. Body, car, background stay perfectly sharp and unfiltered. No overlays, no icons, no text, no watermark.

${PROMPT_FOOTER}`,
  "business-outfit": `Same exact person as the reference, same face, hair, body, pose, and background. Only the clothing changed: a tailored charcoal suit, light blue dress shirt, no loud patterns. Photorealistic clothing swap, natural fabric, same lighting. Identity must match the reference. No text, no watermark.

${PROMPT_FOOTER}`,
  "background-replace": `Keep the subject from the attached photograph exactly: same identity, face, pose, clothes, proportions and crop. Replace only the background.

DEFAULT BACKGROUND (use this when USER ADDITIONS are empty or do not name a place, lighting or time of day): a bright modern interior with large windows to the left, soft daylight, pale grey walls, a light wooden floor and gentle depth-of-field blur, photorealistic, no extra people, no text.

If USER ADDITIONS describe a new scene, lighting or time of day, that description is the background and the DEFAULT BACKGROUND is ignored.

Match perspective, horizon, depth of field, light direction, contact shadows, reflections and color temperature so the composite looks photographed in one scene. Do not alter the subject unless explicitly requested. No text, no watermark.

${PROMPT_FOOTER}`,
  "gta-filter": `Use the attached photo as the exact identity and composition reference. Preserve the same person, face, expression, hairstyle, pose, body proportions, clothing, camera angle and framing. Transform the entire scene into a polished Grand Theft Auto V promotional loading-screen illustration: crisp dark contour lines, bold hand-painted digital rendering, graphic cel-shaded planes, dramatic poster contrast and a saturated warm coastal-city palette. Keep realistic anatomy and a clearly recognizable identity. Do not zoom in or enlarge the face; the face must remain below two thirds of the frame. Add one small, clean, recognizable "grand theft auto V" logo badge in the bottom-right corner with comfortable margins, approximately 18–22% of the image width. The badge must not cover the face or body. Do not duplicate the badge and do not add any other text or watermark.

${PROMPT_FOOTER}`,
  "restore-old-photo": `Restore the attached old photograph. Remove scratches, stains, dust, tears and worn patches. Recover lost detail and tonal balance. Then colorize with natural realistic colors for skin, hair, clothes and background so the result looks like a real color photograph of the same people and scene. Keep identity, pose and composition. Photorealistic, no text, no watermark.

${PROMPT_FOOTER}`,
  "remove-objects": `Remove only the unwanted objects named in USER ADDITIONS from the attached photo. If USER ADDITIONS are empty, remove obvious clutter in the foreground that is not the main person. Reconstruct hidden areas so the result looks photographed that way. Keep the main subject, pose, lighting and the rest of the scene. Photorealistic, no text, no watermark.

${PROMPT_FOOTER}`,
  "apply-tan": `Same exact person as the attached photo, same pose, clothes and background. Add a healthy natural sun tan on visible skin: even golden-bronze, no burns, no orange fake tan. Keep identity. Photorealistic, no text, no watermark.

${PROMPT_FOOTER}`,
  "remove-tattoo": `Same exact person as the attached photo, same pose, clothes and lighting. Completely remove visible tattoos and restore natural skin that matches the surrounding tone. No blur, no scar, no leftover ink. Photorealistic, no text, no watermark.

${PROMPT_FOOTER}`,
  "character-card": `The three attached photos show the SAME adult person and have fixed roles: Photo 1 is a close-up frontal face, Photo 2 is a side profile, and Photo 3 is a full-body view. Use all three as identity evidence. Preserve the exact face, age, skin tone, hair, body proportions and distinguishing features.

Work in two mandatory stages.
STAGE 1 — NORMALIZE THE CHARACTER INTERNALLY. Reconcile the identity across all three photos into one canonical person under even neutral studio light and against a clean neutral background. Ignore the original backgrounds, color casts, filters and lighting differences. Do not beautify, reshape, rejuvenate or otherwise change the person's appearance. Use Photo 1 and Photo 2 primarily for facial identity and head geometry. Use Photo 3 as the authority for body proportions AND the complete outfit; transfer that exact outfit consistently to every view. Do not output this intermediate reference separately.

STAGE 2 — BUILD THE CARD. Create ONE strict 3-by-3 contact sheet with nine equal, clearly separated tiles from the normalized character: frontal close-up, left profile, right profile, three-quarter left, three-quarter right, waist-up front, full-body front, full-body side, and full-body three-quarter back. Keep the same outfit from Photo 3, exact identity, clean neutral background, even light, lens character and body proportions in every tile.

HARD FRAMING RULES. The complete head, including the top of the hair, must remain visible in every tile. The first row contains head-and-shoulders portraits with a small margin above the hair. The second row contains waist-up views and must never crop the head. ALL THREE tiles in the bottom row are true head-to-toe full-body views: show the person from the top of the hair through both knees to the complete shoes and soles, with visible neutral floor and 8–12% empty margin above the head and below the feet. Scale the person down inside each bottom tile as much as needed. Never crop the head, hands, knees, legs, ankles, feet or shoes; never substitute a thigh-up, knee-up or torso crop for a full-body tile.

This sheet is a visual verification card, not nine unrelated people. Photorealistic, no text, no labels, no watermark, no overlapping tiles.

${PROMPT_FOOTER}`,
  "remove-makeup": `Same exact woman as the attached close-up, same pose and lighting. Remove all makeup and leave natural skin texture. Keep identity. Photorealistic, no text, no watermark.

${PROMPT_FOOTER}`,
  "add-makeup": `Same exact woman as the attached close-up, same pose, lighting and identity. Apply the makeup described in USER ADDITIONS. If USER ADDITIONS are empty, use polished evening makeup: defined eyes, soft contour, berry lips. Keep freckles and identity. Photorealistic, no text, no watermark.

${PROMPT_FOOTER}`,
  "change-eye-color": `Same exact person as the attached close-up, same pose and lighting. Change ONLY the iris color to the color named in USER ADDITIONS. If USER ADDITIONS are empty, use vivid emerald green. Keep identity. Photorealistic, no text, no watermark.

${PROMPT_FOOTER}`,
  "plump-lips": `Same exact person as the attached close-up, same pose and lighting. Plump the lips using the degree in USER ADDITIONS. If USER ADDITIONS are empty, use a medium realistic plump. Keep identity and a natural look. Photorealistic, no text, no watermark.

${PROMPT_FOOTER}`,
  "whiten-teeth": `Same exact person as the attached close-up, same smile, pose and lighting. Whiten the teeth to a clean Hollywood smile: bright even white, still realistic enamel, not neon. Keep identity. Photorealistic, no text, no watermark.

${PROMPT_FOOTER}`,
  "remove-wrinkles": `Same exact person as the attached close-up, same pose and lighting. Softly reduce wrinkles: smoother forehead, softer crow's feet and smile lines, still a real person of the same age, no plastic skin. Keep identity. Photorealistic, no text, no watermark.

${PROMPT_FOOTER}`,
  "add-cheekbones": `Same exact person as the attached close-up, same pose and lighting. Add naturally defined cheekbones with subtle sculpted shadows, still the same person, no extreme contour. Photorealistic, no text, no watermark.

${PROMPT_FOOTER}`,
  "family-photo": `Combine {{PHOTO_LIST}} into ONE photorealistic family photograph. Each numbered photo is a different person: keep that identity, age, face, hair and clothes. Place everyone together in the same frame standing next to each other, same lighting, natural contact, no collage borders, no split screen.

DEFAULT PLACEMENT: one row, side by side, looking at the camera, casual outdoor or living-room light.

If USER ADDITIONS describe placement, who stands where, or how many people to include, follow that and ignore DEFAULT PLACEMENT. The user may combine 2, 3 or 4 portraits.

Photorealistic, no text, no watermark.

${PROMPT_FOOTER}`,
  "combine-photos": `Photo 1 is the scene. Photo 2 is the person. Place the person from Photo 2 into the scene from Photo 1 so she is enjoying that trip, same identity, same clothes from Photo 2, same environment from Photo 1.

DEFAULT POSE: standing at the yacht rail, looking at the sunset, relaxed, wind in her hair, photorealistic match of light and contact shadows.

If USER ADDITIONS describe pose or place on the yacht, that is the pose and DEFAULT POSE is ignored.

Photorealistic, no text, no watermark.

${PROMPT_FOOTER}`,
  "sunflowers": `Photo 1 is the person. Photo 2 is the sunflower field. Place the same person from Photo 1 into the sunflower field from Photo 2. Keep identity, hair, cowboy hat and clothes from Photo 1.

DEFAULT POSE: arms open wide as if hugging the world, joyful, among tall sunflowers.

If USER ADDITIONS describe a different pose, use that pose and ignore DEFAULT POSE.

Photorealistic, no text, no watermark.

${PROMPT_FOOTER}`,
  kare: `Same exact person as the attached photo. Keep identity, pose, clothes, lighting and background. Change only the haircut to a kare: an even cut roughly to the chin or shoulders, with or without bangs.
${HAIR_COLOR_RULE}
Photorealistic, no text, no watermark.

${PROMPT_FOOTER}`,
  bob: `Same exact person as the attached photo. Keep identity, pose, clothes, lighting and background. Change only the haircut to a bob: short or medium length, volume at the nape, longer in front.
${HAIR_COLOR_RULE}
Photorealistic, no text, no watermark.

${PROMPT_FOOTER}`,
  cascade: `Same exact person as the attached photo. Keep identity, pose, clothes, lighting and background. Change only the haircut to a cascade: layers of different lengths that add volume and movement.
${HAIR_COLOR_RULE}
Photorealistic, no text, no watermark.

${PROMPT_FOOTER}`,
  "long-bob": `Same exact person as the attached photo. Keep identity, pose, clothes, lighting and background. Change only the haircut to a long bob (lob) to the shoulders or just below, suitable for straight or wavy hair.
${HAIR_COLOR_RULE}
Photorealistic, no text, no watermark.

${PROMPT_FOOTER}`,
  pixie: `Same exact person as the attached photo. Keep identity, pose, clothes, lighting and background. Change only the haircut to a pixie: short temples and nape, usually longer on top.
${HAIR_COLOR_RULE}
Photorealistic, no text, no watermark.

${PROMPT_FOOTER}`,
  shag: `Same exact person as the attached photo. Keep identity, pose, clothes, lighting and background. Change only the haircut to a shag: layered textured cut with deliberately messy volume.
${HAIR_COLOR_RULE}
Photorealistic, no text, no watermark.

${PROMPT_FOOTER}`,
  undercut: `Same exact person as the attached photo. Keep identity, pose, clothes, lighting and background. Change only the haircut to an undercut: short or shaved sides and nape, hair on top noticeably longer.
${HAIR_COLOR_RULE}
Photorealistic, no text, no watermark.

${PROMPT_FOOTER}`,
  fade: `Same exact person as the attached photo. Keep identity, pose, clothes, lighting and background. Change only the haircut to a fade: a smooth transition from very short hair at the bottom to longer hair on top.
${HAIR_COLOR_RULE}
Photorealistic, no text, no watermark.

${PROMPT_FOOTER}`,
  crop: `Same exact person as the attached photo. Keep identity, pose, clothes, lighting and background. Change only the haircut to a crop: a short textured cut with a small fringe forward.
${HAIR_COLOR_RULE}
Photorealistic, no text, no watermark.

${PROMPT_FOOTER}`,
  quiff: `Same exact person as the attached photo. Keep identity, pose, clothes, lighting and background. Change only the haircut to a quiff: voluminous hair in front, styled up and back.
${HAIR_COLOR_RULE}
Photorealistic, no text, no watermark.

${PROMPT_FOOTER}`,
  pompadour: `Same exact person as the attached photo. Keep identity, pose, clothes, lighting and background. Change only the haircut to a pompadour: strong volume in front and on top, hair combed back.
${HAIR_COLOR_RULE}
Photorealistic, no text, no watermark.

${PROMPT_FOOTER}`,
  caesar: `Same exact person as the attached photo. Keep identity, pose, clothes, lighting and background. Change only the haircut to a Caesar cut: short hair with an even short fringe forward.
${HAIR_COLOR_RULE}
Photorealistic, no text, no watermark.

${PROMPT_FOOTER}`,
  stubble: `Same exact person as the attached photo. Keep identity, pose, clothes, lighting, head hair and background. Change only the facial hair to stubble: a short beard 1-5 mm, a light unshaven look.
${BEARD_COLOR_RULE}
Photorealistic, no text, no watermark.

${PROMPT_FOOTER}`,
  "short-boxed-beard": `Same exact person as the attached photo. Keep identity, pose, clothes, lighting, head hair and background. Change only the facial hair to a short boxed beard: a neat beard along the jawline with trimmed cheeks and mustache.
${BEARD_COLOR_RULE}
Photorealistic, no text, no watermark.

${PROMPT_FOOTER}`,
  "full-beard": `Same exact person as the attached photo. Keep identity, pose, clothes, lighting, head hair and background. Change only the facial hair to a full beard: a thick beard covering the chin and cheeks and connected to the mustache.
${BEARD_COLOR_RULE}
Photorealistic, no text, no watermark.

${PROMPT_FOOTER}`,
  goatee: `Same exact person as the attached photo. Keep identity, pose, clothes, lighting, head hair and background. Change only the facial hair to a goatee: beard mainly on the chin, often with a mustache, cheeks shaved.
${BEARD_COLOR_RULE}
Photorealistic, no text, no watermark.

${PROMPT_FOOTER}`,
  "van-dyke": `Same exact person as the attached photo. Keep identity, pose, clothes, lighting, head hair and background. Change only the facial hair to a Van Dyke: a disconnected mustache plus a pointed chin beard, cheeks shaved.
${BEARD_COLOR_RULE}
Photorealistic, no text, no watermark.

${PROMPT_FOOTER}`,
  ducktail: `Same exact person as the attached photo. Keep identity, pose, clothes, lighting, head hair and background. Change only the facial hair to a ducktail: a full beard with an elongated pointed bottom.
${BEARD_COLOR_RULE}
Photorealistic, no text, no watermark.

${PROMPT_FOOTER}`,
  bald: `Same exact person as the attached photo. Keep identity, pose, clothes, lighting and background. Remove all hair from the head so the person is bald. Keep eyebrows and facial hair unless USER ADDITIONS ask otherwise.
${HAIR_COLOR_RULE}
Photorealistic, no text, no watermark.

${PROMPT_FOOTER}`,
  "remove-beard": `Same exact person as the attached photo. Keep identity, pose, clothes, lighting, head hair and background. Completely remove the beard and mustache so the face is clean-shaven. Restore natural skin.
${BEARD_COLOR_RULE}
Photorealistic, no text, no watermark.

${PROMPT_FOOTER}`,
  rain: `Same exact person as the attached photo. Keep identity, face, hair, clothes, pose and framing. Change only the weather to heavy rain: wet streets, falling raindrops, dark wet reflections, overcast storm light.
Photorealistic, no text, no watermark.

${PROMPT_FOOTER}`,
  snow: `Same exact person as the attached photo. Keep identity, face, hair, clothes, pose and framing. Change only the weather to snow: snow cover on the ground, falling flakes, cold winter light.
Photorealistic, no text, no watermark.

${PROMPT_FOOTER}`,
  fog: `Same exact person as the attached photo. Keep identity, face, hair, clothes, pose and framing. Change only the weather to thick fog: dense haze, soft muted light, low visibility.
Photorealistic, no text, no watermark.

${PROMPT_FOOTER}`,
  thunderstorm: `Same exact person as the attached photo. Keep identity, face, hair, clothes, pose and framing. Change only the weather to a thunderstorm: dark sky, lightning, heavy downpour, dramatic storm light.
Photorealistic, no text, no watermark.

${PROMPT_FOOTER}`,
  "sun-rays": `Same exact person as the attached photo. Keep identity, face, hair, clothes, pose and framing. Change only the weather to sun rays: bright beams of light through clouds, warm highlights, clear photorealistic daylight.
Photorealistic, no text, no watermark.

${PROMPT_FOOTER}`,
  overcast: `Same exact person as the attached photo. Keep identity, face, hair, clothes, pose and framing. Change only the weather to overcast: grey sky with no sun, flat soft light, no harsh shadows.
Photorealistic, no text, no watermark.

${PROMPT_FOOTER}`,
  sunset: `Same exact person as the attached photo. Keep identity, face, hair, clothes, pose and framing. Change only the weather and light to sunset: warm golden and amber light, long shadows, glowing sky.
Photorealistic, no text, no watermark.

${PROMPT_FOOTER}`,
  "business-suit-man": `Same exact person as the attached photo. Keep identity, face, hair, body, pose and background. Face fully visible. Change only the clothing to a classic men's business suit: tailored jacket, dress shirt, neat official look.
${SUIT_COLOR_RULE}
Photorealistic clothing swap, natural fabric, same lighting. No text, no watermark.

${PROMPT_FOOTER}`,
  "business-suit-woman": `Same exact person as the attached photo. Keep identity, face, hair, body, pose and background. Face fully visible. Change only the clothing to a women's business suit: blazer, blouse and skirt, neat official look.
${SUIT_COLOR_RULE}
Photorealistic clothing swap, natural fabric, same lighting. No text, no watermark.

${PROMPT_FOOTER}`,
  "military-uniform": `Same exact person as the attached photo. Keep identity, face, hair, body, pose and background. Face fully visible. Change only the clothing to a military uniform: camouflage, tactical vest, combat boots, optional headwear.
Photorealistic clothing swap, same lighting. No text, no watermark.

${PROMPT_FOOTER}`,
  "police-uniform": `Same exact person as the attached photo. Keep identity, face, hair, body, pose and background. Face fully visible. Change only the clothing to a police uniform: uniform shirt or jacket, trousers, belt, service details.
Photorealistic clothing swap, same lighting. No text, no watermark.

${PROMPT_FOOTER}`,
  "medical-uniform": `Same exact person as the attached photo. Keep identity, face, hair, body, pose and background. Face fully visible. Change only the clothing to a medical uniform: lab coat or scrubs, stethoscope, neat professional look.
Photorealistic clothing swap, same lighting. No text, no watermark.

${PROMPT_FOOTER}`,
  "firefighter-uniform": `Same exact person as the attached photo. Keep identity, face, hair, body, pose and background. Face fully visible. Change only the clothing to firefighter turnout gear: protective jacket and pants with reflective stripes, gloves; helmet may be held in the hand.
Photorealistic clothing swap, same lighting. No text, no watermark.

${PROMPT_FOOTER}`,
  "school-uniform": `Same exact person as the attached photo. Keep identity, face, hair, body, pose and background. Adult identity must stay adult. Face fully visible. Change only the clothing to a school-style uniform: jacket, shirt, trousers or skirt, tie or bow.
Photorealistic clothing swap, same lighting. No text, no watermark.

${PROMPT_FOOTER}`,
  "pilot-uniform": `Same exact person as the attached photo. Keep identity, face, hair, body, pose and background. Face fully visible. Change only the clothing to a pilot uniform: dark suit, white shirt, tie, epaulettes, optional peaked cap.
Photorealistic clothing swap, same lighting. No text, no watermark.

${PROMPT_FOOTER}`,
  "flight-attendant": `Same exact person as the attached photo. Keep identity, face, hair, body, pose and background. Face fully visible. Change only the clothing to a flight-attendant uniform: neat suit, scarf, skirt or trousers, airline-style styling.
Photorealistic clothing swap, same lighting. No text, no watermark.

${PROMPT_FOOTER}`,
  cowboy: `Same exact person as the attached photo. Keep identity, face, hair, body, pose and background. Face fully visible. Change only the clothing to a cowboy look: cowboy hat, shirt, vest, jeans, belt with a large buckle, boots.
Photorealistic clothing swap, same lighting. No text, no watermark.

${PROMPT_FOOTER}`,
  "spider-man": `Same exact person as the attached photo. Keep identity, face, hair, body, pose and background. Face fully visible, no mask. Change only the clothing to a crimson and navy bodysuit with a geometric web-like pattern.
Photorealistic clothing swap, same lighting. No text, no watermark.

${PROMPT_FOOTER}`,
  "iron-man": `Same exact person as the attached photo. Keep identity, face, hair, body, pose and background. Face fully visible, helmet off or held aside. Change only the clothing to a red-and-gold high-tech armored suit with glowing lights.
Photorealistic clothing swap, same lighting. No text, no watermark.

${PROMPT_FOOTER}`,
  "captain-america": `Same exact person as the attached photo. Keep identity, face, hair, body, pose and background. Face fully visible. Change only the clothing to a navy-and-red heroic costume with a star on the chest, plus a round shield.
Photorealistic clothing swap, same lighting. No text, no watermark.

${PROMPT_FOOTER}`,
  thor: `Same exact person as the attached photo. Keep identity, face, hair, body, pose and background. Face fully visible. Change only the clothing to warrior armor, a red cape and a hammer.
Photorealistic clothing swap, same lighting. No text, no watermark.

${PROMPT_FOOTER}`,
  "black-widow": `Same exact person as the attached photo. Keep identity, face, hair, body, pose and background. Face fully visible. Change only the clothing to a black tactical suit with belts and holsters.
Photorealistic clothing swap, same lighting. No text, no watermark.

${PROMPT_FOOTER}`,
  pirate: `Same exact person as the attached photo. Keep identity, face, hair, body, pose and background. Face fully visible. Change only the clothing to a pirate look: coat, shirt, wide belt, boots, tricorn or bandana.
Photorealistic clothing swap, same lighting. No text, no watermark.

${PROMPT_FOOTER}`,
  "medieval-knight": `Same exact person as the attached photo. Keep identity, face, hair, body, pose and background. Face fully visible. Change only the clothing to medieval knight armor: metal plate, cloak, sword or shield.
Photorealistic clothing swap, same lighting. No text, no watermark.

${PROMPT_FOOTER}`,
  samurai: `Same exact person as the attached photo. Keep identity, face, hair, body, pose and background. Face fully visible. Change only the clothing to traditional samurai armor, katana and sash.
Photorealistic clothing swap, same lighting. No text, no watermark.

${PROMPT_FOOTER}`,
  pharaoh: `Same exact person as the attached photo. Keep identity, face, hair, body, pose and background. Face fully visible. Change only the clothing to white-and-gold pharaoh robes, a wide gold collar and a decorative headdress.
Photorealistic clothing swap, same lighting. No text, no watermark.

${PROMPT_FOOTER}`,
  "venetian-carnival": `Same exact person as the attached photo. Keep identity, face, hair, body, pose and background. Face fully visible, no mask covering the face. Change only the clothing to a richly decorated Venetian carnival coat or gown with feathers and gold trim.
Photorealistic clothing swap, same lighting. No text, no watermark.

${PROMPT_FOOTER}`,
  "fantasy-mage": `Same exact person as the attached photo. Keep identity, face, hair, body, pose and background. Face fully visible. Change only the clothing to a fantasy mage look: long robe, amulets, staff, decorative patterns.
Photorealistic clothing swap, same lighting. No text, no watermark.

${PROMPT_FOOTER}`,
  vampire: `Same exact person as the attached photo. Keep identity, face, hair, body, pose and background. Face fully visible. Change only the clothing to a vampire look: long dark cloak, vest, high-collar shirt.
Photorealistic clothing swap, same lighting. No text, no watermark.

${PROMPT_FOOTER}`,
  steampunk: `Same exact person as the attached photo. Keep identity, face, hair, body, pose and background. Face fully visible. Change only the clothing to a steampunk look: leather vest or corset, belts, metal details, goggles on the head.
Photorealistic clothing swap, same lighting. No text, no watermark.

${PROMPT_FOOTER}`,
  astronaut: `Same exact person as the attached photo. Keep identity, face, hair, body, pose and background. Face fully visible. Change only the clothing to a space suit, light or dark; helmet removed or held nearby.
Photorealistic clothing swap, same lighting. No text, no watermark.

${PROMPT_FOOTER}`,
  gladiator: `Same exact person as the attached photo. Keep identity, face, hair, body, pose and background. Face fully visible. Change only the clothing to gladiator armor: leather and metal, bracers, cloak, sword.
Photorealistic clothing swap, same lighting. No text, no watermark.

${PROMPT_FOOTER}`,
  "roman-legionary": `Same exact person as the attached photo. Keep identity, face, hair, body, pose and background. Face fully visible. Change only the clothing to a Roman legionary look: red cloak, metal breastplate, belt, sword.
Photorealistic clothing swap, same lighting. No text, no watermark.

${PROMPT_FOOTER}`,
  elf: `Same exact person as the attached photo. Keep identity, face, hair, body, pose and background. Face fully visible. Change only the clothing to fantasy elf attire: cloak, light armor, decorative details.
Photorealistic clothing swap, same lighting. No text, no watermark.

${PROMPT_FOOTER}`,
  king: `Same exact person as the attached photo. Keep identity, face, hair, body, pose and background. Face fully visible. Change only the clothing to a king: crown, velvet mantle with fur trim, gold chain, formal royal attire.
Photorealistic clothing swap, same lighting. No text, no watermark.

${PROMPT_FOOTER}`,
  queen: `Same exact person as the attached photo. Keep identity, face, hair, body, pose and background. Face fully visible. Change only the clothing to a queen: crown, formal ball gown, jewelry, royal styling.
Photorealistic clothing swap, same lighting. No text, no watermark.

${PROMPT_FOOTER}`,
  "rock-star": `Same exact person as the attached photo. Keep identity, face, hair, body, pose and background. Face fully visible. Change only the clothing to a rock-star stage look: leather jacket, stage clothes, accessories.
Photorealistic clothing swap, same lighting. No text, no watermark.

${PROMPT_FOOTER}`,
  santorini: `${LOCATION_IDENTITY} Place the person on a white Santorini terrace in three-quarter view, body slightly turned toward the sea; blue domes, cascading white houses and sunset over the water. Camera slightly below eye level, medium shot.
Photorealistic, no text, no watermark.

${PROMPT_FOOTER}`,
  cappadocia: `${LOCATION_IDENTITY} Place the person on the edge of a Cappadocia viewpoint, back or three-quarter to camera, looking into the valley; hot-air balloons fill the dawn sky. Full body, wide frame, the person occupies about one third of the composition.
Photorealistic, no text, no watermark.

${PROMPT_FOOTER}`,
  dubai: `${LOCATION_IDENTITY} Place the person at a panoramic window or terrace, lightly leaning on the railing; skyscrapers and the city from above behind them. Full-body vertical composition, city lines leading the eye to the person.
Photorealistic, no text, no watermark.

${PROMPT_FOOTER}`,
  paris: `${LOCATION_IDENTITY} Place the person walking a Paris street or standing in three-quarter view, not looking straight at the camera; the Eiffel Tower visible between buildings. Medium or full body, candid caught-moment feel.
Photorealistic, no text, no watermark.

${PROMPT_FOOTER}`,
  maldives: `${LOCATION_IDENTITY} Place the person barefoot at the waterline or standing sideways to camera, looking at the ocean; white sand, clear water and horizon. Wide frame at waist level or slightly below.
Photorealistic, no text, no watermark.

${PROMPT_FOOTER}`,
  iceland: `${LOCATION_IDENTITY} Place the person in front of a huge Iceland waterfall or black sand beach, face in three-quarter view; clothes and hair slightly moving in the wind. The person is small relative to the landscape to show the scale of nature.
Photorealistic, no text, no watermark.

${PROMPT_FOOTER}`,
  dolomites: `${LOCATION_IDENTITY} Place the person on a rock or mountain trail in the Dolomites, one foot slightly forward, body turned toward the mountains; peaks, a lake and a valley behind. Full body, wide horizontal frame.
Photorealistic, no text, no watermark.

${PROMPT_FOOTER}`,
  kyoto: `${LOCATION_IDENTITY} Place the person between red torii gates or on a path in a Kyoto bamboo forest, slightly turning over the shoulder toward the camera. Centered symmetrical composition, path lines receding into depth.
Photorealistic, no text, no watermark.

${PROMPT_FOOTER}`,
  petra: `${LOCATION_IDENTITY} Place the person in the center of a narrow Petra canyon or in front of a monumental facade, slightly off-center; looking up or toward the architecture. Full body, low camera for a sense of scale.
Photorealistic, no text, no watermark.

${PROMPT_FOOTER}`,
  "new-york": `${LOCATION_IDENTITY} Place the person crossing a New York street or standing on a rooftop, slightly turned toward the camera; skyscrapers, lights and city motion behind. Dynamic urban frame, medium or full body.
Photorealistic, no text, no watermark.

${PROMPT_FOOTER}`,
  "bora-bora": `${LOCATION_IDENTITY} Place the person at the edge of a wooden pier in Bora Bora, body turned to the lagoon, head slightly toward the camera; turquoise water, a mountain and villas. Full body, plenty of space around.
Photorealistic, no text, no watermark.

${PROMPT_FOOTER}`,
  uyuni: `${LOCATION_IDENTITY} Place the person in the center of the Uyuni salt-flat mirror, facing or slightly sideways; the full reflection visible under the feet, horizon almost merging with the sky. Symmetric wide frame with lots of empty space.
Photorealistic, no text, no watermark.

${PROMPT_FOOTER}`,
  "cartoon-hero": `Same exact person as the attached photo. Keep identity, face, hair, body, pose, clothes, camera crop and the entire background and surroundings. Do not change the place. Only restyle the photograph into a bright 2D cartoon character: simplified features, expressive cartoon face, clean cel-shaded colors.
No text, no watermark.

${PROMPT_FOOTER}`,
  caricature: `Same exact person as the attached photo. Keep identity, pose, clothes, glasses if present, camera crop and the entire background and surroundings. Do not change the place. Only restyle the photograph as a mild caricature illustration: slightly exaggerate facial features while the person stays clearly recognizable.
No text, no watermark.

${PROMPT_FOOTER}`,
  "hero-3d": `Same exact person as the attached photo. Keep identity, face, hair, body, pose, clothes, camera crop and the entire background and surroundings. Do not change the place. Only restyle the photograph as a modern 3D-animation character: volumetric face, soft materials, studio-quality 3D lighting on the same scene.
No text, no watermark.

${PROMPT_FOOTER}`,
  drawn: `Same exact person as the attached photo. Keep identity, face, hair, body, pose, clothes, camera crop and the entire background and surroundings. Do not change the place. Only restyle the photograph as a neat digital drawing: clean linework, careful shading, artistic illustration treatment.
No text, no watermark.

${PROMPT_FOOTER}`,
  comic: `Same exact person as the attached photo. Keep identity, face, hair, body, pose, clothes, camera crop and the entire background and surroundings. Do not change the place. Only restyle the photograph as a graphic-novel comic illustration: clear ink contours, expressive comic shadows, dynamic inking. No speech bubbles.
No text, no watermark.

${PROMPT_FOOTER}`,
  clay: `Same exact person as the attached photo. Keep identity, face, hair, body, pose, clothes, camera crop and the entire background and surroundings. Do not change the place. Only restyle the photograph as a claymation plasticine character: soft clay texture, slightly exaggerated clay features, volumetric stop-motion look.
No text, no watermark.

${PROMPT_FOOTER}`,
  "anime-hero": `Same exact person as the attached photo. Keep identity, face, hair, body, pose, clothes, camera crop and the entire background and surroundings. Adult identity stays adult. Do not change the place. Only restyle the photograph as a modern anime character: face and hair stay recognizable.
No text, no watermark.

${PROMPT_FOOTER}`,
  fantasy: `Same exact person as the attached photo. Keep identity, face, hair, body, pose, clothes, camera crop and the entire background and surroundings. Do not change the place. Only restyle the photograph as a fairy-tale fantasy illustration: artistic treatment of clothes, light and the existing surroundings, same identity and scene.
No text, no watermark.

${PROMPT_FOOTER}`,
  "pixel-illustration": `Same exact person as the attached photo. Keep identity, face, hair, body, pose, clothes, camera crop and the entire background and surroundings. Do not change the place. Only restyle the photograph as a refined high-detail pixel illustration: warm sun-drenched palette, slightly granular digital-pixel texture, stylized painterly features. Face stays dominant in the frame. Not chunky 8-bit pixel art.
No text, no watermark.

${PROMPT_FOOTER}`,
  watercolor: `Same exact person as the attached photo. Keep identity, face, hair, body, pose, clothes, camera crop and the entire background and surroundings. Do not change the place. Only restyle the photograph as a delicate watercolor portrait: visible paper grain, soft wet-on-wet washes, loose pigment edges, face still filling most of the frame.
No text, no watermark.

${PROMPT_FOOTER}`,
  "x-ray": `Same exact person as the attached photo. Keep identity, pose, camera crop and the entire background placement. Do not change the place. Only restyle the photograph as a detailed medical X-ray of the skull: translucent blue-cyan bone, clearly detailed empty eye sockets (orbits) with sharp orbital rims, visible nasal cavity, teeth, jaw and cranial sutures. Soft teal silhouette around the skull. The eye sockets must be anatomically detailed, not flat ovals. Not gory.
No text, no watermark.

${PROMPT_FOOTER}`,
  "comic-2": `Same exact person as the attached photo. Keep identity, pose, clothes, camera crop from the knees up and the entire countryside surroundings. Do not change the place. Only restyle the photograph as a bright cartoon comic: more cartoony than a graphic novel, rounded simplified features, thick clean outlines, flat cel colors. Rural background stays the same village or field. No speech bubbles.
No text, no watermark.

${PROMPT_FOOTER}`,
  "fashion-caricature": `Same exact person as the attached photo. Keep identity so the face stays recognizable. Restyle as a fashion caricature illustration: ink and wash sketch, elongated neck, satirical high-fashion proportions, muted earth tones. Plain empty neutral background — light grey or beige, no paper texture, no parchment page. No handwritten notes, no arrows, no labels, no sidebar, no charts, no caption, no watermark. Illustration style, not photorealistic.

${PROMPT_FOOTER}`,
  "old-age": `Same exact person as the attached photo. Keep identity, pose, clothes, camera crop and the entire background. Age only the face, skin and hair to the target age.
If USER ADDITIONS contain a number, that number is the target age in years. If no age is given, age the person to 65.
Photorealistic natural aging: wrinkles, softer skin, age-appropriate hair color, same identity and bone structure. No text, no watermark.

${PROMPT_FOOTER}`,
};
