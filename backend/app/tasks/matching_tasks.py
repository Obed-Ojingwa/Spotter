"""
Background tasks for matching: certificate generation and referral point propagation.
"""
import asyncio
import uuid
import os
from app.tasks.celery_app import celery_app
from app.config import settings


def _run_async(coro):
    """Run an async coroutine from a sync Celery task."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(name="app.tasks.matching_tasks.generate_certificate", bind=True, max_retries=3)
def generate_certificate(self, match_id: str):
    """Generate a PDF certificate for an approved match."""
    try:
        _run_async(_generate_certificate_async(match_id))
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60)


async def _generate_certificate_async(match_id: str):
    from sqlalchemy.ext.asyncio import AsyncSession
    from sqlalchemy import select
    from app.database import AsyncSessionLocal, engine
    from app.models import Match, JobSeeker, Job, Certificate

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Match, JobSeeker, Job)
            .join(JobSeeker, Match.seeker_id == JobSeeker.id)
            .join(Job, Match.job_id == Job.id)
            .where(Match.id == match_id)
        )
        row = result.first()
        if not row:
            return

        match, seeker, job = row

        # Generate PDF certificate
        pdf_path = _create_certificate_pdf(match, seeker, job)

        # Save certificate record
        cert = Certificate(
            match_id=match.id,
            url=pdf_path,
        )
        db.add(cert)
        match.certificate_issued = True
        await db.commit()


def _create_certificate_pdf(match, seeker, job) -> str:
    """Create a PDF certificate using ReportLab and return file path."""
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib import colors
    from reportlab.lib.units import cm
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER

    os.makedirs(settings.LOCAL_STORAGE_PATH, exist_ok=True)
    filename = f"certificate_{match.id}.pdf"
    filepath = os.path.join(settings.LOCAL_STORAGE_PATH, filename)

    doc = SimpleDocTemplate(filepath, pagesize=landscape(A4), topMargin=2*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()

    RED = colors.HexColor("#CC0000")
    DARK = colors.HexColor("#1a1a1a")

    title_style = ParagraphStyle("Title", parent=styles["Title"],
                                  fontSize=32, textColor=RED, alignment=TA_CENTER, spaceAfter=6)
    sub_style = ParagraphStyle("Sub", parent=styles["Normal"],
                                fontSize=14, textColor=DARK, alignment=TA_CENTER, spaceAfter=4)
    body_style = ParagraphStyle("Body", parent=styles["Normal"],
                                 fontSize=12, textColor=DARK, alignment=TA_CENTER, spaceAfter=8)
    score_style = ParagraphStyle("Score", parent=styles["Normal"],
                                  fontSize=48, textColor=RED, alignment=TA_CENTER, spaceAfter=4)

    story = [
        Spacer(1, 1*cm),
        Paragraph("SPOTTER", title_style),
        HRFlowable(width="80%", thickness=2, color=RED, spaceAfter=12),
        Paragraph("Certificate of Match", sub_style),
        Spacer(1, 0.8*cm),
        Paragraph("This certifies that", body_style),
        Paragraph(f"<b>{seeker.name}</b>", ParagraphStyle("Name", parent=body_style, fontSize=22)),
        Spacer(1, 0.4*cm),
        Paragraph("has been successfully matched to the position of", body_style),
        Paragraph(f"<b>{job.title}</b>", ParagraphStyle("JobTitle", parent=body_style, fontSize=18)),
        Spacer(1, 0.4*cm),
        Paragraph("with a match accuracy of", body_style),
        Paragraph(f"{match.score:.1f}%", score_style),
        HRFlowable(width="60%", thickness=1, color=RED, spaceBefore=12, spaceAfter=12),
        Paragraph(f"Certificate ID: {match.id}", ParagraphStyle("CertID", parent=body_style,
                                                                  fontSize=9, textColor=colors.grey)),
        Paragraph(
            f"Approved by SPOTTER on {match.approved_at.strftime('%B %d, %Y') if match.approved_at else 'N/A'}",
            ParagraphStyle("Date", parent=body_style, fontSize=10)
        ),
    ]

    doc.build(story)
    return f"/uploads/{filename}"


@celery_app.task(name="app.tasks.matching_tasks.propagate_referral_points", bind=True)
def propagate_referral_points(self, agent_id: str, base_points: float, reason: str, reference_id: str):
    """Propagate points up the referral chain (max 5 levels)."""
    _run_async(_propagate_async(agent_id, base_points, reason, reference_id))


LEVEL_MULTIPLIERS = {1: 1.0, 2: 0.5, 3: 0.25, 4: 0.12, 5: 0.06}


async def _propagate_async(agent_id: str, base_points: float, reason: str, reference_id: str):
    from sqlalchemy import select
    from app.database import AsyncSessionLocal
    from app.models import Agent, AgentPoint

    async with AsyncSessionLocal() as db:
        current_id = agent_id
        for level in range(1, 6):
            result = await db.execute(select(Agent).where(Agent.id == current_id))
            agent = result.scalar_one_or_none()
            if not agent or not agent.referrer_id:
                break

            bonus = base_points * LEVEL_MULTIPLIERS[level]
            result = await db.execute(select(Agent).where(Agent.id == agent.referrer_id))
            referrer = result.scalar_one_or_none()
            if not referrer:
                break

            referrer.points += bonus
            db.add(AgentPoint(
                agent_id=referrer.id,
                delta=bonus,
                reason=f"{reason}_level_{level}",
                reference_id=reference_id,
            ))
            current_id = str(agent.referrer_id)

        await db.commit()
