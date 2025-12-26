export default {
  async fetch(request) {
    const url = new URL(request.url);

    // ===== PAGE WEB =====
    if (url.pathname === "/") {
      return new Response(HTML_PAGE, {
        headers: { "content-type": "text/html;charset=UTF-8" },
      });
    }

    // ===== API =====
    if (url.pathname === "/api/make") {
      const input = url.searchParams.get("url");
      if (!input) {
        return json({ error: "Missing url parameter" }, 400);
      }

      const rawUrl = toRawGithub(input);
      if (!rawUrl) {
        return json({ error: "Invalid GitHub URL" }, 400);
      }

      const shortUrl = await shorten(rawUrl);
      const qrUrl = makeQr(shortUrl);

      return json({
        original: input,
        raw: rawUrl,
        short: shortUrl,
        qr: qrUrl,
      });
    }

    return new Response("Not found", { status: 404 });
  },
};

// ======================
// HELPERS
// ======================

function toRawGithub(url) {
  // blob → raw
  if (url.includes("github.com") && url.includes("/blob/")) {
    return url
      .replace("github.com", "raw.githubusercontent.com")
      .replace("/blob/", "/");
  }

  // déjà raw
  if (url.includes("raw.githubusercontent.com")) {
    return url;
  }

  return null;
}

async function shorten(longUrl) {
  const api = `https://is.gd/create.php?format=simple&url=${encodeURIComponent(
    longUrl
  )}`;
  const r = await fetch(api);
  return (await r.text()).trim();
}

function makeQr(data) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(
    data
  )}`;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// ======================
// HTML
// ======================

const HTML_PAGE = `
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Alice – QR Audio Tool</title>
<style>
body { font-family: Arial; background:#111; color:#fff; text-align:center; }
input { width:80%; padding:10px; font-size:16px; }
button { padding:10px 20px; font-size:16px; margin-top:10px; }
img { margin-top:20px; border:4px solid #fff; }
.box { max-width:700px; margin:auto; }
small { color:#aaa; }
</style>
</head>
<body>
<div class="box">
<h1>🎧 Alice – Générateur QR Audio</h1>

<p>Colle un lien GitHub (blob ou raw)</p>

<input id="url" placeholder="https://github.com/.../blob/main/audio/son.mp3">
<br>
<button onclick="go()">Générer le QR</button>

<div id="out"></div>

<script>
async function go() {
  const u = document.getElementById("url").value;
  const out = document.getElementById("out");
  out.innerHTML = "⏳ Génération...";

  const r = await fetch("/api/make?url=" + encodeURIComponent(u));
  const j = await r.json();

  if (j.error) {
    out.innerHTML = "❌ " + j.error;
    return;
  }

  out.innerHTML = \`
    <p><b>RAW</b><br><small>\${j.raw}</small></p>
    <p><b>SHORT</b><br><a href="\${j.short}" target="_blank">\${j.short}</a></p>
    <img src="\${j.qr}">
    <p>
      <a href="\${j.qr}" download="qr_audio.png">⬇️ Télécharger le QR</a>
    </p>
  \`;
}
</script>
</div>
</body>
</html>
`;
