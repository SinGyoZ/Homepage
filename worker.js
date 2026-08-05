/**
 * 喵喵喵 HomePage - Cloudflare Workers 版
 * 从原 Vue3 + Vite 项目移植而来，去掉了框架依赖，
 * 用一个 Worker 直接吐 HTML，静态图片/CSS 走 Workers 静态资源。
 *
 * 想改链接、头像、站名，直接改下面的 LINKS / SITE 常量即可。
 */

const SITE = {
  name: "喵喵喵",
  keywords: "喵喵喵",
  description: "喵喵喵",
  logo: "/mcmcmc.webp", // 头像，来自原项目 public/mcmcmc.webp
  // 背景图池：原项目是从这 5 张里随机选一张，逻辑照搬
  backgrounds: ["/1.webp", "/2.webp", "/3.webp", "/4.webp", "/5.webp"],
};

// 原始 6 个链接 + 新增 6 个（共 12 个）。
// 前 6 个是从你的源码 App.vue 里原样搬过来的真实地址。
// 后 6 个是占位，换成你自己的链接即可。
const LINKS = [
  { label: "探针", url: "https://tz.220044.xyz" },
  { label: "笔记", url: "https://bj.220044.xyz" },
  { label: "网盘", url: "https://pan.220044.xyz" },
  { label: "工具", url: "https://sp.220044.xyz" },
  { label: "图床", url: "https://www.nodeimage.com/" },
  { label: "邮箱", url: "mailto:loveleisiyi@gmail.com" },
  // ↓↓↓ 新增的 6 个，按需替换 ↓↓↓
  { label: "Emby", url: "http://4837.220044.xyz:10010" },
  { label: "Sync", url: "https://sync.220044.xyz" },
  { label: "Google", url: "https://google.com" },
  { label: "Telegram", url: "https://t.me/SinGyoKu/" },
  { label: "Cloudflare", url: "https://dash.cloudflare.com/?to=/:account/workers-and-pages" },
  { label: "Inputtools", url: "https://www.google.com/inputtools/try/" },


];

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderHTML() {
  const navItems = LINKS.map(
    (l) => `          <li><a href="${escapeHtml(l.url)}">${escapeHtml(l.label)}</a></li>`
  ).join("\n");

  // 12 是偶数，和原逻辑一样加 use-middle 类，中间加一条竖分割线
  const isEven = LINKS.length % 2 === 0;
  const midIndex = isEven ? LINKS.length / 2 : -1;

  return `<!DOCTYPE html>
<html lang="zh">
<head>
  <title>${escapeHtml(SITE.name)}</title>
  <meta content="${escapeHtml(SITE.keywords)}" name="keywords" />
  <meta name="description" content="${escapeHtml(SITE.description)}" />
  <meta charset="utf-8" />
  <link rel="icon" href="/favicon.ico" />
  <meta name="color-scheme" content="light dark">
  <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no, viewport-fit=cover" />
  <link rel="preconnect" href="https://cdn-font.hyperos.mi.com" crossorigin />
  <link rel="stylesheet"
    href="https://cdn-font.hyperos.mi.com/font/css?family=MiSans_VF:VF:Chinese_Simplify,Latin&display=swap" />
  <link rel="stylesheet" href="/main.css" />
</head>
<body class="is-preload">
  <div id="app-root">
    <div id="wrapper">
      <header id="header">
        <div class="logo">
          <img src="${SITE.logo}" alt="${escapeHtml(SITE.name)}" width="80%" height="80%"
            style="position: relative; top: 10%" loading="eager" decoding="async">
        </div>
        <div class="content">
          <div class="inner">
            <h1>${escapeHtml(SITE.name)}</h1>
          </div>
        </div>
        <nav id="nav"${isEven ? ' class="use-middle"' : ""}>
          <ul>
${navItems}
          </ul>
        </nav>
      </header>

      <footer id="footer">
        <p class="copyright">
          Copyright &copy; <span id="year"></span> ${escapeHtml(SITE.name)}
        </p>
      </footer>
    </div>

    <div id="bg"></div>
  </div>

  <script>
    // 对应原 App.vue 里的逻辑：随机选背景图、预加载、淡入，
    // 偶数链接时给中间那一项加 is-middle 类（配合 CSS 画中间竖线）。
    (function () {
      var bgs = ${JSON.stringify(SITE.backgrounds)};
      var currentBg = bgs[Math.floor(Math.random() * bgs.length)];

      document.getElementById("bg").style.setProperty("--bg-image", 'url("' + currentBg + '")');

      var preloadLink = document.createElement("link");
      preloadLink.rel = "preload";
      preloadLink.as = "image";
      preloadLink.href = currentBg;
      document.head.appendChild(preloadLink);

      document.getElementById("year").textContent = new Date().getFullYear();

      function reveal() {
        requestAnimationFrame(function () {
          document.body.classList.remove("is-preload");
        });
      }

      var img = new Image();
      img.src = currentBg;
      if (img.complete) {
        reveal();
      } else {
        img.onload = reveal;
        img.onerror = reveal;
        setTimeout(reveal, 800);
      }

      var midIndex = ${midIndex};
      if (midIndex >= 0) {
        var items = document.querySelectorAll("#nav li");
        if (items[midIndex]) items[midIndex].classList.add("is-middle");
      }
    })();
  </script>
</body>
</html>`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(renderHTML(), {
        headers: {
          "content-type": "text/html;charset=UTF-8",
          "cache-control": "public, max-age=300",
        },
      });
    }

    // main.css / favicon.ico / *.webp / overlay.png 等静态文件
    // 走 Workers 静态资源绑定（见 wrangler.toml 里的 [assets]）
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not Found", { status: 404 });
  },
};
