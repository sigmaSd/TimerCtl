import type { Window } from "@sigmasd/gtk/gtk4";
import { MessageDialog, ResponseAppearance } from "@sigmasd/gtk/adw";
import type { Job } from "../jobRegistry.ts";
import { deleteJob } from "../jobService.ts";

export function confirmDeleteAndRun(
  parent: Window,
  job: Job,
  onDone: () => void,
): void {
  const dlg = new MessageDialog(
    parent,
    `Delete "${job.name}"?`,
    "This stops and disables its timer and permanently removes its script and history.",
  );
  dlg.addResponse("cancel", "Cancel");
  dlg.addResponse("delete", "Delete");
  dlg.setResponseAppearance("delete", ResponseAppearance.DESTRUCTIVE);
  dlg.setDefaultResponse("cancel");
  dlg.setCloseResponse("cancel");
  dlg.onResponse(async (response) => {
    if (response === "delete") {
      await deleteJob(job.slug);
      onDone();
    }
    dlg.destroy();
  });
  dlg.present();
}

export function showError(parent: Window, title: string, body: string): void {
  const dlg = new MessageDialog(parent, title, body);
  dlg.addResponse("ok", "OK");
  dlg.onResponse(() => dlg.destroy());
  dlg.present();
}
