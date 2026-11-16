import { expect, test, type Page } from "@playwright/test";

const PHONE_UPRIGHT = { width: 390, height: 664 };
const PHONE_SIDEWAYS = { width: 844, height: 390 };
const DESKTOP = { width: 1440, height: 900 };

/** Open a game and get past the "tap to start" overlay. */
async function start(page: Page, path: string) {
  await page.goto(path);
  await page.getByText(/tap anywhere/i).click();
  await expect(page.getByTestId("play-stage")).toBeVisible();
}

async function stageBox(page: Page) {
  const box = await page.getByTestId("play-stage").boundingBox();
  if (!box) throw new Error("no stage");
  return box;
}

test.describe("play layouts", () => {
  test("upright phone: 16:9 scene, everything on one screen", async ({ page }) => {
    await page.setViewportSize(PHONE_UPRIGHT);
    await start(page, "/play/harbor-fog");
    await expect(page.locator("[data-play-layout]")).toHaveAttribute(
      "data-play-layout",
      "phone-portrait"
    );
    const box = await stageBox(page);
    expect(box.width).toBe(PHONE_UPRIGHT.width); // edge to edge
    expect(box.width / box.height).toBeCloseTo(16 / 9, 1);
    const scrollHeight = await page.evaluate(
      () => document.documentElement.scrollHeight
    );
    expect(scrollHeight).toBeLessThanOrEqual(PHONE_UPRIGHT.height);
    // Exits are reachable without scrolling
    await expect(page.getByRole("button", { name: /watch office/i })).toBeInViewport();
  });

  test("sideways phone: scene fills the height, controls in a rail", async ({ page }) => {
    await page.setViewportSize(PHONE_SIDEWAYS);
    await start(page, "/play/harbor-fog");
    await expect(page.locator("[data-play-layout]")).toHaveAttribute(
      "data-play-layout",
      "phone-landscape"
    );
    const box = await stageBox(page);
    expect(box.height).toBeGreaterThanOrEqual(PHONE_SIDEWAYS.height * 0.95);
    expect(box.width / box.height).toBeCloseTo(16 / 9, 1);
    const rail = page.getByRole("complementary", { name: "Game controls" });
    await expect(rail).toBeVisible();
    await expect(rail.getByRole("button", { name: /watch office/i })).toBeVisible();
    const scrolls = await page.evaluate(
      () => document.documentElement.scrollHeight > window.innerHeight
    );
    expect(scrolls).toBe(false);
  });

  test("desktop: 16:9 scene with controls beside it, no page scroll", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await start(page, "/play/harbor-fog");
    const box = await stageBox(page);
    expect(box.width / box.height).toBeCloseTo(16 / 9, 1);
    expect(box.y + box.height).toBeLessThanOrEqual(DESKTOP.height);
    const exit = await page.getByRole("button", { name: /watch office/i }).boundingBox();
    expect(exit!.x).toBeGreaterThan(box.x + box.width); // beside, not below
    const scrollHeight = await page.evaluate(
      () => document.documentElement.scrollHeight
    );
    expect(scrollHeight).toBeLessThanOrEqual(DESKTOP.height);
  });

  test("characters keep the same size relative to the room", async ({ page }) => {
    const ratio = async (size: { width: number; height: number }) => {
      await page.setViewportSize(size);
      await start(page, "/play/harbor-fog");
      const stage = await stageBox(page);
      const actor = await page.locator('[data-actor-id="player"]').boundingBox();
      return actor!.height / stage.height;
    };
    const phone = await ratio(PHONE_UPRIGHT);
    const desktop = await ratio(DESKTOP);
    expect(phone).toBeGreaterThan(0.15);
    expect(Math.abs(phone - desktop)).toBeLessThan(0.03);
  });
});

test.describe("playing", () => {
  test("touch: look at something and get a response; progress is autosaved", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: PHONE_SIDEWAYS,
      hasTouch: true,
      isMobile: true,
    });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/play/attic-study");
    await page.getByText(/tap anywhere/i).tap();
    await page.getByRole("button", { name: /look/i }).first().tap();
    await page.locator('[data-hotspot="desk"]').tap();
    await expect(page.getByText(/sticky note/i)).toBeVisible();

    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const raw = localStorage.getItem("adventure_attic-study_autosave");
            return raw ? JSON.parse(raw).engineVersion : null;
          }),
        { timeout: 10_000 }
      )
      .toMatch(/^\d+\.\d+\.\d+$/);
    expect(errors).toEqual([]);
    await context.close();
  });
});

test.describe("hosted packs (assets outside the JSON)", () => {
  test("loads art from the assets folder next to pack.json", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    const assets: string[] = [];
    page.on("response", (r) => {
      if (r.url().includes("/e2e-hosted/assets/")) {
        assets.push(`${r.status()} ${new URL(r.url()).pathname}`);
      }
    });
    await start(page, "/play?packUrl=/e2e-hosted/pack.json");
    await expect(page.getByRole("heading", { name: "Hall", level: 2 })).toBeVisible();
    await expect(page.getByTestId("room-loading")).toHaveCount(0);
    const background = await page
      .getByTestId("play-stage")
      .locator(".bg-cover")
      .first()
      .evaluate((el) => getComputedStyle(el).backgroundImage);
    expect(background).toContain("/e2e-hosted/assets/hall.png");
    // The next room is fetched ahead of time
    await expect
      .poll(() => assets)
      .toEqual(
        expect.arrayContaining([
          "200 /e2e-hosted/assets/hall.png",
          "200 /e2e-hosted/assets/vault.png",
        ])
      );
  });

  test("shows a loading state while room art downloads", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    let release: () => void = () => {};
    const held = new Promise<void>((r) => (release = r));
    await page.route("**/e2e-hosted/assets/hall.png", async (route) => {
      await held;
      await route.continue();
    });
    await page.goto("/play?packUrl=/e2e-hosted/pack.json");
    await page.getByText(/tap anywhere/i).click();
    await expect(page.getByTestId("room-loading")).toBeVisible();
    release();
    await expect(page.getByTestId("room-loading")).toHaveCount(0);
  });
});
