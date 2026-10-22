#!/bin/sh
# deb/rpm post-install: expose the plotdocs command line shipped inside the app.
# Only an absent name, a dead link or a link into our own install dir is taken
# over; anything else at /usr/bin/plotdocs belongs to another program (plotdocs#893).
set -e
launcher="/opt/Plot Docs/resources/cli/plotdocs"
link="/usr/bin/plotdocs"
[ -x "$launcher" ] || exit 0
if [ -L "$link" ]; then
  case "$(readlink "$link")" in
    /opt/Plot Docs/*) ;;
    *) [ -e "$link" ] && { echo "plotdocs: $link is another program, left as is; run: ln -s $launcher $link" >&2; exit 0; } ;;
  esac
elif [ -e "$link" ]; then
  echo "plotdocs: $link is another program, left as is; run: ln -s $launcher $link" >&2
  exit 0
fi
ln -sfn "$launcher" "$link"
exit 0
