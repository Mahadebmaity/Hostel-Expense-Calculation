import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.core.security import create_access_token, get_password_hash
from app.models.user import User
from app.models.group import Group, GroupMember
from app.models.expense import Expense, ExpenseSplit
from app.models.settlement import Settlement
from app.services.split_engine import calculate_common_balances, simplify_debts

client = TestClient(app)

@pytest.fixture
def personal_setup():
    """Sets up a realistic Personal / Friends Shared group with 4 friends."""
    db = SessionLocal()
    # Clean up old test data if any
    old_grps = db.query(Group).filter(Group.name == "Weekend Hangout Squad").all()
    for g in old_grps:
        db.delete(g)
    db.commit()

    test_user = db.query(User).filter(User.email == "friend_a@friends.com").first()
    if not test_user:
        test_user = User(
            name="Friend A",
            email="friend_a@friends.com",
            password_hash=get_password_hash("password123"),
            upi_id="friend_a@upi",
            is_admin=False
        )
        db.add(test_user)
        db.commit()
        db.refresh(test_user)

    token = create_access_token(data={"sub": test_user.id})
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create PERSONAL Group
    res = client.post("/api/v1/groups/", json={
        "name": "Weekend Hangout Squad",
        "group_type": "PERSONAL",
        "currency": "INR",
        "initial_deposit": 0.0
    }, headers=headers)
    assert res.status_code == 201
    group_id = res.json()["id"]

    # 2. Add remaining 3 friends: Friend B, Friend C, Friend D
    friends_data = [
        {"name": "Friend B", "role": "MEMBER", "upi_id": "friend_b@upi"},
        {"name": "Friend C", "role": "MEMBER", "upi_id": "friend_c@upi"},
        {"name": "Friend D", "role": "MEMBER", "upi_id": "friend_d@upi"}
    ]
    for fr in friends_data:
        m_res = client.post(f"/api/v1/groups/{group_id}/members", json=fr, headers=headers)
        assert m_res.status_code == 201

    group = db.query(Group).filter(Group.id == group_id).first()
    members = db.query(GroupMember).filter(GroupMember.group_id == group_id).all()

    yield {
        "db": db,
        "group": group,
        "group_id": group_id,
        "headers": headers,
        "members": members,
        "user": test_user
    }

    # Teardown
    db.delete(group)
    db.commit()
    db.close()

def test_personal_user_example_exact(personal_setup):
    """
    CRITICAL REQUIREMENT verification from prompt:
    Expense = ₹2,000
    Participants = 4
    Each share = ₹500

    If A paid ₹2,000:
    A = +₹1,500
    B = -₹500
    C = -₹500
    D = -₹500
    """
    db = personal_setup["db"]
    group = personal_setup["group"]
    group_id = personal_setup["group_id"]
    headers = personal_setup["headers"]
    members = personal_setup["members"]

    member_a = next(m for m in members if "Friend A" in (m.name or ""))
    member_b = next(m for m in members if m.name == "Friend B")
    member_c = next(m for m in members if m.name == "Friend C")
    member_d = next(m for m in members if m.name == "Friend D")

    # Friend A pays ₹2,000 equally divided among all 4 friends
    res = client.post(f"/api/v1/expenses/?group_id={group_id}", json={
        "title": "Weekend Dinner & Drinks",
        "amount": 2000.0,
        "category": "FOOD",
        "split_type": "EQUAL",
        "paid_by_member_id": member_a.id,
        "splits": [
            {"member_id": member_a.id},
            {"member_id": member_b.id},
            {"member_id": member_c.id},
            {"member_id": member_d.id}
        ]
    }, headers=headers)
    assert res.status_code == 201
    expense_data = res.json()

    # Each share = ₹500
    splits = expense_data["splits"]
    assert len(splits) == 4
    for sp in splits:
        assert sp["share_amount"] == 500.0

    # Calculate balances
    data = calculate_common_balances(db, group)
    balances_by_name = {m["name"]: m for m in data["member_balances"]}

    # A = +₹1,500
    bal_a = balances_by_name["Friend A"]
    assert bal_a["total_paid"] == 2000.0
    assert bal_a["total_owed"] == 500.0
    assert bal_a["net_balance"] == 1500.0
    assert bal_a["status"] == "REFUND"

    # B = -₹500
    bal_b = balances_by_name["Friend B"]
    assert bal_b["total_paid"] == 0.0
    assert bal_b["total_owed"] == 500.0
    assert bal_b["net_balance"] == -500.0
    assert bal_b["status"] == "DUE"

    # C = -₹500
    bal_c = balances_by_name["Friend C"]
    assert bal_c["total_paid"] == 0.0
    assert bal_c["total_owed"] == 500.0
    assert bal_c["net_balance"] == -500.0
    assert bal_c["status"] == "DUE"

    # D = -₹500
    bal_d = balances_by_name["Friend D"]
    assert bal_d["total_paid"] == 0.0
    assert bal_d["total_owed"] == 500.0
    assert bal_d["net_balance"] == -500.0
    assert bal_d["status"] == "DUE"

    # Cash conservation: +1500 - 500 - 500 - 500 == 0.00
    total_net = sum(m["net_balance"] for m in data["member_balances"])
    assert round(total_net, 2) == 0.0

    # Test Settlement: B, C, D each settle ₹500 with A
    simplified = simplify_debts(data["member_balances"])
    assert len(simplified) == 3
    for tx in simplified:
        assert tx["payee_id"] == member_a.id
        assert tx["amount"] == 500.0
        # Execute settlement
        s_res = client.post(f"/api/v1/settlements/?group_id={group_id}", json={
            "payer_member_id": tx["payer_id"],
            "payee_member_id": tx["payee_id"],
            "amount": tx["amount"],
            "payment_mode": "UPI",
            "note": "Settling ₹500 via UPI"
        }, headers=headers)
        assert s_res.status_code == 201

    # Everyone is now settled (₹0.00)
    final_data = calculate_common_balances(db, group)
    for m in final_data["member_balances"]:
        assert m["net_balance"] == 0.0
        assert m["status"] == "SETTLED"

