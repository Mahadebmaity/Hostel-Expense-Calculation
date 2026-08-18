import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_admin_and_user_flows():
    print("\n--- 1. Testing Admin Login (admin@hostel.com / admin123) ---")
    admin_login_res = client.post("/api/v1/auth/login", json={
        "email": "admin@hostel.com",
        "password": "admin123"
    })
    assert admin_login_res.status_code == 200, f"Admin login failed: {admin_login_res.text}"
    admin_data = admin_login_res.json()
    assert admin_data["user"]["is_admin"] is True, "Admin user must have is_admin=True"
    admin_token = admin_data["access_token"]
    print("[OK] Admin logged in successfully with is_admin=True")

    print("\n--- 2. Testing Admin Stats Endpoint ---")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    stats_res = client.get("/api/v1/admin/stats", headers=admin_headers)
    assert stats_res.status_code == 200
    stats = stats_res.json()
    print(f"[OK] Platform Stats: Users={stats['total_users']}, Groups={stats['total_groups']}, Total Spent=Rs.{stats['total_expenses_amount']}")
    assert stats["total_users"] >= 1
    assert stats["total_groups"] >= 1

    print("\n--- 3. Testing Admin Users Directory Endpoint ---")
    users_res = client.get("/api/v1/admin/users", headers=admin_headers)
    assert users_res.status_code == 200
    users_list = users_res.json()
    print(f"[OK] Admin retrieved {len(users_list)} registered users:")
    for u in users_list:
        print(f"    - {u['name']} ({u['email']}) | Role={'ADMIN' if u['is_admin'] else 'USER'} | Groups: {[g['group_name'] for g in u['groups']]}")
    assert len(users_list) >= 1

    print("\n--- 4. Testing Regular User Login (rahul@example.com) ---")
    user_login_res = client.post("/api/v1/auth/login", json={
        "email": "rahul@example.com",
        "password": "password123"
    })
    assert user_login_res.status_code == 200
    user_data = user_login_res.json()
    assert user_data["user"]["is_admin"] is False, "Regular user must have is_admin=False"
    user_token = user_data["access_token"]
    print("[OK] Regular user logged in with is_admin=False")

    print("\n--- 5. Testing Regular User Forbidden from Admin Endpoints ---")
    user_headers = {"Authorization": f"Bearer {user_token}"}
    forbidden_res = client.get("/api/v1/admin/users", headers=user_headers)
    assert forbidden_res.status_code == 403, "Regular user must get 403 Forbidden on admin endpoint"
    print("[OK] Regular user successfully blocked with 403 Forbidden")

    print("\n--- 6. Testing Superadmin View of Groups ---")
    groups_res = client.get("/api/v1/groups/", headers=admin_headers)
    assert groups_res.status_code == 200
    all_groups = groups_res.json()
    print(f"[OK] Admin can see all groups: {[g['name'] for g in all_groups]}")

    print("\n>>> ALL ADMIN AND ROLE-BASED TESTS PASSED SUCCESSFULLY! <<<")

if __name__ == "__main__":
    test_admin_and_user_flows()
