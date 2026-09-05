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
            return  # Suppress on cover
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        
        # Running Header
        self.drawString(54, 11 * inch - 36, "FROM SCRATCH TO PRODUCTION DEPLOYMENT — THE COMPLETE HANDBOOK")
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(54, 11 * inch - 42, 8.5 * inch - 54, 11 * inch - 42)
        
        # Running Footer
        self.line(54, 45, 8.5 * inch - 54, 45)
        self.drawString(54, 32, "Production Engineering Guide — Architecture, Security, Compliance & Release")
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
    primary = colors.HexColor("#0F172A")     # Slate 900
    accent = colors.HexColor("#2563EB")      # Blue 600
    emerald = colors.HexColor("#059669")     # Emerald 600
    amber = colors.HexColor("#D97706")       # Amber 600
    text_dark = colors.HexColor("#1E293B")   # Slate 800
    bg_light = colors.HexColor("#F8FAFC")    # Slate 50
    border_color = colors.HexColor("#E2E8F0")

    styles.add(ParagraphStyle(
        name='DocTitle',
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=primary,
        spaceAfter=5
    ))
    styles.add(ParagraphStyle(
        name='DocSubtitle',
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=accent,
        spaceAfter=10
    ))
    styles.add(ParagraphStyle(
        name='SectionHeading',
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=primary,
        spaceBefore=10,
        spaceAfter=5,
        keepWithNext=True
    ))
    styles.add(ParagraphStyle(
        name='SubSectionHeading',
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=13,
        textColor=emerald,
        spaceBefore=7,
        spaceAfter=3,
        keepWithNext=True
    ))
    styles.add(ParagraphStyle(
        name='BodyCustom',
        fontName='Helvetica',
        fontSize=8.5,
        leading=12.5,
        textColor=text_dark,
        spaceAfter=4
    ))
    styles.add(ParagraphStyle(
        name='BulletCustom',
        fontName='Helvetica',
        fontSize=8.2,
        leading=12,
        textColor=text_dark,
        leftIndent=12,
        spaceAfter=2.5
    ))
    styles.add(ParagraphStyle(
        name='WarningCallout',
        fontName='Helvetica',
        fontSize=8.2,
        leading=11.5,
        textColor=colors.HexColor("#991B1B")
    ))
    styles.add(ParagraphStyle(
        name='TableHead',
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10.5,
        textColor=colors.white
    ))
    styles.add(ParagraphStyle(
        name='TableCell',
        fontName='Helvetica',
        fontSize=7.8,
        leading=10.5,
        textColor=text_dark
    ))
    styles.add(ParagraphStyle(
        name='TableCellBold',
        fontName='Helvetica-Bold',
        fontSize=7.8,
        leading=10.5,
        textColor=text_dark
    ))

    story = []

    # ==================== COVER HEADER ====================
    story.append(Paragraph("FROM SCRATCH TO PRODUCTION DEPLOYMENT", styles['DocTitle']))
    story.append(Paragraph("The Definitive End-to-End Handbook: Architecture, Development, Security, Compliance & App Store Launch", styles['DocSubtitle']))
    story.append(HRFlowable(width="100%", thickness=2, color=accent, spaceBefore=0, spaceAfter=8))

    # Executive Overview
    overview_text = (
        "<b>Handbook Objective:</b> Building an application for local testing is easy; releasing a stable, "
        "secure, scalable application to Google Play Store and Apple App Store requires a rigorous engineering workflow. "
        "This guide walks you through every single phase—from initializing the Git repo to signing production keystores, "
        "passing Google Play's 14-day closed testing requirement, configuring background push crons, and setting up post-launch monitoring."
    )
    p_box = Paragraph(overview_text, styles['BodyCustom'])
    t_box = Table([[p_box]], colWidths=[504])
    t_box.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#EFF6FF")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#BFDBFE")),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 9),
        ('RIGHTPADDING', (0,0), (-1,-1), 9),
    ]))
    story.append(t_box)
    story.append(Spacer(1, 8))

    # ==================== STAGE 1 ====================
    story.append(Paragraph("Stage 1: Project Scaffolding & Architecture (Day 1 - Week 2)", styles['SectionHeading']))
    story.append(Paragraph("A clean architecture created on Day 1 prevents disastrous refactors later as features expand:", styles['BodyCustom']))
    
    s1_points = [
        "<b>Flutter Clean Architecture (Feature-First):</b> Organize code into <code>lib/features/{auth, meal, expense, tour, settlement}/</code>. Inside each feature, enforce three strict layers: <i>presentation/</i> (UI widgets & controllers), <i>domain/</i> (business models & calculation entities), and <i>data/</i> (repositories & API data sources).",
        "<b>Multi-Environment Configuration:</b> Never hardcode backend URLs or API keys. Create three flavors/environments: <code>.env.development</code>, <code>.env.staging</code>, and <code>.env.production</code> using <code>flutter_dotenv</code>.",
        "<b>State Management (Riverpod):</b> Use <code>flutter_riverpod</code> with code generation (<code>@riverpod</code>). Ensures reactive UI updates when meal counts change, without wasteful full-page rebuilds.",
        "<b>Repository Setup:</b> Initialize Git with a robust <code>.gitignore</code> (ignoring <code>.env</code>, Android keystores, iOS provisioning profiles, and local build caches)."
    ]
    for pt in s1_points:
        story.append(Paragraph(f"• {pt}", styles['BulletCustom']))

    story.append(Spacer(1, 6))

    # ==================== STAGE 2 ====================
    story.append(Paragraph("Stage 2: Database Design, RLS & Financial Immutability (Weeks 3-4)", styles['SectionHeading']))
    story.append(Paragraph("Financial and mess data requires strict integrity constraints to prevent balance discrepancies:", styles['BodyCustom']))

    s2_points = [
        "<b>Row Level Security (RLS) Isolation:</b> Enable RLS on every table. Write Postgres policies ensuring: <code>auth.uid() IN (SELECT user_id FROM group_members WHERE group_id = table.group_id)</code>. This guarantees 100% data isolation between hostels.",
        "<b>Atomic Database Transactions:</b> Balance updates and month-end settlement freezes must execute inside SQL transactions (<code>BEGIN ... COMMIT</code>). Partial writes (e.g. money debited but not credited) must rollback automatically.",
        "<b>Receipt Storage (Cloudflare R2):</b> Set up an S3-compatible R2 bucket with private access. Store receipts using deterministic keys: <code>receipts/{group_id}/{year_month}/{expense_id}.webp</code>. Compress images on-device to WebP (&lt;200KB) before upload.",
        "<b>Database Migrations via Supabase CLI:</b> Manage schema evolution with version-controlled SQL files (<code>supabase migration new add_bazaar_roster</code>) rather than editing tables via web UI."
    ]
    for pt in s2_points:
        story.append(Paragraph(f"• {pt}", styles['BulletCustom']))

    story.append(Spacer(1, 6))

    # ==================== STAGE 3 ====================
    story.append(Paragraph("Stage 3: Background Automation & Push Notifications (Weeks 5-6)", styles['SectionHeading']))
    story.append(Paragraph("Automating repetitive human tasks is what makes the application indispensable to mess managers:", styles['BodyCustom']))

    s3_points = [
        "<b>Bazaar Duty Reminder Cron:</b> Schedule an automated cron using Supabase <code>pg_cron</code> or a cloud worker executing daily at 8:00 PM: checks who is scheduled for bazaar tomorrow (<code>duty_date = CURRENT_DATE + 1</code>), retrieves their FCM device token, and dispatches a high-priority push alert.",
        "<b>Meal Cut-off Auto Lock:</b> Implement a daily cron (e.g., 9:00 AM for lunch, 8:00 PM for dinner) that marks all <code>meal_entries.is_locked = true</code>, preventing boarders from manipulating meal attendance after cooking starts.",
        "<b>FCM Token Lifecycle Management:</b> Store user device tokens in a <code>user_devices</code> table. Handle token rotation gracefully on app startup and purge invalid tokens on HTTP 404/410 unregistration errors."
    ]
    for pt in s3_points:
        story.append(Paragraph(f"• {pt}", styles['BulletCustom']))

    story.append(PageBreak())

    # ==================== STAGE 4 ====================
    story.append(Paragraph("Stage 4: App Store Mandatory Policies & Compliance (CRITICAL)", styles['SectionHeading']))
    
    warn_text = (
        "<b>WARNING — REJECTION PREVENTION:</b> Over 65% of first-time app submissions are rejected due to non-compliance "
        "with Google Play and Apple App Store mandatory legal and safety guidelines. Read these carefully before writing release code!"
    )
    w_box = Paragraph(warn_text, styles['WarningCallout'])
    tw_box = Table([[w_box]], colWidths=[504])
    tw_box.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#FEF2F2")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#FECACA")),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(tw_box)
    story.append(Spacer(1, 6))

    compliance_table_data = [
        [Paragraph("Mandatory Requirement", styles['TableHead']), Paragraph("Applicable Store", styles['TableHead']), Paragraph("Exact Policy & Implementation Rule", styles['TableHead'])],
        [
            Paragraph("Account Deletion", styles['TableCellBold']),
            Paragraph("Google Play & Apple", styles['TableCell']),
            Paragraph("Mandatory (Apple 5.1.1(v) & Google Play Data Safety). The app MUST provide an in-app button allowing users to delete their account and associated personal data, plus a public web URL to request deletion.", styles['TableCell'])
        ],
        [
            Paragraph("20 Testers / 14 Days Closed Testing", styles['TableCellBold']),
            Paragraph("Google Play (New Personal Accounts)", styles['TableCell']),
            Paragraph("Since Nov 2023, Google requires new personal developer accounts to run a Closed Test with at least 20 opted-in testers for 14 continuous days before applying for Production release.", styles['TableCell'])
        ],
        [
            Paragraph("Live Privacy Policy URL", styles['TableCellBold']),
            Paragraph("Google Play & Apple", styles['TableCell']),
            Paragraph("Must be hosted on a public HTTPS URL (e.g. GitHub Pages/Notion). Must explicitly disclose data collected: Phone number, financial expense entries, and camera/photos access.", styles['TableCell'])
        ],
        [
            Paragraph("Target API Level", styles['TableCellBold']),
            Paragraph("Google Play", styles['TableCell']),
            Paragraph("Must target Android 14 (API level 34) or higher. Old target SDK versions will be rejected outright.", styles['TableCell'])
        ],
        [
            Paragraph("Apple Developer Program", styles['TableCellBold']),
            Paragraph("Apple App Store", styles['TableCell']),
            Paragraph("Requires $99 USD/year Apple Developer enrollment. For organizations, requires a D-U-N-S number.", styles['TableCell'])
        ]
    ]

    comp_table = Table(compliance_table_data, colWidths=[120, 110, 274])
    comp_table.setStyle(TableStyle([
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
    story.append(comp_table)

    story.append(Spacer(1, 8))

    # ==================== STAGE 5 ====================
    story.append(Paragraph("Stage 5: Release Engineering & Production Build Commands", styles['SectionHeading']))
    story.append(Paragraph("Step-by-step commands to compile production-ready signed binaries:", styles['BodyCustom']))

    build_steps = [
        "<b>1. Generate Android Production Keystore:</b><br/><code>keytool -genkey -v -keystore upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload</code><br/><i>CRITICAL: Back up this keystore file and passwords in 3 secure places. If lost, Google Play will permanently reject app updates!</i>",
        "<b>2. Configure <code>key.properties</code> & <code>android/app/build.gradle</code>:</b> Reference the keystore credentials using environment variables or untracked property files.",
        "<b>3. Compile Android App Bundle (AAB):</b><br/><code>flutter build appbundle --release --obfuscate --split-debug-info=build/app/outputs/symbols</code><br/><i>Note: Google Play requires .aab (not .apk) for production to optimize download sizes per device.</i>",
        "<b>4. Compile iOS Archive (IPA):</b><br/><code>flutter build ipa --release --export-options-plist=ios/ExportOptions.plist</code>",
        "<b>5. Code Obfuscation & Shrinking:</b> Ensure ProGuard / R8 is enabled in <code>android/app/build.gradle</code> to protect your source code and proprietary settlement algorithms from reverse engineering."
    ]
    for bs in build_steps:
        story.append(Paragraph(f"• {bs}", styles['BulletCustom']))

    story.append(Spacer(1, 8))

    # ==================== STAGE 6 ====================
    story.append(Paragraph("Stage 6: Post-Deployment Operations & Monitoring (Day 1 Live)", styles['SectionHeading']))
    
    post_steps = [
        "<b>Real-Time Crash Tracking (Sentry / Crashlytics):</b> Initialize Sentry in <code>main.dart</code>. Automatically captures unhandled exceptions, device models, and breadcrumbs so you can fix bugs before users leave 1-star reviews.",
        "<b>Staged Production Rollout:</b> Never release 100% to production on Day 1. Start with a 10% Staged Rollout on Google Play. Monitor Sentry crash rates for 48 hours. If crash-free, increase to 50%, then 100%.",
        "<b>In-App Update Prompt:</b> Integrate the Android In-App Updates API (<code>in_app_update</code> package). When you release critical calculation fixes, users are prompted to update immediately without visiting the Play Store manually.",
        "<b>Automated Database Backups:</b> Configure daily automated backups with Point-in-Time-Recovery (PITR) on PostgreSQL. In finance apps, accidental database loss is fatal."
    ]
    for ps in post_steps:
        story.append(Paragraph(f"• {ps}", styles['BulletCustom']))

    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#CBD5E1"), spaceBefore=0, spaceAfter=6))
    
    final_p = Paragraph(
        "<b>Golden Engineering Principle:</b> 'Treat financial calculation data as immutable.' "
        "Never run hard <code>DELETE</code> or <code>UPDATE</code> queries on ledger records. Always insert balancing contra-entries. "
        "This ensures transparent mathematical reconciliations that hostel members and auditors trust 100%.",
        styles['BodyCustom']
    )
    story.append(final_p)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Handbook successfully built: {filename}")

if __name__ == '__main__':
    output_pdf = os.path.join(os.getcwd(), "From_Scratch_To_Production_Deployment_Handbook.pdf")
    build_pdf(output_pdf)
