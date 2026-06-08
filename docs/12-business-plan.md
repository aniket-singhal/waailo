# Waailo HR — Business Plan & Revenue Model

> **Illustrative, not a guarantee.** Every figure below is a modelled estimate based on
> stated assumptions. Real revenue depends almost entirely on how many customers you acquire
> and retain. This is a planning tool, not financial advice.

## 1. The opportunity

Waailo HR is a multi-tenant, cloud HRMS for small and mid-sized businesses (SMBs) — employee
records, attendance, leave, payroll (with Indian statutory EPF/ESI/PT/TDS), recruitment and
performance, in one product. The target buyer is a 10–500-person company that today runs HR
on spreadsheets or several disconnected tools.

Why this is a viable SaaS:

- **Recurring revenue** — HR is a system of record companies pay for every month, with low
  churn once payroll runs through it.
- **Near-zero marginal cost** — HR data is tiny text; the heavy files sit in S3 for pennies.
  So **gross margins are ~90–95%** (typical for SaaS).
- **You already have the product built** — the main remaining costs are getting customers,
  not building software.

## 2. Pricing

Industry-standard HRMS pricing is **per-employee, per-month (PEPM)**. Indian SMB HRMS tools
typically charge ₹40–100/employee/month. A simple three-tier model:

| Plan | Price (₹/employee/month) | Includes |
|------|--------------------------|----------|
| **Starter** | ₹49 | Employees, attendance, leave, documents |
| **Growth** (most popular) | ₹79 | + Payroll, recruitment, performance, notifications |
| **Scale** | ₹119 | + priority support, advanced reports, integrations |

Common add-ons: a **minimum monthly floor** (e.g. ₹999/month) so very small teams are still
worth serving, and **annual billing at ~2 months free** to improve cash flow and retention.

**Blended assumption for this model:** ₹70/employee/month, average customer = **25 employees**
→ **₹1,750/customer/month** (₹21,000/customer/year).

> Global/USD equivalent: ~$2–4/employee/month is the comparable international range if you
> sell outside India.

## 3. Unit economics (per customer)

| Metric | Value |
|--------|-------|
| Avg revenue per customer (ARPA) | ₹1,750/month (₹21,000/year) |
| Variable cost to serve (infra + payment fees ~2%) | ~₹120/month |
| **Gross profit per customer** | **~₹1,630/month (~93% margin)** |

Because the cost to serve one more customer is tiny, almost every rupee of new revenue is
gross profit. The economics live or die on two numbers instead:

- **CAC** (Customer Acquisition Cost) — what you spend on marketing/sales to win a customer.
- **Churn** — how many cancel each month.

Healthy SaaS targets: **LTV : CAC ≥ 3:1**, and **monthly churn < 3%**. At ₹1,630 gross
profit/month and (say) 2.5% monthly churn, average customer lifetime ≈ 40 months →
**LTV ≈ ₹65,000**. That means you can afford to spend up to ~₹20,000 to acquire a customer and
still hit 3:1.

## 4. Cost structure

**Infrastructure (very low, scales slowly):**

| Stage | Customers / employees | Monthly infra |
|-------|------------------------|---------------|
| Launch | ≤ 20 cust / ~500 emp | ~₹1,000–2,000 (or free tier ≈ ₹0) |
| Growth | ~100 cust / ~2,500 emp | ~₹5,000–10,000 |
| Scale | ~300 cust / ~7,500 emp | ~₹15,000–25,000 |

**Other typical costs (the real ones):**

- **Payment gateway** ~2% of revenue (Razorpay/Stripe).
- **Tools** (email, support desk, analytics): ~₹5,000–15,000/month.
- **People** — this is the biggest lever. Solo/bootstrapped = ₹0 salary cost (you do
  everything). Each hire (support, sales, dev) adds ₹3–10L/year.
- **Marketing / sales** to drive CAC — scales with growth ambition.

## 5. Revenue scenarios (3-year illustrative)

Assuming ₹1,750/customer/month and steady net customer growth:

