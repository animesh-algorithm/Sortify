# Sortify SEO and earned-link rollout

## Public search surface

The public routes are `/` (rediscover and organize a Spotify library) and `/app`
(open the organizer). Both have self-canonicals, unique titles/descriptions and
index/follow metadata. `/app` renders a public connection screen; private data
still requires session-protected APIs. Robots disallows `/api/`; robots is not
access control. The XML sitemap includes only these two public pages, without
invented modification dates. Keep short, lowercase, hyphenated future slugs and
use permanent redirects if an existing URL is renamed. Existing `/app` and OAuth
URLs are deliberately preserved. Next redirects `/app/` to `/app`.

Homepage JSON-LD describes the actual WebSite and WebApplication. `/app` includes
breadcrumbs. No invented reviews, ratings, prices, or affiliations are included.
Validate deployed markup with [Schema Validator](https://validator.schema.org/).
Generic schema does not guarantee Google rich-result eligibility.

Existing branded 1200×630 OG/Twitter PNGs are preserved and served by Next's
file-based metadata routes. Homepage illustrations are inline SVG, avoiding
raster download overhead. Album thumbnails use dimensioned, lazy Next Images
with explicit sizes, Spotify-only remote patterns and AVIF/WebP output. Original
source assets remain untouched. Fonts are self-hosted through next/font instead
of a blocking third-party CSS import. The hero H1 is excluded from reveal effects,
blur repaint work is removed, and parallax targets are cached.

## Deployment and Search Console

1. Confirm the preferred production origin. The current README documents
   `https://sortifi.vercel.app`; set production `APP_URL` to that origin or your
   chosen custom HTTPS origin. Never set it to a preview deployment. The SEO
   resolver strips paths and forces HTTPS for non-local hosts.
2. Set `SPOTIFY_REDIRECT_URI` separately to the exact registered callback on that
   origin. Do not rename OAuth URLs for SEO.
3. In [Search Console](https://search.google.com/search-console), add a URL-prefix
   property for the preferred HTTPS origin. Select HTML tag verification and put
   only its content token into `GOOGLE_SITE_VERIFICATION` in production.
4. Deploy, confirm the homepage's `google-site-verification` tag, then click Verify.
   For a custom domain's Domain property, use Google's DNS TXT verification at
   your DNS provider instead. The meta token does not verify a Domain property.
5. Submit `/sitemap.xml`, inspect `/` and `/app`, and review indexing diagnostics.
   Do not claim ownership verified until Search Console confirms it.
6. Confirm HTTP → HTTPS 308, canonical origin, trailing-slash redirect, OG image
   delivery and API authentication on the deployed site. Vercel already enforced
   HTTPS/HSTS at audit time. The new proxy adds production redirects and HSTS for
   non-local hosts; other reverse proxies must overwrite x-forwarded-proto.

Verification requires the account's token or DNS access; no token is fabricated.
These changes have not been deployed by this SEO task.

## Performance and mobile acceptance

The September 18 local audit also fixed a rotated `/app` orbit overflowing at
1024px, without clipping playlist cards. The `/app` metadata explicitly supplies
OG/Twitter images because overriding nested Open Graph metadata removed its
inherited image. Public pages retain exactly one rendered H1 and ordered headings.

Local production build, TypeScript, lint, 34 unit tests and all 26 browser tests
passed, including public metadata/link checks and widths 320–1440px. An unthrottled
375px local sample recorded homepage LCP 552ms and `/app` LCP 508ms, both CLS 0
and no external font requests. These are diagnostic samples, not field results.
A real Spotify artwork optimization probe returned a 96px WebP at 2,612 bytes
from a 189,940-byte original (both HTTP 200); savings vary with source artwork.

Run isolated production QA without disturbing an active development server:

```sh
NEXT_BUILD_DIR=.next-seo APP_URL=https://sortifi.vercel.app npm run build
NEXT_BUILD_DIR=.next-seo npm run start -- --hostname 127.0.0.1 --port 3100
QA_BASE_URL=http://127.0.0.1:3100 npm run test:browser
```

Browser SEO tests cover metadata, public headings, local links, fragment targets,
schema JSON, OG image delivery, XML/robots endpoints and widths 320/375/768/1024/1440.
The existing mocked flow tests cover authenticated editor states. Mocked tests do
not prove real Spotify access or production performance. Keep screenshots for
visual review, including long playlist names and editing states.

After deployment use mobile PageSpeed Insights and Search Console's real-user
Core Web Vitals report. Targets at the 75th percentile are LCP ≤2.5s, INP ≤200ms,
CLS ≤0.1. A fast local load or a Lighthouse score is not field CWV acceptance;
field reporting may be unavailable for low-traffic pages. Recheck after enough
traffic, using Google's rolling reporting window. Prioritize measured bottlenecks
instead of changing application behavior just to chase a score.

## Earned backlinks: 90-day strategy

No outreach has been sent and no links have been purchased.

### Days 1–30: create evidence worth referencing

- Link from the owner's relevant portfolio project entry and GitHub README to
  the canonical homepage, with an honest product description and screenshots.
  Updating another repository/site is a separate follow-up, not done here.
- Prepare one original guide: “Rediscover forgotten songs in your Spotify library”.
  Explain selection, preview/edit and explicit publication, with real screenshots
  and a link to `/app`. Publish only after checking the current product workflow.
- Prepare a technical write-up about the current organizing pipeline, limitations,
  privacy boundaries and playlist safety. Do not reuse obsolete architecture or
  make untested musical-similarity claims.
- Create a short demo and a factual media kit (description, author, screenshots,
  canonical URL). Avoid unaudited usage statistics or endorsements.

### Days 31–60: targeted, permission-aware outreach

- Research 15–20 currently active, relevant music-tool curators, independent
  music-tech writers and open-source newsletters. Verify each publication's
  submission rules and audience before choosing it; this is a prospecting target,
  not a verified list of publications.
- Offer a working demo and a specific reason their readers might benefit. Ask
  for editorial consideration, never a guaranteed followed link. One personalized
  initial note and at most one respectful follow-up after 7–14 days.
- Share a demo in communities only where self-promotion is permitted. Answer
  substantive questions and disclose authorship. No automated comment spam.
- Submit to a small number of genuinely curated music-tool/open-source directories
  after verifying requirements. Do not mass-submit to low-quality directories.

### Days 61–90: measure and improve

- Track prospect URL, relevance, permission, contact date, response, published
  linking URL, destination, referral visits and useful product conversions.
- Review Search Console links and branded/non-branded queries monthly. Use earned
  referring domains and engaged referrals as outcomes, not arbitrary DA scores.
- Refresh evidence and repair genuine broken resource references where Sortify
  is an appropriate replacement. Do not request irrelevant placements.
- Never buy ranking links, exchange links at scale, use private blog networks or
  require optimized anchor text. Label paid placements appropriately if ever used.

## Primary guidance

- [Google crawling and indexing](https://developers.google.com/search/docs/crawling-indexing)
- [Sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Search Console ownership verification](https://support.google.com/webmasters/answer/9008080)
- [Google link-spam policy](https://developers.google.com/search/docs/essentials/spam-policies#link-spam)
- [Core Web Vitals](https://web.dev/articles/vitals)
