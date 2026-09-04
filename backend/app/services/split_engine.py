from typing import List, Dict, Any, Optional
from datetime import date
from sqlalchemy.orm import Session
from app.models.group import Group, GroupMember
from app.models.expense import Expense, ExpenseSplit
from app.models.settlement import Settlement

def distribute_pennies(total_amount: float, count: int) -> List[float]:
    """
    Distributes an amount across `count` participants down to the exact cent/paisa.
    E.g. 100.00 split 3 ways -> [33.34, 33.33, 33.33], sum = 100.00.
    """
    if count <= 0:
        return []
    total_cents = int(round(total_amount * 100))
    base_cents = total_cents // count
    remainder_cents = total_cents % count

    result = []
    for i in range(count):
        cents = base_cents + (1 if i < remainder_cents else 0)
        result.append(round(cents / 100.0, 2))
    return result

def distribute_percentage_pennies(total_amount: float, percentages: List[float]) -> List[float]:
    """
    Distributes an amount based on percentages, guaranteeing that sum(result) == total_amount down to 1 paisa/cent.
    E.g. 100.00 with [33.33, 33.33, 33.34] -> [33.33, 33.33, 33.34], sum = 100.00.
    """
    if not percentages:
        return []
    total_cents = int(round(total_amount * 100))
    allocated_cents = 0
    cents_list = []
    for pct in percentages:
        c = int(round(total_cents * (pct / 100.0)))
        cents_list.append(c)
        allocated_cents += c
    diff_cents = total_cents - allocated_cents
    if diff_cents != 0 and cents_list:
        cents_list[0] += diff_cents
    return [round(c / 100.0, 2) for c in cents_list]

def distribute_shares_pennies(total_amount: float, shares: List[float]) -> List[float]:
    """
    Distributes an amount proportionally based on weights/shares, guaranteeing that sum(result) == total_amount.
    """
    if not shares:
        return []
    total_shares = sum(shares)
    if total_shares <= 0:
        return [0.0 for _ in shares]
    total_cents = int(round(total_amount * 100))
    allocated_cents = 0
    cents_list = []
    for s in shares:
        c = int(round((total_cents * s) / total_shares))
        cents_list.append(c)
        allocated_cents += c
    diff_cents = total_cents - allocated_cents
    if diff_cents != 0 and cents_list:
        cents_list[0] += diff_cents
    return [round(c / 100.0, 2) for c in cents_list]

def normalize_exact_splits(total_amount: float, amounts: List[float]) -> List[float]:
    """
    Normalizes exact split amounts so sum(result) == total_amount down to 1 paisa/cent.
    If difference is within 1 cent (0.01), absorbs the rounding penny so sum == total_amount.
    """
    if not amounts:
        return []
    total_cents = int(round(total_amount * 100))
    cents_list = [int(round(a * 100)) for a in amounts]
    diff_cents = total_cents - sum(cents_list)
    if abs(diff_cents) <= 1 and cents_list:
        cents_list[0] += diff_cents
    return [round(c / 100.0, 2) for c in cents_list]

