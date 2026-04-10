const fs = require('fs');
let code = fs.readFileSync('src/blank_test_maker.jsx', 'utf8');

// 1. Add Supabase imports
code = code.replace(
  'import { createPortal } from "react-dom";\nimport logoImg from "./assets/logo.png";',
  `import { createPortal } from "react-dom";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey);

import logoImg from "./assets/logo.png";`
);

// 2. Add Auth state and load logic
code = code.replace(
  'const [insertPending, setInsertPending] = useState(null);',
  `const [insertPending, setInsertPending] = useState(null);
  
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);`
);

// 3. Replace electronAPI getAppSettings block with Supabase logic
const electronBlock = `  useEffect(() => {
    if (!window.electronAPI) return;
    window.electronAPI.onFolderOpened(applyFolderScan);
    window.electronAPI.onMenuNewUnit(() => addNewUnit(null));
    window.electronAPI.onMenuSave(() => saveFile());
    window.electronAPI.getAppSettings().then((s) => {
      if (s?.editorSettings) setSettingsState({ ...DEFAULT_SETTINGS, ...s.editorSettings });
      if (s?.darkMode !== undefined) setDarkMode(s.darkMode);
    });
    // 새로고침 시 현재 작업폴더 복원
    window.electronAPI.getWorkspace().then((dir) => {
      if (dir) {
        window.electronAPI.scanFolder(dir).then((scan) => {
          applyFolderScan({ dirPath: dir, ...scan });
        });
      }
    });
  }, []);`;

code = code.replace(electronBlock, `  useEffect(() => {
    if (session) {
      refreshFolder();
      supabase.from('users_settings').select('settings').eq('id', session.user.id).single()
        .then(({ data }) => {
           if (data && data.settings) {
             if (data.settings.editorSettings) setSettingsState({ ...DEFAULT_SETTINGS, ...data.settings.editorSettings });
             if (data.settings.darkMode !== undefined) setDarkMode(data.settings.darkMode);
           }
        });
    }
  }, [session]);`);

// 4. Update Save Settings
code = code.replace(
  /window\.electronAPI\?\.saveAppSettings\(\{ editorSettings: next \}\);/g,
  `supabase.from('users_settings').upsert({ id: session?.user?.id, settings: { ...settings, editorSettings: next } });`
);
code = code.replace(
  /window\.electronAPI\?\.saveAppSettings\(\{ darkMode: next \}\);/g,
  `supabase.from('users_settings').upsert({ id: session?.user?.id, settings: { ...settings, darkMode: next } });`
);


// 5. Replace the massive logic block for openFile -> executePrint -> deleteGroup
let regexCRUD = /\/\/ 파일 열기[\s\S]*?\/\/ 그룹\(폴더\) 삭제\n  const deleteGroup \= async \(groupPath\) => \{\n    if \(\!window\.electronAPI[^}]+?\}\;/m;

