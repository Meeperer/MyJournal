/**
 * Overview (ARAS) structure. Matches AI output and stored arasContent shape.
 */

export type OverviewAras = {
  activity: string;
  reflection: string;
  analysis: string;
  summary: string;
};

export type OverviewFromAras = {
  corrected_entry: string;
  aras: OverviewAras;
  hover_preview: string[];
};
