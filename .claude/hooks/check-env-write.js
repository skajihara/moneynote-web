const chunks = [];
process.stdin.on('data', (chunk) => chunks.push(chunk));
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(Buffer.concat(chunks).toString());
    const fp = (data.tool_input || {}).file_path || '';
    const basename = fp.replace(/\\/g, '/').split('/').pop();
    if (basename === '.env') {
      process.stderr.write('.env への直接書き込みは禁止されています。.env.example を更新してください。\n');
      process.exit(2);
    }
  } catch (_) {}
});
