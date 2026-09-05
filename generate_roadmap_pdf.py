import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            super().showPage()
        super().save()

    def draw_page_number(self, page_count):
        if self._pageNumber == 1:
            return  # Suppress header/footer on cover/first page
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        
        # Header
        self.drawString(54, 11 * inch - 36, "MULTI-PURPOSE EXPENSE & SETTLEMENT APP — PRODUCTION ROADMAP")
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(54, 11 * inch - 42, 8.5 * inch - 54, 11 * inch - 42)
        
        # Footer
        self.line(54, 45, 8.5 * inch - 54, 45)
        self.drawString(54, 32, "Confidential & Proprietary — Engineering Architectural Blueprint")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(8.5 * inch - 54, 32, page_str)
        self.restoreState()

def build_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()
    
    # Custom Palette
    primary = colors.HexColor("#1E293B")     # Slate 800
    accent = colors.HexColor("#2563EB")      # Royal Blue 600
    secondary = colors.HexColor("#0D9488")   # Teal 600
    text_dark = colors.HexColor("#0F172A")   # Slate 900
    text_muted = colors.HexColor("#475569")  # Slate 600
    bg_light = colors.HexColor("#F8FAFC")    # Slate 50
    border_color = colors.HexColor("#E2E8F0")

    # Typography styles
    styles.add(ParagraphStyle(
        name='DocTitle',
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=primary,
        spaceAfter=6
    ))
    styles.add(ParagraphStyle(
        name='DocSubtitle',
        fontName='Helvetica',
        fontSize=11,
        leading=15,
        textColor=accent,
        spaceAfter=12
    ))
    styles.add(ParagraphStyle(
        name='SectionHeading',
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=primary,
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    ))
    styles.add(ParagraphStyle(
        name='SubSectionHeading',
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        textColor=secondary,
        spaceBefore=8,
        spaceAfter=3,
        keepWithNext=True
    ))
    styles.add(ParagraphStyle(
        name='BodyCustom',
        fontName='Helvetica',
        fontSize=8.8,
        leading=13,
        textColor=text_dark,
        spaceAfter=5
    ))
    styles.add(ParagraphStyle(
        name='BulletCustom',
        fontName='Helvetica',
        fontSize=8.5,
        leading=12.5,
        textColor=text_dark,
        leftIndent=12,
        spaceAfter=2.5
    ))
    styles.add(ParagraphStyle(
        name='CalloutText',
        fontName='Helvetica-Oblique',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#1E3A8A"),
    ))
    styles.add(ParagraphStyle(
        name='TableHead',
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white
    ))
    styles.add(ParagraphStyle(
        name='TableCell',
        fontName='Helvetica',
        fontSize=8,
        leading=10.5,
        textColor=text_dark
    ))
    styles.add(ParagraphStyle(
        name='TableCellBold',
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10.5,
        textColor=text_dark
    ))

    story = []

    # ==================== COVER / HEADER ====================
    story.append(Paragraph("UNIFIED EXPENSE & SETTLEMENT MANAGER", styles['DocTitle']))
    story.append(Paragraph("Multi-Mode Production Architecture: Mess/Hostel + Tour/Trip + Flatshare + Personal", styles['DocSubtitle']))
    story.append(HRFlowable(width="100%", thickness=2, color=accent, spaceBefore=0, spaceAfter=10))

    # Executive Summary Card
    summary_html = (
        "<b>Architectural Scope & Vision:</b> A unified production application engineered to solve real-world group "
        "and personal finance. It features a flexible <b>Group Type Engine</b> that dynamically adapts its interface: "
        "<b>(1) Mess/Hostel Mode</b> (Meal count, Bazaar rotation roster, 1-day advance duty alerts, dynamic meal rates), "
        "<b>(2) Tour & Trip Mode</b> (Instant on-the-go travel logging, multiple payers, auto 'who owes whom' minimization), "
        "<b>(3) Flatshare Mode</b> (Equal split for rent, cook salary, electricity, WiFi), and "
        "<b>(4) Personal Mode</b> (Private income & personal expense tracking)."
    )
    summary_p = Paragraph(summary_html, styles['CalloutText'])
    summary_table = Table([[summary_p]], colWidths=[504])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#EFF6FF")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#BFDBFE")),
        ('TOPPADDING', (0,0), (-1,-1), 7),
        ('BOTTOMPADDING', (0,0), (-1,-1), 7),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 8))

    # ==================== SECTION 1 ====================
    story.append(Paragraph("1. Addressing Your Exact Use Cases & Features", styles['SectionHeading']))
    
    use_cases = [
        "<b>Pre-Assigned Bazaar Roster & 1-Day Advance Reminder:</b> Managers schedule bazaar duties on a calendar. At 8:00 PM the evening before (24 hours prior), the system triggers an automated push notification & SMS alert: <i>'Reminder: Tomorrow is your Bazaar Duty!'</i> The assigned member logs their purchases directly with bill photos.",
        "<b>On-the-Fly Manager Expenses:</b> The manager can log bulk or ad-hoc expenses (Meat/Chicken, Rice bags, Spices, Gas cylinder, emergency repairs) at any instant. All members instantly receive an in-app activity feed update.",
        "<b>Invite & Group Join Mechanism:</b> Group creators generate a secure 6-character Join Code or shareable deep-link (e.g. WhatsApp). New members request access, the manager approves (or auto-joins), granting instant visibility into ledgers.",
        "<b>Tour & Trip Mode (On-the-Go Travel Settlement):</b> For vacations and outings, users create a 'Tour Group'. Any traveler logs expenses immediately (Hotels, Fuel, Food, Entry Tickets). At the end of the trip, the <i>Debt Simplification Algorithm</i> calculates exact settlements (e.g., 'Rahul pays Priya Rs 450, Amit pays Priya Rs 320').",
        "<b>Flatmates & Family Sharing:</b> Handles recurring fixed monthly expenses (Flat rent, domestic help, WiFi, groceries) with recurring automated ledger reminders.",
        "<b>Personal Expense Tracking:</b> A private sandbox mode allowing individual users to track daily personal expenditure without sharing it with group members."
    ]
    for uc in use_cases:
        story.append(Paragraph(f"• {uc}", styles['BulletCustom']))

    story.append(Spacer(1, 8))

    # ==================== SECTION 2 ====================
    story.append(Paragraph("2. Group Modes Comparison & Computation Matrix", styles['SectionHeading']))
    
    matrix_data = [
        [Paragraph("Feature / Attribute", styles['TableHead']), Paragraph("Mess / Hostel Mode", styles['TableHead']), Paragraph("Tour / Trip Mode", styles['TableHead']), Paragraph("Flat / Room Mode", styles['TableHead'])],
        [
            Paragraph("Core Splitting Logic", styles['TableCellBold']),
            Paragraph("Meal Count * Daily Meal Rate + Equal Fixed Overheads", styles['TableCell']),
            Paragraph("Equal, Exact or Percentage split per expense item", styles['TableCell']),
            Paragraph("Equal split across active flatmates for bills & rent", styles['TableCell'])
        ],
        [
            Paragraph("Duty Scheduling", styles['TableCellBold']),
            Paragraph("Bazaar Roster + 1-Day Automated Push Alert", styles['TableCell']),
            Paragraph("Not applicable (anyone logs on the fly)", styles['TableCell']),
            Paragraph("Cleaning / chore duty roster (optional)", styles['TableCell'])
        ],
        [
            Paragraph("Settlement Cycle", styles['TableCellBold']),
            Paragraph("Monthly cycle (prepaid deposit debit / credit)", styles['TableCell']),
            Paragraph("End of Trip instant settlement (Min Cash Flow)", styles['TableCell']),
            Paragraph("Monthly 1st of month rent & utility cycle", styles['TableCell'])
        ],
        [
            Paragraph("Role Hierarchy", styles['TableCellBold']),
            Paragraph("Manager (Admin) + Boarders (Members)", styles['TableCell']),
            Paragraph("Peer-to-peer (all co-travelers equal)", styles['TableCell']),
            Paragraph("Primary Tenant + Flatmates", styles['TableCell'])
        ]
    ]

    matrix_table = Table(matrix_data, colWidths=[110, 140, 130, 124])
    matrix_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, bg_light]),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(matrix_table)

    story.append(PageBreak())

    # ==================== SECTION 3 ====================
    story.append(Paragraph("3. Recommended Production Tech Stack", styles['SectionHeading']))
    
    tech_table_data = [
        [Paragraph("Component", styles['TableHead']), Paragraph("Primary Stack", styles['TableHead']), Paragraph("Why It Wins for Production", styles['TableHead'])],
        [
            Paragraph("Mobile App (Frontend)", styles['TableCellBold']),
            Paragraph("Flutter (Dart)", styles['TableCell']),
            Paragraph("Single codebase for Android & iOS. High performance 120 FPS animations, rich charts, built-in PDF generator.", styles['TableCell'])
        ],
        [
            Paragraph("Backend & Database", styles['TableCellBold']),
            Paragraph("Supabase (PostgreSQL 15+)", styles['TableCell']),
            Paragraph("Zero backend boilerplate. Built-in Phone OTP auth, Row-Level-Security (RLS), Realtime WebSocket updates, ACID compliant ledger.", styles['TableCell'])
        ],
        [
            Paragraph("Notifications & Crons", styles['TableCellBold']),
            Paragraph("Firebase FCM + Supabase pg_cron", styles['TableCell']),
            Paragraph("Automates the 1-day advance bazaar duty alert, 9 PM meal cut-off alerts, and new expense announcements.", styles['TableCell'])
        ],
        [
            Paragraph("Receipt Storage", styles['TableCellBold']),
            Paragraph("Cloudflare R2", styles['TableCell']),
            Paragraph("Zero egress bandwidth fees. Upload bill pictures and payment receipts without incurring heavy cloud costs.", styles['TableCell'])
        ],
        [
            Paragraph("Offline Sync Engine", styles['TableCellBold']),
            Paragraph("Hive / Isar (Local DB)", styles['TableCell']),
            Paragraph("Allows travelers in remote hills or managers in local vegetable markets to log expenses with zero network latency.", styles['TableCell'])
        ]
    ]

    tech_table = Table(tech_table_data, colWidths=[120, 130, 254])
    tech_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, bg_light]),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(tech_table)

    story.append(Spacer(1, 8))

    # ==================== SECTION 4 ====================
    story.append(Paragraph("4. Universal Relational Database Schema", styles['SectionHeading']))
    
    schema_data = [
        [Paragraph("Table Name", styles['TableHead']), Paragraph("Key Fields", styles['TableHead']), Paragraph("Purpose & Behavioral Rules", styles['TableHead'])],
        [
            Paragraph("groups", styles['TableCellBold']),
            Paragraph("id, title, type (MESS / TOUR / FLAT / PERSONAL), invite_code, admin_id, currency", styles['TableCell']),
            Paragraph("Stores the group entity. The 'type' enum switches the app UI dynamically between Mess, Tour, or Flat.", styles['TableCell'])
        ],
        [
            Paragraph("group_members", styles['TableCellBold']),
            Paragraph("id, group_id, user_id, role (ADMIN/MEMBER), status (PENDING/ACTIVE)", styles['TableCell']),
            Paragraph("Handles membership. Admin can approve or auto-accept invite code joiners.", styles['TableCell'])
        ],
        [
            Paragraph("bazaar_roster", styles['TableCellBold']),
            Paragraph("id, group_id, assigned_user_id, duty_date, reminder_sent (bool), status", styles['TableCell']),
            Paragraph("Mess duty calendar. Cron checks duty_date = TOMORROW and dispatches push alerts.", styles['TableCell'])
        ],
        [
            Paragraph("expenses", styles['TableCellBold']),
            Paragraph("id, group_id, payer_id, title, category, amount, date, receipt_url, split_type", styles['TableCell']),
            Paragraph("All expenses (e.g. Meat, Rice, Hotel, Fuel). Supports photo attachment & categories.", styles['TableCell'])
        ],
        [
            Paragraph("expense_splits", styles['TableCellBold']),
            Paragraph("id, expense_id, user_id, owed_amount, is_settled (bool)", styles['TableCell']),
            Paragraph("Item-level split breakdown used by Tour & Flat modes for debt reconciliation.", styles['TableCell'])
        ],
        [
            Paragraph("meal_logs", styles['TableCellBold']),
            Paragraph("id, group_id, user_id, date, breakfast (0/1), lunch (0/1), dinner (0/1)", styles['TableCell']),
            Paragraph("Specific to Mess mode. Locked daily after designated cut-off hours.", styles['TableCell'])
        ],
        [
            Paragraph("settlements", styles['TableCellBold']),
            Paragraph("id, group_id, from_user, to_user, amount, txn_proof_url, status", styles['TableCell']),
            Paragraph("Payment ledger. Records UPI payments and debt clearance receipts.", styles['TableCell'])
        ]
    ]

    schema_table = Table(schema_data, colWidths=[90, 205, 209])
    schema_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, bg_light]),
        ('TOPPADDING', (0,0), (-1,-1), 4.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4.5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(schema_table)

    story.append(PageBreak())

    # ==================== SECTION 5 ====================
    story.append(Paragraph("5. Step-by-Step 12-Week Implementation Roadmap", styles['SectionHeading']))
    
    roadmap_data = [
        [Paragraph("Phase", styles['TableHead']), Paragraph("Target Milestone", styles['TableHead']), Paragraph("Exact Engineering Tasks", styles['TableHead'])],
        [
            Paragraph("Phase 1<br/>(Weeks 1-2)", styles['TableCellBold']),
            Paragraph("UI/UX & Dynamic Modes", styles['TableCellBold']),
            Paragraph("• Figma wireframes for 3 modes (Mess, Tour, Flat)<br/>• Setup Flutter Clean Architecture + Supabase project<br/>• Database migration script execution with RLS policies", styles['TableCell'])
        ],
        [
            Paragraph("Phase 2<br/>(Weeks 3-4)", styles['TableCellBold']),
            Paragraph("Invite System & Auth", styles['TableCellBold']),
            Paragraph("• Phone OTP login & JWT session handling<br/>• Generate 6-digit Join Code + WhatsApp Invite Link<br/>• Admin approval / reject workflow for new joiners", styles['TableCell'])
        ],
        [
            Paragraph("Phase 3<br/>(Weeks 5-6)", styles['TableCellBold']),
            Paragraph("Bazaar Roster & 1-Day Alert", styles['TableCellBold']),
            Paragraph("• Calendar-based bazaar duty assignment interface<br/>• Automated cron job (pg_cron) checking tomorrow's duty<br/>• Push notification dispatch via Firebase Cloud Messaging", styles['TableCell'])
        ],
        [
            Paragraph("Phase 4<br/>(Weeks 7-8)", styles['TableCellBold']),
            Paragraph("On-the-Fly Expenses & Tours", styles['TableCellBold']),
            Paragraph("• Fast expense entry: Title, Category (Meat/Rice/Fuel), Amount, Photo<br/>• Tour Mode: Instant debt-minimization algorithm<br/>• Live in-app activity timeline for all members", styles['TableCell'])
        ],
        [
            Paragraph("Phase 5<br/>(Weeks 9-10)", styles['TableCellBold']),
            Paragraph("Meal Tracker & Settlements", styles['TableCellBold']),
            Paragraph("• Mess Mode meal check-in/out + cut-off timer<br/>• Running dynamic meal rate calculation engine<br/>• UPI Intent deep-linking (PhonePe, GPay, Paytm direct pay)", styles['TableCell'])
        ],
        [
            Paragraph("Phase 6<br/>(Weeks 11-12)", styles['TableCellBold']),
            Paragraph("PDF Export & Production Launch", styles['TableCellBold']),
            Paragraph("• 1-Click Monthly Statement & Tour Summary PDF generator<br/>• Offline caching with Hive for network resilience<br/>• Google Play Store & Apple App Store compliance & submission", styles['TableCell'])
        ]
    ]

    roadmap_table = Table(roadmap_data, colWidths=[80, 120, 304])
    roadmap_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, bg_light]),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(roadmap_table)

    story.append(Spacer(1, 10))

    # ==================== SECTION 6 ====================
    story.append(Paragraph("6. Production Debt Simplification Algorithm (Tour Mode)", styles['SectionHeading']))
    story.append(Paragraph(
        "To avoid confusing multi-way debt (e.g., 5 friends paying each other 10 different amounts), "
        "the Tour Mode utilizes a <b>Greedy Minimum Cash Flow Algorithm</b>:",
        styles['BodyCustom']
    ))

    algo_text = (
        "<b>1. Calculate Net Balance for Each Person:</b><br/>"
        "<i>Net[i] = Total_Paid_By(i) - Total_Share_Of(i)</i><br/>"
        "• If <i>Net[i] &gt; 0</i>: Person is a <b>Creditor</b> (they are owed money).<br/>"
        "• If <i>Net[i] &lt; 0</i>: Person is a <b>Debtor</b> (they owe money to the group).<br/>"
        "<b>2. Match Max Debtor with Max Creditor:</b><br/>"
        "Find the person who owes the most and the person who is owed the most. Transfer <i>Min(|Debtor|, Creditor)</i>.<br/>"
        "<b>Result:</b> Reduces 20 confusing cross-payments down to just 3 or 4 clean, direct transfers!"
    )
    algo_p = Paragraph(algo_text, styles['BodyCustom'])
    algo_table = Table([[algo_p]], colWidths=[504])
    algo_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 7),
        ('BOTTOMPADDING', (0,0), (-1,-1), 7),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(algo_table)

    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#CBD5E1"), spaceBefore=0, spaceAfter=8))
    
    closing_p = Paragraph(
        "<b>Architectural Takeaway:</b> By implementing a universal <code>groups</code> table with a <code>type</code> field, "
        "your single mobile application can be marketed not just to hostels, but also to college tour groups, flatmates, "
        "and families — multiplying your potential user base by 5x without duplicating backend code.",
        styles['CalloutText']
    )
    story.append(closing_p)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Roadmap successfully built: {filename}")

if __name__ == '__main__':
    output_pdf = os.path.join(os.getcwd(), "Unified_Expense_App_Production_Roadmap.pdf")
    build_pdf(output_pdf)
