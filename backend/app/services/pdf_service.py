import io
from datetime import datetime
from typing import Dict, Any, List
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable

def generate_group_pdf_report(data: Dict[str, Any], simplified_settlements: List[Dict[str, Any]]) -> bytes:
    """
    Generates a tailored, audit-ready PDF financial statement specific to the group type:
    - MESS: Meal rates, candidate meals, guest meal charges, establishment bills, bazar marketing.
    - TRIP: Travel, lodging, tickets, per-traveler spend, and minimum cashflow matrix.
    - FLATMATES: Apartment rent, electricity, WiFi, maid wages, shared groceries, and roommate shares.
    - PERSONAL: Friends outings, restaurant bills, custom splits, and peer debt clearances.
    """
    group_type = data.get("group_type", "MESS").upper()
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        rightMargin=24,
        leftMargin=24,
        topMargin=24,
        bottomMargin=24
    )

    styles = getSampleStyleSheet()
    currency = data.get("currency", "INR")
    curr_symbol = "Rs. " if currency == "INR" else f"{currency} "

    # Theme Colors per Group Type
    theme_colors = {
        "MESS": {
            "primary": "#2563eb",      # Blue
            "accent": "#1e40af",
            "bg_subtle": "#eff6ff",
            "icon": "🏨",
            "title_suffix": "Monthly Khatabook Audit Statement",
            "badge": "College & Hostel Mess"
        },
        "TRIP": {
            "primary": "#0891b2",      # Cyan / Teal
            "accent": "#0e7490",
            "bg_subtle": "#ecfeff",
            "icon": "✈️",
            "title_suffix": "Tour & Travel Expense Audit Report",
            "badge": "Tour & Travel Splitter"
        },
        "FLATMATES": {
            "primary": "#059669",      # Emerald Green
            "accent": "#047857",
            "bg_subtle": "#ecfdf5",
            "icon": "🏠",
            "title_suffix": "Monthly Flatmates & Utilities Statement",
            "badge": "Flatmate Living"
        },
        "PERSONAL": {
            "primary": "#7c3aed",      # Purple
            "accent": "#6d28d9",
            "bg_subtle": "#f5f3ff",
            "icon": "👥",
            "title_suffix": "Friends & Outing Split Settlement Summary",
            "badge": "Friends & Personal Outings"
        }
    }

    theme = theme_colors.get(group_type, theme_colors["MESS"])
    primary_color = colors.HexColor(theme["primary"])

    # Custom styles
    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=17,
        leading=21,
        textColor=colors.HexColor("#0f172a")
    )
    
    subtitle_style = ParagraphStyle(
        "ReportSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#64748b")
    )

    section_heading = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=10.5,
        leading=13,
        textColor=colors.HexColor("#0f172a"),
        spaceBefore=8,
        spaceAfter=3
    )

    cell_style = ParagraphStyle(
        "CellText",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#334155")
    )

    cell_bold = ParagraphStyle(
        "CellTextBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#0f172a")
    )

    story = []

    # 1. Header & Title with type-specific branding
    group_name = data.get("group_name", "Group Ledger")
    story.append(Paragraph(f"{theme['icon']} {group_name} - {theme['title_suffix']}", title_style))
    story.append(Paragraph(
        f"Generated on: {datetime.now().strftime('%d %b %Y, %I:%M %p')} | Group Type: <b>{theme['badge']}</b> | Currency: {currency}", 
        subtitle_style
    ))
    story.append(Spacer(1, 4))
    story.append(HRFlowable(width="100%", thickness=1.5, color=primary_color, spaceBefore=2, spaceAfter=6))

    # 2. Executive Metrics Summary Grid (Tailored per group type)
    total_expenses = data.get("total_expenses", 0.0)
    member_count = len(data.get("member_balances", []))
    per_head = total_expenses / member_count if member_count > 0 else 0.0

    if group_type == "MESS":
        summary_data = [
            [
                Paragraph("<b>Total Expenses</b>", cell_style),
                Paragraph(f"<b>{curr_symbol}{total_expenses:,.2f}</b>", cell_bold),
                Paragraph("<b>Fixed Est. Total</b>", cell_style),
                Paragraph(f"{curr_symbol}{data.get('total_establishment', 0.0):,.2f}", cell_style),
                Paragraph("<b>Est. Cost / Head</b>", cell_style),
                Paragraph(f"<b>{curr_symbol}{data.get('establishment_per_head', 0.0):,.2f}</b>", cell_bold)
            ],
            [
                Paragraph("<b>Bazar Marketing Pool</b>", cell_style),
                Paragraph(f"{curr_symbol}{data.get('total_meal_expenses', 0.0):,.2f}", cell_style),
                Paragraph("<b>Guest Meal Deduction</b>", cell_style),
                Paragraph(f"-{curr_symbol}{data.get('guest_deduction_total', 0.0):,.2f}", cell_style),
                Paragraph("<b>Net Meal Pool</b>", cell_style),
                Paragraph(f"<b>{curr_symbol}{data.get('net_meal_pool', 0.0):,.2f}</b>", cell_bold)
            ],
            [
                Paragraph("<b>Total Candidate Meals</b>", cell_style),
                Paragraph(f"<b>{data.get('total_meals', 0.0):.1f} meals</b>", cell_bold),
                Paragraph("<b>Dynamic Meal Rate</b>", cell_style),
                Paragraph(f"<b>{curr_symbol}{data.get('meal_rate', 0.0):.4f} / meal</b>", cell_bold),
                Paragraph("<b>Total Dues / Refunds</b>", cell_style),
                Paragraph(f"Due: {curr_symbol}{data.get('total_due', 0.0):,.0f} | Ref: {curr_symbol}{data.get('total_refund', 0.0):,.0f}", cell_style)
            ]
        ]
    elif group_type == "TRIP":
        summary_data = [
            [
                Paragraph("<b>Total Trip Expenses</b>", cell_style),
                Paragraph(f"<b>{curr_symbol}{total_expenses:,.2f}</b>", cell_bold),
                Paragraph("<b>Total Travelers</b>", cell_style),
                Paragraph(f"<b>{member_count} Members</b>", cell_bold),
                Paragraph("<b>Avg Spent / Traveler</b>", cell_style),
                Paragraph(f"<b>{curr_symbol}{per_head:,.2f}</b>", cell_bold)
            ],
            [
                Paragraph("<b>Total Advance Pooled</b>", cell_style),
                Paragraph(f"{curr_symbol}{sum(m.get('initial_deposit', 0.0) for m in data.get('member_balances', [])):,.2f}", cell_style),
                Paragraph("<b>Total Outing Bills</b>", cell_style),
                Paragraph(f"{len(data.get('meal_pool_breakdown', [])) + len(data.get('establishment_breakdown', []))} Items", cell_style),
                Paragraph("<b>Settlement Balance</b>", cell_style),
                Paragraph(f"Pending: {curr_symbol}{data.get('total_due', 0.0):,.0f}", cell_bold)
            ]
        ]
    elif group_type == "FLATMATES":
        summary_data = [
            [
                Paragraph("<b>Total Monthly Expenses</b>", cell_style),
                Paragraph(f"<b>{curr_symbol}{total_expenses:,.2f}</b>", cell_bold),
                Paragraph("<b>Total Roommates</b>", cell_style),
                Paragraph(f"<b>{member_count} Roommates</b>", cell_bold),
                Paragraph("<b>Avg Share / Roommate</b>", cell_style),
                Paragraph(f"<b>{curr_symbol}{per_head:,.2f}</b>", cell_bold)
            ],
            [
                Paragraph("<b>Rent & Fixed Utilities</b>", cell_style),
                Paragraph(f"{curr_symbol}{data.get('total_establishment', 0.0):,.2f}", cell_style),
                Paragraph("<b>Shared Groceries & Food</b>", cell_style),
                Paragraph(f"{curr_symbol}{data.get('total_meal_expenses', 0.0):,.2f}", cell_style),
                Paragraph("<b>Total Dues to Clear</b>", cell_style),
                Paragraph(f"<b>{curr_symbol}{data.get('total_due', 0.0):,.0f}</b>", cell_bold)
            ]
        ]
    else: # PERSONAL / FRIENDS
        summary_data = [
            [
                Paragraph("<b>Total Outing Expenses</b>", cell_style),
                Paragraph(f"<b>{curr_symbol}{total_expenses:,.2f}</b>", cell_bold),
                Paragraph("<b>Total Friends</b>", cell_style),
                Paragraph(f"<b>{member_count} Friends</b>", cell_bold),
                Paragraph("<b>Avg Share / Friend</b>", cell_style),
                Paragraph(f"<b>{curr_symbol}{per_head:,.2f}</b>", cell_bold)
            ],
            [
                Paragraph("<b>Total Settled Amount</b>", cell_style),
                Paragraph(f"{curr_symbol}{sum(m.get('total_paid', 0.0) for m in data.get('member_balances', [])):,.2f}", cell_style),
                Paragraph("<b>Pending Debt Transfers</b>", cell_style),
                Paragraph(f"<b>{len(simplified_settlements)} Transactions</b>", cell_bold),
                Paragraph("<b>Total Unsettled Dues</b>", cell_style),
                Paragraph(f"<b>{curr_symbol}{data.get('total_due', 0.0):,.0f}</b>", cell_bold)
            ]
        ]

    summary_col_widths = [110, 110, 120, 110, 110, 120] if len(summary_data[0]) == 6 else [120, 120, 120, 120, 120, 80]
    summary_table = Table(summary_data, colWidths=summary_col_widths)
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor(theme["bg_subtle"])),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 8))

    # 3. Detailed Member Scoreboard Table (Customized columns for each type)
    if group_type == "MESS":
        table_title = "📋 Candidate Monthly Score Board (Khatabook Breakdown)"
        headers = [
            Paragraph("<b>Sl</b>", cell_bold),
            Paragraph("<b>Candidate Name</b>", cell_bold),
            Paragraph("<b>Meals</b>", cell_bold),
            Paragraph("<b>Meal Cost</b>", cell_bold),
            Paragraph("<b>Est. Cost</b>", cell_bold),
            Paragraph("<b>Guest Cost</b>", cell_bold),
            Paragraph("<b>Marketing</b>", cell_bold),
            Paragraph("<b>Deposit</b>", cell_bold),
            Paragraph("<b>Total Paid</b>", cell_bold),
            Paragraph("<b>Total Bill</b>", cell_bold),
            Paragraph("<b>Net Status</b>", cell_bold)
        ]
        col_widths = [20, 105, 45, 60, 55, 65, 80, 55, 65, 65, 80]
    elif group_type == "TRIP":
        table_title = "📋 Traveler Spend, Share & Balance Breakdown"
        headers = [
            Paragraph("<b>Sl</b>", cell_bold),
            Paragraph("<b>Traveler Name</b>", cell_bold),
            Paragraph("<b>Role</b>", cell_bold),
            Paragraph("<b>Trip Share (Due)</b>", cell_bold),
            Paragraph("<b>Bills Paid by Member</b>", cell_bold),
            Paragraph("<b>Advance Pooled</b>", cell_bold),
            Paragraph("<b>Total Contributed</b>", cell_bold),
            Paragraph("<b>Net Settlement Status</b>", cell_bold)
        ]
        col_widths = [25, 140, 70, 100, 110, 85, 105, 110]
    elif group_type == "FLATMATES":
        table_title = "📋 Roommate Rent, Utility & Grocery Share Breakdown"
        headers = [
            Paragraph("<b>Sl</b>", cell_bold),
            Paragraph("<b>Roommate Name</b>", cell_bold),
            Paragraph("<b>Role</b>", cell_bold),
            Paragraph("<b>Rent/Est Share</b>", cell_bold),
            Paragraph("<b>Grocery Share</b>", cell_bold),
            Paragraph("<b>Bills Paid</b>", cell_bold),
            Paragraph("<b>Total Paid</b>", cell_bold),
            Paragraph("<b>Total Due</b>", cell_bold),
            Paragraph("<b>Net Balance Status</b>", cell_bold)
        ]
        col_widths = [20, 130, 60, 85, 85, 85, 85, 85, 110]
    else: # PERSONAL / FRIENDS
        table_title = "📋 Friends Outing Share & Payment Breakdown"
        headers = [
            Paragraph("<b>Sl</b>", cell_bold),
            Paragraph("<b>Friend Name</b>", cell_bold),
            Paragraph("<b>Individual Share (Bill)</b>", cell_bold),
            Paragraph("<b>Paid for Group</b>", cell_bold),
            Paragraph("<b>Advance Deposit</b>", cell_bold),
            Paragraph("<b>Total Paid</b>", cell_bold),
            Paragraph("<b>Net Settlement Status</b>", cell_bold)
        ]
        col_widths = [25, 150, 110, 110, 95, 110, 145]

    story.append(Paragraph(table_title, section_heading))
    table_rows = [headers]

    for idx, mb in enumerate(data.get("member_balances", []), start=1):
        bal = mb.get("net_balance", 0.0)
        bal_color = "#16a34a" if bal >= 0 else "#dc2626"
        bal_text = f"+{curr_symbol}{bal:.0f} (Refund)" if bal >= 0 else f"-{curr_symbol}{abs(bal):.0f} (Due)"
        
        bal_paragraph_style = ParagraphStyle(
            "BalStyle",
            parent=cell_bold,
            textColor=colors.HexColor(bal_color)
        )

        mkt_amt = mb.get("marketing_amount", 0.0)
        mkt_days = mb.get("marketing_days", 0.0)
        mkt_str = f"{curr_symbol}{mkt_amt:.0f} ({mkt_days:.0f}d)" if mkt_amt > 0 else "—"

        guest_amt = mb.get("guest_cost", 0.0)
        guest_count = mb.get("guest_meal_count", 0.0)
        guest_str = f"{curr_symbol}{guest_amt:.0f} ({guest_count:.0f}m)" if guest_amt > 0 else "—"

        if group_type == "MESS":
            row = [
                Paragraph(f"{idx}", cell_style),
                Paragraph(f"<b>{mb.get('name', '')}</b><br/><font size=6.5 color='#64748b'>{mb.get('role', '')}</font>", cell_style),
                Paragraph(f"{mb.get('total_meal_units', 0.0):.1f}", cell_style),
                Paragraph(f"{curr_symbol}{mb.get('meal_cost', 0.0):.2f}", cell_style),
                Paragraph(f"{curr_symbol}{mb.get('establishment_cost', 0.0):.2f}", cell_style),
                Paragraph(guest_str, cell_style),
                Paragraph(mkt_str, cell_style),
                Paragraph(f"{curr_symbol}{mb.get('initial_deposit', 0.0):.0f}", cell_style),
                Paragraph(f"<b>{curr_symbol}{mb.get('total_paid', 0.0):.2f}</b>", cell_bold),
                Paragraph(f"<b>{curr_symbol}{mb.get('total_due', 0.0):.2f}</b>", cell_bold),
                Paragraph(bal_text, bal_paragraph_style),
            ]
        elif group_type == "TRIP":
            row = [
                Paragraph(f"{idx}", cell_style),
                Paragraph(f"<b>{mb.get('name', '')}</b>", cell_bold),
                Paragraph(f"{mb.get('role', 'Member')}", cell_style),
                Paragraph(f"<b>{curr_symbol}{mb.get('total_due', 0.0):.2f}</b>", cell_style),
                Paragraph(f"{curr_symbol}{mb.get('marketing_amount', 0.0):.2f}", cell_style),
                Paragraph(f"{curr_symbol}{mb.get('initial_deposit', 0.0):.2f}", cell_style),
                Paragraph(f"<b>{curr_symbol}{mb.get('total_paid', 0.0):.2f}</b>", cell_bold),
                Paragraph(bal_text, bal_paragraph_style),
            ]
        elif group_type == "FLATMATES":
            row = [
                Paragraph(f"{idx}", cell_style),
                Paragraph(f"<b>{mb.get('name', '')}</b>", cell_bold),
                Paragraph(f"{mb.get('role', 'Member')}", cell_style),
                Paragraph(f"{curr_symbol}{mb.get('establishment_cost', 0.0):.2f}", cell_style),
                Paragraph(f"{curr_symbol}{mb.get('meal_cost', 0.0):.2f}", cell_style),
                Paragraph(f"{curr_symbol}{mb.get('marketing_amount', 0.0):.2f}", cell_style),
                Paragraph(f"<b>{curr_symbol}{mb.get('total_paid', 0.0):.2f}</b>", cell_bold),
                Paragraph(f"<b>{curr_symbol}{mb.get('total_due', 0.0):.2f}</b>", cell_bold),
                Paragraph(bal_text, bal_paragraph_style),
            ]
        else: # PERSONAL / FRIENDS
            row = [
                Paragraph(f"{idx}", cell_style),
                Paragraph(f"<b>{mb.get('name', '')}</b>", cell_bold),
                Paragraph(f"<b>{curr_symbol}{mb.get('total_due', 0.0):.2f}</b>", cell_style),
                Paragraph(f"{curr_symbol}{mb.get('marketing_amount', 0.0):.2f}", cell_style),
                Paragraph(f"{curr_symbol}{mb.get('initial_deposit', 0.0):.2f}", cell_style),
                Paragraph(f"<b>{curr_symbol}{mb.get('total_paid', 0.0):.2f}</b>", cell_bold),
                Paragraph(bal_text, bal_paragraph_style),
            ]
        table_rows.append(row)

    member_table = Table(table_rows, colWidths=col_widths)
    member_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(member_table)
    story.append(Spacer(1, 8))

    # 4. Itemized Expenses Breakdown
    meal_pool_items = data.get("meal_pool_breakdown", [])
    establishment_items = data.get("establishment_breakdown", [])

    if meal_pool_items or establishment_items:
        section_label = "🛒 Itemized Bills & Expense Log"
        if group_type == "TRIP":
            section_label = "✈️ Itemized Travel, Hotel & Activity Expenses"
        elif group_type == "FLATMATES":
            section_label = "🏠 Itemized Rent, Utilities & Grocery Bills"
        elif group_type == "PERSONAL":
            section_label = "👥 Itemized Outing & Party Expense Receipts"

        story.append(Paragraph(section_label, section_heading))
        
        mkt_headers = [
            Paragraph("<b>Category / Type</b>", cell_bold),
            Paragraph("<b>Title / Description</b>", cell_bold),
            Paragraph("<b>Purchased / Paid By</b>", cell_bold),
            Paragraph("<b>Amount</b>", cell_bold)
        ]
        breakdown_rows = [mkt_headers]

        for item in establishment_items:
            cat_label = "Fixed (Est)" if group_type == "MESS" else "Fixed / Utility"
            breakdown_rows.append([
                Paragraph(f"<font color='{theme['primary']}'>{cat_label}</font>", cell_style),
                Paragraph(item.get("title", ""), cell_style),
                Paragraph(item.get("payer_name", "Group Fund"), cell_style),
                Paragraph(f"{curr_symbol}{item.get('amount', 0.0):,.2f}", cell_style)
            ])

        for item in meal_pool_items:
            cat_label = "Bazar Pool" if group_type == "MESS" else "Shared Bill"
            breakdown_rows.append([
                Paragraph(f"<font color='#16a34a'>{cat_label}</font>", cell_style),
                Paragraph(item.get("title", ""), cell_style),
                Paragraph(item.get("payer_name", "Group Fund"), cell_style),
                Paragraph(f"{curr_symbol}{item.get('amount', 0.0):,.2f}", cell_style)
            ])

        breakdown_table = Table(breakdown_rows, colWidths=[120, 240, 140, 100])
        breakdown_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        story.append(breakdown_table)
        story.append(Spacer(1, 8))

    # 5. Debt Simplification Settlement Matrix
    if simplified_settlements:
        story.append(Paragraph("💳 Peer-to-Peer Minimum Cashflow Settlement Matrix", section_heading))
        settle_headers = [
            Paragraph("<b>Payer (Who Owes)</b>", cell_bold),
            Paragraph("<b>Payee (Who Receives)</b>", cell_bold),
            Paragraph("<b>UPI ID for Payment</b>", cell_bold),
            Paragraph("<b>Transfer Amount</b>", cell_bold)
        ]
        settle_rows = [settle_headers]
        for tx in simplified_settlements:
            upi_display = tx.get("payee_upi_id") or "N/A"
            settle_rows.append([
                Paragraph(tx.get("payer_name", ""), cell_style),
                Paragraph(tx.get("payee_name", ""), cell_style),
                Paragraph(f"<font color='{theme['primary']}'>{upi_display}</font>", cell_style),
                Paragraph(f"<b>{curr_symbol}{tx.get('amount', 0.0):,.2f}</b>", cell_bold)
            ])
        
        settle_table = Table(settle_rows, colWidths=[150, 150, 170, 130])
        settle_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor(theme["bg_subtle"])),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#c7d2fe")),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(settle_table)
    
    # 6. Footer note
    story.append(Spacer(1, 10))
    story.append(Paragraph(
        f"<i>This statement was automatically generated by Hostel, Mess & Group Expense Platform for {theme['badge']}. All calculations follow verified accounting ledger formulas.</i>", 
        subtitle_style
    ))

    def draw_watermark_and_footer(canvas, doc):
        canvas.saveState()
        # 1. Elegant diagonal website name watermark
        canvas.setFont("Helvetica-Bold", 46)
        canvas.setFillColor(colors.HexColor("#0f172a"), alpha=0.04)
        canvas.translate(doc.pagesize[0] / 2.0, doc.pagesize[1] / 2.0)
        canvas.rotate(32)
        canvas.drawCentredString(0, 15, "MESS & EXPENSE SPLITTER")
        canvas.setFont("Helvetica", 15)
        canvas.drawCentredString(0, -18, "HOSTEL • TOURS • FLATMATES • EXPENSE MANAGER")
        canvas.restoreState()

        # 2. Bottom footer timestamp and page counter
        canvas.saveState()
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(colors.HexColor("#64748b"))
        canvas.drawString(24, 12, f"Mess & Expense Splitter • Khatabook Audit Statement • {datetime.now().strftime('%d %b %Y, %I:%M %p')}")
        canvas.drawRightString(doc.pagesize[0] - 24, 12, f"Page {canvas.getPageNumber()} • Official Report")
        canvas.restoreState()

    doc.build(story, onFirstPage=draw_watermark_and_footer, onLaterPages=draw_watermark_and_footer)
    return buffer.getvalue()

