export const uid = () => Math.random().toString(36).slice(2, 10);

export const emptyRow = () => ({
  id: uid(),
  l: { text: "", indent: 0 },
  r: { text: "", indent: 0 },
});

export const hdrRow = (lText, rText) => ({
  id: uid(),
  l: { text: `# ${lText}`, indent: 0 },
  r: { text: `# ${rText}`, indent: 0 },
});

export const padRows = (rows, totalRows = 30) => {
  if (rows.length >= totalRows) return rows.slice(0, totalRows);
  return [...rows, ...Array.from({ length: totalRows - rows.length }, emptyRow)];
};

export const mk = (ld, rd) => ({
  id: uid(),
  l: { text: ld.x ? (ld.a ? ld.x : `*${ld.x}*`) : "", indent: ld.i || 0 },
  r: { text: rd.x ? (rd.a ? rd.x : `*${rd.x}*`) : "", indent: rd.i || 0 },
});

export const getCaretOffset = (el) => {
  let caretOffset = 0;
  const sel = window.getSelection();
  if (sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(el);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    caretOffset = preCaretRange.toString().length;
  }
  return caretOffset;
};

export const setCaretOffset = (el, offset) => {
  const charIndex = { count: 0 };
  const sel = window.getSelection();
  const range = document.createRange();
  range.setStart(el, 0);
  range.collapse(true);
  
  const nodeStack = [el];
  let node, foundStart = false;
  
  while (!foundStart && (node = nodeStack.pop())) {
    if (node.nodeType === 3) {
      const nextCharIndex = charIndex.count + node.length;
      if (!foundStart && offset >= charIndex.count && offset <= nextCharIndex) {
        range.setStart(node, offset - charIndex.count);
        foundStart = true;
      }
      charIndex.count = nextCharIndex;
    } else {
      let i = node.childNodes.length;
      while (i--) nodeStack.push(node.childNodes[i]);
    }
  }
  
  sel.removeAllRanges();
  sel.addRange(range);
};
