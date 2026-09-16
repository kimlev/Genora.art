"use client";
import { sortModelsByStrength } from "@/lib/catalog/model-rank";

import { Button } from "@/components/ui/button";
import { useCatalog } from "@/components/providers/catalog-provider";
import { useLocale } from "@/components/providers/locale-provider";
import { ALL_PROVIDERS, ProviderMenuSelect } from "@/components/chat/provider-menu-select";
import { ProviderLogo } from "@/components/chat/provider-logo";
import { Menu, MenuItem, MenuLabel } from "@/components/ui/menu";
import { isImageCatalogModel } from "@/lib/catalog/model-kind";
import { withCreditGlyphs } from "@/components/ui/credit-glyph";
import { formatTokensAsCredits, formatUsdPerStar } from "@/lib/credits";
import { getLocaleOption } from "@/lib/i18n";
import { videoPricingCopy } from "@/lib/i18n/copy/video-pricing";
import { imageQualityLabel } from "@/lib/image-quality";
import { ArrowRight, Check, ChevronDown, Clapperboard, ImageIcon, Music, Type } from "lucide-react";
import { Link } from "@/components/ui/locale-link";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

type PriceMode = "text" | "image" | "music" | "video";

function PriceTypeSelect({
  value,
  onChange,
  label,
  textLabel,
  imageLabel,
  musicLabel,
  videoLabel,
}: {
  value: PriceMode;
  onChange: (value: PriceMode) => void;
  label: string;
  textLabel: string;
  imageLabel: string;
  musicLabel: string;
  videoLabel: string;
}) {
  const options = [
    { value: "text" as const, label: textLabel, Icon: Type },
    { value: "image" as const, label: imageLabel, Icon: ImageIcon },
    { value: "music" as const, label: musicLabel, Icon: Music },
    { value: "video" as const, label: videoLabel, Icon: Clapperboard },
  ];
  const selected = options.find((item) => item.value === value) ?? options[0];
  const SelectedIcon = selected.Icon;
  return (
    <Menu
      ariaLabel={label}
      triggerClassName="flex min-h-11 w-full items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text transition-colors hover:bg-mist aria-expanded:bg-mist"
      panelClassName="w-56"
      trigger={
        <>
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-mist">
            <SelectedIcon className="size-4 text-accent-brand" />
          </span>
          <span className="min-w-0 flex-1 truncate text-left font-medium">{selected.label}</span>
          <ChevronDown className="size-4 shrink-0 text-steel" />
        </>
      }
    >
      {(close) => (
        <>
          <MenuLabel>{label}</MenuLabel>
          {options.map((option) => {
            const Icon = option.Icon;
            return (
              <MenuItem
                key={option.value}
                active={value === option.value}
                onClick={() => {
                  onChange(option.value);
                  close();
                }}
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-mist">
                  <Icon className="size-4 text-accent-brand" />
                </span>
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {value === option.value ? <Check className="size-4 text-accent-brand" /> : null}
              </MenuItem>
            );
          })}
        </>
      )}
    </Menu>
  );
}

type ImagePriceModel={provider:string;provider_label:string;id:string;label:string;sizes:string[];reasoning:{options:Array<{value:string;label:string}>}|null;token_prices:Record<string,number>};
type MusicPriceModel={provider:string;provider_label:string;id:string;label:string;duration_control:boolean;token_prices:Record<string,number>;token_price_auto:number|null};
type VideoPriceModel={provider:string;provider_label:string;id:string;label:string;tariffs:Array<{key:string;resolution:string;sound:Array<"on"|"off">;tokens:number}>};

