import { expect, test } from "@playwright/test";

test.skip(
  process.env.PLAYWRIGHT_FULL_STACK !== "true",
  "Set PLAYWRIGHT_FULL_STACK=true to run this against the local API and DB.",
);

async function installPlaywrightSession(page: import("@playwright/test").Page) {
  await page.context().addCookies([
    {
      name: "bb_test_auth",
      value: "student",
      url: "http://127.0.0.1:3000",
    },
  ]);
}

test("creates a real study session from the My Space command entrance", async ({
  page,
}) => {
  await installPlaywrightSession(page);

  const studyResponses: Array<{
    url: string;
    method: string;
    status: number;
    body: string;
  }> = [];

  page.on("response", async (response) => {
    const url = response.url();

    if (
      url.includes("/api/study-command/propose") ||
      url.includes("/api/v1/study/sessions")
    ) {
      studyResponses.push({
        url,
        method: response.request().method(),
        status: response.status(),
        body: await response.text().catch(() => ""),
      });
    }
  });

  await page.goto("/student/my-space", { waitUntil: "networkidle" });
  await page
    .getByPlaceholder(/عندي فرض/)
    .fill("أريد تدريب BAC في علوم الطبيعة على التركيب الضوئي آخر 3 سنوات فقط");
  await page.getByRole("button", { name: /حضّر الجلسة/ }).click();

  await expect(page.getByText("مسودة جلسة")).toBeVisible();
  await expect(
    page.locator(".hub-command-proposal").getByRole("heading", {
      name: /تدريب BAC علوم الطبيعة والحياة · التركيب الضوئي/,
    }),
  ).toBeVisible();

  await page.getByRole("button", { name: "بدء الجلسة" }).click();

  await expect(page).toHaveURL(/\/student\/training\/[0-9a-f-]{36}$/);
  expect(
    studyResponses.some(
      (response) =>
        response.method === "POST" &&
        response.url.includes("/api/v1/study/sessions") &&
        response.status === 201 &&
        response.body.includes('"kind":"TOPIC_DRILL"') &&
        response.body.includes('"topicCodes":["PHOTOSYNTHESIS"]'),
    ),
  ).toBe(true);
});
