import Ajv2020 from 'ajv/dist/2020.js';

export const VIDEO_THEMES = [
  {
    id: 'sapphire-clay',
    name: 'Sapphire Clay',
    description: 'Sculpted shapes. Warm, tactile depth.',
    background: '#f5f0e9',
    surface: '#d9cbc2',
    ink: '#112250',
    accent: '#285070',
  },
  {
    id: 'clean-paper',
    name: 'Clean Paper',
    description: 'Quiet colour. Clear, precise diagrams.',
    background: '#fafaf7',
    surface: '#e9eeeb',
    ink: '#233b35',
    accent: '#437c69',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Deep contrast. A cinematic sense of focus.',
    background: '#162035',
    surface: '#273650',
    ink: '#f4f3ed',
    accent: '#b6cce9',
  },
  {
    id: 'classroom',
    name: 'Classroom',
    description: 'A familiar board for your next explanation.',
    background: '#233e37',
    surface: '#35564c',
    ink: '#f8f3dc',
    accent: '#efd28c',
  },
] as const;
export type VideoThemeId = (typeof VIDEO_THEMES)[number]['id'];
export type IdeaInputType = 'topic' | 'notes' | 'script' | 'url';
export type IdeaTone = 'clear' | 'friendly' | 'professional';
export type IdeaOperationKind = 'ideas' | 'script' | 'rewrite';
export type ScriptSection = {
  id: string;
  title: string;
  narration: string;
  visualSuggestion: string;
  sourceRefs: string[];
};
export type IdeaSuggestion = {
  title: string;
  hook: string;
  problem: string;
  outcome: string;
  rationale: string;
};
export type ScriptResult = { sections: ScriptSection[]; reviewNotes: string[] };
export type IdeasResult = { ideas: IdeaSuggestion[] };
export type IdeaDraft = ScriptResult & {
  title: string;
  inputType: IdeaInputType;
  inputText: string;
  sourceUrl: string;
  sourceConfirmed: boolean;
  sourceRetrievedAt: string | null;
  audience: string;
  objective: string;
  selectedIdea: string;
  tone: IdeaTone;
  durationSeconds: 30 | 60 | 90;
  themeId: VideoThemeId;
};
export type IdeaProject = {
  id: string;
  revisionId: string;
  revisionNumber: number;
  updatedAt: string;
  draft: IdeaDraft;
  scriptApproved: boolean;
  scriptStale: boolean;
  latestOperation: IdeaOperation | null;
  ideas: IdeaSuggestion[];
};
export type IdeaOperation = {
  id: string;
  kind: IdeaOperationKind;
  state: 'running' | 'succeeded' | 'failed' | 'uncertain';
  createdAt: string;
  errorCode: string | null;
  result: ScriptResult | IdeasResult | null;
  applied: boolean;
};
export type IdeaCapabilities = {
  allowed: boolean;
  dailyLimit: number;
  remaining: number;
  configured: boolean;
  ready: boolean;
};

