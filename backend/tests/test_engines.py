import pytest
from app.services.meal_engine import compute_meal_units
from app.services.split_engine import simplify_debts
from app.services.upi_service import generate_upi_uri, generate_upi_qr_code
from app.services.pdf_service import generate_mess_pdf_report

def test_custom_meal_units_calculation():
    settings = {"breakfast_weight": 0.5, "lunch_weight": 1.0, "dinner_weight": 1.0}
    
    # Full day (1 breakfast, 1 lunch, 1 dinner) = 0.5 + 1.0 + 1.0 = 2.5
    units = compute_meal_units(1, 1, 1, settings)
    assert units == 2.5

    # 2 lunches (1 guest) + 1 dinner = 2.0 + 1.0 = 3.0
    units_guest = compute_meal_units(0, 2, 1, settings)
    assert units_guest == 3.0

def test_debt_simplification_algorithm():
    # 4 people net balances:
    # A owes 500 (balance = -500)
    # B owes 300 (balance = -300)
    # C is owed 600 (balance = +600)
    # D is owed 200 (balance = +200)
    # Total sum = 0 (Conservation of cash)
    member_balances = [
        {"user_id": "u1", "name": "A", "upi_id": "a@upi", "net_balance": -500.0},
        {"user_id": "u2", "name": "B", "upi_id": "b@upi", "net_balance": -300.0},
        {"user_id": "u3", "name": "C", "upi_id": "c@upi", "net_balance": 600.0},
        {"user_id": "u4", "name": "D", "upi_id": "d@upi", "net_balance": 200.0},
    ]

    transactions = simplify_debts(member_balances)

    # Simplified transactions should be <= 3 (N-1)
    assert len(transactions) <= 3
    
    # Check total amount transacted equals total debt = 800
    total_transacted = sum(t["amount"] for t in transactions)
    assert total_transacted == pytest.approx(800.0)

def test_upi_uri_and_qr_generation():
    uri = generate_upi_uri("mahadeb@oksbi", "Mahadeb Maity", 1450.50, "Mess Bill")
    assert "upi://pay?" in uri
    assert "pa=mahadeb%40oksbi" in uri or "pa=mahadeb@oksbi" in uri
    assert "am=1450.50" in uri

    qr_base64 = generate_upi_qr_code(uri)
    assert qr_base64.startswith("data:image/png;base64,")

def test_pdf_generation():
    dummy_data = {
        "group_name": "Test Hostel",
        "group_type": "MESS",
        "currency": "INR",
        "total_expenses": 5000.0,
        "total_variable_grocery": 3000.0,
        "total_fixed_costs": 2000.0,
        "total_meals": 100.0,
        "meal_rate": 30.0,
        "fixed_cost_per_member": 500.0,
        "member_balances": [
            {
                "name": "Member 1",
                "role": "MEMBER",
                "total_meal_units": 30.0,
                "variable_cost": 900.0,
                "fixed_cost": 500.0,
                "total_due": 1400.0,
                "total_paid": 2000.0,
                "net_balance": 600.0,
            }
        ]
    }
    simplified = [
        {"payer_name": "Member 2", "payee_name": "Member 1", "payee_upi_id": "m1@upi", "amount": 600.0}
    ]
    pdf_bytes = generate_mess_pdf_report(dummy_data, simplified)
    assert len(pdf_bytes) > 1000
    assert pdf_bytes.startswith(b"%PDF")
