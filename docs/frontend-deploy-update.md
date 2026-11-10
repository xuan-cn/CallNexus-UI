# 离线安装包前端更新

安装包的 configure.py render 需要前端 JavaScript 中存在两处 RSA 占位符。
普通 vite build/build:prod 会使用开发配置中的密钥，不能直接替换安装包前端后再 render。

本地执行 `npm run build:deploy`，上传生成的 dist 内容到服务器 frontend/dist，避免多套 dist 目录。
该命令只给当前构建进程注入占位符，不修改源码环境文件；开发环境继续使用原有命令。

服务器执行：

```bash
cd /opt/CALLNEXUS/callnexus-deploy
python3 scripts/configure.py render
docker compose exec -T nginx nginx -t
docker compose restart nginx
```

保留现有 .env，不重新生成 RSA 密钥，不关闭接口加密，也不要删除安装脚本中的占位符校验。
只有 render 成功之后再发布给用户。若更新不完整，应先恢复备份的旧前端。
浏览器使用 Ctrl+F5 刷新，避免缓存旧版登录加密代码。
