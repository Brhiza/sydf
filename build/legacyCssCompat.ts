import type { Plugin } from 'vite';

function findClosingParenthesis(value: string, openIndex: number) {
  let depth = 0;
  for (let index = openIndex; index < value.length; index += 1) {
    if (value[index] === '(') depth += 1;
    if (value[index] === ')') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function splitTopLevel(value: string) {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === '(') depth += 1;
    else if (value[index] === ')') depth -= 1;
    else if (value[index] === ',' && depth === 0) {
      parts.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  parts.push(value.slice(start).trim());
  return parts;
}

function stripMixPercentage(color: string) {
  return color.replace(/\s+-?(?:\d+\.?\d*|\.\d+)%\s*$/, '').trim();
}

function replaceColorMix(value: string) {
  let result = value;
  let searchFrom = 0;
  while (true) {
    const start = result.indexOf('color-mix(', searchFrom);
    if (start < 0) break;
    const open = start + 'color-mix'.length;
    const end = findClosingParenthesis(result, open);
    if (end < 0) break;
    const parts = splitTopLevel(result.slice(open + 1, end));
    const fallback = stripMixPercentage(parts[1] || '') || 'transparent';
    result = `${result.slice(0, start)}${fallback}${result.slice(end + 1)}`;
    searchFrom = start + fallback.length;
  }
  return result;
}

function legacyValue(value: string) {
  return replaceColorMix(value)
    .replace(/(-?(?:\d+\.?\d*|\.\d+))dvh\b/g, '$1vh')
    .replace(/env\(\s*safe-area-inset-(?:top|right|bottom|left)\s*(?:,[^)]*)?\)/g, '0px');
}

/**
 * 为旧 Android WebView 生成同属性的保守值。支持新语法的内核仍使用紧随其后的原声明。
 */
export function addLegacyCssFallbacks(css: string) {
  const declaration = /(^|[;{])(\s*)([-\w]+)\s*:\s*([^;{}]+)(?=[;}])/g;
  return css.replace(declaration, (whole, boundary: string, spacing: string, property: string, value: string) => {
    const fallback = legacyValue(value);
    const declarations: string[] = [];
    if (property === 'backdrop-filter') declarations.push(`-webkit-backdrop-filter:${value}`);
    if (fallback !== value) declarations.push(`${property}:${fallback}`);
    if (!declarations.length) return whole;
    return `${boundary}${spacing}${declarations.join(`;${spacing}`)};${spacing}${property}:${value}`;
  });
}

export function legacyCssCompatPlugin(): Plugin {
  return {
    name: 'legacy-webview-css-fallbacks',
    enforce: 'post',
    generateBundle(_options, bundle) {
      for (const item of Object.values(bundle)) {
        if (item.type !== 'asset' || !item.fileName.endsWith('.css') || typeof item.source !== 'string') continue;
        item.source = addLegacyCssFallbacks(item.source);
      }
    },
  };
}
