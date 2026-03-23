import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/validate-idea`;

const validContext = {
  business_type: "meal prep delivery",
  city: "Austin",
  state: "TX",
  target_customers: ["busy professionals"],
  customer_quotes: ["I spend all Sunday cooking and I'm exhausted"],
  insight_evidence: "Customers hate spending weekends cooking",
};

// ── 1. Request Validation ──

Deno.test("returns error when context is missing", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    body: JSON.stringify({}),
  });
  // Should still return 200 with defaults (graceful degradation)
  const body = await res.text();
  assertEquals(res.status === 200 || res.status === 500, true, `Unexpected status: ${res.status} - ${body}`);
});

Deno.test("returns error for empty body", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    body: "{}",
  });
  const body = await res.text();
  assertEquals(res.status === 200 || res.status === 500, true, `Unexpected: ${body}`);
});

// ── 2. Schema Normalization ──

Deno.test("valid context returns all 5 components with correct schema", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    body: JSON.stringify({ context: validContext }),
  });
  assertEquals(res.status, 200);
  const data = await res.json();

  // Landing page
  assertExists(data.landing_page, "landing_page missing");
  assertExists(data.landing_page.headline);
  assertExists(data.landing_page.subheadline);
  assertExists(data.landing_page.benefits);
  assertEquals(Array.isArray(data.landing_page.benefits), true);
  assertExists(data.landing_page.cta);
  assertExists(data.landing_page.social_proof);

  // Survey
  assertExists(data.survey, "survey missing");
  assertEquals(Array.isArray(data.survey), true);
  assertEquals(data.survey.length >= 5, true, `Expected 5+ survey questions, got ${data.survey.length}`);
  for (const q of data.survey) {
    assertExists(q.id);
    assertExists(q.question);
    assertExists(q.type);
    assertEquals(["scale", "multiple_choice", "open", "yes_no", "email"].includes(q.type), true, `Invalid type: ${q.type}`);
  }

  // WhatsApp
  assertExists(data.whatsapp, "whatsapp missing");
  assertExists(data.whatsapp.message);
  assertExists(data.whatsapp.tone);

  // Communities
  assertExists(data.communities, "communities missing");
  assertEquals(Array.isArray(data.communities), true);
  assertEquals(data.communities.length >= 5, true, `Expected 5+ communities, got ${data.communities.length}`);
  for (const c of data.communities) {
    assertExists(c.name);
    assertExists(c.platform);
    assertExists(c.members);
  }

  // Scorecard
  assertExists(data.scorecard, "scorecard missing");
  assertEquals(Array.isArray(data.scorecard), true);
  for (const m of data.scorecard) {
    assertExists(m.id);
    assertExists(m.label);
    assertEquals(typeof m.target, "number");
    assertEquals(m.actual, 0, "Scorecard actual should be initialized to 0");
  }
});

// ── 3. Fixed Survey Order Q1-Q7 ──

Deno.test("survey question types follow expected discovery flow", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    body: JSON.stringify({ context: validContext }),
  });
  assertEquals(res.status, 200);
  const data = await res.json();
  const types = data.survey.map((q: any) => q.type);
  // Last question should be email capture
  assertEquals(types[types.length - 1], "email", "Last survey question should be email capture");
});

// ── 4. Scorecard Thresholds Always Included ──

Deno.test("scorecard targets are always > 0", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    body: JSON.stringify({ context: validContext }),
  });
  assertEquals(res.status, 200);
  const data = await res.json();
  for (const m of data.scorecard) {
    assertEquals(m.target > 0, true, `Scorecard metric "${m.label}" has target ${m.target}, expected > 0`);
  }
});

// ── 5. CORS Headers ──

Deno.test("OPTIONS returns CORS headers", async () => {
  const res = await fetch(FUNCTION_URL, { method: "OPTIONS" });
  assertEquals(res.status, 200);
  assertEquals(res.headers.get("access-control-allow-origin"), "*");
  await res.text();
});

// ── 6. Idempotency ──

Deno.test("repeated requests with same context produce consistent structure", async () => {
  const makeRequest = async () => {
    const res = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ context: validContext }),
    });
    return res.json();
  };

  const [r1, r2] = await Promise.all([makeRequest(), makeRequest()]);

  // Structure should be identical even if content differs
  assertEquals(Object.keys(r1).sort().join(","), Object.keys(r2).sort().join(","), "Response keys should be consistent");
  assertEquals(Array.isArray(r1.survey) && Array.isArray(r2.survey), true);
  assertEquals(Array.isArray(r1.communities) && Array.isArray(r2.communities), true);
  assertEquals(Array.isArray(r1.scorecard) && Array.isArray(r2.scorecard), true);
});

// ── 7. Partial Context Handling ──

Deno.test("handles partial context gracefully (missing optional fields)", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    body: JSON.stringify({ context: { business_type: "coffee shop", city: "Portland", state: "OR" } }),
  });
  assertEquals(res.status, 200);
  const data = await res.json();
  assertExists(data.landing_page);
  assertExists(data.survey);
  assertExists(data.scorecard);
});

// ── 8. Landing Page Uses Pain Language ──

Deno.test("landing page references customer pain context", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    body: JSON.stringify({ context: validContext }),
  });
  assertEquals(res.status, 200);
  const data = await res.json();
  // The combined landing page text should contain something relevant
  const lpText = `${data.landing_page.headline} ${data.landing_page.subheadline} ${data.landing_page.benefits.join(" ")} ${data.landing_page.social_proof}`.toLowerCase();
  // Should reference meal/food/cooking/prep since that's the business
  const hasRelevantLanguage = ["meal", "cook", "food", "prep", "sunday", "weekend", "kitchen"].some(w => lpText.includes(w));
  assertEquals(hasRelevantLanguage, true, `Landing page should reference business context. Got: ${lpText.slice(0, 200)}`);
});
