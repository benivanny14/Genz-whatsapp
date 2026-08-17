import { test, expect } from '@playwright/test';

/**
 * WINGA — the marketplace feature that replaced "Business tools" in Settings:
 * a WINGA button on the bottom nav (next to Me), category-based listings
 * (nguo, simu, viwanja, ...), photo/video + price posting, a Chat-with-seller
 * button that opens the DM, and unseen-count badges (per category + on the
 * nav button) that clear as the user views listings, capped at 15 posts/day.
 */
const PASSWORD = 'GenzTest@2026!';
const base = () => process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5174';

// The WINGA button lives on the mobile bottom nav (md:hidden), so run this
// spec in a phone-sized viewport.
test.use({ viewport: { width: 390, height: 844 } });

let seller;
let buyer;

const registerUser = async (request, prefix) => {
  const ts = Date.now().toString(36);
  const user = {
    username: `${prefix}_${ts}`,
    phoneNumber: `255746${String(Date.now()).slice(-6)}`,
    password: PASSWORD
  };
  const reg = await request.post(`${base()}/api/auth/register`, { data: user });
  const data = await reg.json();
  if (!data.token) throw new Error(`register failed: ${JSON.stringify(data)}`);
  return { ...user, userId: data.user._id, token: data.token };
};

test.beforeAll(async ({ request }) => {
  seller = await registerUser(request, 'winga_seller');
  buyer = await registerUser(request, 'winga_buyer');
});

test.setTimeout(150_000);

async function login(page, creds) {
  await page.goto('/login');
  await page.locator('input[placeholder="+255712345678"]').fill(creds.phoneNumber);
  await page.locator('input[type="password"]').fill(creds.password);
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await page.waitForURL(/\/chat/, { timeout: 60_000 });
}

async function postListingViaApi(request, creds, { category = 'nguo', title = 'Mkoba wa ngozi', price = 50000 } = {}) {
  const res = await request.post(`${base()}/api/winga`, {
    headers: { Authorization: `Bearer ${creds.token}` },
    data: {
      category,
      title,
      description: 'E2E listing',
      price,
      priceText: `TZS ${price}`,
      media: [{ url: '/uploads/winga/e2e-placeholder.jpg', type: 'image' }]
    }
  });
  const data = await res.json();
  if (!data.success) throw new Error(`winga create failed: ${JSON.stringify(data)}`);
  return data.listing;
}

test('WINGA: buyer sees unseen-count badges and clearing them updates the nav badge', async ({ page, request }) => {
  // Seller posts two listings in different categories via API.
  const created = [
    await postListingViaApi(request, seller, { category: 'nguo', title: 'Suruali ya jeans' }),
    await postListingViaApi(request, seller, { category: 'simu', title: 'Nokia 3310' })
  ];

  await login(page, buyer);
  await page.goto('/chat');

  // The WINGA nav button carries the total unseen badge (fresh DB → 2 new).
  const feed = await request.get(`${base()}/api/winga`, { headers: { Authorization: `Bearer ${buyer.token}` } });
  const feedData = await feed.json();
  expect(feedData.totalUnseen).toBe(2);
  await expect(page.getByTestId('nav-badge-winga')).toHaveText('2', { timeout: 30_000 });

  // Open WINGA — the unseen banner shows and each category carries its count.
  // (The nav button's accessible name includes the badge, e.g. "2 WINGA".)
  await page.getByTestId('nav-winga').click();
  await page.waitForURL(/\/winga/);
  await expect(page.getByText(/Una biashara 2 mpya/)).toBeVisible({ timeout: 30_000 });
  const nguoCat = page.getByTestId('winga-category-nguo');
  await expect(page.getByTestId('winga-cat-unseen-nguo')).toHaveText('1');
  await expect(page.getByTestId('winga-cat-unseen-simu')).toHaveText('1');

  // Open the nguo category — the listing card has a Chat button and an MPYA tag.
  await nguoCat.click();
  await expect(page.getByTestId('winga-listing-card').first()).toBeVisible();
  await expect(page.getByText('Suruali ya jeans').first()).toBeVisible();
  await expect(page.getByTestId('winga-chat-button').first()).toBeVisible();

  // Open the listing viewer — this marks it viewed.
  await page.getByRole('button', { name: /Suruali ya jeans/ }).click();
  await expect(page.getByTestId('winga-viewer-chat')).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();

  // Back to categories: nguo count cleared, simu still 1, banner shows 1.
  await page.getByRole('button', { name: 'Back to categories' }).click();
  await expect(page.getByTestId('winga-cat-unseen-nguo')).not.toBeVisible();
  await expect(page.getByTestId('winga-cat-unseen-simu')).toHaveText('1');
  await expect(page.getByText(/Una biashara 1 mpya/)).toBeVisible();

  // View the second one too — banner disappears and the nav badge clears.
  await page.getByTestId('winga-category-simu').click();
  await page.getByRole('button', { name: /Nokia 3310/ }).click();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByText(/Una biashara .* mpya/)).not.toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('winga-cat-unseen-simu')).not.toBeVisible();
  await expect(page.getByTestId('nav-badge-winga')).not.toBeVisible({ timeout: 20_000 });

  // Chat button: buyer opens a DM with the seller and lands in /chat.
  const firstChat = page.getByTestId('winga-chat-button').first();
  await firstChat.click();
  await page.waitForURL(/\/chat/, { timeout: 30_000 });
  await expect(page.getByText(seller.username)).toBeVisible({ timeout: 20_000 });

  // Self-cleanup: the marketplace feed is global, so remove this run's
  // listings to keep the next run's exact count assertions valid.
  for (const l of created) {
    await request.delete(`${base()}/api/winga/${l._id}`, { headers: { Authorization: `Bearer ${seller.token}` } });
  }
});

