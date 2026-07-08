from fastapi import APIRouter

router = APIRouter()

import logging
from core import ADMIN_EMAIL

log = logging.getLogger("ziyanisa.community")

from datetime import datetime
from datetime import timezone
from fastapi import HTTPException
from fastapi import Header
from otp_sender import send_email_notification
from typing import Optional
import asyncio
import httpx
import math
import uuid
from core import GITHUB_REPO, GITHUB_TOKEN, db, is_admin_claims, token_from_header
from routers.beauticians import BugReportCreate, BugReportUpdate, FeatureRequestCreate, FeatureRequestUpdate

# ── Bug Reports ───────────────────────────────────────────────────────────────

SEVERITY_EMOJI = {"critical": "🔴", "high": "🟠", "medium": "🟡", "low": "🟢"}

async def _create_github_issue(bug: dict) -> Optional[str]:
    if not GITHUB_TOKEN or not GITHUB_REPO:
        return None
    emoji = SEVERITY_EMOJI.get(bug.get("severity", ""), "⚪")
    reported_at = bug.get("reported_at", datetime.now(timezone.utc))
    if isinstance(reported_at, datetime):
        reported_at = reported_at.strftime("%Y-%m-%d %H:%M UTC")
    body = (
        f"## Bug Report — Admin Panel\n\n"
        f"**Severity:** {emoji} {bug.get('severity', '').title()}  \n"
        f"**Category:** {bug.get('category', '').title()}  \n"
        f"**Reported at:** {reported_at}  \n"
        f"**Page:** {bug.get('page_url') or 'N/A'} (tab: {bug.get('admin_tab') or 'N/A'})\n\n"
        f"---\n\n"
        f"## Description\n{bug.get('description', '')}\n"
    )
    if bug.get("steps"):
        body += f"\n## Steps to Reproduce\n{bug['steps']}\n"
    body += (
        f"\n---\n"
        f"*Screenshots available in Admin Bug Reports panel*  \n"
        f"*Bug ID: `{bug.get('_id', '')}`*"
    )
    labels = ["bug", f"severity:{bug.get('severity', 'medium')}", f"area:{bug.get('category', 'other')}"]
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(
                f"https://api.github.com/repos/{GITHUB_REPO}/issues",
                json={
                    "title": f"[Bug][{bug.get('severity', '').title()}] {bug.get('title', '')}",
                    "body": body,
                    "labels": labels,
                },
                headers={
                    "Authorization": f"token {GITHUB_TOKEN}",
                    "Accept": "application/vnd.github+json",
                    "X-GitHub-Api-Version": "2022-11-28",
                },
            )
            if r.status_code == 201:
                return r.json().get("html_url")
            log.error("GitHub issue creation returned %s: %s", r.status_code, r.text[:200])
    except Exception as exc:
        log.error("GitHub issue creation failed: %s", exc)
    return None


def _bug_serial(doc: dict) -> dict:
    for field in ("reported_at", "resolved_at", "acknowledged_at"):
        if isinstance(doc.get(field), datetime):
            doc[field] = doc[field].isoformat()
    return doc


