import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.core.security import create_access_token, get_password_hash
from app.models.user import User
from app.models.group import Group

client = TestClient(app)

@pytest.fixture
def test_user():
    db = SessionLocal()
    user = db.query(User).filter(User.email == "test_group_owner@example.com").first()
    if not user:
        user = User(
            name="Test Owner",
            email="test_group_owner@example.com",
            password_hash=get_password_hash("password123"),
            is_admin=False
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    db.close()
    return user

def test_prevent_duplicate_group_creation(test_user):
    token = create_access_token(data={"sub": test_user.id})
    headers = {"Authorization": f"Bearer {token}"}

    group_name = "Unique Mess 2026"

    # 1. First creation should succeed
    res1 = client.post("/api/v1/groups/", json={
        "name": group_name,
        "group_type": "MESS"
    }, headers=headers)
    
    assert res1.status_code in [201, 400]
    if res1.status_code == 201:
        created_group = res1.json()
        assert created_group["name"] == group_name

        # 2. Creating group with same name (exact match) should fail with 400
        res2 = client.post("/api/v1/groups/", json={
            "name": group_name,
            "group_type": "MESS"
        }, headers=headers)
        assert res2.status_code == 400
        assert "already exists" in res2.json()["detail"]

        # 3. Creating group with same name (case-insensitive match "unique mess 2026") should also fail
        res3 = client.post("/api/v1/groups/", json={
            "name": group_name.lower(),
            "group_type": "MESS"
        }, headers=headers)
        assert res3.status_code == 400
        assert "already exists" in res3.json()["detail"]

        # 4. Clean up: Delete created group
        group_id = created_group["id"]
        res_del = client.delete(f"/api/v1/groups/{group_id}", headers=headers)
        assert res_del.status_code == 200

        # 5. After deletion, creation with same name should succeed again
        res4 = client.post("/api/v1/groups/", json={
            "name": group_name,
            "group_type": "MESS"
        }, headers=headers)
        assert res4.status_code == 201
        
        # Clean up second creation
        client.delete(f"/api/v1/groups/{res4.json()['id']}", headers=headers)
