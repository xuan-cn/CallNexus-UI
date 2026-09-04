import { to as tos } from 'await-to-js';
import router from './router';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';
import { getToken } from '@/utils/auth';
import { isHttp, isPathMatch } from '@/utils/validate';
import { isRelogin } from '@/utils/request';
import { useUserStore } from '@/store/modules/user';
import { useSettingsStore } from '@/store/modules/settings';
import { usePermissionStore } from '@/store/modules/permission';
import { ElMessage } from 'element-plus/es';

// 默认 trickle 偏慢，菜单切换时顶栏会拖很久
NProgress.configure({ showSpinner: false, speed: 180, trickleSpeed: 120, minimum: 0.25 });
const whiteList = ['/login', '/register', '/social-callback', '/register*', '/register/*', '/chat/*'];
const screenPathPattern = '/screen/*';

const isWhiteList = (path: string) => {
  return whiteList.some((pattern) => isPathMatch(pattern, path));
};

const isScreenPath = (path: string) => isPathMatch(screenPathPattern, path);

const registerAccessRoutes = async () => {
  const accessRoutes = await usePermissionStore().generateRoutes();
  accessRoutes.forEach((route) => {
    if (!isHttp(route.path)) {
      router.addRoute(route);
    }
  });
};

router.beforeEach(async (to) => {
  NProgress.start();
  if (getToken()) {
    to.meta.title && useSettingsStore().setTitle(to.meta.title as string);
    /* has token*/
    if (to.path === '/login') {
      NProgress.done(true);
      return { path: '/' };
    }
    if (isWhiteList(to.path)) {
      return true;
    }
    if (useUserStore().roles.length === 0) {
      isRelogin.show = true;
      window.__setLoaderStatus?.('正在获取用户信息…');
      // 判断当前用户是否已拉取完user_info信息
      const [err] = await tos(useUserStore().getInfo());
      if (err) {
        await useUserStore().logout();
        ElMessage.error(err);
        return { path: '/' };
      }
      isRelogin.show = false;

      // 大屏是常量路由，先放行进页；菜单权限后台补齐，避免整屏卡在启动加载
      if (isScreenPath(to.path)) {
        window.__appLoaded?.();
        void registerAccessRoutes();
        return true;
      }

      window.__setLoaderStatus?.('正在加载菜单权限…');
      await registerAccessRoutes();
      window.__appLoaded?.();
      // hack：确保 addRoute 完成后按目标路由重新进入
      return { path: to.path, replace: true, params: to.params, query: to.query, hash: to.hash, name: to.name as string };
    }
    return true;
  }

  // 没有token
  if (isWhiteList(to.path)) {
    // 在免登录白名单，直接进入
    return true;
  }
  const redirect = encodeURIComponent(to.fullPath || '/');
  NProgress.done(true);
  return `/login?redirect=${redirect}`; // 否则全部重定向到登录页
});

router.afterEach(() => {
  // force：菜单切换后立刻收起顶栏进度条
  NProgress.done(true);
  // 白名单/登录页等不走 beforeEach 完整流程，这里确保加载器也能淡出
  window.__appLoaded?.();
});
