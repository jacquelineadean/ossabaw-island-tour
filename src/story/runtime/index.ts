import data from "@/story/data/chronicle.json";
import { boot } from "./boot.js";
import habitat from "./widgets/habitat.js";
import house from "./widgets/house.js";
import nest from "./widgets/nest.js";
import tour from "./widgets/tour.js";

let started = false;

/**
 * Wires the charts, widgets, tooltips and progress bar onto the rendered page.
 * The engine adds window listeners and has no teardown, so it runs once per page load
 * (React StrictMode calls effects twice in development).
 */
export function startStory() {
  if (started) return;
  started = true;
  boot(data, { tour, house, habitat, nest });
}
