from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from mistralai import Mistral
import requests
import os
import time
from datetime import datetime
import random

#########################
# MISTRAL IMPORT & SETUP
#########################

MISTRAL_API_KEY = os.environ.get(
    'MISTRAL_API_KEY')  # Must be set in environment
if not MISTRAL_API_KEY:
    print("Warning: MISTRAL_API_KEY not set")

model_name = ""  # 
mistral_client = Mistral(api_key=MISTRAL_API_KEY)

app = Flask(__name__)
CORS(app)  # Enable cross-origin requests

# Retrieve the Birdseye API key from environment variables (set in Replit secrets as BE_API)
BE_API = os.environ.get("BE_API")
if not BE_API:
    print("Error: BE_API not set in environment variables")

HEADERS = {
    "accept": "application/json",
    "x-chain": "solana",
    "X-API-KEY": BE_API
}


def format_token_amount(amount, decimals: int) -> float:
    """
    Converts a raw token amount (in the token's smallest unit) into a human-readable float.
    Ensures the amount is cast to float if it's a string.
    """
    try:
        amount = float(amount)
    except Exception:
        amount = 0.0
    if decimals is None or decimals < 0:
        decimals = 0
    return amount / (10**decimals)


def format_iso_timestamp(iso_str: str) -> str:
    """
    Parses an ISO8601 timestamp (e.g. '2025-02-01T22:08:53+00:00')
    and returns 'MM/DD/YYYY HH:MM:SS'. Falls back if parsing fails.
    """
    if not iso_str:
        return iso_str
    try:
        dt = datetime.fromisoformat(iso_str)
        return dt.strftime('%m/%d/%Y %H:%M:%S')
    except ValueError:
        return iso_str


def format_unix_timestamp(unix_ts: int) -> str:
    """
    Converts a Unix timestamp to 'MM/DD/YYYY HH:MM:SS' (UTC).
    """
    try:
        dt = datetime.utcfromtimestamp(unix_ts)
        return dt.strftime('%m/%d/%Y %H:%M:%S')
    except (OSError, ValueError, TypeError):
        return str(unix_ts)


def call_mistral_ai(json_data: dict) -> str:
    """
    Takes a dict of wallet analysis data, builds a humorous + slightly passive-aggressive
    prompt referencing the last 7 days, then calls Mistral AI for a comedic summary.

    Returns the AI-generated text or an error message if something goes wrong.
    """
    if not MISTRAL_API_KEY:
        return "Mistral is not configured properly. No API key found."

    # Turn the relevant data into a string or short summary if desired.
    # If the data is large, consider summarizing instead of passing raw JSON.
    # For brevity, let's just turn the dict into a short string:
    data_str = str(
        json_data
    )  # or use json.dumps() for a more standard JSON representation

    # Build a comedic, partially snarky prompt referencing the last 7 days.
    prompt = f"""
You are a slightly sarcastic, mildly passive-aggressive AI analyst specializing in Solana wallets.
All the following data reflects the user's wallet activity for the LAST 7 DAYS. Here's the JSON:

{data_str}

Your job: Provide a very short, witty, borderline sassy summary of this wallet's weekly performance.
Please:

1. Give a quick snapshot of the portfolio (any big tokens, total USD value).
2. Mention notable transactions or swaps (especially degenerate ones).
3. Highlight the user's overall profit or loss, lightly mocking big gains or painful losses.
4. Remind them about security (cold storage, not losing seed phrases, etc.) in a passive-aggressive way.
5. End with a quick disclaimer that you're not a financial advisor and if theyre not rich tell them to do better.

Make it entertaining, but also let them walk away with the key points. Keep it fairly short and direct.
"""

    try:
        chat_response = mistral_client.chat.complete(model=model_name,
                                                     messages=[{
                                                         "role":
                                                         "user",
                                                         "content":
                                                         prompt
                                                     }])
        # The Mistral client returns a response that typically has this structure
        # We pick out the assistant's final message:
        return chat_response.choices[0].message.content
    except Exception as e:
        return f"Error calling AI: {str(e)}"


