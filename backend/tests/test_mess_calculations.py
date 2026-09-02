import pytest
from datetime import date
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.core.security import create_access_token, get_password_hash
from app.models.user import User
from app.models.group import Group, GroupMember
from app.models.expense import Expense
from app.models.meal import MealAttendance
from app.models.settlement import Settlement
from app.services.meal_engine import calculate_mess_balances

client = TestClient(app)

@pytest.fixture
def mess_setup():
    """Sets up a realistic hostel mess with 4 members."""
    db = SessionLocal()
    # Clean up old test users and groups if any
    old_grps = db.query(Group).filter(Group.name == "Hostel Mess Test Group").all()
    for g in old_grps:
        db.delete(g)
    db.commit()

    test_user = db.query(User).filter(User.email == "mess_manager@hostel.com").first()
    if not test_user:
        test_user = User(
            name="Mess Manager",
            email="mess_manager@hostel.com",
            password_hash=get_password_hash("password123"),
            upi_id="manager@upi",
            is_admin=False
        )
        db.add(test_user)
        db.commit()
        db.refresh(test_user)

    token = create_access_token(data={"sub": test_user.id})
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create Mess Group
    res = client.post("/api/v1/groups/", json={
        "name": "Hostel Mess Test Group",
        "group_type": "MESS",
        "currency": "INR",
        "initial_deposit": 0.0
    }, headers=headers)
    assert res.status_code == 201
    group_id = res.json()["id"]

    # 2. Add members: Alice, Bob, Charlie, David
    members_data = [
        {"name": "Alice", "role": "MEMBER", "initial_deposit": 1000.0, "previous_balance": 0.0},
        {"name": "Bob", "role": "MEMBER", "initial_deposit": 1000.0, "previous_balance": 0.0},
        {"name": "Charlie", "role": "MEMBER", "initial_deposit": 1000.0, "previous_balance": 0.0},
        {"name": "David", "role": "MEMBER", "initial_deposit": 1000.0, "previous_balance": 0.0}
    ]
    for m in members_data:
        m_res = client.post(f"/api/v1/groups/{group_id}/members", json=m, headers=headers)
        assert m_res.status_code == 201

    group = db.query(Group).filter(Group.id == group_id).first()
    members = db.query(GroupMember).filter(GroupMember.group_id == group_id).all()

    yield {
        "db": db,
        "group": group,
        "group_id": group_id,
        "headers": headers,
        "members": members
    }

    # Teardown
    db.delete(group)
    db.commit()
    db.close()

def test_mess_user_example_exact(mess_setup):
    """
    Direct verification of the user's exact specification:
    Total Expense = ₹12,000
    Total Meals = 600
    Meal Rate = Total Mess Expense / Total Meals = ₹20
    If a member consumed 45 meals:
    Food Cost = 45 × ₹20 = ₹900
    """
    db = mess_setup["db"]
    group = mess_setup["group"]
    group_id = mess_setup["group_id"]
    headers = mess_setup["headers"]
    members = mess_setup["members"]

    alice = next(m for m in members if m.name == "Alice")
    bob = next(m for m in members if m.name == "Bob")
    charlie = next(m for m in members if m.name == "Charlie")
    david = next(m for m in members if m.name == "David")

    # Add meal expense of ₹12,000
    client.post(f"/api/v1/expenses/?group_id={group_id}", json={
        "title": "Monthly Mess Grocery & Vegetables",
        "amount": 12000.0,
        "category": "GROCERY",
        "is_fixed_cost": False,
        "split_type": "MEAL_BASED"
    }, headers=headers)

    # Log meal counts totaling exactly 600:
    # Alice: 45 meals
    # Bob: 155 meals
    # Charlie: 200 meals
    # David: 200 meals
    # Total = 45 + 155 + 200 + 200 = 600 meals
    meal_allocations = [
        (alice.id, 45.0),
        (bob.id, 155.0),
        (charlie.id, 200.0),
        (david.id, 200.0)
    ]
    for mid, count in meal_allocations:
        m_entry = MealAttendance(
            group_id=group_id,
            member_id=mid,
            record_date=date.today(),
            total_units=count,
            breakfast_count=0.0,
            lunch_count=count / 2,
            dinner_count=count / 2
        )
        db.add(m_entry)
    db.commit()

    # Calculate balances
    data = calculate_mess_balances(db, group)

    assert data["total_meal_expenses"] == 12000.0
    assert data["total_meals"] == 600.0
    assert data["meal_rate"] == 20.0

    balances_by_name = {m["name"]: m for m in data["member_balances"]}
    alice_bal = balances_by_name["Alice"]

    # Verify Alice: 45 meals × ₹20 = ₹900 Food Cost
    assert alice_bal["individual_meal_count"] == 45.0
    assert alice_bal["individual_food_cost"] == 900.0

    # Alice paid ₹1000 advance deposit, owes ₹900 food cost
    # Net Balance = ₹1000 - ₹900 = +₹100 (REFUND)
    assert alice_bal["advance_payment"] == 1000.0
    assert alice_bal["amount_already_paid"] == 1000.0
    assert alice_bal["total_due"] == 900.0
    assert alice_bal["net_balance"] == 100.0
    assert alice_bal["status"] == "REFUND"
    assert alice_bal["refund_amount"] == 100.0
    assert alice_bal["final_payable_amount"] == 0.0

