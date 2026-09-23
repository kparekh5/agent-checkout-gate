# Agent Checkout Gate

**Live demo:** https://kavyaparekh.github.io/agent-checkout-gate/

A small, self-contained simulation of a human-confirmation gate for AI-agent checkout
flows. Built after reading Stripe's engineering post, [*How Stripe is designing Checkout
for AI agents*](https://stripe.dev/blog/how-stripe-is-designing-checkout-for-ai-agents)
(stripe.dev, Sept 22 2026).

## Why

That post describes WebMCP tools like `select_payment_method` and `submit_payment`,
revealed to an agent only once checkout state actually allows them ("progressive tool
disclosure") — so the agent never wastes a turn reasoning about an option it can't use
yet. It's a clean way to keep an agent's tool surface small and relevant.

It left me with one question: once `submit_payment` becomes *eligible*, should calling it
also require an explicit human *approval*, separate from eligibility? Eligibility answers
"can the agent do this right now." Approval answers a different question: "should this
specific charge actually go through." This demo is a small, opinionated answer to that
second question.

## What it does

- Pick one of three scenarios (buying headphones, booking a hotel, upgrading a
  subscription). Each runs a short simulated conversation between a user and an agent.
- The agent calls a few read-only tools (`list_products`, `search_stays`, `list_plans`)
  freely, then proposes an item and calls `submit_payment`.
- `submit_payment` always pauses at a gate. Nothing is charged until a human clicks
  **Approve** or **Deny**.
- **Deny** doesn't just cancel — the agent proposes a cheaper alternative and asks again,
  a small retry loop rather than a dead end. This mirrors the self-correction loop in my
  [QueryMind](https://github.com/kavyaparekh/QueryMind) project (max-retry validation
  loop before an agent-generated SQL write executes).
- Every decision (approved/denied, item, amount, time) is written to a **decision log**
  that persists in `localStorage`, so the audit trail survives a page refresh and across
  scenario runs. Nothing leaves your browser.

## What it deliberately isn't

- Not connected to Stripe, or any payment processor, in any way.
- Not a reproduction of Stripe's actual WebMCP implementation — the tool names
  (`submit_payment`, `select_payment_method`) are borrowed from the blog post for
  authenticity, the gating logic and retry flow are my own design, built to explore one
  question the post raised for me, not to represent how Stripe's systems work internally.
- No backend, no build step, no dependencies. `index.html` + `style.css` + `script.js`,
  deployed as-is via GitHub Pages.

## Run it locally

```bash
git clone https://github.com/kavyaparekh/agent-checkout-gate.git
cd agent-checkout-gate
open index.html   # or just double-click it — no server needed
```

## Author

[Kavya Parekh](https://kavyaparekh.github.io) — MS Computer Software Engineering, Arizona
State University.
