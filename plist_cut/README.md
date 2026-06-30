# Plist 图集解包 / 打包网站工具

这是一个纯前端本地工具，打开 `index.html` 就能使用，不需要上传素材。

## 功能

### 1. 解包图集
- 输入：`.plist` + 对应的 `.png/.jpg/.webp` 图集大图
- 输出：zip
  - `01_trimmed_png_blocks/`：按图集实际裁切出的 PNG，已修正 rotated
  - `02_source_size_png_blocks/`：按 `sourceSize/sourceColorRect` 还原透明留白后的 PNG

### 2. 打包图集
- 输入：一个图片文件夹，或多张图片
- 输出：zip
  - `atlas_0.png`
  - `atlas_0.plist`
  - 如果超过最大尺寸，会自动生成 `atlas_1.png/.plist` 等多页

## 支持格式

主要支持 Cocos / TexturePacker 的 XML plist：
- `frames`
- `frame`
- `rotated`
- `sourceSize`
- `sourceColorRect`
- `metadata.textureFileName`

暂不支持 binary plist。如果是 binary plist，需要先用 TexturePacker、Xcode、plist 工具或 Python 转成 XML plist。

## 使用方式

直接双击打开：

```text
index.html
```

推荐使用 Chrome / Edge。
