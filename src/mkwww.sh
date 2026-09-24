#!/bin/sh
# www/ = האתר כמו שהוא בתיקייה (הראשי לא נוגעים) + out-preview/ מעליו (/next/ ו-assets/v2n/ החדשים). פרמטר: שם תיקייה אחר
cd "$(dirname "$0")"
D=${1:-www}
rm -rf "$D" && mkdir "$D"
for f in ../*; do case "$(basename "$f")" in src|_private|claude|"Claude outputs") ;; *) cp -r "$f" "$D"/ ;; esac; done
cp -r out-preview/. "$D"/
