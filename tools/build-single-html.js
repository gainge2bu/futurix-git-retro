/*
  웹사이트(index.html + styles.css + firebase-config.js + app.js)를
  파일 하나짜리 HTML로 합칩니다.

  사용법 (futurix-git-retro 폴더에서):
    node tools/build-single-html.js
  결과: ../kpt-retro/index.html
*/
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const out = path.join(root, "..", "kpt-retro", "index.html");
const read = f => fs.readFileSync(path.join(root, f), "utf8");

const css = read("styles.css");
const config = read("firebase-config.js");
const app = read("app.js");
const noScriptEnd = s => s.replace(/<\/script/gi, "<\\/script");

// claude.ai 아티팩트 형식(doctype/html/head/body 없이)으로 만들어 두면
// 아티팩트로도 올릴 수 있고, 더블클릭으로 열어도 동작합니다.
const html = `<title>퓨처릭스 일잘법 회고</title>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="퓨처릭스 ‘일하는 9가지 방법’을 Good · Improvement · Try로 함께 돌아보는 회고 보드">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700&family=Noto+Sans+KR:wght@300;400;500;700;900&display=swap">
<style>
${css}
</style>

<div class="wrap" id="app"><p class="muted" style="padding:40px 0">불러오는 중…</p></div>
<div class="toast" id="toast" role="status" aria-live="polite" hidden></div>

<script>
${noScriptEnd(config)}
</script>
<script>
${noScriptEnd(app)}
</script>
`;

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log(`만들었어요: ${out} (${(Buffer.byteLength(html) / 1024).toFixed(1)}KB)`);
