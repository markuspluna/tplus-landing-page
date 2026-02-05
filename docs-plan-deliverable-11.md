# Deliverable 11: Getting Started / Quickstart

## Scope

Step-by-step onboarding tutorial: SDK setup, identity creation, API connection, collateral deposit, first trade, reading back results. Happy path only.

**Out of scope:** Full API reference (D2, D3), contract ABIs (D4), full SDK reference (D5), fee details (D6), risk/margin model (D7), advanced trading (D8), settlement lifecycle (D9), trust model (D10).

---

## Source Material

- `/Users/markuspaulsonluna/Dev/tpluspy/tplus/client/orderbook.py` — `OrderBookClient(user, *, base_url)`: requires explicit `base_url`
- `/Users/markuspaulsonluna/Dev/tpluspy/tplus/client/clearingengine/__init__.py` — `ClearingEngineClient.from_local(user, port=3032)` → `http://127.0.0.1:{port}`, `AUTH = False`
- `/Users/markuspaulsonluna/Dev/tpluspy/tplus/client/base.py` — `BaseClient`: nonce-based auth, auto-refresh on 401/403, 60s safety margin before expiry
- `/Users/markuspaulsonluna/Dev/tpluspy/tplus/utils/user/` — `User` (Ed25519 key generation), `UserManager` (`~/.tplus/users/`), `load_user()`
- `/Users/markuspaulsonluna/Dev/tpluspy/tplus/utils/limit_order.py`, `market_order.py` — order construction and signing helpers
- `/Users/markuspaulsonluna/Dev/tpluspy/tplus/evm/` — `DepositManager` (on-chain deposit via Ape framework)
- `docs-plan-deliverable-2.md` — OMS auth flow, REST paths, WebSocket URL (`wss://oms.tplus.dev/ws`)
- `docs-plan-deliverable-3.md` — ClearingEngineClient sub-clients, VaultClient methods
- `docs-plan-deliverable-5.md` — Full SDK reference: client initialization, order helpers, collateral management

---

## Content

Zero to first trade on t+ using `tpluspy`. All methods are async — use `asyncio.run()` or an async context.

### 1. Prerequisites

- **Python 3.10+**
- **Ethereum wallet** with gas (for on-chain deposits)
- **USDC** or other supported collateral on a supported chain (e.g., Arbitrum)

```bash
pip install tpluspy[evm]
```

`[evm]` adds on-chain deposit/withdrawal support via Ape framework. Omit for trading-only.

Generate an Ed25519 keypair (your t+ identity — no API keys needed):

```python
from tplus.utils.user import UserManager

manager = UserManager()
user = manager.generate("my-trader")
print(f"User ID: {user.public_key}")
```

Load in later sessions:

```python
from tplus.utils.user import load_user

user = load_user("my-trader")
```

> Private key encrypted at `~/.tplus/users/my-trader`. Protect this file.

---

### 2. Connect to the API

Auth is automatic — the first authenticated request triggers nonce-based challenge-response and caches a Bearer Token (auto-refreshed on expiry and 401/403).

```python
import asyncio
from tplus.client import OrderBookClient
from tplus.utils.user import load_user

OMS_URL = "https://oms.tplus.dev/"

async def main():
    user = load_user("my-trader")
    client = OrderBookClient(user, base_url=OMS_URL)

    # Auth triggers automatically on first authenticated request
    orders, _ = await client.get_user_orders()
    print(f"Connected. Orders: {len(orders)}")

asyncio.run(main())
```

D2: auth protocol. D5: client configuration.

---

### 3. Deposit Collateral

