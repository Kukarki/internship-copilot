export type VisaTag = "F1_FRIENDLY" | "BLOCKED" | "UNKNOWN" | "AMBIGUOUS";

const FRIENDLY_RE = /sponsorship (is )?available|will sponsor|offer(s|ing)?[^.]{0,25}sponsorship|visa sponsorship|\bopt\b|\bcpt\b|\bf-?1\b|international students|students are welcome|welcome international/i;

const BLOCKED_RE = /u\.?s\.? citizen|citizenship (is )?required|must be a (u\.?s\.? )?citizen|green[- ]?card|permanent resident(s)? only|no (visa )?sponsorship|not (able to |be able to )?sponsor|cannot sponsor|will not sponsor|unable to sponsor|do(es)? not (offer|provide)[^.]{0,20}sponsorship|without sponsorship|security clearance|clearance (is )?required|\bitar\b|export control|u\.?s\.? person/i;

const AUTH_MENTION_RE = /sponsor|work authoriz|authorized to work|\bvisa\b|immigration|eligible to work/i;

// Regex-only first pass. Returns AMBIGUOUS when auth is mentioned but unclear.
export function regexVisa(text: string): VisaTag {
  if (!text) return "UNKNOWN";
  if (FRIENDLY_RE.test(text)) return "F1_FRIENDLY";
  if (BLOCKED_RE.test(text)) return "BLOCKED";
  if (AUTH_MENTION_RE.test(text)) return "AMBIGUOUS";
  return "UNKNOWN";
}
