import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.core.security import create_access_token, get_password_hash
from app.models.user import User
from app.models.group import Group, GroupMember
from app.models.expense import Expense, ExpenseSplit
from app.models.settlement import Settlement
from app.services.split_engine import distribute_pennies, calculate_common_balances, simplify_debts

client = TestClient(app)

@pytest.fixture
def auth_setup():
    """Sets up a test user and group with 4 members."""
    db = SessionLocal()
    # Clean up previous test runs if any
    test_user = db.query(User).filter(User.email == "common_test_user@example.com").first()
    if not test_user:
        test_user = User(
            name="Alice Owner",
            email="common_test_user@example.com",
            password_hash=get_password_hash("password123"),
            upi_id="alice@upi",
            is_admin=False
        )
        db.add(test_user)
        db.commit()
        db.refresh(test_user)

    token = create_access_token(data={"sub": test_user.id})
    headers = {"Authorization": f"Bearer {token}"}

    # Clean up any leftover group from previous runs
    old_grps = db.query(Group).filter(Group.name == "Test Flat 101 Common").all()
    for g in old_grps:
        db.delete(g)
    db.commit()

    # Create Flatmates Group
    grp_res = client.post("/api/v1/groups/", json={
        "name": "Test Flat 101 Common",
        "group_type": "FLATMATES",
        "currency": "INR",
        "initial_deposit": 0.0
    }, headers=headers)
    assert grp_res.status_code == 201
    group_data = grp_res.json()
    group_id = group_data["id"]

    # Add 3 more members (Bob, Charlie, David)
    members_to_add = [
        {"name": "Bob", "role": "MEMBER", "initial_deposit": 0.0, "upi_id": "bob@upi"},
        {"name": "Charlie", "role": "MEMBER", "initial_deposit": 0.0, "upi_id": "charlie@upi"},
        {"name": "David", "role": "MEMBER", "initial_deposit": 0.0, "upi_id": "david@upi"}
    ]
    added_members = []
    for m in members_to_add:
        m_res = client.post(f"/api/v1/groups/{group_id}/members", json=m, headers=headers)
        assert m_res.status_code == 201
        added_members.append(m_res.json())

    # Get full group details with members
    details_res = client.get(f"/api/v1/groups/{group_id}", headers=headers)
    all_members = details_res.json()["members"]

    yield {
        "headers": headers,
        "group_id": group_id,
        "user": test_user,
        "members": all_members
    }

    # Teardown
    client.delete(f"/api/v1/groups/{group_id}", headers=headers)
    db.close()

def test_penny_distribution():
    """Validates exact penny/cent distribution down to the last paisa."""
    # 100 split 3 ways -> 33.34, 33.33, 33.33 (sum = 100.00)
    shares3 = distribute_pennies(100.0, 3)
    assert shares3 == [33.34, 33.33, 33.33]
    assert round(sum(shares3), 2) == 100.00

    # 50 split 4 ways -> 12.50, 12.50, 12.50, 12.50 (sum = 50.00)
    shares4 = distribute_pennies(50.0, 4)
    assert shares4 == [12.50, 12.50, 12.50, 12.50]
    assert round(sum(shares4), 2) == 50.00

def test_rounding_accuracy_edge_cases():
    """
    Critical requirements:
    Sum of shares MUST always equal original expense amount.
    Testing: ₹100/3, ₹1000/6, ₹999/7, ₹10/3, ₹123.45/4
    """
    # 1. ₹100 / 3
    s_100_3 = distribute_pennies(100.0, 3)
    assert s_100_3 == [33.34, 33.33, 33.33]
    assert round(sum(s_100_3), 2) == 100.00

    # 2. ₹1000 / 6
    s_1000_6 = distribute_pennies(1000.0, 6)
    assert s_1000_6 == [166.67, 166.67, 166.67, 166.67, 166.66, 166.66]
    assert round(sum(s_1000_6), 2) == 1000.00

    # 3. ₹999 / 7
    s_999_7 = distribute_pennies(999.0, 7)
    assert s_999_7 == [142.72, 142.72, 142.72, 142.71, 142.71, 142.71, 142.71]
    assert round(sum(s_999_7), 2) == 999.00

    # 4. ₹10 / 3
    s_10_3 = distribute_pennies(10.0, 3)
    assert s_10_3 == [3.34, 3.33, 3.33]
    assert round(sum(s_10_3), 2) == 10.00

    # 5. Decimal amount ₹123.45 / 4
    s_123_45_4 = distribute_pennies(123.45, 4)
    assert s_123_45_4 == [30.87, 30.86, 30.86, 30.86]
    assert round(sum(s_123_45_4), 2) == 123.45

