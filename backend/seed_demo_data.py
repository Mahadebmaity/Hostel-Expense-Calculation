"""
Seeds realistic mess and hostel data for instant testing and demonstration.
"""
from datetime import date, timedelta
from app.core.database import SessionLocal, Base, engine
from app.core.security import get_password_hash
from app.models.user import User
from app.models.group import Group, GroupMember
from app.models.expense import Expense
from app.models.meal import MealAttendance
from app.models.settlement import Settlement
from app.services.meal_engine import compute_meal_units

def seed_data():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Clear existing demo data
    db.query(MealAttendance).delete()
    db.query(Expense).delete()
    db.query(Settlement).delete()
    db.query(GroupMember).delete()
    db.query(Group).delete()
    db.query(User).delete()
    db.commit()

    print("[*] Seeding Demo Users...")
    users = [
        User(name="Mahadeb Maity", email="mahadeb@example.com", phone="9876543210", upi_id="mahadeb@oksbi", password_hash=get_password_hash("password123")),
        User(name="Rahul Sharma", email="rahul@example.com", phone="9876543211", upi_id="rahul@okaxis", password_hash=get_password_hash("password123")),
        User(name="Sourav Roy", email="sourav@example.com", phone="9876543212", upi_id="sourav@paytm", password_hash=get_password_hash("password123")),
        User(name="Amit Das", email="amit@example.com", phone="9876543213", upi_id="amit@ybl", password_hash=get_password_hash("password123")),
        User(name="Priya Sengupta", email="priya@example.com", phone="9876543214", upi_id="priya@ibl", password_hash=get_password_hash("password123")),
    ]
    for u in users:
        db.add(u)
    db.commit()

    print("[*] Creating Mess Group & Members...")
    mess_group = Group(
        name="Royal Engineers Mess 2026",
        description="Monthly mess calculation, bazaar expenses, and utility splitting",
        group_type="MESS",
        currency="INR",
        settings={
            "breakfast_weight": 0.5,
            "lunch_weight": 1.0,
            "dinner_weight": 1.0
        },
        created_by=users[0].id
    )
    db.add(mess_group)
    db.commit()
    db.refresh(mess_group)

    deposits = [2500.0, 2000.0, 2000.0, 1500.0, 2000.0]
    roles = ["ADMIN", "MANAGER", "MEMBER", "MEMBER", "MEMBER"]
    for i, u in enumerate(users):
        member = GroupMember(
            group_id=mess_group.id,
            user_id=u.id,
            role=roles[i],
            initial_deposit=deposits[i]
        )
        db.add(member)
    db.commit()

    print("[*] Adding Mess & Utility Expenses...")
    expenses_data = [
        ("Weekly Bazaar (Rice, Dal, Oil, Spices)", 2450.0, "GROCERY", "MEAL_BASED", False, 0, 12),
        ("Fish & Chicken Market", 1680.0, "GROCERY", "MEAL_BASED", False, 1, 10),
        ("Vegetables & Egg Purchase", 920.0, "GROCERY", "MEAL_BASED", False, 2, 7),
        ("Cook Salary (Monthly)", 3500.0, "MAID", "EQUAL", True, 0, 5),
        ("Gas Cylinder Refill", 950.0, "GAS", "EQUAL", True, 1, 4),
        ("High Speed Wi-Fi Bill", 699.0, "ELECTRICITY", "EQUAL", True, 3, 2),
        ("Mid-week Fresh Veggies & Milk", 740.0, "GROCERY", "MEAL_BASED", False, 0, 1),
    ]

    for title, amt, cat, stype, is_fix, payer_idx, days_ago in expenses_data:
        exp = Expense(
            group_id=mess_group.id,
            paid_by=users[payer_idx].id,
            title=title,
            amount=amt,
            category=cat,
            split_type=stype,
            is_fixed_cost=is_fix,
            expense_date=date.today() - timedelta(days=days_ago)
        )
        db.add(exp)
    db.commit()

    print("[*] Recording Daily Meals Attendance (Past 10 days)...")
    today = date.today()
    for day_offset in range(10, 0, -1):
        rec_date = today - timedelta(days=day_offset)
        for i, u in enumerate(users):
            if i == 2 and day_offset in [5, 6, 7]:
                b, l, d = 0.0, 0.0, 0.0
            elif i == 4 and day_offset % 2 == 1:
                b, l, d = 0.0, 1.0, 1.0
            else:
                b, l, d = 1.0, 1.0, 1.0

            units = compute_meal_units(b, l, d, mess_group.settings)
            meal = MealAttendance(
                group_id=mess_group.id,
                user_id=u.id,
                record_date=rec_date,
                breakfast_count=b,
                lunch_count=l,
                dinner_count=d,
                total_units=units
            )
            db.add(meal)
    db.commit()

    print("[+] Demo Data Seeded Successfully!")
    print("Login Email: mahadeb@example.com | Password: password123")

if __name__ == "__main__":
    seed_data()
