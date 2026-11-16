import data from "@/story/data/chronicle.json";
import { boot } from "./boot.js";
import habitat from "./widgets/habitat.js";
import house from "./widgets/house.js";
import nest from "./widgets/nest.js";

let started = false;

/**
 * Wires the charts, widgets and tooltips onto the rendered page.
 * The engine adds window listeners and has no teardown, so it runs once per page load
 * (React StrictMode calls effects twice in development).
 *
 * Every stop is in the DOM from the first render, and the tour hides all but the current one.
 * Figures in a hidden stop start at a fallback width; they lay themselves out again on the
 * resize event the tour sends when it shows a stop.
 */
export function startStory() {
  if (started) return;
  started = true;
  boot(data, { house, habitat, nest });
}
