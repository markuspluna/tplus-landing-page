# Deliverable 5: tpluspy — Python SDK

## Scope

SDK documentation: installation, auth, client setup, and usage guides for all major workflows (orders, queries, market-data streams, collateral) with code examples. Out of scope: endpoint semantics (D2, D3), smart-contract details (D4), type reference (D12), quickstart (D11).

---

## Source Material

### tpluspy package root
- `/Users/markuspaulsonluna/Dev/tpluspy/tplus/` — package root; includes `py.typed` marker, `constants.py` (`CLEARING_ENGINE_DECIMALS = 18`), `logger.py`

### tpluspy clients
- `/Users/markuspaulsonluna/Dev/tpluspy/tplus/client/` — `OrderBookClient` (OMS interactions) and `ClearingEngineClient` (clearing operations)

### tpluspy client base
- `/Users/markuspaulsonluna/Dev/tpluspy/tplus/client/base.py` — `BaseClient` with `httpx.AsyncClient` and WebSocket support

### tpluspy clearing engine sub-clients
- `/Users/markuspaulsonluna/Dev/tpluspy/tplus/client/clearingengine/` — `SettlementClient`, `AssetRegistryClient`, `DecimalClient`, `DepositClient`, `WithdrawalClient`, `VaultClient`, `AdminClient`

### tpluspy models
- `/Users/markuspaulsonluna/Dev/tpluspy/tplus/model/` — all data models (see Method Reference section below)

### tpluspy user management
- `/Users/markuspaulsonluna/Dev/tpluspy/tplus/utils/user/` — `User` (Ed25519 key management), `UserManager` (`~/.tplus/users/`), `load_user()`

### tpluspy order utils
- `/Users/markuspaulsonluna/Dev/tpluspy/tplus/utils/limit_order.py` — limit order construction and signing
- `/Users/markuspaulsonluna/Dev/tpluspy/tplus/utils/market_order.py` — market order construction and signing
- `/Users/markuspaulsonluna/Dev/tpluspy/tplus/utils/replace_order.py` — replace order construction and signing
- `/Users/markuspaulsonluna/Dev/tpluspy/tplus/utils/signing.py` — core Ed25519 signing utilities

### tpluspy EVM integration
- `/Users/markuspaulsonluna/Dev/tpluspy/tplus/evm/` — `DepositManager`, `SettlementManager`, `contracts.py` (`DepositVault`, `Registry`, `CredentialManager`), `eip712.py` (EIP-712 Order message), `constants.py` (registry address, deposit vault, chain mappings); optional install via `[evm]` extras using Ape framework

### Cross-reference sources
- `/Users/markuspaulsonluna/Dev/tplus-core/lib/client/src/ws.rs` — `TplusClient` trait (all SDK operations), `TplusWsClient`, nonce auth flow
- `/Users/markuspaulsonluna/Dev/tplus-core/lib/domains/src/lib.rs` — EIP-712 domain: `"MyrtleWyckoff"`, version `"1.0.0"`, dynamic chainId/verifyingContract
- D2 — REST/WS paths, auth model (aTLS + nonce + Bearer), WS protocol, validation pipeline, HTTP codes, signature forwarding
- D3 — ClearingEngineClient sub-client signatures, no-auth model, settlement/withdrawal request types
- D4 — EIP-712 signing (Order TypeHash, withdrawal digest), on-chain structs, DepositVault, contract addresses
- D9 — Settlement signatures (1 admin per settlement, quorum for withdrawals), withdrawal delays, trade event states

---

## Content

### 1. Installation and Dependencies

Typed SDK (`py.typed`). Python 3.10+.

```bash
pip install tpluspy          # core
pip install tpluspy[evm]     # on-chain deposit/settlement/withdrawal
```

**Core:** `httpx`, `websockets`, `cryptography` (Ed25519), `pydantic`, `pycryptodome` (encrypted keyfiles), `eth-pydantic-types`, `eth-utils`

