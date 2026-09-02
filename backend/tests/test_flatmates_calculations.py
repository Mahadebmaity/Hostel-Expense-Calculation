import pytest
from datetime import date
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
def flatmates_setup():
    """Sets up a realistic flatmates group with 4 flatmates."""
    db = SessionLocal()
    # Clean up old test data if any
    old_grps = db.query(Group).filter(Group.name == "Green Glen Flat 402").all()
    for g in old_grps:
        db.delete(g)
    db.commit()

    test_user = db.query(User).filter(User.email == "flat_owner@flats.com").first()
    if not test_user:
        test_user = User(
            name="Alice Flatmate",
            email="flat_owner@flats.com",
            password_hash=get_password_hash("password123"),
            upi_id="alice@upi",
            is_admin=False
        )
        db.add(test_user)
        db.commit()
        db.refresh(test_user)

    token = create_access_token(data={"sub": test_user.id})
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create FLATMATES Group
    res = client.post("/api/v1/groups/", json={
        "name": "Green Glen Flat 402",
        "group_type": "FLATMATES",
        "currency": "INR",
        "initial_deposit": 0.0
    }, headers=headers)
    assert res.status_code == 201
    group_id = res.json()["id"]

    # 2. Add remaining 3 flatmates: Bob, Charlie, David
    flatmates_data = [
        {"name": "Bob", "role": "MEMBER", "upi_id": "bob@upi"},
        {"name": "Charlie", "role": "MEMBER", "upi_id": "charlie@upi"},
        {"name": "David", "role": "MEMBER", "upi_id": "david@upi"}
    ]
    for fm in flatmates_data:
        m_res = client.post(f"/api/v1/groups/{group_id}/members", json=fm, headers=headers)
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

def test_flatmates_user_example_exact(flatmates_setup):
    """
    CRITICAL REQUIREMENT verification from prompt:
    Rent = ₹12,000 (4 participants) -> Each = ₹3,000
    Gas = ₹800 (Only 2 participants) -> Each = ₹400

    Never automatically divide every expense by the total number of group members.
    Each expense must use its own participant list.
    """
    db = flatmates_setup["db"]
    group = flatmates_setup["group"]
    group_id = flatmates_setup["group_id"]
    headers = flatmates_setup["headers"]
    members = flatmates_setup["members"]

    alice = next(m for m in members if "Alice" in (m.name or ""))
    bob = next(m for m in members if m.name == "Bob")
    charlie = next(m for m in members if m.name == "Charlie")
    david = next(m for m in members if m.name == "David")

    # 1. Alice pays Rent ₹12,000 shared by ALL 4 flatmates
    res_rent = client.post(f"/api/v1/expenses/?group_id={group_id}", json={
        "title": "Monthly Flat Rent",
        "amount": 12000.0,
        "category": "RENT",
        "split_type": "EQUAL",
        "paid_by_member_id": alice.id,
        "splits": [
            {"member_id": alice.id},
            {"member_id": bob.id},
            {"member_id": charlie.id},
            {"member_id": david.id}
        ]
    }, headers=headers)
    assert res_rent.status_code == 201

    # Verify Rent individual shares: each is exactly ₹3,000
    splits_rent = res_rent.json()["splits"]
    assert len(splits_rent) == 4
    for sp in splits_rent:
        assert sp["share_amount"] == 3000.0

    # 2. Charlie pays Cooking Gas ₹800 shared ONLY by 2 participants: Alice and Bob
    # (Charlie and David do NOT cook, so they are NOT participants)
    res_gas = client.post(f"/api/v1/expenses/?group_id={group_id}", json={
        "title": "HP Gas Cylinder Refill",
        "amount": 800.0,
        "category": "GAS",
        "split_type": "EQUAL_CUSTOM",
        "paid_by_member_id": charlie.id,
        "splits": [
            {"member_id": alice.id},
            {"member_id": bob.id}
        ]
    }, headers=headers)
    assert res_gas.status_code == 201

    # Verify Gas individual shares: each is exactly ₹400.00
    splits_gas = res_gas.json()["splits"]
    assert len(splits_gas) == 2
    for sp in splits_gas:
        assert sp["share_amount"] == 400.0

    # 3. Calculate Group Balances
    data = calculate_common_balances(db, group)
    balances_by_name = {m["name"]: m for m in data["member_balances"]}

    # Verify Alice:
    # Paid = ₹12,000 (Rent)
    # Owed = ₹3,000 (Rent) + ₹400 (Gas) = ₹3,400
    # Net Balance = ₹12,000 - ₹3,400 = +₹8,600 (Creditor)
    alice_bal = balances_by_name["Alice Flatmate"]
    assert alice_bal["total_paid"] == 12000.0
    assert alice_bal["total_due"] == 3400.0
    assert alice_bal["net_balance"] == 8600.0
    assert alice_bal["status"] == "REFUND"

    # Verify Bob:
    # Paid = ₹0
    # Owed = ₹3,000 (Rent) + ₹400 (Gas) = ₹3,400
    # Net Balance = 0 - ₹3,400 = -₹3,400 (Debtor)
    bob_bal = balances_by_name["Bob"]
    assert bob_bal["total_paid"] == 0.0
    assert bob_bal["total_due"] == 3400.0
    assert bob_bal["net_balance"] == -3400.0
    assert bob_bal["status"] == "DUE"

    # Verify Charlie:
    # Paid = ₹800 (Gas)
    # Owed = ₹3,000 (Rent) + ₹0 (Gas not used by Charlie) = ₹3,000
    # Net Balance = ₹800 - ₹3,000 = -₹2,200 (Debtor)
    charlie_bal = balances_by_name["Charlie"]
    assert charlie_bal["total_paid"] == 800.0
    assert charlie_bal["total_due"] == 3000.0
    assert charlie_bal["net_balance"] == -2200.0
    assert charlie_bal["status"] == "DUE"

    # Verify David:
    # Paid = ₹0
    # Owed = ₹3,000 (Rent) + ₹0 (Gas not used by David) = ₹3,000
    # Net Balance = 0 - ₹3,000 = -₹3,000 (Debtor)
    david_bal = balances_by_name["David"]
    assert david_bal["total_paid"] == 0.0
    assert david_bal["total_due"] == 3000.0
    assert david_bal["net_balance"] == -3000.0
    assert david_bal["status"] == "DUE"

    # Conservation of cash: 8600 - 3400 - 2200 - 3000 == 0
    total_net = sum(m["net_balance"] for m in data["member_balances"])
    assert round(total_net, 2) == 0.0

