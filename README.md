# Cloudflare R2 在线网盘

基于 **Cloudflare Pages + Pages Functions + R2 Binding** 的 R2 文件管理器，汉化修改自 [longern/FlareDrive](https://github.com/longern/FlareDrive)，增加了多管理员、目录级写权限控制。

## 部署到 Cloudflare Pages

1. Fork 本仓库。
2. 在 Cloudflare R2 创建一个存储桶。
3. 如果需要通过 `/raw/...` 直接预览/下载文件，请在 R2 中开启公共访问，并复制 **公共存储桶 URL**。
4. 在 Cloudflare Pages 创建站点，连接 GitHub 仓库并选择本仓库。
5. 构建设置保持简单：这是无构建步骤的静态 Pages 项目，构建命令留空即可，Functions 会由 Pages 自动部署。
6. 在 Pages 的环境变量中配置：

| 变量 | 示例 | 说明 |
| --- | --- | --- |
| `PUBURL` | `https://pub-xxxxxxxx.r2.dev` | R2 公共存储桶 URL；开启 `/raw` 访问时必需 |
| `GUEST` | `public/` | 游客允许写入的目录；留空表示游客不能写入 |
| `admin:123456` | `*` | 管理员账号密码及可写目录 |
| `user1:123456` | `user1/,userPublic/` | 用户账号密码及可写目录 |

账号使用 `账号:密码` 作为环境变量名称，值使用逗号分隔的允许写入目录。例如：

```text
admin:请使用强密码 -> *
user1:请使用强密码 -> user1/,userPublic/
```

**注意：** 不要在目录权限值前后加逗号，否则可能形成意外的全目录权限匹配。

7. 在 Pages → 设置 → 函数 → R2 存储桶绑定中，绑定刚才创建的 R2 存储桶，变量名称必须为 `BUCKET`。
8. 保存设置并重新部署。

## 权限模型

- 文件读取通过 R2 公共 URL 提供，适合公开网盘/文件分享场景。
- 文件上传、创建目录、复制、移动、重命名、删除等写操作由 Pages Functions 的 Basic Auth 和目录权限控制。
- `GUEST` 只控制游客可写目录，例如 `public/`；设置为 `*` 表示游客拥有全部写权限，请谨慎使用。
- 缩略图目录 `_$flaredrive$/thumbnails/` 用于前端图片/视频缩略图。

## 本地开发

项目保留原有 Wrangler 开发脚本：

```bash
npm install
npm run dev
```

本地开发需要按照 Wrangler/Cloudflare 的方式提供 R2 绑定；生产环境以 Cloudflare Pages 的 R2 Binding `BUCKET` 为准。

## 部署检查清单

部署后建议依次验证：

1. 首页能显示“文件库”，而不是空白页。
2. `/api/children/` 能返回目录列表。
3. 游客不能写入未授权目录。
4. 授权用户可以上传、创建文件夹、重命名、移动和删除。
5. 大文件可以走 multipart upload。
6. 图片/MP4 上传后能生成缩略图。
7. `/raw/<文件名>` 可以预览/下载公开文件。
8. 删除文件夹时，目录下的对象会一并删除。
9. 超过 1000 个对象的目录仍能完整显示。

> **隐私提醒：** 当前方案依赖 R2 公共存储桶 URL，因此文件内容本身是公开可访问的。若你的目标是“私有网盘”，不能只靠当前 Basic Auth；需要改成私有 R2 + Worker 鉴权/签名 URL 的架构。