def test_personal_custom_and_percentage_flow(personal_setup):
    """
    Tests Custom Exact Split and Percentage Split flows for Personal groups.
    """
    db = personal_setup["db"]
    group = personal_setup["group"]
    group_id = personal_setup["group_id"]
    headers = personal_setup["headers"]
    members = personal_setup["members"]

    member_a = next(m for m in members if "Friend A" in (m.name or ""))
    member_b = next(m for m in members if m.name == "Friend B")
    member_c = next(m for m in members if m.name == "Friend C")
    member_d = next(m for m in members if m.name == "Friend D")

    # 1. Custom Exact Split: ₹1,500 Movie & Snacks paid by Friend B
    # A: ₹600, B: ₹400, C: ₹500 (D did not join)
    res_custom = client.post(f"/api/v1/expenses/?group_id={group_id}", json={
        "title": "Movie Tickets & Popcorn",
        "amount": 1500.0,
        "category": "OUTING",
        "split_type": "EXACT",
        "paid_by_member_id": member_b.id,
        "splits": [
            {"member_id": member_a.id, "share_amount": 600.0},
            {"member_id": member_b.id, "share_amount": 400.0},
            {"member_id": member_c.id, "share_amount": 500.0}
        ]
    }, headers=headers)
    assert res_custom.status_code == 201
    splits = res_custom.json()["splits"]
    assert len(splits) == 3

    # 2. Percentage Split: ₹3,000 Concert Booking paid by Friend C
    # A: 50% (₹1500), B: 25% (₹750), C: 25% (₹750)
    res_pct = client.post(f"/api/v1/expenses/?group_id={group_id}", json={
        "title": "Concert Passes",
        "amount": 3000.0,
        "category": "OUTING",
        "split_type": "PERCENTAGE",
        "paid_by_member_id": member_c.id,
        "splits": [
            {"member_id": member_a.id, "percentage": 50.0},
            {"member_id": member_b.id, "percentage": 25.0},
            {"member_id": member_c.id, "percentage": 25.0}
        ]
    }, headers=headers)
    assert res_pct.status_code == 201

    # Check Balances:
    # Total expenses: 1500 + 3000 = 4500
    # A: Owed = 600 + 1500 = 2100. Paid = 0. Net = -2100
    # B: Owed = 400 + 750 = 1150. Paid = 1500. Net = +350
    # C: Owed = 500 + 750 = 1250. Paid = 3000. Net = +1750
    # D: Owed = 0. Paid = 0. Net = 0.0 (SETTLED)
    data = calculate_common_balances(db, group)
    balances_by_name = {m["name"]: m for m in data["member_balances"]}

    assert balances_by_name["Friend A"]["net_balance"] == -2100.0
    assert balances_by_name["Friend B"]["net_balance"] == 350.0
    assert balances_by_name["Friend C"]["net_balance"] == 1750.0
    assert balances_by_name["Friend D"]["net_balance"] == 0.0
    assert balances_by_name["Friend D"]["status"] == "SETTLED"

    # Cash conservation: -2100 + 350 + 1750 + 0 == 0.00
    total_net = sum(m["net_balance"] for m in data["member_balances"])
    assert round(total_net, 2) == 0.0

    # Settle all debts: Friend A pays Friend B ₹350 and Friend C ₹1,750
    simplified = simplify_debts(data["member_balances"])
    for tx in simplified:
        res_st = client.post(f"/api/v1/settlements/?group_id={group_id}", json={
            "payer_member_id": tx["payer_id"],
            "payee_member_id": tx["payee_id"],
            "amount": tx["amount"],
            "payment_mode": "UPI",
            "note": "Settling hangout share"
        }, headers=headers)
        assert res_st.status_code == 201

    final_data = calculate_common_balances(db, group)
    for m in final_data["member_balances"]:
        assert m["net_balance"] == 0.0
        assert m["status"] == "SETTLED"