test('WINGA: seller posts a business and sees it under My Listings with the daily counter', async ({ page, request }) => {
  await login(page, seller);

  // Go to WINGA via the bottom nav button.
  await page.getByTestId('nav-winga').click();
  await page.waitForURL(/\/winga/);
  await expect(page.getByText('WINGA', { exact: true }).first()).toBeVisible({ timeout: 30_000 });

  // Daily counter is visible (the buyer test already posted 2 as this
  // seller, so the count is dynamic — assert the shape, not the value).
  const counter = page.getByText(/Leo: \d+\/15 biashara/);
  await expect(counter).toBeVisible();
  const countBefore = parseInt((await counter.innerText()).match(/(\d+)\/15/)[1], 10);

  // Post a listing through the real UI.
  await page.getByRole('button', { name: 'Chapisha' }).click();
  await expect(page.getByRole('heading', { name: 'Chapisha Biashara' })).toBeVisible();

  // Category picker.
  await page.getByTestId('post-category-nguo').click();

  // Title + price.
  await page.getByPlaceholder('Mfano: Mkoba wa ngozi, iPhone 12, Viwanja...').fill('Mkoba wa ngozi wa kike');
  await page.getByPlaceholder('250,000').fill('45000');

  // Media — attach a tiny in-memory PNG so the upload endpoint is exercised.
  await page.locator('input[type="file"]').setInputFiles({
    name: 'listing.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    )
  });
  // The upload completes → a thumbnail appears in the post modal.
  await expect(page.locator('img[src*="/uploads/winga/"]').first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('winga-submit-post')).toBeEnabled();

  await page.getByTestId('winga-submit-post').click();
  await expect(page.getByText('Biashara yako imechapishwa kwenye WINGA!')).toBeVisible({ timeout: 30_000 });

  // The listing should now appear in the category view, and the daily counter
  // increments by exactly one.
  await expect(page.getByText('Mkoba wa ngozi wa kike').first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/TZS 45,000|TZS 45000/).first()).toBeVisible();
  await expect(counter).toHaveText(`Leo: ${countBefore + 1}/15 biashara`, { timeout: 20_000 });

  // Daily limit: keep posting until the 16th-in-24h is blocked with a 429.
  let blocked = null;
  for (let i = 0; i < 30 && !blocked; i++) {
    const res = await request.post(`${base()}/api/winga`, {
      headers: { Authorization: `Bearer ${seller.token}` },
      data: { category: 'nguo', title: `Bidhaa ${i}`, media: [{ url: '/uploads/winga/x.jpg', type: 'image' }] }
    });
    const data = await res.json();
    if (res.status() === 429) {
      blocked = data;
      break;
    }
    if (!data.success) throw new Error(`winga create failed: ${JSON.stringify(data)}`);
  }
  expect(blocked).not.toBeNull();
  expect(blocked.code).toBe('DAILY_LIMIT_REACHED');

  // Self-cleanup: delete every listing the seller created this run so the
  // next run starts from an empty marketplace feed.
  const all = await request.get(`${base()}/api/winga`, { headers: { Authorization: `Bearer ${seller.token}` } });
  const allData = await all.json();
  const mine = [
    ...(allData.myListings || []),
    ...(allData.categories || []).flatMap((c) => (c.listings || []).filter((l) => String(l.user?._id) === String(seller.userId)))
  ];
  for (const l of mine) {
    await request.delete(`${base()}/api/winga/${l._id}`, { headers: { Authorization: `Bearer ${seller.token}` } });
  }
});

