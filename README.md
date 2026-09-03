# Attendance Al-Ismat Academy

Simple single-user attendance management system for Al-Ismat Academy.

## Features
- Manage students (CRUD) across classes 9, 10, 11, 12
- Record weekly attendance per student (start date, end date, total days, present days — absent days and percentage are calculated automatically)
- Generate a PDF attendance report for any student over a chosen date range, showing week-by-week attendance in a table plus an overall total

## Local setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # edit SECRET_KEY / ADMIN_USERNAME / ADMIN_PASSWORD
python run.py
```

Visit http://localhost:5000 and log in with the admin username/password from `.env`.

> WeasyPrint (used for PDF generation) requires some system libraries (Pango, cairo, gdk-pixbuf). On macOS: `brew install pango gdk-pixbuf libffi`.

## Deployment (Render, free tier)

A `render.yaml` is included (Render "Blueprint"):
1. Push this repo to GitHub.
2. On Render, choose "New +" → "Blueprint" and point it at this repo.
3. Set the `ADMIN_PASSWORD` environment variable when prompted (marked `sync: false`).
4. Render will provision a free web service with a small persistent disk for the SQLite database.

## Branding
Theme color: mid-shade green (`#2e7d52`). Replace `app/static/img/` with the academy logo once available and reference it in `app/templates/base.html`.