@app.route('/analyze', methods=['POST'])
def analyze_endpoint():
    try:
        data = request.get_json()
        if not data or "wallet_address" not in data:
            return jsonify({
                "error":
                "Please provide a wallet_address in the JSON payload."
            }), 400

        wallet_address = data["wallet_address"].strip()
        if not wallet_address:
            return jsonify({"error": "Wallet address cannot be empty."}), 400

        short_address = wallet_address[-4:] if len(
            wallet_address) >= 4 else wallet_address

        # --- 1. Portfolio API ---
        portfolio_url = f"https://public-api.birdeye.so/v1/wallet/token_list?wallet={wallet_address}"
        try:
            portfolio_response = requests.get(portfolio_url, headers=HEADERS)
            portfolio_json = portfolio_response.json()
        except Exception as e:
            portfolio_json = {
                "error": "Error parsing portfolio response",
                "details": str(e),
                "success": False
            }

        # --- 2. Transactions API (latest 5) ---
        tx_url = f"https://public-api.birdeye.so/v1/wallet/tx_list?wallet={wallet_address}&limit=5"
        try:
            tx_response = requests.get(tx_url, headers=HEADERS)
            tx_json = tx_response.json()
        except Exception as e:
            tx_json = {
                "error": "Error parsing transaction response",
                "details": str(e),
                "success": False
            }

        # --- 3. Swap Trades API ---
        trades_url = (f"https://public-api.birdeye.so/trader/txs/seek_by_time?"
                      f"address={wallet_address}&offset=0&limit=5&tx_type=swap"
                      f"&before_time=0&after_time=0")
        try:
            trades_response = requests.get(trades_url, headers=HEADERS)
            trades_json = trades_response.json()
            print("Raw trades response:", trades_json)
        except Exception as e:
            trades_json = {
                "error": "Error parsing trades response",
                "details": str(e),
                "success": False
            }

        # --- Process & Format Transaction Data ---
        if tx_json.get("success"):
            solana_txs = tx_json.get("data", {}).get("solana", [])
            for tx in solana_txs:
                original_time_str = tx.get("blockTime", "")
                tx["formattedBlockTime"] = format_iso_timestamp(
                    original_time_str)
                balance_changes = tx.get("balanceChange", [])
                for bc in balance_changes:
                    raw_amount = bc.get("amount", 0)
                    decimals = bc.get("decimals", 0)
                    bc["uiAmount"] = format_token_amount(raw_amount, decimals)

        # --- Process & Format Trades Data ---
        if trades_json.get("success"):
            trade_items = trades_json.get("data", {}).get("items", [])
            for trade in trade_items:
                unix_time = trade.get("block_unix_time", 0)
                trade["formattedTime"] = format_unix_timestamp(unix_time)
                base = trade.get("base", {})
                if "amount" in base and "decimals" in base:
                    raw_amount_base = base["amount"]
                    decimals_base = base["decimals"]
                    base["ui_amount_computed"] = format_token_amount(
                        raw_amount_base, decimals_base)
                quote = trade.get("quote", {})
                if "amount" in quote and "decimals" in quote:
                    raw_amount_quote = quote["amount"]
                    decimals_quote = quote["decimals"]
                    quote["ui_amount_computed"] = format_token_amount(
                        raw_amount_quote, decimals_quote)

        # --- Compute Overall PNL from Swap Trades ---
        overall_pnl = 0.0
        pnl_by_token = {}
        if trades_json.get("success") and trades_json.get("data",
                                                          {}).get("items"):
            data_dict = trades_json.get("data", {})
            items_list = data_dict.get("items", [])
            if isinstance(items_list, list):
                for trade in items_list:
                    base = trade.get("base", {})
                    quote = trade.get("quote", {})

                    base_amount = base.get("ui_amount", 0.0)
                    base_price = base.get("nearest_price") or 0.0
                    if not base_amount:
                        raw_amount_base = base.get("amount", 0.0)
                        decimals_base = base.get("decimals", 0)
                        base_amount = format_token_amount(
                            raw_amount_base, decimals_base)
                    base_value = base_amount * base_price

                    quote_amount = abs(quote.get("ui_change_amount", 0.0))
                    if not quote_amount:
                        raw_amount_quote = quote.get("amount", 0.0)
                        decimals_quote = quote.get("decimals", 0)
                        quote_amount = abs(
                            format_token_amount(raw_amount_quote,
                                                decimals_quote))
                    quote_price = quote.get("price") or 0.0
                    quote_value = quote_amount * quote_price

                    trade_pnl = base_value - quote_value
                    overall_pnl += trade_pnl

                    token_symbol = base.get("symbol", "Unknown")
                    pnl_by_token[token_symbol] = pnl_by_token.get(
                        token_symbol, 0.0) + trade_pnl

        current_portfolio_value = 0.0
        if portfolio_json.get("success"):
            portfolio_data = portfolio_json.get("data", {})
            current_portfolio_value = portfolio_data.get("totalUsd", 0.0)

        pnl_percentage = (overall_pnl / current_portfolio_value *
                          100.0) if current_portfolio_value else 0.0

        # ---------------------------------------------------------------------
        # Build the primary conversational analysis sections
        # ---------------------------------------------------------------------
        intro_section = (
            f"Hello! I've completed an in-depth analysis of your Solana wallet ending in {short_address}.\n\n"
        )

        if portfolio_json.get("success"):
            portfolio_data = portfolio_json.get("data", {})
            total_usd = portfolio_data.get("totalUsd", 0.0)
            items = portfolio_data.get("items", [])
            portfolio_overview = (
                "Portfolio Overview:\n\n"
                f"- Total Portfolio Value (in USD): ${total_usd:,.2f}\n"
                f"- Number of Tokens Held: {len(items)}\n")
            if items:
                sorted_items = sorted(items,
                                      key=lambda x: x.get("valueUsd", 0.0),
                                      reverse=True)
                top_tokens = sorted_items[:3]
                portfolio_overview += "- Top 3 Tokens Held:\n"
                for token in top_tokens:
                    symbol = token.get("symbol", "Unknown")
                    value = token.get("valueUsd", 0.0)
                    market_cap = token.get("marketCapUsd", "N/A")
                    if isinstance(market_cap, (int, float)):
                        market_cap_str = f"${market_cap:,.2f}"
                    else:
                        market_cap_str = "N/A"
                    portfolio_overview += f"   - {symbol}: Current Value Held: ${value:,.2f}, Market Cap: {market_cap_str}\n"
            portfolio_overview += "\n"
        else:
            portfolio_overview = "Portfolio Overview:\n\nUnable to retrieve portfolio data.\n\n"

        if tx_json.get("success"):
            solana_txs = tx_json.get("data", {}).get("solana", [])
            if solana_txs:
                transactions_section = "Recent Trans