# Backward compatibility alias
def generate_mess_pdf_report(data: Dict[str, Any], simplified_settlements: List[Dict[str, Any]]) -> bytes:
    return generate_group_pdf_report(data, simplified_settlements)

def get_demo_bundle(demo_type: str) -> tuple[Dict[str, Any], List[Dict[str, Any]]]:
    """Provides realistic sample data for 4 group calculation types."""
    dtype = (demo_type or "MESS").upper()

    if dtype == "TRIP":
        data = {
            "group_id": "demo-trip-101",
            "group_name": "Goa Beach & Dudhsagar Trip 🌴",
            "group_type": "TRIP",
            "currency": "INR",
            "total_bazar": 0.0,
            "total_establishment": 0.0,
            "total_expenses": 58800.0,
            "total_meals": 0.0,
            "meal_rate": 0.0,
            "establishment_per_head": 0.0,
            "total_collected": 20000.0,
            "total_due": 38800.0,
            "member_balances": [
                {
                    "member_id": "m1",
                    "name": "Rohan Sen (Flight & Cab)",
                    "role": "MEMBER",
                    "is_virtual": False,
                    "total_meal_units": 0,
                    "meal_cost": 0.0,
                    "establishment_cost": 0.0,
                    "guest_cost": 0.0,
                    "total_due": 14700.0,
                    "initial_deposit": 5000.0,
                    "marketing_amount": 24000.0,
                    "marketing_days": 0,
                    "total_paid": 29000.0,
                    "net_balance": 14300.0
                },
                {
                    "member_id": "m2",
                    "name": "Anik Mukherjee (Beach Resort)",
                    "role": "MEMBER",
                    "is_virtual": False,
                    "total_meal_units": 0,
                    "meal_cost": 0.0,
                    "establishment_cost": 0.0,
                    "guest_cost": 0.0,
                    "total_due": 14700.0,
                    "initial_deposit": 5000.0,
                    "marketing_amount": 18000.0,
                    "marketing_days": 0,
                    "total_paid": 23000.0,
                    "net_balance": 8300.0
                },
                {
                    "member_id": "m3",
                    "name": "Sayan Banerjee (Scuba & Sports)",
                    "role": "MEMBER",
                    "is_virtual": False,
                    "total_meal_units": 0,
                    "meal_cost": 0.0,
                    "establishment_cost": 0.0,
                    "guest_cost": 0.0,
                    "total_due": 14700.0,
                    "initial_deposit": 5000.0,
                    "marketing_amount": 8800.0,
                    "marketing_days": 0,
                    "total_paid": 13800.0,
                    "net_balance": -900.0
                },
                {
                    "member_id": "m4",
                    "name": "Pritam Dutta (Dinner & Drinks)",
                    "role": "MEMBER",
                    "is_virtual": False,
                    "total_meal_units": 0,
                    "meal_cost": 0.0,
                    "establishment_cost": 0.0,
                    "guest_cost": 0.0,
                    "total_due": 14700.0,
                    "initial_deposit": 5000.0,
                    "marketing_amount": 8000.0,
                    "marketing_days": 0,
                    "total_paid": 13000.0,
                    "net_balance": -21700.0
                }
            ]
        }
        settlements = [
            {"payer_id": "m4", "payer_name": "Pritam Dutta", "payee_id": "m1", "payee_name": "Rohan Sen", "payee_upi_id": "rohan@okhdfcbank", "amount": 14300.0},
            {"payer_id": "m4", "payer_name": "Pritam Dutta", "payee_id": "m2", "payee_name": "Anik Mukherjee", "payee_upi_id": "anik@icici", "amount": 7400.0},
            {"payer_id": "m3", "payer_name": "Sayan Banerjee", "payee_id": "m2", "payee_name": "Anik Mukherjee", "payee_upi_id": "anik@icici", "amount": 900.0}
        ]
        return data, settlements

    elif dtype == "FLATMATES":
        data = {
            "group_id": "demo-flat-102",
            "group_name": "Palm Meadows 3BHK Flat (Flat 402)",
            "group_type": "FLATMATES",
            "currency": "INR",
            "total_bazar": 0.0,
            "total_establishment": 0.0,
            "total_expenses": 36900.0,
            "total_meals": 0.0,
            "meal_rate": 0.0,
            "establishment_per_head": 0.0,
            "total_collected": 0.0,
            "total_due": 36900.0,
            "member_balances": [
                {
                    "member_id": "f1",
                    "name": "Ayan Chatterjee (Flat Rent)",
                    "role": "ADMIN",
                    "is_virtual": False,
                    "total_meal_units": 0,
                    "meal_cost": 0.0,
                    "establishment_cost": 0.0,
                    "guest_cost": 0.0,
                    "total_due": 12300.0,
                    "initial_deposit": 0.0,
                    "marketing_amount": 24000.0,
                    "marketing_days": 0,
                    "total_paid": 24000.0,
                    "net_balance": 11700.0
                },
                {
                    "member_id": "f2",
                    "name": "Sourav Ganguly (Maid & WiFi)",
                    "role": "MEMBER",
                    "is_virtual": False,
                    "total_meal_units": 0,
                    "meal_cost": 0.0,
                    "establishment_cost": 0.0,
                    "guest_cost": 0.0,
                    "total_due": 12300.0,
                    "initial_deposit": 0.0,
                    "marketing_amount": 6500.0,
                    "marketing_days": 0,
                    "total_paid": 6500.0,
                    "net_balance": -5800.0
                },
                {
                    "member_id": "f3",
                    "name": "Debjit Paul (Electricity & Groceries)",
                    "role": "MEMBER",
                    "is_virtual": False,
                    "total_meal_units": 0,
                    "meal_cost": 0.0,
                    "establishment_cost": 0.0,
                    "guest_cost": 0.0,
                    "total_due": 12300.0,
                    "initial_deposit": 0.0,
                    "marketing_amount": 6400.0,
                    "marketing_days": 0,
                    "total_paid": 6400.0,
                    "net_balance": -5900.0
                }
            ]
        }
        settlements = [
            {"payer_id": "f2", "payer_name": "Sourav Ganguly", "payee_id": "f1", "payee_name": "Ayan Chatterjee", "payee_upi_id": "ayan@paytm", "amount": 5800.0},
            {"payer_id": "f3", "payer_name": "Debjit Paul", "payee_id": "f1", "payee_name": "Ayan Chatterjee", "payee_upi_id": "ayan@paytm", "amount": 5900.0}
        ]
        return data, settlements

    elif dtype == "PERSONAL":
        data = {
            "group_id": "demo-personal-103",
            "group_name": "College Friends Weekend Outing 🎉",
            "group_type": "PERSONAL",
            "currency": "INR",
            "total_bazar": 0.0,
            "total_establishment": 0.0,
            "total_expenses": 8400.0,
            "total_meals": 0.0,
            "meal_rate": 0.0,
            "establishment_per_head": 0.0,
            "total_collected": 0.0,
            "total_due": 8400.0,
            "member_balances": [
                {
                    "member_id": "p1",
                    "name": "Arnab Roy (Barbeque Dinner)",
                    "role": "ADMIN",
                    "is_virtual": False,
                    "total_meal_units": 0,
                    "meal_cost": 0.0,
                    "establishment_cost": 0.0,
                    "guest_cost": 0.0,
                    "total_due": 2100.0,
                    "initial_deposit": 0.0,
                    "marketing_amount": 4800.0,
                    "marketing_days": 0,
                    "total_paid": 4800.0,
                    "net_balance": 2700.0
                },
                {
                    "member_id": "p2",
                    "name": "Nilanjan Mitra (IMAX Tickets)",
                    "role": "MEMBER",
                    "is_virtual": False,
                    "total_meal_units": 0,
                    "meal_cost": 0.0,
                    "establishment_cost": 0.0,
                    "guest_cost": 0.0,
                    "total_due": 2100.0,
                    "initial_deposit": 0.0,
                    "marketing_amount": 2000.0,
                    "marketing_days": 0,
                    "total_paid": 2000.0,
                    "net_balance": -100.0
                },
                {
                    "member_id": "p3",
                    "name": "Tanmoy Paul (Coffee & Snacks)",
                    "role": "MEMBER",
                    "is_virtual": False,
                    "total_meal_units": 0,
                    "meal_cost": 0.0,
                    "establishment_cost": 0.0,
                    "guest_cost": 0.0,
                    "total_due": 2100.0,
                    "initial_deposit": 0.0,
                    "marketing_amount": 1600.0,
                    "marketing_days": 0,
                    "total_paid": 1600.0,
                    "net_balance": -500.0
                },
                {
                    "member_id": "p4",
                    "name": "Suman Roy",
                    "role": "MEMBER",
                    "is_virtual": False,
                    "total_meal_units": 0,
                    "meal_cost": 0.0,
                    "establishment_cost": 0.0,
                    "guest_cost": 0.0,
                    "total_due": 2100.0,
                    "initial_deposit": 0.0,
                    "marketing_amount": 0.0,
                    "marketing_days": 0,
                    "total_paid": 0.0,
                    "net_balance": -2100.0
                }
            ]
        }
        settlements = [
            {"payer_id": "p4", "payer_name": "Suman Roy", "payee_id": "p1", "payee_name": "Arnab Roy", "payee_upi_id": "arnab@ybl", "amount": 2100.0},
            {"payer_id": "p3", "payer_name": "Tanmoy Paul", "payee_id": "p1", "payee_name": "Arnab Roy", "payee_upi_id": "arnab@ybl", "amount": 500.0},
            {"payer_id": "p2", "payer_name": "Nilanjan Mitra", "payee_id": "p1", "payee_name": "Arnab Roy", "payee_upi_id": "arnab@ybl", "amount": 100.0}
        ]
        return data, settlements

    # Default: MESS
    data = {
        "group_id": "demo-mess-100",
        "group_name": "Maa Tara Boys Hostel (March 2026)",
        "group_type": "MESS",
        "currency": "INR",
        "total_bazar": 13850.0,
        "total_establishment": 4200.0,
        "total_expenses": 18050.0,
        "total_meals": 210.0,
        "meal_rate": 65.95,
        "establishment_per_head": 1050.0,
        "total_collected": 15500.0,
        "total_due": 18495.0,
        "member_balances": [
            {
                "member_id": "m1",
                "name": "Subhadip Roy (Manager)",
                "role": "MANAGER",
                "is_virtual": False,
                "total_meal_units": 56,
                "meal_cost": 3693.2,
                "establishment_cost": 1050.0,
                "guest_cost": 150.0,
                "total_due": 4893.2,
                "initial_deposit": 4000.0,
                "marketing_amount": 4500.0,
                "marketing_days": 8,
                "total_paid": 8500.0,
                "net_balance": 3606.8
            },
            {
                "member_id": "m2",
                "name": "Rahul Karmakar",
                "role": "MEMBER",
                "is_virtual": False,
                "total_meal_units": 52,
                "meal_cost": 3429.4,
                "establishment_cost": 1050.0,
                "guest_cost": 0.0,
                "total_due": 4479.4,
                "initial_deposit": 3500.0,
                "marketing_amount": 3200.0,
                "marketing_days": 5,
                "total_paid": 6700.0,
                "net_balance": 2220.6
            },
            {
                "member_id": "m3",
                "name": "Biswajit Das",
                "role": "MEMBER",
                "is_virtual": False,
                "total_meal_units": 58,
                "meal_cost": 3825.1,
                "establishment_cost": 1050.0,
                "guest_cost": 220.0,
                "total_due": 5095.1,
                "initial_deposit": 4000.0,
                "marketing_amount": 6150.0,
                "marketing_days": 11,
                "total_paid": 10150.0,
                "net_balance": 5054.9
            },
            {
                "member_id": "m4",
                "name": "Joydeb Ghosh",
                "role": "MEMBER",
                "is_virtual": False,
                "total_meal_units": 44,
                "meal_cost": 2901.8,
                "establishment_cost": 1050.0,
                "guest_cost": 75.0,
                "total_due": 4026.8,
                "initial_deposit": 3000.0,
                "marketing_amount": 0.0,
                "marketing_days": 0,
                "total_paid": 3000.0,
                "net_balance": -1026.8
            }
        ]
    }
    settlements = [
        {"payer_id": "m4", "payer_name": "Joydeb Ghosh", "payee_id": "m3", "payee_name": "Biswajit Das", "payee_upi_id": "biswajit@ybl", "amount": 1026.8}
    ]
    return data, settlements

def generate_demo_pdf(demo_type: str) -> bytes:
    """Generates an instant binary PDF for any of the 4 demo types."""
    data, settlements = get_demo_bundle(demo_type)
    return generate_group_pdf_report(data, settlements)

