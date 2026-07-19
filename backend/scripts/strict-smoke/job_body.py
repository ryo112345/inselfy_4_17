#!/usr/bin/env python3
"""jobs_group.sh 用: JobPostingRequest の完全な JSON を組み立てる。

スペックは全フィールド必須（空文字可・nullable は null）なので、
デフォルトを埋めた上で引数の key=value で上書きする。
使い方: job_body.py title=タイトル status=open
"""

import json
import sys

body = {
    "title": "",
    "description": "仕事内容の説明",
    "employmentType": "正社員",
    "status": "draft",
    "location": None,
    "salaryMin": None,
    "salaryMax": None,
    "teamId": None,
    "appealPoints": "",
    "benefits": "",
    "breakTime": "",
    "challenges": "",
    "contractType": "",
    "coverImageUrl": "",
    "galleryUrls": [],
    "highlightTitleAppeal": "",
    "highlightTitleChallenge": "",
    "highlightTitleGrowth": "",
    "highlightTitleRole": "",
    "hiringCount": "",
    "holidays": "",
    "insurance": "",
    "jobCategory": "",
    "jobDescriptionChangeScope": "",
    "preferredQualifications": "",
    "probationPeriod": "",
    "remotePolicy": "",
    "requiredQualifications": "",
    "salaryDetail": "",
    "selectionProcess": "",
    "skillsGained": "",
    "smokingPolicy": "",
    "tags": [],
    "teamDescription": "",
    "teamLabel": "",
    "teamMembers": [],
    "workHours": "",
    "workLocation": "",
    "workLocationChangeScope": "",
}

for arg in sys.argv[1:]:
    key, _, value = arg.partition("=")
    body[key] = value

print(json.dumps(body, ensure_ascii=False))