| | End of Year 1 | End of Year 2 | End of Year 3 |
|--|---------------|----------------|----------------|
| Paying customers | 20 | 80 | 250 |
| Employees billed | ~500 | ~2,000 | ~6,250 |
| **MRR** | ₹35,000 | ₹1,40,000 | ₹4,37,500 |
| **ARR (annual run-rate)** | **₹4.2 L** | **₹16.8 L** | **₹52.5 L** |

> ARR = run-rate at year-end. Revenue *recognised during* a ramping year is lower than the
> year-end run-rate, because you start with fewer customers.

**Conservative / Moderate / Aggressive** by Year 3 (same pricing, different growth):

| Scenario | Customers (Y3) | ARR (Y3) |
|----------|----------------|----------|
| Conservative | 120 | ~₹25 L |
| Moderate (above) | 250 | ~₹52 L |
| Aggressive | 600 | ~₹1.26 Cr |

## 6. What you'd actually "earn" (profit)

Because gross margin is ~93%, profit depends mostly on **your team and marketing spend**:

**Bootstrapped, mostly solo (Year 1–2):**
- Infra + tools + fees are a few ₹L/year at most.
- So **most of revenue ≈ profit** — but growth is capped by how much one person can sell and
  support. Realistic Year-1 take-home: small (you're investing time, ramping customers);
  Year-2 at ~₹16 L ARR could net **~₹10–13 L/year** if you stay lean.

**Funded / small team (Year 3, moderate scenario, ~₹52 L ARR):**
- Gross profit ~₹48 L.
- Minus 2–3 hires (~₹20–35 L) and marketing (~₹5–10 L) → **net ~₹5–20 L/year**, while growing
  faster and building enterprise value (a SaaS at ₹52 L ARR can be worth **₹1.5–2.5 Cr** at a
  3–5× ARR multiple — often the bigger "earning" than annual profit).

## 7. The honest drivers of your earnings

The software cost is **not** what limits your income — it's negligible. What determines how
much you earn:

1. **Acquisition** — can you reliably get companies to sign up? (content, partnerships with
   CAs/payroll consultants, referrals, outbound).
2. **Conversion** — free trial → paid. Aim for ≥ 20–30% of trials converting.
3. **Churn** — keep it under 3%/month; payroll lock-in helps a lot.
4. **Expansion** — customers grow headcount → your PEPM revenue grows automatically (negative
   churn is the holy grail).
5. **Pricing discipline** — don't under-price; ₹70 PEPM vs ₹40 PEPM nearly doubles everything
   above with the same effort.

## 8. Recommended go-to-market for your stage

- **Start on the free hosting tier** (₹0 infra) and onboard your first **5–10 design-partner
  customers** at a discount in exchange for feedback + testimonials.
- Move to ~₹12/month managed hosting (or AWS) once they rely on it.
- Niche down (e.g. Indian SMBs needing **statutory-compliant payroll**) — that's your sharpest
  wedge and a clear reason to pay.
- Add **annual plans** early for cash flow, and a **referral incentive** (HR people talk to
  other HR people).

## 9. Key risks

- **Acquisition is the hard part** — the product exists; distribution is the real work.
- **Statutory compliance** must stay correct (EPF/ESI/PT/TDS change) — it's both your moat and
  your liability. Keep rate tables current (they're data-driven by design).
- **Support load** grows with customers — budget for it before it hurts.
- **Competition** (Keka, greytHR, Zoho People, RazorpayX) — compete on simplicity, price for
  small teams, and onboarding speed, not feature count.

---

### Summary

| | Year 1 | Year 2 | Year 3 (moderate) |
|--|--------|--------|--------------------|
| ARR | ₹4.2 L | ₹16.8 L | ₹52.5 L |
| Infra cost | ~₹0–24 k | ~₹60 k–1.2 L | ~₹2–3 L |
| Gross margin | ~93% | ~93% | ~93% |
| Likely net (lean) | small / ~break-even | ~₹10–13 L | ~₹5–20 L (+ enterprise value) |

The infrastructure is cheap enough to ignore. Your earnings are a function of **customers ×
price × retention** — so the plan from here is less "build more" and more "get the first 10
paying companies, prove retention, then scale acquisition."