**EVM extras:** `eth-ape` ([Ape framework](https://apeworx.io/)), `eip712`, `hexbytes`, `ape-tokens`, `click`

**Prerequisites:** Ed25519 keypair (§2). Ethereum wallet with gas for EVM operations only.

---

### 2. Authentication Setup

Ed25519 keypair authentication — the public key (32 bytes, hex-encoded) is the user identity, maps to `bytes32 user` on-chain.

Each user can have multiple **sub-accounts** (`account: u64`): cross-margin, isolated-margin, spot. Sub-accounts share a keypair but maintain independent margin and position state.

| Component | Import | Purpose |
|---|---|---|
| `User` | `from tplus.utils.user import User` | Ed25519 keypair holder |
| `UserManager` | `from tplus.utils.user import UserManager` | Persist profiles to `~/.tplus/users/` |
| `load_user()` | `from tplus.utils.user import load_user` | Load saved user by name |

#### Generate a New User

```python
from tplus.utils.user import UserManager

manager = UserManager()

# Generate a new Ed25519 keypair, encrypt with password, save to ~/.tplus/users/
user = manager.generate("my-trader", password="my-secret")
```

To import an existing private key:

```python
manager.add("my-trader", private_key="<hex-or-bytes>", password="my-secret")
```

`User()` accepts an optional `private_key` (str, bytes, or `Ed25519PrivateKey`). Without arguments, generates a random in-memory keypair (not persisted).

#### Load an Existing User

```python
from tplus.utils.user import load_user

user = load_user("my-trader")  # prompts for password if not provided
# or: load_user("my-trader", password="my-secret")

# No name → loads default user (or the only user if one exists)
user = load_user()
```

> **Note:** Private keys are encrypted via `pycryptodome` at `~/.tplus/users/`. Anyone with the keyfile and password can sign orders as you.

#### Authentication Flow

Automatic — `BaseClient._ensure_auth()` runs before every authenticated request. No public `authenticate()` method.

1. `GET /nonce/{public_key}` → challenge nonce
2. Sign nonce with Ed25519 private key
3. `POST /auth` with `{user_id, nonce, signature}` → Bearer token
4. Token cached; auto-refreshes 60s before expiry and on 401/403 (single retry)

Headers (`Authorization: Bearer {token}`, `User-Id: {user.public_key}`) are SDK-managed.

```python
client = OrderBookClient(user, base_url="https://oms.tplus.dev/")
# First authenticated call triggers auth automatically
orders = await client.get_user_orders()
```

Order payloads also include a `signature` field — the matching engine validates signatures at fill time (defense-in-depth). See D2 for full auth protocol, D10 for trust model.

---

### 3. Client Initialization and Configuration

Two async clients:

| Client | Purpose | Transport |
|---|---|---|
| `OrderBookClient` | Order CRUD, market data, event streams | REST + WebSocket |
| `ClearingEngineClient` | Account state, settlement, assets, withdrawals, vaults | REST + WebSocket |

#### OrderBookClient

`user: User` (positional), `base_url: str` (keyword-only). Optional: `websocket_kwargs`, `log_level`, `use_ws_control` (WS `/control` for low-latency order CRUD), `insecure_ssl`. `timeout` is a `BaseClient` param; `OrderBookClient` always uses the default 10.0s.

```python
import asyncio
from tplus.client import OrderBookClient
from tplus.utils.user import load_user

OMS_URL = "https://oms.tplus.dev/"

async def main():
    user = load_user("my-trader")
    client = OrderBookClient(user, base_url=OMS_URL)

    # First authenticated call triggers nonce/sign/token flow
    orders = await client.get_user_orders()

asyncio.run(main())
```

#### ClearingEngineClient

`from_local(user, port=3032)` → `http://127.0.0.1:{port}`. No auth (`AUTH = False`). `user` is for signing settlement/withdrawal requests, not a credential.

```python
from tplus.client import ClearingEngineClient
from tplus.utils.user import load_user

async def main():
    user = load_user("my-trader")
    ce_client = ClearingEngineClient.from_local(user)  # http://127.0.0.1:3032

    # Access sub-clients (cached_property — instantiated once)
    settlements = ce_client.settlements    # SettlementClient
    assets = ce_client.assets              # AssetRegistryClient
    decimals = ce_client.decimals          # DecimalClient
    deposits = ce_client.deposits          # DepositClient
    withdrawals = ce_client.withdrawals    # WithdrawalClient
    vaults = ce_client.vaults              # VaultClient
    admin = ce_client.admin                # AdminClient
```

> **Note:** Both clients inherit `BaseClient` (`httpx.AsyncClient` + `websockets`), support `async with` and `close()`. Use `BaseClient.from_client(existing_client)` to share the underlying HTTP connection.

---

### 4. Order Management

Automatic serialization and Ed25519 signing. REST by default; WS `/control` when `use_ws_control=True` (§3).

Two layers: `OrderBookClient` methods (recommended) and low-level `create_*_ob_request_payload()` helpers for manual payload construction.

#### Place a Limit Order

```python
from tplus.client import OrderBookClient
from tplus.model.asset_identifier import AssetIdentifier
from tplus.model.limit_order import GTC
from tplus.utils.user import load_user

async def place_limit():
    user = load_user("my-trader")
    client = OrderBookClient(user, base_url="https://oms.tplus.dev/")

    asset_id = AssetIdentifier("da10009cbd5d07dd0cecc66161fc93d7c9000da1@000000000000a4b1")

    response = await client.create_limit_order(
        quantity=500,          # integer, scaled by book_quantity_decimals
        price=42000,           # integer, scaled by book_price_decimals
        side="Buy",
        time_in_force=GTC(post_only=False),
        asset_id=asset_id,
    )

    print(f"Order ID: {response.order_id}, Status: {response.status}")
```

**`OrderBookClient.create_limit_order()` parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `quantity` | `int` | Yes | Scaled by `book_quantity_decimals` |
| `price` | `int` | Yes | Scaled by `book_price_decimals` |
| `side` | `str` | Yes | `"Buy"` or `"Sell"` |
| `time_in_force` | `GTC \| GTD \| IOC \| None` | No | Default: `GTC(post_only=False)` |
| `asset_id` | `AssetIdentifier` | Yes | Hex address with chain ID |
| `target` | `TradeTarget` | No | Default: `TradeTarget.margin_account_spot_trade()` (account=1, is_spot=True) |

Auto-generates `order_id` (base64 UUID), fetches decimal metadata via `GET /market/{asset_id}`, signs with Ed25519. Returns `OrderOperationResponse(order_id, status, reason?, processed_at_ns?)` — status `"Received"` or `"Rejected"`.

#### Place a Market Order

```python
async def place_market():
    user = load_user("my-trader")
    client = OrderBookClient(user, base_url="https://oms.tplus.dev/")

    response = await client.create_market_order(
        side="Buy",
        base_quantity=500,         # quantity in base asset units
        asset_id=asset_id,
    )

    print(f"Order ID: {response.order_id}, Status: {response.status}")
```

`create_market_order()` takes `base_quantity` or `quote_quantity` (mutually exclusive), plus optional `fill_or_kill=True`.

#### Replace an Order

Atomic cancel-and-replace. Accepts `new_price` and/or `new_quantity`. Low-level `ReplaceOrderDetails` also supports `new_trigger`.

```python
async def replace():
    user = load_user("my-trader")
    client = OrderBookClient(user, base_url="https://oms.tplus.dev/")

    response = await client.replace_order(
        original_order_id="<existing-order-uuid>",
        asset_id=asset_id,
        new_price=42100,
        new_quantity=500,
    )

    print(f"Replaced. Order ID: {response.order_id}")
```

#### Cancel an Order

```python
async def cancel():
    user = load_user("my-trader")
    client = OrderBookClient(user, base_url="https://oms.tplus.dev/")

    response = await client.cancel_order(
        order_id="<order-uuid>",
        asset_id=asset_id,
    )

    print(f"Order {response.order_id} cancelled, status: {response.status}")
```

Signing handled internally. All order payloads include `protocol_version: int = 1`.

#### Query Orders

```python
async def get_orders():
    user = load_user("my-trader")
    client = OrderBookClient(user, base_url="https://oms.tplus.dev/")

    # All orders for user
    orders, raw = await client.get_user_orders()

    # Orders for a specific asset (with pagination and open-only filter)
    orders = await client.get_user_orders_for_book(
        asset_id, page=0, limit=100, open_only=True
    )

    # Convenience: paginated open orders for an asset
    open_orders = await client.get_open_orders_for_book(asset_id)

    for order in open_orders:
        print(f"{order.order_id}: {order.side} {order.quantity} @ {order.limit_price}")
        # OrderResponse also has: confirmed_filled_quantity, pending_filled_quantity,
        # confirmed_filled_amount, pending_filled_amount, status, timestamp_ns,
        # trigger_above_price, trigger_below_price, trigger_touched, canceled, in_flight
```

#### Query Trade History

```python
async def get_trades():
    user = load_user("my-trader")
    client = OrderBookClient(user, base_url="https://oms.tplus.dev/")

    # All user trades
    trades = await client.get_user_trades()

    # Trades for a specific asset
    trades = await client.get_user_trades_for_asset(asset_id)

    for trade in trades:
        print(f"{trade.trade_id}: {trade.quantity} @ {trade.price} (maker={trade.is_maker})")
```

#### Trigger Orders (Conditional)

`TriggerAbove` and `TriggerBelow` (from `tplus.model.order_trigger`). Both limit and market order helpers accept an optional `trigger`:

```python
from tplus.model.order_trigger import TriggerAbove

# Via low-level helper:
order = create_limit_order_ob_request_payload(
    ...,
    trigger=TriggerAbove(price=45000),
)
```

Serializes as `{"PriceAbove": {"price": ...}}` / `{"PriceBelow": {"price": ...}}`. See D8 for trigger order semantics.

---

### 5. Market Data Queries

REST queries via `OrderBookClient` and `ClearingEngineClient`. Real-time streams in §6. See D2 (OMS endpoints), D3 (CE endpoints).

> **Note:** `AssetIdentifier` format: `{hex_address}@{hex_chain_id}` (e.g., `da10009cbd5d07dd0cecc66161fc93d7c9000da1@000000000000a4b1`). Use `get_market(asset_id)` for decimal metadata.

#### Get Account Inventory (OMS)

```python
from tplus.client import OrderBookClient
from tplus.utils.user import load_user

async def get_inventory():
    user = load_user("my-trader")
    client = OrderBookClient(user, base_url="https://oms.tplus.dev/")

    # Returns raw dict from GET /inventory/user/{public_key}
    inventory = await client.get_user_inventory()
    print(inventory)
```

`UserInventory` model (`tplus.model.user_inventory`):

- `accounts: dict[int, UserAccount]` — keyed by sub-account index
- `is_mm: bool` — market maker flag
- `UserAccount`: `kind` (`"cross_margin"` / `"isolated_margin"` / `"spot"`), `spot: Spot`, `margin: Margin`
- `Spot.spot_account_balance: dict[str, int]` — asset ID → balance
- `Margin.margins: dict[str, MarginPosition]` — asset ID → `MarginPosition(base: Balance, quote: Balance)`
- `Balance`: `credits: int`, `liabilities: int`

Parse via `parse_user_inventory(data)` from `tplus.model.user_inventory`. See D3 for field definitions, D7 for margin concepts.

#### Get Orderbook Snapshot

```python
async def get_snapshot():
    user = load_user("my-trader")
    client = OrderBookClient(user, base_url="https://oms.tplus.dev/")

    book = await client.get_orderbook_snapshot(asset_id)
    # book.bids and book.asks are list[list[float]] — [price, quantity] pairs
    # book.sequence_number for incremental sync with stream_depth()
    print(f"Top bid: {book.bids[0] if book.bids else 'empty'}")
    print(f"Top ask: {book.asks[0] if book.asks else 'empty'}")
```

#### Get Kline History

```python
async def get_kline_history():
    user = load_user("my-trader")
    client = OrderBookClient(user, base_url="https://oms.tplus.dev/")

    klines = await client.get_klines(asset_id, page=0, limit=100)
    for k in klines:
        print(f"O:{k.open} H:{k.high} L:{k.low} C:{k.close} V:{k.volume}")
```

#### Get Market Metadata

```python
async def get_market_info():
    user = load_user("my-trader")
    client = OrderBookClient(user, base_url="https://oms.tplus.dev/")

    market = await client.get_market(asset_id)
    # Market: asset_id, book_price_decimals, book_quantity_decimals
    # Cached per-asset — safe to call repeatedly
    print(f"Price decimals: {market.book_price_decimals}, Qty decimals: {market.book_quantity_decimals}")
```

#### Query Asset Registry

```python
async def query_assets():
    user = load_user("my-trader")
    ce_client = ClearingEngineClient.from_local(user)

    # Returns dict: asset index → chain ID → asset info
    assets = await ce_client.assets.get()

    # Risk parameters per asset
    risk_params = await ce_client.assets.get_risk_parameters()
```

See D3 for asset registry details.

#### Query Decimals

```python
async def query_decimals():
    user = load_user("my-trader")
    ce_client = ClearingEngineClient.from_local(user)

    decimals = await ce_client.decimals.get(
        asset_id=[asset_id],
        chains=["000000000000a4b1"],  # Arbitrum chain ID hex
    )
    # Returns dict: asset IDs → chains → decimals
```

> **Note:** CE normalizes all amounts to 18 decimals internally (`CLEARING_ENGINE_DECIMALS = 18` in `tplus.constants`).

#### Query Vaults and Deposits

```python
async def query_vaults():
    user = load_user("my-trader")
    ce_client = ClearingEngineClient.from_local(user)

    vaults = await ce_client.vaults.get()  # list[ChainAddress]

    # Trigger deposit ingestion check
    await ce_client.deposits.update(user.public_key, chain_id=42161)
```

---

### 6. WebSocket Streaming

Each stream is a distinct WebSocket path (not subscribe-by-message). All methods are async generators. See D2 for WS protocol details.

| Method | WS Path | Auth | Yields | Description |
|---|---|---|---|---|
| `stream_orders()` | `/orders` | No | `OrderEvent` | All order events |
| `stream_depth(asset_id)` | `/marketdepth/diff/{asset_id}` | No | `OrderBookDiff` | Incremental depth |
| `stream_klines(asset_id)` | `/klines/diff/{asset_id}` | No | `KlineUpdate` | Candlestick updates |
| `stream_finalized_trades()` | `/trades` | No | `Trade` | Confirmed trades |
| `stream_all_trades()` | `/trades/events` | No | `TradeEvent` | All trade events |
| `stream_user_trade_events(user_id?)` | `/trades/user/events/{user_id}` | Yes | `UserTrade` | User trades (all states) |
| `stream_user_finalized_trades(user_id?)` | `/trades/user/{user_id}` | Yes | `UserTrade` | User trades (confirmed) |

`stream_user_trades()` is deprecated — use `stream_user_trade_events()` or `stream_user_finalized_trades()`. `user_id` defaults to the authenticated user's public key.

> **Note:** WS `/control` for low-latency order CRUD uses `use_ws_control=True` (§3), not a separate stream method. D2 documents additional per-asset streams (`/trades/{asset_id}`, `/trades/events/{asset_id}`) with no SDK wrappers.

Authenticated streams include Bearer token and `User-Id` header automatically.

#### Stream Orderbook Depth

```python
async def stream_orderbook():
    user = load_user("my-trader")
    client = OrderBookClient(user, base_url="https://oms.tplus.dev/")

    async for diff in client.stream_depth(asset_id):
        # diff.bids and diff.asks are list[list[float]] — [price, quantity] pairs
        # diff.sequence_number tracks incremental ordering
        for bid in diff.bids:
            print(f"Bid: {bid[0]} -> {bid[1]}")
        for ask in diff.asks:
            print(f"Ask: {ask[0]} -> {ask[1]}")
        # A quantity of 0.0 means the price level was removed
```

#### Stream Kline (Candlestick) Updates

```python
async def stream_klines_example():
    user = load_user("my-trader")
    client = OrderBookClient(user, base_url="https://oms.tplus.dev/")

    async for kline in client.stream_klines(asset_id):
        print(f"O:{kline.open} H:{kline.high} L:{kline.low} C:{kline.close} V:{kline.volume}")
        # Also available: kline.open_timestamp_ns, kline.close_timestamp_ns
        # Convenience: kline.open_datetime, kline.close_datetime (UTC datetime objects)
```

#### Stream Order Events

```python
async def stream_order_events():
    user = load_user("my-trader")
    client = OrderBookClient(user, base_url="https://oms.tplus.dev/")

    async for event in client.stream_orders():
        print(f"Type: {event.event_type} | {event}")
```

#### Stream User Trades (Authenticated)

```python
async def stream_user_trades():
    user = load_user("my-trader")
    client = OrderBookClient(user, base_url="https://oms.tplus.dev/")

    async for trade in client.stream_user_trade_events():
        print(f"Trade: {trade.trade_id} | {trade.quantity} @ {trade.price} status={trade.status}")
```

**`OrderEvent` types** (`tplus.model.order`):

| `event_type` | Model | Description |
|---|---|---|
| `CREATED` | `OrderCreatedEvent` | Entered book |
| `UPDATED` | `OrderUpdatedEvent` | Fill changed |
| `CANCELED` | `OrderCancelledEvent` | Removed |
| `REPLACED` | `OrderReplacedEvent` | Cancel + new |
| `CREATEFAILED` | `OrderCreateFailedEvent` | Rejected (`reason`) |
| `REPLACEFAILED` | `OrderReplaceFailedEvent` | Rejected (`reason`) |
| `CANCELFAILED` | `OrderCancelFailedEvent` | Rejected (`reason`) |

**Trade event states** (distinct from order events): `Pending` (matched, settlement pending), `Confirmed` (settled on-chain), `Rollbacked` (settlement failed — see D8 §6).

`Trade` fields: `asset_id`, `trade_id`, `order_id`, `price`, `quantity`, `timestamp_ns`, `buyer_is_maker`, `status`.

`UserTrade` fields: `asset_id`, `trade_id`, `order_id`, `price`, `quantity`, `timestamp_ns`, `is_maker`, `is_buyer`, `status`.

---

### 7. Collateral, Deposit, and Withdrawal Operations

Requires `tpluspy[evm]`. Uses Ape framework for `DepositVault` interaction. See D4 for contract addresses and ABI.

#### Deposit Collateral

```python
from tplus.evm.managers.deposit import DepositManager
from tplus.utils.user import load_user

async def deposit():
    user = load_user("my-trader")
    deposit_mgr = DepositManager(
        account=ape_account,       # Ape AccountAPI (EOA with gas)
        tplus_user=user,
        chain_id=42161,            # optional, defaults to connected chain
        # vault=...,               # optional DepositVault, defaults to chain's vault
        # clearing_engine=...,     # optional ClearingEngineClient, required if wait=True
    )

    await deposit_mgr.deposit(
        token="0xaf88d065e77c8cC2239327C5EDb3A432268e5831",  # token address or ContractInstance
        amount=10000_000000,       # integer, in token's native decimals (e.g., USDC = 6)
        wait=False,                # if True, sleeps 3s then triggers CE deposit ingestion (requires clearing_engine)
    )
```

Calls `DepositVault.deposit(user_public_key, token, amount)` on-chain. Caller must have approved the ERC-20 transfer. `user` is the t+ public key (`bytes32`), not a sub-account.

> **Note:** Deposits gated by on-chain depositor allowlist (`setDepositorStatus`). See D4, D13 for rebalancing.

#### Withdraw Collateral

Two steps: create signed request → submit to CE. See D9 for withdrawal lifecycle, D4 for on-chain mechanics.

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
        chain_id="000000000000a4b1",  # hex chain ID
    )

    # 2. Submit to CE
    await ce_client.withdrawals.init_withdrawal(withdrawal)

    # 3. Poll for admin signatures
    signatures = await ce_client.withdrawals.get_signatures(user.public_key)
```

`WithdrawalRequest`: `inner: InnerWithdrawalRequest` (`tplus_user`, `asset`, `amount: HexInt`, `chain_id`) + `signature: list[int]`. `create_signed()` builds and signs.

Queued withdrawals:

```python
    queued = await ce_client.withdrawals.get_queued(user.public_key)
    # Returns list[WithdrawalRequest]

    # Check on-chain withdrawal completion
    await ce_client.withdrawals.update(user.public_key, chain_id=42161)
```

See D13 for rebalancing fees.

#### Execute a Settlement

`SettlementManager` integrates CE client with vault contract for the settlement workflow.

```python
from tplus.evm.managers.settle import SettlementManager
from tplus.model.asset_identifier import AssetIdentifier
from tplus.utils.amount import AmountPair
from tplus.utils.user import load_user

async def settle():
    user = load_user("my-trader")
    settlement_mgr = SettlementManager(
        tplus_user=user,
        ape_account=ape_account,   # Ape AccountAPI
        chain_id=42161,            # optional, defaults to connected chain
        # clearing_engine=...,     # optional ClearingEngineClient, defaults to local CE
        # vault=...,               # optional DepositVault, defaults to chain's vault
        # settlement_vault=...,    # optional, separate vault for executeAtomicSettlement()
    )

    # 1. Initialize settlement (creates TxSettlementRequest, signs, sends to CE)
    info = await settlement_mgr.init_settlement(
        asset_in=AssetIdentifier("..."),
        amount_in=AmountPair(normalized=..., atomic=...),
        asset_out=AssetIdentifier("..."),
        amount_out=AmountPair(normalized=..., atomic=...),
    )

    # 2. Get approval (via REST poll or WS stream)
    approvals = await settlement_mgr.get_approvals()

    # 3. Execute on-chain
    receipt = await settlement_mgr.execute_settlement(info, approvals[0])
```

Streaming approvals via WebSocket (alternative to polling):

```python
from tplus.evm.managers.settle import SettlementApprovalHandler

handler = SettlementApprovalHandler(settlement_mgr)

# pending_settlements: dict[nonce → SettlementInfo]
pending = {info.expected_nonce: info}

async def on_approval(settlement_info, approval):
    receipt = await settlement_mgr.execute_settlement(settlement_info, approval)

# Runs indefinitely, matching approvals to pending settlements
await handler.handle_approvals(pending, on_approval_received=on_approval)
```

`handle_approvals()` listens on `/settlement/approvals/{user}`, decrypts approvals with the user's Ed25519 key, matches by nonce, and invokes the callback.

See D9 for settlement lifecycle, D4 for on-chain mechanics.

---

### 8. Error Handling Patterns

Order methods return `OrderOperationResponse`:

```python
from tplus.model.order import OperationStatus

response = await client.create_limit_order(...)

if response.status == OperationStatus.REJECTED:
    print(f"Order rejected: {response.reason}")
else:
    print(f"Order received: {response.order_id}")
```

`"Received"` = OMS accepted the order, not filled. Monitor `/orders` stream for fill/cancel events.

#### Order Rejection via WebSocket Events

`CREATEFAILED`, `REPLACEFAILED`, `CANCELFAILED` events include a `reason` field. Common reasons:

- **Signature failure** — invalid Ed25519 signature
- **Deduplication** — duplicate order ID or nonce
- **Timing validation** — `creation_timestamp_ns` too old
- **Margin check** — insufficient margin at fill time (not checked at submission). See D7.

#### WebSocket Reconnection

No auto-reconnect. Re-create client on disconnect:

```python
async def resilient_stream():
    user = load_user("my-trader")
    while True:
        try:
            client = OrderBookClient(user, base_url="https://oms.tplus.dev/")
            async for diff in client.stream_depth(asset_id):
                process(diff)
        except Exception as e:
            print(f"Connection lost: {e}, reconnecting...")
            await asyncio.sleep(1)
```

#### HTTP Error Codes

`BaseClient` raises `httpx.HTTPStatusError` on non-2xx (except 204 → `{}`). `401`/`403` trigger auto-token-refresh (single retry). See D2 for error code reference.

#### Async Context

All methods require `await`. Use `async with` for cleanup:

```python
import asyncio

async def main():
    async with OrderBookClient(load_user("my-trader"), base_url="https://oms.tplus.dev/") as client:
        orders = await client.get_user_orders()

asyncio.run(main())
```

---

### 9. Method Reference

#### OrderBookClient Methods

**REST — Order Management:**

| Method | Auth | Description |
|---|---|---|
| `create_limit_order(quantity, price, side, time_in_force?, asset_id, target?)` | Yes | Limit order → `OrderOperationResponse` |
| `create_market_order(side, base_quantity?, quote_quantity?, fill_or_kill?, asset_id, target?)` | Yes | Market order → `OrderOperationResponse` |
| `replace_order(original_order_id, asset_id, new_quantity?, new_price?)` | Yes | Cancel-and-replace → `OrderOperationResponse` |
| `cancel_order(order_id, asset_id)` | Yes | Cancel → `OrderOperationResponse` |

**REST — Queries:**

| Method | Auth | Description |
|---|---|---|
| `get_market(asset_id)` | No | Market metadata (cached) → `Market` |
| `get_orderbook_snapshot(asset_id)` | No | Book snapshot → `OrderBook` |
| `get_klines(asset_id, page?, limit?, end_timestamp_ns?)` | No | Kline history → `list[KlineUpdate]` |
| `get_user_orders()` | Yes | All orders → `(list[OrderResponse], raw_data)` |
| `get_user_orders_for_book(asset_id, page?, limit?, open_only?)` | Yes | Per-asset orders → `list[OrderResponse]` |
| `get_open_orders_for_book(asset_id, limit?, max_pages?)` | Yes | Paginated open orders → `list[OrderResponse]` |
| `get_user_trades()` | Yes | All trades → `list[UserTrade]` |
| `get_user_trades_for_asset(asset_id)` | Yes | Per-asset trades → `list[UserTrade]` |
| `get_user_inventory()` | Yes | Account inventory → `dict` |
| `create_market(asset_id)` | Yes | Create market (admin) → `dict` |

**WebSocket Streams:**

| Method | WS Path | Auth | Yields |
|---|---|---|---|
| `stream_orders()` | `/orders` | No | `OrderEvent` |
| `stream_depth(asset_id)` | `/marketdepth/diff/{asset_id}` | No | `OrderBookDiff` |
| `stream_klines(asset_id)` | `/klines/diff/{asset_id}` | No | `KlineUpdate` |
| `stream_finalized_trades()` | `/trades` | No | `Trade` |
| `stream_all_trades()` | `/trades/events` | No | `TradeEvent` |
| `stream_user_trade_events(user_id?)` | `/trades/user/events/{user_id}` | Yes | `UserTrade` |
| `stream_user_finalized_trades(user_id?)` | `/trades/user/{user_id}` | Yes | `UserTrade` |
| `stream_user_trades(user_id?)` | `/trades/user/{user_id}` | Yes | `UserTrade` (deprecated) |

#### ClearingEngineClient Sub-clients

| Sub-client | Attribute | Key Methods | Purpose |
|---|---|---|---|
| `SettlementClient` | `.settlements` | `init_settlement(request)`, `get_signatures(user)`, `stream_approvals(user_hex)`, `init_batch_settlement(request)`, `update(user, chain_id)`, `update_approved_settlers(chain_id, vault_address)`, `get_approved_settlers(chain_id)` | Settlement init/approvals |
| `AssetRegistryClient` | `.assets` | `get()`, `get_registry_address()`, `get_risk_parameters()`, `update()`, `update_risk_parameters()` | Asset registry/risk params |
| `DecimalClient` | `.decimals` | `get(asset_id, chains)`, `update(asset_id, chains)` | Per-asset decimals |
| `DepositClient` | `.deposits` | `update(user, chain_id)` | Deposit ingestion |
| `WithdrawalClient` | `.withdrawals` | `init_withdrawal(withdrawal)`, `get_signatures(user)`, `get_queued(user)`, `update(user, chain_id)` | Withdrawal init/signing |
| `VaultClient` | `.vaults` | `get()`, `update()`, `update_balance(asset_id, chain_id)` | Vault queries |
| `AdminClient` | `.admin` | `get_verifying_key()`, `modify_user_inventory(...)`, `get_user_inventory(user)` | Admin only |

#### Order Construction Helpers (Low-level)

| Function | Import | Description |
|---|---|---|
| `create_limit_order_ob_request_payload()` | `tplus.utils.limit_order` | Build and sign a limit order → `CreateOrderRequest` |
| `create_market_order_ob_request_payload()` | `tplus.utils.market_order` | Build and sign a market order → `CreateOrderRequest` |
| `create_replace_order_ob_request_payload()` | `tplus.utils.replace_order` | Build and sign a replace order → `ReplaceOrderRequestPayload` |
| `create_cancel_order_ob_request_payload()` | `tplus.utils.signing` | Build and sign a cancel order → `CancelOrderRequest` |

#### EVM Managers

| Class | Import | Purpose |
|---|---|---|
| `DepositManager` | `tplus.evm.managers.deposit` | On-chain deposit via `DepositVault.deposit()` |
| `SettlementManager` | `tplus.evm.managers.settle` | Settlement init, approval handling, on-chain execution |
| `SettlementApprovalHandler` | `tplus.evm.managers.settle` | WS approval listener; matches approvals to pending settlements by nonce |
| `SettlementInfo` | `tplus.evm.managers.settle` | Settlement state after init (asset_in/out, amount_in/out, expected_nonce) |
| `VaultOwner` | `tplus.evm.managers.vault` | Vault owner ops (domain separator, admin/settler/depositor registration) |

#### Key Model Types

**Order types:** `Order`, `CreateOrderRequest`, `CancelOrder`, `CancelOrderRequest`, `ReplaceOrderDetails`, `ReplaceOrderRequestPayload`, `OrderResponse`, `OrderOperationResponse`, `OperationStatus`

**Time in force:** `GTC(post_only)`, `GTD(post_only, timestamp_ns)`, `IOC(fill_or_kill)` — from `tplus.model.limit_order`

**Targeting:** `TradeTarget(account, is_spot)` — class methods: `main_account_spot_trade()`, `margin_account_spot_trade()`, `margin_account_margin_trade()`

**Triggers:** `TriggerAbove(price)`, `TriggerBelow(price)` — from `tplus.model.order_trigger`

**Order events:** `OrderCreatedEvent`, `OrderUpdatedEvent`, `OrderCancelledEvent`, `OrderReplacedEvent`, `OrderCreateFailedEvent`, `OrderReplaceFailedEvent`, `OrderCancelFailedEvent`

**Market data:** `Market`, `OrderBook`, `OrderBookDiff`, `PriceLevelUpdate`, `KlineUpdate`, `Trade`, `UserTrade`

**Trade events:** `TradePendingEvent`, `TradeConfirmedEvent`, `TradeRollbackedEvent`

**Account:** `UserInventory`, `UserAccount`, `Spot`, `Balance`, `MarginPosition`, `Margin`

**Settlement/withdrawal:** `TxSettlementRequest`, `BatchSettlementRequest`, `InnerSettlementRequest`, `InnerBatchSettlementRequest`, `WithdrawalRequest`, `InnerWithdrawalRequest`, `AmountPair` (from `tplus.utils.amount`)

**Identity:** `AssetIdentifier`, `ChainAddress`, `UserPublicKey`, `ChainID`

**Market order:** `MarketOrderDetails`, `MarketQuantity`, `MarketBaseQuantity`, `MarketQuoteQuantity`

See D12 for type definitions.

---

## Flagged for Review

### Still Open

| Component | Concern |
|---|---|
| `AdminClient` (`.admin`) | Confirm which methods are public-facing. |
| `deploy_dev()` / `get_dev_default_owner()` | Dev-only; exclude from public docs. |
| `insecure_ssl` / `TplusWsClient.local()` | Dev-only TLS bypass; exclude from public docs. |
| `create_market(asset_id)` | Likely admin-only; exclude if confirmed. |
| EIP-712 domain `version` mismatch | Python: `"1.0.0"`, Solidity: depends on `setDomainSeparator()`. D4. |
| `domain_separator` storage slot bug | Reads slot 1; `_domainSeparator` may be slot 2. D4. |
| Depositor allowlist | `setDepositorStatus` gates deposits; examples may fail for unapproved callers. |
| `from_local()` only | No production CE URL documented. |
| Trade stream coverage | No SDK methods for per-asset streams (`/trades/{asset_id}`, `/trades/events/{asset_id}`). |
| `setCredentialManager` delay bug | Delay condition inverted in contract. D4. |
| `UserTrade.fee` field | Not in source `UserTrade` model. |
| Module-level EVM singletons | `tplus.evm.contracts` exposes `registry`, `vault`, `credential_manager` singletons; determine if public-facing. |

### Resolved (Prior Passes)

| Component | Resolution |
|---|---|
| WS `/control` channel | User-facing; `use_ws_control=True` on `OrderBookClient`. |
| Settlement signature requirement | 1 admin EIP-712 signature per order (quorum for withdrawals only). D9 §2. |
| Withdrawal digest format | Non-EIP-712 digest, quorum of admin signatures. D4 §9.3, D9 §2. |

### Resolved (Prior Cycle This Pass)

| Component | Resolution |
|---|---|
| Python EIP-712 `Order` message | Fields present in `tplus/evm/eip712.py`. |
| `subscribe_*` method names | All WS methods are `stream_*`. Corrected. |
| `subscribe_account_stats` | No such method. Removed. |
| Stream method params | All stream methods take `AssetIdentifier`. Corrected. |
| REST path prefix | No `/v1/` prefix. Confirmed. |
| Trigger order helpers | `create_limit_order_ob_request_payload()` and `create_market_order_ob_request_payload()` accept `trigger`. Confirmed. |

### Resolved (This Pass)

| Component | Resolution |
|---|---|
| `UserInventory.is_mm` field | Added missing `is_mm: bool` field to §5 model docs. Confirmed in source. |
| `DepositManager` optional params | Added `vault`, `clearing_engine` optional params to §7 deposit example. |
| `SettlementManager` optional params | Added `clearing_engine`, `vault`, `settlement_vault` optional params to §7 settlement example. |
| `SettlementApprovalHandler` | Added WS-based approval streaming example to §7, added to EVM Managers table in §9. |
| `SettlementInfo` dataclass | Added to EVM Managers table in §9. |
| `KlineUpdate` timestamp fields | Added `open_timestamp_ns`, `close_timestamp_ns`, and datetime convenience properties to §6 example. |
| `OrderBookDiff.sequence_number` | Added to §6 depth streaming example. |
| Missing §5 query examples | Added `get_orderbook_snapshot`, `get_klines`, `get_market` examples. |
| `WithdrawalClient.get_queued()` | Added usage example to §7 withdrawal section. |
| `load_user()` no-name default | Added no-argument usage to §2. |
| `BaseClient.from_client()` | Documented client cloning method in §3 note. |
| `ReplaceOrderDetails.new_trigger` | Noted in §4. |
| `Trade` model fields | Added to §6 alongside `UserTrade` fields. |
| `OrderResponse` extra fields | Added field listing comment to §4 query example. |
| `SettlementClient` missing methods | Added `update_approved_settlers`, `get_approved_settlers` to §9 sub-client table. |
| `AmountPair` type | Added to §9 Key Model Types. |

---

## Changelog

- Prior passes: See git history.
- Pass 1 (Structure & Scope): Reorganized to 9-section target. Removed D4-scope content from §7. Removed D3-scope field tables from §5. Cross-referenced D2 for auth protocol. Added `subscribe_account_stats` example, EVM Managers table. Consolidated Flagged for Review.
- Pass 2 (Accuracy): Cross-verified against D2, D3, D4, D8, D9. Corrected auth model (defense-in-depth signing, aTLS, nonce rules, headers). Fixed settlement signatures (1 admin, not quorum). Added asset_id format, WS protocol details, trade event states, HTTP codes. Expanded Flagged for Review.
- Pass 3 (Prose & Conciseness): Cut redundancy and filler across all sections. Tightened narrative prose to fragments/bullets. Compressed table descriptions, source material references, Flagged for Review entries, and changelog. Consolidated install commands. No content added or facts changed.
- Pass 1 (Structure & Scope) [cycle 2]: Trimmed D2-scope auth protocol detail from §2 (nonce flow steps, nonce rules, aTLS explanation) — replaced with SDK-focused `client.authenticate()` usage and cross-ref. Removed raw endpoint paths from §4 and §4 cancel note (D2 scope). Condensed WS protocol detail in §6 (ping/pong/batch specifics → cross-ref D2). Trimmed withdrawal/settlement lifecycle detail from §7 (quorum mechanics, digest format → cross-ref D9/D4). Replaced HTTP error codes table in §8 with SDK-relevant summary and D2 cross-ref. Trimmed D3/D9-scope implementation detail from §9 sub-client table descriptions. All 9 target sections confirmed present and populated.
- Pass 2 (Accuracy) [cycle 2]: Verified all claims against tpluspy source code. §1: corrected deps (added websockets, cryptography, pydantic, pycryptodome, eth-utils; moved eth-pydantic-types to core; fixed EVM extras). §2: fixed UserManager API (generate/add, not save), encrypted keyfile storage, password-based loading, public_key property name. §3: corrected OrderBookClient constructor (user required, base_url keyword-only, use_ws_control param), ClearingEngineClient AUTH=False, added admin sub-client. §4: rewrote entirely — corrected method signatures (create_limit_order takes int quantity/price and AssetIdentifier, not strings and market names), time_in_force is GTC/GTD/IOC not TradeTarget, cancel_order takes (order_id, asset_id) not CancelOrder model, added replace_order/get_user_orders/get_open_orders_for_book/get_user_trades_for_asset. §5: corrected VaultClient (get/update, no get_user_inventory), AssetRegistryClient (get, not get_assets), DecimalClient (get takes lists), DepositClient (update, no get_deposit_status), UserInventory model structure. §6: renamed all subscribe_* to stream_* per source, removed non-existent subscribe_account_stats, corrected OrderEvent types (CREATED/UPDATED/CANCELED/REPLACED/*FAILED, not accepted/rejected/filled), corrected UserTrade fields (no fee field), added stream_user_trades deprecation note. §7: corrected DepositManager/SettlementManager constructors and method signatures, WithdrawalRequest model (inner/signature, create_signed class method), integer amounts. §8: corrected OperationStatus enum (Received/Rejected), async context manager. §9: comprehensive rewrite of all method tables matching source code. Flagged: resolved EIP-712 Order fields (now present in source), trigger order helpers (confirmed), method naming, path prefix.
- Pass 3 (Prose & Conciseness) [cycle 2]: Tightened narrative across all 9 sections — compressed dependency lists, auth flow, client descriptions, parameter tables, error handling, and Flagged entries. Standardized terminology with D12 (Orderbook, Bearer Token, CE abbreviation). No content added or facts changed.
- Pass 1 (Structure & Content Generation) [cycle 3]: Re-read all tpluspy source files + cross-reference Rust sources. Added missing content: §5 — `get_orderbook_snapshot`, `get_klines`, `get_market` examples; `UserInventory.is_mm` field. §6 — `KlineUpdate` timestamp fields/datetime properties; `OrderBookDiff.sequence_number`; `Trade` model fields. §7 — `DepositManager`/`SettlementManager` optional constructor params; `SettlementApprovalHandler` WS example; `WithdrawalClient.get_queued()` usage. §2 — `load_user()` no-arg default. §3 — `timeout` param, `from_client()` method. §4 — `ReplaceOrderDetails.new_trigger`, `protocol_version`, `OrderResponse` extra fields. §9 — `SettlementClient` missing methods, `SettlementApprovalHandler`/`SettlementInfo` in EVM Managers, `AmountPair` type. Flagged: module-level EVM singletons.
- Pass 2 (Accuracy) [cycle 3]: Read all source files (tpluspy package root, clients, clearing engine sub-clients, models, user management, order utils, EVM managers, setup.py, Rust ws.rs, domains/lib.rs). Verified all claims section by section. §1: added missing EVM extras deps (`ape-tokens`, `click`) from setup.py. §3: corrected OrderBookClient constructor — `timeout` is a BaseClient-only param not forwarded by OrderBookClient (always uses default 10.0s). All other claims verified correct: auth flow matches source, method signatures match, model fields match, WS paths match, CE sub-client methods match, EVM manager constructors match, key model types confirmed.
- Pass 3 (Prose & Conciseness) [cycle 3]: Tightened prose across all sections — removed filler words, compressed descriptions in tables, shortened notes and cross-references, converted verbose phrases to fragments. No content added or facts changed.
