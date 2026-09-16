import { MAXIMUM_TOP_UP_USD, MINIMUM_TOP_UP_USD, paidTokensFromUsd } from "@/lib/billing";
import { creditsToUsd, topUpCreditsIssue, usdToPayForCredits } from "@/lib/credits";
import { countryCurrency, isKnownCountry } from "@/lib/geo/countries";
import { fetchUsdRateWithFallback, fxFallbackUrls, nationalCharge } from "@/lib/payments/fx-rate";
import { isFxRoundingCode } from "@/lib/payments/fx-rounding";
import { query } from "@/lib/server/db";
import { attachProviderInvoice, issueInvoice, listUserInvoices, markInvoiceFailed } from "@/lib/server/invoices";
import { isSameOrigin, jsonError } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";
import { createStreampayPayment, isStreampayConfigured, isStreampayProvider, StreampayCreateError } from "@/lib/server/streampay";
import { apiAppCopy, type ApiAppCopy } from "@/lib/i18n/copy/api-app";
import { requestLocale } from "@/lib/i18n/request-locale";
import { effectiveMethodCountries, methodVisibleForLocale } from "@/lib/payments/method-locale";
import type { Locale } from "@/lib/i18n/types";

export const runtime = "nodejs";

type PaymentProviderRow={
  id:string;display_name:string;config:Record<string,unknown>;checkout_url:string|null;method_id:string|null;
  invoice_currency:"usd"|"national";fx_rate_url:string|null;fx_rounding:number|null;country_codes:string[];
  method_country_codes:string[];
};
type PaymentMethodRow={
  id:string;display_name:string;has_logo:boolean;provider_id:string;invoice_currency:"usd"|"national";
  fx_rate_url:string|null;fx_rounding:number|null;country_codes:string[];
};

/** Страна клиента: сначала то, что он указал сам, иначе определённая при входе. */
function clientCountry(user:{registrationCountry?:string;detectedCountryCode?:string}):string|null{
  const stored=user.registrationCountry?.trim().toUpperCase();
  if(stored&&isKnownCountry(stored))return stored;
  const detected=user.detectedCountryCode?.trim().toUpperCase();
  return detected&&isKnownCountry(detected)?detected:null;
}

/**
 * Провайдера без ссылки на оплату клиенту не показываем: она появляется только
 * после интеграции, а до неё кнопка «Пополнить» упиралась бы в ошибку.
 */
const HAS_CHECKOUT_URL=`(
  coalesce(p.checkout_url,p.config->>'checkout_url_template',p.config->>'checkout_url') IS NOT NULL
  OR p.id='streampay'
)`;

const PROVIDER_READY=`p.enabled=true AND p.client_visible=true AND 'USD'=ANY(p.currencies) AND ${HAS_CHECKOUT_URL}`;
const PROVIDER_COLUMNS=`p.id,p.display_name,p.config,p.checkout_url,p.invoice_currency,p.fx_rate_url,p.fx_rounding,p.country_codes`;

/** Провайдер своей страны важнее общемирового, поэтому сначала совпадение по региону. */
const METHOD_COUNTRY_SUBQUERY=`(SELECT m.country_codes FROM payment_provider_methods pm JOIN payment_methods m ON m.id=pm.method_id WHERE pm.provider_id=p.id ORDER BY pm.method_id LIMIT 1) method_country_codes`;

const PROVIDER_FOR_COUNTRY=`SELECT ${PROVIDER_COLUMNS},
    (SELECT pm.method_id FROM payment_provider_methods pm WHERE pm.provider_id=p.id ORDER BY pm.method_id LIMIT 1) method_id,
    ${METHOD_COUNTRY_SUBQUERY}
  FROM payment_providers p
  WHERE ${PROVIDER_READY}
    AND (cardinality(p.country_codes)=0 OR $1::text IS NULL OR $1=ANY(p.country_codes))
  ORDER BY ($1::text IS NULL OR cardinality(p.country_codes)=0),p.sort_order`;

const PROVIDER_FALLBACK=`SELECT ${PROVIDER_COLUMNS},
    (SELECT pm.method_id FROM payment_provider_methods pm WHERE pm.provider_id=p.id ORDER BY pm.method_id LIMIT 1) method_id,
    ${METHOD_COUNTRY_SUBQUERY}
  FROM payment_providers p
  WHERE ${PROVIDER_READY}
  ORDER BY p.sort_order`;

const PROVIDER_FOR_METHOD=`SELECT ${PROVIDER_COLUMNS},pm.method_id,m.country_codes method_country_codes
  FROM payment_providers p
  JOIN payment_provider_methods pm ON pm.provider_id=p.id
  JOIN payment_methods m ON m.id=pm.method_id
  WHERE ${PROVIDER_READY} AND pm.method_id=$2
  ORDER BY ($1::text IS NULL OR cardinality(p.country_codes)=0),p.sort_order`;

