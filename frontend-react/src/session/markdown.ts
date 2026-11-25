import DOMPurify from 'dompurify';
import { marked } from 'marked';

const FORBIDDEN_TAGS = [
  'form',
  'input',
  'button',
  'textarea',
  'select',
  'option',
  'optgroup',
  'style',
];
const FORBIDDEN_ATTRIBUTES = ['style'];

export function renderMarkdown(text: string): string {
  return DOMPurify.sanitize(marked.parse(text, { async: false }), {
    USE_PROFILES: { html: true },
    FORBID_TAGS: FORBIDDEN_TAGS,
    FORBID_ATTR: FORBIDDEN_ATTRIBUTES,
  });
}
