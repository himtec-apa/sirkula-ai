const fs = require('fs');
const readline = require('readline');

async function main() {
  const fileStream = fs.createReadStream('C:/Users/Ugi/.codex/sessions/2026/11/07/rollout-2026-11-07T17-50-33-01a1b5a1-a6d4-75d1-8b80-4afffaacf3c2.jsonl');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
  for await (const line of rl) {
    if (line.includes('masukkan logo aplikasi ini') && line.includes('"role":"user"')) {
      const obj = JSON.parse(line);
      const content = obj.payload?.content;
      if (Array.isArray(content)) {
        for (const item of content) {
          if (item.type === 'input_image') {
            console.log('Keys of input_image:', Object.keys(item));
            console.log('Sample of input_image:', JSON.stringify(item).slice(0, 300));
            // Check for image_url or data or file
            const url = item.image_url || item.url || item.image || item.source;
            if (item.image_url && typeof item.image_url === 'string' && item.image_url.startsWith('data:image')) {
              const base64Data = item.image_url.split(',')[1];
              fs.writeFileSync('C:/CODING/LOMBA/HIMTEC/extracted_logo.png', Buffer.from(base64Data, 'base64'));
              console.log('SUCCESS: saved extracted_logo.png');
            }
          }
        }
      }
      break;
    }
  }
}
main().catch(console.error);
