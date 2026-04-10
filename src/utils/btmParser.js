import { DEFAULT_TAGS, NO_TAG } from "./constants.js";

export const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const tagColor = (v, tags) => {
  if (!v) return NO_TAG;
  return (tags || DEFAULT_TAGS).find((t) => t.v === v) || NO_TAG;
};

export const parseInlineMarkup_inner = (text, tags) => {
  const tagNames = (tags || DEFAULT_TAGS).map((t) => t.v).filter(Boolean);
  tagNames.sort((a, b) => b.length - a.length);
  const segments = [];
  const pushText = (ch) => {
    if (segments.length && segments[segments.length - 1].type === "text") segments[segments.length - 1].value += ch;
    else segments.push({ type: "text", value: ch });
  };
  let i = 0;
  while (i < text.length) {
    if (text[i] === "@") {
      let matched = false;
      for (const tn of tagNames) {
        if (text.substring(i + 1, i + 1 + tn.length) === tn) {
          const after = i + 1 + tn.length;
          if (after >= text.length || /[\s@\[]/.test(text[after])) {
            const tc = tagColor(tn, tags);
            segments.push({ type: "tag", value: tn, c: tc.c, tx: tc.tx });
            i = after;
            if (i < text.length && text[i] === " ") i++;
            matched = true;
            break;
          }
        }
      }
      if (!matched) { pushText("@"); i++; }
      continue;
    }
    if (text[i] === "[" && text[i + 1] === "[") {
      const close = text.indexOf("]]", i + 2);
      if (close !== -1) {
        pushText("[" + text.substring(i + 2, close) + "]");
        i = close + 2;
        continue;
      }
    }
    if (text[i] === "[") {
      const close = text.indexOf("]", i + 1);
      if (close !== -1 && close > i + 1) {
        segments.push({ type: "label", value: text.substring(i + 1, close) });
        i = close + 1;
        if (i < text.length && text[i] === " ") i++;
        continue;
      }
    }
    pushText(text[i]);
    i++;
  }
  return segments;
};

export const parseInlineMarkup = (text, tags) => {
  if (!text) return [];
  let isVis = false;
  let workText = text;
  
  if (workText.startsWith("!")) {
    isVis = true;
    workText = workText[1] === " " ? workText.substring(2) : workText.substring(1);
  }

  if (workText.startsWith("## ")) return [{ type: "heading", value: workText.substring(3), vis: isVis }];
  if (workText.startsWith("# ")) return [{ type: "header", value: workText.substring(2), vis: isVis }];

  const innerSegs = parseInlineMarkup_inner(workText, tags);
  if (isVis) innerSegs.forEach((s) => { s.vis = true; });
  return innerSegs;
};

export const getPrefixBlocks = (text, tags) => {
  if (!text) return [];
  const segs = parseInlineMarkup(text, tags).map(s => ({...s}));
  const blocks = [];
  
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];
    if (seg.type === "header" || seg.type === "heading") break;
    if (seg.type === "tag" || seg.type === "label") {
      let block = [seg];
      if (i + 1 < segs.length && segs[i+1].type === "text") {
        const spaceMatch = segs[i+1].value.match(/^([\s\u00A0]+)/);
        if (spaceMatch) {
           block.push({ type: "text", value: spaceMatch[1], vis: segs[i+1].vis });
           segs[i+1].value = segs[i+1].value.substring(spaceMatch[1].length);
           if (!segs[i+1].value) i++; // skip the empty segment next iteration
        }
      }
      blocks.push(block);
    } else if (seg.type === "text") {
      const markerMatch = seg.value.match(/^([\s\u00A0]*(?:\d+[\.\)]?|\(\d+\)|=>|-|•|※)[\s\u00A0]+)/);
      if (markerMatch && markerMatch[1]) {
         blocks.push([{ type: "text", value: markerMatch[1], vis: seg.vis }]);
         segs[i].value = segs[i].value.substring(markerMatch[1].length);
         if (segs[i].value) i--; // re-process the remaining text in the same segment
      } else {
         break;
      }
    } else {
       break;
    }
  }
  return blocks;
};

