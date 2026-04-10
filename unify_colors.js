const fs = require('fs');
let code = fs.readFileSync('src/blank_test_maker.jsx', 'utf8');

// Replace color hexes with better Slate tones globally
code = code.replace(/#16172a/g, '#0f172a'); // App BG dark
code = code.replace(/#f0f2f5/g, '#f8fafc'); // App BG light
code = code.replace(/#1e1f30/g, 'rgba(30,41,59,0.7)'); // Header/Sidebar dark
code = code.replace(/#2e2f42/g, 'rgba(255,255,255,0.08)'); // Dividers dark
code = code.replace(/#e5e7eb/g, '#e2e8f0'); // Dividers light
code = code.replace(/#2a2b3d/g, 'rgba(255,255,255,0.05)'); // Inputs dark
code = code.replace(/#363748/g, 'rgba(255,255,255,0.1)'); // Inputs/Active dark
code = code.replace(/#d0d0dc/g, '#f8fafc'); // Default Text Dark
code = code.replace(/#e0e0e8/g, '#ffffff'); // Strong Text Dark
code = code.replace(/#6b6b80/g, '#94a3b8'); // Muted Text Dark
code = code.replace(/#374151/g, '#334155'); // Default Text Light
code = code.replace(/#9a9a9b/g, '#94a3b8'); // Muted Text Light
code = code.replace(/#d1d5db/g, '#cbd5e1'); // Form Borders light

fs.writeFileSync('src/blank_test_maker.jsx', code);
console.log('Colors unified.');
