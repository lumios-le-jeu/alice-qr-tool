export default {
  async fetch(request, env) {
    if (request.method === "GET") {
      return new Response(getHTML(), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    if (request.method === "POST") {
      try {
        const form = await request.formData();
        const file = form.get("file");

        if (!file) {
          return json({ error: "Aucun fichier reçu" }, 400);
        }

        const arrayBuffer = await file.arrayBuffer();
        const base64 = btoa(
          String.fromCharCode(...new Uint8Array(arrayBuffer))
        );

        const filename = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");

        const githubUrl = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${env.GITHUB_AUDIO_PATH}/${filename}`;

        const upload = await fetch(githubUrl, {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
            "Content-Type": "application/json",
            "User-Agent": "alice-qr-tool",
          },
          body: JSON.stringify({
            message: `Add audio ${filename}`,
            content: base64,
            branch: env.GITHUB_BRANCH,
          }),
        });

        if (!upload.ok) {
          const t = await upload.text();
          throw new Error("GitHub error: " + t);
        }

        const rawUrl = `https://raw.githubusercontent.com/${env.GITHUB_REPO}/${env.GITHUB_BRANCH}/${env.GITHUB_AUDIO_PATH}/${filename}`;
        const shortUrl = await shorten(rawUrl);
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(shortUrl)}`;

        return json({
          raw_url: rawUrl,
          short_url: shortUrl,
          qr_url: qrUrl,
        });
      } catch (e) {
        return json({ error: e.message }, 500);
      }
    }

    return new Response("Method not allowed", { status: 405 });
  },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function shorten(url) {
  const r = await fetch(
    `https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`
  );
  return r.text();
}

function getHTML() {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Alice QR Tool</title>
<style>
body{font-family:Arial;background:#f4f4f4;text-align:center}
.card{margin:100px auto;padding:30px;width:360px;background:#fff;border-radius:12px}
</style>
</head>
<body>
<div class="card">
<h2>🎵 Alice QR Tool</h2>
<input type="file" id="file"><br><br>
<button onclick="send()">Générer le QR</button>
<div id="out"></div>
</div>
<script>
async function send(){
  const f=document.getElementById('file').files[0];
  if(!f)return alert("Choisis un fichier");
  const fd=new FormData();
  fd.append("file",f);
  const r=await fetch("/",{method:"POST",body:fd});
  const j=await r.json();
  if(j.error) return alert(j.error);
  document.getElementById("out").innerHTML =
    '<p><a href="'+j.short_url+'" target=_blank>'+j.short_url+'</a></p>'+
    '<img src="'+j.qr_url+'">';
}
</script>
</body>
</html>`;
}
