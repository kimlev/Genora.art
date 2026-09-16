import type { Locale } from "@/lib/i18n/types";
import { BEARD_COLOR_AGENT_IDS, HAIR_COLOR_AGENT_IDS, SUIT_COLOR_AGENT_IDS } from "@/lib/image-agent-gallery";

export type ImageAgentComposerCopy = {
  placeholder: Record<string, string>;
};

const faceSwap: Record<Locale, string> = {
  ru: "Фото 1 — кого поставить. Фото 2 — чьё лицо меняем.",
  en: "Photo 1 is who to put in. Photo 2 is whose face we change.",
  es: "Foto 1: a quién poner. Foto 2: cara que cambiamos.",
  fr: "Photo 1 : qui placer. Photo 2 : visage à remplacer.",
  de: "Foto 1: wen einsetzen. Foto 2: wessen Gesicht.",
  it: "Foto 1: chi inserire. Foto 2: che volto cambiare.",
  pt: "Foto 1: quem colocar. Foto 2: rosto a trocar.",
  pl: "Zdjęcie 1 — kogo wstawić. Zdjęcie 2 — czyją twarz zmieniamy.",
  tr: "Fotoğraf 1: kimi koyacağız. Fotoğraf 2: kimin yüzünü değiştiriyoruz.",
  sv: "Foto 1: vem ska in. Foto 2: vems ansikte byts.",
  cs: "Foto 1 — koho vložit. Foto 2 — čí obličej měníme.",
  hi: "फ़ोटो 1 — किसे लगाना है। फ़ोटो 2 — किसका चेहरा बदलना है।",
  ar: "الصورة 1: من نضع. الصورة 2: وجه من نغيّر.",
  zh: "照片 1：放谁的脸。照片 2：换谁的脸。",
  ja: "写真1は入れる顔。写真2は替える顔。",
  ko: "사진 1은 넣을 얼굴. 사진 2는 바꿀 얼굴.",
  nl: "Foto 1: wie erin. Foto 2: wiens gezicht.",
  el: "Φωτο 1: ποιον βάζουμε. Φωτο 2: ποιανού το πρόσωπο.",
  ro: "Foto 1: pe cine punem. Foto 2: ale cui față schimbăm.",
};

const pose: Record<Locale, string> = {
  ru: "Вы можете изменить позу на фото.",
  en: "You can change the pose in the photo.",
  es: "Puede cambiar la pose en la foto.",
  fr: "Vous pouvez changer la pose sur la photo.",
  de: "Sie können die Pose auf dem Foto ändern.",
  it: "Può cambiare la posa nella foto.",
  pt: "Pode mudar a pose na foto.",
  pl: "Możesz zmienić pozę na zdjęciu.",
  tr: "Fotoğraftaki pozu değiştirebilirsiniz.",
  sv: "Du kan ändra posen på fotot.",
  cs: "Můžete změnit pózu na fotce.",
  hi: "आप फ़ोटो में पोज़ बदल सकते हैं।",
  ar: "يمكنكم تغيير الوضعية في الصورة.",
  zh: "您可以更改照片中的姿势。",
  ja: "写真のポーズを変えられます。",
  ko: "사진 속 포즈를 바꿀 수 있습니다.",
  nl: "U kunt de pose op de foto wijzigen.",
  el: "Μπορείτε να αλλάξετε τη στάση στη φωτογραφία.",
  ro: "Puteți schimba poza din fotografie.",
};

