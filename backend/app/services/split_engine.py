from typing import List, Dict, Any

def simplify_debts(member_balances: List[Dict[str, Any]], currency: str = "INR") -> List[Dict[str, Any]]:
    """
    Minimum Cashflow Graph Greedy Algorithm.
    Converts a list of member net balances (where net_balance > 0 is creditor and net_balance < 0 is debtor)
    into the minimum possible number of direct peer-to-peer transactions (at most N-1 transactions).
    """
    # Separate into creditors and debtors
    # Creditors: Person to whom money is owed (net_balance > 0.01)
    # Debtors: Person who owes money (net_balance < -0.01)
    
    creditors = []
    debtors = []

    for mb in member_balances:
        bal = round(mb.get("net_balance", 0.0), 2)
        u_info = {
            "id": mb["user_id"],
            "name": mb["name"],
            "upi_id": mb.get("upi_id")
        }
        if bal > 0.01:
            creditors.append({"user": u_info, "amount": bal})
        elif bal < -0.01:
            debtors.append({"user": u_info, "amount": abs(bal)})

    # Sort descending to match largest debtor with largest creditor
    creditors.sort(key=lambda x: x["amount"], reverse=True)
    debtors.sort(key=lambda x: x["amount"], reverse=True)

    transactions = []
    i = 0  # debtors pointer
    j = 0  # creditors pointer

    while i < len(debtors) and j < len(creditors):
        debtor = debtors[i]
        creditor = creditors[j]

        # Settle the minimum of what debtor owes vs what creditor is owed
        settle_amt = min(debtor["amount"], creditor["amount"])
        settle_amt = round(settle_amt, 2)

        if settle_amt > 0.01:
            transactions.append({
                "payer_id": debtor["user"]["id"],
                "payer_name": debtor["user"]["name"],
                "payee_id": creditor["user"]["id"],
                "payee_name": creditor["user"]["name"],
                "payee_upi_id": creditor["user"]["upi_id"],
                "amount": settle_amt,
                "currency": currency
            })

        debtor["amount"] = round(debtor["amount"] - settle_amt, 2)
        creditor["amount"] = round(creditor["amount"] - settle_amt, 2)

        if debtor["amount"] < 0.01:
            i += 1
        if creditor["amount"] < 0.01:
            j += 1

    return transactions