def test_percentage_split_edge_cases():
    """
    Testing percentage split: 33.33% / 33.33% / 33.34% (total = 100%)
    on ₹100, ₹1000, ₹999, ₹10, and ₹123.45.
    Sum of all shares must equal original expense amount exactly.
    """
    from app.services.split_engine import distribute_percentage_pennies

    pcts = [33.33, 33.33, 33.34]

    # On ₹100
    p_100 = distribute_percentage_pennies(100.0, pcts)
    assert round(sum(p_100), 2) == 100.00
    assert p_100 == [33.33, 33.33, 33.34]

    # On ₹1000
    p_1000 = distribute_percentage_pennies(1000.0, pcts)
    assert round(sum(p_1000), 2) == 1000.00
    assert p_1000 == [333.30, 333.30, 333.40]

    # On ₹999
    p_999 = distribute_percentage_pennies(999.0, pcts)
    assert round(sum(p_999), 2) == 999.00

    # On ₹10
    p_10 = distribute_percentage_pennies(10.0, pcts)
    assert round(sum(p_10), 2) == 10.00

    # On ₹123.45
    p_123_45 = distribute_percentage_pennies(123.45, pcts)
    assert round(sum(p_123_45), 2) == 123.45

def test_equal_split_all_members(auth_setup):
    """
    Requirement 2: Equal split must divide correctly.
    Alice pays 1200 for Rent, split equally among all 4 members.
    Each owes 300.
    Alice: Paid 1200, Owed 300 => Net Balance = +900
    Bob: Paid 0, Owed 300 => Net Balance = -300
    Charlie: Paid 0, Owed 300 => Net Balance = -300
    David: Paid 0, Owed 300 => Net Balance = -300
    Sum of Net Balances = 0.
    """
    group_id = auth_setup["group_id"]
    headers = auth_setup["headers"]
    members = auth_setup["members"]

    alice = next(m for m in members if "Alice" in (m["name"] or ""))

    # Create expense with split_type EQUAL
    exp_res = client.post(f"/api/v1/expenses/?group_id={group_id}", json={
        "title": "Apartment Rent",
        "amount": 1200.0,
        "category": "RENT",
        "split_type": "EQUAL",
        "paid_by_member_id": alice["id"]
    }, headers=headers)
    assert exp_res.status_code == 201

    # Check Balances
    bal_res = client.get(f"/api/v1/groups/{group_id}/balances", headers=headers)
    assert bal_res.status_code == 200
    bal_data = bal_res.json()

    balances_by_name = {m["name"]: m for m in bal_data["member_balances"]}
    
    assert balances_by_name["Alice Owner"]["total_paid"] == 1200.0
    assert balances_by_name["Alice Owner"]["total_due"] == 300.0
    assert balances_by_name["Alice Owner"]["net_balance"] == 900.0
    assert balances_by_name["Alice Owner"]["status"] == "REFUND"

    for other in ["Bob", "Charlie", "David"]:
        assert balances_by_name[other]["total_paid"] == 0.0
        assert balances_by_name[other]["total_due"] == 300.0
        assert balances_by_name[other]["net_balance"] == -300.0
        assert balances_by_name[other]["status"] == "DUE"

    # Conservation of cash: sum of net balances == 0
    total_net = sum(m["net_balance"] for m in bal_data["member_balances"])
    assert total_net == pytest.approx(0.0)

def test_different_participants_subset(auth_setup):
    """
    Requirement 1: Different expenses must be able to have different participants.
    Bob pays 600 for a meal shared only between Bob and Charlie (2 participants).
    Alice and David are NOT participants.
    """
    group_id = auth_setup["group_id"]
    headers = auth_setup["headers"]
    members = auth_setup["members"]

    bob = next(m for m in members if m["name"] == "Bob")
    charlie = next(m for m in members if m["name"] == "Charlie")

    exp_res = client.post(f"/api/v1/expenses/?group_id={group_id}", json={
        "title": "Dinner for Bob and Charlie",
        "amount": 600.0,
        "category": "SNACKS",
        "split_type": "EQUAL_CUSTOM",
        "paid_by_member_id": bob["id"],
        "splits": [
            {"member_id": bob["id"]},
            {"member_id": charlie["id"]}
        ]
    }, headers=headers)
    assert exp_res.status_code == 201

    bal_res = client.get(f"/api/v1/groups/{group_id}/balances", headers=headers)
    balances_by_name = {m["name"]: m for m in bal_res.json()["member_balances"]}

    # Bob paid 600, owes 300 => net +300
    assert balances_by_name["Bob"]["total_paid"] == 600.0
    assert balances_by_name["Bob"]["total_due"] == 300.0
    assert balances_by_name["Bob"]["net_balance"] == 300.0

    # Charlie paid 0, owes 300 => net -300
    assert balances_by_name["Charlie"]["total_paid"] == 0.0
    assert balances_by_name["Charlie"]["total_due"] == 300.0
    assert balances_by_name["Charlie"]["net_balance"] == -300.0

    # Alice and David owe 0
    assert balances_by_name["Alice Owner"]["total_due"] == 0.0
    assert balances_by_name["David"]["total_due"] == 0.0

