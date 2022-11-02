import { parse } from 'https://deno.land/std@0.159.0/flags/mod.ts';
import { default as highlight } from 'https://cdn.skypack.dev/highlight.js@11.6.0';
// @deno-types="https://cdn.skypack.dev/@types/markdown-it@12.2.3?dts"
import MarkdownIt from 'https://esm.sh/markdown-it@13.0.1?no-dts';
// @deno-types="./markdownit_plugin.d.ts"
import { default as MarkdownItEmoji } from 'https://esm.sh/markdown-it-emoji@2.0.2?no-dts';
// @deno-types="./markdownit_plugin.d.ts"
import { default as MarkdownItFootnote } from 'https://esm.sh/markdown-it-footnote@3.0.3?no-dts';
// @deno-types="./markdownit_plugin.d.ts"
import { default as MarkdownItTaskLists } from 'https://esm.sh/markdown-it-task-lists@2.1.1?no-dts';
// @deno-types="./markdownit_plugin.d.ts"
import { default as MarkdownItTextualUml } from 'https://esm.sh/markdown-it-textual-uml@0.12.0?no-dts';

const __args = parse(Deno.args);

const md = new MarkdownIt('default', {
  html: true,
  typographer: true,
  linkify: true,
  langPrefix: 'language-',
  highlight: __args['syntax'] && ((code, language) => {
    if (language && highlight.getLanguage(language)) {
      try {
        return highlight.highlight(code, { language }).value;
      } catch (_) { /**/ }
    }

    return '';
  }),
}).use(MarkdownItEmoji)
  .use(MarkdownItFootnote)
  .use(MarkdownItTaskLists, { enabled: false, label: true })
  .use(MarkdownItTextualUml);

md.renderer.rules.link_open = (tokens, idx, options) => {
  const token = tokens[idx];
  const href = token.attrGet('href');

  if (href && href.startsWith('#')) {
    token.attrSet('onclick', `location.hash='${href}'`);
  }

  token.attrSet('href', 'javascript:return');

  return md.renderer.renderToken(tokens, idx, options);
};

md.renderer.rules.heading_open = (tokens, idx, options) => {
  tokens[idx].attrSet(
    'id',
    tokens[idx + 1].content
      .trim()
      .split(' ')
      .filter((a) => a)
      .join('-')
      .replace(/[^a-z0-9-]/gi, '')
      .toLowerCase(),
  );

  return md.renderer.renderToken(tokens, idx, options);
};

export function render(markdown: string) {
  const tokens = md.parse(markdown, {});

  tokens.forEach((token) => {
    if (token.map && token.level === 0) {
      token.attrSet('data-line-begin', String(token.map[0] + 1));
    }
  });

  return md.renderer.render(tokens, md.options, {});
}