Deposit ERC-20 tokens into the t+ DepositVault on-chain. Requires Ape framework wallet and RPC — see [Ape docs](https://docs.apeworx.io/).

```python
from tplus.evm.managers.deposit import DepositManager
from tplus.utils.user import load_user

async def deposit():
    user = load_user("my-trader")
    deposit_mgr = DepositManager(
        account=ape_account,       # Ape AccountAPI (EOA with gas)
        tplus_user=user,
        chain_id=42161,            # Arbitrum
    )

    await deposit_mgr.deposit(
        token="0xaf88d065e77c8cC2239327C5EDb3A432268e5831",  # USDC address
        amount=10000_000000,       # integer, in token's native decimals (USDC = 6)
    )
```

Verify balance after on-chain confirmation:

```python
from tplus.client import OrderBookClient
from tplus.utils.user import load_user

async def check_balance():
    user = load_user("my-trader")
    client = OrderBookClient(user, base_url="https://oms.tplus.dev/")

    inventory = await client.get_user_inventory()
    print(inventory)
```

> Deposits gated by on-chain depositor allowlist. Contact the team if your address is not approved.

D4: contract addresses/ABI. D5 §7: deposit SDK reference.

---

### 4. Place a First Trade

`OrderBookClient` handles `order_id` generation, `creation_timestamp_ns`, decimal lookup, and Ed25519 signing automatically. D5: full parameter reference. D8: order types.

#### Market Order

```python
from tplus.client import OrderBookClient
from tplus.model.asset_identifier import AssetIdentifier
from tplus.utils.user import load_user

async def place_market():
    user = load_user("my-trader")
    client = OrderBookClient(user, base_url="https://oms.tplus.dev/")

    asset_id = AssetIdentifier("da10009cbd5d07dd0cecc66161fc93d7c9000da1@000000000000a4b1")

    response = await client.create_market_order(
        side="Buy",
        base_quantity=500,         # integer, scaled by book_quantity_decimals
        asset_id=asset_id,
    )
    print(f"Order ID: {response.order_id}, Status: {response.status}")
```

#### Limit Order

```python
from tplus.model.limit_order import GTC

async def place_limit():
    user = load_user("my-trader")
    client = OrderBookClient(user, base_url="https://oms.tplus.dev/")

    asset_id = AssetIdentifier("da10009cbd5d07dd0cecc66161fc93d7c9000da1@000000000000a4b1")

    response = await client.create_limit_order(
        quantity=500,              # integer, scaled by book_quantity_decimals
        price=42000,               # integer, scaled by book_price_decimals
        side="Buy",
        time_in_force=GTC(post_only=False),
        asset_id=asset_id,
    )
    print(f"Order ID: {response.order_id}, Status: {response.status}")
```

`response.status`: `"Received"` (accepted) or `"Rejected"` (with `response.reason`).

---

### 5. Check Order Status and Position

#### Open Orders

```python
async def check_orders(client, asset_id):
    orders = await client.get_open_orders_for_book(asset_id)
    for o in orders:
        print(f"{o.order_id}: {o.side} {o.quantity} @ {o.limit_price}")
```

#### Trade History

```python
async def check_trades(client, asset_id):
    trades = await client.get_user_trades_for_asset(asset_id)
    for t in trades:
        print(f"{t.trade_id}: {t.quantity} @ {t.price} (maker={t.is_maker})")
```

D2: WebSocket streaming for real-time fills. D5: full query and stream API.

---

### 6. Withdraw Funds (Optional)

Create a signed withdrawal request, submit to the Clearing Engine (CE), then submit the returned signatures on-chain. D9: full withdrawal lifecycle. D5 §7: SDK details.

```python
from tplus.client import ClearingEngineClient
from tplus.model.withdrawal import WithdrawalRequest
from tplus.model.asset_identifier import AssetIdentifier
from tplus.utils.user import load_user

async def withdraw():
    user = load_user("my-trader")
    ce_client = ClearingEngineClient.from_local(user)

    # 1. Create and sign a withdrawal request
    withdrawal = WithdrawalRequest.create_signed(
        signer=user,
        asset=AssetIdentifier("af88d065e77c8cc2239327c5edb3a432268e5831@000000000000a4b1"),
        amount=5000_000000,
        chain_id="000000000000a4b1",
    )

    # 2. Submit to clearing engine
    await ce_client.withdrawals.init_withdrawal(withdrawal)

    # 3. Poll for approved signatures
    signatures = await ce_client.withdrawals.get_signatures(user.public_key)
    print(f"Received {len(signatures)} approval signature(s)")

    # 4. Submit on-chain via DepositVault.withdraw() — see D4, D9
```

---

### 7. Next Steps

| Topic | Deliverable |
|---|---|
| OMS API (orders, streams) | D2 |
| Clearing Engine (balances, settlements) | D3 |
| Smart contract ABI | D4 |
| Python SDK reference | D5 |
| Fee schedule | D6 |
| Margin, liquidation, risk | D7 |
| Order types, matching, leverage | D8 |
| Settlement and withdrawal flows | D9 |
| Glossary and reference tables | D12 |

---

## Flagged for Review

| Component | Concern |
|---|---|
| Depositor allowlist | On-chain `setDepositorStatus` gates deposits. §3 deposit fails for unapproved addresses. May need testnet instructions or removal. |
| Testnet vs mainnet | Tutorial does not specify environment. Needs testnet OMS URL, CE URL, and contract addresses. |
| Ape framework config | §3/§6 require Ape wallet/RPC config not covered here. Consider minimal config snippet or scoping deposits as "advanced". |
| CE production URL | `from_local()` connects to `127.0.0.1:3032`. External developers need a public CE URL for §6 withdrawal. |
| `AssetIdentifier` values | Hex addresses used in §4/§5 are examples from D5; need confirmed testnet/mainnet asset IDs for the tutorial. |
| `book_quantity_decimals` / `book_price_decimals` | §4 order quantities are scaled integers. Tutorial should explain how to look up decimals via `client.get_market(asset_id)` or provide example values. |
| On-chain withdrawal step | §6 step 4 (submit signatures on-chain) is stubbed — no SDK method for this exists. `DepositManager` handles deposits only. Need to confirm withdrawal on-chain flow. |

---

## Changelog

- Prior passes (consolidated): Wrote all content sections with async/await code examples. Cross-referenced D2–D5. Source-verified client constructors. Restructured to 7-section target. Cleaned source material, removed duplicate cross-references section, simplified §2 to OrderBookClient-only, made §3 balance-check self-contained. Replaced §6 pseudocode with runnable withdrawal. Added auth token details. Tightened prose, aligned D12 glossary terms. Reordered §4 (market order first). Added unified-main() flag.
- Prior pass 1 (Structure & Scope): No scope violations. Added D12 to Next Steps. Trimmed §2 auth prose. Simplified §3 allowlist note. Added unified `main()` concern to Flagged.
- Prior pass 2 (Accuracy): Claimed all code verified — but contained numerous inaccuracies (see this pass).
- Prior pass 3 (Prose & Conciseness): Cut filler, shortened cross-references. Prose under 800-word target.
- Pass 1 (Structure & Scope): Major rewrite of all code examples against source code. §1: replaced non-existent `UserManager().save()` with `manager.generate()`, fixed `public_key_hex` → `public_key`. §2: removed non-existent `client.authenticate()` — auth is automatic on first request per `BaseClient._ensure_auth()`. §3: corrected `DepositManager` constructor (requires `account`, `tplus_user`, `chain_id`), fixed deposit params (integer amount, token address not name), replaced non-existent `ce_client.vaults.get_user_inventory()` with `OrderBookClient.get_user_inventory()`. §4: replaced non-existent `create_market_order`/`create_limit_order` helper imports with `OrderBookClient.create_market_order()`/`create_limit_order()` direct calls, corrected all param types (int not str, AssetIdentifier not market name, GTC not TradeTarget). §5: replaced non-existent `get_open_orders()` with `get_open_orders_for_book(asset_id)`, `get_user_trades(market=)` with `get_user_trades_for_asset(asset_id)`. §6: replaced fabricated `WithdrawalRequest` constructor with `create_signed()` class method per D5, removed non-existent `DepositManager.submit_withdrawal()`, stubbed on-chain step. Expanded Flagged for Review with new concerns (AssetIdentifier values, decimal scaling, on-chain withdrawal).
- Pass 2 (Accuracy): Verified all code examples, import paths, method signatures, parameter names/types, constructor args, and return types against tpluspy source (orderbook.py, base.py, clearingengine/__init__.py, user/manager.py, user/model.py, deposit.py, withdrawal.py, order.py, trades.py, asset_identifier.py) and cross-reference deliverables (D2, D3, D5). Fixed §1 keyfile storage path from `~/.tplus/users/my-trader/` (implied directory) to `~/.tplus/users/my-trader` (encrypted file). All other claims verified correct against source.
- Pass 3 (Prose & Conciseness): Cut filler and hedging. Shortened cross-reference sentences to compact "D2: topic" format. Aligned terminology with D12 glossary (Bearer Token, Clearing Engine, DepositVault). Removed redundant "Install the SDK:" header and "with pip" qualifier. Tightened §6 intro. No content added or facts changed. Prose under 800-word target.
