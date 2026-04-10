const fs = require('fs');
let code = fs.readFileSync('src/blank_test_maker.jsx', 'utf8');

const loadSettingsCode = `
  const loadSettings = async () => {
    if (!session) return;
    const { data } = await supabase.from('users_settings').select('settings').eq('id', session.user.id).single();
    if (data?.settings) {
      if (data.settings.editorSettings) {
        setSettingsState(prev => ({ ...prev, ...data.settings.editorSettings }));
      } else if (data.settings.tags) {
        setSettingsState(prev => ({ ...prev, tags: data.settings.tags }));
      }
      if (typeof data.settings.darkMode === "boolean") {
        setDarkMode(data.settings.darkMode);
      }
    }
  };
`;

code = code.replace(
  "  useEffect(() => {\n    if (session) {\n      loadWorkspaces();\n      refreshFolder(); // Workspace changed or session initialized\n    }",
  loadSettingsCode + "\n  useEffect(() => {\n    if (session) {\n      loadWorkspaces();\n      refreshFolder();\n      loadSettings();"
);

fs.writeFileSync('src/blank_test_maker.jsx', code);
