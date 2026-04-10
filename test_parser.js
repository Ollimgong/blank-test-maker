const dk = false;
const esc = (v) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const tagNames = ["개념"];
const tagColor = () => ({c: "red", tx:"white"});

const textToEditHTML = (text) => {
  let result = "";
  let i = 0;
  while (i < text.length) {
    if (i === 0 && text.startsWith("## ")) {
      result += `<span style="color:${dk ? "#666" : "#aaa"}">## </span><span style="font-weight:800;text-decoration:underline">${esc(text.substring(3))}</span>`;
      i = text.length; continue;
    }
    if (i === 0 && text.startsWith("# ")) {
      result += `<span style="color:green;font-weight:800">${esc(text)}</span>`;
      i = text.length; continue;
    }
    if (i === 0 && text.startsWith("! ")) {
      result += `<span style="color:grey">! </span>`;
      i = 2; continue;
    }
    if (text[i] === "@") {
      let matched = false;
      for (const tn of tagNames) {
        if (text.substring(i + 1, i + 1 + tn.length) === tn) {
          result += `<span style="color:red;font-weight:700">${esc("@" + tn)}</span>`;
          i += 1 + tn.length;
          matched = true; break;
        }
      }
      if (!matched) { result += esc("@"); i++; }
      continue;
    }
    result += esc(text[i]);
    i++;
  }
  return result;
};

console.log("! @개념 :", textToEditHTML("! @개념"));
console.log("!# 헤더 :", textToEditHTML("!# 헤더"));
console.log("! # 헤더 :", textToEditHTML("! # 헤더"));
console.log("!@개념 :", textToEditHTML("!@개념"));
