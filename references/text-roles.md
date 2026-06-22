# Text Roles — Nodes Are Not Documents

## Core Principle

> A node's `value` is an **identifier** (≤25 chars), not documentation.
> Long text lives outside the node — in tooltips, edge labels, captions, or external Markdown.

## Four-Layer Text Classification

| Layer | Where | Max Length | Example |
|---|---|---|---|
| **Identifier** | node `value` | ≤25 chars / ≤2 lines | `"Order Service"` |
| **Protocol Label** | edge `value` | ≤15 chars | `"HTTPS/REST"` |
| **Technical Detail** | node `tooltip` | ≤80 chars | `"Port: 8443, replicas: 3"` |
| **Flow Narration** | external Markdown | unlimited | `"1. User authenticates → 2. ..."` |
| **Scope Declaration** | footnote | ≤120 chars | `"Scope: Core domain | Excluded: Billing"` |
| **Caption** | figure caption | ≤300 chars | `"Figure 1: Microservice deployment..."` |

## Anti-Pattern → Correct Pattern

```
❌ Node contains documentation:
┌──────────────────────────────────┐
│ User Registration Service        │
│ Handles new user registration,   │
│ email verification, OAuth2.0     │
│ third-party login, JWT issuance, │
│ Kafka "user.created" event ...   │  ← This does NOT belong in a node!
└──────────────────────────────────┘

✅ Node contains only identifier:
┌────────────────┐
│ User Service   │  ← Short, scannable
└────────────────┘
(Caption below the diagram: "User Registration flow — see flow narration for details")
```

## Icon/Emoji Prohibition

Emoji in node labels are prohibited:
- ❌ `"🚀 用户登录"` → ✅ `"用户登录"`
- ❌ `"📊 Analytics"` → ✅ `"Analytics"`
- ❌ `"🔐 Auth"` → ✅ `"Auth Service"`

Use shape + color for semantics, not emoji.
