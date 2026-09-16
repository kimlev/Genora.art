#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

die() {
  echo "publish-github: $*" >&2
  exit 1
}

command -v git >/dev/null 2>&1 || die "git не найден"
command -v gh >/dev/null 2>&1 || die "gh не найден. Установите: brew install gh && gh auth login"
command -v python3 >/dev/null 2>&1 || die "нужен python3"

[[ -f project.json ]] || die "нет project.json"
[[ -f anamnesis.json ]] || die "нет anamnesis.json"

EXISTING_URL="$(python3 - <<'PY'
import json
from pathlib import Path
p = json.loads(Path("project.json").read_text(encoding="utf-8"))
g = p.get("github") or {}
print((g.get("url") or "") if isinstance(g, dict) else "")
PY
)"

if [[ -n "$EXISTING_URL" ]]; then
  echo "$EXISTING_URL"
  exit 0
fi

DESCRIPTION="$(python3 - <<'PY'
import json
from pathlib import Path
a = json.loads(Path("anamnesis.json").read_text(encoding="utf-8"))
print((a.get("description") or "").strip())
PY
)"

[[ -n "$DESCRIPTION" ]] || die "anamnesis.json: поле description пустое — сначала заполните опрос GO"

SLUG="$(python3 - <<'PY'
import json
from pathlib import Path
print(json.loads(Path("project.json").read_text(encoding="utf-8")).get("slug") or "project")
PY
)"

SHORT_DESC="$(python3 - <<'PY'
import json, textwrap
from pathlib import Path
d = (json.loads(Path("anamnesis.json").read_text(encoding="utf-8")).get("description") or "").strip().replace("\n", " ")
print(textwrap.shorten(d, width=180, placeholder="…"))
PY
)"

COMMIT_SUMMARY="$(python3 - <<'PY'
import json, textwrap
from pathlib import Path
d = (json.loads(Path("anamnesis.json").read_text(encoding="utf-8")).get("description") or "").strip().replace("\n", " ")
print(textwrap.shorten(d, width=200, placeholder="…"))
PY
)"

COMMIT_DATE="$(date +"%d.%m.%y")"

python3 - <<'PY'
import json
from pathlib import Path

project = json.loads(Path("project.json").read_text(encoding="utf-8"))
anam = json.loads(Path("anamnesis.json").read_text(encoding="utf-8"))
name = project.get("name") or project.get("slug") or "project"
desc = (anam.get("description") or "").strip()
comps = anam.get("competitors") or []
if not isinstance(comps, list):
    comps = []
prior = anam.get("priorities")
updated = anam.get("updatedAt") or ""

lines = [f"# {name}", "", "## Описание", "", desc, "", "## Конкуренты", ""]
if comps:
    for c in comps:
        lines.append(f"- {c}")
else:
    lines.append("_Не указаны_")
lines += ["", "## Приоритеты реализации", ""]
if prior and str(prior).strip():
    lines.append(str(prior))
else:
    lines.append("_Не указаны_")
lines += ["", f"_Обновлено: {updated or '—'}_", ""]
Path("ANAMNESIS.md").write_text("\n".join(lines), encoding="utf-8")
PY

if [[ ! -d .git ]]; then
  git init -b main
else
  current="$(git branch --show-current 2>/dev/null || true)"
  if [[ -z "$current" ]]; then
    git checkout -b main 2>/dev/null || git branch -M main
  elif [[ "$current" != "main" ]]; then
    git branch -M main
  fi
fi

# В контейнере/CI часто нет git identity
if ! git config user.email >/dev/null 2>&1; then
  git config user.email "fail-bot@users.noreply.github.com"
  git config user.name "fail"
fi

# GH_TOKEN из окружения (VPS: /srv/infra/fail-github.env)
if [[ -n "${GH_TOKEN:-}${GITHUB_TOKEN:-}" ]]; then
  export GH_TOKEN="${GH_TOKEN:-$GITHUB_TOKEN}"
  export GH_PROMPT_DISABLED=1
fi

git add README.md project.json anamnesis.json ANAMNESIS.md .gitignore scripts/ web/ Dockerfile 2>/dev/null || \
  git add README.md project.json anamnesis.json ANAMNESIS.md .gitignore scripts/ web/

if git rev-parse --verify HEAD >/dev/null 2>&1; then
  if ! git diff --cached --quiet; then
    git commit -m "$(cat <<EOF
${COMMIT_DATE} — обновление анамнеза проекта

${COMMIT_SUMMARY}
EOF
)"
  fi
else
  git commit -m "$(cat <<EOF
${COMMIT_DATE} — первоначальная информация о проекте

${COMMIT_SUMMARY}
EOF
)"
fi

if git remote get-url origin >/dev/null 2>&1; then
  git push -u origin main
else
  gh repo create "${SLUG}" --private --source=. --remote=origin --push --description "${SHORT_DESC}"
fi

REPO_URL="$(gh repo view --json url -q .url)"
OWNER_REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner)"
SSH_URL="$(gh repo view --json sshUrl -q .sshUrl)"
CREATED_AT="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

python3 - <<PY
import json, re
from pathlib import Path

p = Path("project.json")
data = json.loads(p.read_text(encoding="utf-8"))
data["github"] = {
    "private": True,
    "repo": "${OWNER_REPO}",
    "url": "${REPO_URL}",
    "sshUrl": "${SSH_URL}",
    "createdAt": "${CREATED_AT}",
}
p.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

readme = Path("README.md")
text = readme.read_text(encoding="utf-8")
line = f"**GitHub:** {data['github']['url']} (private)"
if "**GitHub:**" in text:
    text = re.sub(r"\*\*GitHub:\*\*.*", line, text, count=1)
else:
    text = text.rstrip() + "\n\n" + line + "\n"
readme.write_text(text, encoding="utf-8")
PY

git add project.json README.md
if ! git diff --cached --quiet; then
  git commit -m "${COMMIT_DATE} — добавлены ссылки на GitHub-репозиторий"
  git push
fi

echo "${REPO_URL}"
