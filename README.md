# Cloudflare R2 现代云盘

基于 Cloudflare Pages + Pages Functions + R2 的在线文件管理器。保留原有 R2 文件操作与权限逻辑，同时提供现代化响应式界面。

## Cloudflare Pages 部署

连接本仓库到 Cloudflare Pages 后，使用以下构建设置：

- **Framework preset:** Vite（或 None）
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Root directory:** `/`

> 之前版本使用浏览器运行时编译 `.vue` 文件，部署环境容易因 CDN、MIME 或 SFC loader 问题出现白屏。当前版本改为 Vite 在部署时编译 Vue，生产环境不再依赖 `vue3-sfc-loader`。

### R2 / 权限配置

在 Pages 项目的环境变量中配置原项目需要的变量，例如：

| 变量 | 示例 | 说明 |
| --- | --- | --- |
| `PUBURL` | `https://pub-xxxx.r2.dev` | R2 公共存储桶 URL |
| `GUEST` | `public/` | 游客允许写入的目录 |
| `admin:123456` | `*` | 管理员账号及可写目录 |
| `user1:123456` | `user1/,userPublic/` | 普通用户账号及可写目录 |

生产环境请使用强密码，并避免把敏感配置写入代码仓库。

在 Cloudflare Pages → 项目 → Settings → Functions 中绑定 R2 存储桶，变量名称使用 `BUCKET`，然后重新部署。

## 本地开发

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run build
```

构建完成后，静态前端位于 `dist/`。Pages Functions 仍保留在项目根目录的 `functions/` 中，由 Cloudflare Pages 负责部署。

## 界面升级

- 现代化紫色渐变与玻璃拟态视觉
- 响应式文件卡片布局
- 移动端底部上传操作面板
- 深色模式与减少动效支持
- 搜索、排序、预览、复制、移动、删除等原有功能保持
- Vite + Vue 生产构建，避免浏览器运行时编译 SFC 导致白屏

原项目基于 longern/FlareDrive 汉化修改，并加入权限系统与多管理员目录授权功能。
