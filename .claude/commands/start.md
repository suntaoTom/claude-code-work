You just joined this project. Please follow these steps to get oriented:

> Note: CLAUDE.md and project conventions under .claude/rules/ are already auto-loaded — no need to re-read them.

## Step 1: Understand the Current Project State

1. Scan the `workspace/src/` directory structure to understand the existing code modules and file layout
2. Check `workspace/package.json` to confirm installed dependencies and available scripts
3. Check the `workspace/config/` directory to understand project configuration (routes / theme / proxy, etc.)

## Step 2: Check Current Task Progress

Scan all JSON files in the `docs/tasks/` directory and output a summary:

1. **In-progress modules**: list all modules that have non-done tasks
2. **Pending tasks**: list all tasks with status `pending` or `in-progress`, grouped by module
3. **Completed**: count of done tasks / total tasks

Output format:
```
📋 Current Project Status
━━━━━━━━━━━━━━

[Module 1] (3/5 complete)
  ✅ T001 - userApi (done)
  ✅ T002 - useUserStore (done)
  ✅ T003 - UserTable (done)
  ⏳ T004 - UserForm (in-progress)
  ⬜ T005 - UserPage (pending, depends on T004)

[Module 2] (0/3 complete)
  ⬜ T001 - orderApi (pending)
  ⬜ T002 - useOrderStore (pending, depends on T001)
  ⬜ T003 - OrderList (pending, depends on T002)

━━━━━━━━━━━━━━
Total: X modules, Y/Z tasks complete
```

## Step 3: Wait for Instructions

After reporting, wait for my next instruction. Do not start coding on your own.
