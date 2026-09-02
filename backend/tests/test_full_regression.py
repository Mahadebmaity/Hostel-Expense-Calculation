import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.core.security import create_access_token, get_password_hash
from app.models.user import User
from app.models.group import Group, GroupMember
from app.models.expense import Expense, ExpenseSplit
from app.models.meal import MealAttendance
from app.models.settlement import Settlement
from datetime import date

client = TestClient(app)

@pytest.fixture
def regression_env():
    """Sets up a clean environment with 4 users for comprehensive regression testing."""
    db = SessionLocal()
    # Clean up any residual regression groups
    old_groups = db.query(Group).filter(Group.name.like("RegTest_%")).all()
    for g in old_groups:
        db.delete(g)
    db.commit()

    users = []
    headers_list = []
    for name, email in [("User One", "user1@regtest.com"), ("User Two", "user2@regtest.com"), 
                        ("User Three", "user3@regtest.com"), ("User Four", "user4@regtest.com")]:
        u = db.query(User).filter(User.email == email).first()
        if not u:
            u = User(name=name, email=email, password_hash=get_password_hash("password123"), is_admin=False)
            db.add(u)
            db.commit()
            db.refresh(u)
        users.append(u)
        token = create_access_token(data={"sub": u.id})
        headers_list.append({"Authorization": f"Bearer {token}"})

    yield {
        "db": db,
        "users": users,
        "headers": headers_list[0],
        "all_headers": headers_list
    }

    # Teardown
    residual = db.query(Group).filter(Group.name.like("RegTest_%")).all()
    for g in residual:
        db.delete(g)
    db.commit()
    db.close()

# ==============================================================================
# SECTION 1: COMMON EXPENSE CALCULATIONS & ENGINE REGRESSION
# ==============================================================================

def test_reg_common_equal_and_penny_rounding(regression_env):
    """Regression: Equal split, decimal amounts, remainder penny distribution (e.g. ₹100/3)."""
    headers = regression_env["headers"]
    u1, u2, u3, u4 = regression_env["users"]

    res = client.post("/api/v1/groups/", json={
        "name": "RegTest_Common_Equal",
        "group_type": "FLATMATES",
        "currency": "INR"
    }, headers=headers)
    assert res.status_code == 201
    group_id = res.json()["id"]

    for u in [u2, u3]:
        client.post(f"/api/v1/groups/{group_id}/members", json={"email": u.email, "name": u.name, "role": "MEMBER"}, headers=headers)

    # ₹100 / 3 = ₹33.34 + ₹33.33 + ₹33.33 = ₹100.00 exactly
    res_exp = client.post(f"/api/v1/expenses/?group_id={group_id}", json={
        "title": "₹100 Divided by 3",
        "amount": 100.0,
        "category": "GROCERY",
        "split_type": "EQUAL"
    }, headers=headers)
    assert res_exp.status_code == 201
    splits = res_exp.json()["splits"]
    assert len(splits) == 3
    assert sum(s["share_amount"] for s in splits) == 100.00
    shares = sorted([s["share_amount"] for s in splits])
    assert shares == [33.33, 33.33, 33.34]

def test_reg_common_custom_split(regression_env):
    """Regression: Custom exact split matching and mismatch prevention."""
    headers = regression_env["headers"]
    u1, u2 = regression_env["users"][:2]

    res = client.post("/api/v1/groups/", json={
        "name": "RegTest_Common_Custom",
        "group_type": "FLATMATES"
    }, headers=headers)
    group_id = res.json()["id"]
    client.post(f"/api/v1/groups/{group_id}/members", json={"email": u2.email, "name": u2.name, "role": "MEMBER"}, headers=headers)
    members = client.get(f"/api/v1/groups/{group_id}", headers=headers).json()["members"]
    m1_id = next(m["id"] for m in members if m["user_id"] == u1.id)
    m2_id = next(m["id"] for m in members if m["user_id"] == u2.id)

    # Valid exact split: ₹600 + ₹400 = ₹1,000
    res_ok = client.post(f"/api/v1/expenses/?group_id={group_id}", json={
        "title": "Custom Exact Split",
        "amount": 1000.0,
        "category": "GROCERY",
        "split_type": "EXACT",
        "splits": [{"member_id": m1_id, "share_amount": 600.0}, {"member_id": m2_id, "share_amount": 400.0}]
    }, headers=headers)
    assert res_ok.status_code == 201
    assert sum(s["share_amount"] for s in res_ok.json()["splits"]) == 1000.00

