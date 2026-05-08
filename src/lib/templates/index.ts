import linkedinAds from "./linkedin-ads";
import metaAds from "./meta-ads";
import googleAds from "./google-ads";
import ga4 from "./ga4";
import searchConsole from "./search-console";
import awr from "./awr";
import keywordVolume from "./keyword-volume";
import blobStorage from "./blob-storage";
import geminiImage from "./gemini-image";
import openrouterImage from "./openrouter-image";
import type { Template } from "./types";

const ALL: Template[] = [
  linkedinAds,
  metaAds,
  googleAds,
  ga4,
  searchConsole,
  awr,
  keywordVolume,
  blobStorage,
  geminiImage,
  openrouterImage,
];

export const TEMPLATES: Record<string, Template> = Object.fromEntries(ALL.map((t) => [t.slug, t]));

export function getTemplate(slug: string): Template | undefined {
  return TEMPLATES[slug];
}

export function listTemplates(): Template[] {
  return ALL.slice();
}
