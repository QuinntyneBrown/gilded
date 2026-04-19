'use strict';

const BARE = new Set(['button', 'input', 'select', 'textarea']);
const MAT_PREFIX = /^mat/i;

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: { description: 'Require Material directives on interactive HTML elements.' },
    schema: [],
    messages: { bare: 'Bare <{{name}}> is not allowed; use a Material component or directive.' },
  },
  create(context) {
    return {
      'Element'(node) {
        if (!BARE.has(node.name)) return;
        const attrs = [...(node.attributes ?? []), ...(node.inputs ?? [])];
        if (!attrs.some(a => MAT_PREFIX.test(a.name))) {
          context.report({ node, messageId: 'bare', data: { name: node.name } });
        }
      },
    };
  },
};
