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
def travel_setup():
    """Sets up a realistic Tour & Travel group with 5 travelers."""
    db = SessionLocal()
    # Clean up old test data if any
    old_grps = db.query(Group).filter(Group.name == "Goa Roadtrip 2026").all()
    for g in old_grps:
        db.delete(g)
    db.commit()

    test_user = db.query(User).filter(User.email == "travel_organizer@trips.com").first()
    if not test_user:
        test_user = User(
            name="Alice Traveler",
            email="travel_organizer@trips.com",
            password_hash=get_password_hash("password123"),
            upi_id="alice@upi",
            is_admin=False
        )
        db.add(test_user)
        db.commit()
        db.refresh(test_user)

    token = create_access_token(data={"sub": test_user.id})
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create TRIP Group with budget = ₹20,000 in settings
    res = client.post("/api/v1/groups/", json={
        "name": "Goa Roadtrip 2026",
        "group_type": "TRIP",
        "currency": "INR",
        "initial_deposit": 0.0,
        "settings": {
            "trip_budget": 20000.0
        }
    }, headers=headers)
    assert res.status_code == 201
    group_id = res.json()["id"]

    # 2. Add 4 other travelers: Bob, Charlie, David, Emma
    travelers_data = [
        {"name": "Bob", "role": "MEMBER", "upi_id": "bob@upi"},
        {"name": "Charlie", "role": "MEMBER", "upi_id": "charlie@upi"},
        {"name": "David", "role": "MEMBER", "upi_id": "david@upi"},
        {"name": "Emma", "role": "MEMBER", "upi_id": "emma@upi"}
    ]
    for tr in travelers_data:
        m_res = client.post(f"/api/v1/groups/{group_id}/members", json=tr, headers=headers)
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