def test_reg_common_percentage_split(regression_env):
    """Regression: Percentage split exact 100% allocation without penny leakage."""
    headers = regression_env["headers"]
    u1, u2, u3 = regression_env["users"][:3]

    res = client.post("/api/v1/groups/", json={
        "name": "RegTest_Common_Pct",
        "group_type": "FLATMATES"
    }, headers=headers)
    group_id = res.json()["id"]
    for u in [u2, u3]:
        client.post(f"/api/v1/groups/{group_id}/members", json={"email": u.email, "name": u.name, "role": "MEMBER"}, headers=headers)
    members = client.get(f"/api/v1/groups/{group_id}", headers=headers).json()["members"]

    # ₹1000 with 33.33% / 33.33% / 33.34%
    res_pct = client.post(f"/api/v1/expenses/?group_id={group_id}", json={
        "title": "Percentage Split ₹1000",
        "amount": 1000.0,
        "category": "WIFI",
        "split_type": "PERCENTAGE",
        "splits": [
            {"member_id": members[0]["id"], "percentage": 33.33},
            {"member_id": members[1]["id"], "percentage": 33.33},
            {"member_id": members[2]["id"], "percentage": 33.34}
        ]
    }, headers=headers)
    assert res_pct.status_code == 201
    splits = res_pct.json()["splits"]
    assert round(sum(s["share_amount"] for s in splits), 2) == 1000.00

def test_reg_common_edit_and_delete_expense(regression_env):
    """Regression: Editing and deleting expense updates balances and splits dynamically."""
    headers = regression_env["headers"]
    u1, u2 = regression_env["users"][:2]

    res = client.post("/api/v1/groups/", json={"name": "RegTest_Edit_Del", "group_type": "PERSONAL"}, headers=headers)
    group_id = res.json()["id"]
    client.post(f"/api/v1/groups/{group_id}/members", json={"email": u2.email, "name": u2.name, "role": "MEMBER"}, headers=headers)

    # 1. Create ₹500 expense (₹250 each)
    res_exp = client.post(f"/api/v1/expenses/?group_id={group_id}", json={
        "title": "Initial Dinner",
        "amount": 500.0,
        "split_type": "EQUAL",
        "category": "FOOD"
    }, headers=headers)
    exp_id = res_exp.json()["id"]

    bal1 = client.get(f"/api/v1/groups/{group_id}/balances", headers=headers).json()
    b1_u2 = next(m for m in bal1["member_balances"] if m["user_id"] == u2.id)
    assert b1_u2["net_balance"] == -250.00

    # 2. Edit expense to ₹800 (₹400 each)
    res_put = client.put(f"/api/v1/expenses/{exp_id}", json={
        "title": "Revised Dinner Bill",
        "amount": 800.0,
        "split_type": "EQUAL",
        "category": "FOOD"
    }, headers=headers)
    assert res_put.status_code == 200

    bal2 = client.get(f"/api/v1/groups/{group_id}/balances", headers=headers).json()
    b2_u2 = next(m for m in bal2["member_balances"] if m["user_id"] == u2.id)
    assert b2_u2["net_balance"] == -400.00

    # 3. Delete expense
    res_del = client.delete(f"/api/v1/expenses/{exp_id}", headers=headers)
    assert res_del.status_code == 200

    bal3 = client.get(f"/api/v1/groups/{group_id}/balances", headers=headers).json()
    for m in bal3["member_balances"]:
        assert m["net_balance"] == 0.00