let newCRUD = `
  // 폴더 리프레시 (Supabase)
  const refreshFolder = async () => {
    if (!session) return;
    const { data: docs, error } = await supabase.from('documents').select('id, group_path, title').order('created_at', { ascending: false });
    if (error) return console.error(error);
    const uniqueGroups = [...new Set(docs.map(d => d.group_path || "미분류"))];
    const grps = uniqueGroups.filter(g => g !== "미분류").map(name => ({ name, path: name }));
    const flist = docs.map(d => ({ id: d.id, name: d.title + ".btm", path: d.id, group: d.group_path || "미분류" }));
    setGroups(grps);
    setFileList(flist);
    if (!currentFile && flist.length > 0) openFile(flist[0].path);
  };

  // 파일 열기
  const openFile = async (id) => {
    if (dirty && currentFile && unit) await saveFile();
    const { data, error } = await supabase.from('documents').select('content').eq('id', id).single();
    if (error) { showToast('파일 열기 실패'); return; }
    let d = data.content;
    if (d.units && !d.rows) d = { ...d.units[0], settings: d.settings || {} };
    d = migrateUnit(d);
    if (!d.rows) return;
    setUnit(d);
    setCurrentFile(id);
    setDirty(false);
    historyRef.current = [];
    redoRef.current = [];
    if (editorScrollRef.current) editorScrollRef.current.scrollTop = 0;
  };

  // 파일 저장
  const saveFile = async () => {
    if (!currentFile || !unit || !session) return;
    const { error } = await supabase.from('documents').update({ content: unit, title: unit.title }).eq('id', currentFile);
    if (error) { showToast(\`저장 실패: \${error.message}\`); return; }
    setDirty(false);
    refreshFolder();
  };

  // 출력 모달 열기
  const openPrintModal = async () => {
    if (printSelected.size === 0) return;
    if (dirty && currentFile && unit) await saveFile();
    const results = await Promise.all(
      fileList.filter((f) => printSelected.has(f.path)).map(async (f) => {
        try {
          const { data, error } = await supabase.from('documents').select('content').eq('id', f.path).single();
          if (error) return null;
          let d = data.content;
          if (d.units && !d.rows) d = { ...d.units[0], settings: d.settings || {} };
          d = migrateUnit(d);
          return d.rows ? { filePath: f.path, fileName: f.name.replace(/\\.(btm|json)$/, ""), group: f.group, unit: d } : null;
        } catch { return null; }
      })
    );
    setAllUnits(results.filter(Boolean));
    const checked = new Set();
    results.filter(Boolean).forEach((u) => {
      if (printMode === "answer" || printMode === "both") checked.add(\`\${u.filePath}::answer\`);
      if (printMode === "blank" || printMode === "both") checked.add(\`\${u.filePath}::blank\`);
    });
    setPrintChecked(checked);
    setPrintModalOpen(true);
  };

  // 인쇄 실행 (웹 출력)
  const executePrint = async () => {
    if (printChecked.size === 0) return;
    setPrinting(true);
    const htmlParts = [];
    allUnits.forEach((u) => {
      ["answer", "blank"].forEach((mode) => {
        const key = \`\${u.filePath}::\${mode}\`;
        if (!printChecked.has(key)) return;
        const el = document.getElementById(\`thumb-\${key}\`);
        if (el) htmlParts.push(el.innerHTML);
      });
    });
    if (!htmlParts.length) { setPrinting(false); return; }
    const pagesHtml = htmlParts.map((h) =>
      \`<div style="width:210mm;min-height:297mm;display:flex;justify-content:center;align-items:center;page-break-after:always">\${h}</div>\`
    ).join("");
    
    const printWindow = window.open("", "_blank");
    printWindow.document.write(\`<!DOCTYPE html><html><head><meta charset="utf-8">
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.min.css">
      <style>@page{size:A4;margin:0}body{margin:0;font-family:'Pretendard','Malgun Gothic',sans-serif}
      div:last-child{page-break-after:auto!important}
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style>
      </head><body>\${pagesHtml}</body></html>\`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      setPrinting(false);
      printWindow.close();
    }, 500);
  };

  // 새 단원 생성
  const addNewUnit = async (groupName, unitName) => {
    if (!session) return;
    if (dirty && currentFile && unit) await saveFile();
    const existing = new Set(fileList.map((f) => f.name));
    let name = unitName || "새 단원"; let n = 1;
    while (existing.has(\`\${name}.btm\`)) { name = \`\${unitName || "새 단원"} (\${n++})\`; }
    const newUnit = { title: name, rows: padRows([hdrRow("SUMMARY", "PRACTICE")]) };
    const { data, error } = await supabase.from('documents').insert([{ 
      user_id: session.user.id, 
      group_path: groupName || '미분류', 
      title: name, 
      content: newUnit 
    }]).select().single();
    if (error) { showToast("생성 실패"); return; }
    await refreshFolder();
    setUnit(newUnit);
    setCurrentFile(data.id);
    setDirty(false);
  };

  // 파일 삭제
  const deleteFile = async (id) => {
    if (!confirm("삭제할까요?")) return;
    const { error } = await supabase.from('documents').delete().eq('id', id);
    if (error) { showToast("삭제 실패"); return; }
    if (currentFile === id) { setUnit(null); setCurrentFile(null); setDirty(false); }
    await refreshFolder();
  };

  // 파일 복제
  const duplicateFile = async (id) => {
    const { data, error } = await supabase.from('documents').select('*').eq('id', id).single();
    if (error || !data) return showToast("복제 실패");
    let name = \`\${data.title} (복사)\`; let n = 1;
    const existing = new Set(fileList.map((f) => f.name));
    while (existing.has(\`\${name}.btm\`)) { name = \`\${data.title} (복사 \${n++})\`; }
    let dupData = data.content;
    if (dupData) dupData.title = name;
    
    const { data: newData, error: iErr } = await supabase.from('documents').insert([{
      user_id: session.user.id,
      group_path: data.group_path,
      title: name,
      content: dupData || {}
    }]).select().single();
    if (iErr) return showToast("복제 저장 실패");
    await refreshFolder();
    openFile(newData.id);
  };

  // 그룹 이동
  const moveFileToGroup = async (id, groupName) => {
    const { error } = await supabase.from('documents').update({ group_path: groupName || '미분류' }).eq('id', id);
    if (error) return showToast("이동 실패");
    await refreshFolder();
  };

  // 파일명 연동 변경
  const renameActiveFile = async (newTitle) => {
    if (!currentFile || !newTitle.trim()) return;
    const { error } = await supabase.from('documents').update({ title: newTitle.trim() }).eq('id', currentFile);
    if (error) return showToast("변경 실패");
    await refreshFolder();
  };

  // 그룹 추가 (빈 폴더 개념이 없으므로 가짜 그룹은 불가능, 새 문서 추가 모달에서 지정)
  const addGroup = async () => {
    // Web 환경에서는 '폴더생성' 자체가 불가능 (그룹명은 문서를 만들때 지정)
    setNewGrp(""); setAddGroupOpen(false);
    showToast("새 문서를 만들 때 그룹을 지정해 주세요", "info", 2000);
  };

  // 그룹 삭제 (안에 든 파일들의 그룹명을 '미분류'로)
  const deleteGroup = async (groupPath) => {
    if (!confirm("그룹을 삭제할까요? (파일은 미분류로 이동됩니다)")) return;
    const { error } = await supabase.from('documents').update({ group_path: '미분류' }).eq('group_path', groupPath).eq('user_id', session.user.id);
    if (error) { showToast("그룹 삭제 실패"); return; }
    await refreshFolder();
  };`;

