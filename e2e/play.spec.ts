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

/** Some games open with a cutscene that owns input; Esc skips it. */
async function skipCutscene(page: Page) {
  const cutscene = page.locator('[role="dialog"][aria-label^="Cutscene"]');
  for (let i = 0; i < 20 && (await cutscene.count()) > 0; i++) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);
  }
  await expect(cutscene).toHaveCount(0);
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

test.describe("keyboard and screen readers", () => {
  test("a whole interaction with the keyboard only", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("/play/attic-study");
    // Start overlay is a focusable button; any key starts the game
    await expect(page.getByRole("button", { name: /start attic study/i })).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("play-stage")).toBeVisible();

    // The skip link is the first stop and lands on something in the room
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: /skip to the scene/i })).toBeFocused();
    await page.keyboard.press("Enter");
    const focusedHotspot = page.locator("[data-hotspot]:focus");
    await expect(focusedHotspot).toHaveCount(1);
    await expect(focusedHotspot).toHaveAttribute("role", "button");

    // Every hotspot is reachable and named
    const hotspots = page.locator("[data-hotspot]");
    const count = await hotspots.count();
    expect(count).toBeGreaterThan(1);
    for (let i = 0; i < count; i++) {
      await expect(hotspots.nth(i)).toHaveAttribute("tabindex", "0");
      expect(
        (await hotspots.nth(i).getAttribute("aria-label"))?.length
      ).toBeGreaterThan(0);
    }

    // Enter with no action chosen looks at the thing, and the result is announced
    await page.locator('[data-hotspot="desk"]').focus();
    await page.keyboard.press("Enter");
    const message = page.getByRole("status").filter({ hasText: /sticky note/i });
    await expect(message).toBeVisible();
  });

  test("the scene is a labelled region and pinch-zoom is not blocked", async ({ page }) => {
    await page.setViewportSize(PHONE_UPRIGHT);
    await start(page, "/play/harbor-fog");
    await expect(page.getByRole("region", { name: /scene: harbor docks/i })).toBeVisible();
    const viewport = await page.locator('meta[name="viewport"]').getAttribute("content");
    expect(viewport).not.toMatch(/user-scalable\s*=\s*no|maximum-scale/);
    const touchAction = await page
      .getByTestId("play-stage")
      .evaluate((el) => getComputedStyle(el).touchAction);
    expect(touchAction).toBe("pinch-zoom");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test("verb coin opens from the keyboard and Escape returns focus", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await start(page, "/play/harbor-fog");
    // Harbor Fog opens with a cutscene that owns input — skip it first
    await skipCutscene(page);
    const first = page.locator("[data-hotspot]").first();
    await expect(first).toHaveAttribute("tabindex", "0", { timeout: 15_000 });
    await first.focus();
    await page.keyboard.press("Enter");
    const coin = page.getByRole("menu");
    await expect(coin).toBeVisible();
    await expect(coin.getByRole("menuitem").first()).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(coin).toHaveCount(0);
    await expect(first).toBeFocused();
  });
});

test.describe("dialogs on a phone", () => {
  for (const size of [PHONE_UPRIGHT, PHONE_SIDEWAYS]) {
    test(`hints dialog fits a ${size.width}x${size.height} screen and can be closed`, async ({
      page,
    }) => {
      await page.setViewportSize(size);
      await start(page, "/play/harbor-fog");
      await skipCutscene(page);
      await page.getByRole("button", { name: "Game menu" }).click();
      await page.getByRole("button", { name: "Hints", exact: true }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      // Let the open animation (a short zoom) finish before measuring
      await dialog.evaluate((el) =>
        Promise.all(el.getAnimations().map((a) => a.finished))
      );
      const box = (await dialog.boundingBox())!;
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThanOrEqual(size.height);
      expect(box.x + box.width).toBeLessThanOrEqual(size.width);
      const close = dialog.getByRole("button", { name: "Close" });
      await expect(close).toBeInViewport({ ratio: 1 });
      const closeBox = (await close.boundingBox())!;
      expect(Math.round(closeBox.width)).toBeGreaterThanOrEqual(44);
      expect(Math.round(closeBox.height)).toBeGreaterThanOrEqual(44);
      await close.click();
      await expect(dialog).toHaveCount(0);
    });
  }
});

test.describe("translated interface", () => {
  test("a pack's ui.* strings translate menus, buttons and labels", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.addInitScript(() =>
      localStorage.setItem("adventure_locale_e2e-hosted", "es")
    );
    await start(page, "/play?packUrl=/e2e-hosted/pack.json");
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await expect(page.getByRole("heading", { name: "Salidas" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Acciones" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Mirar" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Ajustes" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Escena: Hall" })).toBeVisible();
    // Untranslated keys fall back to English rather than showing a key
    await expect(page.getByRole("button", { name: "Journal" })).toBeVisible();
    await expect(page.getByText(/ui\.[a-z]+\./)).toHaveCount(0);
  });
});
