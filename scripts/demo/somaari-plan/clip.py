"""Own the X11 clipboard with the contents of a file for N seconds (no xclip/xsel needed).

Usage: <python with PySide6> clip.py FILE [SECONDS]
"""

import sys

from PySide6.QtCore import QTimer
from PySide6.QtGui import QGuiApplication

app = QGuiApplication(sys.argv[:1])
with open(sys.argv[1], encoding="utf-8") as f:
    QGuiApplication.clipboard().setText(f.read())
QTimer.singleShot(int(float(sys.argv[2] if len(sys.argv) > 2 else 60) * 1000), app.quit)
print("clipboard ready", flush=True)
app.exec()
