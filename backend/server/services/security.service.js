const dangerousPatterns = [
  { pattern: /\beval\s*\(/i, severity: 'critical', message: 'Uses eval, which can execute arbitrary code.' },
  { pattern: /\bnew\s+Function\s*\(|\bFunction\s*\(/, severity: 'critical', message: 'Uses Function constructor for dynamic code execution.' },
  { pattern: /document\.write\s*\(/i, severity: 'warning', message: 'Uses document.write, which can create injection risks.' },
  { pattern: /chrome\.tabs\.executeScript/i, severity: 'warning', message: 'Uses deprecated script execution API.' },
  { pattern: /<script[^>]+src=["']https?:\/\//i, severity: 'critical', message: 'Loads remote script code, disallowed for Chrome extensions.' },
  { pattern: /\bpassword\b|\bcredential\b|\bkeylogger\b/i, severity: 'warning', message: 'Contains sensitive credential-related terms; review carefully.' },
];

export function scanGeneratedFiles(files) {
  const findings = [];

  for (const file of files) {
    for (const rule of dangerousPatterns) {
      if (rule.pattern.test(file.content)) {
        findings.push({ severity: rule.severity, file: file.filename, message: rule.message });
      }
    }
  }

  const critical = findings.filter(item => item.severity === 'critical').length;
  const warning = findings.filter(item => item.severity === 'warning').length;
  const score = Math.max(0, 100 - critical * 35 - warning * 10);
  return { score, findings };
}