const text = (maxLength: number, minLength = 0) => ({ type: 'string', minLength, maxLength });
export const scriptSectionSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'title', 'narration', 'visualSuggestion', 'sourceRefs'],
  properties: {
    id: { ...text(64, 1), pattern: '^[a-zA-Z0-9_-]+$' },
    title: text(100, 1),
    narration: text(1600, 1),
    visualSuggestion: text(400),
    sourceRefs: {
      type: 'array',
      maxItems: 1,
      uniqueItems: true,
      items: { type: 'string', enum: ['source-1'] },
    },
  },
};
export const scriptResultSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['sections', 'reviewNotes'],
  properties: {
    sections: { type: 'array', minItems: 1, maxItems: 8, items: scriptSectionSchema },
    reviewNotes: { type: 'array', maxItems: 8, items: text(300, 1) },
  },
};
export const ideasResultSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['ideas'],
  properties: {
    ideas: {
      type: 'array',
      minItems: 5,
      maxItems: 5,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'hook', 'problem', 'outcome', 'rationale'],
        properties: {
          title: text(120, 1),
          hook: text(250, 1),
          problem: text(250, 1),
          outcome: text(250, 1),
          rationale: text(250, 1),
        },
      },
    },
  },
};
export const ideaDraftSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'title',
    'inputType',
    'inputText',
    'sourceUrl',
    'sourceConfirmed',
    'sourceRetrievedAt',
    'audience',
    'objective',
    'selectedIdea',
    'tone',
    'durationSeconds',
    'themeId',
    'sections',
    'reviewNotes',
  ],
  properties: {
    title: text(200, 1),
    inputType: { type: 'string', enum: ['topic', 'notes', 'script', 'url'] },
    inputText: text(16000),
    sourceUrl: text(2048),
    sourceConfirmed: { type: 'boolean' },
    sourceRetrievedAt: {
      anyOf: [
        { type: 'null' },
        { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$' },
      ],
    },
    audience: text(300),
    objective: text(500),
    selectedIdea: text(500),
    tone: { type: 'string', enum: ['clear', 'friendly', 'professional'] },
    durationSeconds: { type: 'integer', enum: [30, 60, 90] },
    themeId: { type: 'string', enum: VIDEO_THEMES.map((theme) => theme.id) },
    sections: { type: 'array', maxItems: 8, items: scriptSectionSchema },
    reviewNotes: scriptResultSchema.properties.reviewNotes,
  },
};
const ajv = new Ajv2020({ allErrors: true, strict: true });
const validateDraftShape = ajv.compile<IdeaDraft>(ideaDraftSchema);
const validateScriptShape = ajv.compile<ScriptResult>(scriptResultSchema);
const validateIdeasShape = ajv.compile<IdeasResult>(ideasResultSchema);
export type IdeaValidation<T> = { success: true; data: T } | { success: false; errors: string[] };

export function countScriptWords(sections: readonly ScriptSection[]): number {
  const text = sections
    .map((section) => section.narration)
    .join(' ')
    .trim();
  return text ? text.split(/\s+/u).length : 0;
}
export function estimateSpeechSeconds(sections: readonly ScriptSection[]): number {
  return Math.round((countScriptWords(sections) * 60) / 140);
}
function sectionErrors(
  sections: readonly ScriptSection[],
  inputType: IdeaInputType,
  historical = false,
) {
  const errors: string[] = [];
  if (new Set(sections.map((section) => section.id)).size !== sections.length)
    errors.push('Section identifiers must be unique.');
  if (sections.some((section) => !section.narration.trim() || !section.title.trim()))
    errors.push('Each section needs a title and narration.');
  if (countScriptWords(sections) > 420)
    errors.push('Keep the script within 420 words for this pilot.');
  if (!historical && inputType === 'topic' && sections.some((section) => section.sourceRefs.length))
    errors.push('A topic alone is not a factual source.');
  return errors;
}
export function validateIdeaDraft(input: unknown): IdeaValidation<IdeaDraft> {
  if (!validateDraftShape(input))
    return {
      success: false,
      errors: (validateDraftShape.errors ?? []).map(
        (error) => `${error.instancePath || '/'} ${error.message}`,
      ),
    };
  const errors = sectionErrors(input.sections, input.inputType, true);
  if (!input.title.trim()) errors.push('Give your project a title.');
  return errors.length ? { success: false, errors } : { success: true, data: input };
}
export function validateIdeaResult(
  kind: IdeaOperationKind,
  input: unknown,
  inputType: IdeaInputType,
): IdeaValidation<ScriptResult | IdeasResult> {
  if (kind === 'ideas')
    return validateIdeasShape(input)
      ? { success: true, data: input }
      : { success: false, errors: ['The idea response did not match the expected format.'] };
  if (!validateScriptShape(input))
    return { success: false, errors: ['The script response did not match the expected format.'] };
  const errors = sectionErrors(input.sections, inputType);
  return errors.length ? { success: false, errors } : { success: true, data: input };
}
export function emptyIdeaDraft(): IdeaDraft {
  return {
    title: 'Untitled video',
    inputType: 'topic',
    inputText: '',
    sourceUrl: '',
    sourceConfirmed: false,
    sourceRetrievedAt: null,
    audience: '',
    objective: '',
    selectedIdea: '',
    tone: 'clear',
    durationSeconds: 60,
    themeId: 'sapphire-clay',
    sections: [],
    reviewNotes: [],
  };
}
export function canonicalIdeaJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalIdeaJson).join(',')}]`;
  if (typeof value === 'object' && value !== null)
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalIdeaJson(item)}`)
      .join(',')}}`;
  return JSON.stringify(value);
}
