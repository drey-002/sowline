import type { CompanionPair } from "@/lib/types";

// Pairings are only ever shown for crops the gardener actually selected (PRD §4.4).
// Reasons are one plain sentence — no folklore without a mechanism.

export const COMPANIONS: CompanionPair[] = [
  { id: "cp-1", cropAId: "bush-bean-provider", cropBId: "lacinato-kale", relationship: "companion", reason: "Beans fix nitrogen the kale spends the whole season using." },
  { id: "cp-2", cropAId: "bush-bean-provider", cropBId: "zucchini-costata-romanesco", relationship: "companion", reason: "Beans feed nitrogen to a heavy feeder that would otherwise strip the bed." },
  { id: "cp-3", cropAId: "bush-bean-provider", cropBId: "carrot-nantes", relationship: "companion", reason: "Carrots work the soil below the shallow bean roots, so neither competes." },
  { id: "cp-4", cropAId: "bush-bean-provider", cropBId: "onion-copra", relationship: "antagonist", reason: "Alliums suppress the root bacteria beans rely on to fix nitrogen." },
  { id: "cp-5", cropAId: "pole-bean-kentucky-wonder", cropBId: "beet-detroit-dark-red", relationship: "antagonist", reason: "Pole beans shade beets out and stunt the roots before they size up." },
  { id: "cp-6", cropAId: "paste-tomato-roma", cropBId: "basil-genovese", relationship: "companion", reason: "Basil occupies the open ground under staked tomatoes and masks their scent from thrips." },
  { id: "cp-7", cropAId: "paste-tomato-roma", cropBId: "potato-yukon-gold", relationship: "antagonist", reason: "Both carry late blight, so planting them together doubles the chance of losing each." },
  { id: "cp-8", cropAId: "paste-tomato-roma", cropBId: "lacinato-kale", relationship: "antagonist", reason: "Both are hungry feeders on the same schedule and one will go short." },
  { id: "cp-9", cropAId: "paste-tomato-roma", cropBId: "carrot-nantes", relationship: "companion", reason: "Carrots finish before the tomatoes need the full square foot." },
  { id: "cp-10", cropAId: "lacinato-kale", cropBId: "beet-detroit-dark-red", relationship: "companion", reason: "Beets sit low between kale plants and use the space before the leaves close over." },
  { id: "cp-11", cropAId: "lacinato-kale", cropBId: "spinach-bloomsdale", relationship: "antagonist", reason: "Two brassica-bed greens draw the same pests to one place." },
  { id: "cp-12", cropAId: "carrot-nantes", cropBId: "onion-copra", relationship: "companion", reason: "Onion scent confuses carrot rust fly, and carrots return the favour against onion fly." },
  { id: "cp-13", cropAId: "lettuce-salanova", cropBId: "radish-cherry-belle", relationship: "companion", reason: "Radishes mark the slow lettuce rows and clear out before the lettuce needs the room." },
  { id: "cp-14", cropAId: "cucumber-marketmore", cropBId: "dill-bouquet", relationship: "companion", reason: "Dill flowers draw the wasps that work the cucumber beetles." },
  { id: "cp-15", cropAId: "cucumber-marketmore", cropBId: "potato-yukon-gold", relationship: "antagonist", reason: "Cucumbers make potatoes markedly more susceptible to blight." },
  { id: "cp-16", cropAId: "zucchini-costata-romanesco", cropBId: "radish-cherry-belle", relationship: "companion", reason: "Radishes left to flower near the hills pull squash bugs off the young vines." },
  { id: "cp-17", cropAId: "beet-detroit-dark-red", cropBId: "bok-choy-joi-choi", relationship: "companion", reason: "Both clear the bed by midsummer, so the square foot turns over twice." },
  { id: "cp-18", cropAId: "pea-sugar-snap", cropBId: "spinach-bloomsdale", relationship: "companion", reason: "Spinach uses the shade under the pea trellis through the part of spring it would otherwise bolt in." },
  { id: "cp-19", cropAId: "pepper-bell-king-north", cropBId: "basil-genovese", relationship: "companion", reason: "Basil shelters the soil around peppers and keeps it from drying between waterings." },
  { id: "cp-20", cropAId: "cabbage-early-jersey", cropBId: "bush-bean-provider", relationship: "companion", reason: "Beans put back the nitrogen a cabbage crop takes out of the bed." },
];

/** Every pair touching this crop, regardless of which side it sits on. */
export function pairsForCrop(cropId: string): CompanionPair[] {
  return COMPANIONS.filter((p) => p.cropAId === cropId || p.cropBId === cropId);
}

export function otherCropId(pair: CompanionPair, cropId: string): string {
  return pair.cropAId === cropId ? pair.cropBId : pair.cropAId;
}
