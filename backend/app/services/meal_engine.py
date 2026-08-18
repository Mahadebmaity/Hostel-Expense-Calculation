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
    Computes complete mess financial sheet:
    - Total variable grocery expenses
    - Total fixed expenses
    - Total meal units consumed by each member
    - Dynamic meal rate
    - Member deposits and direct payments
    - Final net balance (Refund / Due)
    """
    members = db.query(GroupMember).filter(GroupMember.group_id == group.id).all()
    if not members:
        return {
            "total_expenses": 0.0,
            "total_variable_grocery": 0.0,
            "total_fixed_costs": 0.0,
            "total_meals": 0.0,
            "meal_rate": 0.0,
            "member_balances": []
        }
    
    num_members = len(members)

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

    # 1. Classify Expenses
    total_variable_grocery = 0.0
    total_fixed_costs = 0.0
    direct_paid_by_user = {m.user_id: 0.0 for m in members}
    custom_split_dues = {m.user_id: 0.0 for m in members}

    for exp in expenses:
        if exp.paid_by in direct_paid_by_user:
            direct_paid_by_user[exp.paid_by] += exp.amount

        if exp.is_fixed_cost:
            total_fixed_costs += exp.amount
        elif exp.split_type == "MEAL_BASED":
            total_variable_grocery += exp.amount
        else:
            # Custom split (e.g. Equal or exact splits for non-mess items)
            splits = db.query(ExpenseSplit).filter(ExpenseSplit.expense_id == exp.id).all()
            if splits:
                for sp in splits:
                    if sp.user_id in custom_split_dues:
                        custom_split_dues[sp.user_id] += sp.share_amount
            else:
                # Default equal split among all members
                equal_share = exp.amount / num_members
                for u_id in custom_split_dues:
                    custom_split_dues[u_id] += equal_share

    # 2. Compute Meals per user
    user_meals = {m.user_id: 0.0 for m in members}
    user_breakfast = {m.user_id: 0.0 for m in members}
    user_lunch = {m.user_id: 0.0 for m in members}
    user_dinner = {m.user_id: 0.0 for m in members}

    for ml in meals:
        if ml.user_id in user_meals:
            user_meals[ml.user_id] += ml.total_units
            user_breakfast[ml.user_id] += ml.breakfast_count
            user_lunch[ml.user_id] += ml.lunch_count
            user_dinner[ml.user_id] += ml.dinner_count

    total_meals = sum(user_meals.values())
    
    # 3. Dynamic Meal Rate
    meal_rate = round(total_variable_grocery / total_meals, 4) if total_meals > 0 else 0.0
    fixed_cost_per_member = round(total_fixed_costs / num_members, 2) if num_members > 0 else 0.0

    # 4. Account for settlements (Payer credited, Payee debited)
    settlement_adjustments = {m.user_id: 0.0 for m in members}
    for st in settlements:
        if st.payer_id in settlement_adjustments:
            settlement_adjustments[st.payer_id] += st.amount
        if st.payee_id in settlement_adjustments:
            settlement_adjustments[st.payee_id] -= st.amount

    # 5. Build Member Financial Sheet
    member_balances = []
    for m in members:
        user_info = db.query(User).filter(User.id == m.user_id).first()
        m_meals = user_meals[m.user_id]
        m_var_cost = round(m_meals * meal_rate, 2)
        m_fixed_cost = fixed_cost_per_member
        m_custom_cost = round(custom_split_dues[m.user_id], 2)
        
        total_cost_due = round(m_var_cost + m_fixed_cost + m_custom_cost, 2)
        total_paid_in = round(m.initial_deposit + direct_paid_by_user[m.user_id] + settlement_adjustments[m.user_id], 2)
        net_balance = round(total_paid_in - total_cost_due, 2)

        member_balances.append({
            "user_id": m.user_id,
            "name": user_info.name if user_info else "Unknown",
            "email": user_info.email if user_info else "",
            "upi_id": user_info.upi_id if user_info else None,
            "role": m.role,
            "deposit_paid": m.initial_deposit,
            "direct_expenses_paid": round(direct_paid_by_user[m.user_id], 2),
            "settlements_paid_or_received": round(settlement_adjustments[m.user_id], 2),
            "total_paid": total_paid_in,
            "breakfast_count": user_breakfast[m.user_id],
            "lunch_count": user_lunch[m.user_id],
            "dinner_count": user_dinner[m.user_id],
            "total_meal_units": round(m_meals, 2),
            "variable_cost": m_var_cost,
            "fixed_cost": m_fixed_cost,
            "custom_cost": m_custom_cost,
            "total_due": total_cost_due,
            "net_balance": net_balance,
            "status": "REFUND" if net_balance > 0 else ("DUE" if net_balance < 0 else "SETTLED")
        })

    total_expenses = round(total_variable_grocery + total_fixed_costs + sum(custom_split_dues.values()), 2)

    return {
        "group_id": group.id,
        "group_name": group.name,
        "group_type": group.group_type,
        "currency": group.currency,
        "total_expenses": total_expenses,
        "total_variable_grocery": round(total_variable_grocery, 2),
        "total_fixed_costs": round(total_fixed_costs, 2),
        "total_meals": round(total_meals, 2),
        "meal_rate": meal_rate,
        "fixed_cost_per_member": fixed_cost_per_member,
        "member_balances": member_balances
    }
