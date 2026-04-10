import re
import sys

with open('src/blank_test_maker.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update refreshFolder
refresh_folder = """  // 폴더 리프레시 (Supabase)
  const refreshFolder = async () => {
    if (!session) return;
    const { data: myDocs, error: myErr } = await supabase.from('documents')
      .select('id, group_path, title, workspace_id, user_id, updated_at')
      .eq('user_id', session.user.id);
      
    let teamDocs = [];
    if (myWorkspaces.length > 0) {
      const wIds = myWorkspaces.map(w => w.id);
      const { data: tDocs } = await supabase.from('documents')
        .select('id, group_path, title, workspace_id, user_id, updated_at')
        .in('workspace_id', wIds)
        .neq('user_id', session.user.id);
      if (tDocs) teamDocs = tDocs;
    }
    
    const allDocsRaw = [...(myDocs || []), ...(teamDocs || [])].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    
    const uniqueGroups = [];
    const grKeys = new Set();
    allDocsRaw.forEach(d => {
       const g = d.group_path || "미분류";
       const w = d.workspace_id;
       const key = `${w || 'private'}_${g}`;
       if (g !== "미분류" && !grKeys.has(key)) {
         grKeys.add(key);
         uniqueGroups.push({ name: g, workspace_id: w, path: g });
       }
    });
    setGroups(uniqueGroups);
    
    const flist = allDocsRaw.map(d => ({ 
      id: d.id, name: d.title + ".btm", path: d.id, group: d.group_path || "미분류",
      workspace_id: d.workspace_id, user_id: d.user_id, updated_at: d.updated_at,
      isShared: d.user_id === session.user.id && d.workspace_id !== null,
      sharedTo: d.workspace_id ? myWorkspaces.find(w => w.id === d.workspace_id)?.name : null
    }));
    setFileList(flist);
    
    if (!currentFile && flist.length > 0) openFile(flist[0].path);
  };"""

code = re.sub(r'  // 폴더 리프레시 \(Supabase\)\n  const refreshFolder = async \(\) => \{[\s\S]*?\n  \};', refresh_folder, code)

# 2. Update openFile to fetch user_id and updated_at
code = code.replace(
    "const { data, error } = await supabase.from('documents').select('content').eq('id', id).single();",
    "const { data, error } = await supabase.from('documents').select('content, user_id, updated_at').eq('id', id).single();"
)
code = code.replace(
    "if (!d.rows) return;\n    setUnit(d);",
    "if (!d.rows) return;\n    d.user_id = data.user_id;\n    d.updated_at = data.updated_at;\n    setUnit(d);"
)

# 3. Update loadWorkspaceData and useEffect
code = re.sub(r'  const loadWorkspaceData = async \(\) => \{[\s\S]*?\n  \};', '', code)
code = code.replace("if (session) { loadSettings(); fetchWorkspaces(); loadWorkspaceData(); }", "if (session) { loadSettings(); fetchWorkspaces(); refreshFolder(); }")
code = re.sub(r'  useEffect\(\(\) => \{\n    if \(currentWorkspace !== undefined\) loadWorkspaceData\(\);\n  \}, \[currentWorkspace, session\]\);', '', code)

# 4. Update Header inside Editor to show Creator / Updated info
header_replacement = """                    <input value={unit.title} onChange={(e) => updateUnit({ title: e.target.value })} placeholder="문서 제목(단원명)을 입력하세요"
                      style={{ flex: 1, fontSize: 24, fontWeight: 800, border: "none", outline: "none", background: "transparent", color: dk ? "#ffffff" : "#111" }}
                    />
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      <span style={{ fontSize: 11, color: dk ? "#64748b" : "#94a3b8" }}>
                        👤 작성: {unit.user_id && session ? (unit.user_id === session.user.id ? "본인" : "팀원") : "알 수 없음"} | 🕒 수정: {unit.updated_at ? new Date(unit.updated_at).toLocaleString('ko-KR') : ""}
                      </span>
                      <div style={{ display: "flex", gap: 1, background: dk ? "rgba(255,255,255,0.05)" : "#f1f5f9", borderRadius: 6, padding: 2 }}>
                        <button onClick={() => setPreviewMode("answer")} style={{ padding: "4px 12px", borderRadius: 4, border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer", background: previewMode === "answer" ? (dk ? "#334155" : "#fff") : "transparent", color: previewMode === "answer" ? (dk ? "#7ecba1" : "#16a34a") : (dk ? "#94a3b8" : "#94a3b8") }}>A (해설지)</button>
                        <button onClick={() => setPreviewMode("worksheet")} style={{ padding: "4px 12px", borderRadius: 4, border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer", background: previewMode === "worksheet" ? (dk ? "#334155" : "#fff") : "transparent", color: previewMode === "worksheet" ? "#ec6619" : (dk ? "#94a3b8" : "#94a3b8") }}>W (문제지)</button>
                      </div>
                    </div>"""

code = re.sub(r'<input value=\{unit\.title\}[\s\S]*?<div style=\{\{ display: "flex", gap: 1, background: dk \? "rgba\(255,255,255,0\.05\)" : "#f1f5f9"[\s\S]*?</button>\n                    </div>', header_replacement, code)

# 5. Fix WorkspaceSwitcher and Sidebar
sidebar_replacement = """        <div className="no-print" style={{ width: sidebarOpen ? 280 : 0, minWidth: 0, background: dk ? "rgba(30,41,59,0.6)" : "#fff", backdropFilter: dk ? "blur(12px)" : "none", WebkitBackdropFilter: dk ? "blur(12px)" : "none", borderRight: sidebarOpen ? `1px solid ${dk ? "rgba(255,255,255,0.08)" : "#e2e8f0"}` : "none", display: "flex", flexDirection: "column", overflow: "hidden", transition: "width .2s ease", flexShrink: 0, zIndex: 5 }}>
         <div style={{ minWidth: 280, display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
          <div style={{ padding: "0 12px", height: 42, display: "flex", alignItems: "center", borderBottom: `1px solid ${dk ? "rgba(255,255,255,0.08)" : "#e2e8f0"}`, flexShrink: 0 }}>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 800, color: dk ? "#f8fafc" : "#334155" }}>파일 보관함</span>
            <button onClick={toggleAllPrintSelected} style={{ border: "none", background: "none", fontSize: 10, color: "#888", cursor: "pointer", fontWeight: 600, padding: "2px 6px" }}>{printSelected.size === fileList.length && fileList.length > 0 ? "전체 해제" : "전체 선택"}</button>
          </div>
          {addUnitOpen && (
            <div style={{ padding: "10px 12px", borderBottom: `1px solid ${dk ? "rgba(255,255,255,0.08)" : "#f0f0f0"}`, background: dk ? "rgba(15,23,42,0.6)" : "#fafafa" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#ec6619", marginBottom: 4 }}>새 문서 추가 ({currentWorkspace ? currentWorkspace.name : "내 전용 공간"})</div>
              <input value={newUnitName} onChange={(e) => setNewUnitName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && newUnitName.trim()) { addNewUnit(newUnitGroup || null, newUnitName.trim()); setAddUnitOpen(false); } if (e.key === "Escape") setAddUnitOpen(false); }}
                placeholder="단원 이름" autoFocus
                style={{ width: "100%", padding: "5px 8px", border: `1px solid ${dk ? "#404155" : "#cbd5e1"}`, borderRadius: 4, fontSize: 13, outline: "none", marginBottom: 6, boxSizing: "border-box", background: dk ? "rgba(255,255,255,0.05)" : "#fff", color: dk ? "#ffffff" : "inherit" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <select value={newUnitGroup} onChange={(e) => setNewUnitGroup(e.target.value)}
                  style={{ flex: 1, padding: "4px 6px", border: `1px solid ${dk ? "#404155" : "#cbd5e1"}`, borderRadius: 4, fontSize: 12, outline: "none", color: newUnitGroup ? (dk ? "#f8fafc" : "#334155") : "#aaa", background: dk ? "rgba(255,255,255,0.05)" : "#fff" }}>
                  <option value="">미분류</option>
                  {groups.filter(g => currentWorkspace ? g.workspace_id === currentWorkspace.id : g.workspace_id === null).map((g) => <option key={g.name} value={g.name}>{g.name}</option>)}
                </select>
                <button onClick={() => { if (newUnitName.trim()) { addNewUnit(newUnitGroup || null, newUnitName.trim()); setAddUnitOpen(false); } }}
                  style={{ padding: "4px 12px", border: "none", borderRadius: 4, background: newUnitName.trim() ? "#ec6619" : "#ccc", color: "#fff", fontSize: 12, cursor: newUnitName.trim() ? "pointer" : "default", fontWeight: 600, flexShrink: 0 }}>확인</button>
                <button onClick={() => setAddUnitOpen(false)} style={{ border: "none", background: "none", cursor: "pointer", color: "#aaa", fontSize: 13 }}>✕</button>
              </div>
            </div>
          )}
          {addGroupOpen && (
            <div style={{ display: "flex", gap: 3, padding: "8px 12px", borderBottom: `1px solid ${dk ? "rgba(255,255,255,0.08)" : "#f0f0f0"}` }}>
              <input value={newGrp} onChange={(e) => setNewGrp(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addGroup()} placeholder="그룹 이름" autoFocus style={{ flex: 1, padding: "4px 8px", border: `1px solid ${dk ? "#404155" : "#cbd5e1"}`, borderRadius: 4, fontSize: 13, outline: "none", background: dk ? "rgba(255,255,255,0.05)" : "#fff", color: dk ? "#ffffff" : "inherit" }} />
              <button onClick={addGroup} style={{ padding: "4px 10px", border: "none", borderRadius: 4, background: "#ec6619", color: "#fff", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>확인</button>
              <button onClick={() => { setAddGroupOpen(false); setNewGrp(""); }} style={{ border: "none", background: "none", cursor: "pointer", color: "#aaa", fontSize: 13 }}>✕</button>
            </div>
          )}
          <div style={{ flex: 1, overflowY: "auto", padding: "10px 8px", display: "flex", flexDirection: "column", gap: 20 }}>
            {[null, ...myWorkspaces].map((ws, wsIdx) => {
               const wId = ws ? ws.id : null;
               const wName = ws ? `🏢 ${ws.name}` : `🏠 내 전용 공간`;
               
               const wGroups = groups.filter(g => g.workspace_id === wId);
               
               // Filter files
               let wFilesUnclassified = fileList.filter(f => f.group === "미분류" && f.workspace_id === wId);
               let wSharedFiles = wId === null ? fileList.filter(f => f.isShared) : [];
               
               return (
                 <div key={wId || 'private'}>
                   <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "2px 8px 6px", borderBottom: `1px solid ${dk ? "rgba(255,255,255,0.05)" : "#f1f5f9"}`, marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: dk ? "#94a3b8" : "#64748b" }}>{wName}</span>
                      <div style={{ display: "flex", gap: 4 }}>
                         <button onClick={() => { setCurrentWorkspace(ws || null); setAddGroupOpen(true); }} style={{ border: "none", background: "none", cursor: "pointer", color: dk ? "#64748b" : "#94a3b8", fontSize: 16, lineHeight: 1 }} title="새 그룹">+</button>
                         <button onClick={() => { setCurrentWorkspace(ws || null); setAddUnitOpen(true); setNewUnitName(""); setNewUnitGroup(""); }} style={{ border: "none", background: "none", cursor: "pointer", color: "#ec6619", fontSize: 18, lineHeight: 1, fontWeight: 800 }} title="새 문서">+</button>
                      </div>
                   </div>
                   
                   {wGroups.map((g) => {
                     const gFiles = fileList.filter((f) => f.group === g.name && f.workspace_id === wId);
                     const collapsed = collapsedGroups.has(`${wId || 'private'}_${g.name}`);
                     return (
                        <div key={g.name} style={{ marginBottom: 4 }}>
                          <GroupHeader g={g} count={gFiles.length} collapsed={collapsed} onToggle={() => toggleGroup(`${wId || 'private'}_${g.name}`)} onDelete={() => deleteGroup(g.path)} />
                          {!collapsed && <div style={{ paddingLeft: 10 }}>
                            {gFiles.map((f) => (
                              <div key={f.path} style={{ display: "flex", alignItems: "center" }}>
                                <input type="checkbox" checked={printSelected.has(f.path)} onChange={() => togglePrintSelected(f.path)} style={{ accentColor: "#ec6619", width: 14, height: 14, flexShrink: 0, margin: "0 4px 0 0", cursor:"pointer" }} />
                                <div style={{ flex: 1, minWidth: 0 }}><FileItem f={f} /></div>
                              </div>
                            ))}
                            {inlineAddGroup === g.name ? (
                              <div style={{ display: "flex", gap: 3, marginTop: 2, marginBottom: 4 }}>
                                <input value={inlineAddName} onChange={(e) => setInlineAddName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && inlineAddName.trim()) { setCurrentWorkspace(ws || null); addNewUnit(g.name, inlineAddName.trim()); setInlineAddGroup(null); setInlineAddName(""); } if (e.key === "Escape") { setInlineAddGroup(null); setInlineAddName(""); } }} placeholder="단원 이름" autoFocus style={{ flex: 1, padding: "3px 6px", border: "1px solid #cbd5e1", borderRadius: 3, fontSize: 12, outline: "none", minWidth: 0 }} />
                                <button onClick={() => { if (inlineAddName.trim()) { setCurrentWorkspace(ws || null); addNewUnit(g.name, inlineAddName.trim()); setInlineAddGroup(null); setInlineAddName(""); } }} style={{ padding: "3px 8px", border: "none", borderRadius: 3, background: inlineAddName.trim() ? "#ec6619" : "#ccc", color: "#fff", fontSize: 11, cursor: inlineAddName.trim() ? "pointer" : "default" }}>확인</button>
                                <button onClick={() => { setInlineAddGroup(null); setInlineAddName(""); }} style={{ border: "none", background: "none", cursor: "pointer", color: "#aaa", fontSize: 12 }}>✕</button>
                              </div>
                            ) : null}
                          </div>}
                        </div>
                     )
                   })}
                   
                   {/* Unclassified */}
                   <div style={{ paddingLeft: 10 }}>
                     {wFilesUnclassified.map(f => (
                       <div key={f.path} style={{ display: "flex", alignItems: "center" }}>
                         <input type="checkbox" checked={printSelected.has(f.path)} onChange={() => togglePrintSelected(f.path)} style={{ accentColor: "#ec6619", width: 14, height: 14, flexShrink: 0, margin: "0 4px 0 0", cursor:"pointer" }} />
                         <div style={{ flex: 1, minWidth: 0 }}><FileItem f={f} /></div>
                       </div>
                     ))}
                   </div>
                   
                   {/* Shared Virtual Files */}
                   {wSharedFiles.length > 0 && <div style={{ paddingLeft: 10, marginTop: 4 }}>
                     {wSharedFiles.map(f => (
                       <div key={`shared_${f.path}`} style={{ display: "flex", alignItems: "center" }}>
                         <input type="checkbox" checked={printSelected.has(f.path)} onChange={() => togglePrintSelected(f.path)} style={{ accentColor: "#ec6619", width: 14, height: 14, flexShrink: 0, margin: "0 4px 0 0", cursor:"pointer" }} />
                         <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems:"center" }}>
                           <FileItem f={f} />
                           <span style={{ fontSize: 10, color: dk ? "#cbd5e1" : "#64748b", marginLeft: 4, background: dk ? "rgba(255,255,255,0.1)" : "#f1f5f9", padding: "1px 4px", borderRadius: 4, fontWeight: 700, flexShrink: 0, pointerEvents: "none" }}>[🏢{f.sharedTo}]</span>
                         </div>
                       </div>
                     ))}
                   </div>}
                 </div>
               )
            })}
          </div>"""

code = re.sub(r'<div className="no-print" style=\{\{ width: sidebarOpen \? 280 : 0[\s\S]*?(?=      </div>\n\n      \{\/\* ═══ 화면 메인)      </div>\n', sidebar_replacement, code)

with open('src/blank_test_maker.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("success")
