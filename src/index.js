export default {
  async fetch(request, env) {
    if (request.method === "GET") {
      return new Response(HTML, {
        headers: { "Content-Type": "text/html; charset=UTF-8" }
      });
    }

    if (request.method === "POST") {
      const form = await request.formData();
      const file = form.get("audio");

      if (!file) {
        return new Response("No file", { status: 400 });
      }

      const filename = file.name.replace(/\s+/g, "_");
      const buffer = await file.arrayBuffer();
      const contentBase64 = btoa(
        String.fromCharCode(...new Uint8Array(buffer))
      );

      // ======================
      // Upload GitHub
      // ======================
      const apiUrl = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${env.GITHUB_AUDIO_PATH}/${filename}`;

      const githubRes = await fetch(apiUrl, {
        method: "PUT",
        headers: {
          "Authorization": `token ${env.GITHUB_TOKEN}`,
          "Content-Type": "application/json",
          "User-Agent": "alice-qr-tool"
        },
        body: JSON.stringify({
          message: `add audio ${filename}`,
          content: contentBase64,
          branch: env.GITHUB_BRANCH
        })
      });

      if (!githubRes.ok) {
        const err = await githubRes.text();
        return new Response("GitHub error:\n" + err, { status: 500 });
      }

      // ======================
      // RAW URL
      // ======================
      const rawUrl = `https://raw.githubusercontent.com/${env.GITHUB_REPO}/${env.GITHUB_BRANCH}/${env.GITHUB_AUDIO_PATH}/${filename}`;

      // ======================
      // Shorten (is.gd)
      // ======================
      const shortRes = await fetch(
        `https://is.gd/create.php?format=simple&url=${encodeURIComponent(rawUrl)}`
      );
      const shortUrl = await shortRes.text();

      // ======================
      // QR CODE (API)
      // ======================
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(shortUrl)}`;

      return new Response(
        JSON.stringify({
          raw: rawUrl,
          short: shortUrl,
          qr: qrUrl
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response("Method not allowed", { status: 405 });
  }
};

const HTML = `
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Alice – QR Audio Tool</title>
<style>
body {
  font-family: Arial, sans-serif;
  background: #f4f4f4;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}
.card {
  background: white;
  padding: 30px;
  border-radius: 12px;
  width: 360px;
  text-align: center;
}
input[type=file] {
  margin: 20px 0;
}
button {
  padding: 12px 20px;
  font-size: 16px;
  cursor: pointer;
}
.result {
  margin-top: 20px;
  word-break: break-all;
}
img {
  margin-top: 15px;
  width: 260px;
}
</style>
</head>

<body>
<div class="card">
  <h2>🎵 Alice QR Tool</h2>
  <input type="file" id="file" accept=".mp3,.wav"><br>
  <button onclick="upload()">Générer le QR</button>

  <div class="result" id="result"></div>
</div>

<script>
async function upload() {
  const fileInput = document.getElementById("file");
  if (!fileInput.files.length) return alert("Choisis un fichier audio");

  const data = new FormData();
  data.append("audio", fileInput.files[0]);

  const res = await fetch("/", {
    method: "POST",
    body: data
  });

  const json = await res.json();

  document.getElementById("result").innerHTML = \`
    <p><b>RAW :</b><br><a href="\${json.raw}" target="_blank">\${json.raw}</a></p>
    <p><b>SHORT :</b><br><a href="\${json.short}" target="_blank">\${json.short}</a></p>
    <img src="\${json.qr}">
    <p><a href="\${json.qr}" download>📥 Télécharger le QR</a></p>
  \`;
}
</script>
</body>
</html>
`;
