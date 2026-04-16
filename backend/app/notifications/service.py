"""
Notification service.
In development (no SMTP configured) all emails are printed to console.
In production set SMTP_USER + SMTP_PASSWORD in .env.
"""
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings

logger = logging.getLogger(__name__)


def _send_email(to: str, subject: str, html_body: str) -> bool:
    """Send an email. Returns True on success, False on failure."""
    if not settings.SMTP_USER:
        # Dev mode — log to console instead
        logger.info(f"\n{'='*60}\n📧 EMAIL (dev mode — not actually sent)\nTo: {to}\nSubject: {subject}\n{html_body}\n{'='*60}")
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.EMAILS_FROM
        msg["To"] = to
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.EMAILS_FROM, to, msg.as_string())
        return True
    except Exception as e:
        logger.error(f"Email send failed to {to}: {e}")
        return False


def notify_match_approved(seeker_email: str, seeker_name: str, job_title: str, score: float):
    subject = f"🎉 Your match for '{job_title}' has been approved!"
    body = f"""
    <h2 style="color:#CC0000">Great news, {seeker_name}!</h2>
    <p>Your match for the position <strong>{job_title}</strong> has been reviewed
    and approved by a SPOTTER.</p>
    <p>Your match score: <strong style="color:#CC0000">{score:.1f}%</strong></p>
    <p>Log in to your SPOTTER dashboard to view the full details.</p>
    <br><p style="color:#888">The SPOTTER Team</p>
    """
    _send_email(seeker_email, subject, body)


def notify_match_rejected(seeker_email: str, seeker_name: str, job_title: str):
    subject = f"Update on your match for '{job_title}'"
    body = f"""
    <h2>Hi {seeker_name},</h2>
    <p>Our SPOTTER reviewed your match for <strong>{job_title}</strong>
    and decided it wasn't quite the right fit at this time.</p>
    <p>Keep your profile updated — new matches are added daily!</p>
    <br><p style="color:#888">The SPOTTER Team</p>
    """
    _send_email(seeker_email, subject, body)


def notify_certificate_ready(seeker_email: str, seeker_name: str, job_title: str):
    subject = f"Your SPOTTER Certificate is Ready!"
    body = f"""
    <h2 style="color:#CC0000">Congratulations, {seeker_name}!</h2>
    <p>Your match certificate for <strong>{job_title}</strong> is ready to download.</p>
    <p>Log in to your dashboard and go to <strong>My Matches</strong> to download it.</p>
    <br><p style="color:#888">The SPOTTER Team</p>
    """
    _send_email(seeker_email, subject, body)


def notify_org_new_match(org_email: str, org_name: str, job_title: str, candidate_count: int):
    subject = f"New matched candidates for '{job_title}'"
    body = f"""
    <h2>Hi {org_name},</h2>
    <p>You have <strong>{candidate_count} new matched candidate(s)</strong>
    for your position <strong>{job_title}</strong>.</p>
    <p>Log in to your SPOTTER dashboard to review them.</p>
    <br><p style="color:#888">The SPOTTER Team</p>
    """
    _send_email(org_email, subject, body)


def notify_points_credited(agent_email: str, agent_name: str, points: float, reason: str):
    naira = points * settings.POINTS_TO_NAIRA
    subject = f"You earned {points:.1f} points on SPOTTER!"
    body = f"""
    <h2>Hi {agent_name},</h2>
    <p>You just earned <strong>{points:.1f} points</strong>
    (worth <strong>₦{naira:,.0f}</strong>) for: {reason}.</p>
    <p>View your points balance in your SPOTTER Agent Dashboard.</p>
    <br><p style="color:#888">The SPOTTER Team</p>
    """
    _send_email(agent_email, subject, body)