if (!regexCRUD.test(code)) {
  console.log("Failed to match CRUD blocks");
}
code = code.replace(regexCRUD, newCRUD);


// 6. Fix App Return statement: Auth Guard + Header modifications
let appRenderStart = 'return (\n    <div className={`app-container ${dk ? "dark" : ""}`}\n';
code = code.replace(appRenderStart, `const handleSignup = async (e, email, pass) => { e.preventDefault(); const { error } = await supabase.auth.signUp({email, password: pass}); if (error) alert(error.message); else alert("가입 승인 메일을 확인해주세요 (설정에 따라 즉시 로그인될 수 있습니다)"); };
  const handleLogin = async (e, email, pass) => { e.preventDefault(); const { error } = await supabase.auth.signInWithPassword({email, password: pass}); if (error) alert(error.message); };
  
  if (!session) {
    let _email="", _pass="";
    return (
      <div style={{ padding: 40, textAlign: "center", background: "#f5f6f7", height: "100vh", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <h2 style={{ color:"#ec6619", fontWeight:800}}>백지테스트 클라우드 (SaaS)</h2>
        <p style={{marginBottom: 20}}>선생님만의 시험지 데이터를 안전하게 관리하세요.</p>
        <div style={{ background: "#fff", padding: "30px 20px", borderRadius: 8, display: "inline-block", margin: "0 auto", width: 320, boxShadow:"0 4px 14px rgba(0,0,0,0.1)" }}>
          <form>
            <input type="email" placeholder="이메일 (admin@academy.com)" onChange={e=>_email=e.target.value} style={{ width: "100%", marginBottom: 10, padding: 10, border:"1px solid #ccc", borderRadius:4 }} />
            <input type="password" placeholder="비밀번호" onChange={e=>_pass=e.target.value} style={{ width: "100%", marginBottom: 15, padding: 10, border:"1px solid #ccc", borderRadius:4 }} />
            <div style={{display:"flex", gap: 10}}>
               <button onClick={e => handleLogin(e, _email, _pass)} style={{ flex: 1, padding: 10, background: "#ec6619", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontWeight:600 }}>로그인</button>
               <button onClick={e => handleSignup(e, _email, _pass)} style={{ flex: 1, padding: 10, background: "#fff", color: "#ec6619", border: "1px solid #ec6619", borderRadius: 4, cursor: "pointer", fontWeight:600 }}>회원가입</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={\`app-container \${dk ? "dark" : ""}\`}\n`);

