const fs = require('fs');
let code = fs.readFileSync('src/blank_test_maker.jsx', 'utf8');

// 1. replace loadWorkspaceData and refreshFolder
// We want docs to hold all data.
let newDocsFetcher = `
  const refreshFolder = async () => {
    if (!session) return;
    const { data: myDocs, error: myErr } = await supabase.from('documents')
      .select('id, group_path, title, workspace_id, user_id, updated_at')
      .eq('user_id', session.user.id);
      
    // Fetch docs for all workspaces I belong to, except ones I already fetched
    let teamDocs = [];
    if (myWorkspaces.length > 0) {
      const wIds = myWorkspaces.map(w => w.id);
      const { data: tDocs } = await supabase.from('documents')
        .select('id, group_path, title, workspace_id, user_id, updated_at')
        .in('workspace_id', wIds)
        .neq('user_id', session.user.id); // exclude mine to prevent duplicates
      if (tDocs) teamDocs = tDocs;
    }
    
    let allF = [...(myDocs || []), ...(teamDocs || [])].sort((a,b) => new Date(b.updated_at) - new Date(a.updated_at));
    setFileList(allF); // Just store raw docs in fileList
  };
`;

code = code.replace(
  /const refreshFolder = async \(\) => \{[\s\S]*?setFileList\(flist\);\n  \};/g,
  newDocsFetcher
);

// Remove loadWorkspaceData entirely since refreshFolder fetches all
code = code.replace(/const loadWorkspaceData = async \(\) => \{[\s\S]*?setFileList\(flist\);\n    \}\n  \};/g, "");
code = code.replace(/loadWorkspaceData\(\);/g, "/* loadWorkspaceData disabled */");
code = code.replace(/useEffect\(\(\) => \{\n    if \(currentWorkspace !== undefined\) loadWorkspaceData\(\);\n  \}, \[currentWorkspace, session\]\);/g, "/* Effect disabled */");

// In useEffect for session, call refreshFolder directly
code = code.replace(/if \(session\) loadWorkspaceData\(\);/g, "if (session) refreshFolder();");

fs.writeFileSync('src/blank_test_maker.jsx', code);
