from typing import Dict, List, Any, Optional
from datetime import date
from sqlalchemy.orm import Session
from app.models.group import Group, GroupMember
from app.models.expense import Expense, ExpenseSplit
from app.models.meal import MealAttendance
from app.models.settlement import Settlement
from app.models.user import User

def compute_meal_units(
    breakfast: float,
    lunch: float,
    dinner: float,
    settings: Optional[Dict[str, Any]] = None
) -> float:
    """Calculates weighted meal units based on mess settings."""
    if not settings:
        settings = {}
    w_b = float(settings.get("breakfast_weight", 0.5))
    w_l = float(settings.get("lunch_weight", 1.0))
    w_d = float(settings.get("dinner_weight", 1.0))
    return round((breakfast * w_b) + (lunch * w_l) + (dinner * w_d), 2)

def calculate_mess_balances(
    db: Session,
    group: Group,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
) -> Dict[str, Any]:
    """
    Computes complete mess financial sheet matching traditional hostel/mess khatabook:
    - Establishment Cost breakdown (Fixed per candidate)
    - Meal Charge pool breakdown (Bazar, Potato, Rice, Grocery)
    - Guest Meal revenue deduction
    - Dynamic Meal Rate = (Meal Pool - Guest Revenue) / Total Member Meals
    - Member Payments (Advance Deposit + Bazar Marketing done)
    - Member Score Board with exact formula: (Meals × Rate) + Est + Guest - Paid = Due / Refund
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

    # Fetch meal attendances
    meal_query = db.query(MealAttendance).filter(MealAttendance.group_id == group.id)
    if start_date:
        meal_query = meal_query.filter(MealAttendance.record_date >= start_date)
    if end_date:
        meal_query = meal_query.filter(MealAttendance.record_date <= end_date)
    meals = meal_query.all()

    # Fetch settlements (completed payments between members)
    settlements = db.query(Settlement).filter(
        Settlement.group_id == group.id,
        Settlement.status == "COMPLETED"
    ).all()

    # 1. Classify Expenses & Track Direct Payments
    establishment_items = []
    meal_pool_items = []
    custom_split_items = []
    
    total_establishment = 0.0
    total_meal_expenses = 0.0
    
    direct_paid_by_member = {m.id: 0.0 for m in members}
    custom_split_dues = {m.id: 0.0 for m in members}

    # Common Establishment category keywords
    establishment_cats = {
        "MASI", "COOK", "GAS", "EGG", "MEAT", "PAPER", "NEWSPAPER", "ELECTRICITY",
        "RENT", "MAINTENANCE", "CLEANING", "ESTABLISHMENT", "ESTABLISHMENT_OTHER",
        "OTHER", "OTHER_CHARGES"
    }

    for exp in expenses:
        # Determine who paid
        payer_member_id = None
        if exp.paid_by_member_id and exp.paid_by_member_id in member_map:
            payer_member_id = exp.paid_by_member_id
        elif exp.paid_by and exp.paid_by in user_to_member:
            payer_member_id = user_to_member[exp.paid_by].id
        
        if payer_member_id:
            direct_paid_by_member[payer_member_id] += exp.amount

        # Check if Establishment / Fixed Cost:
        # 1. If exp.is_fixed_cost is explicitly True -> Establishment (Fixed per candidate)
        # 2. If exp.is_fixed_cost is explicitly False -> Meal Pool (Divided by meal count)
        # 3. Fallback to category keyword matching if is_fixed_cost is None
        if exp.is_fixed_cost is True:
            is_establishment = True
        elif exp.is_fixed_cost is False:
            is_establishment = False
        else:
            cat_clean = exp.category.strip().upper() if exp.category else ""
            is_establishment = bool(cat_clean in establishment_cats)

        if is_establishment:
            total_establishment += exp.amount
            establishment_items.append({
                "id": exp.id,
                "title": exp.title,
                "amount": exp.amount,
                "category": exp.category,
                "date": str(exp.expense_date),
                "payer_name": member_map[payer_member_id].member_name if payer_member_id else "Group Fund"
            })
        else:
            # Check if this expense has explicit participant splits
            splits = db.query(ExpenseSplit).filter(ExpenseSplit.expense_id == exp.id).all()
            if splits:
                for sp in splits:
                    target_mid = sp.member_id or (user_to_member[sp.user_id].id if sp.user_id in user_to_member else None)
                    if target_mid and target_mid in custom_split_dues:
                        custom_split_dues[target_mid] += sp.share_amount

                custom_split_items.append({
                    "id": exp.id,
                    "title": exp.title,
                    "amount": exp.amount,
                    "category": exp.category,
                    "date": str(exp.expense_date)
                })
            elif exp.split_type == "MEAL_BASED" or not exp.split_type:
                total_meal_expenses += exp.amount
                meal_pool_items.append({
                    "id": exp.id,
                    "title": exp.title,
                    "amount": exp.amount,
                    "category": exp.category,
                    "date": str(exp.expense_date),
                    "payer_name": member_map[payer_member_id].member_name if payer_member_id else "Group Fund"
                })
            else:
                equal_share = exp.amount / num_members
                for m_id in custom_split_dues:
                    custom_split_dues[m_id] += equal_share
                
                custom_split_items.append({
                    "id": exp.id,
                    "title": exp.title,
                    "amount": exp.amount,
                    "category": exp.category,
                    "date": str(exp.expense_date)
                })

    # Add member individual marketing contributions to meal pool
    for m in members:
        mkt_amt = getattr(m, 'marketing_amount', 0.0) or 0.0
        mkt_days = getattr(m, 'marketing_days', 0.0) or 0.0
        if mkt_amt > 0:
            total_meal_expenses += mkt_amt
            meal_pool_items.append({
                "id": f"mkt_{m.id}",
                "title": f"{m.member_name} - Sabji & Fish Marketing ({mkt_days:.0f} days)",
                "amount": mkt_amt,
                "category": "MARKETING",
                "date": str(date.today()),
                "payer_name": m.member_name
            })

    # 2. Compute Regular Meals & Guest Meals per member
    member_meals = {m.id: 0.0 for m in members}
    member_breakfast = {m.id: 0.0 for m in members}
    member_lunch = {m.id: 0.0 for m in members}
    member_dinner = {m.id: 0.0 for m in members}
    
    member_guest_meals = {m.id: 0.0 for m in members}
    member_guest_charge = {m.id: 0.0 for m in members}
    member_guest_details = {m.id: [] for m in members}

    guest_rates = group.settings.get("guest_rates", {"veg": 40.0, "fish": 50.0, "meat": 75.0, "egg": 35.0}) if group.settings else {"veg": 40.0, "fish": 50.0, "meat": 75.0, "egg": 35.0}

    for ml in meals:
        target_mid = ml.member_id or (user_to_member[ml.user_id].id if ml.user_id in user_to_member else None)
        if not target_mid or target_mid not in member_map:
            continue

        member_meals[target_mid] += ml.total_units or 0.0
        member_breakfast[target_mid] += ml.breakfast_count or 0.0
        member_lunch[target_mid] += ml.lunch_count or 0.0
        member_dinner[target_mid] += ml.dinner_count or 0.0

        # Guest meal calculation
        g_veg = ml.guest_veg_count or 0.0
        g_fish = ml.guest_fish_count or 0.0
        g_meat = ml.guest_meat_count or 0.0
        g_egg = getattr(ml, "guest_egg_count", 0.0) or 0.0
        g_charge = ml.guest_charge or 0.0

        if g_charge == 0.0 and (g_veg > 0 or g_fish > 0 or g_meat > 0 or g_egg > 0):
            g_charge = (g_veg * float(guest_rates.get("veg", 40.0))) + \
                       (g_fish * float(guest_rates.get("fish", 50.0))) + \
                       (g_meat * float(guest_rates.get("meat", 75.0))) + \
                       (g_egg * float(guest_rates.get("egg", 35.0)))

        if g_charge > 0 or (g_veg + g_fish + g_meat + g_egg) > 0:
            member_guest_meals[target_mid] += (g_veg + g_fish + g_meat + g_egg)
            member_guest_charge[target_mid] += g_charge
            member_guest_details[target_mid].append({
                "date": str(ml.record_date),
                "veg": g_veg,
                "fish": g_fish,
                "meat": g_meat,
                "egg": g_egg,
                "charge": g_charge
            })

    total_member_meals = sum(member_meals.values())
    total_guest_revenue = sum(member_guest_charge.values())
    
    # 3. Dynamic Calculation
    # Net Meal Pool = Total Meal Expenses - Guest Meal Charges
    net_meal_pool = max(0.0, total_meal_expenses - total_guest_revenue)
    
    # Meal Rate = Net Meal Pool / Total Meals
    meal_rate = round(net_meal_pool / total_member_meals, 4) if total_member_meals > 0 else 0.0
    establishment_per_head = round(total_establishment / num_members, 2) if num_members > 0 else 0.0

    # 4. Account for settlements (Payer credited, Payee debited)
    settlement_adjustments = {m.id: 0.0 for m in members}
    for st in settlements:
        payer_mid = st.payer_member_id or (user_to_member[st.payer_id].id if st.payer_id in user_to_member else None)
        payee_mid = st.payee_member_id or (user_to_member[st.payee_id].id if st.payee_id in user_to_member else None)

        if payer_mid and payer_mid in settlement_adjustments:
            settlement_adjustments[payer_mid] += st.amount
        if payee_mid and payee_mid in settlement_adjustments:
            settlement_adjustments[payee_mid] -= st.amount

    # 5. Build Member Score Board Financial Sheet
    member_balances = []
    total_due_pool = 0.0
    total_refund_pool = 0.0
    total_collected_pool = 0.0

    for idx, m in enumerate(members, start=1):
        m_meals = member_meals.get(m.id, 0.0)
        m_meal_cost = round(m_meals * meal_rate, 2)
        m_est_cost = establishment_per_head
        m_guest_cost = round(member_guest_charge.get(m.id, 0.0), 2)
        m_custom_cost = round(custom_split_dues.get(m.id, 0.0), 2)
        m_prev_bal = round(getattr(m, 'previous_balance', 0.0) or 0.0, 2)
        m_mkt_amt = getattr(m, 'marketing_amount', 0.0) or 0.0
        m_mkt_days = getattr(m, 'marketing_days', 0.0) or 0.0
        advance_payment = round(m.initial_deposit or 0.0, 2)
        direct_paid = round(direct_paid_by_member.get(m.id, 0.0), 2)
        settlement_adj = round(settlement_adjustments.get(m.id, 0.0), 2)

        # Total Bill for Candidate = (Meals * Meal Rate) + Establishment + Guest Charge + Custom Splits + Previous Balance
        total_candidate_bill = round(m_meal_cost + m_est_cost + m_guest_cost + m_custom_cost + m_prev_bal, 2)
        
        # Total Paid = Advance Deposit + Marketing Amount + Direct Bazar/Marketing paid + Settlements
        total_paid_in = round(advance_payment + m_mkt_amt + direct_paid + settlement_adj, 2)
        total_collected_pool += total_paid_in

        # Net Balance = Paid - Bill
        # If > 0: Refund (Manager returns to member)
        # If < 0: Due (Member owes manager / Final Payable Amount)
        net_balance = round(total_paid_in - total_candidate_bill, 2)
        final_payable_amount = round(abs(net_balance), 2) if net_balance < 0 else 0.0
        refund_amount = round(net_balance, 2) if net_balance > 0 else 0.0

        if net_balance < 0:
            total_due_pool += final_payable_amount
        else:
            total_refund_pool += refund_amount

        # Formula text for display (like May Score Board notebook)
        formula_str = f"({meal_rate:.2f} × {m_meals:.1f}) + {m_est_cost:.2f}"
        if m_prev_bal != 0:
            formula_str += f" + {m_prev_bal:.0f} (Prev)"
        if m_guest_cost > 0:
            formula_str += f" + {m_guest_cost:.0f} (Guest)"
        if m_custom_cost > 0:
            formula_str += f" + {m_custom_cost:.0f} (Custom)"
        formula_str += f" = {total_candidate_bill:.0f} - {total_paid_in:.0f} = {abs(net_balance):.0f}"

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
            "initial_deposit": advance_payment,
            "advance_payment": advance_payment,
            "previous_balance": m_prev_bal,
            "marketing_amount": m_mkt_amt,
            "marketing_days": m_mkt_days,
            "direct_expenses_paid": direct_paid,
            "settlements_adjustment": settlement_adj,
            "amount_already_paid": total_paid_in,
            "total_paid": total_paid_in,
            "breakfast_count": member_breakfast.get(m.id, 0.0),
            "lunch_count": member_lunch.get(m.id, 0.0),
            "dinner_count": member_dinner.get(m.id, 0.0),
            "individual_meal_count": round(m_meals, 2),
            "total_meal_units": round(m_meals, 2),
            "individual_food_cost": m_meal_cost,
            "meal_cost": m_meal_cost,
            "other_charges": m_est_cost,
            "establishment_cost": m_est_cost,
            "guest_meal_count": member_guest_meals.get(m.id, 0.0),
            "guest_cost": m_guest_cost,
            "guest_breakdown": member_guest_details.get(m.id, []),
            "custom_cost": m_custom_cost,
            "total_due": total_candidate_bill,
            "net_balance": net_balance,
            "final_payable_amount": final_payable_amount,
            "due_amount": final_payable_amount,
            "refund_amount": refund_amount,
            "status": "REFUND" if net_balance > 0 else ("DUE" if net_balance < 0 else "SETTLED"),
            "formula_display": formula_str
        })

    total_gross_expenses = round(total_establishment + total_meal_expenses + sum(custom_split_dues.values()), 2)

    return {
        "group_id": group.id,
        "group_name": group.name,
        "group_type": group.group_type,
        "currency": group.currency,
        "total_mess_expense": total_gross_expenses,
        "total_expenses": total_gross_expenses,
        "total_establishment": round(total_establishment, 2),
        "other_charges_total": round(total_establishment, 2),
        "establishment_per_head": establishment_per_head,
        "other_charges_per_head": establishment_per_head,
        "total_meal_expenses": round(total_meal_expenses, 2),
        "guest_deduction_total": round(total_guest_revenue, 2),
        "net_meal_pool": round(net_meal_pool, 2),
        "total_meals": round(total_member_meals, 2),
        "meal_rate": meal_rate,
        "total_collected": round(total_collected_pool, 2),
        "total_due": round(total_due_pool, 2),
        "total_refund": round(total_refund_pool, 2),
        "establishment_breakdown": establishment_items,
        "meal_pool_breakdown": meal_pool_items,
        "custom_split_breakdown": custom_split_items,
        "member_balances": member_balances
    }