export const getGhostSegments = (rows, idx, side, tags) => {
  const currentIndent = rows[idx]?.[side]?.indent;
  if (!currentIndent) return [];

  let parentIdx = -1;
  for (let p = idx - 1; p >= 0; p--) {
    if ((rows[p]?.[side]?.indent || 0) < currentIndent) {
      parentIdx = p;
      break;
    }
  }

  if (parentIdx === -1) {
     return Array.from({ length: currentIndent }, () => ({ type: "text", value: "        " }));
  }

  const pIndent = rows[parentIdx][side].indent || 0;
  let pGhosts = [];
  if (pIndent > 0) {
     pGhosts = getGhostSegments(rows, parentIdx, side, tags);
  }
  
  const diff = currentIndent - pIndent;
  const pBlocks = getPrefixBlocks(rows[parentIdx][side].text, tags);
  
  let extraGhosts = [];
  for (let i = 0; i < diff; i++) {
     if (i < pBlocks.length) {
       extraGhosts = extraGhosts.concat(pBlocks[i]);
     } else {
       extraGhosts.push({ type: "text", value: "        " });
     }
  }
  
  return pGhosts.concat(extraGhosts);
};

export const segmentsToPreviewHTML = (segments, isBlank, darkMode) => {
  const dk = !!darkMode;
  return segments.map((seg) => {
    if (seg.type === "header") return `<span style="font-weight:800;color:${dk ? "#7ecba1" : "#00391e"};letter-spacing:2px">${esc(seg.value)}</span>`;
    if (seg.type === "tag") return `<span style="display:inline-block;padding:1px 7px;border-radius:3px;background:${seg.c};color:${seg.tx};font-size:9.5px;font-weight:700;line-height:16px;margin-right:4px">${esc(seg.value)}</span>`;
    if (seg.type === "heading") return `<span style="font-weight:800;color:${dk ? "#ffffff" : "inherit"};text-decoration:underline;text-underline-offset:3px;text-decoration-color:${dk ? "#555" : "#aaa"}">${esc(seg.value)}</span>`;
    if (seg.type === "label") return `<span style="display:inline-block;padding:1px 5px;border-radius:3px;background:${dk ? "rgba(255,255,255,0.1)" : "#f3f4f6"};color:${dk ? "#c0c0d0" : "#334155"};font-size:11px;font-weight:600;line-height:16px;margin-right:4px">${esc(seg.value)}</span>`;
    return `<span style="color:${(isBlank && !seg.vis) ? "transparent" : dk ? "#f8fafc" : "#1f2937"}">${esc(seg.value)}</span>`;
  }).join("");
};

export const textToEditHTML = (text, tags, darkMode) => {
  if (!text) return "";
  const dk = !!darkMode;
  const tagNames = (tags || DEFAULT_TAGS).map((t) => t.v).filter(Boolean);
  tagNames.sort((a, b) => b.length - a.length);
  let result = "";
  let i = 0;

  if (text.startsWith("!")) {
    const hasSpace = text[1] === " ";
    result += `<span style="color:${dk ? "#666" : "#aaa"}">!${hasSpace ? " " : ""}</span>`;
    i = hasSpace ? 2 : 1;
  }

  if (text.startsWith("## ", i)) {
    result += `<span style="color:${dk ? "#666" : "#aaa"}">## </span><span style="font-weight:800;text-decoration:underline;color:${dk ? "#ffffff" : "inherit"}">${esc(text.substring(i + 3))}</span>`;
    return result;
  }
  if (text.startsWith("# ", i)) {
    result += `<span style="color:${dk ? "#7ecba1" : "#00391e"};font-weight:800">${esc(text.substring(i))}</span>`;
    return result;
  }

  while (i < text.length) {
    if (text[i] === "@") {
      let matched = false;
      for (const tn of tagNames) {
        if (text.substring(i + 1, i + 1 + tn.length) === tn) {
          const after = i + 1 + tn.length;
          if (after >= text.length || /[\s@\[]/.test(text[after])) {
            const tc = tagColor(tn, tags);
            result += `<span style="color:${tc.c};font-weight:700">${esc("@" + tn)}</span>`;
            i = after;
            matched = true;
            break;
          }
        }
      }
      if (!matched) { result += esc("@"); i++; }
      continue;
    }
    if (text[i] === "[" && text[i + 1] !== "[") {
      const close = text.indexOf("]", i + 1);
      if (close !== -1 && close > i + 1) {
        result += `<span style="color:${dk ? "#666" : "#aaa"}">[</span><span style="color:${dk ? "#c0c0d0" : "#334155"};font-weight:600">${esc(text.substring(i + 1, close))}</span><span style="color:${dk ? "#666" : "#aaa"}">]</span>`;
        i = close + 1;
        continue;
      }
    }
    result += esc(text[i]);
    i++;
  }
  return result;
};
