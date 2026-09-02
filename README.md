# Cloudflare R2 现代云盘

基于 Cloudflare Pages + Pages Functions + R2 的在线文件管理器。当前版本在保留原有 R2 文件操作与权限逻辑的基础上，升级了现代化响应式界面。

## Cloudflare Pages 部署

1. Fork 或连接本仓库到 Cloudflare Pages。
2. 构建设置保持默认即可：本项目为免构建静态 Pages 应用，`index.html` 位于项目根目录。
3. 在 Pages 项目的环境变量中配置原项目需要的变量，例如：

| 变量 | 示例 | 说明 |
| --- | --- | --- |
| `PUBURL` | `https://pub-xxxx.r2.dev` | R2 公共存储桶 URL |
| `GUEST` | `public/` | 游客允许写入的目录 |
| `admin:123456` | `*` | 管理员账号及可写目录 |
| `user1:123456` | `user1/,userPublic/` | 普通用户账号及可写目录 |

> 账号配置沿用原项目规则。生产环境请使用强密码，并避免把敏感配置写进代码仓库。

4. 在 Cloudflare Pages → 项目 → Settings → Functions → R2 bucket bindings 中绑定 R2 存储桶，变量名称使用 `BUCKET`。
5. 保存后重新部署。

## 本地预览

安装依赖后可使用：

```bash
npm install
npm run dev
```

## 本次界面升级

- 紫色渐变的现代化云盘视觉风格
- 毛玻璃搜索栏与顶部操作区
- 桌面端三列、平板两列、手机单列的自适应布局
- 文件/文件夹卡片、悬停动效与更清晰的文件信息层级
- 更醒目的上传浮动按钮
- 优化菜单、空状态、上传弹层和移动端体验
- 保留原有 Vue 3 + R2 Functions 文件管理能力

原项目基于 longern/FlareDrive 汉化修改，并加入权限系统与多管理员目录授权功能。
