import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveSiteUrl, serializeSchema, siteUrl } from "../lib/seo";
import sitemap from "../app/sitemap";
import robots from "../app/robots";
import { NextRequest } from "next/server";
import { proxy } from "../proxy";

test("SEO origin is production-safe, HTTPS and path-free", () => {
  assert.equal(resolveSiteUrl({}).href, "https://sortifi.vercel.app/");
  assert.equal(
    resolveSiteUrl({ APP_URL: "http://example.com/path?query=1#fragment" })
      .href,
    "https://example.com/",
  );
  assert.equal(
    resolveSiteUrl({ APP_URL: "http://127.0.0.1:3000" }).href,
    "http://127.0.0.1:3000/",
  );
  assert.equal(
    resolveSiteUrl({
      VERCEL_PROJECT_PRODUCTION_URL: "production.vercel.app",
      VERCEL_URL: "preview.vercel.app",
    }).hostname,
    "production.vercel.app",
  );
  assert.throws(() => resolveSiteUrl({ APP_URL: "ftp://example.com" }));
  assert.throws(() =>
    resolveSiteUrl({ APP_URL: "https://user:password@example.com" }),
  );
});
test("crawl files agree on public canonical URLs", () => {
  assert.deepEqual(
    sitemap(),
    ["/", "/app"].map((path) => ({ url: new URL(path, siteUrl).href })),
  );
  assert.equal(robots().sitemap, new URL("/sitemap.xml", siteUrl).href);
  assert.deepEqual(robots().rules, {
    userAgent: "*",
    allow: "/",
    disallow: "/api/",
  });
});
test("JSON-LD cannot close its script element", () => {
  const data = { name: "</script><script>alert(1)</script>" };
  assert.ok(!serializeSchema(data).includes("<"));
  assert.deepEqual(JSON.parse(serializeSchema(data)), data);
});

test("HTTPS redirect preserves path/query and leaves local HTTP usable", () => {
  const previous = process.env.NODE_ENV;
  Object.assign(process.env, { NODE_ENV: "production" });
  try {
    const redirect = proxy(
      new NextRequest("http://sortifi.vercel.app/app?from=home", {
        headers: { "x-forwarded-proto": "http" },
      }),
    );
    assert.equal(redirect.status, 308);
    assert.equal(
      redirect.headers.get("location"),
      "https://sortifi.vercel.app/app?from=home",
    );
    const secure = proxy(
      new NextRequest("https://sortifi.vercel.app/app", {
        headers: { "x-forwarded-proto": "https" },
      }),
    );
    assert.equal(secure.headers.get("location"), null);
    assert.equal(
      secure.headers.get("Strict-Transport-Security"),
      "max-age=31536000",
    );
    const local = proxy(new NextRequest("http://127.0.0.1:3100/app"));
    assert.equal(local.headers.get("location"), null);
    assert.equal(local.headers.get("Strict-Transport-Security"), null);
  } finally {
    if (previous === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
    else Object.assign(process.env, { NODE_ENV: previous });
  }
});