const METHOD_SELECT=`SELECT DISTINCT ON (m.id) m.id,m.display_name,m.logo_bytes IS NOT NULL has_logo,
    p.id provider_id,p.invoice_currency,p.fx_rate_url,p.fx_rounding,
    CASE WHEN cardinality(m.country_codes)>0 THEN m.country_codes ELSE p.country_codes END country_codes
  FROM payment_methods m
  JOIN payment_provider_methods pm ON pm.method_id=m.id
  JOIN payment_providers p ON p.id=pm.provider_id
  WHERE ${PROVIDER_READY}`;

const METHODS_FOR_COUNTRY=`${METHOD_SELECT}
    AND (cardinality(p.country_codes)=0 OR $1::text IS NULL OR $1=ANY(p.country_codes))
  ORDER BY m.id,($1::text IS NULL OR cardinality(p.country_codes)=0),p.sort_order`;

const METHODS_FALLBACK=`${METHOD_SELECT}
  ORDER BY m.id,p.sort_order`;

function providerVisibleForLocale(provider:PaymentProviderRow,locale:Locale):boolean{
  return methodVisibleForLocale(effectiveMethodCountries(provider.method_country_codes,provider.country_codes),locale);
}

function firstVisibleProvider(providers:PaymentProviderRow[],locale:Locale):PaymentProviderRow|undefined{
  return providers.find((provider)=>providerVisibleForLocale(provider,locale));
}

function chargeCurrency(countryCodes:string[],clientCountry:string|null):string{
  const preferred=clientCountry&&countryCodes.includes(clientCountry)?clientCountry:countryCodes[0];
  return countryCurrency(preferred??"")??"RUB";
}

async function resolveNationalCharge(amountUsd:number,provider:{invoice_currency:string;fx_rate_url:string|null;fx_rounding:number|null;country_codes:string[]},clientCountry:string|null):Promise<{amount:number;currency:string}>{
  if(provider.invoice_currency!=="national"){
    return {amount:amountUsd,currency:"USD"};
  }
  if(!isFxRoundingCode(provider.fx_rounding))throw new Error("INVALID_FX_ROUNDING");
  const currency=chargeCurrency(provider.country_codes,clientCountry);
  const rate=await fetchUsdRateWithFallback(fxFallbackUrls(provider.fx_rate_url),currency);
  return {amount:nationalCharge(amountUsd,rate,provider.fx_rounding),currency};
}

function topUpAmountError(amountUsd:number,copy:ApiAppCopy):string|null{
  if(!Number.isFinite(amountUsd))return copy.topUpAmountRequired;
  if(amountUsd<MINIMUM_TOP_UP_USD)return copy.topUpMinimum(MINIMUM_TOP_UP_USD);
  if(amountUsd>MAXIMUM_TOP_UP_USD)return copy.topUpMaximum(MAXIMUM_TOP_UP_USD);
  return null;
}

export async function GET(request:Request) {
  const locale = await requestLocale(new URL(request.url).searchParams.get("locale"));
  const copy = apiAppCopy(locale);
  try {
    const user = await requireUser();
    const [invoices,credits,paymentMethods] = await Promise.all([
      listUserInvoices(user.id),
      query<{id:string;created_at:Date;token_delta:string;note:string;kind:string}>(
        "SELECT id,created_at,token_delta,note,kind FROM balance_transactions WHERE user_id=$1 AND token_delta>0 AND kind IN ('bonus','registration') ORDER BY created_at DESC LIMIT 100",
        [user.id],
      ),
      query<PaymentMethodRow>(METHODS_FOR_COUNTRY,[clientCountry(user)]),
    ]);
    const regional=paymentMethods.length?paymentMethods:await query<PaymentMethodRow>(METHODS_FALLBACK);
    const methods=regional.filter((method)=>methodVisibleForLocale(method.country_codes,locale));
    const country=clientCountry(user);
    const paymentQuotes=await Promise.all(methods.map(async(method)=>{
      const currency=method.invoice_currency==="national"?chargeCurrency(method.country_codes,country):"USD";
      let usdRate:number|null=null;
      if(method.invoice_currency==="national"&&isFxRoundingCode(method.fx_rounding)){
        try{usdRate=await fetchUsdRateWithFallback(fxFallbackUrls(method.fx_rate_url),currency);}catch{usdRate=null;}
      }
      return {
        id:method.id,
        display_name:method.display_name,
        hasLogo:method.has_logo,
        invoiceCurrency:method.invoice_currency,
        currency,
        usdRate,
        rounding:method.fx_rounding,
      };
    }));
    return Response.json({
      balanceTokens:user.balanceTokens,
      paymentMethods:paymentQuotes,
      limits:{minimumUsd:MINIMUM_TOP_UP_USD,maximumUsd:MAXIMUM_TOP_UP_USD},
      invoices:invoices.map((invoice)=>({
        id:invoice.id,
        kind:"invoice",
        number:invoice.number,
        timestamp:invoice.createdAt,
        amount:invoice.amountUsd,
        currency:invoice.currency,
        tokenDelta:paidTokensFromUsd(invoice.amountUsd),
        status:invoice.status,
      })),
      credits:credits.map((row)=>({
        id:row.id,
        kind:"credit",
        timestamp:row.created_at.toISOString(),
        tokenDelta:Number(row.token_delta),
        note:row.note,
      })),
    });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") return jsonError(copy.authRequired, 401);
    return jsonError(copy.balanceLoadFailed, 500);
  }
}

