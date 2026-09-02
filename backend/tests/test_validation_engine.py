import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.core.security import create_access_token, get_password_hash
from app.models.user import User
from app.models.group import Group, GroupMember
from app.models.expense import Expense, ExpenseSplit
from app.services.meal_engine import calculate_mess_balances

client = TestClient(app)

@pytest.fixture
def validation_setup():
    """Sets up a test group with 3 members for validation testing."""
    db = SessionLocal()
    # Clean up old test data
    old_grps = db.query(Group).filter(Group.name == "Validation Testing Squad").all()
    for g in old_grps:
        db.delete(g)
    db.commit()

    test_user = db.query(User).filter(User.email == "val_admin@test.com").first()
    if not test_user:
        test_user = User(
            name="Val Admin",
            email="val_admin@test.com",
            password_hash=get_password_hash("password123"),
            is_admin=False
        )
        db.add(test_user)
        db.commit()
        db.refresh(test_user)

    token = create_access_token(data={"sub": test_user.id})
    headers = {"Authorization": f"Bearer {token}"}

    # Create Group
    res = client.post("/api/v1/groups/", json={
        "name": "Validation Testing Squad",
        "group_type": "FLATMATES",
        "currency": "INR",
        "initial_deposit": 0.0
    }, headers=headers)
    assert res.status_code == 201
    group_id = res.json()["id"]

    # Add Members B and C
    m_b = client.post(f"/api/v1/groups/{group_id}/members", json={"name": "Member B", "role": "MEMBER"}, headers=headers)
    m_c = client.post(f"/api/v1/groups/{group_id}/members", json={"name": "Member C", "role": "MEMBER"}, headers=headers)

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

def test_amount_validation_zero_and_negative(validation_setup):
    """Verifies that zero and negative amounts are rejected."""
    group_id = validation_setup["group_id"]
    headers = validation_setup["headers"]

    # 1. Zero amount
    res_zero = client.post(f"/api/v1/expenses/?group_id={group_id}", json={
        "title": "Zero Test",
        "amount": 0.0,
        "category": "GROCERY"
    }, headers=headers)
    assert res_zero.status_code in [400, 422]

    # 2. Negative amount
    res_neg = client.post(f"/api/v1/expenses/?group_id={group_id}", json={
        "title": "Negative Test",
        "amount": -50.0,
        "category": "GROCERY"
    }, headers=headers)
    assert res_neg.status_code in [400, 422]

def test_no_participants_validation(validation_setup):
    """Verifies that custom/exact splits without participants are rejected."""
    group_id = validation_setup["group_id"]
    headers = validation_setup["headers"]

    res = client.post(f"/api/v1/expenses/?group_id={group_id}", json={
        "title": "No Participants",
        "amount": 1000.0,
        "category": "GROCERY",
        "split_type": "EXACT",
        "splits": []
    }, headers=headers)
    assert res.status_code == 400
    assert "At least one participant must be selected" in res.json()["detail"]

def test_invalid_payer_validation(validation_setup):
    """Verifies that non-member payer is rejected."""
    group_id = validation_setup["group_id"]
    headers = validation_setup["headers"]

    res = client.post(f"/api/v1/expenses/?group_id={group_id}", json={
        "title": "Invalid Payer",
        "amount": 500.0,
        "category": "GROCERY",
        "paid_by_member_id": "non_existent_member_id_123"
    }, headers=headers)
    assert res.status_code == 400
    assert "The selected payer is not a valid member of this group" in res.json()["detail"]

def test_duplicate_participants_validation(validation_setup):
    """Verifies that duplicate participants in split list are rejected."""
    group_id = validation_setup["group_id"]
    headers = validation_setup["headers"]
    members = validation_setup["members"]

    m1 = members[0]
    res = client.post(f"/api/v1/expenses/?group_id={group_id}", json={
        "title": "Duplicate Participant Test",
        "amount": 500.0,
        "category": "GROCERY",
        "split_type": "EQUAL_CUSTOM",
        "splits": [{"member_id": m1.id}, {"member_id": m1.id}]
    }, headers=headers)
    assert res.status_code == 400
    assert "Duplicate participant" in res.json()["detail"]

def test_custom_split_mismatch_user_example(validation_setup):
    """
    CRITICAL REQUIREMENT verification from prompt:
    If expense = ₹1,000
    Custom shares:
    A = ₹400
    B = ₹300
    C = ₹200
    Total = ₹900 (₹100 unallocated)
    Do not allow saving.
    Show: "₹100 is still unallocated."
    """
    group_id = validation_setup["group_id"]
    headers = validation_setup["headers"]
    members = validation_setup["members"]

    m_a, m_b, m_c = members[0], members[1], members[2]

    # Under-allocated by ₹100
    res = client.post(f"/api/v1/expenses/?group_id={group_id}", json={
        "title": "Weekend Dinner",
        "amount": 1000.0,
        "category": "GROCERY",
        "split_type": "EXACT",
        "splits": [
            {"member_id": m_a.id, "share_amount": 400.0},
            {"member_id": m_b.id, "share_amount": 300.0},
            {"member_id": m_c.id, "share_amount": 200.0}
        ]
    }, headers=headers)
    assert res.status_code == 400
    assert "₹100.00 is still unallocated." in res.json()["detail"]

    # Over-allocated by ₹200
    res_over = client.post(f"/api/v1/expenses/?group_id={group_id}", json={
        "title": "Weekend Dinner",
        "amount": 1000.0,
        "category": "GROCERY",
        "split_type": "EXACT",
        "splits": [
            {"member_id": m_a.id, "share_amount": 500.0},
            {"member_id": m_b.id, "share_amount": 400.0},
            {"member_id": m_c.id, "share_amount": 300.0}
        ]
    }, headers=headers)
    assert res_over.status_code == 400
    assert "Allocated custom shares exceed expense amount by ₹200.00." in res_over.json()["detail"]

def test_percentage_split_mismatch_user_example(validation_setup):
    """
    CRITICAL REQUIREMENT verification from prompt:
    If percentage:
    A = 40%
    B = 30%
    C = 20%
    Total = 90%
    Do not allow saving.
    Show: "Percentages must total 100%."
    """
    group_id = validation_setup["group_id"]
    headers = validation_setup["headers"]
    members = validation_setup["members"]

    m_a, m_b, m_c = members[0], members[1], members[2]

    res = client.post(f"/api/v1/expenses/?group_id={group_id}", json={
        "title": "Party Cost",
        "amount": 1000.0,
        "category": "GROCERY",
        "split_type": "PERCENTAGE",
        "splits": [
            {"member_id": m_a.id, "percentage": 40.0},
            {"member_id": m_b.id, "percentage": 30.0},
            {"member_id": m_c.id, "percentage": 20.0}
        ]
    }, headers=headers)
    assert res.status_code == 400
    assert "Percentages must total 100%" in res.json()["detail"]

def test_meal_attendance_invalid_count_validation(validation_setup):
    """Verifies that negative meal counts are rejected."""
    group_id = validation_setup["group_id"]
    headers = validation_setup["headers"]
    members = validation_setup["members"]

    res = client.post(f"/api/v1/meals/{group_id}/single", json={
        "member_id": members[0].id,
        "record_date": "2026-09-02",
        "breakfast_count": -1.0,
        "lunch_count": 1.0,
        "dinner_count": 1.0
    }, headers=headers)
    assert res.status_code in [400, 422]