def test_custom_exact_split_valid_and_invalid(auth_setup):
    """
    Requirement 3 & 5:
    Custom split total must exactly match expense amount.
    Invalid splits must not be saved (400 Bad Request).
    """
    group_id = auth_setup["group_id"]
    headers = auth_setup["headers"]
    members = auth_setup["members"]

    alice = next(m for m in members if "Alice" in (m["name"] or ""))
    bob = next(m for m in members if m["name"] == "Bob")

    # 1. Invalid exact split: amount is 500, but splits sum to 400 (missing 100)
    res_bad = client.post(f"/api/v1/expenses/?group_id={group_id}", json={
        "title": "Groceries Mismatched",
        "amount": 500.0,
        "category": "GROCERY",
        "split_type": "EXACT",
        "paid_by_member_id": alice["id"],
        "splits": [
            {"member_id": alice["id"], "share_amount": 200.0},
            {"member_id": bob["id"], "share_amount": 200.0}
        ]
    }, headers=headers)
    assert res_bad.status_code == 400
    assert "must exactly match expense amount" in res_bad.json()["detail"]

    # 2. Valid exact split: amount is 500, splits: Alice 350, Bob 150 (sum = 500)
    res_good = client.post(f"/api/v1/expenses/?group_id={group_id}", json={
        "title": "Groceries Exact Match",
        "amount": 500.0,
        "category": "GROCERY",
        "split_type": "EXACT",
        "paid_by_member_id": alice["id"],
        "splits": [
            {"member_id": alice["id"], "share_amount": 350.0},
            {"member_id": bob["id"], "share_amount": 150.0}
        ]
    }, headers=headers)
    assert res_good.status_code == 201

    bal_res = client.get(f"/api/v1/groups/{group_id}/balances", headers=headers)
    balances_by_name = {m["name"]: m for m in bal_res.json()["member_balances"]}

    # Alice paid 500, owes 350 => net +150
    assert balances_by_name["Alice Owner"]["net_balance"] == 150.0
    # Bob paid 0, owes 150 => net -150
    assert balances_by_name["Bob"]["net_balance"] == -150.0

def test_percentage_split_valid_and_invalid(auth_setup):
    """
    Requirement 4 & 5:
    Percentage split must total exactly 100%.
    Invalid splits must not be saved.
    """
    group_id = auth_setup["group_id"]
    headers = auth_setup["headers"]
    members = auth_setup["members"]

    alice = next(m for m in members if "Alice" in (m["name"] or ""))
    bob = next(m for m in members if m["name"] == "Bob")

    # 1. Invalid percentage split: 60% + 30% = 90%
    res_bad = client.post(f"/api/v1/expenses/?group_id={group_id}", json={
        "title": "Bad Percentage Split",
        "amount": 1000.0,
        "category": "WIFI",
        "split_type": "PERCENTAGE",
        "paid_by_member_id": alice["id"],
        "splits": [
            {"member_id": alice["id"], "percentage": 60.0},
            {"member_id": bob["id"], "percentage": 30.0}
        ]
    }, headers=headers)
    assert res_bad.status_code == 400
    assert "must equal 100%" in res_bad.json()["detail"]

    # 2. Valid percentage split: 70% and 30% = 100%
    res_good = client.post(f"/api/v1/expenses/?group_id={group_id}", json={
        "title": "WiFi 70-30",
        "amount": 1000.0,
        "category": "WIFI",
        "split_type": "PERCENTAGE",
        "paid_by_member_id": alice["id"],
        "splits": [
            {"member_id": alice["id"], "percentage": 70.0},
            {"member_id": bob["id"], "percentage": 30.0}
        ]
    }, headers=headers)
    assert res_good.status_code == 201

    bal_res = client.get(f"/api/v1/groups/{group_id}/balances", headers=headers)
    balances_by_name = {m["name"]: m for m in bal_res.json()["member_balances"]}

    # Alice paid 1000, owes 700 => net +300
    assert balances_by_name["Alice Owner"]["net_balance"] == 300.0
    # Bob paid 0, owes 300 => net -300
    assert balances_by_name["Bob"]["net_balance"] == -300.0