export async function POST(request:Request) {
  let locale=await requestLocale();
  if(!isSameOrigin(request))return jsonError(apiAppCopy(locale).invalidOrigin,403);
  try{
    const user=await requireUser();
    const body=await request.json().catch(()=>null) as {credits?:unknown;amountUsd?:unknown;locale?:unknown;methodId?:unknown}|null;
    if(typeof body?.locale==="string")locale=await requestLocale(body.locale);
    const copy=apiAppCopy(locale);
    const credits=Number.isFinite(Number(body?.credits))?Number(body?.credits):Number(body?.amountUsd)/0.1;
    const creditIssue=topUpCreditsIssue(credits);
    if(creditIssue==="required")return jsonError(copy.topUpAmountRequired,400);
    if(creditIssue==="below-minimum")return jsonError(copy.topUpMinimum(MINIMUM_TOP_UP_USD),400);
    if(creditIssue==="above-maximum")return jsonError(copy.topUpMaximum(MAXIMUM_TOP_UP_USD),400);
    const amountUsd=creditsToUsd(credits);
    const payUsd=usdToPayForCredits(credits);
    const country=clientCountry(user);
    const methodId=typeof body?.methodId==="string"?body.methodId.trim():"";
    const provider=methodId
      ? firstVisibleProvider(await query<PaymentProviderRow>(PROVIDER_FOR_METHOD,[country,methodId]),locale)
      : firstVisibleProvider(await query<PaymentProviderRow>(PROVIDER_FOR_COUNTRY,[country]),locale)
        ?? firstVisibleProvider(await query<PaymentProviderRow>(PROVIDER_FALLBACK),locale);
    if(!provider)return jsonError(copy.paymentProviderMissing,methodId?400:503);
    const config=provider.config??{};
    const template=provider.checkout_url??(typeof config.checkout_url_template==="string"?config.checkout_url_template:typeof config.checkout_url==="string"?config.checkout_url:null);
    if(isStreampayProvider(provider.id)){
      if(!isStreampayConfigured())return jsonError(copy.paymentProviderNotConfigured,503);
    }else if(!template){
      return jsonError(copy.paymentProviderNotConfigured,503);
    }
    let charge:{amount:number;currency:string};
    try{
      charge=await resolveNationalCharge(payUsd,provider,country);
    }
    catch{return jsonError(copy.checkoutFailed,503);}
    // Внутренний номинал остаётся в USD, провайдеру уходит рассчитанная сумма в валюте счёта.
    const invoice=await issueInvoice({userId:user.id,providerId:provider.id,methodId:provider.method_id,amountUsd,amount:charge.amount,currency:charge.currency});
    if(isStreampayProvider(provider.id)){
      try{
        const payment=await createStreampayPayment({customer:user.email,externalId:invoice.number,amount:charge.amount,currency:charge.currency,locale});
        if(payment.invoiceId)await attachProviderInvoice(invoice.number,payment.invoiceId);
        return Response.json({checkoutUrl:payment.url,provider:provider.id,invoice:invoice.number,charge});
      }catch(error){
        const reason=error instanceof StreampayCreateError?error.reason:(error as Error).message;
        await markInvoiceFailed(invoice.number,reason);
        throw error;
      }
    }
    if(!template)return jsonError(copy.paymentProviderNotConfigured,503);
    const checkoutUrl=template.replaceAll("{amount}",String(charge.amount)).replaceAll("{email}",encodeURIComponent(user.email)).replaceAll("{invoice}",encodeURIComponent(invoice.number));
    const parsed=new URL(checkoutUrl);
    if(parsed.protocol!=="https:")return jsonError(copy.paymentProviderMisconfigured,500);
    return Response.json({checkoutUrl,provider:provider.id,invoice:invoice.number});
  }catch(error){
    const copy=apiAppCopy(locale);
    if((error as Error).message==="UNAUTHORIZED")return jsonError(copy.authRequired,401);
    console.error("balance_checkout_failed",error);
    return jsonError(copy.checkoutFailed,500);
  }
}
