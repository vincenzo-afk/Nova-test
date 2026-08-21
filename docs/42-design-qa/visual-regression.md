# Visual Regression

Automated screenshot diffing runs against every screen in `40-screens/` at three viewport widths (720/1280/1920) and both light/dark themes, per PR. A diff above the documented pixel-delta threshold blocks merge unless explicitly acknowledged as an intended change.