const hairColor: Record<Locale, string> = {
  ru: "Укажите цвет волос. Если не указать — цвет останется как на исходном фото.",
  en: "Specify the hair color. If you leave it empty, the color stays as in the original photo.",
  es: "Indique el color del cabello. Si no lo indica, se mantendrá el color de la foto original.",
  fr: "Indiquez la couleur des cheveux. Si vous ne l'indiquez pas, la couleur de la photo d'origine sera conservée.",
  de: "Geben Sie die Haarfarbe an. Wenn Sie nichts angeben, bleibt die Farbe wie auf dem Originalfoto.",
  it: "Indichi il colore dei capelli. Se non lo indica, resta il colore della foto originale.",
  pt: "Indique a cor do cabelo. Se não indicar, a cor permanece como na foto original.",
  pl: "Podaj kolor włosów. Jeśli nie podasz, kolor zostanie jak na oryginalnym zdjęciu.",
  tr: "Saç rengini belirtin. Belirtmezseniz renk orijinal fotoğraftaki gibi kalır.",
  sv: "Ange hårfärgen. Om du inte anger den behålls färgen från originalfotot.",
  cs: "Uveďte barvu vlasů. Pokud neuvedete, barva zůstane jako na původní fotce.",
  hi: "बालों का रंग बताएं। यदि नहीं बताएंगे, तो रंग मूल फ़ोटो जैसा रहेगा।",
  ar: "حددوا لون الشعر. إن لم تحددوه، سيبقى اللون كما في الصورة الأصلية.",
  zh: "请指定发色。若不指定，将保持原照片中的颜色。",
  ja: "髪の色を指定してください。指定しない場合は元の写真の色のままです。",
  ko: "머리 색을 지정하세요. 지정하지 않으면 원본 사진의 색이 유지됩니다.",
  nl: "Geef de haarkleur op. Als u niets opgeeft, blijft de kleur zoals op de originele foto.",
  el: "Ορίστε το χρώμα των μαλλιών. Αν δεν το ορίσετε, θα μείνει όπως στην αρχική φωτογραφία.",
  ro: "Indicați culoarea părului. Dacă nu indicați, culoarea rămâne ca în fotografia originală.",
};

const beardColor: Record<Locale, string> = {
  ru: "Укажите цвет бороды. Если не указать — цвет останется как на исходном фото.",
  en: "Specify the beard color. If you leave it empty, the color stays as in the original photo.",
  es: "Indique el color de la barba. Si no lo indica, se mantendrá el color de la foto original.",
  fr: "Indiquez la couleur de la barbe. Si vous ne l'indiquez pas, la couleur de la photo d'origine sera conservée.",
  de: "Geben Sie die Bartfarbe an. Wenn Sie nichts angeben, bleibt die Farbe wie auf dem Originalfoto.",
  it: "Indichi il colore della barba. Se non lo indica, resta il colore della foto originale.",
  pt: "Indique a cor da barba. Se não indicar, a cor permanece como na foto original.",
  pl: "Podaj kolor brody. Jeśli nie podasz, kolor zostanie jak na oryginalnym zdjęciu.",
  tr: "Sakal rengini belirtin. Belirtmezseniz renk orijinal fotoğraftaki gibi kalır.",
  sv: "Ange skäggfärgen. Om du inte anger den behålls färgen från originalfotot.",
  cs: "Uveďte barvu vousů. Pokud neuvedete, barva zůstane jako na původní fotce.",
  hi: "दाढ़ी का रंग बताएं। यदि नहीं बताएंगे, तो रंग मूल फ़ोटो जैसा रहेगा।",
  ar: "حددوا لون اللحية. إن لم تحددوه، سيبقى اللون كما في الصورة الأصلية.",
  zh: "请指定胡须颜色。若不指定，将保持原照片中的颜色。",
  ja: "ひげの色を指定してください。指定しない場合は元の写真の色のままです。",
  ko: "수염 색을 지정하세요. 지정하지 않으면 원본 사진의 색이 유지됩니다.",
  nl: "Geef de baardkleur op. Als u niets opgeeft, blijft de kleur zoals op de originele foto.",
  el: "Ορίστε το χρώμα των γενιών. Αν δεν το ορίσετε, θα μείνει όπως στην αρχική φωτογραφία.",
  ro: "Indicați culoarea bărbii. Dacă nu indicați, culoarea rămâne ca în fotografia originală.",
};

