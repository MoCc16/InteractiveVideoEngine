/**
 * 元件注册表：类型 → 展示名 / 默认尺寸 / 编辑能力。
 * 与 `KNOWN_COMPONENT_TYPES` 一一对应（测试会校验覆盖率），新增类型必须先登记。
 */
import { KNOWN_COMPONENT_TYPES } from "@/domain/project/schema";

export interface ComponentSpec {
  type: string;
  label: string;
  group: "基础元件" | "节点字段" | "成品元件" | "面板元件";
  /** auto 尺寸时的默认内容尺寸 */
  autoWidth: number;
  autoHeight: number;
  /** 是否支持在属性面板里编辑内容文本 */
  editableText: boolean;
  /** 渲染时的占位文案（未绑定内容时显示） */
  placeholder: string;
}

const SPECS: Record<string, Omit<ComponentSpec, "type">> = {
  text: { label: "文字", group: "基础元件", autoWidth: 200, autoHeight: 32, editableText: true, placeholder: "文字" },
  image: { label: "图片", group: "基础元件", autoWidth: 200, autoHeight: 120, editableText: false, placeholder: "图片" },
  video: { label: "视频", group: "基础元件", autoWidth: 320, autoHeight: 180, editableText: false, placeholder: "视频" },
  button: { label: "按钮", group: "基础元件", autoWidth: 120, autoHeight: 40, editableText: true, placeholder: "按钮" },
  group: { label: "分组", group: "基础元件", autoWidth: 320, autoHeight: 180, editableText: false, placeholder: "" },
  progressBar: { label: "进度条", group: "基础元件", autoWidth: 240, autoHeight: 6, editableText: false, placeholder: "" },
  fieldText: { label: "节点字段文字", group: "节点字段", autoWidth: 200, autoHeight: 32, editableText: true, placeholder: "${node.字段}" },

  choiceList: { label: "选项列表", group: "成品元件", autoWidth: 480, autoHeight: 160, editableText: false, placeholder: "选项 1 / 选项 2" },
  chapterTitle: { label: "章节标题", group: "成品元件", autoWidth: 360, autoHeight: 56, editableText: false, placeholder: "第一章" },
  atmosphericOverlay: { label: "氛围滤镜", group: "成品元件", autoWidth: 1920, autoHeight: 1080, editableText: false, placeholder: "" },
  typewriterText: { label: "打字机文字", group: "成品元件", autoWidth: 420, autoHeight: 60, editableText: true, placeholder: "逐字显示" },
  videoPlayer: { label: "播放器", group: "成品元件", autoWidth: 640, autoHeight: 56, editableText: false, placeholder: "播放条" },
  navMenu: { label: "顶部菜单条", group: "成品元件", autoWidth: 480, autoHeight: 48, editableText: false, placeholder: "菜单" },
  mainMenu: { label: "主菜单", group: "成品元件", autoWidth: 240, autoHeight: 260, editableText: false, placeholder: "开始 / 继续 / 设置" },
  splashScreen: { label: "启动屏", group: "成品元件", autoWidth: 640, autoHeight: 360, editableText: false, placeholder: "标题画面" },
  mobileProgressBar: { label: "进度预览卡", group: "成品元件", autoWidth: 240, autoHeight: 96, editableText: false, placeholder: "进度" },
  progressPreview: { label: "进度预览卡", group: "成品元件", autoWidth: 240, autoHeight: 96, editableText: false, placeholder: "进度" },
  actionButton: { label: "动作按钮", group: "成品元件", autoWidth: 140, autoHeight: 44, editableText: true, placeholder: "动作" },
  endingButton: { label: "结局按钮", group: "成品元件", autoWidth: 160, autoHeight: 44, editableText: true, placeholder: "重新开始" },
  endingOrnament: { label: "结局饰线", group: "成品元件", autoWidth: 320, autoHeight: 24, editableText: false, placeholder: "" },
  endingHint: { label: "结局线索", group: "成品元件", autoWidth: 360, autoHeight: 40, editableText: true, placeholder: "线索" },
  chapterListView: { label: "章节列表", group: "成品元件", autoWidth: 480, autoHeight: 320, editableText: false, placeholder: "章节" },
  settlementAchievements: { label: "结算成就", group: "成品元件", autoWidth: 400, autoHeight: 120, editableText: false, placeholder: "成就" },
  storyMap: { label: "故事线图", group: "成品元件", autoWidth: 480, autoHeight: 280, editableText: false, placeholder: "故事线" },
  storyProgress: { label: "故事线进度", group: "成品元件", autoWidth: 240, autoHeight: 24, editableText: false, placeholder: "" },
  qteHandle: { label: "QTE 手柄", group: "成品元件", autoWidth: 88, autoHeight: 88, editableText: false, placeholder: "QTE" },
  qteGoldHandle: { label: "QTE 金色手柄", group: "成品元件", autoWidth: 88, autoHeight: 88, editableText: false, placeholder: "QTE" },

  speedSelector: { label: "倍速档位", group: "面板元件", autoWidth: 120, autoHeight: 32, editableText: false, placeholder: "1x" },
  volumeSlider: { label: "音量条", group: "面板元件", autoWidth: 160, autoHeight: 24, editableText: false, placeholder: "音量" },
  panelCloseButton: { label: "面板关闭", group: "面板元件", autoWidth: 32, autoHeight: 32, editableText: false, placeholder: "✕" },
};

export function componentSpec(type: string): ComponentSpec {
  const spec = SPECS[type];
  if (spec) return { type, ...spec };
  return {
    type,
    label: type,
    group: "基础元件",
    autoWidth: 160,
    autoHeight: 40,
    editableText: false,
    placeholder: type,
  };
}

export const REGISTERED_TYPES = Object.keys(SPECS);

/** 注册表必须覆盖 schema 里的全部已知类型 */
export function missingTypes(): string[] {
  return KNOWN_COMPONENT_TYPES.filter((type) => !(type in SPECS));
}