def test_reg_common_settlement_and_partial_payment(regression_env):
    """Regression: Partial payment and full settlement minimize transactions to 0.00."""
    headers = regression_env["headers"]
    u1, u2 = regression_env["users"][:2]

    res = client.post("/api/v1/groups/", json={"name": "RegTest_Settlement", "group_type": "PERSONAL"}, headers=headers)
    group_id = res.json()["id"]
    client.post(f"/api/v1/groups/{group_id}/members", json={"email": u2.email, "name": u2.name, "role": "MEMBER"}, headers=headers)
    members = client.get(f"/api/v1/groups/{group_id}", headers=headers).json()["members"]
    m1_id = next(m["id"] for m in members if m["user_id"] == u1.id)
    m2_id = next(m["id"] for m in members if m["user_id"] == u2.id)

    # U1 pays ₹1,000 equal split (U2 owes ₹500)
    client.post(f"/api/v1/expenses/?group_id={group_id}", json={
        "title": "Concert Pass",
        "amount": 1000.0,
        "split_type": "EQUAL",
        "category": "OUTING"
    }, headers=headers)

    # Partial payment of ₹200 from U2 to U1
    res_part = client.post(f"/api/v1/settlements/?group_id={group_id}", json={
        "payer_member_id": m2_id,
        "payee_member_id": m1_id,
        "amount": 200.0,
        "payment_mode": "UPI"
    }, headers=headers)
    assert res_part.status_code == 201

    bal1 = client.get(f"/api/v1/groups/{group_id}/balances", headers=headers).json()
    assert bal1["simplified_settlements"][0]["amount"] == 300.00

    # Remaining settlement of ₹300
    client.post(f"/api/v1/settlements/?group_id={group_id}", json={
        "payer_member_id": m2_id,
        "payee_member_id": m1_id,
        "amount": 300.0,
        "payment_mode": "UPI"
    }, headers=headers)

    bal_final = client.get(f"/api/v1/groups/{group_id}/balances", headers=headers).json()
    assert len(bal_final["simplified_settlements"]) == 0
    for m in bal_final["member_balances"]:
        assert m["net_balance"] == 0.00
        assert m["status"] == "SETTLED"

# ==============================================================================
# SECTION 2: COLLEGE / HOSTEL MESS REGRESSION
# ==============================================================================

def test_reg_mess_complete_calculations(regression_env):
    """
    Regression: Hostel Mess:
    - Meal Rate = Total Mess Expense / Total Meals
    - Individual Food Cost = Meals * Meal Rate
    - Non-meal charges (Gas, Cook) divided equally
    - Advance payment & Previous balance handled
    """
    headers = regression_env["headers"]
    u1, u2 = regression_env["users"][:2]

    res = client.post("/api/v1/groups/", json={
        "name": "RegTest_Mess",
        "group_type": "MESS",
        "currency": "INR"
    }, headers=headers)
    group_id = res.json()["id"]

    client.post(f"/api/v1/groups/{group_id}/members", json={"email": u2.email, "name": u2.name, "role": "MEMBER"}, headers=headers)
    members = client.get(f"/api/v1/groups/{group_id}", headers=headers).json()["members"]
    m1 = next(m for m in members if m["user_id"] == u1.id)
    m2 = next(m for m in members if m["user_id"] == u2.id)

    # 1. Marketing Meal Expense: ₹12,000
    client.post(f"/api/v1/expenses/?group_id={group_id}", json={
        "title": "Monthly Marketing (Sabji, Rice)",
        "amount": 12000.0,
        "category": "BAZAR",
        "split_type": "MEAL_BASED",
        "is_fixed_cost": False
    }, headers=headers)

    # 2. Establishment Expense: Cook Masi ₹2,000 (₹1,000 each)
    client.post(f"/api/v1/expenses/?group_id={group_id}", json={
        "title": "Cook Salary",
        "amount": 2000.0,
        "category": "MASI",
        "split_type": "EQUAL",
        "is_fixed_cost": True
    }, headers=headers)

    # 3. Log Meals: U1 = 45 meals, U2 = 55 meals (Total = 100 meals)
    # Meal rate should be ₹12,000 / 100 = ₹120.00 / meal
    client.post(f"/api/v1/meals/{group_id}/monthly-summary", json={
        "month_date": "2026-09-01",
        "entries": [
            {"member_id": m1["id"], "total_meals": 45.0},
            {"member_id": m2["id"], "total_meals": 55.0}
        ]
    }, headers=headers)

    bal = client.get(f"/api/v1/groups/{group_id}/balances", headers=headers).json()
    assert bal["meal_rate"] == 120.00
    assert bal["total_meals"] == 100.0

    b_m1 = next(m for m in bal["member_balances"] if m["member_id"] == m1["id"])
    b_m2 = next(m for m in bal["member_balances"] if m["member_id"] == m2["id"])

    # Food Cost: U1 = 45 * 120 = 5400; Establishment = 1000; Total Due/Owed = 6400
    assert b_m1["individual_food_cost"] == 5400.00
    assert b_m1["other_charges"] == 1000.00
    assert b_m1["total_due"] == 6400.00

    # Food Cost: U2 = 55 * 120 = 6600; Establishment = 1000; Total Due/Owed = 7600
    assert b_m2["individual_food_cost"] == 6600.00
    assert b_m2["other_charges"] == 1000.00
    assert b_m2["total_due"] == 7600.00

