import {
  Align,
  Box,
  Button,
  CheckButton,
  DropDown,
  Entry,
  Label,
  Orientation,
  ScrolledWindow,
  StringList,
  TextView,
  Widget,
  Window,
} from "@sigmasd/gtk/gtk4";
import { AdwWindow, HeaderBar, ToolbarView } from "@sigmasd/gtk/adw";
import { PERIOD_PRESETS } from "../period.ts";
import { type JobInput, createJob, updateJob, validateJobInput } from "../jobService.ts";
import type { Job } from "../jobRegistry.ts";
import { readScript } from "../jobRegistry.ts";

function fieldRow(labelText: string, widget: Widget): Box {
  const row = new Box(Orientation.VERTICAL, 4);
  const label = new Label(labelText);
  label.setXalign(0);
  row.append(label);
  row.append(widget);
  return row;
}

export async function openJobDialog(parent: Window, existing: Job | null): Promise<boolean> {
  const existingScript = existing ? await readScript(existing.slug) : "";

  return new Promise((resolve) => {
    const dlg = new AdwWindow();
    dlg.setTitle(existing ? `Edit "${existing.name}"` : "Add Job");
    dlg.setDefaultSize(480, 560);
    dlg.setModal(true);
    dlg.setTransientFor(parent);

    const header = new HeaderBar();
    const content = new Box(Orientation.VERTICAL, 16);
    content.setMarginTop(16);
    content.setMarginBottom(16);
    content.setMarginStart(16);
    content.setMarginEnd(16);

    const nameEntry = new Entry();
    nameEntry.setPlaceholderText("e.g. opencode free models");
    if (existing) nameEntry.setText(existing.name);
    content.append(fieldRow("Name", nameEntry));

    const scriptView = new TextView();
    scriptView.setMonospace(true);
    scriptView.getBuffer().setText(existingScript || "#!/usr/bin/env bash\n", -1);
    const scriptScroller = new ScrolledWindow();
    scriptScroller.setMinContentHeight(180);
    scriptScroller.setChild(scriptView);
    content.append(fieldRow("Script (bash)", scriptScroller));

    const presetModel = new StringList(PERIOD_PRESETS.map((p) => p.label));
    const presetDropDown = new DropDown(presetModel);
    const existingPresetIndex = existing
      ? PERIOD_PRESETS.findIndex((p) => p.value === existing.period)
      : -1;
    presetDropDown.setSelected(existingPresetIndex >= 0 ? existingPresetIndex : 3); // default "Every 6 hours"
    content.append(fieldRow("Period", presetDropDown));

    const customEntry = new Entry();
    customEntry.setPlaceholderText('Custom override, e.g. "45min" (leave blank to use preset above)');
    if (existing && existingPresetIndex === -1) customEntry.setText(existing.period);
    content.append(fieldRow("Custom period (optional)", customEntry));

    const notifyCheck = new CheckButton("Only notify when output changes");
    notifyCheck.setActive(existing?.notifyOnChangeOnly ?? true);
    content.append(notifyCheck);

    const errorLabel = new Label("");
    errorLabel.setWrap(true);
    errorLabel.setXalign(0);
    errorLabel.addCssClass("error");
    content.append(errorLabel);

    const btnRow = new Box(Orientation.HORIZONTAL, 8);
    btnRow.setHalign(Align.END);
    const cancelBtn = new Button("Cancel");
    const saveBtn = new Button(existing ? "Save" : "Create");
    saveBtn.addCssClass("suggested-action");
    btnRow.append(cancelBtn);
    btnRow.append(saveBtn);
    content.append(btnRow);

    cancelBtn.onClick(() => {
      dlg.destroy();
      resolve(false);
    });

    saveBtn.onClick(async () => {
      saveBtn.setSensitive(false);
      const buf = scriptView.getBuffer();
      const { start, end } = buf.getBounds();
      const selectedIdx = presetDropDown.getSelected();
      const input: JobInput = {
        name: nameEntry.getText(),
        script: buf.getText(start, end, true),
        periodPreset: PERIOD_PRESETS[selectedIdx]?.value ?? "",
        customPeriod: customEntry.getText(),
        notifyOnChangeOnly: notifyCheck.getActive(),
      };
      const errors = await validateJobInput(input);
      if (errors.length) {
        errorLabel.setText(errors.map((e) => e.message).join(" "));
        saveBtn.setSensitive(true);
        return;
      }
      if (existing) {
        await updateJob(existing.slug, input);
      } else {
        await createJob(input);
      }
      dlg.destroy();
      resolve(true);
    });

    const toolbarView = new ToolbarView();
    toolbarView.addTopBar(header);
    toolbarView.setContent(content);
    dlg.setContent(toolbarView);

    dlg.onCloseRequest(() => {
      resolve(false);
      return false;
    });

    dlg.present();
  });
}