export function PricingPageContent({ articleSlot }: { articleSlot?: ReactNode }) {
  const { locale, dictionary: t } = useLocale();
  const { models } = useCatalog();
  const textModels = useMemo(() => sortModelsByStrength(models.filter((model) => !isImageCatalogModel(model))), [models]);
  const [priceMode,setPriceMode]=useState<PriceMode>("text");
  const videoCopy = videoPricingCopy(locale);
  const [imageModels,setImageModels]=useState<ImagePriceModel[]>([]);
  const [musicModels,setMusicModels]=useState<MusicPriceModel[]>([]);
  const [videoModels,setVideoModels]=useState<VideoPriceModel[]>([]);
  useEffect(()=>{if(priceMode!=="image"||imageModels.length)return;let active=true;void fetch("/api/images/catalog").then((response)=>response.ok?response.json():null).then((payload:{models?:ImagePriceModel[]}|null)=>{if(active)setImageModels(payload?.models??[]);}).catch(()=>{});return()=>{active=false;};},[imageModels.length,priceMode]);
  useEffect(()=>{if(priceMode!=="music"||musicModels.length)return;let active=true;void fetch("/api/music/catalog").then((response)=>response.ok?response.json():null).then((payload:{models?:MusicPriceModel[]}|null)=>{if(active)setMusicModels(payload?.models??[]);}).catch(()=>{});return()=>{active=false;};},[musicModels.length,priceMode]);
  useEffect(()=>{if(priceMode!=="video"||videoModels.length)return;let active=true;void fetch("/api/video/catalog").then((response)=>response.ok?response.json():null).then((payload:{models?:VideoPriceModel[]}|null)=>{if(active)setVideoModels(payload?.models??[]);}).catch(()=>{});return()=>{active=false;};},[priceMode,videoModels.length]);
  const providerNames = priceMode==="text"
    ? Array.from(new Set(textModels.map((item) => item.provider)))
    : priceMode==="image"
      ? Array.from(new Set(imageModels.map((item)=>item.provider_label)))
      : priceMode==="music"
        ? Array.from(new Set(musicModels.map((item)=>item.provider_label)))
        : Array.from(new Set(videoModels.map((item)=>item.provider_label)));
  const providerOptions = [
    { value: ALL_PROVIDERS, label: t.pricingPage.providerAll, logoName: t.pricingPage.providerAll },
    ...providerNames.map((item)=>({ value: item, label: item, logoName: item })),
  ];
  const [provider, setProvider] = useState(ALL_PROVIDERS);
  const visibleModels = useMemo(
    () => textModels.filter((model) => provider === ALL_PROVIDERS || model.provider === provider),
    [textModels, provider],
  );
  const visibleImageModels=useMemo(()=>imageModels.filter((model)=>provider===ALL_PROVIDERS||model.provider_label===provider),[imageModels,provider]);
  const visibleMusicModels=useMemo(()=>musicModels.filter((model)=>provider===ALL_PROVIDERS||model.provider_label===provider),[musicModels,provider]);
  const visibleVideoModels=useMemo(()=>videoModels.filter((model)=>provider===ALL_PROVIDERS||model.provider_label===provider),[provider,videoModels]);
  const switchMode=(mode:PriceMode)=>{setPriceMode(mode);setProvider(ALL_PROVIDERS);};

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-brand">{t.pricingLanding.eyebrow}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-text sm:text-5xl">{t.pricingLanding.title}</h1>
        <p className="mt-4 text-base leading-relaxed text-steel sm:text-lg">{t.pricingLanding.subtitle}</p>
      </div>

      <section className="mt-10 grid gap-4 rounded-[28px] border border-border bg-mist/55 p-6 sm:grid-cols-3 sm:p-8">
        {t.pricingPage.benefits.map((benefit) => (
          <article key={benefit.title} className="rounded-2xl border border-border bg-surface p-5">
            <Check className="size-5 text-accent-brand" />
            <h2 className="mt-3 font-semibold text-text">{benefit.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-steel">{benefit.description}</p>
          </article>
        ))}
      </section>

      <section className="mt-14" aria-labelledby="model-prices">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1">
            <h2 id="model-prices" className="text-xl font-semibold text-text sm:text-2xl">{t.pricingPage.tableTitle}</h2>
            <p className="mt-2 text-sm text-steel">{priceMode==="text"?withCreditGlyphs(t.pricingPage.noteText):priceMode==="music"?"Конечная стоимость трека в токенах.":priceMode==="video"?videoCopy.note:t.pricingPage.noteImage}</p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-end">
            <div className="w-full sm:w-48">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-steel">{t.pricingPage.modeLabel}</span>
              <PriceTypeSelect value={priceMode} onChange={switchMode} label={t.pricingPage.modeLabel} textLabel={t.pricingPage.modeText} imageLabel={t.pricingPage.modeImage} musicLabel="Песни / музыка" videoLabel={videoCopy.mode} />
            </div>
            <div className="w-full sm:w-64">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-steel">{t.pricingPage.providerLabel}</span>
              <ProviderMenuSelect value={provider} options={providerOptions} onChange={setProvider} />
            </div>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
          {priceMode==="text"?<table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-mist/50">
                <th className="px-5 py-4 font-medium text-text">{t.pricingPage.tableModel}</th>
                <th className="px-5 py-4 text-right font-medium text-text">{withCreditGlyphs(t.pricingPage.tableInputPer100K)}</th>
                <th className="px-5 py-4 text-right font-medium text-text">{withCreditGlyphs(t.pricingPage.tableOutputPer100K)}</th>
              </tr>
            </thead>
            <tbody>
              {visibleModels.map((model) => {
                return (
                  <tr key={model.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <ProviderLogo provider={model.provider} className="size-7" />
                        <span>
                          <span className="block font-medium text-text">{model.name}</span>
                          <span className="block text-xs text-steel">{model.provider}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right tabular-nums text-steel">{formatUsdPerStar(model.inputPer1MUsd)}</td>
                    <td className="px-5 py-4 text-right tabular-nums text-steel">{formatUsdPerStar(model.outputPer1MUsd)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>:priceMode==="music"?<table className="w-full min-w-[640px] text-left text-sm"><thead><tr className="border-b border-border bg-mist/50"><th className="px-5 py-4 font-medium text-text">{t.pricingPage.tableModel}</th><th className="px-5 py-4 font-medium text-text">Длительность</th><th className="px-5 py-4 text-right font-medium text-text">Цена за трек</th></tr></thead><tbody>{visibleMusicModels.flatMap((model)=>{const rows=model.duration_control===false&&model.token_price_auto?[["auto",model.token_price_auto] as const]:Object.entries(model.token_prices);return rows.map(([duration,tokens])=><tr key={`${model.provider}-${model.id}-${duration}`} className="border-b border-border last:border-0"><td className="px-5 py-4"><div className="flex items-center gap-2.5"><ProviderLogo provider={model.provider_label || model.provider} className="size-7" /><span><span className="block font-medium text-text">{model.label}</span><span className="block text-xs text-steel">{model.provider_label}</span></span></div></td><td className="px-5 py-4 text-steel">{duration==="auto"?"Авто":`${duration} сек`}</td><td className="px-5 py-4 text-right font-semibold tabular-nums text-text">{withCreditGlyphs(formatTokensAsCredits(tokens, getLocaleOption(locale).intl, "price"))}</td></tr>);})}{!visibleMusicModels.length?<tr><td colSpan={3} className="px-5 py-10 text-center text-steel">Каталог песен загружается…</td></tr>:null}</tbody></table>:priceMode==="video"?<table className="w-full min-w-[720px] text-left text-sm"><thead><tr className="border-b border-border bg-mist/50"><th className="px-5 py-4 font-medium text-text">{t.pricingPage.tableModel}</th><th className="px-5 py-4 font-medium text-text">{videoCopy.resolution}</th><th className="px-5 py-4 font-medium text-text">{videoCopy.sound}</th><th className="px-5 py-4 text-right font-medium text-text">{videoCopy.pricePerSec}</th></tr></thead><tbody>{visibleVideoModels.flatMap((model)=>(model.tariffs??[]).map((row)=>{const soundLabel=row.sound.includes("on")&&row.sound.includes("off")?`${videoCopy.soundOn} / ${videoCopy.soundOff}`:row.sound.includes("on")?videoCopy.soundOn:videoCopy.soundOff;return <tr key={`${model.provider}-${model.id}-${row.key}`} className="border-b border-border last:border-0"><td className="px-5 py-4"><div className="flex items-center gap-2.5"><ProviderLogo provider={model.provider_label || model.provider} className="size-7" /><span><span className="block font-medium text-text">{model.label}</span><span className="block text-xs text-steel">{model.provider_label}</span></span></div></td><td className="px-5 py-4 text-steel">{row.resolution}</td><td className="px-5 py-4 text-steel">{soundLabel}</td><td className="px-5 py-4 text-right font-semibold tabular-nums text-text">{withCreditGlyphs(formatTokensAsCredits(row.tokens, getLocaleOption(locale).intl, "price"))}</td></tr>;}))}{!visibleVideoModels.length?<tr><td colSpan={4} className="px-5 py-10 text-center text-steel">{videoCopy.loading}</td></tr>:null}</tbody></table>:<table className="w-full min-w-[720px] text-left text-sm"><thead><tr className="border-b border-border bg-mist/50"><th className="px-5 py-4 font-medium text-text">{t.pricingPage.tableModel}</th><th className="px-5 py-4 font-medium text-text">{t.pricingPage.imageSize}</th><th className="px-5 py-4 font-medium text-text">{t.pricingPage.imageQuality}</th><th className="px-5 py-4 text-right font-medium text-text">{t.pricingPage.imagePrice}</th></tr></thead><tbody>{visibleImageModels.flatMap((model)=>Object.entries(model.token_prices).map(([variant,tokens])=>{const [variantSize,variantQuality]=variant.split(":");const providerQuality=model.reasoning?.options.find((item)=>item.value===variantQuality);const qualityLabel=providerQuality?imageQualityLabel(providerQuality.value,providerQuality.label,t.studio):"—";return <tr key={`${model.provider}-${model.id}-${variant}`} className="border-b border-border last:border-0"><td className="px-5 py-4"><div className="flex items-center gap-2.5"><ProviderLogo provider={model.provider_label || model.provider} className="size-7" /><span><span className="block font-medium text-text">{model.label}</span><span className="block text-xs text-steel">{model.provider_label}</span></span></div></td><td className="px-5 py-4 text-steel">{variantSize}</td><td className="px-5 py-4 text-steel">{qualityLabel}</td><td className="px-5 py-4 text-right font-semibold tabular-nums text-text">{withCreditGlyphs(formatTokensAsCredits(tokens, getLocaleOption(locale).intl, "price"))}</td></tr>}))}{!visibleImageModels.length?<tr><td colSpan={4} className="px-5 py-10 text-center text-steel">{t.pricingPage.imageCatalogLoading}</td></tr>:null}</tbody></table>}
        </div>

      </section>

      {articleSlot}

      <section className="mt-14 rounded-[28px] bg-[#111827] px-6 py-10 text-white sm:px-10 sm:py-12">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="text-2xl font-semibold">{t.pricingPage.ctaTitle}</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/65">{t.pricingPage.ctaDescription}</p></div>
          <Button nativeButton={false} className="h-12 shrink-0 rounded-xl bg-[#FF6F00] px-6 text-white hover:bg-[#3b8ef0]" render={<Link href="/register" target="_blank" rel="noopener" />}>{t.pricingPage.ctaButton} <ArrowRight className="size-4" /></Button>
        </div>
      </section>
    </div>
  );
}
