import { useEffect } from "react";

/**
 * Dependency-free SEO head manager (no SSR here, so a helmet library adds
 * nothing — Google renders JS and reads these; WhatsApp/FB previews are
 * handled separately by the backend bot endpoint).
 *
 * Usage: <Seo title="Product Name" description="..." path="/product/x"
 *             image="/img.jpg" jsonLd={{...}} noindex />
 */
const SITE_URL   = "https://ziyanisa.bilionsales.com";
const SITE_NAME  = "ZiyaNisa";
const DEFAULT_TITLE = "ZiyaNisa — Beauty & Lifestyle";
const DEFAULT_DESC  = "Premium beauty & lifestyle products and at-home salon services — ZiyaNisa by M S BILION SALES AND SERVICES.";
const DEFAULT_IMAGE = `${SITE_URL}/og-cover.png`;

function upsertMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!content) { if (el) el.remove(); return; }
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!href) { if (el) el.remove(); return; }
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function upsertJsonLd(data) {
  const ID = "zn-jsonld";
  let el = document.getElementById(ID);
  if (!data) { if (el) el.remove(); return; }
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = ID;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

export default function Seo({ title, description, path, image, jsonLd, noindex = false }) {
  useEffect(() => {
    const fullTitle = title ? `${title} — ${SITE_NAME}` : DEFAULT_TITLE;
    const desc      = description || DEFAULT_DESC;
    const url       = path != null ? `${SITE_URL}${path}` : SITE_URL + window.location.pathname;
    const img       = image ? (image.startsWith("http") ? image : `${SITE_URL}${image}`) : DEFAULT_IMAGE;

    document.title = fullTitle;
    upsertMeta("name", "description", desc);
    upsertMeta("name", "robots", noindex ? "noindex, nofollow" : null);
    upsertLink("canonical", noindex ? null : url);

    upsertMeta("property", "og:site_name", SITE_NAME);
    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:title", fullTitle);
    upsertMeta("property", "og:description", desc);
    upsertMeta("property", "og:url", url);
    upsertMeta("property", "og:image", img);
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", fullTitle);
    upsertMeta("name", "twitter:description", desc);
    upsertMeta("name", "twitter:image", img);

    upsertJsonLd(jsonLd || null);

    return () => upsertJsonLd(null);   // don't leak product schema onto the next page
  }, [title, description, path, image, noindex, JSON.stringify(jsonLd)]);  // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