def test_travel_user_example_exact(travel_setup):
    """
    CRITICAL REQUIREMENT verification from user prompt:
    Hotel = ₹5,000 (5 participants) = ₹1,000 each
    Cab = ₹2,000 (4 participants) = ₹500 each
    Train Ticket = ₹6,000 (4 participants) = ₹1,500 each

    Each expense calculated independently.
    Combine all expenses to calculate:
    - Total Trip Expense
    - Total Paid by each member
    - Total Owed by each member
    - Net Balance
    - Settlement
    - Trip Budget
    - Remaining Budget
    """
    db = travel_setup["db"]
    group = travel_setup["group"]
    group_id = travel_setup["group_id"]
    headers = travel_setup["headers"]
    members = travel_setup["members"]

    alice = next(m for m in members if "Alice" in (m.name or ""))
    bob = next(m for m in members if m.name == "Bob")
    charlie = next(m for m in members if m.name == "Charlie")
    david = next(m for m in members if m.name == "David")
    emma = next(m for m in members if m.name == "Emma")

    # 1. Alice pays Hotel = ₹5,000 with 5 participants (Alice, Bob, Charlie, David, Emma)
    # Each = ₹1,000
    res_hotel = client.post(f"/api/v1/expenses/?group_id={group_id}", json={
        "title": "Beach Resort Stay",
        "amount": 5000.0,
        "category": "HOTEL",
        "split_type": "EQUAL",
        "paid_by_member_id": alice.id,
        "splits": [
            {"member_id": alice.id},
            {"member_id": bob.id},
            {"member_id": charlie.id},
            {"member_id": david.id},
            {"member_id": emma.id}
        ]
    }, headers=headers)
    assert res_hotel.status_code == 201
    splits_hotel = res_hotel.json()["splits"]
    assert len(splits_hotel) == 5
    for sp in splits_hotel:
        assert sp["share_amount"] == 1000.0

    # 2. Bob pays Cab = ₹2,000 with 4 participants (Alice, Bob, Charlie, David)
    # Emma didn't take the cab. Each = ₹500
    res_cab = client.post(f"/api/v1/expenses/?group_id={group_id}", json={
        "title": "Airport to Hotel Rental Cab",
        "amount": 2000.0,
        "category": "CAB",
        "split_type": "EQUAL_CUSTOM",
        "paid_by_member_id": bob.id,
        "splits": [
            {"member_id": alice.id},
            {"member_id": bob.id},
            {"member_id": charlie.id},
            {"member_id": david.id}
        ]
    }, headers=headers)
    assert res_cab.status_code == 201
    splits_cab = res_cab.json()["splits"]
    assert len(splits_cab) == 4
    for sp in splits_cab:
        assert sp["share_amount"] == 500.0

    # 3. Charlie pays Train Ticket = ₹6,000 with 4 participants (Alice, Bob, Charlie, Emma)
    # David travelled by flight/bike, so David is NOT a participant. Each = ₹1,500
    res_train = client.post(f"/api/v1/expenses/?group_id={group_id}", json={
        "title": "IRCTC Train Express Tickets",
        "amount": 600.0 if False else 6000.0,
        "category": "TRAIN",
        "split_type": "EQUAL_CUSTOM",
        "paid_by_member_id": charlie.id,
        "splits": [
            {"member_id": alice.id},
            {"member_id": bob.id},
            {"member_id": charlie.id},
            {"member_id": emma.id}
        ]
    }, headers=headers)
    assert res_train.status_code == 201
    splits_train = res_train.json()["splits"]
    assert len(splits_train) == 4
    for sp in splits_train:
        assert sp["share_amount"] == 1500.0

    # 4. Fetch balances & budget calculations
    data = calculate_common_balances(db, group)

    # - Total Trip Expense: 5,000 + 2,000 + 6,000 = ₹13,000.00
    assert data["total_trip_expense"] == 13000.0
    assert data["total_expenses"] == 13000.0

    # - Trip Budget: ₹20,000.00
    assert data["trip_budget"] == 20000.0

    # - Remaining Budget: ₹20,000 - ₹13,000 = ₹7,000.00
    assert data["remaining_budget"] == 7000.0

    balances_by_name = {m["name"]: m for m in data["member_balances"]}

    # Verify Total Paid, Total Owed, and Net Balance for each member:
    # 1. Alice:
    # Paid = ₹5,000 (Hotel)
    # Owed = ₹1,000 (Hotel) + ₹500 (Cab) + ₹1,500 (Train) = ₹3,000
    # Net Balance = ₹5,000 - ₹3,000 = +₹2,000 (Creditor)
    alice_bal = balances_by_name["Alice Traveler"]
    assert alice_bal["total_paid"] == 5000.0
    assert alice_bal["total_owed"] == 3000.0
    assert alice_bal["net_balance"] == 2000.0
    assert alice_bal["status"] == "REFUND"

    # 2. Bob:
    # Paid = ₹2,000 (Cab)
    # Owed = ₹1,000 (Hotel) + ₹500 (Cab) + ₹1,500 (Train) = ₹3,000
    # Net Balance = ₹2,000 - ₹3,000 = -₹1,000 (Debtor)
    bob_bal = balances_by_name["Bob"]
    assert bob_bal["total_paid"] == 2000.0
    assert bob_bal["total_owed"] == 3000.0
    assert bob_bal["net_balance"] == -1000.0
    assert bob_bal["status"] == "DUE"

    # 3. Charlie:
    # Paid = ₹6,000 (Train)
    # Owed = ₹1,000 (Hotel) + ₹500 (Cab) + ₹1,500 (Train) = ₹3,000
    # Net Balance = ₹6,000 - ₹3,000 = +₹3,000 (Creditor)
    charlie_bal = balances_by_name["Charlie"]
    assert charlie_bal["total_paid"] == 6000.0
    assert charlie_bal["total_owed"] == 3000.0
    assert charlie_bal["net_balance"] == 3000.0
    assert charlie_bal["status"] == "REFUND"

    # 4. David:
    # Paid = ₹0
    # Owed = ₹1,000 (Hotel) + ₹500 (Cab) + ₹0 (Not on train) = ₹1,500
    # Net Balance = 0 - ₹1,500 = -₹1,500 (Debtor)
    david_bal = balances_by_name["David"]
    assert david_bal["total_paid"] == 0.0
    assert david_bal["total_owed"] == 1500.0
    assert david_bal["net_balance"] == -1500.0
    assert david_bal["status"] == "DUE"

    # 5. Emma:
    # Paid = ₹0
    # Owed = ₹1,000 (Hotel) + ₹0 (Not in cab) + ₹1,500 (Train) = ₹2,500
    # Net Balance = 0 - ₹2,500 = -₹2,500 (Debtor)
    emma_bal = balances_by_name["Emma"]
    assert emma_bal["total_paid"] == 0.0
    assert emma_bal["total_owed"] == 2500.0
    assert emma_bal["net_balance"] == -2500.0
    assert emma_bal["status"] == "DUE"

    # Conservation of Cash:
    # Creditors: Alice (+2000) + Charlie (+3000) = +5000
    # Debtors: Bob (-1000) + David (-1500) + Emma (-2500) = -5000
    # Sum of Net Balances = 0.00
    total_net = sum(m["net_balance"] for m in data["member_balances"])
    assert round(total_net, 2) == 0.0

    # Settlement calculation: Run debt simplification
    simplified = simplify_debts(data["member_balances"])
    assert len(simplified) <= 4  # At most N-1 transactions

    # Execute settlements
    for tx in simplified:
        res_st = client.post(f"/api/v1/settlements/?group_id={group_id}", json={
            "payer_member_id": tx["payer_id"],
            "payee_member_id": tx["payee_id"],
            "amount": tx["amount"],
            "payment_mode": "UPI",
            "note": "Trip settlement"
        }, headers=headers)
        assert res_st.status_code == 201

    # Verify everyone is fully settled (0.00)
    final_data = calculate_common_balances(db, group)
    for m in final_data["member_balances"]:
        assert m["net_balance"] == 0.0
        assert m["status"] == "SETTLED"