def test_settlement_settles_balance_to_zero(auth_setup):
    """
    Validates that recording a settlement between debtor and creditor
    brings net balances to exactly 0.00.
    """
    group_id = auth_setup["group_id"]
    headers = auth_setup["headers"]
    members = auth_setup["members"]

    alice = next(m for m in members if "Alice" in (m["name"] or ""))
    bob = next(m for m in members if m["name"] == "Bob")

    # Alice pays 400 for electricity split between Alice & Bob (200 each)
    client.post(f"/api/v1/expenses/?group_id={group_id}", json={
        "title": "Electricity",
        "amount": 400.0,
        "category": "ELECTRICITY",
        "split_type": "EXACT",
        "paid_by_member_id": alice["id"],
        "splits": [
            {"member_id": alice["id"], "share_amount": 200.0},
            {"member_id": bob["id"], "share_amount": 200.0}
        ]
    }, headers=headers)

    # Bob owes 200 to Alice
    # Bob pays 200 settlement to Alice
    settle_res = client.post(f"/api/v1/settlements/?group_id={group_id}", json={
        "payer_member_id": bob["id"],
        "payee_member_id": alice["id"],
        "amount": 200.0,
        "payment_mode": "UPI",
        "note": "Settling electricity bill"
    }, headers=headers)
    assert settle_res.status_code == 201

    # Check Balances: both should now be 0 (SETTLED)
    bal_res = client.get(f"/api/v1/groups/{group_id}/balances", headers=headers)
    balances_by_name = {m["name"]: m for m in bal_res.json()["member_balances"]}

    assert balances_by_name["Alice Owner"]["net_balance"] == 0.0
    assert balances_by_name["Alice Owner"]["status"] == "SETTLED"
    assert balances_by_name["Bob"]["net_balance"] == 0.0
    assert balances_by_name["Bob"]["status"] == "SETTLED"

def test_api_exact_sum_edge_cases(auth_setup):
    """
    End-to-End API test verifying:
    Sum of individual shares stored in DB MUST always equal original expense amount:
    - ₹100 / 3
    - ₹10 / 3
    - ₹999 / 3 with 33.33%, 33.33%, 33.34%
    """
    group_id = auth_setup["group_id"]
    headers = auth_setup["headers"]
    members = auth_setup["members"]

    alice = next(m for m in members if "Alice" in (m["name"] or ""))
    bob = next(m for m in members if m["name"] == "Bob")
    charlie = next(m for m in members if m["name"] == "Charlie")

    # 1. API equal split: ₹100 among 3 members (Alice, Bob, Charlie)
    res_100 = client.post(f"/api/v1/expenses/?group_id={group_id}", json={
        "title": "₹100 for 3 People",
        "amount": 100.0,
        "category": "SNACKS",
        "split_type": "EQUAL_CUSTOM",
        "paid_by_member_id": alice["id"],
        "splits": [
            {"member_id": alice["id"]},
            {"member_id": bob["id"]},
            {"member_id": charlie["id"]}
        ]
    }, headers=headers)
    assert res_100.status_code == 201
    splits_100 = res_100.json()["splits"]
    assert len(splits_100) == 3
    shares_100 = [sp["share_amount"] for sp in splits_100]
    assert shares_100 == [33.34, 33.33, 33.33]
    assert round(sum(shares_100), 2) == 100.00

    # 2. API equal split: ₹10 among 3 members
    res_10 = client.post(f"/api/v1/expenses/?group_id={group_id}", json={
        "title": "₹10 for 3 People",
        "amount": 10.0,
        "category": "SNACKS",
        "split_type": "EQUAL_CUSTOM",
        "paid_by_member_id": bob["id"],
        "splits": [
            {"member_id": alice["id"]},
            {"member_id": bob["id"]},
            {"member_id": charlie["id"]}
        ]
    }, headers=headers)
    assert res_10.status_code == 201
    splits_10 = res_10.json()["splits"]
    shares_10 = [sp["share_amount"] for sp in splits_10]
    assert shares_10 == [3.34, 3.33, 3.33]
    assert round(sum(shares_10), 2) == 10.00

    # 3. API percentage split: ₹999 with 33.33%, 33.33%, 33.34%
    res_999 = client.post(f"/api/v1/expenses/?group_id={group_id}", json={
        "title": "₹999 with 33.33/33.33/33.34",
        "amount": 999.0,
        "category": "SNACKS",
        "split_type": "PERCENTAGE",
        "paid_by_member_id": charlie["id"],
        "splits": [
            {"member_id": alice["id"], "percentage": 33.33},
            {"member_id": bob["id"], "percentage": 33.33},
            {"member_id": charlie["id"], "percentage": 33.34}
        ]
    }, headers=headers)
    assert res_999.status_code == 201
    splits_999 = res_999.json()["splits"]
    shares_999 = [sp["share_amount"] for sp in splits_999]
    assert round(sum(shares_999), 2) == 999.00

    # 4. Verify that total sum of net balances in the group is strictly 0.00
    bal_res = client.get(f"/api/v1/groups/{group_id}/balances", headers=headers)
    assert bal_res.status_code == 200
    balances = bal_res.json()["member_balances"]
    net_sum = round(sum(m["net_balance"] for m in balances), 2)
    assert net_sum == 0.00