@router.post("/admin/bug-reports")
async def create_bug_report(body: BugReportCreate, authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    if not is_admin_claims(claims):
        raise HTTPException(status_code=403, detail="Admin only")
    bug = {
        "_id": str(uuid.uuid4()),
        **body.model_dump(),
        "reported_by": claims.get("contact", ""),
        "reported_at": datetime.now(timezone.utc),
        "status": "open",
        "github_issue_url": None,
        "github_sync_failed": False,
        "dev_notes": None,
        "fix_commit": None,
        "resolved_at": None,
    }
    await db.bug_reports.insert_one(bug)

    gh_url = await _create_github_issue(bug)
    update_fields = {"github_issue_url": gh_url, "github_sync_failed": gh_url is None}
    await db.bug_reports.update_one({"_id": bug["_id"]}, {"$set": update_fields})
    bug.update(update_fields)

    if body.severity == "critical" and ADMIN_EMAIL:
        subject = f"[ZiyaNisa] 🔴 Critical Bug: {body.title}"
        plain   = f"Critical bug reported.\n\nTitle: {body.title}\nPage: {body.page_url or 'N/A'}\n\n{body.description}"
        html    = (
            f"<p><strong>Critical bug reported on ZiyaNisa admin panel.</strong></p>"
            f"<p><strong>Title:</strong> {body.title}</p>"
            f"<p><strong>Page:</strong> {body.page_url or 'N/A'}</p>"
            f"<p><strong>Description:</strong><br>{body.description}</p>"
        )
        asyncio.create_task(send_email_notification(ADMIN_EMAIL, subject, plain, html))

    return _bug_serial(bug)


@router.get("/admin/bug-reports")
async def list_bug_reports(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    category: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    authorization: Optional[str] = Header(None),
):
    claims = token_from_header(authorization)
    if not is_admin_claims(claims):
        raise HTTPException(status_code=403, detail="Admin only")
    q: dict = {}
    if status:
        q["status"] = status
    if severity:
        q["severity"] = severity
    if category:
        q["category"] = category
    skip = (page - 1) * limit
    total = await db.bug_reports.count_documents(q)
    cursor = db.bug_reports.find(q, {"screenshots": 0}).sort("reported_at", -1).skip(skip).limit(limit)
    items = [_bug_serial(doc) async for doc in cursor]
    return {"items": items, "total": total, "page": page, "total_pages": math.ceil(total / limit) if total else 1}


@router.get("/admin/bug-reports/{bug_id}")
async def get_bug_report(bug_id: str, authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    if not is_admin_claims(claims):
        raise HTTPException(status_code=403, detail="Admin only")
    doc = await db.bug_reports.find_one({"_id": bug_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Bug report not found")
    return _bug_serial(doc)


@router.patch("/admin/bug-reports/{bug_id}")
async def update_bug_report(bug_id: str, body: BugReportUpdate, authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    if not is_admin_claims(claims):
        raise HTTPException(status_code=403, detail="Admin only")
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if updates.get("status") == "resolved":
        updates["resolved_at"] = datetime.now(timezone.utc)
    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update")
    result = await db.bug_reports.update_one({"_id": bug_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Bug report not found")
    doc = await db.bug_reports.find_one({"_id": bug_id}, {"screenshots": 0})
    return _bug_serial(doc)


@router.post("/admin/bug-reports/{bug_id}/retry-github")
async def retry_github_issue(bug_id: str, authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    if not is_admin_claims(claims):
        raise HTTPException(status_code=403, detail="Admin only")
    bug = await db.bug_reports.find_one({"_id": bug_id})
    if not bug:
        raise HTTPException(status_code=404, detail="Bug report not found")
    gh_url = await _create_github_issue(bug)
    if gh_url:
        await db.bug_reports.update_one({"_id": bug_id}, {"$set": {"github_issue_url": gh_url, "github_sync_failed": False}})
        return {"github_issue_url": gh_url}
    raise HTTPException(status_code=502, detail="GitHub issue creation failed — check GITHUB_TOKEN and GITHUB_REPO")


# ── Feature Requests ───────────────────────────────────────────────────────────

PRIORITY_EMOJI = {"critical": "🔴", "important": "🟠", "useful": "🟡", "nice_to_have": "🟢"}

async def _create_github_feature_request(fr: dict) -> Optional[str]:
    if not GITHUB_TOKEN or not GITHUB_REPO:
        return None
    emoji = PRIORITY_EMOJI.get(fr.get("priority", ""), "⚪")
    reported_at = fr.get("reported_at", datetime.now(timezone.utc))
    if isinstance(reported_at, datetime):
        reported_at = reported_at.strftime("%Y-%m-%d %H:%M UTC")
    body = (
        f"## Feature Request — Admin Panel\n\n"
        f"**Priority:** {emoji} {fr.get('priority', '').replace('_', ' ').title()}  \n"
        f"**Category:** {fr.get('category', '').title()}  \n"
        f"**Requested at:** {reported_at}  \n"
        f"**Page:** {fr.get('page_url') or 'N/A'} (tab: {fr.get('admin_tab') or 'N/A'})\n\n"
        f"---\n\n"
        f"## Use Case / Problem\n{fr.get('use_case', '')}\n"
    )
    if fr.get("details"):
        body += f"\n## Additional Details\n{fr['details']}\n"
    body += (
        f"\n---\n"
        f"*Screenshots/mockups available in Admin Feature Requests panel*  \n"
        f"*Request ID: `{fr.get('_id', '')}`*"
    )
    labels = ["enhancement", f"priority:{fr.get('priority', 'useful')}", f"area:{fr.get('category', 'other')}"]
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(
                f"https://api.github.com/repos/{GITHUB_REPO}/issues",
                json={
                    "title": f"[Feature][{fr.get('priority', '').replace('_', ' ').title()}] {fr.get('title', '')}",
                    "body": body,
                    "labels": labels,
                },
                headers={
                    "Authorization": f"token {GITHUB_TOKEN}",
                    "Accept": "application/vnd.github+json",
                    "X-GitHub-Api-Version": "2022-11-28",
                },
            )
            if r.status_code == 201:
                return r.json().get("html_url")
            log.error("GitHub feature request creation returned %s: %s", r.status_code, r.text[:200])
    except Exception as exc:
        log.error("GitHub feature request creation failed: %s", exc)
    return None


def _fr_serial(doc: dict) -> dict:
    for field in ("reported_at", "shipped_at"):
        if isinstance(doc.get(field), datetime):
            doc[field] = doc[field].isoformat()
    return doc


@router.post("/admin/feature-requests")
async def create_feature_request(body: FeatureRequestCreate, authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    if not is_admin_claims(claims):
        raise HTTPException(status_code=403, detail="Admin only")
    fr = {
        "_id": str(uuid.uuid4()),
        **body.model_dump(),
        "reported_by": claims.get("contact", ""),
        "reported_at": datetime.now(timezone.utc),
        "status": "new",
        "github_issue_url": None,
        "github_sync_failed": False,
        "dev_notes": None,
        "shipped_at": None,
    }
    await db.feature_requests.insert_one(fr)
    gh_url = await _create_github_feature_request(fr)
    update_fields = {"github_issue_url": gh_url, "github_sync_failed": gh_url is None}
    await db.feature_requests.update_one({"_id": fr["_id"]}, {"$set": update_fields})
    fr.update(update_fields)
    return _fr_serial(fr)


@router.get("/admin/feature-requests")
async def list_feature_requests(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    category: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    authorization: Optional[str] = Header(None),
):
    claims = token_from_header(authorization)
    if not is_admin_claims(claims):
        raise HTTPException(status_code=403, detail="Admin only")
    q: dict = {}
    if status:
        q["status"] = status
    if priority:
        q["priority"] = priority
    if category:
        q["category"] = category
    skip = (page - 1) * limit
    total = await db.feature_requests.count_documents(q)
    cursor = db.feature_requests.find(q, {"screenshots": 0}).sort("reported_at", -1).skip(skip).limit(limit)
    items = [_fr_serial(doc) async for doc in cursor]
    return {"items": items, "total": total, "page": page, "total_pages": math.ceil(total / limit) if total else 1}


@router.get("/admin/feature-requests/{fr_id}")
async def get_feature_request(fr_id: str, authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    if not is_admin_claims(claims):
        raise HTTPException(status_code=403, detail="Admin only")
    doc = await db.feature_requests.find_one({"_id": fr_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Feature request not found")
    return _fr_serial(doc)


@router.patch("/admin/feature-requests/{fr_id}")
async def update_feature_request(fr_id: str, body: FeatureRequestUpdate, authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    if not is_admin_claims(claims):
        raise HTTPException(status_code=403, detail="Admin only")
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if updates.get("status") == "shipped":
        updates["shipped_at"] = datetime.now(timezone.utc)
    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update")
    result = await db.feature_requests.update_one({"_id": fr_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Feature request not found")
    doc = await db.feature_requests.find_one({"_id": fr_id}, {"screenshots": 0})
    return _fr_serial(doc)


@router.post("/admin/feature-requests/{fr_id}/retry-github")
async def retry_feature_request_github(fr_id: str, authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    if not is_admin_claims(claims):
        raise HTTPException(status_code=403, detail="Admin only")
    fr = await db.feature_requests.find_one({"_id": fr_id})
    if not fr:
        raise HTTPException(status_code=404, detail="Feature request not found")
    gh_url = await _create_github_feature_request(fr)
    if gh_url:
        await db.feature_requests.update_one({"_id": fr_id}, {"$set": {"github_issue_url": gh_url, "github_sync_failed": False}})
        return {"github_issue_url": gh_url}
    raise HTTPException(status_code=502, detail="GitHub issue creation failed — check GITHUB_TOKEN and GITHUB_REPO")