def test_mess_non_meal_other_charges_separation(mess_setup):
    """
    Requirement: Do not force non-meal expenses into meal calculations.
    Expenses such as:
    - Gas (₹1000)
    - Electricity (₹600)
    - Maintenance (₹400)
    Total Other Charges = ₹2,000 (₹500 / member for 4 members).

    Meal Expense = ₹10,000.
    Total Meals = 500.
    Meal Rate MUST be: ₹10,000 / 500 = ₹20.00 (NOT ₹12,000 / 500 = ₹24.00!).
    """
    db = mess_setup["db"]
    group = mess_setup["group"]
    group_id = mess_setup["group_id"]
    headers = mess_setup["headers"]
    members = mess_setup["members"]

    alice = next(m for m in members if m.name == "Alice")
    bob = next(m for m in members if m.name == "Bob")

    # Add Other Charges (Fixed costs)
    other_expenses = [
        ("Cylinder Gas", 1000.0, "GAS", True),
        ("Hostel Electricity", 600.0, "ELECTRICITY", True),
        ("Mess Maintenance", 400.0, "MAINTENANCE", True)
    ]
    for title, amt, cat, fixed in other_expenses:
        client.post(f"/api/v1/expenses/?group_id={group_id}", json={
            "title": title,
            "amount": amt,
            "category": cat,
            "is_fixed_cost": fixed
        }, headers=headers)

    # Add Food Expenses
    client.post(f"/api/v1/expenses/?group_id={group_id}", json={
        "title": "Bazar Vegetables & Grocery",
        "amount": 10000.0,
        "category": "GROCERY",
        "is_fixed_cost": False,
        "split_type": "MEAL_BASED"
    }, headers=headers)

    # Log 500 total meals: Alice 50, Bob 450
    m_alice = MealAttendance(
        group_id=group_id,
        member_id=alice.id,
        record_date=date.today(),
        total_units=50.0
    )
    m_bob = MealAttendance(
        group_id=group_id,
        member_id=bob.id,
        record_date=date.today(),
        total_units=450.0
    )
    db.add_all([m_alice, m_bob])
    db.commit()

    data = calculate_mess_balances(db, group)

    # Total other charges = 2000, establishment per head = 400.00 (2000 / 5 members: Manager + 4 members)
    assert data["total_establishment"] == 2000.0
    assert data["other_charges_total"] == 2000.0
    assert data["establishment_per_head"] == 400.0

    # Total meal expense = 10000. Total meals = 500. Meal Rate = 20.00
    assert data["total_meal_expenses"] == 10000.0
    assert data["total_meals"] == 500.0
    assert data["meal_rate"] == 20.0

    # Total Mess Expense = 10000 + 2000 = 12000
    assert data["total_mess_expense"] == 12000.0

    # Alice: 50 meals × ₹20 = ₹1,000 Food Cost + ₹400 Other Charges = ₹1,400 Total Bill
    balances_by_name = {m["name"]: m for m in data["member_balances"]}
    alice_bal = balances_by_name["Alice"]
    assert alice_bal["individual_food_cost"] == 1000.0
    assert alice_bal["other_charges"] == 400.0
    assert alice_bal["total_due"] == 1400.0

    # Alice paid ₹1,000 advance. Bill = ₹1,400. Net Balance = ₹1,000 - ₹1,400 = -₹400 (DUE: ₹400)
    assert alice_bal["net_balance"] == -400.0
    assert alice_bal["final_payable_amount"] == 400.0
    assert alice_bal["status"] == "DUE"

def test_mess_zero_total_meals_edge_case(mess_setup):
    """
    Edge case: Zero total meals logged.
    Must not throw ZeroDivisionError.
    Meal rate = 0.0, individual food cost = 0.0.
    """
    db = mess_setup["db"]
    group = mess_setup["group"]
    group_id = mess_setup["group_id"]
    headers = mess_setup["headers"]

    # Expense exists but no meal attendance
    client.post(f"/api/v1/expenses/?group_id={group_id}", json={
        "title": "Advance Rice Stock",
        "amount": 5000.0,
        "category": "GROCERY",
        "is_fixed_cost": False
    }, headers=headers)

    data = calculate_mess_balances(db, group)
    assert data["total_meals"] == 0.0
    assert data["meal_rate"] == 0.0

    for mb in data["member_balances"]:
        assert mb["individual_meal_count"] == 0.0
        assert mb["individual_food_cost"] == 0.0

