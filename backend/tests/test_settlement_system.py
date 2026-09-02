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
from app.services.meal_engine import calculate_mess_balances

client = TestClient(app)

@pytest.fixture
def settlement_setup():
    """Sets up groups and members for comprehensive settlement lifecycle testing."""
    db = SessionLocal()
    # Clean up old test data
    for name in ["Settlement Test Group", "Mess Settlement Group"]:
        old_grps = db.query(Group).filter(Group.name == name).all()
        for g in old_grps:
            db.delete(g)
    db.commit()

    test_user = db.query(User).filter(User.email == "settlement_user@test.com").first()
    if not test_user:
        test_user = User(
            name="User A",
            email="settlement_user@test.com",
            password_hash=get_password_hash("password123"),
            upi_id="user_a@upi",
            is_admin=False
        )
        db.add(test_user)
        db.commit()
        db.refresh(test_user)

    token = create_access_token(data={"sub": test_user.id})
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create Common Group
    res = client.post("/api/v1/groups/", json={
        "name": "Settlement Test Group",
        "group_type": "FLATMATES",
        "currency": "INR",
        "initial_deposit": 0.0
    }, headers=headers)
    assert res.status_code == 201
    group_id = res.json()["id"]

    # 2. Add B, C, D
    for name, upi in [("User B", "user_b@upi"), ("User C", "user_c@upi"), ("User D", "user_d@upi")]:
        client.post(f"/api/v1/groups/{group_id}/members", json={
            "name": name,
            "role": "MEMBER",
            "upi_id": upi
        }, headers=headers)

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

def test_settlement_exact_user_example(settlement_setup):
    """
    CRITICAL REQUIREMENT verification from prompt:
    A should receive ₹750
    B owes ₹250
    C owes ₹250
    D owes ₹250

    Expected:
    B → A ₹250
    C → A ₹250
    D → A ₹250
    """
    members = settlement_setup["members"]
    user_a = next(m for m in members if "User A" in (m.name or ""))
    user_b = next(m for m in members if m.name == "User B")
    user_c = next(m for m in members if m.name == "User C")
    user_d = next(m for m in members if m.name == "User D")

    # Member balances where A has +₹750, B, C, D each have -₹250
    test_balances = [
        {"member_id": user_a.id, "name": "User A", "upi_id": "user_a@upi", "net_balance": 750.0},
        {"member_id": user_b.id, "name": "User B", "upi_id": "user_b@upi", "net_balance": -250.0},
        {"member_id": user_c.id, "name": "User C", "upi_id": "user_c@upi", "net_balance": -250.0},
        {"member_id": user_d.id, "name": "User D", "upi_id": "user_d@upi", "net_balance": -250.0}
    ]

    transactions = simplify_debts(test_balances, currency="INR")

    # Exactly 3 transactions
    assert len(transactions) == 3

    # All 3 pay User A
    payers = {tx["payer_name"]: tx["amount"] for tx in transactions}
    assert payers["User B"] == 250.0
    assert payers["User C"] == 250.0
    assert payers["User D"] == 250.0

    for tx in transactions:
        assert tx["payee_name"] == "User A"
        assert tx["payee_id"] == user_a.id
        assert tx["amount"] == 250.0

