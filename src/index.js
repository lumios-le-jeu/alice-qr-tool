export default {
  fetch(request) {
    return new Response(
      "Alice QR Tool is running 🚀",
      { headers: { "content-type": "text/plain" } }
    );
  }
};