# ==============================================================================
# SECTION 3: FLATMATES / ROOMMATES REGRESSION
# ==============================================================================

def test_reg_flatmates_independent_subsets_and_utilities(regression_env):
    """
    Regression: Flatmates:
    - Different expenses have different participant lists
    - Rent: ₹12,000 for 4 members = ₹3,000 each
    - Gas: ₹800 for 2 members = ₹400 each (others owe ₹0)
    """
    headers = regression_env["headers"]
    users = regression_env["users"]

    res = client.post("/api/v1/groups/", json={"name": "RegTest_Flatmates", "group_type": "FLATMATES"}, headers=headers)
    group_id = res.json()["id"]

    for u in users[1:]:
        client.post(f"/api/v1/groups/{group_id}/members", json={"email": u.email, "name": u.name, "role": "MEMBER"}, headers=headers)

    members = client.get(f"/api/v1/groups/{group_id}", headers=headers).json()["members"]
    m_a, m_b, m_c, m_d = members[0], members[1], members[2], members[3]

    # Rent: ₹12,000 for all 4 members
    client.post(f"/api/v1/expenses/?group_id={group_id}", json={
        "title": "Apartment Rent",
        "amount": 12000.0,
        "category": "RENT",
        "split_type": "EQUAL_CUSTOM",
        "paid_by_member_id": m_a["id"],
        "splits": [{"member_id": m["id"]} for m in members]
    }, headers=headers)

    # Gas: ₹800 for only A and B
    client.post(f"/api/v1/expenses/?group_id={group_id}", json={
        "title": "HP Cooking Gas",
        "amount": 800.0,
        "category": "GAS",
        "split_type": "EQUAL_CUSTOM",
        "paid_by_member_id": m_a["id"],
        "splits": [{"member_id": m_a["id"]}, {"member_id": m_b["id"]}]
    }, headers=headers)

    bal = client.get(f"/api/v1/groups/{group_id}/balances", headers=headers).json()
    b_map = {m["member_id"]: m for m in bal["member_balances"]}

    # A: Paid 12,800. Owed 3,000 (Rent) + 400 (Gas) = 3,400. Net = +9,400
    assert b_map[m_a["id"]]["total_paid"] == 12800.00
    assert b_map[m_a["id"]]["total_owed"] == 3400.00
    assert b_map[m_a["id"]]["net_balance"] == 9400.00

    # B: Paid 0. Owed 3,000 (Rent) + 400 (Gas) = 3,400. Net = -3,400
    assert b_map[m_b["id"]]["total_owed"] == 3400.00
    assert b_map[m_b["id"]]["net_balance"] == -3400.00

    # C and D: Owed 3,000 (Rent) + 0 (Gas) = 3,000. Net = -3,000
    assert b_map[m_c["id"]]["total_owed"] == 3000.00
    assert b_map[m_c["id"]]["net_balance"] == -3000.00
    assert b_map[m_d["id"]]["total_owed"] == 3000.00
    assert b_map[m_d["id"]]["net_balance"] == -3000.00

# ==============================================================================
# SECTION 4: TOUR & TRAVEL PLAN REGRESSION
# ==============================================================================