def test_mess_missing_meal_count(mess_setup):
    """
    Edge case: Some members have missing meal count.
    Default to 0.0 without errors.
    """
    db = mess_setup["db"]
    group = mess_setup["group"]
    group_id = mess_setup["group_id"]
    headers = mess_setup["headers"]
    members = mess_setup["members"]

    alice = next(m for m in members if m.name == "Alice")
    # Only Alice has meals recorded; Bob, Charlie, David have no records
    m_alice = MealAttendance(
        group_id=group_id,
        member_id=alice.id,
        record_date=date.today(),
        total_units=30.0
    )
    db.add(m_alice)
    db.commit()

    client.post(f"/api/v1/expenses/?group_id={group_id}", json={
        "title": "Grocery",
        "amount": 600.0,
        "category": "GROCERY",
        "is_fixed_cost": False
    }, headers=headers)

    data = calculate_mess_balances(db, group)
    balances_by_name = {m["name"]: m for m in data["member_balances"]}

    assert balances_by_name["Alice"]["individual_meal_count"] == 30.0
    assert balances_by_name["Bob"]["individual_meal_count"] == 0.0
    assert balances_by_name["Charlie"]["individual_meal_count"] == 0.0
    assert balances_by_name["David"]["individual_meal_count"] == 0.0

def test_mess_previous_balance_and_partial_payment(mess_setup):
    """
    Edge cases:
    - Previous balance carryover
    - Advance payment
    - Partial payment / settlement
    - Final payable amount
    """
    db = mess_setup["db"]
    group = mess_setup["group"]
    group_id = mess_setup["group_id"]
    headers = mess_setup["headers"]
    members = mess_setup["members"]

    alice = next(m for m in members if m.name == "Alice")
    bob = next(m for m in members if m.name == "Bob")

    # Set Alice's previous unpaid balance = ₹300
    alice.previous_balance = 300.0
    db.commit()

    # Meal Expense = ₹4000. Total Meals = 200 (Alice 100, Bob 100).
    # Meal rate = ₹20.00. Food cost = ₹2,000 each.
    client.post(f"/api/v1/expenses/?group_id={group_id}", json={
        "title": "Food",
        "amount": 4000.0,
        "category": "GROCERY",
        "is_fixed_cost": False
    }, headers=headers)

    m1 = MealAttendance(group_id=group_id, member_id=alice.id, record_date=date.today(), total_units=100.0)
    m2 = MealAttendance(group_id=group_id, member_id=bob.id, record_date=date.today(), total_units=100.0)
    db.add_all([m1, m2])
    db.commit()

    # Before partial payment:
    # Alice: Advance ₹1,000. Food cost ₹2,000 + Prev Balance ₹300 = Total Bill ₹2,300.
    # Due = ₹2,300 - ₹1,000 = ₹1,300.
    data1 = calculate_mess_balances(db, group)
    alice_bal1 = next(m for m in data1["member_balances"] if m["name"] == "Alice")
    assert alice_bal1["previous_balance"] == 300.0
    assert alice_bal1["advance_payment"] == 1000.0
    assert alice_bal1["total_due"] == 2300.0
    assert alice_bal1["final_payable_amount"] == 1300.0
    assert alice_bal1["status"] == "DUE"

    # Alice makes a partial payment of ₹500
    client.post(f"/api/v1/settlements/?group_id={group_id}", json={
        "payer_member_id": alice.id,
        "payee_member_id": bob.id,
        "amount": 500.0,
        "payment_mode": "CASH",
        "note": "Partial payment of mess dues"
    }, headers=headers)

    # After partial payment:
    # Amount already paid = ₹1,000 + ₹500 = ₹1,500.
    # Final payable amount = ₹2,300 - ₹1,500 = ₹800.
    data2 = calculate_mess_balances(db, group)
    alice_bal2 = next(m for m in data2["member_balances"] if m["name"] == "Alice")
    assert alice_bal2["amount_already_paid"] == 1500.0
    assert alice_bal2["final_payable_amount"] == 800.0
    assert alice_bal2["status"] == "DUE"

    # Alice pays remaining ₹800
    client.post(f"/api/v1/settlements/?group_id={group_id}", json={
        "payer_member_id": alice.id,
        "payee_member_id": bob.id,
        "amount": 800.0,
        "payment_mode": "UPI",
        "note": "Final settlement"
    }, headers=headers)

    # Fully settled
    data3 = calculate_mess_balances(db, group)
    alice_bal3 = next(m for m in data3["member_balances"] if m["name"] == "Alice")
    assert alice_bal3["amount_already_paid"] == 2300.0
    assert alice_bal3["net_balance"] == 0.0
    assert alice_bal3["final_payable_amount"] == 0.0
    assert alice_bal3["status"] == "SETTLED"
