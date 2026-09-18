import { test, expect } from "@playwright/test";

for (const path of ["/", "/app"]) {
  test(`${path} has unique metadata, schema and functioning local links`, async ({
    page,
    request,
  }) => {
    await page.route("**/api/state", (route) =>
      route.fulfill({ json: { user: null, runs: [], publications: [] } }),
    );
    await page.goto(path);
    await expect(page.locator("h1")).toHaveCount(1);
    const title = await page.title();
    expect(title).toContain(
      path === "/"
        ? "Rediscover Your Spotify Library"
        : "Organize Your Saved Spotify Music",
    );
    const description = await page
      .locator('meta[name="description"]')
      .getAttribute("content");
    expect(description!.length).toBeGreaterThan(120);
    const canonical = await page
      .locator('link[rel="canonical"]')
      .getAttribute("href");
    expect(new URL(canonical!).pathname).toBe(path);
    expect(
      await page.locator('meta[name="robots"]').getAttribute("content"),
    ).not.toContain("noindex");
    const schema = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    expect(schema.length).toBeGreaterThan(0);
    schema.forEach((item) =>
      expect(JSON.parse(item)["@context"]).toBe("https://schema.org"),
    );
    const headings = await page
      .locator("h1,h2,h3,h4,h5,h6")
      .evaluateAll((items) =>
        items.map((item) => Number(item.tagName.slice(1))),
      );
    headings.forEach((level, index) => {
      if (index) expect(level).toBeLessThanOrEqual(headings[index - 1] + 1);
    });
    const ogImage = await page
      .locator('meta[property="og:image"]')
      .first()
      .getAttribute("content");
    const imageResponse = await request.get(new URL(ogImage!).pathname);
    expect(imageResponse.ok()).toBeTruthy();
    expect(imageResponse.headers()["content-type"]).toContain("image/");
    const links = await page
      .locator("a[href]")
      .evaluateAll((items) => items.map((item) => item.getAttribute("href")!));
    for (const href of new Set(links)) {
      if (href.startsWith("#"))
        expect(await page.locator(`[id="${href.slice(1)}"]`).count()).toBe(1);
      else if (href.startsWith("/") && !href.startsWith("/api/"))
        expect((await request.get(href)).ok()).toBeTruthy();
    }
    expect(await page.locator("img:not([alt])").count()).toBe(0);
  });
  for (const width of [320, 375, 768, 1024, 1440]) {
    test(`${path} fits ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.route("**/api/state", (route) =>
        route.fulfill({ json: { user: null, runs: [], publications: [] } }),
      );
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);
      const dimensions = await page.evaluate(() => ({
        viewport: innerWidth,
        document: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
      }));
      expect(dimensions.viewport).toBe(width);
      expect(dimensions.document).toBe(width);
      expect(dimensions.body).toBe(width);
      await page.screenshot({
        path: test.info().outputPath(`page-${width}.png`),
        fullPage: true,
      });
    });
  }
}
test("crawl endpoints are valid and trailing-slash URLs redirect", async ({
  request,
}) => {
  const robots = await request.get("/robots.txt");
  expect(robots.ok()).toBeTruthy();
  expect(await robots.text()).toContain("Disallow: /api/");
  expect(await robots.text()).toContain("/sitemap.xml");
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBeTruthy();
  expect(sitemap.headers()["content-type"]).toContain("xml");
  expect((await sitemap.text()).match(/<loc>/g)).toHaveLength(2);
  const redirect = await request.get("/app/", { maxRedirects: 0 });
  expect(redirect.status()).toBe(308);
  expect(redirect.headers().location).toBe("/app");
});
