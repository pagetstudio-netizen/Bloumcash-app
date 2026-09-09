---
name: Package firewall
description: Replit package-firewall behavior encountered while installing the imported workspace
---

The package firewall may reject an older dependency release even when the workspace lockfile is otherwise valid. For this project, the imported Orval release was unavailable through the firewall, while a newer compatible Orval release installed successfully.

**Why:** A frozen install cannot complete when the registry blocks a locked tarball, and bypassing the firewall would weaken the project’s supply-chain protection.

**How to apply:** If a future frozen install fails on a direct dependency with a registry 403, check the latest safe release, update that dependency and the lockfile, then retry the frozen install.