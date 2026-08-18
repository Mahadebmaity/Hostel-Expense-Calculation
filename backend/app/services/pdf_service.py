import io
from datetime import datetime
from typing import Dict, Any, List
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.units import inch

def generate_mess_pdf_report(data: Dict[str, Any], simplified_settlements: List[Dict[str, Any]]) -> bytes:
    """
    Generates an audit-ready, beautifully styled PDF financial report for mess or group expenses.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#1e293b")
    )
    
    subtitle_style = ParagraphStyle(
        "ReportSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#64748b")
    )

    section_heading = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=16,
        textColor=colors.HexColor("#0f172a"),
        spaceBefore=12,
        spaceAfter=6
    )

    cell_style = ParagraphStyle(
        "CellText",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=11,
        textColor=colors.HexColor("#334155")
    )

    cell_bold = ParagraphStyle(
        "CellTextBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=11,
        textColor=colors.HexColor("#0f172a")
    )

    story = []

    # 1. Header & Title
    currency = data.get("currency", "INR")
    curr_symbol = "Rs. " if currency == "INR" else f"{currency} "

    story.append(Paragraph(f"🏨 {data.get('group_name', 'Mess/Hostel')} - Monthly Audit Statement", title_style))
    story.append(Paragraph(f"Generated on: {datetime.now().strftime('%d %b %Y, %I:%M %p')} | Type: {data.get('group_type', 'MESS')}", subtitle_style))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#3b82f6"), spaceBefore=2, spaceAfter=14))

    # 2. Executive Metrics Summary Grid
    summary_data = [
        [
            Paragraph("<b>Total Expenses</b>", cell_style),
            Paragraph(f"<b>{curr_symbol}{data.get('total_expenses', 0.0):,.2f}</b>", cell_bold),
            Paragraph("<b>Total Meals Consumed</b>", cell_style),
            Paragraph(f"<b>{data.get('total_meals', 0.0):.1f}</b>", cell_bold)
        ],
        [
            Paragraph("<b>Variable Grocery Cost</b>", cell_style),
            Paragraph(f"{curr_symbol}{data.get('total_variable_grocery', 0.0):,.2f}", cell_style),
            Paragraph("<b>Calculated Meal Rate</b>", cell_style),
            Paragraph(f"<b>{curr_symbol}{data.get('meal_rate', 0.0):.2f} / meal</b>", cell_bold)
        ],
        [
            Paragraph("<b>Fixed Costs (Cook/Gas/Rent)</b>", cell_style),
            Paragraph(f"{curr_symbol}{data.get('total_fixed_costs', 0.0):,.2f}", cell_style),
            Paragraph("<b>Fixed Share / Member</b>", cell_style),
            Paragraph(f"{curr_symbol}{data.get('fixed_cost_per_member', 0.0):.2f}", cell_style)
        ]
    ]

    summary_table = Table(summary_data, colWidths=[130, 130, 130, 130])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#e2e8f0")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 14))

    # 3. Detailed Member Balance Table
    story.append(Paragraph("📊 Member Breakdown & Net Balance Sheet", section_heading))
    
    headers = [
        Paragraph("<b>Member</b>", cell_bold),
        Paragraph("<b>Meals</b>", cell_bold),
        Paragraph("<b>Var. Cost</b>", cell_bold),
        Paragraph("<b>Fixed</b>", cell_bold),
        Paragraph("<b>Total Due</b>", cell_bold),
        Paragraph("<b>Total Paid</b>", cell_bold),
        Paragraph("<b>Net Balance</b>", cell_bold)
    ]

    table_rows = [headers]
    for mb in data.get("member_balances", []):
        bal = mb.get("net_balance", 0.0)
        bal_color = "#16a34a" if bal >= 0 else "#dc2626"
        bal_text = f"+{curr_symbol}{bal:.2f} (Refund)" if bal >= 0 else f"-{curr_symbol}{abs(bal):.2f} (Due)"
        
        bal_paragraph_style = ParagraphStyle(
            "BalStyle",
            parent=cell_bold,
            textColor=colors.HexColor(bal_color)
        )

        row = [
            Paragraph(f"<b>{mb.get('name', '')}</b><br/><font size=7 color='#64748b'>{mb.get('role', '')}</font>", cell_style),
            Paragraph(f"{mb.get('total_meal_units', 0.0):.1f}", cell_style),
            Paragraph(f"{curr_symbol}{mb.get('variable_cost', 0.0):.2f}", cell_style),
            Paragraph(f"{curr_symbol}{mb.get('fixed_cost', 0.0):.2f}", cell_style),
            Paragraph(f"{curr_symbol}{mb.get('total_due', 0.0):.2f}", cell_style),
            Paragraph(f"{curr_symbol}{mb.get('total_paid', 0.0):.2f}", cell_style),
            Paragraph(bal_text, bal_paragraph_style),
        ]
        table_rows.append(row)

    member_table = Table(table_rows, colWidths=[110, 50, 70, 60, 75, 75, 80])
    member_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(member_table)
    story.append(Spacer(1, 14))

    # 4. Debt Simplification Settlement Plan
    if simplified_settlements:
        story.append(Paragraph("💳 Simplified Settle-Up Instructions (Min-Cashflow Plan)", section_heading))
        settle_headers = [
            Paragraph("<b>Payer (Who Pays)</b>", cell_bold),
            Paragraph("<b>Payee (Who Receives)</b>", cell_bold),
            Paragraph("<b>UPI ID</b>", cell_bold),
            Paragraph("<b>Amount to Transfer</b>", cell_bold)
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
        
        settle_table = Table(settle_rows, colWidths=[130, 130, 130, 130])
        settle_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#e0e7ff")),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#c7d2fe")),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        story.append(settle_table)
    
    # 5. Footer note
    story.append(Spacer(1, 18))
    story.append(Paragraph("<i>This statement was automatically generated by Universal Expense & Mess Management Platform.</i>", subtitle_style))

    doc.build(story)
    return buffer.getvalue()