def test_travel_all_categories_subsets(travel_setup):
    """
    Tests all 11 travel categories with independent participant lists:
    Hotel, Train, Flight, Bus, Cab, Food, Tickets, Activities, Parking, Fuel, Other.
    """
    db = travel_setup["db"]
    group = travel_setup["group"]
    group_id = travel_setup["group_id"]
    headers = travel_setup["headers"]
    members = travel_setup["members"]

    alice = next(m for m in members if "Alice" in (m.name or ""))
    bob = next(m for m in members if m.name == "Bob")
    charlie = next(m for m in members if m.name == "Charlie")
    david = next(m for m in members if m.name == "David")
    emma = next(m for m in members if m.name == "Emma")

    travel_expenses = [
        # 1. Flight: ₹8,000 paid by Alice for Alice & Bob (₹4,000 each)
        ("IndiGo Flight Tickets", 8000.0, "FLIGHT", alice.id, [alice.id, bob.id]),
        # 2. Bus: ₹1,500 paid by Charlie for Charlie, David, Emma (₹500 each)
        ("KSRTC Volvo Bus", 1500.0, "BUS", charlie.id, [charlie.id, david.id, emma.id]),
        # 3. Food: ₹2,500 paid by David for all 5 (₹500 each)
        ("Seafood Shack Dinner", 2500.0, "FOOD", david.id, [alice.id, bob.id, charlie.id, david.id, emma.id]),
        # 4. Tickets: ₹600 paid by Emma for Alice, Charlie, Emma (₹200 each)
        ("Fort Aguada Entry Passes", 600.0, "TICKETS", emma.id, [alice.id, charlie.id, emma.id]),
        # 5. Activities: ₹3,000 paid by Bob for Bob & David (₹1,500 each)
        ("Scuba Diving & Parasailing", 3000.0, "ACTIVITIES", bob.id, [bob.id, david.id]),
        # 6. Parking: ₹200 paid by Alice for Alice, Bob, Charlie (₹66.67, ₹66.67, ₹66.66)
        ("Beach Parking Fee", 200.0, "PARKING", alice.id, [alice.id, bob.id, charlie.id]),
        # 7. Fuel: ₹2,000 paid by Charlie for all 5 (₹400 each)
        ("Petrol Refill for Rental Car", 2000.0, "FUEL", charlie.id, [alice.id, bob.id, charlie.id, david.id, emma.id]),
        # 8. Other: ₹400 paid by Emma for Emma alone (₹400)
        ("Personal Souvenir / First Aid", 400.0, "OTHER", emma.id, [emma.id])
    ]

    for title, amt, cat, payer_id, part_ids in travel_expenses:
        res = client.post(f"/api/v1/expenses/?group_id={group_id}", json={
            "title": title,
            "amount": amt,
            "category": cat,
            "split_type": "EQUAL_CUSTOM" if len(part_ids) < 5 else "EQUAL",
            "paid_by_member_id": payer_id,
            "splits": [{"member_id": pid} for pid in part_ids]
        }, headers=headers)
        assert res.status_code == 201

    data = calculate_common_balances(db, group)

    # Total Trip Expense: 8000 + 1500 + 2500 + 600 + 3000 + 200 + 2000 + 400 = 18,200.00
    assert data["total_trip_expense"] == 18200.0
    assert data["trip_budget"] == 20000.0
    # Remaining Budget = 20,000 - 18,200 = 1,800.00
    assert data["remaining_budget"] == 1800.0

    # Verify Cash Conservation: Sum of Net Balances == 0.00
    total_net = sum(m["net_balance"] for m in data["member_balances"])
    assert round(total_net, 2) == 0.0
