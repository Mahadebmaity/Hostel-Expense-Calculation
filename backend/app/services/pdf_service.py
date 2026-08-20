import io
from datetime import datetime
from typing import Dict, Any, List
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable

def generate_mess_pdf_report(data: Dict[str, Any], simplified_settlements: List[Dict[str, Any]]) -> bytes:
    """
    Generates an audit-ready, complete PDF financial report for hostel/mess expenses.
    Includes candidate meal counts, guest meal charges, marketing done, advance deposits, total bills, and net dues/refunds.
    """
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
    
    # Custom styles
    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#0f172a")
    )
    
    subtitle_style = ParagraphStyle(
        "ReportSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#64748b")
    )

    section_heading = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=14,
        textColor=colors.HexColor("#0f172a"),
        spaceBefore=10,
        spaceAfter=4
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

    # 1. Header & Title
    currency = data.get("currency", "INR")
    curr_symbol = "Rs. " if currency == "INR" else f"{currency} "

    story.append(Paragraph(f"🏨 {data.get('group_name', 'Mess/Hostel')} - Monthly Khatabook Audit Statement", title_style))
    story.append(Paragraph(f"Generated on: {datetime.now().strftime('%d %b %Y, %I:%M %p')} | Group Type: {data.get('group_type', 'MESS')}", subtitle_style))
    story.append(Spacer(1, 6))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#2563eb"), spaceBefore=2, spaceAfter=8))

    # 2. Executive Metrics Summary Grid (3x3 Table)
    summary_data = [
        [
            Paragraph("<b>Total Expenses</b>", cell_style),
            Paragraph(f"<b>{curr_symbol}{data.get('total_expenses', 0.0):,.2f}</b>", cell_bold),
            Paragraph("<b>Est. Cost (Fixed Total)</b>", cell_style),
            Paragraph(f"{curr_symbol}{data.get('total_establishment', 0.0):,.2f}", cell_style),
            Paragraph("<b>Est. Cost / Candidate</b>", cell_style),
            Paragraph(f"<b>{curr_symbol}{data.get('establishment_per_head', 0.0):,.2f}</b>", cell_bold)
        ],
        [
            Paragraph("<b>Total Meal/Bazar Expenses</b>", cell_style),
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

    summary_table = Table(summary_data, colWidths=[110, 110, 120, 110, 110, 120])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 10))

    # 3. Detailed Candidate Scoreboard Table
    story.append(Paragraph("📋 Candidate Monthly Score Board (Khatabook Breakdown)", section_heading))
    
    headers = [
        Paragraph("<b>Sl</b>", cell_bold),
        Paragraph("<b>Candidate Name</b>", cell_bold),
        Paragraph("<b>Meals</b>", cell_bold),
        Paragraph("<b>Meal Cost</b>", cell_bold),
        Paragraph("<b>Est. Cost</b>", cell_bold),
        Paragraph("<b>Guest Cost</b>", cell_bold),
        Paragraph("<b>Marketing (Bazar)</b>", cell_bold),
        Paragraph("<b>Deposit</b>", cell_bold),
        Paragraph("<b>Total Paid</b>", cell_bold),
        Paragraph("<b>Total Bill</b>", cell_bold),
        Paragraph("<b>Net Status</b>", cell_bold)
    ]

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
        table_rows.append(row)

    member_table = Table(table_rows, colWidths=[20, 105, 45, 60, 55, 65, 80, 55, 65, 65, 80])
    member_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(member_table)
    story.append(Spacer(1, 10))

    # 4. Itemized Expenses & Marketing Breakdown
    meal_pool_items = data.get("meal_pool_breakdown", [])
    establishment_items = data.get("establishment_breakdown", [])

    if meal_pool_items or establishment_items:
        story.append(Paragraph("🛒 Marketing & Establishment Itemized Breakdown", section_heading))
        
        mkt_headers = [
            Paragraph("<b>Category / Type</b>", cell_bold),
            Paragraph("<b>Title / Description</b>", cell_bold),
            Paragraph("<b>Purchased By</b>", cell_bold),
            Paragraph("<b>Amount</b>", cell_bold)
        ]
        breakdown_rows = [mkt_headers]

        for item in establishment_items:
            breakdown_rows.append([
                Paragraph("<font color='#2563eb'>Fixed (Est)</font>", cell_style),
                Paragraph(item.get("title", ""), cell_style),
                Paragraph(item.get("payer_name", "Group Fund"), cell_style),
                Paragraph(f"{curr_symbol}{item.get('amount', 0.0):,.2f}", cell_style)
            ])

        for item in meal_pool_items:
            breakdown_rows.append([
                Paragraph("<font color='#16a34a'>Bazar Pool</font>", cell_style),
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
        story.append(Spacer(1, 10))

    # 5. Debt Simplification Settlement Matrix
    if simplified_settlements:
        story.append(Paragraph("💳 Peer-to-Peer Minimum Cashflow Settlement Matrix", section_heading))
        settle_headers = [
            Paragraph("<b>Payer (Who Owes)</b>", cell_bold),
            Paragraph("<b>Payee (Who Receives)</b>", cell_bold),
            Paragraph("<b>UPI ID</b>", cell_bold),
            Paragraph("<b>Transfer Amount</b>", cell_bold)
        ]
        settle_rows = [settle_headers]
        for tx in simplified_settlements:
            upi_display = tx.get("payee_upi_id") or "N/A"
            settle_rows.append([
                Paragraph(tx.get("payer_name", ""), cell_style),
                Paragraph(tx.get("payee_name", ""), cell_style),
                Paragraph(upi_display, cell_style),
                Paragraph(f"<b>{curr_symbol}{tx.get('amount', 0.0):,.2f}</b>", cell_bold)
            ])
        
        settle_table = Table(settle_rows, colWidths=[150, 150, 170, 130])
        settle_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#e0e7ff")),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#c7d2fe")),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(settle_table)
    
    # 6. Footer note
    story.append(Spacer(1, 12))
    story.append(Paragraph("<i>This statement was automatically generated by Hostel & Mess Expense Management Platform. All calculations match traditional Khatabook ledger math.</i>", subtitle_style))

    doc.build(story)
    return buffer.getvalue()

