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
import openai from "./openai";
import anthropic from "./anthropic";
import slack from "./slack";
import notion from "./notion";
import airtable from "./airtable";
import github from "./github";
import stripe from "./stripe";
import razorpay from "./razorpay";
import hubspot from "./hubspot";
import mailchimp from "./mailchimp";
import sendgrid from "./sendgrid";
import resend from "./resend";
import replicate from "./replicate";
import type { Template } from "./types";

const ALL: Template[] = [
  // Built-in (already seeded)
  linkedinAds, metaAds, googleAds, ga4, searchConsole,
  awr, keywordVolume, blobStorage, geminiImage, openrouterImage,
  // Add-ons (available in marketplace)
  openai, anthropic, slack, notion, airtable, github,
  stripe, razorpay, hubspot, mailchimp, sendgrid, resend, replicate,
];

export const TEMPLATES: Record<string, Template> = Object.fromEntries(ALL.map((t) => [t.slug, t]));

export function getTemplate(slug: string): Template | undefined {
  return TEMPLATES[slug];
}

export function listTemplates(): Template[] {
  return ALL.slice();
}