def test_reg_travel_trip_budget_and_categories(regression_env):
    """
    Regression: Tour & Travel Plan:
    - Trip Budget = ₹20,000
    - Hotel: ₹5,000 / 5 = ₹1,000
    - Cab: ₹2,000 / 4 = ₹500
    - Train: ₹6,000 / 4 = ₹1,500
    - Total Trip Expense = ₹13,000
    - Remaining Budget = ₹7,000
    """
    headers = regression_env["headers"]
    users = regression_env["users"]

    res = client.post("/api/v1/groups/", json={
        "name": "RegTest_Travel",
        "group_type": "TRIP",
        "settings": {
            "trip_budget": 20000.0
        }
    }, headers=headers)
    group_id = res.json()["id"]

    for u in users[1:]:
        client.post(f"/api/v1/groups/{group_id}/members", json={"email": u.email, "name": u.name, "role": "MEMBER"}, headers=headers)
    # Add a 5th virtual traveler
    client.post(f"/api/v1/groups/{group_id}/members", json={"name": "Traveler 5", "role": "MEMBER"}, headers=headers)

    members = client.get(f"/api/v1/groups/{group_id}", headers=headers).json()["members"]
    assert len(members) == 5

    # Hotel ₹5,000 for 5 members = ₹1,000 each
    client.post(f"/api/v1/expenses/?group_id={group_id}", json={
        "title": "Beach Resort Booking",
        "amount": 5000.0,
        "category": "HOTEL",
        "split_type": "EQUAL_CUSTOM",
        "paid_by_member_id": members[0]["id"],
        "splits": [{"member_id": m["id"]} for m in members]
    }, headers=headers)

    # Cab ₹2,000 for 4 members = ₹500 each
    client.post(f"/api/v1/expenses/?group_id={group_id}", json={
        "title": "Airport Cab",
        "amount": 2000.0,
        "category": "CAB",
        "split_type": "EQUAL_CUSTOM",
        "paid_by_member_id": members[0]["id"],
        "splits": [{"member_id": m["id"]} for m in members[:4]]
    }, headers=headers)

    # Train ₹6,000 for 4 members = ₹1,500 each
    client.post(f"/api/v1/expenses/?group_id={group_id}", json={
        "title": "Express Train Tickets",
        "amount": 6000.0,
        "category": "TRAIN",
        "split_type": "EQUAL_CUSTOM",
        "paid_by_member_id": members[0]["id"],
        "splits": [{"member_id": m["id"]} for m in members[:4]]
    }, headers=headers)

    bal = client.get(f"/api/v1/groups/{group_id}/balances", headers=headers).json()
    assert bal["total_trip_expense"] == 13000.00
    assert bal["trip_budget"] == 20000.00
    assert bal["remaining_budget"] == 7000.00

# ==============================================================================
# SECTION 5: PERSONAL / FRIENDS SHARED REGRESSION
# ==============================================================================

def test_reg_personal_friends_simple_flow(regression_env):
    """
    Regression: Personal / Friends Shared:
    - Expense ₹2,000 / 4 = ₹500 each
    - User A paid ₹2,000
    - A = +₹1,500, B = -₹500, C = -₹500, D = -₹500
    - Minimal settlement direct transfers
    """
    headers = regression_env["headers"]
    users = regression_env["users"]

    res = client.post("/api/v1/groups/", json={"name": "RegTest_Friends", "group_type": "PERSONAL"}, headers=headers)
    group_id = res.json()["id"]

    for u in users[1:]:
        client.post(f"/api/v1/groups/{group_id}/members", json={"email": u.email, "name": u.name, "role": "MEMBER"}, headers=headers)

    members = client.get(f"/api/v1/groups/{group_id}", headers=headers).json()["members"]
    u_a = next(m for m in members if m["user_id"] == users[0].id)

    # Expense ₹2,000 equal split
    client.post(f"/api/v1/expenses/?group_id={group_id}", json={
        "title": "Weekend Cafe Hangout",
        "amount": 2000.0,
        "category": "FOOD",
        "split_type": "EQUAL",
        "paid_by_member_id": u_a["id"]
    }, headers=headers)

    bal = client.get(f"/api/v1/groups/{group_id}/balances", headers=headers).json()
    b_map = {m["member_id"]: m for m in bal["member_balances"]}

    assert b_map[u_a["id"]]["net_balance"] == 1500.00
    for m in members[1:]:
        assert b_map[m["id"]]["net_balance"] == -500.00

    settlements = bal["simplified_settlements"]
    assert len(settlements) == 3
    for s in settlements:
        assert s["payee_id"] == u_a["id"]
        assert s["amount"] == 500.00
