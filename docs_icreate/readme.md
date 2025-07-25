## 上游信息

上游分支仓库地址：https://github.com/TurboWarp/desktop.git
基于的 commit:4d0e599

## 开发

当前的开发分支：icreatecode
当前仓库地址： git@github.com:ICreateRobot/desktop.git

## 第二次修改记录

### 打包静态资源

- 将/src-render-resourse 里面的静态资源，比如模型，图片，音频等打包进入/dist-render-webpack
- 修改位置：/src-render-webpack(添加)
  /webpack.config.js(修改)

### 添加选择设备的弹窗

- 修改位置：/src-main/windows/master(添加)
  /src-preload/master-data(添加)
  /src-render/master(添加)
  /src-render-webpack/editor/gui/gui.jsx(修改)
  /src-main/protocols.js(修改)

### 修改文件访问限制

- 修改位置：/src-main/protocols.js(修改)
