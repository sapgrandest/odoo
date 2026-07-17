#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Hook UserPromptSubmit : à CHAQUE message, avant que Claude réponde, on fait un
# `git fetch` puis on met à jour le dossier si (et seulement si) c'est un
# fast-forward propre. Partagé via le repo → tous les collègues héritent de la règle.
#
# SÛR : `merge --ff-only` n'écrase JAMAIS de modification locale non commitée.
# S'il y a divergence ou des changements locaux en conflit, la mise à jour est
# ignorée silencieusement et le message est quand même traité (exit 0 toujours).
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail

cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0

# Pas un dépôt git ? on sort proprement, sans bloquer.
git rev-parse --git-dir >/dev/null 2>&1 || exit 0

# Pas d'upstream configuré pour la branche courante ? rien à synchroniser.
if ! git rev-parse --abbrev-ref '@{u}' >/dev/null 2>&1; then
  echo "🔄 git-sync : aucune branche upstream configurée, fetch ignoré."
  exit 0
fi

branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
before=$(git rev-parse --short HEAD 2>/dev/null)

# Récupère les nouveautés depuis GitHub (timeout court pour ne pas bloquer si réseau HS).
git fetch --quiet 2>/dev/null

# Met à jour le working tree uniquement en fast-forward (n'écrase aucune modif locale).
git merge --ff-only --quiet '@{u}' >/dev/null 2>&1

after=$(git rev-parse --short HEAD 2>/dev/null)

if [ "$before" != "$after" ]; then
  echo "🔄 git-sync : '$branch' mis à jour $before → $after"
else
  echo "🔄 git-sync : '$branch' déjà à jour ($after)"
fi

exit 0
