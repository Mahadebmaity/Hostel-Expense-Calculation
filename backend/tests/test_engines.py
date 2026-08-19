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

def test_notebook_may_score_board_calculation():
    """Validates the exact handwritten May Score Board calculations."""
    from app.core.database import SessionLocal
    from app.models.group import Group
    from app.services.meal_engine import calculate_mess_balances

    db = SessionLocal()
    try:
        group = db.query(Group).filter(Group.name == "Vivekananda Mess 2026").first()
        assert group is not None

        data = calculate_mess_balances(db, group)
        
        # 1. Establishment check: 9260 / 15 = 617.33
        assert data["total_establishment"] == pytest.approx(9260.0, 1.0)
        assert data["establishment_per_head"] == pytest.approx(617.33, 0.05)

        # 2. Meal Pool check: 13991 gross - 465 guest = 13526 net
        assert data["guest_deduction_total"] == pytest.approx(465.0, 0.5)
        assert data["net_meal_pool"] == pytest.approx(13526.0, 1.0)
        assert data["total_meals"] == pytest.approx(700.0, 0.5)
        assert data["meal_rate"] == pytest.approx(19.32, 0.05)

        # 3. Individual balance checks against notebook
        mb_by_name = {m["name"]: m for m in data["member_balances"]}
        
        # Sankhadip: (19.32 * 41) + 617.33 = 1409.45, paid 2185 => 775 Refund
        assert mb_by_name["Sankhadip"]["status"] == "REFUND"
        assert mb_by_name["Sankhadip"]["refund_amount"] == pytest.approx(775.0, 2.0)

        # Mahadeb: (19.32 * 40) + 617.33 = 1390.13, paid 860 => 530 Due
        m_mahadeb = mb_by_name.get("Mahadeb") or mb_by_name.get("Mahadeb Maity")
        assert m_mahadeb is not None
        assert m_mahadeb["status"] == "DUE"
        assert m_mahadeb["due_amount"] == pytest.approx(530.0, 2.0)

        # Subhankar Da: (19.32 * 55) + 617.33 + 465 (guest) = 2145, paid 905 => 1240 Due
        assert mb_by_name["Subhankar Da"]["guest_cost"] == pytest.approx(465.0, 0.5)
        assert mb_by_name["Subhankar Da"]["due_amount"] == pytest.approx(1240.0, 2.0)

        # Biswajit Da: (19.32 * 54) + 617.33 = 1661, paid 1270 => 391 Due
        assert mb_by_name["Biswajit Da"]["due_amount"] == pytest.approx(391.0, 2.0)
    finally:
        db.close()

