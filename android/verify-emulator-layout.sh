#!/usr/bin/env bash
set -euo pipefail

result_directory="${1:-launch-test}"
adb shell cmd overlay enable-exclusive --category com.android.internal.display.cutout.emulation.tall
for navigation in gestural threebutton; do
  adb shell cmd overlay enable-exclusive --category "com.android.internal.systemui.navbar.$navigation"
  adb shell am instrument -w -r -e class com.shootyq.clickclickboom.EdgeToEdgeTest com.squishsquishsplat.launchtests/androidx.test.runner.AndroidJUnitRunner > "$result_directory/insets-$navigation.txt"
  cat "$result_directory/insets-$navigation.txt"
  adb logcat -d -s AndroidRuntime:E SplatStartup:E chromium:E > "$result_directory/logcat-$navigation.txt"
  grep -q 'OK (1 test)' "$result_directory/insets-$navigation.txt"
  mkdir -p "$result_directory/screenshots-$navigation"
  adb pull /sdcard/Android/data/com.shootyq.clickclickboom.debug/files/edge-to-edge/. "$result_directory/screenshots-$navigation/"
done