def simplify_debts(member_balances: List[Dict[str, Any]], currency: str = "INR") -> List[Dict[str, Any]]:
    """
    Minimum Cashflow Graph Greedy Algorithm.
    Converts a list of member net balances (where net_balance > 0 is creditor and net_balance < 0 is debtor)
    into the minimum possible number of direct peer-to-peer transactions (at most N-1 transactions).
    """
    creditors = []
    debtors = []

    for mb in member_balances:
        bal = round(mb.get("net_balance", 0.0), 2)
        u_info = {
            "id": mb.get("member_id") or mb.get("user_id") or "member",
            "name": mb.get("name", "Member"),
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

def calculate_common_balances(
    db: Session,
    group: Group,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
) -> Dict[str, Any]:
    """
    Computes common expense calculations (Flatmates, Tour & Travel, Personal Groups):
    - Net Balance = Total Paid - Total Owed
    - Total Paid = Direct Expenses Paid + Initial Deposit + Settlements Paid
    - Total Owed = Member's exact share of expenses + Settlements Received
    - Conservation of cash: sum of net balances == 0
    """
    members = db.query(GroupMember).filter(GroupMember.group_id == group.id).all()
    if not members:
        return {
            "group_id": group.id,
            "group_name": group.name,
            "group_type": group.group_type,
            "currency": group.currency,
            "total_expenses": 0.0,
            "total_establishment": 0.0,
            "establishment_per_head": 0.0,
            "total_meal_expenses": 0.0,
            "guest_deduction_total": 0.0,
            "net_meal_pool": 0.0,
            "total_meals": 0.0,
            "meal_rate": 0.0,
            "total_collected": 0.0,
            "total_due": 0.0,
            "total_refund": 0.0,
            "establishment_breakdown": [],
            "meal_pool_breakdown": [],
            "member_balances": []
        }

    num_members = len(members)
    member_map = {m.id: m for m in members}
    user_to_member = {m.user_id: m for m in members if m.user_id}

    # Fetch expenses with optional date filter
    exp_query = db.query(Expense).filter(Expense.group_id == group.id)
    if start_date:
        exp_query = exp_query.filter(Expense.expense_date >= start_date)
    if end_date:
        exp_query = exp_query.filter(Expense.expense_date <= end_date)
    expenses = exp_query.all()

    # Fetch completed settlements
    settle_query = db.query(Settlement).filter(
        Settlement.group_id == group.id,
        Settlement.status == "COMPLETED"
    )
    if start_date:
        settle_query = settle_query.filter(Settlement.settled_date >= start_date)
    if end_date:
        settle_query = settle_query.filter(Settlement.settled_date <= end_date)
    settlements = settle_query.all()

    # Financial tracking per member
    direct_paid_by_member = {m.id: 0.0 for m in members}
    owed_by_member = {m.id: 0.0 for m in members}
    settlements_paid = {m.id: 0.0 for m in members}
    settlements_received = {m.id: 0.0 for m in members}

    fixed_categories = {
        "RENT", "WIFI", "ELECTRICITY", "MAID", "MAINTENANCE", "GAS", "WATER",
        "ESTABLISHMENT", "HOTEL", "ROOM", "FLAT_RENT"
    }

    establishment_items = []
    meal_pool_items = []
    total_establishment = 0.0
    total_meal_expenses = 0.0

    member_establishment_share = {m.id: 0.0 for m in members}
    member_grocery_share = {m.id: 0.0 for m in members}

    total_expense_sum = 0.0

    for exp in expenses:
        total_expense_sum += exp.amount

        # 1. Attribute who paid
        payer_mid = None
        if exp.paid_by_member_id and exp.paid_by_member_id in member_map:
            payer_mid = exp.paid_by_member_id
        elif exp.paid_by and exp.paid_by in user_to_member:
            payer_mid = user_to_member[exp.paid_by].id

        if payer_mid:
            direct_paid_by_member[payer_mid] += exp.amount

        # Check if Fixed / Establishment vs Shared / Groceries
        cat_clean = (exp.category or "").strip().upper()
        is_fixed = (exp.is_fixed_cost is True) or (exp.is_fixed_cost is None and cat_clean in fixed_categories)

        payer_title = member_map[payer_mid].member_name if payer_mid else ("Mess Fund" if group.group_type == "MESS" else "Group Fund")
        item_dict = {
            "id": exp.id,
            "title": exp.title,
            "amount": exp.amount,
            "category": exp.category,
            "date": str(exp.expense_date),
            "payer_name": payer_title
        }

        if is_fixed:
            total_establishment += exp.amount
            establishment_items.append(item_dict)
        else:
            total_meal_expenses += exp.amount
            meal_pool_items.append(item_dict)

        # 2. Attribute who owes (participants)
        splits = db.query(ExpenseSplit).filter(ExpenseSplit.expense_id == exp.id).all()
        if splits:
            for sp in splits:
                target_mid = sp.member_id or (user_to_member[sp.user_id].id if sp.user_id in user_to_member else None)
                if target_mid and target_mid in owed_by_member:
                    owed_by_member[target_mid] += sp.share_amount
                    if is_fixed:
                        member_establishment_share[target_mid] += sp.share_amount
                    else:
                        member_grocery_share[target_mid] += sp.share_amount
        else:
            # If no explicit split rows exist, divide equally among all members with exact penny distribution
            shares = distribute_pennies(exp.amount, num_members)
            for idx, m in enumerate(members):
                owed_by_member[m.id] += shares[idx]
                if is_fixed:
                    member_establishment_share[m.id] += shares[idx]
                else:
                    member_grocery_share[m.id] += shares[idx]

    # Process settlements:
    # A settlement is payer paying payee:
    # Payer's effective paid amount increases (they paid money)
    # Payee's effective owed amount increases (they received money, reducing what others owe them)
    for st in settlements:
        p_mid = st.payer_member_id or (user_to_member[st.payer_id].id if st.payer_id in user_to_member else None)
        pe_mid = st.payee_member_id or (user_to_member[st.payee_id].id if st.payee_id in user_to_member else None)

        if p_mid and p_mid in settlements_paid and p_mid != pe_mid:
            settlements_paid[p_mid] += st.amount
        if pe_mid and pe_mid in settlements_received and p_mid != pe_mid:
            settlements_received[pe_mid] += st.amount

    member_balances = []
    total_due_pool = 0.0
    total_refund_pool = 0.0
    total_collected_pool = 0.0

    for idx, m in enumerate(members, start=1):
        m_paid = round(m.initial_deposit + direct_paid_by_member[m.id] + settlements_paid[m.id], 2)
        m_owed = round(owed_by_member[m.id] + settlements_received[m.id], 2)

        # Core formula: Net Balance = Total Paid - Total Owed
        net_balance = round(m_paid - m_owed, 2)

        total_collected_pool += m_paid
        if net_balance < 0:
            total_due_pool += abs(net_balance)
        else:
            total_refund_pool += net_balance

        member_balances.append({
            "serial_no": idx,
            "member_id": m.id,
            "user_id": m.user_id,
            "name": m.member_name,
            "email": m.member_email,
            "phone": m.phone or "",
            "upi_id": m.member_upi_id,
            "is_virtual": m.is_virtual == "true" or m.user_id is None,
            "role": m.role,
            "initial_deposit": m.initial_deposit,
            "deposit_paid": m.initial_deposit,
            "advance_payment": m.initial_deposit,
            "marketing_amount": 0.0,
            "marketing_days": 0.0,
            "direct_expenses_paid": round(direct_paid_by_member[m.id], 2),
            "settlements_adjustment": round(settlements_paid[m.id] - settlements_received[m.id], 2),
            "total_paid": m_paid,
            "total_owed": m_owed,
            "breakfast_count": 0.0,
            "lunch_count": 0.0,
            "dinner_count": 0.0,
            "total_meal_units": 0.0,
            "meal_cost": round(member_grocery_share[m.id], 2),
            "establishment_cost": round(member_establishment_share[m.id], 2),
            "bills_paid": round(direct_paid_by_member[m.id], 2),
            "guest_meal_count": 0.0,
            "guest_cost": 0.0,
            "guest_breakdown": [],
            "custom_cost": m_owed,
            "total_due": m_owed,
            "net_balance": net_balance,
            "due_amount": abs(net_balance) if net_balance < 0 else 0.0,
            "refund_amount": net_balance if net_balance > 0 else 0.0,
            "status": "REFUND" if net_balance > 0 else ("DUE" if net_balance < 0 else "SETTLED"),
            "formula_display": f"Paid {m_paid:.2f} - Owed {m_owed:.2f} = {net_balance:+.2f}"
        })

    # Tour / Travel Plan Budget calculations
    trip_budget = 0.0
    if group.settings and isinstance(group.settings, dict):
        trip_budget = float(group.settings.get("trip_budget") or group.settings.get("budget") or 0.0)

    total_advance_deposits = sum(m.initial_deposit or 0.0 for m in members)
    if trip_budget <= 0.0 and total_advance_deposits > 0:
        trip_budget = round(total_advance_deposits, 2)

    remaining_budget = round(trip_budget - total_expense_sum, 2) if trip_budget > 0 else 0.0

    return {
        "group_id": group.id,
        "group_name": group.name,
        "group_type": group.group_type,
        "currency": group.currency,
        "total_trip_expense": round(total_expense_sum, 2),
        "total_expenses": round(total_expense_sum, 2),
        "trip_budget": round(trip_budget, 2),
        "remaining_budget": round(remaining_budget, 2),
        "total_advance_deposits": round(total_advance_deposits, 2),
        "total_establishment": round(total_establishment, 2),
        "establishment_per_head": round(total_establishment / num_members, 2) if num_members > 0 else 0.0,
        "total_meal_expenses": round(total_meal_expenses, 2),
        "guest_deduction_total": 0.0,
        "net_meal_pool": 0.0,
        "total_meals": 0.0,
        "meal_rate": 0.0,
        "total_collected": round(total_collected_pool, 2),
        "total_due": round(total_due_pool, 2),
        "total_refund": round(total_refund_pool, 2),
        "establishment_breakdown": establishment_items,
        "meal_pool_breakdown": meal_pool_items,
        "member_balances": member_balances
    }

