import fs from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';

const traverse = traverseModule.default || traverseModule;

const ROOT = path.resolve('src');
const files = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.js')) files.push(full);
  }
}
walk(ROOT);
files.push(path.resolve('App.js'));

const found = new Map();

const normalize = (text) => String(text).replace(/\s+/g, ' ').trim();

function add(text) {
  const key = normalize(text);
  if (!key || key.length < 2) return null;
  if (!/[A-Za-z]/.test(key)) return null;
  if (!found.has(key)) found.set(key, new Set());
  return key;
}

function collectStatic(node) {
  if (!node) return;
  if (node.type === 'StringLiteral') add(node.value);
  else if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
    add(node.quasis.map((q) => q.value.cooked).join(''));
  } else if (node.type === 'ConditionalExpression') {
    collectStatic(node.consequent);
    collectStatic(node.alternate);
  } else if (node.type === 'LogicalExpression') {
    collectStatic(node.left);
    collectStatic(node.right);
  } else if (node.type === 'ArrayExpression') {
    node.elements.forEach(collectStatic);
  }
}

function jsxName(node) {
  if (!node) return '';
  if (node.type === 'JSXIdentifier') return node.name;
  if (node.type === 'JSXMemberExpression') return node.property.name;
  return '';
}

for (const file of files) {
  const code = fs.readFileSync(file, 'utf8');
  const rel = path.relative(process.cwd(), file).replace(/\\/g, '/');
  let ast;
  try {
    ast = parse(code, {
      sourceType: 'module',
      plugins: ['jsx'],
      errorRecovery: true,
    });
  } catch (e) {
    console.error('parse failed', rel, e.message);
    continue;
  }

  traverse(ast, {
    JSXElement(nodePath) {
      const node = nodePath.node;
      const name = jsxName(node.openingElement.name);
      const isText = name === 'Text' || name === 'LocalizedText';
      const parentIsText = nodePath.findParent(
        (p) => p.isJSXElement() && jsxName(p.node.openingElement.name) === 'Text'
      );

      if (!isText && !parentIsText) return;

      for (const child of node.children) {
        if (child.type === 'JSXText') {
          const text = normalize(child.value);
          const k1 = add(text);
          if (k1) found.get(k1).add(rel);
        } else if (child.type === 'JSXExpressionContainer') {
          collectStatic(child.expression);
        } else if (child.type === 'JSXElement') {
          // nested element text handled by its own visit
        }
      }
    },
    JSXAttribute(nodePath) {
      const attr = nodePath.node.name.name;
      if (!['placeholder', 'accessibilityLabel', 'accessibilityHint'].includes(attr)) return;
      const value = nodePath.node.value;
      if (value && value.type === 'StringLiteral') {
        const k2 = add(value.value);
        if (k2) found.get(k2).add(rel);
      }
    },
    ObjectProperty(nodePath) {
      const key = nodePath.node.key;
      const keyName = key.type === 'Identifier' ? key.name : key.type === 'StringLiteral' ? key.value : '';
      if (!['label', 'title', 'sub', 'body', 'actionLabel', 'secondaryLabel', 'text', 'hint'].includes(keyName)) {
        return;
      }
      const value = nodePath.node.value;
      if (value && value.type === 'StringLiteral') {
        const k3 = add(value.value);
        if (k3) found.get(k3).add(rel);
      }
    },
    VariableDeclarator(nodePath) {
      const id = nodePath.node.id;
      if (id?.type !== 'Identifier' || !/^[A-Z][A-Z0-9_]+$/.test(id.name)) return;
      const init = nodePath.node.init;
      if (init?.type !== 'ArrayExpression') return;
      init.elements.forEach((element) => {
        if (element?.type === 'StringLiteral') {
          const k4 = add(element.value);
          if (k4) found.get(k4).add(rel);
        }
      });
    },
    CallExpression(nodePath) {
      const callee = nodePath.node.callee;
      const isAlert =
        callee.type === 'MemberExpression' &&
        callee.object.name === 'Alert' &&
        callee.property.name === 'alert';
      if (isAlert && nodePath.node.arguments[0]) collectStatic(nodePath.node.arguments[0]);
    },
  });
}

const out = [...found.keys()].sort();
fs.writeFileSync('scripts/strings.json', JSON.stringify(out, null, 2));
console.log(`collected ${out.length} strings -> scripts/strings.json`);
for (const [key, sources] of found) {
  if (sources.size > 1) console.log(`[${[...sources].join(', ')}] ${key}`);
}


