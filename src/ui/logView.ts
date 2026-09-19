import { ScrolledWindow, TextView, Window } from "@sigmasd/gtk/gtk4";
import { AdwWindow, HeaderBar, ToolbarView } from "@sigmasd/gtk/adw";
import { readLastOutput, readState } from "../jobRegistry.ts";

export async function openLogView(parent: Window, slug: string, name: string): Promise<void> {
  const dlg = new AdwWindow();
  dlg.setTitle(`Log: ${name}`);
  dlg.setDefaultSize(600, 400);
  dlg.setModal(true);
  dlg.setTransientFor(parent);

  const { lastRun, changed } = await readState(slug);
  const output = await readLastOutput(slug);

  const view = new TextView();
  view.setEditable(false);
  view.setCursorVisible(false);
  view.setMonospace(true);
  view.setVexpand(true);
  view.setHexpand(true);
  view.getBuffer().setText(
    `Last run: ${lastRun ?? "never"}   Changed: ${changed ?? "n/a"}\n\n${output}`,
    -1,
  );

  const scroller = new ScrolledWindow();
  scroller.setChild(view);
  scroller.setVexpand(true);
  scroller.setHexpand(true);

  const header = new HeaderBar();
  const toolbarView = new ToolbarView();
  toolbarView.addTopBar(header);
  toolbarView.setContent(scroller);
  dlg.setContent(toolbarView);

  dlg.present();
}
