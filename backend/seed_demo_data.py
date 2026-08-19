"""
Seeds realistic mess and hostel data matching traditional notebook records (May Score Board)
along with Flatmates & Tour Plan demo groups.
"""
from datetime import date, timedelta
from app.core.database import SessionLocal, Base, engine
from app.core.security import get_password_hash
from app.models.user import User
from app.models.group import Group, GroupMember
from app.models.expense import Expense
from app.models.meal import MealAttendance
from app.models.settlement import Settlement
from app.models.scoreboard import MonthlyScoreBoard

def seed_data():
    from sqlalchemy import text
    # Drop and recreate tables to ensure all updated nullable constraints and new columns are freshly structured
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    # Clear existing demo data
    db.query(MonthlyScoreBoard).delete()
    db.query(MealAttendance).delete()
    db.query(Expense).delete()
    db.query(Settlement).delete()
    db.query(GroupMember).delete()
    db.query(Group).delete()
    db.query(User).delete()
    db.commit()

    print("[*] Seeding Admin & Primary Users...")
    primary_users = [
        User(name="System Administrator", email="admin@hostel.com", phone="9876540000", upi_id="admin@okhdfc", is_admin=True, password_hash=get_password_hash("admin123")),
        User(name="Mahadeb Maity", email="mahadeb@example.com", phone="9876543210", upi_id="mahadeb@oksbi", is_admin=True, password_hash=get_password_hash("password123")),
        User(name="Biswajit Da", email="biswajit@example.com", phone="9876543211", upi_id="biswajit@okaxis", is_admin=False, password_hash=get_password_hash("password123")),
        User(name="Subhankar Da", email="subhankar@example.com", phone="9876543212", upi_id="subhankar@paytm", is_admin=False, password_hash=get_password_hash("password123")),
    ]
    for u in primary_users:
        db.add(u)
    db.commit()

    admin_user = primary_users[0]
    mahadeb_user = primary_users[1]

    print("[*] Creating Graduation Mess (15 Candidates May Score Board)...")
    mess_group = Group(
        name="Vivekananda Mess 2026",
        description="Traditional 15-member college mess with Establishment, Dynamic Meal Rate & Guest Meals",
        group_type="MESS",
        currency="INR",
        settings={
            "breakfast_weight": 0.5,
            "lunch_weight": 1.0,
            "dinner_weight": 1.0,
            "guest_rates": {"veg": 40.0, "fish": 50.0, "meat": 75.0}
        },
        created_by=mahadeb_user.id
    )
    db.add(mess_group)
    db.commit()
    db.refresh(mess_group)

    # 15 Candidates from Notebook
    # (Name, MealCount, DepositPaid, user_obj or None, guest_charge)
    candidates_info = [
        ("Biswajit Da", 54.0, 1270.0, primary_users[2], 0.0),
        ("Atanu Da", 55.0, 770.0, None, 0.0),
        ("Samar Da", 49.0, 1530.0, None, 0.0),
        ("Mahadeb", 40.0, 860.0, mahadeb_user, 0.0),
        ("Jayanta", 42.0, 951.0, None, 0.0),
        ("Tilak", 45.0, 900.0, None, 0.0),
        ("Debotosh", 46.0, 1010.0, None, 0.0),
        ("Sankhadip", 41.0, 2185.0, None, 0.0),
        ("Biswajit", 40.0, 1168.0, None, 0.0),
        ("Subhankar Da", 55.0, 905.0, primary_users[3], 465.0), # 1F(50) + 1V(40) + 5M(375) = 465/-
        ("Santanu Da", 54.0, 1574.0, None, 0.0),
        ("Indra Da", 40.0, 1220.0, None, 0.0),
        ("Dubai Da", 42.0, 1290.0, None, 0.0),
        ("Ananda Da", 52.0, 960.0, None, 0.0),
        ("Subrata Da", 45.0, 970.0, None, 0.0),
    ]

    members_created = []
    for name, meals_cnt, deposit, user_obj, g_charge in candidates_info:
        role = "MANAGER" if name == "Mahadeb" else "MEMBER"
        is_virt = "false" if user_obj else "true"
        gm = GroupMember(
            group_id=mess_group.id,
            user_id=user_obj.id if user_obj else None,
            name=name,
            email=user_obj.email if user_obj else f"{name.lower().replace(' ', '')}@mess.local",
            phone="98765" + str(10000 + len(members_created)),
            upi_id=f"{name.lower().replace(' ', '')}@upi",
            is_virtual=is_virt,
            role=role,
            initial_deposit=deposit
        )
        db.add(gm)
        members_created.append((gm, meals_cnt, g_charge))
    db.commit()

    print("[*] Adding Notebook Establishment Expenses (Total = Rs. 9,260)...")
    establishment_data = [
        ("Cook (Masi Charge)", 3450.0, "MASI", True, 20),
        ("Special Meat / Chicken Feast", 3448.0, "MEAT", True, 18),
        ("Gas Cylinder Refill", 850.0, "GAS", True, 15),
        ("Egg Crate (Establishment)", 860.0, "EGG", True, 12),
        ("Monthly Newspaper / Paper", 170.0, "PAPER", True, 5),
        ("Mess Cleaning & Others", 485.0, "ESTABLISHMENT_OTHER", True, 2),
    ]
    for title, amt, cat, is_fix, days_ago in establishment_data:
        exp = Expense(
            group_id=mess_group.id,
            paid_by=None,
            paid_by_member_id=None,
            title=title,
            amount=amt,
            category=cat,
            split_type="EQUAL",
            is_fixed_cost=is_fix,
            expense_date=date.today() - timedelta(days=days_ago)
        )
        db.add(exp)

    print("[*] Adding Notebook Mealcharge / Grocery (Gross = Rs. 13,991)...")
    meal_grocery_data = [
        ("Daily Marketing & Vegetables (Bazar)", 5438.0, "BAZAR", "MEAL_BASED", 14),
        ("Rice Sack (Chal Basta 50kg)", 4210.0, "RICE", "MEAL_BASED", 10),
        ("Grocery & Spices Store", 3138.0, "GROCERY", "MEAL_BASED", 8),
        ("Potato Sack (Alu Basta 50kg)", 1150.0, "POTATO", "MEAL_BASED", 6),
        ("Mid-week Grocery Salt & Mustard Oil", 55.0, "GROCERY", "MEAL_BASED", 3),
    ]
    for title, amt, cat, stype, days_ago in meal_grocery_data:
        exp = Expense(
            group_id=mess_group.id,
            paid_by=None,
            paid_by_member_id=None,
            title=title,
            amount=amt,
            category=cat,
            split_type=stype,
            is_fixed_cost=False,
            expense_date=date.today() - timedelta(days=days_ago)
        )
        db.add(exp)
    db.commit()

    print("[*] Recording Member Meal Counts & Guest Meal Charges...")
    ref_date = date.today() - timedelta(days=1)
    for gm, meals_cnt, g_charge in members_created:
        g_veg = 1.0 if g_charge > 0 else 0.0
        g_fish = 1.0 if g_charge > 0 else 0.0
        g_meat = 5.0 if g_charge > 0 else 0.0

        meal_att = MealAttendance(
            group_id=mess_group.id,
            member_id=gm.id,
            user_id=gm.user_id,
            record_date=ref_date,
            breakfast_count=0.0,
            lunch_count=meals_cnt, # 54, 55, 40, etc.
            dinner_count=0.0,
            guest_veg_count=g_veg,
            guest_fish_count=g_fish,
            guest_meat_count=g_meat,
            guest_charge=g_charge,
            total_units=meals_cnt
        )
        db.add(meal_att)
    db.commit()

    # Create a Flatmates & Tour Plan group
    print("[*] Creating Flatmates & Tour Trip Group...")
    flat_group = Group(
        name="Flat 402 & Goa Trip Plan",
        description="Roommates shared apartment living, groceries, gas, rent, and Goa tour expenses",
        group_type="FLATMATES",
        currency="INR",
        settings={},
        created_by=mahadeb_user.id
    )
    db.add(flat_group)
    db.commit()
    db.refresh(flat_group)

    flat_members_names = [
        ("Mahadeb Maity", mahadeb_user, 3000.0),
        ("Sourav Roy", None, 3000.0),
        ("Rahul Sharma", None, 2500.0),
        ("Amit Das", None, 2500.0)
    ]
    f_members = []
    for fname, fuser, fdep in flat_members_names:
        fm = GroupMember(
            group_id=flat_group.id,
            user_id=fuser.id if fuser else None,
            name=fname,
            email=fuser.email if fuser else f"{fname.lower().replace(' ', '')}@flat.local",
            phone="98765000" + str(len(f_members)),
            upi_id=f"{fname.lower().replace(' ', '')}@okaxis",
            is_virtual="false" if fuser else "true",
            role="MEMBER",
            initial_deposit=fdep
        )
        db.add(fm)
        f_members.append(fm)
    db.commit()

    flat_expenses = [
        ("Monthly Flat Rent Split", 14000.0, "RENT", "EQUAL", True, 0, 10),
        ("Supermarket Grocery & Dairy", 3250.0, "GROCERY", "EQUAL", False, 1, 7),
        ("HP Gas Cylinder Delivery", 980.0, "GAS", "EQUAL", True, 2, 5),
        ("High Speed WiFi 300Mbps", 899.0, "WIFI", "EQUAL", True, 3, 3),
        ("20L Drinking Water Cans (10 Cans)", 600.0, "WATER", "EQUAL", False, 0, 2),
        ("Goa Beach Resort Booking Advance", 6400.0, "HOTEL_STAY", "EQUAL", False, 0, 1),
    ]
    for title, amt, cat, stype, is_fix, payer_idx, days_ago in flat_expenses:
        exp = Expense(
            group_id=flat_group.id,
            paid_by=f_members[payer_idx].user_id,
            paid_by_member_id=f_members[payer_idx].id,
            title=title,
            amount=amt,
            category=cat,
            split_type=stype,
            is_fixed_cost=is_fix,
            expense_date=date.today() - timedelta(days=days_ago)
        )
        db.add(exp)
    db.commit()

    print("[+] All Demo Data Seeded Successfully!")
    print(f"Login Email: mahadeb@example.com | Password: password123")

if __name__ == "__main__":
    seed_data()