const oldAge: Record<Locale, string> = {
  ru: "Укажите возраст, в котором хотите себя видеть, мы это значение подставим для генерации.",
  en: "Enter the age you want to see yourself at. We will use that number for generation.",
  es: "Indique la edad en la que quiere verse; usaremos ese valor para generar.",
  fr: "Indiquez l'âge auquel vous voulez vous voir, nous l'utiliserons pour la génération.",
  de: "Geben Sie das Alter an, in dem Sie sich sehen möchten. Wir setzen diesen Wert für die Generierung ein.",
  it: "Indichi l'età in cui vuole vedersi: useremo quel numero per la generazione.",
  pt: "Indique a idade em que quer ver-se; usaremos esse valor na geração.",
  pl: "Podaj wiek, w którym chcesz się zobaczyć — podstawimy tę wartość do generacji.",
  tr: "Kendinizi görmek istediğiniz yaşı yazın, üretiminde bu değeri kullanırız.",
  sv: "Ange åldern du vill se dig i; vi använder det värdet vid genereringen.",
  cs: "Uveďte věk, ve kterém se chcete vidět — toto číslo použijeme při generování.",
  hi: "वह उम्र लिखें जिसमें आप खुद को देखना चाहते हैं, हम उसे जनरेशन में लगा देंगे।",
  ar: "حددوا العمر الذي تريدون رؤية أنفسكم فيه، وسنستخدم هذا الرقم في التوليد.",
  zh: "请填写您希望看到自己的年龄，我们会把这个数字用于生成。",
  ja: "自分を見たい年齢を入力してください。その数値を生成に使います。",
  ko: "자신을 보고 싶은 나이를 입력하세요. 그 값을 생성에 넣습니다.",
  nl: "Geef de leeftijd op waarop u zichzelf wilt zien; die waarde gebruiken we bij het genereren.",
  el: "Γράψτε την ηλικία στην οποία θέλετε να δείτε τον εαυτό σας· θα τη χρησιμοποιήσουμε στη δημιουργία.",
  ro: "Indicați vârsta la care vreți să vă vedeți; vom folosi această valoare la generare.",
};

const suitColor: Record<Locale, string> = {
  ru: "Можно указать цвет костюма.",
  en: "You can specify the suit color.",
  es: "Puede indicar el color del traje.",
  fr: "Vous pouvez indiquer la couleur du costume.",
  de: "Sie können die Anzugsfarbe angeben.",
  it: "Può indicare il colore del completo.",
  pt: "Pode indicar a cor do fato.",
  pl: "Możesz podać kolor garnituru.",
  tr: "Takım rengini belirtebilirsiniz.",
  sv: "Du kan ange kostymens färg.",
  cs: "Můžete uvést barvu obleku.",
  hi: "आप सूट का रंग बता सकते हैं।",
  ar: "يمكنكم تحديد لون البدلة.",
  zh: "可以指定西装颜色。",
  ja: "スーツの色を指定できます。",
  ko: "수트 색을 지정할 수 있습니다.",
  nl: "U kunt de kleur van het pak opgeven.",
  el: "Μπορείτε να ορίσετε το χρώμα του κοστουμιού.",
  ro: "Puteți indica culoarea costumului.",
};

function placeholders(locale: Locale): Record<string, string> {
  const poseText = pose[locale] ?? pose.en;
  const hairText = hairColor[locale] ?? hairColor.en;
  const beardText = beardColor[locale] ?? beardColor.en;
  const suitText = suitColor[locale] ?? suitColor.en;
  const result: Record<string, string> = {
    "face-swap": faceSwap[locale] ?? faceSwap.en,
    "family-photo": poseText,
    "combine-photos": poseText,
    sunflowers: poseText,
    "old-age": oldAge[locale] ?? oldAge.en,
  };
  for (const id of HAIR_COLOR_AGENT_IDS) result[id] = hairText;
  for (const id of BEARD_COLOR_AGENT_IDS) result[id] = beardText;
  for (const id of SUIT_COLOR_AGENT_IDS) result[id] = suitText;
  return result;
}

const copies: Partial<Record<Locale, ImageAgentComposerCopy>> = Object.fromEntries(
  (Object.keys(pose) as Locale[]).map((locale) => [locale, { placeholder: placeholders(locale) }]),
);

export function imageAgentComposerCopy(locale: string): ImageAgentComposerCopy {
  return copies[locale as Locale] ?? copies.en!;
}
