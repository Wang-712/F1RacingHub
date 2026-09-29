/**
 * 车手定妆照资源映射
 * -------------------------------------------------------------
 * 图片来源：F1 官方媒体库（media.formula1.com，2026 赛季官方车手肖像），
 * 已下载至 public/drivers/ 自托管，由站点同源分发，避免外部 CDN
 * 跨域 / 地区访问慢 / 防盗链等问题。
 *
 * 三种规格（透明底 WebP）：
 *   <id>.webp     440×528  上半身裁剪（面部定位）—— 车手卡片
 *   <id>@2x.webp  768×922  高清上半身 —— 详情页头部 / Retina 屏
 *   <id>@lg.webp  1024 宽  全身抠图 —— 大图预览 Lightbox
 */

// 已有定妆照的车手 id（与 driver.id 一致，连字符格式）
const PHOTO_DRIVER_IDS = new Set([
  // 2026 正式阵容
  'max-verstappen',
  'lando-norris',
  'charles-leclerc',
  'oscar-piastri',
  'lewis-hamilton',
  'george-russell',
  'kimi-antonelli',
  'fernando-alonso',
  'carlos-sainz',
  'pierre-gasly',
  'alexander-albon',
  'lance-stroll',
  'isack-hadjar',
  'nico-hulkenberg',
  'oliver-bearman',
  'esteban-ocon',
  'gabriel-bortoleto',
  'liam-lawson',
  'arvid-lindblad',
  'franco-colapinto',
  'valtteri-bottas',
  'sergio-perez',
  // 离线快照中的 2025 阵容
  'yuki-tsunoda',
  'jack-doohan',
  'ayumu-iwasa',
])

// Ergast/Jolpica 实时接口使用的短 id（多为姓氏）-> 照片文件名使用的完整 id
// 离线快照 drivers.json 直接使用完整 id（无需映射）
const ID_ALIASES = {
  antonelli: 'kimi-antonelli',
  russell: 'george-russell',
  hamilton: 'lewis-hamilton',
  norris: 'lando-norris',
  leclerc: 'charles-leclerc',
  piastri: 'oscar-piastri',
  hadjar: 'isack-hadjar',
  lawson: 'liam-lawson',
  gasly: 'pierre-gasly',
  colapinto: 'franco-colapinto',
  bearman: 'oliver-bearman',
  bortoleto: 'gabriel-bortoleto',
  hulkenberg: 'nico-hulkenberg',
  ocon: 'esteban-ocon',
  sainz: 'carlos-sainz',
  albon: 'alexander-albon',
  alonso: 'fernando-alonso',
  tsunoda: 'yuki-tsunoda',
  stroll: 'lance-stroll',
  bottas: 'valtteri-bottas',
  perez: 'sergio-perez',
}

/**
 * 将外部车手 id 解析为照片文件名 id
 * @param {string} id driver.id（完整 id 或 Ergast 短 id）
 * @returns {string|null}
 */
function resolvePhotoId(id) {
  if (PHOTO_DRIVER_IDS.has(id)) return id
  return ID_ALIASES[id] || null
}

/**
 * 是否存在该车手的定妆照
 * @param {string} id driver.id（完整 id 或 Ergast 短 id）
 */
export function hasDriverPhoto(id) {
  return resolvePhotoId(id) !== null
}

/**
 * 获取车手定妆照 URL
 * @param {string} id driver.id
 * @param {'card'|'hd'|'large'} variant card=440 上半身 / hd=768 高清 / large=全身大图
 * @returns {string|null} 无照片资源时返回 null（调用方应显示占位图）
 */
export function getDriverPhoto(id, variant = 'card') {
  const photoId = resolvePhotoId(id)
  if (!photoId) return null
  const suffix = variant === 'large' ? '@lg' : variant === 'hd' ? '@2x' : ''
  return `/drivers/${photoId}${suffix}.webp`
}