// 7. Remove window.electronAPI specific buttons
code = code.replace(
  /<button onClick=\{\(\) => window\.electronAPI\?\.selectFolder\(\)\}.*?<\/button>/m,
  ''
);

code = code.replace(
  /<button onClick=\{\(\) => window\.electronAPI\?\.selectFolder\(\)\}.*?📁 폴더 변경<\/button>/m,
  `<button onClick={() => supabase.auth.signOut()} style={{ padding: "4px 10px", borderRadius: 4, border: "none", background: "#ef4444", color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>로그아웃</button>`
);

// 8. Fix inlineImages replace missing definition if outside. wait, inlineImages is above CRUD replacement!
// Wait, I overwrote applyFolderScan and inlineImages.
// Ah, did my replacement miss inlineImages?
// Let's check regex: `\/\/ 파일 열기[\s\S]*?\/\/ 그룹\(폴더\) 삭제\n  const deleteGroup \= async \(groupPath\) => \{\n    if \(\!window\.electronAPI[^}]+?\}\;`
// That block is extremely large and contains `inlineImages` and `applyFolderScan`?
// I need `inlineImages` for `executePrint`. Let me restore it by just prepending it to `newCRUD`.

// To be safe, I'll redefine inlineImages in case it was replaced.
newCRUD = `
  const inlineImages = async (html) => {
    const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/g;
    const promises = []; let match;
    while ((match = imgRegex.exec(html)) !== null) {
      const src = match[1];
      if (src.startsWith("data:")) continue;
      promises.push(
        fetch(src).then((r) => r.blob()).then((blob) => new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve({ src, dataUrl: reader.result });
          reader.readAsDataURL(blob);
        })).catch(() => null)
      );
    }
    const results = (await Promise.all(promises)).filter(Boolean);
    let out = html;
    results.forEach(({ src, dataUrl }) => { out = out.split(src).join(dataUrl); });
    return out;
  };
` + newCRUD;

// Run the replacement again properly on a fresh copy read to avoid errors
code = fs.readFileSync('src/blank_test_maker.jsx', 'utf8');

// REDO 1
code = code.replace(
  'import { createPortal } from "react-dom";\nimport logoImg from "./assets/logo.png";',
  `import { createPortal } from "react-dom";\nimport { createClient } from "@supabase/supabase-js";\n\nconst supabaseUrl = import.meta.env.VITE_SUPABASE_URL;\nconst supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;\nexport const supabase = createClient(supabaseUrl, supabaseKey);\n\nimport logoImg from "./assets/logo.png";`
);

// REDO 2
code = code.replace(
  'const [insertPending, setInsertPending] = useState(null);',
  `const [insertPending, setInsertPending] = useState(null);\n  const [session, setSession] = useState(null);\n\n  useEffect(() => {\n    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));\n    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));\n    return () => subscription.unsubscribe();\n  }, []);`
);