def test_settlement_lifecycle_events(settlement_setup):
    """
    Audits settlement calculation dynamically across lifecycle events:
    - New expense
    - Edited expense
    - Deleted expense
    - Partial payment
    - Advance payment
    - Different participants
    - Multiple payers
    - Decimal amounts
    """
    db = settlement_setup["db"]
    group = settlement_setup["group"]
    group_id = settlement_setup["group_id"]
    headers = settlement_setup["headers"]
    members = settlement_setup["members"]

    user_a = next(m for m in members if "User A" in (m.name or ""))
    user_b = next(m for m in members if m.name == "User B")
    user_c = next(m for m in members if m.name == "User C")
    user_d = next(m for m in members if m.name == "User D")

    # 1. NEW EXPENSE: A pays ₹1,000 for all 4 (₹250 each)
    res1 = client.post(f"/api/v1/expenses/?group_id={group_id}", json={
        "title": "Grocery Staples",
        "amount": 1000.0,
        "category": "GROCERY",
        "split_type": "EQUAL",
        "paid_by_member_id": user_a.id,
        "splits": [{"member_id": m.id} for m in [user_a, user_b, user_c, user_d]]
    }, headers=headers)
    assert res1.status_code == 201
    exp1_id = res1.json()["id"]

    # Verify A = +750, B = -250, C = -250, D = -250
    bal_res1 = client.get(f"/api/v1/groups/{group_id}/balances", headers=headers).json()
    settle1 = bal_res1["simplified_settlements"]
    assert len(settle1) == 3
    for tx in settle1:
        assert tx["payee_id"] == user_a.id
        assert tx["amount"] == 250.0

    # 2. EDITED EXPENSE: A edits grocery bill from ₹1,000 to ₹1,200 (₹300 each)
    res_edit = client.put(f"/api/v1/expenses/{exp1_id}", json={
        "title": "Grocery Staples (With Bill Revision)",
        "amount": 1200.0,
        "category": "GROCERY",
        "split_type": "EQUAL",
        "paid_by_member_id": user_a.id,
        "splits": [{"member_id": m.id} for m in [user_a, user_b, user_c, user_d]]
    }, headers=headers)
    assert res_edit.status_code == 200

    # Verify updated settlement: each debtor now owes ₹300 (total A = +₹900)
    bal_res2 = client.get(f"/api/v1/groups/{group_id}/balances", headers=headers).json()
    settle2 = bal_res2["simplified_settlements"]
    assert len(settle2) == 3
    for tx in settle2:
        assert tx["payee_id"] == user_a.id
        assert tx["amount"] == 300.0

    # 3. PARTIAL PAYMENT: User B makes a partial payment of ₹100 to User A
    res_part = client.post(f"/api/v1/settlements/?group_id={group_id}", json={
        "payer_member_id": user_b.id,
        "payee_member_id": user_a.id,
        "amount": 100.0,
        "payment_mode": "UPI",
        "note": "Partial payment of ₹100"
    }, headers=headers)
    assert res_part.status_code == 201

    # Verify User B now owes only ₹200 (₹300 - ₹100), User A is owed ₹800
    bal_res3 = client.get(f"/api/v1/groups/{group_id}/balances", headers=headers).json()
    settle3 = bal_res3["simplified_settlements"]
    b_tx = next(tx for tx in settle3 if tx["payer_id"] == user_b.id)
    assert b_tx["amount"] == 200.0

    # 4. ADVANCE PAYMENT: User C pays advance deposit of ₹100
    res_adv = client.post(f"/api/v1/groups/{group_id}/deposit", json={
        "member_id": user_c.id,
        "amount": 100.0,
        "operation": "ADD"
    }, headers=headers)
    assert res_adv.status_code == 200

    # Verify User C now owes only ₹200 (₹300 - ₹100 advance deposit)
    bal_res4 = client.get(f"/api/v1/groups/{group_id}/balances", headers=headers).json()
    settle4 = bal_res4["simplified_settlements"]
    c_tx = next(tx for tx in settle4 if tx["payer_id"] == user_c.id)
    assert c_tx["amount"] == 200.0

    # 5. MULTIPLE PAYERS & DIFFERENT PARTICIPANTS WITH DECIMAL AMOUNTS:
    # User D pays ₹100.50 for High Speed Wi-Fi shared by User A & User D (₹50.25 each)
    res_wifi = client.post(f"/api/v1/expenses/?group_id={group_id}", json={
        "title": "Wi-Fi Topup",
        "amount": 100.50,
        "category": "WIFI",
        "split_type": "EQUAL_CUSTOM",
        "paid_by_member_id": user_d.id,
        "splits": [{"member_id": user_a.id}, {"member_id": user_d.id}]
    }, headers=headers)
    assert res_wifi.status_code == 201
    exp_wifi_id = res_wifi.json()["id"]

    # Verify total cash conserved (equal to unallocated group advance deposit of ₹100)
    bal_res5 = client.get(f"/api/v1/groups/{group_id}/balances", headers=headers).json()
    net_sum5 = sum(m["net_balance"] for m in bal_res5["member_balances"])
    assert round(net_sum5, 2) == 100.0  # ₹100 advance deposit in group fund

    # 6. DELETED EXPENSE: Delete Wi-Fi topup expense
    del_res = client.delete(f"/api/v1/expenses/{exp_wifi_id}", headers=headers)
    assert del_res.status_code == 200

    # Verify balances rolled back cleanly
    bal_res6 = client.get(f"/api/v1/groups/{group_id}/balances", headers=headers).json()
    net_sum6 = sum(m["net_balance"] for m in bal_res6["member_balances"])
    assert round(net_sum6, 2) == 100.0  # Still ₹100 advance deposit

    # 7. Reset User C deposit back to 0 so all peer debts balance exactly
    client.post(f"/api/v1/groups/{group_id}/deposit", json={
        "member_id": user_c.id,
        "amount": 0.0,
        "operation": "SET"
    }, headers=headers)

    bal_res7 = client.get(f"/api/v1/groups/{group_id}/balances", headers=headers).json()
    assert round(sum(m["net_balance"] for m in bal_res7["member_balances"]), 2) == 0.0

    # Execute remaining settlements: Settle everyone to 0.00
    for tx in bal_res7["simplified_settlements"]:
        client.post(f"/api/v1/settlements/?group_id={group_id}", json={
            "payer_member_id": tx["payer_id"],
            "payee_member_id": tx["payee_id"],
            "amount": tx["amount"],
            "payment_mode": "UPI"
        }, headers=headers)

    final_bal = client.get(f"/api/v1/groups/{group_id}/balances", headers=headers).json()
    for m in final_bal["member_balances"]:
        assert m["net_balance"] == 0.0
        assert m["status"] == "SETTLED"
    assert len(final_bal["simplified_settlements"]) == 0
