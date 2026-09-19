import { Application, Button, ListBox, ScrolledWindow, SelectionMode, Window } from "@sigmasd/gtk/gtk4";
import { ActionRow, AdwApplicationWindow, HeaderBar, ToolbarView } from "@sigmasd/gtk/adw";
import { type JobStatus, listJobsWithStatus, runJobNow } from "../jobService.ts";
import { openJobDialog } from "./jobDialog.ts";
import { openLogView } from "./logView.ts";
import { confirmDeleteAndRun } from "./confirmDialog.ts";

function formatRelativeTime(iso: string | null): string {
  if (!iso) return "never";
  const then = new Date(iso).getTime();
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

function formatSubtitle(job: JobStatus): string {
  const changedText = job.changed === null ? "n/a" : job.changed ? "changed" : "unchanged";
  return `Every ${job.period} · ${job.enabled}, ${job.active} · last run ${
    formatRelativeTime(job.lastRun)
  } · ${changedText}`;
}

export function buildMainWindow(app: Application): { win: Window; rebuildJobList: () => Promise<void> } {
  const win = new AdwApplicationWindow(app);
  win.setTitle("timerctl");
  win.setDefaultSize(600, 480);

  const header = new HeaderBar();
  const addBtn = new Button("Add Job");
  const refreshBtn = new Button();
  refreshBtn.setIconName("view-refresh-symbolic");
  refreshBtn.setTooltipText("Refresh");
  header.packStart(addBtn);
  header.packEnd(refreshBtn);

  const listBox = new ListBox();
  listBox.setSelectionMode(SelectionMode.NONE);
  listBox.setShowSeparators(true);

  const scroller = new ScrolledWindow();
  scroller.setChild(listBox);
  scroller.setVexpand(true);

  const toolbarView = new ToolbarView();
  toolbarView.addTopBar(header);
  toolbarView.setContent(scroller);
  win.setContent(toolbarView);

  async function rebuildJobList() {
    listBox.removeAll();
    const statuses = await listJobsWithStatus();
    for (const job of statuses) {
      const row = new ActionRow();
      row.setTitle(job.name);
      row.setSubtitle(formatSubtitle(job));

      const runBtn = new Button();
      runBtn.setIconName("media-playback-start-symbolic");
      runBtn.setTooltipText("Run now");
      runBtn.onClick(async () => {
        runBtn.setSensitive(false);
        await runJobNow(job.slug);
        await rebuildJobList();
      });

      const logBtn = new Button();
      logBtn.setIconName("text-x-generic-symbolic");
      logBtn.setTooltipText("View last output");
      logBtn.onClick(() => {
        openLogView(win, job.slug, job.name);
      });

      const editBtn = new Button();
      editBtn.setIconName("document-edit-symbolic");
      editBtn.setTooltipText("Edit");
      editBtn.onClick(async () => {
        const changed = await openJobDialog(win, job);
        if (changed) await rebuildJobList();
      });

      const delBtn = new Button();
      delBtn.setIconName("user-trash-symbolic");
      delBtn.setTooltipText("Delete");
      delBtn.addCssClass("destructive-action");
      delBtn.onClick(() => {
        confirmDeleteAndRun(win, job, () => {
          rebuildJobList();
        });
      });

      for (const b of [runBtn, logBtn, editBtn, delBtn]) row.addSuffix(b);
      listBox.append(row);
    }
  }

  addBtn.onClick(async () => {
    const changed = await openJobDialog(win, null);
    if (changed) await rebuildJobList();
  });
  refreshBtn.onClick(() => {
    rebuildJobList();
  });

  rebuildJobList();

  return { win, rebuildJobList };
}
