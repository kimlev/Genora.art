<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **Genora.art** (35431 symbols, 75222 relationships, 300 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user. For unified PDG impact, add `mode: "pdg"` with optional `line: <N>` — it returns statement-level `affectedStatements` over CDG + REACHING_DEF and inter-procedural symbols in `interproceduralByDepth`/`byDepth`; no-layer/degraded PDG results are UNKNOWN-risk notes (`--pdg` layer).
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "main"})`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({search_query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).
- For control/data dependence, `pdg_query({mode: "controls", target: "fileOrSymbol"})` answers "under what condition does X run?" (CDG, incl. guard clauses) and `pdg_query({mode: "flows", target, variable})` traces "where does variable Y flow?" (REACHING_DEF). `--pdg` layer.

## Never Do

- NEVER edit a function, class, or method without first running `impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit changes without running `detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/Genora.art/context` | Codebase overview, check index freshness |
| `gitnexus://repo/Genora.art/clusters` | All functional areas |
| `gitnexus://repo/Genora.art/processes` | All execution flows |
| `gitnexus://repo/Genora.art/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->

## Публикация SEO-статей

- Если пользователь передаёт два файла — статью и техническую SEO-информацию — и указывает URL страницы, размещай статью без дополнительных вопросов вместо существующей программной статьи-заглушки на этой странице.
- Язык определяй по статье и техническому файлу. Публикуй материал только для этого языка; не переводи его и не заменяй статьи других языков.
- Используй существующий компонент и стили SEO-статей проекта. Сохраняй один корректный H1 на странице, метаданные из технического файла, canonical, hreflang, Article и FAQPage JSON-LD.
- Проверяй внутренние ссылки на целевой среде. Ссылки с production-доменом локализуй для языка страницы; несуществующие маршруты заменяй ближайшим корректным разделом сайта.
- После изменения запускай тесты, проверку типов и сборку, затем коммить, отправляй в указанную ветку, дожидайся деплоя и проверяй опубликованную страницу и ссылки.

# Доставка изменений Genora.art

- Если пользователь просит изменить или исправить проект, после реализации и проверок самостоятельно создать коммит в текущей ветке, отправить его в `origin`, дождаться штатного автодеплоя и обновить GitNexus.
- Для обычного push в `git@github.com:kimlev/Genora.art.git` и деплоя Genora.art повторное подтверждение не запрашивать.
- В итоговом отчёте кратко перечислить сделанное, дать ссылку на коммит и указать статус GitNexus.
- Это правило не отменяет остановку перед раскрытием секретов, необратимыми удалениями, force-push и другими действиями за пределами обычного релиза.