def test_flatmates_all_categories_with_different_subsets_and_settlement(flatmates_setup):
    """
    Tests realistic monthly utility suite:
    - Electricity: ₹1500 (3 participants: Bob, Charlie, David) -> ₹500 each.
    - Wi-Fi: ₹900 (3 participants: Alice, Charlie, David) -> ₹300 each.
    - Water: ₹200 (2 participants: Charlie, David) -> ₹100 each.
    - Groceries: ₹1800 (all 4 participants) -> ₹450 each.
    - Maintenance: ₹1200 (all 4 participants) -> ₹300 each.
    - Household: ₹600 (2 participants: Alice, David) -> ₹300 each.
    - Other: ₹500 (1 participant: David) -> ₹500.

    Then tests debt simplification and settlements bringing everyone to 0.00.
    """
    db = flatmates_setup["db"]
    group = flatmates_setup["group"]
    group_id = flatmates_setup["group_id"]
    headers = flatmates_setup["headers"]
    members = flatmates_setup["members"]

    alice = next(m for m in members if "Alice" in (m.name or ""))
    bob = next(m for m in members if m.name == "Bob")
    charlie = next(m for m in members if m.name == "Charlie")
    david = next(m for m in members if m.name == "David")

    expenses_to_add = [
        # 1. Electricity: ₹1500 paid by Bob for Bob, Charlie, David (₹500 each)
        ("Electricity Bill", 1500.0, "ELECTRICITY", bob.id, [bob.id, charlie.id, david.id]),
        # 2. Wi-Fi: ₹900 paid by Alice for Alice, Charlie, David (₹300 each)
        ("High Speed WiFi", 900.0, "WIFI", alice.id, [alice.id, charlie.id, david.id]),
        # 3. Water: ₹200 paid by Charlie for Charlie, David (₹100 each)
        ("Drinking Water Cans", 200.0, "WATER", charlie.id, [charlie.id, david.id]),
        # 4. Groceries: ₹1800 paid by Bob for all 4 (₹450 each)
        ("Flat Groceries", 1800.0, "GROCERY", bob.id, [alice.id, bob.id, charlie.id, david.id]),
        # 5. Maintenance: ₹1200 paid by David for all 4 (₹300 each)
        ("Flat Maintenance", 1200.0, "MAINTENANCE", david.id, [alice.id, bob.id, charlie.id, david.id]),
        # 6. Household: ₹600 paid by Alice for Alice, David (₹300 each)
        ("Household Cleaning Essentials", 600.0, "HOUSEHOLD", alice.id, [alice.id, david.id]),
        # 7. Other: ₹500 paid by Charlie for David alone (₹500)
        ("Custom Bedroom Repair", 500.0, "OTHER", charlie.id, [david.id])
    ]

    for title, amt, cat, payer_id, participant_ids in expenses_to_add:
        client.post(f"/api/v1/expenses/?group_id={group_id}", json={
            "title": title,
            "amount": amt,
            "category": cat,
            "split_type": "EQUAL_CUSTOM" if len(participant_ids) < 4 else "EQUAL",
            "paid_by_member_id": payer_id,
            "splits": [{"member_id": pid} for pid in participant_ids]
        }, headers=headers)

    # Fetch balances
    data = calculate_common_balances(db, group)
    balances_by_name = {m["name"]: m for m in data["member_balances"]}

    # Verify total expenses: 1500 + 900 + 200 + 1800 + 1200 + 600 + 500 = 6700
    assert data["total_expenses"] == 6700.0

    # Verify each member's owed breakdown:
    # Alice owed: Wi-Fi (300) + Groceries (450) + Maintenance (300) + Household (300) = ₹1350
    # Alice paid: Wi-Fi (900) + Household (600) = ₹1500 => Net = 1500 - 1350 = +₹150
    alice_bal = balances_by_name["Alice Flatmate"]
    assert alice_bal["total_paid"] == 1500.0
    assert alice_bal["total_due"] == 1350.0
    assert alice_bal["net_balance"] == 150.0

    # Bob owed: Electricity (500) + Groceries (450) + Maintenance (300) = ₹1250
    # Bob paid: Electricity (1500) + Groceries (1800) = ₹3300 => Net = 3300 - 1250 = +₹2050
    bob_bal = balances_by_name["Bob"]
    assert bob_bal["total_paid"] == 3300.0
    assert bob_bal["total_due"] == 1250.0
    assert bob_bal["net_balance"] == 2050.0

    # Charlie owed: Electricity (500) + Wi-Fi (300) + Water (100) + Groceries (450) + Maintenance (300) = ₹1650
    # Charlie paid: Water (200) + Other (500) = ₹700 => Net = 700 - 1650 = -₹950
    charlie_bal = balances_by_name["Charlie"]
    assert charlie_bal["total_paid"] == 700.0
    assert charlie_bal["total_due"] == 1650.0
    assert charlie_bal["net_balance"] == -950.0

    # David owed: Electricity (500) + Wi-Fi (300) + Water (100) + Groceries (450) + Maintenance (300) + Household (300) + Other (500) = ₹2450
    # David paid: Maintenance (1200) => Net = 1200 - 2450 = -₹1250
    david_bal = balances_by_name["David"]
    assert david_bal["total_paid"] == 1200.0
    assert david_bal["total_due"] == 2450.0
    assert david_bal["net_balance"] == -1250.0

    # Check cash conservation: +150 + 2050 - 950 - 1250 == 0
    total_net = sum(m["net_balance"] for m in data["member_balances"])
    assert round(total_net, 2) == 0.0

    # Test Debt Simplification:
    # Creditors: Alice (+150), Bob (+2050)
    # Debtors: Charlie (-950), David (-1250)
    simplified = simplify_debts(data["member_balances"])
    assert len(simplified) <= 3  # Maximum N-1 transactions

    # Execute the simplified settlements via API
    for tx in simplified:
        res_st = client.post(f"/api/v1/settlements/?group_id={group_id}", json={
            "payer_member_id": tx["payer_id"],
            "payee_member_id": tx["payee_id"],
            "amount": tx["amount"],
            "payment_mode": "UPI",
            "note": f"Settling {tx['amount']} via UPI"
        }, headers=headers)
        assert res_st.status_code == 201

    # After all settlements executed, all 4 flatmates must be SETTLED (0.00)
    final_data = calculate_common_balances(db, group)
    for m in final_data["member_balances"]:
        assert m["net_balance"] == 0.0
        assert m["status"] == "SETTLED"