test('WINGA: buyer orders a listing and the seller confirms it', async ({ page, request }) => {
  // Seller posts a listing via API (fast path).
  const listing = await postListingViaApi(request, seller, { title: 'Kanga ya maua', price: 12000 });

  // Buyer opens WINGA → Nguo category → the card has a Nunua button.
  await login(page, buyer);
  await page.getByTestId('nav-winga').click();
  await page.waitForURL(/\/winga/);
  await expect(page.getByText('WINGA', { exact: true }).first()).toBeVisible({ timeout: 30_000 });
  await page.getByTestId('winga-category-nguo').click();
  const card = page.locator('[data-testid="winga-listing-card"]').filter({ hasText: 'Kanga ya maua' }).first();
  await expect(card).toBeVisible({ timeout: 30_000 });
  await expect(card.getByTestId('winga-buy-button')).toBeVisible();

  // Open the order modal, bump quantity, add a message, submit.
  await card.getByTestId('winga-buy-button').click();
  await expect(page.getByText('Nunua Biashara')).toBeVisible();
  await page.getByRole('button', { name: 'Ongeza idadi' }).click();
  await page.getByPlaceholder(/Je ipo rangi/).fill('Naomba rangi ya kijani');
  await page.getByTestId('winga-submit-order').click();
  await expect(page.getByText('Ombi lako la kununua limetumwa!')).toBeVisible({ timeout: 30_000 });

  // The seller sees the pending order and confirms it via API.
  const orders = await request.get(`${base()}/api/winga/orders`, { headers: { Authorization: `Bearer ${seller.token}` } });
  const ordersData = await orders.json();
  const pending = (ordersData.orders || []).find(
    (o) => String(o.listing) === String(listing._id) && o.isSeller && o.status === 'pending'
  );
  expect(pending).toBeTruthy();
  expect(pending.buyerUsername).toBe(buyer.username);
  const confirm = await request.post(`${base()}/api/winga/orders/${pending._id}/status`, {
    headers: { Authorization: `Bearer ${seller.token}` },
    data: { status: 'confirmed' }
  });
  expect((await confirm.json()).success).toBe(true);

  // The listing is now marked sold, so the Nunua button disappears.
  const winga = await request.get(`${base()}/api/winga`, { headers: { Authorization: `Bearer ${buyer.token}` } });
  const wingaData = await winga.json();
  const nguo = wingaData.categories.find((c) => c.id === 'nguo');
  const soldListing = (nguo.listings || []).find((l) => String(l._id) === String(listing._id));
  expect(soldListing.isSold).toBe(true);

  // Buyer opens Maagizo → Nimetuma tab → the order shows as confirmed.
  await page.getByRole('button', { name: 'Maagizo' }).click();
  await expect(page.getByText('Maagizo').first()).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: /Nimetuma/ }).click();
  await expect(page.getByText('Imethibitishwa ✅').first()).toBeVisible({ timeout: 20_000 });

  // Buyer marks the order as received (completed) and rates the listing right
  // from the completed order.
  await page.getByTestId('winga-order-complete').click();
  await expect(page.getByText('Imekamilika ✅').first()).toBeVisible({ timeout: 20_000 });
  await page.getByTestId('winga-order-rate').click();
  await expect(page.getByText('Tathmini ya Biashara')).toBeVisible();
  await page.locator('button[aria-label="5 star"]:not([disabled])').first().click();
  await page.getByTestId('winga-submit-rating').click();
  await expect(page.getByText('Asante kwa tathmini yako!')).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Close' }).last().click();

  // Search across all categories finds the listing by title.
  await page.getByTestId('winga-search').fill('Kanga');
  await expect(page.getByText(/Matokeo ya "Kanga"/).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('Kanga ya maua').first()).toBeVisible();
  await page.getByTestId('winga-search').fill('');

  // Cleanup: seller deletes the listing.
  await request.delete(`${base()}/api/winga/${listing._id}`, { headers: { Authorization: `Bearer ${seller.token}` } });
});