// REDO 3
code = code.replace(electronBlock, `  useEffect(() => {
    if (session) {
      refreshFolder();
      supabase.from('users_settings').select('settings').eq('id', session.user.id).single()
        .then(({ data }) => {
           if (data && data.settings) {
             if (data.settings.editorSettings) setSettingsState({ ...DEFAULT_SETTINGS, ...data.settings.editorSettings });
             if (data.settings.darkMode !== undefined) setDarkMode(data.settings.darkMode);
           }
        });
    }
  }, [session]);`);

// REDO 4
code = code.replace(/window\.electronAPI\?\.saveAppSettings\(\{ editorSettings: next \}\);/g, `supabase.from('users_settings').upsert({ id: session?.user?.id, settings: { ...settings, editorSettings: next } });`);
code = code.replace(/window\.electronAPI\?\.saveAppSettings\(\{ darkMode: next \}\);/g, `supabase.from('users_settings').upsert({ id: session?.user?.id, settings: { ...settings, darkMode: next } });`);

// REDO 5
code = code.replace(regexCRUD, newCRUD);

// REDO 6
code = code.replace(appRenderStart, `const handleSignup = async (e, email, pass) => { e.preventDefault(); const { error } = await supabase.auth.signUp({email, password: pass}); if (error) alert(error.message); else alert("가입 승인 메일을 확인해주세요 (설정에 따라 즉시 로그인될 수 있습니다)"); };
  const handleLogin = async (e, email, pass) => { e.preventDefault(); const { error } = await supabase.auth.signInWithPassword({email, password: pass}); if (error) alert(error.message); };
  
  if (!session) {
    let _email="", _pass="";
    return (
      <div style={{ padding: 40, textAlign: "center", background: "#f5f6f7", height: "100vh", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <h2 style={{ color:"#ec6619", fontWeight:800}}>백지테스트 클라우드 (SaaS)</h2>
        <p style={{marginBottom: 20}}>선생님만의 시험지 데이터를 안전하게 관리하세요.</p>
        <div style={{ background: "#fff", padding: "30px 20px", borderRadius: 8, display: "inline-block", margin: "0 auto", width: 320, boxShadow:"0 4px 14px rgba(0,0,0,0.1)" }}>
          <form onSubmit={e=>e.preventDefault()}>
            <input type="email" placeholder="이메일 (admin@academy.com)" onChange={e=>_email=e.target.value} style={{ width: "100%", marginBottom: 10, padding: 10, border:"1px solid #ccc", borderRadius:4 }} />
            <input type="password" placeholder="비밀번호" onChange={e=>_pass=e.target.value} style={{ width: "100%", marginBottom: 15, padding: 10, border:"1px solid #ccc", borderRadius:4 }} />
            <div style={{display:"flex", gap: 10}}>
               <button onClick={e => handleLogin(e, _email, _pass)} style={{ flex: 1, padding: 10, background: "#ec6619", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontWeight:600 }}>로그인</button>
               <button onClick={e => handleSignup(e, _email, _pass)} style={{ flex: 1, padding: 10, background: "#fff", color: "#ec6619", border: "1px solid #ec6619", borderRadius: 4, cursor: "pointer", fontWeight:600 }}>회원가입</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={\`app-container \${dk ? "dark" : ""}\`}\n`);

// REDO 7
code = code.replace(/<button onClick=\{\(\) => window\.electronAPI\?\.selectFolder\(\)\}.*?<\/button>/g, '');
code = code.replace(/📁 폴더 변경/g, '로그아웃');

// Full Print electron API removal
code = code.replace(/await window\.electronAPI\.printPreview\(html\)\;/g, `
                  const printWindow = window.open("", "_blank");
                  printWindow.document.write(html);
                  printWindow.document.close();
                  printWindow.focus();
                  setTimeout(() => { printWindow.print(); setPrinting(false); printWindow.close(); }, 500);
`);


fs.writeFileSync('src/blank_test_maker.jsx', code);
console.log("Migration script complete, wrote to src/blank_test_maker.jsx");

