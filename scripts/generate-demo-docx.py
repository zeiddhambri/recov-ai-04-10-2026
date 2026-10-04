#!/usr/bin/env python3
"""
Génère docs/DEMO-MULTI-TENANT-MFA.docx à partir du markdown.
Utilise python-docx (installé via --break-system-packages).
"""

from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
import pathlib

md_path = pathlib.Path(__file__).parent.parent / "docs" / "DEMO-MULTI-TENANT-MFA.md"
docx_path = pathlib.Path(__file__).parent.parent / "docs" / "DEMO-MULTI-TENANT-MFA.docx"

doc = Document()

# Styles
style = doc.styles['Normal']
font = style.font
font.name = 'Calibri'
font.size = Pt(11)

# Title
title = doc.add_heading('RecovAI — Déroulé de Démo Multi-Tenant + MFA (P1.5 & P1.7)', 0)
title.alignment = WD_ALIGN_PARAGRAPH.CENTER

# Subtitle
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run('Lot P1.5 : Connecteurs SMS/Email réels + P1.7 : SSO & MFA TOTP — 20 min devant comité bancaire')
run.font.size = Pt(10)
run.font.color.rgb = RGBColor(100, 100, 100)

# Read markdown and convert roughly
if md_path.exists():
    text = md_path.read_text(encoding='utf-8')
    # Simple conversion: split by lines, handle headings, code blocks, lists
    lines = text.splitlines()
    in_code = False
    code_buf = []
    for line in lines:
        if line.strip().startswith('```'):
            if not in_code:
                in_code = True
                code_buf = []
            else:
                in_code = False
                # add code block
                if code_buf:
                    p = doc.add_paragraph()
                    p.style = doc.styles['Normal']
                    run = p.add_run('\n'.join(code_buf))
                    run.font.name = 'Consolas'
                    run.font.size = Pt(9)
                    # shading via paragraph
                    p.paragraph_format.left_indent = Inches(0.2)
                code_buf = []
            continue
        if in_code:
            code_buf.append(line)
            continue
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith('# '):
            doc.add_heading(stripped[2:], 1)
        elif stripped.startswith('## '):
            doc.add_heading(stripped[3:], 2)
        elif stripped.startswith('### '):
            doc.add_heading(stripped[4:], 3)
        elif stripped.startswith('- ') or stripped.startswith('* '):
            doc.add_paragraph(stripped[2:], style='List Bullet')
        elif stripped[0].isdigit() and '. ' in stripped[:4]:
            # ordered list
            doc.add_paragraph(stripped.split('. ', 1)[1] if '. ' in stripped else stripped, style='List Number')
        elif stripped.startswith('|'):
            # table row — add as paragraph mono
            p = doc.add_paragraph()
            run = p.add_run(stripped)
            run.font.name = 'Consolas'
            run.font.size = Pt(8)
        else:
            # normal paragraph, handle bold
            # replace **text** with bold
            p = doc.add_paragraph()
            # simple bold handling
            parts = line.split('**')
            for i, part in enumerate(parts):
                run = p.add_run(part)
                if i % 2 == 1:
                    run.bold = True

else:
    doc.add_paragraph("Contenu markdown introuvable, génération minimale.")

# Add footer sections
doc.add_page_break()
doc.add_heading('Annexes — Preuves techniques', 1)
doc.add_paragraph(
    "P1.5 : server/lib/communication.ts — abstraction SMS/Email/WhatsApp avec provider console (démo) et http (agrégateur tunisien) + webhooks HMAC SHA256. "
    "Chaque envoi génère proof.hash SHA256(client_code|recipient|content|providerMessageId) horodaté, stocké dans relanceLogs.statusHistory avec deliveredAt. "
    "Audit : RELANCE_SENT, RELANCE_WEBHOOK_SMS."
)
doc.add_paragraph(
    "P1.7 : server/lib/totp.ts — RFC 6238, Base32, HMAC-SHA1, fenêtre ±1. "
    "server/lib/mfaStore.ts — secret chiffré AES-256-GCM (clé dérivée de APP_AUTH_SECRET), backup codes hashés SHA-256 usage unique. "
    "server/lib/refreshTokens.ts — refresh opaque 32 bytes, rotation (replacedBy), révocation server-side, TTL 15 min access / 7 j refresh. "
    "server/lib/lockout.ts — 5 échecs / 15 min → lockout 15 min exponentiel jusqu’à 2h. "
    "server/routes/mfa.ts — /setup, /verify, /disable, /status, /refresh, /logout, /sessions. "
    "server/routes/sso.ts — OIDC discovery stub, callback 501 documenté, SCIM Users."
)
doc.add_paragraph(
    "Frontend : src/components/auth/MfaSetup.tsx — QR via api.qrserver.com, secret + backup codes, vérif TOTP. "
    "MfaVerify.tsx — second step login. "
    "src/lib/totpAssistant.ts — génération TOTP côté navigateur (WebCrypto HMAC-SHA1) pour démo sans serveur. "
    "src/pages/TotpAssistant.tsx — assistant visuel avec compte à rebours 30s. "
    "src/pages/Auth.tsx — flow MFA requis → écran TOTP. "
    "src/pages/Settings.tsx — onglet MFA TOTP (P1.7) NOUVEAU."
)

doc.add_heading('Checklist démo (20 min)', 2)
checklist = [
    "2 min : pitch sécurité (JWT 15 min + refresh tournant + RLS + MFA)",
    "2-6 min : multi-tenant — login agent.amen vs agent.tunisiemf vs admin, 404 cross-tenant, export CSV",
    "6-12 min : P1.5 — providers/status, send SMS console, proof.hash, webhook delivered",
    "12-18 min : P1.7 — setup MFA QR, verify, re-login MFA required, lockout 5 échecs, refresh rotation, sessions, logout all",
    "18-20 min : SSO stub OIDC well-known, policy, audit CSV"
]
for item in checklist:
    doc.add_paragraph(item, style='List Bullet')

doc.add_heading('Commandes', 2)
doc.add_paragraph(
    "docker compose up --build\n"
    "curl POST /api/auth/login {email,password} → mfaRequired?\n"
    "curl POST /api/auth/mfa/setup → secret + otpauthUri\n"
    "curl POST /api/auth/mfa/verify {code}\n"
    "curl POST /api/relances/send {dossierId, channel, customMessage}\n"
    "curl POST /api/relances/webhooks/sms {providerMessageId,status:delivered} + HMAC"
)

# Save
doc.save(str(docx_path))
print(f"Generated {docx_path} ({docx_path.stat().st_size} bytes)")
