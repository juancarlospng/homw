const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "dist");
const port = Number(process.env.PORT || 5173);
const host = "127.0.0.1";
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

http
  .createServer((request, response) => {
    const pathname = decodeURIComponent(request.url.split("?")[0]);
    const filePath = path.join(root, pathname === "/" ? "index.html" : pathname);

    if (!filePath.startsWith(root)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    fs.readFile(filePath, (error, data) => {
      if (error) {
        response.writeHead(404);
        response.end("Not found");
        return;
      }

      response.writeHead(200, {
        "content-type": types[path.extname(filePath)] || "application/octet-stream",
      });
      response.end(data);
    });
  })
  .listen(port, host, () => {
    console.log(`Serving HOMW at http://${host}:${port}`);
  });
