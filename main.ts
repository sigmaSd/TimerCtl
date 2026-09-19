import { Application, ApplicationFlags } from "@sigmasd/gtk/gtk4";
import { EventLoop } from "@sigmasd/gtk/eventloop";
import { init as initJobService } from "./src/jobService.ts";
import { buildMainWindow } from "./src/ui/mainWindow.ts";

const app = new Application("dev.mrcool.timerctl", ApplicationFlags.NONE);
const eventLoop = new EventLoop();

app.onActivate(async () => {
  await initJobService();
  const { win } = buildMainWindow(app);
  win.onCloseRequest(() => {
    eventLoop.stop();
    return false;
  });
  win.present();
});

await eventLoop.start(app);
